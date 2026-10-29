import { describe, expect, it, vi } from 'vitest';
import { ACTOR, Harness } from './helpers.js';
import { createBlackboard } from '../src/domain/blackboard.js';

describe('blackboard projections', () => {
  it('exposes read-only, deeply frozen projections', () => {
    const h = new Harness();
    h.heartbeat();
    h.tickFor(100);
    const bb = createBlackboard(h.store);

    const activity = bb.read('activity');
    expect(Object.isFrozen(activity)).toBe(true);
    expect(Object.isFrozen(activity.actors[ACTOR])).toBe(true);
    expect(Object.isFrozen(activity.actors[ACTOR]!.activeToolKeys)).toBe(true);
    expect(() => {
      (activity.actors[ACTOR] as unknown as { work: boolean }).work = true;
    }).toThrow(TypeError);
    expect(activity.actors[ACTOR]!.work).toBe(false);

    expect(Object.isFrozen(h.store.snapshot)).toBe(true);
    expect(Object.isFrozen(h.store.snapshot.actors[ACTOR])).toBe(true);
    expect(Object.isFrozen(h.store.snapshot.actors[ACTOR]!.goal)).toBe(true);
  });

  it('memoizes by revision and refreshes after a change', () => {
    const h = new Harness();
    h.heartbeat();
    h.tickFor(100);
    const bb = createBlackboard(h.store);
    const first = bb.read('activity');
    expect(bb.read('activity')).toBe(first);

    h.toolStarted({ toolCallId: 't1' });
    const second = bb.read('activity');
    expect(second).not.toBe(first);
    expect(second.actors[ACTOR]!.work).toBe(true);
    expect(second.actors[ACTOR]!.activeToolKeys).toHaveLength(1);
  });

  it('notifies subscribers only when the projection changes', async () => {
    const h = new Harness();
    h.heartbeat();
    h.tickFor(100);
    const bb = createBlackboard(h.store);
    const listener = vi.fn();
    const unsubscribe = bb.subscribe('activity', listener);

    h.toolStarted({ toolCallId: 't1' });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]![0].actors[ACTOR].work).toBe(true);

    h.heartbeat();
    h.tickFor(50);
    expect(listener).toHaveBeenCalledTimes(1);

    h.toolCompleted({ toolCallId: 't1' });
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener.mock.calls[1]![0].actors[ACTOR].work).toBe(false);

    unsubscribe();
    h.toolStarted({ toolCallId: 't2' });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('projects goals, liveness and open actions without leaking state objects', () => {
    const h = new Harness();
    h.heartbeat();
    h.tickFor(100);
    h.toolStarted({ toolCallId: 't1' });
    h.commit('work');
    h.actionRequest({ goalId: 'work', actionId: 'a1', actionKey: 'sit.desk' });
    const bb = createBlackboard(h.store);

    const goals = bb.read('goals');
    expect(goals.actors[ACTOR]!.active?.goalId).toBe('work');
    expect(goals.actors[ACTOR]!.active?.layer).toBe('task');
    expect(goals.actors[ACTOR]!.posture).toBe('standing');

    const liveness = bb.read('liveness');
    expect(liveness.actors[ACTOR]!.status).toBe('alive');
    expect(liveness.actors[ACTOR]!.stale).toBe(false);

    const actions = bb.read('actions');
    expect(actions.actors[ACTOR]!.open).toHaveLength(1);
    expect(actions.actors[ACTOR]!.open[0]!.actionKey).toBe('sit.desk');
    expect(Object.isFrozen(actions.actors[ACTOR]!.open[0])).toBe(true);
  });
});
