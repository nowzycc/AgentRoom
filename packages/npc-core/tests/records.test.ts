import { describe, expect, it } from 'vitest';
import { ACTOR, ACTOR_B, Harness, workActive } from './helpers.js';

const tools = (h: Harness, actorId = ACTOR) => Object.values(h.actor(actorId).tools);
const runs = (h: Harness, actorId = ACTOR) => Object.values(h.actor(actorId).runs);

describe('fact ingestion: idempotency and tombstones', () => {
  it('treats a repeated tool completion as a no-op and keeps revision stable', () => {
    const h = new Harness();
    h.heartbeat();
    h.toolStarted({ toolCallId: 't1' });
    h.tickFor(100);
    expect(workActive(h)).toBe(true);

    const first = h.toolCompleted({ toolCallId: 't1' });
    expect(first.accepted).toBe(true);
    expect(workActive(h)).toBe(false);

    const before = h.store.snapshot;
    const second = h.toolCompleted({ toolCallId: 't1' });
    expect(second.accepted).toBe(false);
    expect(second.reason).toBe('ALREADY_TERMINAL');
    expect(h.store.snapshot).toBe(before);
    expect(h.store.revision).toBe(before.revision);
    expect(tools(h)).toHaveLength(1);
    expect(tools(h)[0]!.phase).toBe('terminal');
  });

  it('does not revive a tool when its start arrives after its completion', () => {
    const h = new Harness();
    h.heartbeat();
    const completed = h.toolCompleted({ toolCallId: 't1' });
    expect(completed.accepted).toBe(true);
    expect(workActive(h)).toBe(false);

    const late = h.toolStarted({ toolCallId: 't1' });
    expect(late.accepted).toBe(true);
    expect(late.reason).toBe('TOMBSTONED_START');
    expect(workActive(h)).toBe(false);

    const rec = tools(h)[0]!;
    expect(rec.phase).toBe('terminal');
    expect(rec.tombstoned).toBe(true);
    expect(rec.startedSimMs).toBeNull();
    expect(h.actor().counters.lateStartsIgnored).toBe(1);
  });

  it('names an ordinary late start separately from a tombstone', () => {
    const h = new Harness();
    h.heartbeat();
    h.toolStarted({ toolCallId: 't1' });
    h.toolCompleted({ toolCallId: 't1' });
    const late = h.toolStarted({ toolCallId: 't1' });
    expect(late.accepted).toBe(true);
    expect(late.reason).toBe('ALREADY_COMPLETED');
    expect(tools(h)[0]!.tombstoned).toBe(false);
    expect(workActive(h)).toBe(false);
  });

  it('keeps work active while one of two parallel tools is still running', () => {
    const h = new Harness();
    h.heartbeat();
    h.toolStarted({ toolCallId: 'a' });
    h.tickFor(100);
    h.toolStarted({ toolCallId: 'b' });
    h.tickFor(100);
    expect(workActive(h)).toBe(true);

    h.toolCompleted({ toolCallId: 'a' });
    h.tickFor(100);
    expect(workActive(h)).toBe(true);
    expect(tools(h).filter((t) => t.phase === 'active')).toHaveLength(1);

    const workEndedAt = h.store.simTimeMs;
    h.toolCompleted({ toolCallId: 'b' });
    expect(workActive(h)).toBe(false);
    expect(h.actor().activity.lastActiveSimMs).toBeCloseTo(workEndedAt, 6);
  });

  it('isolates identical tool ids by source and session', () => {
    const h = new Harness();
    h.heartbeat();
    h.toolStarted({ toolCallId: 'same', sessionId: 's1' });
    h.toolStarted({ toolCallId: 'same', sessionId: 's2' });
    h.toolStarted({ toolCallId: 'same', sessionId: 's2', source: 'other:instance' });
    expect(tools(h)).toHaveLength(3);
    expect(workActive(h)).toBe(true);

    h.toolCompleted({ toolCallId: 'same', sessionId: 's1' });
    h.toolCompleted({ toolCallId: 'same', sessionId: 's2' });
    expect(workActive(h)).toBe(true);
    h.toolCompleted({ toolCallId: 'same', sessionId: 's2', source: 'other:instance' });
    expect(workActive(h)).toBe(false);
  });

  it('rejects a replayed event id without touching state', () => {
    const h = new Harness();
    h.heartbeat();
    const first = h.toolStarted({ toolCallId: 't1', eventId: 'dup-1' });
    expect(first.accepted).toBe(true);
    const before = h.store.snapshot;

    const second = h.store.dispatch({
      kind: 'fact',
      fact: {
        specVersion: '1.0',
        eventId: 'dup-1',
        source: 'hermes:test',
        sourceEpoch: 'epoch-1',
        sequence: 999,
        worldId: 'apt-1',
        actorId: ACTOR,
        occurredAt: '2026-10-25T03:00:00.000Z',
        type: 'tool.started',
        data: { toolCallId: 't1', activityClass: 'coding' },
      },
    });
    expect(second.accepted).toBe(false);
    expect(second.reason).toBe('DUPLICATE_EVENT');
    expect(h.store.snapshot).toBe(before);
  });

  it('tombstones a run completed before it started', () => {
    const h = new Harness();
    h.heartbeat();
    h.runCompleted({ runId: 'r1' });
    expect(workActive(h)).toBe(false);
    const late = h.runStarted({ runId: 'r1' });
    expect(late.reason).toBe('TOMBSTONED_START');
    expect(workActive(h)).toBe(false);
    expect(runs(h)[0]!.tombstoned).toBe(true);
  });

  it('keeps work active when a run and a tool overlap', () => {
    const h = new Harness();
    h.heartbeat();
    h.runStarted({ runId: 'r1' });
    h.toolStarted({ toolCallId: 't1' });
    h.toolCompleted({ toolCallId: 't1' });
    expect(workActive(h)).toBe(true);
    h.runCompleted({ runId: 'r1' });
    expect(workActive(h)).toBe(false);
  });

  it('tracks speech separately from work', () => {
    const h = new Harness();
    h.heartbeat();
    h.speechStarted({ speechId: 'sp1' });
    expect(workActive(h)).toBe(false);
    const speech = Object.values(h.actor().speeches);
    expect(speech).toHaveLength(1);
    expect(speech[0]!.phase).toBe('active');
    h.speechCompleted({ speechId: 'sp1' });
    expect(Object.values(h.actor().speeches)[0]!.phase).toBe('terminal');
  });

  it('rejects an event for an unknown world instead of silently applying it', () => {
    const h = new Harness();
    const res = h.store.dispatch({
      kind: 'fact',
      fact: {
        specVersion: '1.0',
        eventId: 'wrong-world',
        source: 'hermes:test',
        sourceEpoch: 'epoch-1',
        sequence: 1,
        worldId: 'some-other-world',
        actorId: ACTOR,
        occurredAt: '2026-10-25T03:00:00.000Z',
        type: 'presence.heartbeat',
        data: { status: 'alive' },
      },
    });
    expect(res.accepted).toBe(false);
    expect(res.reason).toBe('WORLD_MISMATCH');
  });
});

