import type { ActorState, DomainState, GoalState, SourceState } from '../types.js';
import type { DomainConfig } from './config.js';
import { copyIdMap, createIdMap, readId, writeId } from './idmap.js';

export function emptyGoalState(): GoalState {
  return {
    active: null,
    winner: null,
    interrupt: null,
    heldReason: null,
    candidates: [],
    suppressed: [],
    history: [],
    expired: [],
  };
}

export function createActorState(actorId: string): ActorState {
  return {
    actorId,
    presence: { status: 'unknown', lastHeartbeatWallMs: null, heartbeatCount: 0, samples: [] },
    sources: createIdMap(),
    tools: createIdMap(),
    runs: createIdMap(),
    speeches: createIdMap(),
    commands: createIdMap(),
    activity: { lastActiveSimMs: null, workActive: false },
    goal: emptyGoalState(),
    manual: null,
    safety: null,
    actions: createIdMap(),
    actionOrder: [],
    posture: 'standing',
    tombstones: createIdMap(),
    tombstoneOrder: [],
    tombstoneSweptSimMs: 0,
    counters: {
      lateStartsIgnored: 0,
      manualExpired: 0,
      commandsExpired: 0,
    },
  };
}

export function createInitialState(config: DomainConfig, actors: string[] = []): DomainState {
  const unique = [...new Set(actors)];
  if (unique.length > config.maxActors) {
    throw new Error(`createInitialState: ${unique.length} actors exceed maxActors ${config.maxActors}`);
  }
  const state: DomainState = {
    worldId: config.worldId,
    revision: 0,
    factsRevision: 0,
    simTimeMs: 0,
    wallTimeMs: 0,
    config,
    actorOrder: unique,
    actors: createIdMap(),
    worldPaused: false,
  };
  for (const id of unique) writeId(state.actors, id, createActorState(id));
  return deepFreeze(state);
}

/**
 * Structural sharing: copy the actor's containers (and the small nested
 * objects that are mutated in place) but keep record bodies shared. A record is
 * only ever replaced, never mutated, so the frozen previous snapshot stays
 * valid. This keeps the per-event cost proportional to the retained record
 * count instead of deep-cloning the whole state.
 */
export function cloneActorState(actor: ActorState): ActorState {
  const sources = createIdMap<SourceState>();
  for (const [source, src] of Object.entries(actor.sources)) {
    writeId(sources, source, { ...src, retiredEpochs: [...src.retiredEpochs] });
  }
  return {
    actorId: actor.actorId,
    presence: { ...actor.presence },
    sources,
    tools: copyIdMap(actor.tools),
    runs: copyIdMap(actor.runs),
    speeches: copyIdMap(actor.speeches),
    commands: copyIdMap(actor.commands),
    activity: { ...actor.activity },
    goal: {
      active: actor.goal.active ? { ...actor.goal.active } : null,
      winner: actor.goal.winner ? { ...actor.goal.winner } : null,
      interrupt: actor.goal.interrupt ? { ...actor.goal.interrupt } : null,
      heldReason: actor.goal.heldReason,
      candidates: [...actor.goal.candidates],
      suppressed: [...actor.goal.suppressed],
      history: [...actor.goal.history],
      expired: [...actor.goal.expired],
    },
    manual: actor.manual ? { ...actor.manual } : null,
    safety: actor.safety ? { ...actor.safety } : null,
    actions: copyIdMap(actor.actions),
    actionOrder: [...actor.actionOrder],
    posture: actor.posture,
    // Tombstones are shared until a write: they are the largest bounded
    // collection and rarely change once the cap is reached.
    tombstones: actor.tombstones,
    tombstoneOrder: actor.tombstoneOrder,
    tombstoneSweptSimMs: actor.tombstoneSweptSimMs,
    counters: { ...actor.counters },
  };
}

