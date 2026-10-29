/**
 * M3-owned M2 carry-overs:
 * - M2Q-06 / M2-SPEC2-03: scene/actor narrowing must be enforced by the runtime,
 *   not trusted from the planner, and a rejected plan must not cause a replan storm
 *   (M2Q-02's unbounded loop for shape-invalid plans);
 * - M2-SPEC2-05: a shared channel table must be injectable so one body cannot be
 *   driven by two runtimes (while separate bodies keep separate tables).
 */
import { describe, expect, it } from 'vitest';
import { NpcRuntime } from '../src/runtime/npc-runtime.js';
import { FakeMotionAdapter } from '../src/actions/motion.js';
import { ChannelLocks } from '../src/resources/channels.js';
import type { PlanRequest, PlanResponse, PlannerPort } from '../src/planner/types.js';
import { ACTOR, Harness } from './helpers.js';

function scriptedPlanner(actions: string[], status: PlanResponse['status'] = 'ok') {
  const calls: PlanRequest[] = [];
  const port: PlannerPort = {
    name: 'scripted',
    async plan(request) {
      calls.push(request);
      return {
        planId: request.planId,
        actorId: request.actorId,
        goalId: request.goalId,
        revision: request.revision,
        status,
        actions: [...actions],
        cost: 1,
        predicted: {},
        core: 'scripted',
        elapsedMs: 0,
      };
    },
    terminate() {},
  };
  return { port, calls };
}

function runtimeWith(
  port: PlannerPort,
  options: { actionKeys?: string[]; locks?: ChannelLocks } = {},
) {
  const h = new Harness({ config: { minDwellMs: 0, idleCooldownMs: 500 } });
  const motion = new FakeMotionAdapter();
  const rt = new NpcRuntime({
    store: h.store,
    actorId: ACTOR,
    planner: port,
    motion,
    ...(options.actionKeys ? { actionKeys: options.actionKeys } : {}),
    ...(options.locks ? { locks: options.locks } : {}),
  });
  return { h, rt, motion };
}

describe('M3 runtime narrowing: the runtime enforces its action allowlist', () => {
  it('refuses a plan action outside actionKeys and starts nothing', async () => {
    const { port, calls } = scriptedPlanner(['walkAway']);
    const { h, rt } = runtimeWith(port, { actionKeys: ['walkToDesk', 'sitOnDeskChair', 'typeAtKeyboard'] });
    h.heartbeat();
    await rt.advance(50);
    h.toolStarted({ toolCallId: 't1' });
    await rt.advance(400);
    expect(rt.stats.actionsStarted).toBe(0);
    const reasons = rt.view().failures.map((f) => f.reason ?? '');
    expect(reasons.some((reason) => reason.startsWith('DISALLOWED_ACTION_IN_PLAN:walkAway'))).toBe(true);
    const requested = calls.length;
    await rt.advance(1_000);
    // The rejected plan must not be retried every frame.
    expect(calls.length).toBe(requested);
    expect(requested).toBeLessThan(10);
  });

  it('does not execute the known half of a mixed plan', async () => {
    const { port } = scriptedPlanner(['walkToDesk', 'walkAway']);
    const { h, rt } = runtimeWith(port, { actionKeys: ['walkToDesk'] });
    h.heartbeat();
    await rt.advance(50);
    h.toolStarted({ toolCallId: 't1' });
    await rt.advance(400);
    expect(rt.stats.actionsStarted).toBe(0);
    expect(rt.view().failures.some((f) => (f.reason ?? '').includes('DISALLOWED_ACTION_IN_PLAN'))).toBe(true);
  });

  it('still applies an allowed plan (control)', async () => {
    const { port } = scriptedPlanner(['walkToDesk']);
    const { h, rt } = runtimeWith(port, { actionKeys: ['walkToDesk'] });
    h.heartbeat();
    await rt.advance(50);
    h.toolStarted({ toolCallId: 't1' });
    await rt.advance(100);
    expect(rt.stats.actionsStarted).toBe(1);
    expect(rt.view().action?.actionKey).toBe('walkToDesk');
  });
});

describe('M3 runtime narrowing: channel tables are per body', () => {
  it('lets two runtimes with separate tables act at the same time', async () => {
    const a = runtimeWith(scriptedPlanner(['walkToDesk']).port, { locks: new ChannelLocks() });
    const b = runtimeWith(scriptedPlanner(['walkToDesk']).port, { locks: new ChannelLocks() });
    for (const inst of [a, b]) {
      inst.h.heartbeat();
      await inst.rt.advance(50);
      inst.h.toolStarted({ toolCallId: 't1' });
      await inst.rt.advance(100);
    }
    expect(a.rt.view().action?.actionKey).toBe('walkToDesk');
    expect(b.rt.view().action?.actionKey).toBe('walkToDesk');
  });

  it('refuses two runtimes driving one body through a shared table', async () => {
    const locks = new ChannelLocks();
    const a = runtimeWith(scriptedPlanner(['walkToDesk']).port, { locks });
    const b = runtimeWith(scriptedPlanner(['walkToDesk']).port, { locks });
    a.h.heartbeat();
    await a.rt.advance(50);
    a.h.toolStarted({ toolCallId: 't1' });
    await a.rt.advance(100);
    expect(a.rt.view().action?.actionKey).toBe('walkToDesk');

    b.h.heartbeat();
    await b.rt.advance(50);
    b.h.toolStarted({ toolCallId: 't1' });
    await b.rt.advance(200);
    expect(b.rt.stats.actionsStarted).toBe(0);
    expect(b.rt.view().failures.some((f) => (f.reason ?? '').includes('CHANNEL_CONFLICT'))).toBe(true);
    expect(locks.ownerOf('locomotion')).not.toBeNull();
  });
});
