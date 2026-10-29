/**
 * Regression tests for the independent M1 quality review
 * (tools/npc-v2/gates/M1-quality.json, issues M1-Q-01..Q-12).
 *
 * These tests are written against the intended post-fix contract. Before the
 * fix they fail behaviourally (unknown config keys are ignored, the epoch
 * adoption event is unknown, the world pause flag lives on the actor, ...).
 */
import { describe, expect, it } from 'vitest';
import type { Command } from '@npc/contracts';
import { DomainStore } from '../src/domain/store.js';
import { ACTOR, ACTOR_B, Harness, workActive } from './helpers.js';

const tools = (h: Harness, actorId = ACTOR) => Object.values(h.actor(actorId).tools);
const commands = (h: Harness, actorId = ACTOR) => Object.values(h.actor(actorId).commands);

describe('M1-Q-01 record retention', () => {
  it('bounds terminal tool records per scope and keeps a tombstone for pruned ids', () => {
    const h = new Harness({
      config: {
        maxTerminalRecordsPerScope: 64,
        terminalRecordRetentionMs: 600_000,
        maxTombstoneRecords: 4_096,
      },
    });
    h.heartbeat();

    for (let i = 0; i < 400; i += 1) {
      h.toolStarted({ toolCallId: `t${i}` });
      h.toolCompleted({ toolCallId: `t${i}` });
    }

    expect(tools(h).length).toBeLessThanOrEqual(64);
    expect(workActive(h)).toBe(false);
    expect(h.actor().activity.lastActiveSimMs).not.toBeNull();

    // The completion of t0 was pruned, but its id must not be revived by a
    // late start: a tombstone survives the record itself.
    const late = h.toolStarted({ toolCallId: 't0' });
    expect(late.accepted).toBe(true);
    expect(late.reason).toBe('TOMBSTONED_START');
    expect(tools(h).filter((t) => t.toolCallId === 't0')).toHaveLength(0);
    expect(workActive(h)).toBe(false);
  });

  it('bounds terminal command records and keeps expiry semantics', () => {
    const h = new Harness({
      config: { maxCommandRecords: 32, commandRetentionMs: 600_000 },
    });
    h.heartbeat();
    for (let i = 0; i < 300; i += 1) {
      h.goalRequest({ goal: 'think', commandId: `c${i}`, priorityClass: 'task', ttlMs: 1_000 });
    }
    h.advanceWall(2_000);
    h.tickFor(100);
    expect(commands(h).length).toBeLessThanOrEqual(32);
    expect(h.actor().counters.commandsExpired).toBeGreaterThanOrEqual(300);
  });
});

describe('M1-Q-01 copy-on-write safety', () => {
  it('leaves the previous snapshot byte-identical after later events', () => {
    const h = new Harness();
    h.heartbeat();
    h.toolStarted({ toolCallId: 'a' });
    const before = h.store.snapshot;
    const bytes = JSON.stringify(before);

    h.toolStarted({ toolCallId: 'b' });
    h.toolCompleted({ toolCallId: 'a' });
    h.tickFor(100);
    h.heartbeat();

    expect(JSON.stringify(before)).toBe(bytes);
    expect(Object.isFrozen(before.actors[ACTOR]!.tools)).toBe(true);
    expect(Object.keys(before.actors[ACTOR]!.tools)).toHaveLength(1);
    expect(Object.values(before.actors[ACTOR]!.tools)[0]!.phase).toBe('active');
  });

  it('replays a retained state deterministically and never rewrites an old snapshot', () => {
    const h = new Harness({
      config: { maxTerminalRecordsPerScope: 32, maxTombstoneRecords: 64 },
    });
    h.heartbeat();
    for (let i = 0; i < 60; i += 1) {
      h.toolStarted({ toolCallId: `t${i}` });
      h.toolCompleted({ toolCallId: `t${i}` });
    }
    const before = h.store.snapshot;
    const bytes = JSON.stringify(before);
    for (let i = 60; i < 100; i += 1) {
      h.toolStarted({ toolCallId: `t${i}` });
      h.toolCompleted({ toolCallId: `t${i}` });
    }
    // Pruning added tombstones after `before` was frozen; the shared tombstone
    // map must have been copied on write, not mutated in place.
    expect(JSON.stringify(before)).toBe(bytes);

    const checkpoint = h.store.checkpoint();
    const replayed = DomainStore.replay(checkpoint);
    expect(replayed.complete).toBe(true);
    expect(JSON.stringify(replayed.state)).toBe(JSON.stringify(h.store.snapshot));
    expect(Object.keys(replayed.state.actors[ACTOR]!.tools)).toHaveLength(32);
  });
});

