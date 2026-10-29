/**
 * M2-owned carry-over findings from the M1 quality gate. These are the
 * preconditions for binding a plan to domain state: a semantic revision that
 * only moves on facts, an enforced commit promise, bounded ledgers and named
 * cross-session mismatches.
 */
import { describe, expect, it } from 'vitest';
import { ACTOR, Harness } from './helpers.js';

describe('M2: semantic revision (M1-Q2-02)', () => {
  it('does not bump revision or history for an empty tick', () => {
    const h = new Harness();
    h.heartbeat();
    h.tickFor(100);
    const before = h.store.snapshot;
    const historyBefore = h.store.history.length;
    const res = h.store.tick(0);
    expect(res.steps).toBe(0);
    expect(h.store.snapshot).toBe(before);
    expect(h.store.snapshot.revision).toBe(before.revision);
    expect(h.store.history.length).toBe(historyBefore);
  });

  it('keeps factsRevision stable across time and moves it on facts', () => {
    const h = new Harness();
    const start = h.store.snapshot.factsRevision;
    h.heartbeat();
    expect(h.store.snapshot.factsRevision).toBe(start + 1);
    h.tickFor(5_000);
    expect(h.store.snapshot.factsRevision).toBe(start + 1);
    h.toolStarted({ toolCallId: 't1' });
    expect(h.store.snapshot.factsRevision).toBe(start + 2);
    h.store.tick(0);
    expect(h.store.snapshot.factsRevision).toBe(start + 2);
    // Wall time may move without facts: still the same semantic revision.
    h.advanceWall(10_000);
    h.store.tick(16);
    expect(h.store.snapshot.factsRevision).toBe(start + 2);
  });

  it('records the interruption promise at the semantic revision', () => {
    const h = new Harness({ config: { minDwellMs: 0 } });
    h.heartbeat();
    h.tickFor(100);
    h.goalRequest({ goal: 'work', commandId: 'cw', priorityClass: 'task', onConflict: 'replace' });
    const interrupt = h.actor().goal.interrupt;
    expect(interrupt).not.toBeNull();
    expect(interrupt!.atRevision).toBe(h.store.snapshot.factsRevision);
    h.tickFor(500);
    expect(h.store.snapshot.factsRevision).toBe(interrupt!.atRevision);
    const commit = h.commit('work');
    expect(commit.accepted).toBe(true);
  });
});

describe('M2: enforced goal.commit promise (M1-Q2-03)', () => {
  it('requires the revision the interruption was promised at', () => {
    const h = new Harness({ config: { minDwellMs: 0 } });
    h.heartbeat();
    h.tickFor(100);
    h.goalRequest({ goal: 'work', commandId: 'cw', priorityClass: 'task', onConflict: 'replace' });
    const rev = h.actor().goal.interrupt!.atRevision;

    const missing = h.store.dispatch({ kind: 'goal.commit', actorId: ACTOR, goalId: 'work', reason: 'no revision' });
    expect(missing.accepted).toBe(false);
    expect(missing.reason).toBe('MISSING_REVISION');

    const stale = h.store.dispatch({
      kind: 'goal.commit',
      actorId: ACTOR,
      goalId: 'work',
      reason: 'stale',
      atRevision: rev - 1,
    });
    expect(stale.accepted).toBe(false);
    expect(stale.reason).toBe('STALE_COMMIT');
    expect(h.actor().goal.active?.goalId).toBe('idle');

    const ok = h.store.dispatch({ kind: 'goal.commit', actorId: ACTOR, goalId: 'work', reason: 'ok', atRevision: rev });
    expect(ok.accepted).toBe(true);
    expect(h.actor().goal.active?.goalId).toBe('work');
  });

  it('rejects the promise when a fact moved the semantic revision in between', () => {
    const h = new Harness({ config: { minDwellMs: 0 } });
    h.heartbeat();
    h.tickFor(100);
    h.goalRequest({ goal: 'work', commandId: 'cw', priorityClass: 'task', onConflict: 'replace' });
    const rev = h.actor().goal.interrupt!.atRevision;
    h.toolStarted({ toolCallId: 'late' });
    expect(h.store.snapshot.factsRevision).toBeGreaterThan(rev);
    const stale = h.store.dispatch({ kind: 'goal.commit', actorId: ACTOR, goalId: 'work', reason: 'late', atRevision: rev });
    expect(stale.accepted).toBe(false);
    expect(stale.reason).toBe('STALE_COMMIT');
  });
});

