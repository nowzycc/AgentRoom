/**
 * M1-Q2-01 regression: ids are wire data. Object.prototype property names are
 * legal ids under the M0 contract pattern, so every id-keyed domain map must
 * behave as an empty dictionary for an absent key instead of exposing an
 * inherited function. These tests drive the real parsers and the real store;
 * they do not reserve or reject any legal id.
 */
import { describe, expect, it } from 'vitest';
import { parseCommand, parseEvent } from '@npc/contracts';
import { DomainStore } from '../src/domain/store.js';
import { createBlackboard } from '../src/domain/blackboard.js';
import { Harness, WORLD, FIXED_TIME, ACTOR, workActive } from './helpers.js';

/** Every Object.prototype name that the contract id pattern admits. */
const PROTO_IDS = [
  'toString',
  'constructor',
  'hasOwnProperty',
  'valueOf',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toLocaleString',
] as const;

function heartbeat(actorId: string, eventId = `ev-${actorId}`, sequence = 1) {
  return parseEvent({
    specVersion: '1.0',
    eventId,
    source: 'hermes:default',
    sourceEpoch: 'boot-a',
    sequence,
    worldId: WORLD,
    actorId,
    occurredAt: FIXED_TIME,
    type: 'presence.heartbeat',
    data: { status: 'alive' },
  });
}

function goalRequest(commandId: string, goal: 'think' | 'work' = 'think') {
  return parseCommand({
    specVersion: '1.0',
    commandId,
    worldId: WORLD,
    actorId: ACTOR,
    type: 'goal.request',
    goal,
    ttlMs: 600_000,
    priorityClass: 'task',
    onConflict: 'queue',
  });
}

function goalCancel(commandId: string, targetCommandId: string) {
  return parseCommand({
    specVersion: '1.0',
    commandId,
    worldId: WORLD,
    actorId: ACTOR,
    type: 'goal.cancel',
    targetCommandId,
    ttlMs: 60_000,
    priorityClass: 'task',
    onConflict: 'replace',
  });
}

