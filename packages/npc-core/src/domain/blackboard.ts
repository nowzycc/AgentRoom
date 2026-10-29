import type {
  ActorState,
  DomainState,
  GoalId,
  InterruptReason,
  LayerId,
  Posture,
} from '../types.js';
import { deepFreeze, structurallyEqual } from './state.js';
import { createIdMap, readId, writeId } from './idmap.js';
import { deriveActivity } from './activity.js';
import { isPresenceStale } from './finalize.js';
import type { DomainStore } from './store.js';

export interface ActivityView {
  actorId: string;
  work: boolean;
  speech: boolean;
  activeToolKeys: readonly string[];
  activeRunKeys: readonly string[];
  activeSpeechKeys: readonly string[];
}
export interface GoalView {
  actorId: string;
  active: { goalId: GoalId; layer: LayerId; sinceSimMs: number } | null;
  winner: { goalId: GoalId; layer: LayerId; score: number; reason: string } | null;
  interrupt: {
    toGoalId: GoalId | null;
    fromGoalId: GoalId | null;
    toLayer: LayerId | null;
    toScore: number | null;
    reason: InterruptReason;
    requestedAtSimMs: number;
  } | null;
  heldReason: string | null;
  candidates: { goalId: GoalId; layer: LayerId; score: number; reason: string; preempt: boolean }[];
  suppressed: { goalId: GoalId; reason: string }[];
  posture: Posture;
  worldPaused: boolean;
  manual: { commandId: string; expiresAtWallMs: number } | null;
  safety: { reason: string; goalId: GoalId } | null;
}
export interface LivenessView {
  actorId: string;
  status: 'unknown' | 'alive' | 'degraded';
  stale: boolean;
  lastHeartbeatWallMs: number | null;
  heartbeatCount: number;
}
export interface ActionView {
  actionId: string;
  goalId: GoalId;
  actionKey: string;
  phase: 'pending' | 'running';
}
export interface ActionsView {
  actorId: string;
  open: ActionView[];
  terminalCount: number;
}

export interface ProjectionMap {
  activity: { actors: Record<string, ActivityView> };
  goals: { actors: Record<string, GoalView> };
  liveness: { actors: Record<string, LivenessView> };
  actions: { actors: Record<string, ActionsView> };
}

export type SelectorKey = keyof ProjectionMap;

function eachActor<T>(state: DomainState, fn: (actor: ActorState) => T): Record<string, T> {
  const out = createIdMap<T>();
  for (const actorId of state.actorOrder) {
    const actor = readId(state.actors, actorId);
    if (actor) writeId(out, actorId, fn(actor));
  }
  return out;
}