describe('M1-Q-02 active autonomy goal continuation', () => {
  it('keeps lookAround active after commit instead of withdrawing it immediately', () => {
    const h = new Harness({ config: { autonomyIntervalMs: 1_000, minDwellMs: 200 } });
    h.heartbeat();
    h.tickFor(2_000);
    expect(h.actor().goal.interrupt?.toGoalId).toBe('lookAround');

    const commit = h.commit('lookAround');
    expect(commit.accepted).toBe(true);
    expect(h.actor().goal.active?.goalId).toBe('lookAround');

    h.tickFor(3_000);
    const goal = h.actor().goal;
    expect(goal.active?.goalId).toBe('lookAround');
    expect(goal.interrupt).toBeNull();
    expect(goal.candidates.some((c) => c.goalId === 'lookAround')).toBe(true);

    // A task goal still preempts the continuous autonomy session normally.
    h.toolStarted({ toolCallId: 't1' });
    expect(h.actor().goal.interrupt?.toGoalId).toBe('work');
    expect(h.actor().goal.interrupt?.reason).toBe('HIGHER_LAYER');
    h.commit('work');
    expect(h.actor().goal.active?.goalId).toBe('work');
  });
});

describe('M1-Q-03 explicit source epoch adoption', () => {
  it('refuses a delayed unseen epoch without retiring the live one', () => {
    const h = new Harness();
    h.heartbeat();
    h.sourceEpochAdopt({ source: 'hermes:test', epoch: 'e2' });
    h.toolStarted({ toolCallId: 'live', sourceEpoch: 'e2' });
    expect(workActive(h)).toBe(true);

    const delayed = h.toolStarted({ toolCallId: 'ancient', sourceEpoch: 'e0' });
    expect(delayed.accepted).toBe(false);
    expect(delayed.reason).toBe('EPOCH_NOT_DECLARED');
    expect(h.actor().sources['hermes:test']?.epoch).toBe('e2');
    expect(h.actor().sources['hermes:test']?.retiredEpochs).toEqual(['epoch-1']);
    const live = tools(h).find((t) => t.toolCallId === 'live');
    expect(live?.phase).toBe('active');

    const nextLive = h.heartbeat({ sourceEpoch: 'e2' });
    expect(nextLive.accepted).toBe(true);
    expect(workActive(h)).toBe(true);
  });

  it('adopts a declared epoch, retires its in-flight work, and refuses retired epochs', () => {
    const h = new Harness();
    h.heartbeat();
    h.sourceEpochAdopt({ source: 'hermes:test', epoch: 'e2' });
    h.toolStarted({ toolCallId: 'old', sourceEpoch: 'e2' });

    const adopted = h.sourceEpochAdopt({ source: 'hermes:test', epoch: 'e3' });
    expect(adopted.accepted).toBe(true);
    const old = tools(h).find((t) => t.toolCallId === 'old');
    expect(old?.phase).toBe('terminal');
    expect(old?.reason).toBe('epoch_retired');

    const again = h.sourceEpochAdopt({ source: 'hermes:test', epoch: 'e2' });
    expect(again.accepted).toBe(false);
    expect(again.reason).toBe('EPOCH_RETIRED');
  });
});