describe('M1-Q2-01 prototype-named ids', () => {
  it.each(PROTO_IDS)('the M0 parser still accepts %s as a legal id (no reserved names)', (id) => {
    expect(heartbeat(id).actorId).toBe(id);
    expect(goalRequest(id).commandId).toBe(id);
  });

  it.each(PROTO_IDS)('lazily creates actor %s from a wire heartbeat and keeps it addressable', (id) => {
    const store = new DomainStore({ worldId: WORLD, actors: [], wallClock: () => 0 });

    const first = store.dispatch({ kind: 'fact', fact: heartbeat(id) });
    expect(first.accepted).toBe(true);
    expect(first.reason).toBeNull();

    const actor = store.snapshot.actors[id];
    expect(actor).toBeDefined();
    expect(actor?.actorId).toBe(id);
    expect(Object.hasOwn(store.snapshot.actors, id)).toBe(true);
    expect(store.snapshot.actorOrder).toEqual([id]);

    const second = store.dispatch({ kind: 'fact', fact: heartbeat(id, `ev-${id}-2`, 2) });
    expect(second.accepted).toBe(true);
    expect(actor!.presence.heartbeatCount).toBe(1);
    expect(store.snapshot.actors[id]!.presence.heartbeatCount).toBe(2);

    // A second prototype-named actor must coexist: the registry is a real map,
    // not a prototype lookup.
    const secondActor = PROTO_IDS.find((candidate) => candidate !== id)!;
    const other = store.dispatch({ kind: 'fact', fact: heartbeat(secondActor, 'ev-other', 1) });
    expect(other.accepted).toBe(true);
    expect(store.snapshot.actorOrder).toEqual([id, secondActor]);

    const goals = createBlackboard(store).read('goals');
    expect(Object.hasOwn(goals.actors, id)).toBe(true);
    expect(goals.actors[id]?.actorId).toBe(id);
  });

  it.each(PROTO_IDS)('registers, dedupes and cancels command %s', (id) => {
    const h = new Harness();
    h.heartbeat();

    const accepted = h.dispatchCommand(goalRequest(id));
    expect(accepted.accepted).toBe(true);
    expect(accepted.reason).toBeNull();
    expect(Object.hasOwn(h.actor().commands, id)).toBe(true);
    expect(h.actor().commands[id]?.status).toBe('active');

    const duplicate = h.dispatchCommand(goalRequest(id));
    expect(duplicate.accepted).toBe(false);
    expect(duplicate.reason).toBe('DUPLICATE_COMMAND');

    const conflict = h.dispatchCommand(goalRequest(id, 'work'));
    expect(conflict.accepted).toBe(false);
    expect(conflict.reason).toBe('COMMAND_CONFLICT');

    const cancel = h.dispatchCommand(goalCancel(`cancel-${id}`, id));
    expect(cancel.accepted).toBe(true);
    expect(h.actor().commands[id]?.status).toBe('cancelled');
  });

  it.each(PROTO_IDS)('world.pause with commandId %s pauses the world', (id) => {
    const h = new Harness();
    h.heartbeat();
    const pause = parseCommand({
      specVersion: '1.0',
      commandId: id,
      worldId: WORLD,
      actorId: ACTOR,
      type: 'world.pause',
      reason: 'hidden page',
      priorityClass: 'manual',
      onConflict: 'replace',
    });
    const result = h.dispatchCommand(pause);
    expect(result.accepted).toBe(true);
    expect(h.snapshot.worldPaused).toBe(true);
    expect(h.actor().commands[id]?.type).toBe('world.pause');
  });

  it.each(PROTO_IDS)('manual lease commandId %s can be released by its own id', (id) => {
    const h = new Harness();
    h.heartbeat();
    expect(h.manualAcquire({ commandId: id }).accepted).toBe(true);
    expect(h.actor().manual?.commandId).toBe(id);
    expect(h.actor().commands[id]?.status).toBe('active');

    const release = h.manualRelease({ targetCommandId: id, commandId: `release-${id}` });
    expect(release.accepted).toBe(true);
    expect(h.actor().manual).toBeNull();
    expect(h.actor().commands[id]?.status).toBe('completed');
    expect(h.actor().commands[`release-${id}`]?.type).toBe('manual.release');
  });

  it.each(PROTO_IDS)('action %s is requested, started and terminated exactly once', (id) => {
    const h = new Harness({ config: { idleCooldownMs: 0, minDwellMs: 0 } });
    h.heartbeat();
    h.tickFor(100);
    h.goalRequest({ goal: 'work', commandId: 'cw', priorityClass: 'task', ttlMs: 600_000, onConflict: 'replace' });
    h.commit('work');

    const requested = h.actionRequest({ goalId: 'work', actionId: id, actionKey: 'sit.desk' });
    expect(requested.accepted).toBe(true);
    expect(Object.hasOwn(h.actor().actions, id)).toBe(true);
    expect(h.actor().actions[id]?.phase).toBe('pending');
    expect(h.actor().actionOrder).toContain(id);

    const duplicateKey = h.actionRequest({ goalId: 'work', actionId: id, actionKey: 'sit.desk' });
    expect(duplicateKey.accepted).toBe(false);
    expect(duplicateKey.reason).toBe('DUPLICATE_ACTION');

    const duplicateId = h.actionRequest({ goalId: 'work', actionId: id, actionKey: 'type' });
    expect(duplicateId.accepted).toBe(false);
    expect(duplicateId.reason).toBe('DUPLICATE_ACTION_ID');

    expect(h.actionStarted(id).accepted).toBe(true);
    expect(h.actor().actions[id]?.phase).toBe('running');
    expect(h.actionStarted(id).reason).toBe('ALREADY_RUNNING');

    expect(h.actionTerminal(id).accepted).toBe(true);
    expect(h.actor().actions[id]?.phase).toBe('terminal');
    expect(h.actionTerminal(id).reason).toBe('ALREADY_TERMINAL');

    const open = createBlackboard(h.store).read('actions').actors[ACTOR]!.open;
    expect(open.map((a) => a.actionId)).not.toContain(id);
  });

  it('an absent prototype-named key is unknown after the actor has been cloned by later events', () => {
    const h = new Harness();
    h.heartbeat();
    h.goalRequest({ goal: 'think', commandId: 'cmd-a' });
    // This dispatch clones the actor; the clone must not expose Object.prototype.
    h.heartbeat();

    const cancel = h.goalCancel({ targetCommandId: 'toString' });
    expect(cancel.accepted).toBe(false);
    expect(cancel.reason).toBe('UNKNOWN_COMMAND');

    const other = new Harness({ config: { idleCooldownMs: 0, minDwellMs: 0 } });
    other.heartbeat();
    other.tickFor(100);
    other.goalRequest({ goal: 'work', commandId: 'cw', priorityClass: 'task', ttlMs: 600_000, onConflict: 'replace' });
    other.commit('work');
    const started = other.actionStarted('toString');
    expect(started.accepted).toBe(false);
    expect(started.reason).toBe('UNKNOWN_ACTION');
  });

  it('tool and speech records with prototype-named ids stay distinct and keep work correct', () => {
    const h = new Harness();
    h.heartbeat();
    expect(h.toolStarted({ toolCallId: 'toString' }).accepted).toBe(true);
    expect(h.toolStarted({ toolCallId: 'constructor' }).accepted).toBe(true);
    expect(workActive(h)).toBe(true);

    expect(h.toolCompleted({ toolCallId: 'toString' }).accepted).toBe(true);
    expect(workActive(h)).toBe(true); // the parallel 'constructor' tool is still running
    expect(h.toolCompleted({ toolCallId: 'constructor' }).accepted).toBe(true);
    expect(workActive(h)).toBe(false);

    // A completion for a prototype-named id that never started must not revive
    // or invent work.
    expect(h.toolCompleted({ toolCallId: 'valueOf' }).accepted).toBe(true);
    expect(workActive(h)).toBe(false);

    expect(h.speechStarted({ speechId: 'toString' }).accepted).toBe(true);
    expect(h.actor().speeches['toString']).toBeUndefined(); // composite scope key
    expect(Object.values(h.actor().speeches).some((s) => s.speechId === 'toString' && s.phase === 'active')).toBe(true);
    expect(h.speechCompleted({ speechId: 'toString' }).accepted).toBe(true);
    expect(Object.values(h.actor().speeches).every((s) => s.phase === 'terminal')).toBe(true);
  });

  it('normal ids keep working (the fix is dictionary safety, not id rejection)', () => {
    const h = new Harness();
    h.heartbeat();
    expect(h.dispatchCommand(goalRequest('cmd-plain')).accepted).toBe(true);
    expect(h.goalCancel({ targetCommandId: 'cmd-plain' }).accepted).toBe(true);
    expect(h.actor().commands['cmd-plain']?.status).toBe('cancelled');
  });
});