describe('source epochs', () => {
  it('retires an older source epoch and orphans its in-flight work', () => {
    const h = new Harness();
    h.heartbeat();
    h.toolStarted({ toolCallId: 'old', sourceEpoch: 'epoch-1' });
    expect(workActive(h)).toBe(true);

    // Epoch order is not inferred from arriving facts: the owner of the
    // durable log declares the restart explicitly.
    h.sourceEpochAdopt({ epoch: 'e2' });
    h.toolStarted({ toolCallId: 'new', sourceEpoch: 'e2' });
    expect(workActive(h)).toBe(true);

    const oldRec = tools(h).find((t) => t.toolCallId === 'old')!;
    expect(oldRec.phase).toBe('terminal');
    expect(oldRec.outcome).toBe('cancelled');
    expect(oldRec.reason).toBe('epoch_retired');

    const stale = h.toolCompleted({ toolCallId: 'old', sourceEpoch: 'epoch-1' });
    expect(stale.accepted).toBe(false);
    expect(stale.reason).toBe('STALE_EPOCH');
    expect(h.store.rejections.some((r) => r.reason === 'STALE_EPOCH')).toBe(true);

    h.toolCompleted({ toolCallId: 'new', sourceEpoch: 'e2' });
    expect(workActive(h)).toBe(false);
  });

  it('retires only the restarted source epoch, never another source', () => {
    const h = new Harness();
    h.heartbeat();
    h.toolStarted({ toolCallId: 'a', source: 'alpha:one', sourceEpoch: 'e1' });
    h.toolStarted({ toolCallId: 'b', source: 'beta:one', sourceEpoch: 'e1' });
    h.runStarted({ runId: 'ra', source: 'alpha:one', sourceEpoch: 'e1' });
    h.runStarted({ runId: 'rb', source: 'beta:one', sourceEpoch: 'e1' });
    expect(workActive(h)).toBe(true);

    h.sourceEpochAdopt({ source: 'alpha:one', epoch: 'e2' });
    h.heartbeat({ source: 'alpha:one', sourceEpoch: 'e2' });
    const alphaTool = tools(h).find((t) => t.source === 'alpha:one')!;
    const betaTool = tools(h).find((t) => t.source === 'beta:one')!;
    expect(alphaTool.phase).toBe('terminal');
    expect(alphaTool.reason).toBe('epoch_retired');
    expect(betaTool.phase).toBe('active');
    expect(runs(h).find((r) => r.source === 'alpha:one')?.phase).toBe('terminal');
    expect(runs(h).find((r) => r.source === 'beta:one')?.phase).toBe('active');
    expect(workActive(h)).toBe(true);

    h.toolCompleted({ toolCallId: 'b', source: 'beta:one', sourceEpoch: 'e1' });
    expect(workActive(h)).toBe(true);
    h.runCompleted({ runId: 'rb', source: 'beta:one', sourceEpoch: 'e1' });
    expect(workActive(h)).toBe(false);
  });

  it('counts out-of-order sequences without dropping the fact', () => {
    const h = new Harness();
    h.heartbeat();
    h.toolStarted({ toolCallId: 'a', sequence: 10 });
    h.toolStarted({ toolCallId: 'b', sequence: 4 });
    expect(tools(h)).toHaveLength(2);
    expect(h.actor().sources['hermes:test']?.outOfOrderCount).toBe(1);
    expect(h.actor().sources['hermes:test']?.lastSequence).toBe(10);
  });

  it('isolates two actors', () => {
    const h = new Harness({ actors: [ACTOR, ACTOR_B] });
    h.heartbeat();
    h.heartbeat({ actorId: ACTOR_B });
    h.toolStarted({ toolCallId: 't1' });
    expect(workActive(h)).toBe(true);
    expect(workActive(h, ACTOR_B)).toBe(false);
    h.toolCompleted({ toolCallId: 't1' });
    expect(h.actor(ACTOR).activity.lastActiveSimMs).not.toBeNull();
    expect(h.actor(ACTOR_B).activity.lastActiveSimMs).toBeNull();
  });
});
