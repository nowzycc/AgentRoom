/**
 * M2 acceptance evidence probe. Real worker, real domain store, fake motion.
 * Run from packages/npc-core:
 *   npx vite-node scripts/m2-evidence.ts
 */
import { Harness } from '../tests/helpers.js';
import { buildPlannerWorker, nodeWorkerFactory } from '../tests/support/worker.js';
import { ACTION_CATALOG, goalConditions, planSpecs } from '../src/planner/catalog.js';
import { GOAP_CORE, planWithGoap } from '../src/planner/goap-core.js';
import { WorkerPlanner } from '../src/planner/worker-planner.js';
import { FakeMotionAdapter } from '../src/actions/motion.js';
import { ActionExecutor } from '../src/actions/executor.js';
import { ChannelLocks } from '../src/resources/channels.js';
import { NpcRuntime } from '../src/runtime/npc-runtime.js';

const out = (label: string, value: unknown) => console.log(label, JSON.stringify(value));

console.log('== core ==');
out('core', GOAP_CORE);
const built = await buildPlannerWorker();
out('workerBundleBytes', built.bytes);

console.log('== inline upstream: cheaper multi-step route ==');
out(
  'route',
  planWithGoap({
    facts: { done: false },
    conditions: { done: true },
    actions: [
      { key: 'direct', preconditions: {}, effects: { done: true }, cost: 10 },
      { key: 'stepA', preconditions: {}, effects: { half: true }, cost: 1 },
      { key: 'stepB', preconditions: { half: true }, effects: { done: true }, cost: 1 },
    ],
  }),
);

console.log('== worker: real plan + budget ==');
const planner = new WorkerPlanner({ factory: nodeWorkerFactory(built.path), defaultBudgetMs: 4000 });
const workFacts = { atDesk: false, sitting: false, handsOnKeyboard: false, seatAvailable: true };
const planned = await planner.plan({
  planId: 'evidence-1',
  actorId: 'npc-a',
  goalId: 'work',
  revision: 1,
  facts: workFacts,
  conditions: goalConditions('work'),
  actions: planSpecs(),
  budgetMs: 3000,
});
out('plan', { status: planned.status, actions: planned.actions, cost: planned.cost, core: planned.core, elapsedMs: planned.elapsedMs });
out('plannerStatsAfterPlan', planner.stats);

const budgetStart = Date.now();
const timedOut = await planner.plan({
  planId: 'evidence-budget',
  actorId: 'npc-a',
  goalId: 'work',
  revision: 2,
  facts: { x: 0 },
  conditions: { x: { gte: 1000000 } },
  actions: [{ key: 'incX', preconditions: {}, effects: { x: { inc: 1 } }, cost: 1 }],
  budgetMs: 300,
});
out('budget', { status: timedOut.status, error: timedOut.error, wallMs: Date.now() - budgetStart, inFlight: planner.inFlight, stats: planner.stats });

console.log('== executor: confirmed success vs cancel ==');
const motion = new FakeMotionAdapter({ body: { handReachM: 0.7, keyboardDistanceM: 0.5, seatClearanceM: 0.3 } });
const locks = new ChannelLocks();
const executor = new ActionExecutor({ motion, locks, body: motion.body, nowSimMs: () => 0, actionTimeoutMs: 5000 });
const walk = executor.start(ACTION_CATALOG.walkToDesk!, {
  actionId: 'walk-1',
  goalId: 'work',
  planId: 'p',
  planRevision: 1,
  facts: { atDesk: false },
});
out('walkStart', { ok: walk.ok, phase: executor.current?.phase, locks: locks.snapshot() });
const walkTerminal = [...executor.update(1000), ...executor.update(1000)];
out('walkTerminal', walkTerminal.map((t) => ({ outcome: t.outcome, effects: t.effects, elapsedMs: t.elapsedMs })));
out('locksAfter', locks.snapshot());

const typeStart = executor.start(ACTION_CATALOG.typeAtKeyboard!, {
  actionId: 'type-1',
  goalId: 'work',
  planId: 'p',
  planRevision: 1,
  facts: { atDesk: true, sitting: true },
});
executor.update(300);
out('typeBeforeCancel', { start: typeStart.ok, phase: executor.current?.phase });
out('cancelRequested', executor.requestCancel('goal_switch'));
out('phaseAfterCancel', executor.current?.phase);
const exitMid = executor.update(150);
out('exitMid', { terminals: exitMid.length, phase: executor.current?.phase });
const exitDone = executor.update(200);
out('exitDone', exitTerminal(exitDone));
out('locksAfterCancel', locks.snapshot());

function exitTerminal(terminals: ReturnType<ActionExecutor['update']>) {
  return terminals.map((t) => ({ outcome: t.outcome, reason: t.reason, effects: t.effects, exitElapsedMs: t.exitElapsedMs }));
}

