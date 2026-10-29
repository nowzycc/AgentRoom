/**
 * Regressions for the independent M2 spec review (gates/M2-spec.json).
 *
 * The reviewer-owned probe (tools/npc-v2/review/M2-spec/probe-acceptance.ts) is
 * not modified and is re-run as an external check; these tests are the package's
 * own red-first coverage of the same three blockers:
 *
 *   M2-SPEC-01  a goal request in the final frame must not commit the old effect
 *   M2-SPEC-02  a routine fact during the safe exit must not wedge the switch
 *   M2-SPEC-03  an unconfirmed exit must not release the body channels
 *
 * plus the two non-blocking M2 findings that touch the same code:
 *   M2-SPEC-05  bounded logs and an explicit dispose
 *   M2-SPEC-06  adapter exceptions become terminals, never escape the frame
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NpcRuntime } from '../src/runtime/npc-runtime.js';
import { ActionExecutor, type StartActionOptions } from '../src/actions/executor.js';
import {
  FakeMotionAdapter,
  type MotionAdapter,
  type MotionContext,
  type MotionFeasibility,
} from '../src/actions/motion.js';
import { ACTION_CATALOG } from '../src/planner/catalog.js';
import { WorkerPlanner } from '../src/planner/worker-planner.js';
import type { PlannerPort } from '../src/planner/types.js';
import type { DomainConfigInput } from '../src/domain/config.js';
import { ACTOR, Harness } from './helpers.js';
import { buildPlannerWorker, nodeWorkerFactory } from './support/worker.js';

const BODY = { handReachM: 0.7, keyboardDistanceM: 0.5, seatClearanceM: 0.3 };
const SEATED = { atDesk: true, sitting: true };

let bundle: string;
const planners: WorkerPlanner[] = [];

beforeAll(async () => {
  bundle = (await buildPlannerWorker()).path;
});

afterAll(() => {
  for (const planner of planners) planner.terminate();
});

interface RuntimeOptions {
  config?: DomainConfigInput;
  motion?: FakeMotionAdapter;
  exitTimeoutMs?: number;
  maxTerminalLog?: number;
  maxFailureLog?: number;
}

function makeRuntime(options: RuntimeOptions = {}) {
  const h = new Harness({
    config: { minDwellMs: 0, idleCooldownMs: 500, ...(options.config ?? {}) },
  });
  const planner = new WorkerPlanner({ factory: nodeWorkerFactory(bundle), defaultBudgetMs: 4_000 });
  planners.push(planner);
  const motion = options.motion ?? new FakeMotionAdapter({ body: { ...BODY } });
  const rt = new NpcRuntime({
    store: h.store,
    actorId: ACTOR,
    planner,
    motion,
    exitTimeoutMs: options.exitTimeoutMs,
    maxTerminalLog: options.maxTerminalLog,
    maxFailureLog: options.maxFailureLog,
  });
  return { h, rt, motion, planner };
}

async function until(rt: NpcRuntime, predicate: () => boolean, maxMs = 12_000, label = 'condition'): Promise<void> {
  const step = 16;
  for (let elapsed = 0; elapsed < maxMs; elapsed += step) {
    if (predicate()) return;
    await rt.advance(step);
  }
  throw new Error(`timed out waiting for ${label}`);
}

async function startTyping(h: Harness, rt: NpcRuntime): Promise<void> {
  h.heartbeat();
  await rt.advance(50);
  h.toolStarted({ toolCallId: 't1' });
  await until(rt, () => rt.action?.actionKey === 'typeAtKeyboard', 12_000, 'typing');
}

function makeExecutor(options: { motion?: MotionAdapter; exitTimeoutMs?: number; maxTerminalLog?: number } = {}) {
  const motion = options.motion ?? new FakeMotionAdapter({ body: { ...BODY } });
  const executor = new ActionExecutor({
    motion,
    body: { ...BODY },
    nowSimMs: () => 0,
    actionTimeoutMs: 60_000,
    exitTimeoutMs: options.exitTimeoutMs ?? 2_000,
    maxTerminalLog: options.maxTerminalLog,
  });
  return { executor, motion };
}

function startOptions(actionId: string): StartActionOptions {
  return { actionId, goalId: 'work', planId: 'p', planRevision: 1, facts: { ...SEATED } };
}

describe('M2-SPEC-01: the final-frame interrupt never commits the old effect', () => {
  it('terminates the action as an effect-less cancellation in the same frame', async () => {
    const { h, rt } = makeRuntime();
    await startTyping(h, rt);

    // Leave less than one 16 ms frame before the 1500 ms action completes.
    while (rt.action && rt.action.elapsedMs < 1484) await rt.step(4);
    expect(rt.action?.actionKey).toBe('typeAtKeyboard');
    expect(rt.action?.phase).toBe('running');

    h.goalRequest({ goal: 'think', commandId: 'c-race', priorityClass: 'task', onConflict: 'replace' });
    rt.step(16); // the frame in which the motion completes

    expect(rt.facts.handsOnKeyboard).toBe(false);
    const last = rt.terminals[rt.terminals.length - 1]!;
    expect(last.actionKey).toBe('typeAtKeyboard');
    expect(last.outcome).toBe('cancelled');
    expect(last.effects).toEqual({});
    expect(h.actor().goal.active?.goalId).toBe('think');
    expect(rt.stats.actionsSucceeded).toBe(2); // walk + sit only
    expect(rt.stats.actionsCancelled).toBe(1);
  });

  it('still commits a completion when no goal change is pending', async () => {
    const { h, rt } = makeRuntime();
    await startTyping(h, rt);
    await until(rt, () => rt.facts.handsOnKeyboard === true, 6_000, 'confirmed typing');
    const typeTerminal = rt.terminals.find((t) => t.actionKey === 'typeAtKeyboard');
    expect(typeTerminal?.outcome).toBe('success');
    expect(typeTerminal?.effects).toEqual({ handsOnKeyboard: true });
  });

  it('the executor itself downgrades a completion whose goal is superseded', () => {
    const { executor } = makeExecutor();
    expect(executor.start(ACTION_CATALOG.typeAtKeyboard!, startOptions('a1')).ok).toBe(true);
    const terminal = executor.update(1_500, { supersedes: (goalId) => goalId === 'work' });
    expect(terminal).toHaveLength(1);
    expect(terminal[0]!.outcome).toBe('cancelled');
    expect(terminal[0]!.effects).toEqual({});
    expect(terminal[0]!.reason).toContain('superseded');
    expect(executor.lockSnapshot).toHaveLength(0);
    expect(executor.terminals).toHaveLength(1);
  });
});

describe('M2-SPEC-02: a fact during the safe exit cannot wedge the goal switch', () => {
  it('re-observes the same interruption at the new revision and commits once', async () => {
    const { h, rt } = makeRuntime();
    await startTyping(h, rt);

    h.goalRequest({ goal: 'think', commandId: 'c-hb', priorityClass: 'task', onConflict: 'replace' });
    const interruptBefore = h.actor().goal.interrupt?.atRevision ?? null;
    rt.step(16);
    expect(rt.action?.phase).toBe('exiting');

    h.heartbeat(); // a routine liveness fact while the body is exiting
    const afterHeartbeat = h.actor().goal.interrupt?.atRevision ?? null;
    expect(h.store.snapshot.factsRevision).toBeGreaterThan(interruptBefore!);
    expect(afterHeartbeat).toBe(h.store.snapshot.factsRevision);

    await rt.advance(1_200);

    expect(h.actor().goal.active?.goalId).toBe('think');
    expect(rt.failures.filter((f) => f.kind === 'commit-rejected')).toHaveLength(0);
    expect(rt.stats.actionsCancelled).toBe(1);
    expect(rt.terminals.filter((t) => t.actionKey === 'typeAtKeyboard')).toHaveLength(1);
    // No cancel/replan loop and no re-run of the outgoing goal.
    expect(rt.stats.planRequests).toBeLessThanOrEqual(4);
    expect(rt.action).toBeNull();
  });

  it('keeps the promise request time while refreshing its revision', () => {
    const h = new Harness({ config: { minDwellMs: 0, idleCooldownMs: 500 } });
    h.heartbeat();
    h.tickFor(50);
    h.toolStarted({ toolCallId: 't1' });
    h.tickFor(100);

    const first = h.actor().goal.interrupt!;
    expect(first.toGoalId).toBe('work');
    h.heartbeat();
    const refreshed = h.actor().goal.interrupt!;

    expect(refreshed.toGoalId).toBe('work');
    expect(refreshed.atRevision).toBe(h.store.snapshot.factsRevision);
    expect(refreshed.atRevision).toBeGreaterThan(first.atRevision);
    expect(refreshed.requestedAtSimMs).toBe(first.requestedAtSimMs);

    const commit = h.store.dispatch({
      kind: 'goal.commit',
      actorId: ACTOR,
      goalId: 'work',
      reason: 'refreshed promise',
      atRevision: refreshed.atRevision,
    });
    expect(commit.accepted).toBe(true);
    expect(h.actor().goal.active?.goalId).toBe('work');
  });

  it('does not plan for a goal while its replacement is pending', async () => {
    const { h, rt } = makeRuntime();
    await startTyping(h, rt);
    h.goalRequest({ goal: 'think', commandId: 'c-noplan', priorityClass: 'task', onConflict: 'replace' });
    const requests = rt.stats.planRequests;
    rt.step(16);
    expect(rt.action?.phase).toBe('exiting');
    await rt.advance(100); // still exiting, switch pending
    expect(rt.stats.planRequests).toBe(requests);
  });

  it('survives a tool completion (not just a heartbeat) during the exit', async () => {
    const { h, rt } = makeRuntime();
    await startTyping(h, rt);
    h.goalRequest({ goal: 'think', commandId: 'c-tool', priorityClass: 'task', onConflict: 'replace' });
    rt.step(16);
    expect(rt.action?.phase).toBe('exiting');

    h.toolCompleted({ toolCallId: 't1' });
    await rt.advance(1_200);

    expect(h.actor().goal.active?.goalId).toBe('think');
    expect(rt.stats.actionsCancelled).toBe(1);
    expect(rt.failures.filter((f) => f.kind === 'commit-rejected')).toHaveLength(0);
    expect(rt.terminals.filter((t) => t.actionKey === 'typeAtKeyboard')).toHaveLength(1);
  });

  it('switches to the latest requested goal when a second request arrives during the exit', async () => {
    const { h, rt } = makeRuntime();
    await startTyping(h, rt);
    h.goalRequest({ goal: 'think', commandId: 'c-first', priorityClass: 'task', onConflict: 'replace' });
    rt.step(16);
    expect(rt.action?.phase).toBe('exiting');
    await rt.advance(100);

    // Make the second request strictly newer in wall time (the harness clock is
    // frozen otherwise, and equal preempt requests fall back to id order).
    h.advanceWall(5);
    h.goalRequest({ goal: 'rest', commandId: 'c-second', priorityClass: 'task', onConflict: 'replace' });
    await rt.advance(1_200);

    expect(h.actor().goal.active?.goalId).toBe('rest');
    expect(rt.stats.actionsCancelled).toBe(1);
    expect(rt.facts.handsOnKeyboard).toBe(false);
    expect(rt.failures.filter((f) => f.kind === 'commit-rejected')).toHaveLength(0);
  });
});

describe('M2-SPEC-03: an unconfirmed exit holds the body', () => {
  it('accepts an adapter-confirmed emergency stop as the only safe release', () => {
    const motion = new FakeMotionAdapter({ body: { ...BODY }, exitMs: 10_000 });
    const { executor } = makeExecutor({ motion, exitTimeoutMs: 100 });
    expect(executor.start(ACTION_CATALOG.typeAtKeyboard!, startOptions('a1')).ok).toBe(true);
    executor.update(50);
    expect(executor.requestCancel('goal_switch')).toBe(true);
    expect(executor.update(30)).toHaveLength(0);

    const after = executor.update(90);
    expect(after).toHaveLength(1);
    expect(after[0]!.outcome).toBe('cancelled');
    expect(after[0]!.effects).toEqual({});
    expect(after[0]!.reason).toContain('forced_stop');
    // The adapter confirmed the stop before the channels were released.
    expect(motion.exitComplete('a1')).toBe(true);
    expect(executor.lockSnapshot).toHaveLength(0);
    expect(executor.current).toBeNull();
    expect(executor.terminals).toHaveLength(1);
  });

  it('keeps the channels and emits no terminal when the adapter cannot confirm', () => {
    class RefusingAdapter extends FakeMotionAdapter {
      forceStop(): boolean {
        return false;
      }
    }
    const motion = new RefusingAdapter({ body: { ...BODY }, exitMs: 10_000 });
    const { executor } = makeExecutor({ motion, exitTimeoutMs: 100 });
    executor.start(ACTION_CATALOG.typeAtKeyboard!, startOptions('a1'));
    executor.update(50);
    expect(executor.requestCancel('goal_switch')).toBe(true);
    expect(executor.update(120)).toHaveLength(0);

    expect(executor.current?.phase).toBe('exit-unconfirmed');
    expect(executor.terminals).toHaveLength(0);
    expect(executor.lockSnapshot.length).toBeGreaterThan(0);
    expect(executor.hazards.some((x) => x.kind === 'exit-unconfirmed')).toBe(true);

    // The body is unsafe: no second action may drive the same limbs.
    const second = executor.start(ACTION_CATALOG.walkToDesk!, startOptions('a2'));
    expect(second.ok).toBe(false);
    expect(second.reason).toBe('BUSY');

    // Operator/safety recovery is explicit and recorded; only then is it released.
    const recovered = executor.releaseUnconfirmed('a1', 'operator_recovery');
    expect(recovered?.outcome).toBe('cancelled');
    expect(recovered?.reason).toContain('released');
    expect(executor.lockSnapshot).toHaveLength(0);
    expect(executor.terminals).toHaveLength(1);
    expect(executor.hazards.some((x) => x.kind === 'unsafe-release')).toBe(true);
  });

  it('does not commit the new goal while the exit is unconfirmed', async () => {
    class RefusingAdapter extends FakeMotionAdapter {
      forceStop(): boolean {
        return false;
      }
    }
    const motion = new RefusingAdapter({ body: { ...BODY }, exitMs: 10_000 });
    const { h, rt } = makeRuntime({ motion, exitTimeoutMs: 100 });
    await startTyping(h, rt);

    h.goalRequest({ goal: 'think', commandId: 'c-unsafe', priorityClass: 'task', onConflict: 'replace' });
    await rt.advance(400);

    expect(rt.action?.phase).toBe('exit-unconfirmed');
    expect(rt.failures.some((f) => f.kind === 'exit-unconfirmed')).toBe(true);
    expect(rt.terminals.filter((t) => t.actionKey === 'typeAtKeyboard')).toHaveLength(0);
    expect(h.actor().goal.active?.goalId).toBe('work');
    expect(rt.facts.handsOnKeyboard).toBe(false);

    rt.recoverUnconfirmedExit('operator_recovery');
    await rt.advance(400);
    expect(h.actor().goal.active?.goalId).toBe('think');
    expect(rt.terminals.filter((t) => t.actionKey === 'typeAtKeyboard')).toHaveLength(1);
  });
});

describe('M2-SPEC-05: bounded logs and an explicit dispose', () => {
  it('keeps the executor terminal log bounded', () => {
    const { executor } = makeExecutor({ maxTerminalLog: 2 });
    for (let i = 0; i < 3; i += 1) {
      const start = executor.start(ACTION_CATALOG.typeAtKeyboard!, startOptions(`a${i}`));
      expect(start.ok).toBe(true);
      expect(executor.update(1_500)).toHaveLength(1);
    }
    expect(executor.terminals).toHaveLength(2);
    expect(executor.terminals.at(-1)!.actionId).toBe('a2');
  });

  it('dispose terminates the planner and makes the runtime inert', () => {
    const h = new Harness({ config: { minDwellMs: 0, idleCooldownMs: 500 } });
    const terminated: string[] = [];
    const planner: PlannerPort = {
      name: 'stub',
      plan: () => new Promise(() => undefined),
      terminate: () => {
        terminated.push('planner');
      },
    };
    const rt = new NpcRuntime({
      store: h.store,
      actorId: ACTOR,
      planner,
      motion: new FakeMotionAdapter({ body: { ...BODY } }),
    });
    h.heartbeat();
    rt.step(16);
    expect(rt.busy).toBe(true);

    rt.dispose();
    expect(rt.disposed).toBe(true);
    expect(terminated).toEqual(['planner']);
    expect(rt.busy).toBe(false);

    const requests = rt.stats.planRequests;
    rt.step(16);
    expect(rt.stats.planRequests).toBe(requests);
    expect(rt.view().goalId).not.toBeNull();
  });
});

describe('M2-SPEC-06: adapter exceptions become terminals', () => {
  it('turns a throwing preflight into a failed terminal without holding channels', () => {
    class ThrowingPreflight extends FakeMotionAdapter {
      preflight(_definition: unknown, _context: MotionContext, _actionId: string): MotionFeasibility {
        throw new Error('clip lookup failed');
      }
    }
    const motion = new ThrowingPreflight({ body: { ...BODY } });
    const { executor } = makeExecutor({ motion });
    const start = executor.start(ACTION_CATALOG.typeAtKeyboard!, startOptions('a1'));
    expect(start.ok).toBe(false);
    expect(start.reason).toContain('ADAPTER_ERROR');
    expect(start.terminal?.outcome).toBe('failed');
    expect(start.terminal?.effects).toEqual({});
    expect(executor.lockSnapshot).toHaveLength(0);
    expect(executor.current).toBeNull();
    expect(motion.calls.filter((c) => c.kind === 'cleanup')).toHaveLength(1);
  });

  it('turns a throwing advance into a failed terminal with one cleanup', () => {
    class ThrowingAdvance extends FakeMotionAdapter {
      advance(): void {
        throw new Error('IK failure');
      }
    }
    const motion = new ThrowingAdvance({ body: { ...BODY } });
    const { executor } = makeExecutor({ motion });
    expect(executor.start(ACTION_CATALOG.typeAtKeyboard!, startOptions('a1')).ok).toBe(true);
    expect(executor.update(16)).toEqual([]);
    expect(executor.current?.phase).toBe('exiting');
    expect(executor.lockSnapshot.length).toBeGreaterThan(0);
    const terminal = executor.update(motion.exitDurationMs);
    expect(terminal).toHaveLength(1);
    expect(terminal[0]!.outcome).toBe('failed');
    expect(terminal[0]!.reason).toContain('ADAPTER_ERROR');
    expect(terminal[0]!.effects).toEqual({});
    expect(executor.lockSnapshot).toHaveLength(0);
    expect(motion.calls.filter((c) => c.kind === 'cleanup')).toHaveLength(1);
    expect(executor.update(1_000)).toHaveLength(0);
  });

  it('treats a throwing beginExit as an unsafe, unconfirmed exit', () => {
    class ThrowingExit extends FakeMotionAdapter {
      beginExit(): void {
        throw new Error('exit clip missing');
      }
    }
    const motion = new ThrowingExit({ body: { ...BODY } });
    const { executor } = makeExecutor({ motion });
    expect(executor.start(ACTION_CATALOG.typeAtKeyboard!, startOptions('a1')).ok).toBe(true);
    expect(executor.requestCancel('goal_switch')).toBe(true);
    expect(executor.current?.phase).toBe('exit-unconfirmed');
    expect(executor.terminals).toHaveLength(0);
    expect(executor.lockSnapshot.length).toBeGreaterThan(0);
    expect(executor.hazards.some((x) => x.kind === 'adapter-error')).toBe(true);
  });
});