export const SELECTORS: { [K in SelectorKey]: (state: DomainState) => ProjectionMap[K] } = {
  activity: (state) => ({
    actors: eachActor(state, (actor): ActivityView => {
      const activity = deriveActivity(actor);
      return {
        actorId: actor.actorId,
        work: activity.work,
        speech: activity.speech,
        activeToolKeys: activity.activeToolKeys,
        activeRunKeys: activity.activeRunKeys,
        activeSpeechKeys: activity.activeSpeechKeys,
      };
    }),
  }),

  goals: (state) => ({
    actors: eachActor(state, (actor): GoalView => ({
      actorId: actor.actorId,
      active: actor.goal.active
        ? {
            goalId: actor.goal.active.goalId,
            layer: actor.goal.active.layer,
            sinceSimMs: actor.goal.active.sinceSimMs,
          }
        : null,
      winner: actor.goal.winner
        ? {
            goalId: actor.goal.winner.goalId,
            layer: actor.goal.winner.layer,
            score: actor.goal.winner.score,
            reason: actor.goal.winner.reason,
          }
        : null,
      interrupt: actor.goal.interrupt
        ? {
            toGoalId: actor.goal.interrupt.toGoalId,
            fromGoalId: actor.goal.interrupt.fromGoalId,
            toLayer: actor.goal.interrupt.toLayer,
            toScore: actor.goal.interrupt.toScore,
            reason: actor.goal.interrupt.reason,
            requestedAtSimMs: actor.goal.interrupt.requestedAtSimMs,
          }
        : null,
      heldReason: actor.goal.heldReason,
      candidates: actor.goal.candidates.map((c) => ({
        goalId: c.goalId,
        layer: c.layer,
        score: c.score,
        reason: c.reason,
        preempt: c.preempt,
      })),
      suppressed: actor.goal.suppressed.map((s) => ({ goalId: s.goalId, reason: s.reason })),
      posture: actor.posture,
      worldPaused: state.worldPaused,
      manual: actor.manual
        ? { commandId: actor.manual.commandId, expiresAtWallMs: actor.manual.expiresAtWallMs }
        : null,
      safety: actor.safety ? { reason: actor.safety.reason, goalId: actor.safety.goalId } : null,
    })),
  }),

  liveness: (state) => ({
    actors: eachActor(state, (actor): LivenessView => ({
      actorId: actor.actorId,
      status: actor.presence.status,
      stale: isPresenceStale(actor, state.wallTimeMs, state.config),
      lastHeartbeatWallMs: actor.presence.lastHeartbeatWallMs,
      heartbeatCount: actor.presence.heartbeatCount,
    })),
  }),

  actions: (state) => ({
    actors: eachActor(state, (actor): ActionsView => {
      const open: ActionView[] = [];
      let terminalCount = 0;
      for (const actionId of actor.actionOrder) {
        const intent = readId(actor.actions, actionId);
        if (!intent) continue;
        if (intent.phase === 'terminal') terminalCount += 1;
        else open.push({ actionId: intent.actionId, goalId: intent.goalId, actionKey: intent.actionKey, phase: intent.phase });
      }
      return { actorId: actor.actorId, open, terminalCount };
    }),
  }),
};

/**
 * Read-only projections with dependency subscriptions. `read` always returns a
 * frozen value; subscribers fire only when the projection actually changed, so
 * a 60 Hz tick or a heartbeat does not spam listeners.
 */
export class Blackboard {
  private readonly cache = new Map<SelectorKey, { revision: number; value: unknown }>();
  private readonly listeners = new Map<SelectorKey, Set<(value: unknown) => void>>();
  private readonly lastNotified = new Map<SelectorKey, unknown>();
  private readonly unsubscribeStore: () => void;

  constructor(private readonly store: DomainStore) {
    this.unsubscribeStore = store.subscribeRaw(() => this.notify());
  }

  read<K extends SelectorKey>(key: K): ProjectionMap[K] {
    const cached = this.cache.get(key);
    if (cached && cached.revision === this.store.revision) return cached.value as ProjectionMap[K];
    const value = deepFreeze(SELECTORS[key](this.store.snapshot)) as ProjectionMap[K];
    this.cache.set(key, { revision: this.store.revision, value });
    return value;
  }

  subscribe<K extends SelectorKey>(key: K, listener: (value: ProjectionMap[K]) => void): () => void {
    let set = this.listeners.get(key);
    if (!set) {
      set = new Set();
      this.listeners.set(key, set);
    }
    const wrapped = listener as (value: unknown) => void;
    set.add(wrapped);
    this.lastNotified.set(key, this.read(key));
    return () => {
      const current = this.listeners.get(key);
      if (!current) return;
      current.delete(wrapped);
      if (current.size === 0) this.listeners.delete(key);
    };
  }

  dispose(): void {
    this.unsubscribeStore();
    this.listeners.clear();
  }

  private notify(): void {
    for (const [key, set] of this.listeners) {
      if (set.size === 0) continue;
      const value = this.read(key);
      if (structurallyEqual(this.lastNotified.get(key), value)) continue;
      this.lastNotified.set(key, value);
      for (const listener of set) listener(value);
    }
  }
}

export function createBlackboard(store: DomainStore): Blackboard {
  return new Blackboard(store);
}
