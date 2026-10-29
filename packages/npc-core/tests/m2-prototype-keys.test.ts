/**
 * M2 prototype-key regression: plan output and action ids are dynamic strings.
 * A plain-object lookup would resolve `toString`/`constructor` from
 * Object.prototype (the M1-Q2-01 defect on a new surface). Nothing here may
 * crash, execute an inherited function, or silently accept a non-action.
 */
import { describe, expect, it } from 'vitest';
import { NpcRuntime } from '../src/runtime/npc-runtime.js';
import { FakeMotionAdapter } from '../src/actions/motion.js';
import { getActionDefinition, goalConditions, planSpecs } from '../src/planner/catalog.js';
import type { PlanRequest, PlanResponse, PlannerPort } from '../src/planner/types.js';
import { Harness } from './helpers.js';

class ScriptedPlanner implements PlannerPort {
  readonly name = 'scripted';
  private readonly response: Omit<PlanResponse, 'planId' | 'actorId' | 'goalId' | 'revision'>;

  constructor(response: Omit<PlanResponse, 'planId' | 'actorId' | 'goalId' | 'revision'>) {
    this.response = response;
  }

  async plan(request: PlanRequest): Promise<PlanResponse> {
    return {
      planId: request.planId,
      actorId: request.actorId,
      goalId: request.goalId,
      revision: request.revision,
      ...this.response,
    };
  }

  terminate(): void {}
}

describe('M2 prototype-named action ids', () => {
  it('never resolves an inherited property as an action definition', () => {
    for (const key of ['toString', 'constructor', 'hasOwnProperty', 'valueOf', '__proto__']) {
      expect(getActionDefinition(key)).toBeUndefined();
      expect(planSpecs([key])).toEqual([]);
    }
    expect(getActionDefinition('walkToDesk')?.key).toBe('walkToDesk');
  });

  it('returns empty conditions for a prototype-named goal instead of a function', () => {
    const conditions = goalConditions('toString' as never);
    expect(conditions).toEqual({});
    expect(typeof conditions).toBe('object');
  });

  it('refuses a plan that names an inherited action instead of executing it', async () => {
    const h = new Harness();
    const planner = new ScriptedPlanner({
      status: 'ok',
      actions: ['toString'],
      cost: 1,
      predicted: {},
      core: 'scripted',
    });
    const rt = new NpcRuntime({
      store: h.store,
      actorId: 'npc-a',
      planner,
      motion: new FakeMotionAdapter(),
    });
    h.heartbeat();
    await rt.advance(100);
    expect(rt.stats.actionsStarted).toBe(0);
    expect(rt.action).toBeNull();
    expect(rt.failures.some((f) => f.kind === 'no-plan')).toBe(true);
    expect(rt.plan).toBeNull();
  });

  it('runs an actor whose id is a prototype name without touching Object.prototype', async () => {
    const h = new Harness({ actors: ['toString'] });
    const rt = new NpcRuntime({
      store: h.store,
      actorId: 'toString',
      planner: new ScriptedPlanner({ status: 'satisfied', actions: [], cost: 0, predicted: {}, core: 'scripted' }),
      motion: new FakeMotionAdapter(),
    });
    h.heartbeat({ actorId: 'toString' });
    await rt.advance(100);
    expect(rt.view().goalId).toBe('idle');
    expect(({} as Record<string, unknown>).toString).toBe(Object.prototype.toString);
  });
});
