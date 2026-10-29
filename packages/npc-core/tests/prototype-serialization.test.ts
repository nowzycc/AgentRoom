/**
 * M1-Q2-01 second half: the same prototype-name hazard must not come back
 * through cloning or a JSON snapshot. `JSON.parse` returns ordinary objects,
 * so `rehydrateDomainState` is the supported boundary back into the domain.
 */
import { describe, expect, it } from 'vitest';
import { parseCommand, parseEvent } from '@npc/contracts';
import { DomainStore } from '../src/domain/store.js';
import { cloneActorState, rehydrateDomainState } from '../src/domain/state.js';
import { reduceStamped } from '../src/domain/reduce.js';
import { createIdMap, deleteId, hasId, readId, writeId } from '../src/domain/idmap.js';
import { Harness, WORLD, FIXED_TIME, ACTOR } from './helpers.js';

function heartbeat(actorId: string, eventId: string, sequence = 1) {
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

function cancel(targetCommandId: string, commandId = 'cancel-x') {
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

describe('id map primitives', () => {
  it('has no inherited keys but stores prototype names as own data keys', () => {
    const map = createIdMap<number>();
    expect(Object.getPrototypeOf(map)).toBeNull();
    expect(readId(map, 'toString')).toBeUndefined();
    expect(hasId(map, 'toString')).toBe(false);

    writeId(map, 'toString', 1);
    expect(readId(map, 'toString')).toBe(1);
    expect(hasId(map, 'toString')).toBe(true);
    expect(Object.keys(map)).toEqual(['toString']);

    writeId(map, '__proto__', 2);
    expect(Object.getPrototypeOf(map)).toBeNull();
    expect(Object.hasOwn(map, '__proto__')).toBe(true);
    expect(readId(map, '__proto__')).toBe(2);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();

    deleteId(map, 'toString');
    expect(readId(map, 'toString')).toBeUndefined();
  });
});

describe('clone and JSON snapshot of prototype-named ids', () => {
  it('cloneActorState keeps a real dictionary (absent keys stay absent)', () => {
    const store = new DomainStore({ worldId: WORLD, actors: ['toString'], wallClock: () => 0 });
    store.dispatch({ kind: 'fact', fact: heartbeat('toString', 'ev-1') });
    const clone = cloneActorState(store.snapshot.actors['toString']!);
    expect(Object.getPrototypeOf(clone.commands)).toBeNull();
    expect(Object.getPrototypeOf(clone.actions)).toBeNull();
    expect(readId(clone.commands, 'constructor')).toBeUndefined();
  });

  it('rehydrates a JSON snapshot without re-exposing Object.prototype', () => {
    const h = new Harness();
    h.heartbeat();
    expect(
      h.dispatchCommand(
        parseCommand({
          specVersion: '1.0',
          commandId: 'toString',
          worldId: WORLD,
          actorId: ACTOR,
          type: 'goal.request',
          goal: 'think',
          ttlMs: 600_000,
          priorityClass: 'task',
          onConflict: 'queue',
        }),
      ).accepted,
    ).toBe(true);

    const text = JSON.stringify(h.snapshot);
    expect(text).toContain('"toString"');
    const parsed = JSON.parse(text) as typeof h.snapshot;
    // JSON.parse really does give ordinary prototype-bearing objects back.
    expect(Object.getPrototypeOf(parsed.actors)).toBe(Object.prototype);

    const state = rehydrateDomainState(parsed);
    expect(Object.getPrototypeOf(state.actors)).toBeNull();
    const actor = state.actors[ACTOR]!;
    expect(Object.getPrototypeOf(actor.commands)).toBeNull();
    expect(readId(actor.commands, 'toString')?.status).toBe('active');
    expect(readId(actor.commands, 'valueOf')).toBeUndefined();

    // A prototype-named target that does not exist is unknown, not inherited.
    const absent = reduceStamped(state, { kind: 'command', command: cancel('valueOf'), wallMs: 0, simMs: 0 });
    expect(absent.outcome).toEqual({ status: 'rejected', reason: 'UNKNOWN_COMMAND' });

    // A prototype-named target that does exist is found after the round trip.
    const found = reduceStamped(state, { kind: 'command', command: cancel('toString', 'cancel-2'), wallMs: 0, simMs: 0 });
    expect(found.outcome.status).toBe('applied');
    expect(found.state.actors[ACTOR]!.commands['toString']?.status).toBe('cancelled');

    // New facts still create/update actors through cloned maps.
    const next = reduceStamped(found.state, { kind: 'fact', fact: heartbeat('constructor', 'ev-2'), wallMs: 0, simMs: 0 });
    expect(next.outcome.status).toBe('applied');
    expect(next.state.actors['constructor']?.presence.heartbeatCount).toBe(1);
    expect(next.state.actorOrder).toEqual([ACTOR, 'constructor']);
  });

  it('rehydrates a structuredClone snapshot (structuredClone also drops null prototypes)', () => {
    const h = new Harness();
    h.heartbeat();
    expect(
      h.dispatchCommand(
        parseCommand({
          specVersion: '1.0',
          commandId: 'toString',
          worldId: WORLD,
          actorId: ACTOR,
          type: 'goal.request',
          goal: 'think',
          ttlMs: 600_000,
          priorityClass: 'task',
          onConflict: 'queue',
        }),
      ).accepted,
    ).toBe(true);

    const cloned = structuredClone(h.snapshot);
    expect(Object.getPrototypeOf(cloned.actors)).toBe(Object.prototype);
    const state = rehydrateDomainState(cloned);
    expect(Object.getPrototypeOf(state.actors)).toBeNull();
    expect(readId(state.actors[ACTOR]!.commands, 'toString')?.status).toBe('active');
    const absent = reduceStamped(state, { kind: 'command', command: cancel('valueOf'), wallMs: 0, simMs: 0 });
    expect(absent.outcome).toEqual({ status: 'rejected', reason: 'UNKNOWN_COMMAND' });
  });
});
