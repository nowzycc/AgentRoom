import { describe, expect, it } from 'vitest';
import type { ToolStartedEvent } from '@npc/contracts';
import { ACTOR, ACTOR_B, Harness } from './helpers.js';
import { DomainStore } from '../src/domain/store.js';

function scenario(): Harness {
  const h = new Harness({ actors: [ACTOR, ACTOR_B] });
  h.heartbeat();
  h.heartbeat({ actorId: ACTOR_B });
  h.tickFor(100);
  h.toolStarted({ toolCallId: 'a' });
  h.toolStarted({ toolCallId: 'b' });
  h.tickFor(500);
  h.toolCompleted({ toolCallId: 'a' });
  h.heartbeat();
  h.tickFor(700);
  h.goalRequest({ goal: 'work', commandId: 'cw', priorityClass: 'task', ttlMs: 600_000, onConflict: 'replace' });
  h.commit('work');
  h.posture('sitting');
  h.manualAcquire({ ttlMs: 3_000, commandId: 'm1' });
  h.tickFor(1_000);
  h.toolCompleted({ toolCallId: 'b' });
  h.tickFor(3_000);
  return h;
}

describe('deterministic replay', () => {
  it('rebuilds an identical state from a complete checkpoint', () => {
    const h = scenario();
    const checkpoint = h.store.checkpoint();
    const replayed = DomainStore.replay(checkpoint);
    expect(replayed.complete).toBe(true);
    expect(JSON.stringify(replayed.state)).toBe(JSON.stringify(h.store.snapshot));
    expect(replayed.replayedRevision).toBe(h.store.revision);
  });

  it('is stable when the same checkpoint is replayed twice', () => {
    const h = scenario();
    const checkpoint = h.store.checkpoint();
    const a = DomainStore.replay(checkpoint);
    const b = DomainStore.replay(checkpoint);
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
    expect(a.complete && b.complete).toBe(true);
  });

  it('reports an incomplete replay instead of returning a plausible wrong state', () => {
    const h = new Harness({ config: { eventHistoryLimit: 50 } });
    h.heartbeat();
    h.toolStarted({ toolCallId: 't1' });
    h.tickFor(2_000);
    const checkpoint = h.store.checkpoint();
    expect(checkpoint.truncated).toBe(true);
    expect(checkpoint.events).toHaveLength(50);

    const replayed = DomainStore.replay(checkpoint);
    expect(replayed.complete).toBe(false);
    expect(replayed.replayedRevision).not.toBe(checkpoint.revision);
    expect(Object.keys(replayed.state.actors[ACTOR]!.tools)).toHaveLength(0);
  });

  it('marks a checkpoint of a complete buffer as complete', () => {
    const h = new Harness();
    h.heartbeat();
    h.tickFor(100);
    const checkpoint = h.store.checkpoint();
    expect(checkpoint.truncated).toBe(false);
    expect(DomainStore.replay(checkpoint).complete).toBe(true);
  });

  it('stores an isolated copy of each dispatched event', () => {
    const h = new Harness();
    h.heartbeat();
    const fact: ToolStartedEvent = {
      specVersion: '1.0',
      eventId: 'copy-1',
      source: 'hermes:test',
      sourceEpoch: 'epoch-1',
      sequence: 99,
      worldId: 'apt-1',
      actorId: ACTOR,
      occurredAt: '2026-10-25T03:00:00.000Z',
      type: 'tool.started',
      data: { toolCallId: 'original', activityClass: 'coding' },
    };
    h.dispatchFact(fact);
    fact.data.toolCallId = 'mutated-after-dispatch';
    expect(h.store.history.some((event) => event.kind === 'fact' && event.fact.eventId === 'copy-1')).toBe(true);
    const stored = h.store.history.find((event) => event.kind === 'fact' && event.fact.eventId === 'copy-1');
    expect(stored?.kind === 'fact' ? stored.fact.data : null).toMatchObject({ toolCallId: 'original' });
    const view = h.store.history;
    expect(Object.isFrozen(view)).toBe(true);
    expect(() => {
      (view as unknown as string[]).push('x');
    }).toThrow(TypeError);
  });

  it('refuses a zero-length replay buffer instead of silently disabling history', () => {
    expect(() => new Harness({ config: { eventHistoryLimit: 0 } })).toThrow(/eventHistoryLimit/);
  });

  it('treats out-of-order sequences as a set, not as a reset', () => {
    const h = new Harness();
    h.heartbeat();
    h.toolStarted({ toolCallId: 'a', sequence: 10 });
    h.toolStarted({ toolCallId: 'b', sequence: 3 });
    expect(Object.keys(h.actor().tools)).toHaveLength(2);
    expect(Object.values(h.actor().tools).every((t) => t.phase === 'active')).toBe(true);
  });

  it('reproduces goal, posture and activity from the checkpoint', () => {
    const h = scenario();
    const replay = DomainStore.replay(h.store.checkpoint());
    expect(replay.complete).toBe(true);
    expect(replay.state.actors[ACTOR]?.goal.active?.goalId).toBe(h.actor().goal.active?.goalId);
    expect(replay.state.actors[ACTOR]?.posture).toBe('sitting');
    expect(replay.state.actors[ACTOR]?.manual).toBeNull();
    expect(replay.state.actors[ACTOR]?.activity.lastActiveSimMs).toBeCloseTo(
      h.actor().activity.lastActiveSimMs ?? Number.NaN,
      6,
    );
  });
});