console.log('== runtime: work chain then think at the same seat ==');
const h = new Harness({ config: { minDwellMs: 0, idleCooldownMs: 500 } });
const runtimePlanner = new WorkerPlanner({ factory: nodeWorkerFactory(built.path), defaultBudgetMs: 4000 });
const runtimeMotion = new FakeMotionAdapter({ body: { handReachM: 0.7, keyboardDistanceM: 0.5, seatClearanceM: 0.3 } });
const rt = new NpcRuntime({ store: h.store, actorId: 'npc-a', planner: runtimePlanner, motion: runtimeMotion });
h.heartbeat();
await rt.advance(100);
out('idle', { goal: h.actor().goal.active?.goalId, plan: rt.plan?.status, facts: rt.facts });
h.toolStarted({ toolCallId: 't1' });
for (let i = 0; i < 800 && rt.facts.handsOnKeyboard !== true; i += 1) await rt.advance(16);
out('work', {
  goal: h.actor().goal.active?.goalId,
  planActions: rt.plan?.actions,
  planCore: rt.plan?.core,
  facts: rt.facts,
  posture: h.actor().posture,
  stats: rt.stats,
  terminals: rt.terminals.map((t) => ({ key: t.actionKey, outcome: t.outcome, elapsedMs: t.elapsedMs })),
});

h.goalRequest({ goal: 'think', commandId: 'c-think', priorityClass: 'task', onConflict: 'replace' });
for (let i = 0; i < 200 && h.actor().goal.active?.goalId !== 'think'; i += 1) await rt.advance(16);
await rt.advance(100);
out('thinkAtSameSeat', {
  goal: h.actor().goal.active?.goalId,
  plan: { status: rt.plan?.status, actions: rt.plan?.actions },
  sitBegins: runtimeMotion.calls.filter((c) => c.kind === 'begin' && c.actionKey === 'sitOnDeskChair').length,
  posture: h.actor().posture,
});

console.log('== runtime: cancel mid-action (effect must not commit) ==');
const h2 = new Harness({ config: { minDwellMs: 0, idleCooldownMs: 500 } });
const planner2 = new WorkerPlanner({ factory: nodeWorkerFactory(built.path), defaultBudgetMs: 4000 });
const motion2 = new FakeMotionAdapter({ body: { handReachM: 0.7, keyboardDistanceM: 0.5, seatClearanceM: 0.3 } });
const rt2 = new NpcRuntime({ store: h2.store, actorId: 'npc-a', planner: planner2, motion: motion2 });
h2.heartbeat();
await rt2.advance(50);
h2.toolStarted({ toolCallId: 't1' });
for (let i = 0; i < 800 && rt2.action?.actionKey !== 'typeAtKeyboard'; i += 1) await rt2.advance(16);
await rt2.advance(200);
h2.goalRequest({ goal: 'think', commandId: 'c-think', priorityClass: 'task', onConflict: 'replace' });
rt2.step(16);
out('cancelPhase', { action: rt2.action?.actionKey, phase: rt2.action?.phase, handsOnKeyboard: rt2.facts.handsOnKeyboard });
await rt2.advance(100);
out('cancelMidExit', { phase: rt2.action?.phase, handsOnKeyboard: rt2.facts.handsOnKeyboard });
for (let i = 0; i < 300 && h2.actor().goal.active?.goalId !== 'think'; i += 1) await rt2.advance(16);
out('cancelDone', {
  goal: h2.actor().goal.active?.goalId,
  plan: rt2.plan?.status,
  handsOnKeyboard: rt2.facts.handsOnKeyboard,
  typeTerminals: rt2.terminals
    .filter((t) => t.actionKey === 'typeAtKeyboard')
    .map((t) => ({ outcome: t.outcome, effects: t.effects })),
  stats: rt2.stats,
});

console.log('== runtime: unreachable hands ==');
const h3 = new Harness({ config: { minDwellMs: 0, idleCooldownMs: 500 } });
const planner3 = new WorkerPlanner({ factory: nodeWorkerFactory(built.path), defaultBudgetMs: 4000 });
const motion3 = new FakeMotionAdapter({ body: { handReachM: 0.4, keyboardDistanceM: 0.62, seatClearanceM: 0.3 } });
const rt3 = new NpcRuntime({ store: h3.store, actorId: 'npc-a', planner: planner3, motion: motion3 });
h3.heartbeat();
await rt3.advance(50);
h3.toolStarted({ toolCallId: 't1' });
for (let i = 0; i < 1200 && !rt3.failures.some((f) => f.kind === 'replan-exhausted'); i += 1) await rt3.advance(16);
out('unreachable', {
  facts: rt3.facts,
  failures: rt3.failures.map((f) => ({ kind: f.kind, reason: f.reason })),
  stats: rt3.stats,
  typeBegins: motion3.calls.filter((c) => c.kind === 'begin' && c.actionKey === 'typeAtKeyboard').length,
});
const requestsAfterExhaustion = rt3.stats.planRequests;
await rt3.advance(1000);
out('afterExhaustion', { planRequestsBefore: requestsAfterExhaustion, after: rt3.stats.planRequests });

planner.terminate();
runtimePlanner.terminate();
planner2.terminate();
planner3.terminate();
console.log('DONE');
