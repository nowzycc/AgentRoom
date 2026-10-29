/**
 * NE1: the lamp is a domain capability, not a page trick.
 *
 * These tests pin the PLAN the GOAP kernel produces for `lampOn`/`lampOff`
 * (walk → sit → press), the idempotent satisfied case, and the device-feedback
 * fact path the page uses when the real switch actually changes.
 */
import { describe, expect, it } from 'vitest';
import {
  ACTION_CATALOG,
  GOAL_CONDITIONS,
  NpcRuntime,
  defaultFacts,
  goalConditions,
  planSpecs,
  planWithGoap,
  type PlannerPort,
} from '../src/index.js';
import { FakeMotionAdapter } from '../src/actions/motion.js';
import { ACTOR, Harness } from './helpers.js';

function planFor(goal: 'lampOn' | 'lampOff', facts: Record<string, boolean>) {
  return planWithGoap({
    facts: { ...defaultFacts(), ...facts },
    conditions: goalConditions(goal),
    actions: planSpecs(),
  });
}

describe('NE1 lamp goals in the GOAP catalog', () => {
  it('defines the press actions with a switch reach and seated preconditions', () => {
    const on = ACTION_CATALOG.pressLampSwitchOn!;
    const off = ACTION_CATALOG.pressLampSwitchOff!;
    expect(on.preconditions).toEqual({ atDesk: true, sitting: true, lampOn: false });
    expect(off.preconditions).toEqual({ atDesk: true, sitting: true, lampOn: true });
    expect(on.effects).toEqual({ lampOn: true });
    expect(off.effects).toEqual({ lampOn: false });
    expect(on.reach).toEqual({ kind: 'hand', target: 'lamp-switch' });
    expect(on.durationMs).toBeGreaterThan(0);
  });

  it('plans walk → sit → press for lampOn when the lamp is off', () => {
    const result = planFor('lampOn', { lampOn: false });
    expect(result.status).toBe('ok');
    expect(result.actions).toEqual(['walkToDesk', 'sitOnDeskChair', 'pressLampSwitchOn']);
  });

  it('is satisfied (no motion) when the synced device state is already on', () => {
    const result = planFor('lampOn', { lampOn: true });
    expect(result.status).toBe('satisfied');
    expect(result.actions).toEqual([]);
  });

  it('plans the off press when the synced device state is on, and no-ops when off', () => {
    expect(planFor('lampOff', { lampOn: true }).actions).toEqual(['walkToDesk', 'sitOnDeskChair', 'pressLampSwitchOff']);
    expect(planFor('lampOff', { lampOn: false }).status).toBe('satisfied');
  });

  it('registers both goals', () => {
    expect(GOAL_CONDITIONS.lampOn).toEqual({ lampOn: true });
    expect(GOAL_CONDITIONS.lampOff).toEqual({ lampOn: false });
  });

  it('applies device feedback to the plan facts and rejects unknown facts', () => {
    const h = new Harness();
    const planner: PlannerPort = {
      name: 'test',
      plan: async () => ({ status: 'error', planId: '', revision: 0, actions: [], reason: 'NOT_USED' }) as never,
    } as unknown as PlannerPort;
    const rt = new NpcRuntime({ store: h.store, actorId: ACTOR, planner, motion: new FakeMotionAdapter(), maxReplanAttempts: 1 });
    expect(rt.facts.lampOn).toBe(false);

    const first = rt.applyExternalFacts({ lampOn: true });
    expect(first.applied).toEqual(['lampOn']);
    expect(rt.facts.lampOn).toBe(true);

    // The same value is not a second state change.
    expect(rt.applyExternalFacts({ lampOn: true }).applied).toEqual([]);
    // Only declared facts can be written.
    expect(() => rt.applyExternalFacts({ deskLamp: true })).toThrow('UNKNOWN_FACT:deskLamp');
  });
});