describe('M1-Q-04 session-less terminal fact resolves the scoped record', () => {
  it('completes a session-scoped start when the completion omits sessionId', () => {
    const h = new Harness();
    h.heartbeat();
    h.toolStarted({ toolCallId: 't1', sessionId: 'sess-A' });
    expect(workActive(h)).toBe(true);

    const completed = h.toolCompleted({ toolCallId: 't1' });
    expect(completed.accepted).toBe(true);
    expect(workActive(h)).toBe(false);
    expect(tools(h)).toHaveLength(1);
    const rec = tools(h)[0]!;
    expect(rec.sessionId).toBe('sess-A');
    expect(rec.phase).toBe('terminal');
    expect(rec.reason).toBe('completed');
    expect(rec.tombstoned).toBe(false);

    const again = h.toolCompleted({ toolCallId: 't1' });
    expect(again.accepted).toBe(false);
    expect(again.reason).toBe('ALREADY_TERMINAL');
  });

  it('does not revive a session-scoped tool after a session-less completion', () => {
    const h = new Harness();
    h.heartbeat();
    h.toolCompleted({ toolCallId: 't1' });
    const late = h.toolStarted({ toolCallId: 't1', sessionId: 'sess-A' });
    expect(late.accepted).toBe(true);
    expect(late.reason).toBe('TOMBSTONED_START');
    expect(workActive(h)).toBe(false);
  });

  it('refuses to guess when a session-less completion matches two sessions', () => {
    const h = new Harness();
    h.heartbeat();
    h.toolStarted({ toolCallId: 'same', sessionId: 's1' });
    h.toolStarted({ toolCallId: 'same', sessionId: 's2' });
    const ambiguous = h.toolCompleted({ toolCallId: 'same' });
    expect(ambiguous.accepted).toBe(false);
    expect(ambiguous.reason).toBe('AMBIGUOUS_SESSION');
    expect(workActive(h)).toBe(true);
  });
});

describe('M1-Q-05 caller-asserted safety layer', () => {
  it('rejects a goal.request that claims the safety priority class', () => {
    const h = new Harness();
    h.heartbeat();
    h.tickFor(100);
    const res = h.goalRequest({ goal: 'think', commandId: 'safety-cmd', priorityClass: 'safety' });
    expect(res.accepted).toBe(false);
    expect(res.reason).toBe('SAFETY_RESERVED');
    expect(h.actor().goal.interrupt).toBeNull();
    expect(h.actor().goal.active?.layer).toBe('autonomy');
  });
});

describe('M1-Q-06 canonical command payload hash', () => {
  it('treats a reordered but identical command payload as a duplicate', () => {
    const h = new Harness();
    h.heartbeat();
    const base: Command = {
      specVersion: '1.0',
      commandId: 'dup-1',
      worldId: 'apt-1',
      actorId: ACTOR,
      type: 'goal.request',
      goal: 'work',
      ttlMs: 60_000,
      priorityClass: 'task',
      onConflict: 'queue',
    };
    const first = h.dispatchCommand(base);
    expect(first.accepted).toBe(true);

    const reordered = {
      onConflict: 'queue',
      priorityClass: 'task',
      ttlMs: 60_000,
      goal: 'work',
      type: 'goal.request',
      actorId: ACTOR,
      worldId: 'apt-1',
      commandId: 'dup-1',
      specVersion: '1.0',
    } as Command;
    const second = h.dispatchCommand(reordered);
    expect(second.accepted).toBe(false);
    expect(second.reason).toBe('DUPLICATE_COMMAND');
  });
});

describe('M1-Q-08 world-level pause', () => {
  it('pauses every actor in the world, not just the requester', () => {
    const h = new Harness({ config: { idleCooldownMs: 0 }, actors: [ACTOR, ACTOR_B] });
    h.heartbeat();
    h.heartbeat({ actorId: ACTOR_B });
    h.tickFor(100);
    expect(h.actor().goal.active?.goalId).toBe('idle');
    expect(h.actor(ACTOR_B).goal.active?.goalId).toBe('idle');

    h.worldPause({ reason: 'hidden page' });
    expect(h.store.snapshot.worldPaused).toBe(true);
    expect(h.actor().goal.interrupt?.reason).toBe('WORLD_PAUSED');
    expect(h.actor(ACTOR_B).goal.interrupt?.reason).toBe('WORLD_PAUSED');

    h.commit(null);
    h.commit(null);
    h.worldResume();
    h.tickFor(100);
    expect(h.store.snapshot.worldPaused).toBe(false);
    expect(h.actor().goal.active?.goalId).toBe('idle');
    expect(h.actor(ACTOR_B).goal.active?.goalId).toBe('idle');
  });
});