/**
 * Returns a mutable actor for the draft, creating it only when the id is within
 * the registry cap. `null` means the event must be rejected (ACTOR_LIMIT).
 */
export function beginActor(state: DomainState, actorId: string, maxActors: number): ActorState | null {
  const existing = readId(state.actors, actorId);
  if (existing) {
    const copy = cloneActorState(existing);
    writeId(state.actors, actorId, copy);
    return copy;
  }
  if (state.actorOrder.length >= maxActors) return null;
  const created = createActorState(actorId);
  writeId(state.actors, actorId, created);
  state.actorOrder.push(actorId);
  return created;
}

/** Clones an existing actor into the draft; does not create or enforce caps. */
export function mutableActor(state: DomainState, actorId: string): ActorState | undefined {
  const existing = readId(state.actors, actorId);
  if (!existing) return undefined;
  const copy = cloneActorState(existing);
  writeId(state.actors, actorId, copy);
  return copy;
}

export function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (Object.isFrozen(value)) return value;
  Object.freeze(value);
  if (Array.isArray(value)) {
    for (const item of value) deepFreeze(item);
    return value;
  }
  for (const key of Object.keys(value as Record<string, unknown>)) {
    deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}

/** Structural equality used to decide whether an event actually changed state. */
export function structurallyEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Converts a JSON-parsed or structured-cloned snapshot back into a safe domain
 * state. Both return ordinary objects with Object.prototype, so every id-keyed
 * map would otherwise expose inherited names again. This is the only supported
 * entry for a snapshot that crossed a serialization boundary (M5 owns
 * persistence).
 */
export function rehydrateDomainState(parsed: DomainState): DomainState {
  const actors = createIdMap<ActorState>();
  const actorOrder: string[] = [];
  for (const actorId of parsed.actorOrder) {
    const raw = readId(parsed.actors, actorId);
    if (!raw) continue;
    writeId(actors, actorId, rehydrateActorState(raw));
    actorOrder.push(actorId);
  }
  const state: DomainState = {
    ...parsed,
    factsRevision: parsed.factsRevision ?? 0,
    actorOrder,
    actors,
    config: {
      ...parsed.config,
      autonomyScores: { ...parsed.config.autonomyScores },
      enabledAutonomyGoals: [...parsed.config.enabledAutonomyGoals],
    },
  };
  return deepFreeze(state);
}

function rehydrateActorState(raw: ActorState): ActorState {
  const sources = createIdMap<SourceState>();
  for (const source of Object.keys(raw.sources)) {
    const src = raw.sources[source] as SourceState;
    writeId(sources, source, { ...src, retiredEpochs: [...src.retiredEpochs] });
  }
  return {
    actorId: raw.actorId,
    presence: { ...raw.presence },
    sources,
    tools: copyIdMap(raw.tools),
    runs: copyIdMap(raw.runs),
    speeches: copyIdMap(raw.speeches),
    commands: copyIdMap(raw.commands),
    activity: { ...raw.activity },
    goal: {
      active: raw.goal.active ? { ...raw.goal.active } : null,
      winner: raw.goal.winner ? { ...raw.goal.winner } : null,
      interrupt: raw.goal.interrupt ? { ...raw.goal.interrupt } : null,
      heldReason: raw.goal.heldReason,
      candidates: [...raw.goal.candidates],
      suppressed: [...raw.goal.suppressed],
      history: [...raw.goal.history],
      expired: [...raw.goal.expired],
    },
    manual: raw.manual ? { ...raw.manual } : null,
    safety: raw.safety ? { ...raw.safety } : null,
    actions: copyIdMap(raw.actions),
    actionOrder: [...raw.actionOrder],
    posture: raw.posture,
    tombstones: copyIdMap(raw.tombstones),
    tombstoneOrder: [...raw.tombstoneOrder],
    tombstoneSweptSimMs: raw.tombstoneSweptSimMs,
    counters: { ...raw.counters },
  };
}

