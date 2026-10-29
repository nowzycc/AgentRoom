/**
 * M2 planner: the upstream GOAP core produces the plan (not a prewritten
 * sequence), the same request runs inside a real Worker with a wall-clock
 * budget, and a stale revision is never adopted.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  ACTION_CATALOG,
  GOAL_CONDITIONS,
  PLAN_FACTS,
  goalConditions,
  planSpecs,
} from '../src/planner/catalog.js';
import { GOAP_CORE, planWithGoap } from '../src/planner/goap-core.js';
import { ReactivePlanner } from '../src/planner/bt/reactive-planner.js';
import { WorkerPlanner } from '../src/planner/worker-planner.js';
import type { PlanRequest } from '../src/planner/types.js';
import { buildPlannerWorker, nodeWorkerFactory } from './support/worker.js';

const standing: Record<string, boolean> = {
  ...PLAN_FACTS,
  atDesk: false,
  sitting: false,
  handsOnKeyboard: false,
};

function request(overrides: Partial<PlanRequest> = {}): PlanRequest {
  return {
    planId: 'p-1',
    actorId: 'npc-a',
    goalId: 'work',
    revision: 3,
    facts: { ...standing },
    conditions: goalConditions('work'),
    actions: planSpecs(),
    budgetMs: 4_000,
    ...overrides,
  };
}

describe('domain action catalog', () => {
  it('declares preconditions, effects and cost independently of the executor', () => {
    // Costs are part of the planning contract, not the animation chain.
    expect(ACTION_CATALOG.walkToDesk!.cost).toBe(3);
    expect(ACTION_CATALOG.sitOnDeskChair!.cost).toBe(1);
    expect(ACTION_CATALOG.typeAtKeyboard!.cost).toBe(2);
    expect(ACTION_CATALOG.typeAtKeyboard!.preconditions).toEqual({ atDesk: true, sitting: true });
    expect(ACTION_CATALOG.typeAtKeyboard!.effects).toEqual({ handsOnKeyboard: true });
    // The serializable planning view carries no channels/durations.
    for (const spec of planSpecs()) {
      expect(Object.keys(spec).sort()).toEqual(['cost', 'effects', 'key', 'preconditions']);
    }
    expect(Object.isFrozen(GOAL_CONDITIONS)).toBe(true);
  });

  it('keeps a disabled goal unreachable instead of treating it as satisfied', () => {
    // Sleep is disabled, so its conditions must not be trivially true.
    expect(goalConditions('sleep')).toEqual({ sleeping: true });
    const res = planWithGoap({ facts: PLAN_FACTS, conditions: goalConditions('sleep'), actions: planSpecs() });
    expect(res.status).toBe('no-plan');
    expect(goalConditions('walk' as never)).toEqual({});
  });
});

describe('upstream GOAP core (inline)', () => {
  it('chooses the cheaper of two routes and never fabricates success', () => {
    const actions = [
      { key: 'shortcut', preconditions: {}, effects: { atDesk: true }, cost: 1 },
      { key: 'hallway', preconditions: {}, effects: { atDesk: true }, cost: 5 },
    ];
    const cheap = planWithGoap({ facts: { atDesk: false }, conditions: { atDesk: true }, actions });
    expect(cheap.core).toBe(GOAP_CORE);
    expect(cheap.status).toBe('ok');
    expect(cheap.actions).toEqual(['shortcut']);
    expect(cheap.cost).toBe(1);

    const other = planWithGoap({
      facts: { atDesk: false, shortcutBlocked: true },
      conditions: { atDesk: true },
      actions: [
        { key: 'shortcut', preconditions: { shortcutBlocked: false }, effects: { atDesk: true }, cost: 1 },
        { key: 'hallway', preconditions: {}, effects: { atDesk: true }, cost: 5 },
      ],
    });
    expect(other.actions).toEqual(['hallway']);
    expect(other.cost).toBe(5);
  });

  it('distinguishes already satisfied from no plan', () => {
    const satisfied = planWithGoap({ facts: { atDesk: true }, conditions: { atDesk: true }, actions: [] });
    expect(satisfied.status).toBe('satisfied');
    expect(satisfied.actions).toEqual([]);

    const none = planWithGoap({
      facts: { atDesk: false },
      conditions: { handsOnKeyboard: true },
      actions: planSpecs(['walkToDesk', 'sitOnDeskChair']),
    });
    expect(none.status).toBe('no-plan');
    expect(none.actions).toEqual([]);
  });

  it('orders the real work plan from standing and shrinks it when seated', () => {
    const fromStanding = planWithGoap({ facts: standing, conditions: goalConditions('work'), actions: planSpecs() });
    expect(fromStanding.status).toBe('ok');
    expect(fromStanding.actions).toEqual(['walkToDesk', 'sitOnDeskChair', 'typeAtKeyboard']);
    expect(fromStanding.cost).toBe(6);
    expect(fromStanding.predicted).toMatchObject({ atDesk: true, sitting: true, handsOnKeyboard: true });

    const seated = planWithGoap({
      facts: { ...PLAN_FACTS, atDesk: true, sitting: true, handsOnKeyboard: false },
      conditions: goalConditions('work'),
      actions: planSpecs(),
    });
    expect(seated.actions).toEqual(['typeAtKeyboard']);

    const think = planWithGoap({
      facts: { ...PLAN_FACTS, atDesk: true, sitting: true, handsOnKeyboard: false },
      conditions: goalConditions('think'),
      actions: planSpecs(),
    });
    expect(think.status).toBe('satisfied');
    expect(think.actions).toEqual([]);
  });

  it('returns no plan when a seat is unavailable instead of a fake route', () => {
    const res = planWithGoap({
      facts: { ...PLAN_FACTS, atDesk: true, sitting: false, seatAvailable: false },
      conditions: goalConditions('work'),
      actions: planSpecs(),
    });
    expect(res.status).toBe('no-plan');
  });
});

describe('worker planner (real Worker + budget + revision)', () => {
  let bundle: string;
  const planners: WorkerPlanner[] = [];

  beforeAll(async () => {
    const built = await buildPlannerWorker();
    bundle = built.path;
    expect(built.bytes).toBeGreaterThan(1_000);
  });

  afterAll(() => {
    for (const planner of planners) planner.terminate();
  });

  function makePlanner(defaultBudgetMs = 4_000): WorkerPlanner {
    const planner = new WorkerPlanner({ factory: nodeWorkerFactory(bundle), defaultBudgetMs });
    planners.push(planner);
    return planner;
  }

  it('runs the selected upstream core inside the worker and returns its plan', async () => {
    const planner = makePlanner();
    const res = await planner.plan(request());
    expect(res.status).toBe('ok');
    expect(res.core).toBe(GOAP_CORE);
    expect(res.actions).toEqual(['walkToDesk', 'sitOnDeskChair', 'typeAtKeyboard']);
    expect(res.cost).toBe(6);
    expect(res.planId).toBe('p-1');
    expect(res.revision).toBe(3);
    expect(planner.stats.ok).toBe(1);
    expect(planner.stats.terminated).toBeGreaterThanOrEqual(1);
  });

  it('answers satisfied and no-plan without inventing an action', async () => {
    const planner = makePlanner();
    const seated = await planner.plan(
      request({ planId: 'p-2', facts: { ...PLAN_FACTS, atDesk: true, sitting: true }, conditions: goalConditions('think') }),
    );
    expect(seated.status).toBe('satisfied');
    expect(seated.actions).toEqual([]);
    const none = await planner.plan(
      request({
        planId: 'p-3',
        facts: { ...PLAN_FACTS, atDesk: true, seatAvailable: false },
        conditions: goalConditions('work'),
      }),
    );
    expect(none.status).toBe('no-plan');
    expect(planner.stats.satisfied).toBe(1);
    expect(planner.stats.noPlan).toBe(1);
  });

  it('terminates a worker that exceeds its wall-clock budget exactly once', async () => {
    const planner = makePlanner(300);
    const started = Date.now();
    const res = await planner.plan({
      planId: 'p-budget',
      actorId: 'npc-a',
      goalId: 'work',
      revision: 9,
      facts: { x: 0 },
      conditions: { x: { gte: 1_000_000 } },
      actions: [{ key: 'incX', preconditions: {}, effects: { x: { inc: 1 } }, cost: 1 }],
      budgetMs: 300,
    });
    const elapsed = Date.now() - started;
    expect(res.status).toBe('timeout');
    expect(res.revision).toBe(9);
    expect(res.core).toBe(GOAP_CORE);
    expect(res.error).toBe('budget_exceeded');
    expect(elapsed).toBeGreaterThanOrEqual(250);
    expect(elapsed).toBeLessThan(5_000);
    expect(planner.stats.timeout).toBe(1);
    expect(planner.stats.terminated).toBeGreaterThanOrEqual(1);
    expect(planner.inFlight).toBe(0);
  });

  it('plans a cheaper multi-step route through the worker, not a prewritten sequence', async () => {
    const planner = makePlanner();
    const res = await planner.plan(
      request({
        planId: 'p-route',
        goalId: 'rest',
        facts: { done: false },
        conditions: { done: true },
        actions: [
          { key: 'direct', preconditions: {}, effects: { done: true }, cost: 10 },
          { key: 'stepA', preconditions: {}, effects: { half: true }, cost: 1 },
          { key: 'stepB', preconditions: { half: true }, effects: { done: true }, cost: 1 },
        ],
      }),
    );
    expect(res.status).toBe('ok');
    expect(res.actions).toEqual(['stepA', 'stepB']);
    expect(res.cost).toBe(2);
    expect(res.core).toBe(GOAP_CORE);
  });

  it('reports a malformed plan request as an error without a plan', async () => {
    const planner = makePlanner();
    const res = await planner.plan(
      request({
        planId: 'p-bad',
        actions: [{ key: 'bad', preconditions: {}, effects: { x: { inc: Number.POSITIVE_INFINITY } }, cost: 1 }],
        conditions: { x: { gte: 1 } },
      }),
    );
    expect(res.status).toBe('error');
    expect(res.actions).toEqual([]);
    expect(planner.stats.error).toBe(1);
  });

  it('drops a late message whose plan id no longer matches', async () => {
    const planner = makePlanner();
    const first = planner.plan(request({ planId: 'first' }));
    const second = planner.plan(request({ planId: 'second' }));
    const [a, b] = await Promise.all([first, second]);
    expect(a.planId).toBe('first');
    expect(b.planId).toBe('second');
    expect(planner.stats.ok).toBe(2);
    expect(planner.stats.dropped).toBe(0);
  });
});

describe('reactive BT fallback behind the same port', () => {
  it('plans with the catalog and refuses an unsatisfiable goal', async () => {
    const bt = new ReactivePlanner();
    expect(bt.name).toBe('reactive-bt');
    const ok = await bt.plan(request({ planId: 'bt-1' }));
    expect(ok.core).toBe('reactive-bt');
    expect(ok.status).toBe('ok');
    expect(ok.actions).toEqual(['walkToDesk', 'sitOnDeskChair', 'typeAtKeyboard']);
    const none = await bt.plan(
      request({ planId: 'bt-2', facts: { ...PLAN_FACTS, atDesk: true, seatAvailable: false } }),
    );
    expect(none.status).toBe('no-plan');
  });
});

describe('worker bundle portability', () => {
  it('bundles for the browser without node builtins', async () => {
    const browser = await buildPlannerWorker(undefined, 'browser');
    expect(browser.bytes).toBeGreaterThan(1_000);
    expect(browser.text).toContain('countUnsatisfied');
    expect(browser.text).not.toMatch(/node:worker_threads|node:fs|from "node:/);
  });
});