describe('M2: bounded action ledger (M1-Q2-07)', () => {
  it('refuses an open action beyond maxOpenActions instead of growing forever', () => {
    const h = new Harness({ config: { maxOpenActions: 3, minDwellMs: 0 } });
    h.heartbeat();
    h.tickFor(100);
    h.goalRequest({ goal: 'work', commandId: 'cw', priorityClass: 'task', onConflict: 'replace' });
    h.commit('work');

    for (let i = 0; i < 3; i += 1) {
      const res = h.actionRequest({ goalId: 'work', actionId: `a${i}`, actionKey: `key-${i}` });
      expect(res.accepted).toBe(true);
    }
    const over = h.actionRequest({ goalId: 'work', actionId: 'a3', actionKey: 'key-3' });
    expect(over.accepted).toBe(false);
    expect(over.reason).toBe('ACTION_LIMIT');

    // Terminal actions free capacity: the cap is on open actions, not history.
    h.actionStarted('a0');
    h.actionTerminal('a0');
    const afterTerminal = h.actionRequest({ goalId: 'work', actionId: 'a4', actionKey: 'key-4' });
    expect(afterTerminal.accepted).toBe(true);
  });
});

describe('M2: safety TTL validation (M1-Q2-05)', () => {
  it('rejects a non-positive safety TTL instead of installing a hold that vanishes', () => {
    const h = new Harness();
    for (const ttlMs of [0, -1, Number.NaN]) {
      const res = h.store.dispatch({ kind: 'safety.request', actorId: ACTOR, reason: 'bad ttl', goalId: 'rest', ttlMs });
      expect(res.accepted).toBe(false);
      expect(res.reason).toBe('SAFETY_TTL_INVALID');
      expect(h.actor().safety).toBeNull();
    }
    const ok = h.store.dispatch({ kind: 'safety.request', actorId: ACTOR, reason: 'ok', goalId: 'rest', ttlMs: 1_000 });
    expect(ok.accepted).toBe(true);
    expect(h.actor().safety).not.toBeNull();
  });
});

describe('M2: named cross-session mismatch (M1-Q2-09)', () => {
  it('names a completion that belongs to another explicit session', () => {
    const h = new Harness();
    h.toolStarted({ toolCallId: 'shared', sessionId: 's1' });
    const res = h.toolCompleted({ toolCallId: 'shared', sessionId: 's2' });
    expect(res.accepted).toBe(false);
    expect(res.reason).toBe('SESSION_MISMATCH');
    const record = Object.values(h.actor().tools).find((t) => t.toolCallId === 'shared');
    expect(record?.phase).toBe('active');
    expect(record?.sessionId).toBe('s1');
  });

  it('keeps the session-less resolution path and refuses ambiguity by name', () => {
    const h = new Harness();
    h.toolStarted({ toolCallId: 'x', sessionId: 's1' });
    expect(h.toolCompleted({ toolCallId: 'x' }).accepted).toBe(true);

    h.toolStarted({ toolCallId: 'dup', sessionId: 's1' });
    h.toolStarted({ toolCallId: 'dup', sessionId: 's2' });
    const ambiguous = h.toolCompleted({ toolCallId: 'dup' });
    expect(ambiguous.accepted).toBe(false);
    expect(ambiguous.reason).toBe('AMBIGUOUS_SESSION');
  });
});
