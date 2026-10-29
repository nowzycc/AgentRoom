/**
 * M4 r5 regression: facts that belong to the WORK goal must not outlive it.
 *
 * Measured on the real page (tools/npc-v2/capture/m4r5-resit-probe.mjs):
 *   - after `stand`, `handsOnKeyboard` stayed true, so the next work plan was
 *     only `sitOnDeskChair` and the goal was then "satisfied" with the avatar
 *     seated but not typing;
 *   - after a goal switch to `think`, the typing effect stayed committed for
 *     the same reason.
 *
 * The fix is in the domain catalog (standUp clears the hands effect) and in the
 * runtime's fact sync (handsOnKeyboard is only true while the active goal is
 * work). These tests pin both, using the real GOAP worker and the fake motion
 * adapter, so a later refactor cannot silently reintroduce the stale fact.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NpcRuntime } from '../src/runtime/npc-runtime.js';
import { FakeMotionAdapter } from '../src/actions/motion.js';
import { WorkerPlanner } from '../src/planner/worker-planner.js';
import { ACTION_CATALOG } from '../src/planner/catalog.js';
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

function makeRuntime() {
  const h = new Harness({ config: { minDwellMs: 0, idleCooldownMs: 500 } });
  const planner = new WorkerPlanner({ factory: nodeWorkerFactory(bundle), defaultBudgetMs: 4_000 });
  planners.push(planner);
  const motion = new FakeMotionAdapter({ body: { handReachM: 0.7, keyboardDistanceM: 0.5, seatClearanceM: 0.3 } });
  const rt = new NpcRuntime({ store: h.store, actorId: ACTOR, planner, motion, maxReplanAttempts: 3 });
  return { h, rt, motion };
}

async function until(rt: NpcRuntime, predicate: () => boolean, maxMs = 12_000, label = 'condition'): Promise<void> {
  const step = 16;
  for (let elapsed = 0; elapsed < maxMs; elapsed += step) {
    if (predicate()) return;
    await rt.advance(step);
  }
  throw new Error(`timed out waiting for ${label}`);
}

describe('M4 r5: stand/re-sit facts', () => {
  it('standUp declares that the hands leave the keyboard', () => {
    expect(ACTION_CATALOG.standUp!.effects).toEqual({ sitting: false, handsOnKeyboard: false });
  });

  it('clears handsOnKeyboard on stand and plans the typing step again on the re-sit', async () => {
    const { h, rt } = makeRuntime();
    h.heartbeat();
    await rt.advance(50);
    h.toolStarted({ toolCallId: 't1' });
    await until(rt, () => rt.facts.handsOnKeyboard === true, 12_000, 'seated typing');
    expect(rt.plan?.actions).toEqual(['walkToDesk', 'sitOnDeskChair', 'typeAtKeyboard']);

    h.goalRequest({ goal: 'idle', commandId: 'c-stand', priorityClass: 'task', onConflict: 'replace' });
    await until(rt, () => h.actor().goal.active?.goalId === 'idle', 4_000, 'idle goal');
    await until(rt, () => rt.plan?.status === 'satisfied' && rt.action === null, 8_000, 'stand settled');
    expect(rt.facts.sitting).toBe(false);
    expect(rt.facts.handsOnKeyboard).toBe(false);
    expect(h.actor().posture).toBe('standing');

    // The page retires its own one-shot goal request when a new tool starts
    // (M4 slice policy: one UI intent at a time). Do the same here so this test
    // isolates the FACT defect, not the command-priority rule.
    h.goalCancel({ targetCommandId: 'c-stand', commandId: 'c-retire' });
    // The new work request must plan BOTH the sit and the typing: a plan of
    // only sitOnDeskChair is the stale-fact defect this test pins.
    h.toolStarted({ toolCallId: 't2' });
    await until(rt, () => rt.plan?.status === 'ok' && rt.plan.goalId === 'work', 4_000, 're-sit plan');
    expect(rt.plan?.actions).toEqual(['sitOnDeskChair', 'typeAtKeyboard']);
    await until(rt, () => rt.facts.handsOnKeyboard === true, 12_000, 'typing again');
    expect(rt.facts.sitting).toBe(true);
    expect(rt.stats.actionsFailed).toBe(0);
  });

  it('clears handsOnKeyboard when the work goal is replaced by think', async () => {
    const { h, rt } = makeRuntime();
    h.heartbeat();
    await rt.advance(50);
    h.toolStarted({ toolCallId: 't1' });
    await until(rt, () => rt.facts.handsOnKeyboard === true, 12_000, 'seated typing');

    h.goalRequest({ goal: 'think', commandId: 'c-think', priorityClass: 'task', onConflict: 'replace' });
    await until(rt, () => h.actor().goal.active?.goalId === 'think', 4_000, 'think goal');
    await rt.advance(200);
    expect(rt.facts.handsOnKeyboard).toBe(false);
    expect(rt.facts.sitting).toBe(true);
  });
});