describe('M1-Q-09 bounded actor registry', () => {
  it('refuses to create actors beyond maxActors instead of accepting any id', () => {
    const h = new Harness({ config: { maxActors: 1 }, actors: [ACTOR] });
    const extra = h.heartbeat({ actorId: ACTOR_B });
    expect(extra.accepted).toBe(false);
    expect(extra.reason).toBe('ACTOR_LIMIT');
    expect(h.store.snapshot.actorOrder).toEqual([ACTOR]);

    const known = h.heartbeat();
    expect(known.accepted).toBe(true);
  });
});

describe('M1-Q-10 fact dedupe window', () => {
  it('rejects duplicates inside the configured window and documents eviction beyond it', () => {
    const h = new Harness({ config: { factDedupeLimit: 2 } });
    h.heartbeat();
    h.store.dispatch({ kind: 'fact', fact: { ...h.heartbeatFact('x1') } });
    h.store.dispatch({ kind: 'fact', fact: { ...h.heartbeatFact('x2') } });
    h.store.dispatch({ kind: 'fact', fact: { ...h.heartbeatFact('x3') } });

    const inWindow = h.store.dispatch({ kind: 'fact', fact: { ...h.heartbeatFact('x3') } });
    expect(inWindow.accepted).toBe(false);
    expect(inWindow.reason).toBe('DUPLICATE_EVENT');

    // x1 fell out of the 2-entry window: the domain re-applies it. Fact
    // handlers are set-based (idempotent), so this is harmless, but the window
    // is part of the contract and must stay documented.
    const evicted = h.store.dispatch({ kind: 'fact', fact: { ...h.heartbeatFact('x1') } });
    expect(evicted.accepted).toBe(true);
    expect(h.actor().presence.heartbeatCount).toBe(5);
  });
});

describe('M1-Q-11 interruption promise binding', () => {
  it('records the promised layer/score and re-raises the interrupt when it changes', () => {
    const h = new Harness({ config: { minDwellMs: 0 } });
    h.heartbeat();
    h.tickFor(100);
    h.goalRequest({ goal: 'think', commandId: 'manual-think', priorityClass: 'manual', ttlMs: 1_000 });
    const first = h.actor().goal.interrupt!;
    expect(first.toGoalId).toBe('think');
    expect(first.toLayer).toBe('manual');
    expect(first.toScore).toBeCloseTo(0.9, 6);
    expect(typeof first.atRevision).toBe('number');

    h.goalRequest({ goal: 'think', commandId: 'task-think', priorityClass: 'task', ttlMs: 600_000 });
    h.tickFor(1_200);
    const second = h.actor().goal.interrupt!;
    expect(second.toGoalId).toBe('think');
    expect(second.toLayer).toBe('task');
    expect(second.toScore).toBeCloseTo(0.68, 6);

    const committed = h.commit('think');
    expect(committed.accepted).toBe(true);
    expect(h.actor().goal.active?.goalId).toBe('think');
    expect(h.actor().goal.active?.layer).toBe('task');
  });
});

describe('M1-Q-12 commit auto-start handoff', () => {
  it('exposes an auto-start in the same reduce as goal.commit(null)', () => {
    const h = new Harness({ config: { idleCooldownMs: 0 } });
    h.heartbeat();
    h.tickFor(100);
    h.goalRequest({ goal: 'work', commandId: 'cw', priorityClass: 'task', ttlMs: 600_000, onConflict: 'replace' });
    h.commit('work');
    h.toolStarted({ toolCallId: 't1' });
    h.toolCompleted({ toolCallId: 't1' });
    h.goalCancel({ targetCommandId: 'cw' });

    expect(h.actor().goal.interrupt?.toGoalId).toBeNull();
    const res = h.commit(null);
    expect(res.accepted).toBe(true);
    // M2 must re-read goal.active after commit: idle was auto-started in the
    // same event, so "null after exit" is not guaranteed.
    expect(h.actor().goal.active?.goalId).toBe('idle');
    expect(h.actor().goal.history.at(-1)?.reason).toBe('AUTO_START');
  });
});
