import { describe, expect, it } from 'vitest';
import { NpcRuntime } from '../src/runtime/npc-runtime.js';
import { FakeMotionAdapter } from '../src/actions/motion.js';
import { planWithGoap } from '../src/planner/goap-core.js';
import { ACTOR, Harness } from './helpers.js';

function fixture() {
  const h = new Harness({ config: { minDwellMs: 0, idleCooldownMs: 0 } });
  const motion = new FakeMotionAdapter();
  const rt = new NpcRuntime({ store: h.store, actorId: ACTOR, motion,
    planner: { name: 'real-goap', plan: async (request) => ({ ...request, ...planWithGoap(request) }), terminate() {} } });
  h.heartbeat();
  return { h, rt, motion };
}
async function until(rt: NpcRuntime, predicate: () => boolean) {
  for (let i = 0; i < 1600; i += 1) {
    if (predicate()) return;
    await rt.advance(16);
  }
  throw new Error('fixed-step budget exhausted');
}

describe('H1a scoped cancellation', () => {
  it('holds seated occupancy semantics rather than auto-standing when work is cancelled', async () => {
    // Given: a satisfied seated work goal (motion fake; browser proves actual posture).
    const { h, rt, motion } = fixture();
    h.goalRequest({ goal: 'work', commandId: 'work', onConflict: 'replace' });
    await until(rt, () => rt.facts.handsOnKeyboard === true);
    const begins = motion.calls.filter((call) => call.kind === 'begin').length;
    // When: operator stops work, including a full autonomy cooldown.
    rt.cancel({ scope: 'work' });
    await rt.advance(1000);
    // Then: no stand or continued typing, and the request is actually cancelled.
    expect(rt.facts.sitting).toBe(true);
    expect(rt.facts.handsOnKeyboard).toBe(false);
    expect(h.actor().commands.work?.status).toBe('cancelled');
    expect(motion.calls.filter((call) => call.kind === 'begin')).toHaveLength(begins);
    expect(rt.executionHeld).toBe(true);
  });

  it('cancels only the current attempt and does not immediately restart its goal', async () => {
    // Given: an executing work attempt and a live tool.
    const { h, rt } = fixture();
    h.toolStarted({ toolCallId: 'tool' });
    await until(rt, () => rt.action?.actionKey === 'typeAtKeyboard');
    const id = rt.action?.actionId;
    // When: action cancellation completes the existing safe exit.
    rt.cancel({ scope: 'action' });
    expect(rt.action?.phase).toBe('exiting');
    await rt.advance(1000);
    // Then: one cancelled terminal, no repeated work, and tool truth is untouched.
    expect(rt.terminals.filter((t) => t.actionId === id).map((t) => t.outcome)).toEqual(['cancelled']);
    expect(rt.action).toBe(null);
    expect(h.actor().goal.active?.goalId).toBe('work');
    expect(Object.values(h.actor().tools).some((t) => t.phase === 'active')).toBe(true);
    expect(rt.facts.handsOnKeyboard).toBe(false);
  });

  it('leaves an unrelated active goal executing when another goal command is cancelled', async () => {
    // Given: an active work request and a lower-priority queued think request.
    const { h, rt } = fixture();
    h.goalRequest({ goal: 'work', commandId: 'work', onConflict: 'replace' });
    await until(rt, () => rt.action?.actionKey === 'typeAtKeyboard');
    h.goalRequest({ goal: 'think', commandId: 'other', onConflict: 'queue' });
    const id = rt.action?.actionId;
    // When: only the other command is withdrawn.
    rt.cancel({ scope: 'goal', targetCommandId: 'other' });
    // Then: no attempt interruption and no broad goal retirement.
    expect(rt.action?.actionId).toBe(id);
    expect(rt.action?.phase).toBe('running');
    expect(h.actor().commands.work?.status).toBe('active');
    expect(h.actor().commands.other?.status).toBe('cancelled');
    expect(rt.executionHeld).toBe(false);
  });

  it('holds after cancelling the last goal but accepts a new explicit stand', async () => {
    // Given: seated work whose only command is withdrawn.
    const { h, rt } = fixture();
    h.goalRequest({ goal: 'work', commandId: 'work', onConflict: 'replace' });
    await until(rt, () => rt.facts.handsOnKeyboard === true);
    rt.cancel({ scope: 'goal', targetCommandId: 'work' });
    await rt.advance(600);
    expect(rt.facts.sitting).toBe(true);
    // When: a new explicit stand intent arrives.
    h.goalRequest({ goal: 'idle', commandId: 'stand', onConflict: 'replace' });
    await until(rt, () => rt.facts.sitting === false);
    // Then: hold is released for that intent, through the normal executor.
    expect(rt.executionHeld).toBe(false);
    expect(rt.terminals.some((t) => t.actionKey === 'standUp' && t.outcome === 'success')).toBe(true);
  });

  it('rejects unknown goal cancellation without touching the active attempt', async () => {
    // Given: live work.
    const { h, rt } = fixture();
    h.toolStarted({ toolCallId: 'tool' });
    await until(rt, () => rt.action !== null);
    const id = rt.action?.actionId;
    // When: a missing goal id is cancelled.
    expect(rt.cancel({ scope: 'goal', targetCommandId: 'missing' })).toBe(false);
    // Then: execution continues unchanged.
    expect(rt.action?.actionId).toBe(id);
    expect(rt.executionHeld).toBe(false);
  });

  it('discards a planner response that arrives after work cancellation', async () => {
    // Given: a real plan computed but its delivery is delayed.
    const h = new Harness({ config: { minDwellMs: 0 } });
    let deliver = () => {};
    const rt = new NpcRuntime({ store: h.store, actorId: ACTOR, motion: new FakeMotionAdapter(),
      planner: { name: 'delayed-goap', terminate() {}, plan: (request) => new Promise((resolve) => {
        const plan = { ...request, ...planWithGoap(request) }; deliver = () => resolve(plan);
      }) } });
    h.goalRequest({ goal: 'work', commandId: 'work', onConflict: 'replace' });
    rt.step(16);
    // When: cancel wins before delivery.
    rt.cancel({ scope: 'work' });
    deliver();
    await rt.settle();
    await rt.advance(600);
    // Then: no stale plan/action is applied.
    expect(rt.stats.plansApplied).toBe(0);
    expect(rt.action).toBe(null);
    expect(rt.executionHeld).toBe(true);
  });
});
