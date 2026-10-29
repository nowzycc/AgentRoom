/**
 * M2 end-to-end runtime: goal arbitration from M1 drives the planner port,
 * the executor owns the action lifecycle and a fake motion adapter stands in
 * for Three/VRM. All plans here come from the real GOAP worker.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NpcRuntime } from '../src/runtime/npc-runtime.js';
import { FakeMotionAdapter, type FakeMotionOptions } from '../src/actions/motion.js';
import { WorkerPlanner } from '../src/planner/worker-planner.js';
import type { DomainConfigInput } from '../src/domain/config.js';
import { ACTOR, Harness } from './helpers.js';
import { buildPlannerWorker, nodeWorkerFactory } from './support/worker.js';

let bundle: string;
const planners: WorkerPlanner[] = [];

beforeAll(async () => {
  bundle = (await buildPlannerWorker()).path;
});

afterAll(() => {
  for (const planner of planners) planner.terminate();
});

interface MakeOptions {
  config?: DomainConfigInput;
  motion?: FakeMotionOptions;
  maxReplanAttempts?: number;
}

function makeRuntime(options: MakeOptions = {}) {
  const h = new Harness({
    config: { minDwellMs: 0, idleCooldownMs: 500, ...(options.config ?? {}) },
  });
  const planner = new WorkerPlanner({ factory: nodeWorkerFactory(bundle), defaultBudgetMs: 4_000 });
  planners.push(planner);
  const motion = new FakeMotionAdapter({
    body: { handReachM: 0.7, keyboardDistanceM: 0.5, seatClearanceM: 0.3 },
    ...options.motion,
  });
  const rt = new NpcRuntime({
    store: h.store,
    actorId: ACTOR,
    planner,
    motion,
    maxReplanAttempts: options.maxReplanAttempts ?? 3,
  });
  return { h, rt, planner, motion };
}

async function until(rt: NpcRuntime, predicate: () => boolean, maxMs = 12_000, label = 'condition'): Promise<void> {
  const step = 16;
  for (let elapsed = 0; elapsed < maxMs; elapsed += step) {
    if (predicate()) return;
    await rt.advance(step);
  }
  throw new Error(`timed out waiting for ${label}`);
}

describe('M2 runtime: work chain from standing', () => {
  it('plans with the upstream core, executes walk→sit→type and keeps the session', async () => {
    const { h, rt, motion } = makeRuntime();
    h.heartbeat();
    await rt.advance(100);
    expect(h.actor().goal.active?.goalId).toBe('idle');
    expect(rt.plan?.status).toBe('satisfied');

    h.toolStarted({ toolCallId: 't1' });
    await until(rt, () => rt.plan?.status === 'ok', 4_000, 'work plan');
    expect(rt.plan?.actions).toEqual(['walkToDesk', 'sitOnDeskChair', 'typeAtKeyboard']);
    expect(h.actor().goal.active?.goalId).toBe('work');

    await until(rt, () => rt.facts.handsOnKeyboard === true, 12_000, 'hands on keyboard');
    expect(rt.facts.atDesk).toBe(true);
    expect(rt.facts.sitting).toBe(true);
    expect(h.actor().posture).toBe('sitting');
    expect(rt.stats.actionsSucceeded).toBe(3);
    expect(rt.stats.actionsFailed).toBe(0);

    const begins = motion.calls.filter((c) => c.kind === 'begin').map((c) => c.actionKey);
    expect(begins).toEqual(['walkToDesk', 'sitOnDeskChair', 'typeAtKeyboard']);

    // A satisfied continuous session is not re-planned every frame.
    const requests = rt.stats.planRequests;
    await rt.advance(1_000);
    expect(rt.stats.planRequests).toBe(requests);
  });

  it('does not re-sit when the goal switches from work to think at the same seat', async () => {
    const { h, rt, motion } = makeRuntime();
    h.heartbeat();
    await rt.advance(50);
    h.toolStarted({ toolCallId: 't1' });
    await until(rt, () => rt.facts.handsOnKeyboard === true, 12_000, 'seated work');

    h.goalRequest({ goal: 'think', commandId: 'c-think', priorityClass: 'task', onConflict: 'replace' });
    await until(rt, () => h.actor().goal.active?.goalId === 'think', 4_000, 'think active');
    await rt.advance(200);

    expect(rt.plan?.status).toBe('satisfied');
    expect(rt.plan?.actions).toEqual([]);
    const sitBegins = motion.calls.filter((c) => c.kind === 'begin' && c.actionKey === 'sitOnDeskChair');
    expect(sitBegins).toHaveLength(1);
    expect(rt.facts.sitting).toBe(true);
    expect(h.actor().posture).toBe('sitting');
  });
});

describe('M2 runtime: cancel handshake and effect gating', () => {
  it('keeps the action exiting, never commits its effect, and commits the new goal after the exit', async () => {
    const { h, rt, motion } = makeRuntime();
    h.heartbeat();
    await rt.advance(50);
    h.toolStarted({ toolCallId: 't1' });
    await until(rt, () => rt.action?.actionKey === 'typeAtKeyboard', 12_000, 'typing');
    await rt.advance(200);
    expect(rt.facts.handsOnKeyboard).toBe(false);
    const terminalsBefore = rt.terminals.length;

    h.goalRequest({ goal: 'think', commandId: 'c-think', priorityClass: 'task', onConflict: 'replace' });
    rt.step(16);
    expect(rt.action?.phase).toBe('exiting');
    expect(h.actor().goal.active?.goalId).toBe('work');
    expect(rt.facts.handsOnKeyboard).toBe(false);

    await rt.advance(100);
    expect(rt.action?.phase).toBe('exiting');
    await until(rt, () => h.actor().goal.active?.goalId === 'think', 4_000, 'think committed');

    expect(rt.facts.handsOnKeyboard).toBe(false);
    expect(rt.stats.actionsCancelled).toBe(1);
    const typeTerminals = rt.terminals.filter((t) => t.actionKey === 'typeAtKeyboard');
    expect(typeTerminals).toHaveLength(1);
    expect(typeTerminals[0]!.outcome).toBe('cancelled');
    expect(typeTerminals[0]!.effects).toEqual({});
    expect(rt.terminals.length).toBe(terminalsBefore + 1);
    expect(motion.calls.filter((c) => c.kind === 'cleanup' && c.actionKey === 'typeAtKeyboard')).toHaveLength(1);
    expect(rt.plan?.status).toBe('satisfied');
  });
});

describe('M2 runtime: unsafe preflight fails and replans are bounded', () => {
  it('fails unreachable hands three times, then reports failure without faking work', async () => {
    const { h, rt, motion } = makeRuntime({
      motion: { body: { handReachM: 0.4, keyboardDistanceM: 0.62, seatClearanceM: 0.3 } },
    });
    h.heartbeat();
    await rt.advance(50);
    h.toolStarted({ toolCallId: 't1' });
    await until(rt, () => rt.failures.some((f) => f.kind === 'replan-exhausted'), 12_000, 'exhausted replans');

    expect(rt.facts.atDesk).toBe(true);
    expect(rt.facts.sitting).toBe(true);
    expect(rt.facts.handsOnKeyboard).toBe(false);
    expect(rt.stats.actionsFailed).toBe(3);
    expect(rt.stats.actionsSucceeded).toBe(2);
    expect(rt.failures.filter((f) => f.kind === 'action-failed' && f.reason === 'HAND_UNREACHABLE')).toHaveLength(3);
    expect(motion.calls.filter((c) => c.kind === 'begin' && c.actionKey === 'typeAtKeyboard')).toHaveLength(0);

    const requests = rt.stats.planRequests;
    await rt.advance(1_000);
    expect(rt.stats.planRequests).toBe(requests);
  });

  it('replans after a blocked path opens and then completes the chain', async () => {
    const { h, rt, motion } = makeRuntime();
    motion.block('walkToDesk', 1);
    h.heartbeat();
    await rt.advance(50);
    h.toolStarted({ toolCallId: 't1' });
    await until(rt, () => rt.failures.some((f) => f.reason === 'NO_PATH'), 6_000, 'blocked path');
    expect(rt.facts.atDesk).toBe(false);

    motion.unblock('walkToDesk');
    await until(rt, () => rt.facts.handsOnKeyboard === true, 12_000, 'chain after unblock');
    expect(rt.stats.actionsFailed).toBe(1);
    expect(rt.stats.actionsSucceeded).toBe(3);
  });
});

describe('M2 runtime: revision binding', () => {
  it('discards a plan whose semantic revision moved while it was in flight', async () => {
    const { h, rt } = makeRuntime();
    h.heartbeat();
    await rt.advance(50);
    h.toolStarted({ toolCallId: 't1' });
    rt.step(16); // commits work and starts a plan request

    h.toolCompleted({ toolCallId: 't1' }); // facts move before the worker answers
    await rt.settle();

    expect(rt.stats.plansDiscarded).toBeGreaterThanOrEqual(1);
    expect(rt.stats.actionsStarted).toBe(0);
    expect(rt.plan?.status).not.toBe('ok');
  });
});
