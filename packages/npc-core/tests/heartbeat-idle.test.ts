import { describe, expect, it } from 'vitest';
import { ACTOR, Harness } from './helpers.js';

describe('heartbeat vs idle', () => {
  it('never lets heartbeats extend the work cooldown', () => {
    const h = new Harness({ config: { idleCooldownMs: 30_000, heartbeatStaleAfterMs: 8_000 } });
    h.heartbeat();
    h.tickFor(100);
    expect(h.actor().goal.active?.goalId).toBe('idle');

    h.toolStarted({ toolCallId: 't1' });
    expect(h.actor().goal.interrupt?.toGoalId).toBe('work');
    h.commit('work');
    h.tickFor(10_000);
    expect(h.actor().goal.active?.goalId).toBe('work');

    h.toolCompleted({ toolCallId: 't1' });
    expect(h.actor().goal.interrupt?.toGoalId).toBeNull();
    h.commit(null);
    const lastActive = h.actor().activity.lastActiveSimMs;
    expect(lastActive).not.toBeNull();
    const idleAt = lastActive! + 30_000;

    // heartbeats every 5 s keep liveness alive but must not touch activity time
    while (h.store.simTimeMs + 5_200 < idleAt) {
      h.tickFor(5_000);
      h.heartbeat();
      expect(h.actor().activity.lastActiveSimMs).toBeCloseTo(lastActive!, 6);
    }
    h.tickFor(Math.max(0, idleAt - 100 - h.store.simTimeMs));
    expect(h.actor().goal.active).toBeNull();
    expect(h.actor().activity.lastActiveSimMs).toBeCloseTo(lastActive!, 6);

    h.tickFor(300);
    const goal = h.actor().goal;
    expect(goal.active?.goalId).toBe('idle');
    expect(goal.active!.sinceSimMs).toBeGreaterThanOrEqual(idleAt - 20);
    expect(goal.active!.sinceSimMs).toBeLessThanOrEqual(idleAt + 40);
    expect(h.actor().activity.lastActiveSimMs).toBeCloseTo(lastActive!, 6);
    expect(h.actor().presence.heartbeatCount).toBeGreaterThan(3);
  });

  it('does not move the work anchor while work is running', () => {
    const h = new Harness();
    h.heartbeat();
    h.tickFor(100);
    h.toolStarted({ toolCallId: 't1' });
    h.tickFor(1_000);
    const anchor = h.actor().activity.lastActiveSimMs!;

    h.advanceWall(2_000);
    h.heartbeat();
    expect(h.actor().activity.lastActiveSimMs).toBe(anchor);

    h.tickFor(20);
    expect(h.actor().activity.lastActiveSimMs).toBeGreaterThan(anchor);
  });

  it('withdraws autonomy when presence goes stale and restores it on a heartbeat', () => {
    const h = new Harness({ config: { heartbeatStaleAfterMs: 8_000 } });
    h.heartbeat();
    h.tickFor(100);
    expect(h.actor().goal.active?.goalId).toBe('idle');

    h.tickFor(9_000);
    expect(h.actor().presence.status).toBe('alive');
    expect(h.actor().goal.candidates).toHaveLength(0);
    expect(h.actor().goal.interrupt?.toGoalId).toBeNull();
    expect(h.actor().goal.interrupt?.reason).toBe('NO_CANDIDATE');
    h.commit(null);
    expect(h.actor().goal.active).toBeNull();

    h.heartbeat();
    h.tickFor(100);
    expect(h.actor().goal.active?.goalId).toBe('idle');
  });

  it('keeps the activity projection identical across a heartbeat', () => {
    const h = new Harness();
    h.heartbeat();
    h.tickFor(100);
    h.toolStarted({ toolCallId: 't1' });
    h.tickFor(100);
    const before = JSON.stringify(h.actor().activity);
    const revisionBefore = h.store.revision;
    h.heartbeat();
    expect(h.actor().activity).toEqual(JSON.parse(before));
    expect(h.store.revision).toBe(revisionBefore + 1);
    expect(h.actor().presence.heartbeatCount).toBe(2);
  });
});
