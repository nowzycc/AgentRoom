import type { DomainEvent, DomainState, ReduceOutcome } from '../types.js';
import { beginActor, deepFreeze } from './state.js';
import { copyIdMap } from './idmap.js';
import { applyFact } from './facts.js';
import { applyCommand } from './commands.js';
import { applyRuntime } from './runtime.js';
import { finalize } from './finalize.js';

export interface ReduceResult {
  state: DomainState;
  outcome: ReduceOutcome;
}

/**
 * The single pure reducer. Every mutation goes through here; the store never
 * writes state directly. Given the same history it produces the same bytes.
 *
 * Copy-on-write: the draft shares record bodies with the previous snapshot and
 * copies only the containers that are touched. Records are replaced, never
 * mutated, so the frozen previous snapshot remains a valid immutable value
 * without a whole-state structuredClone per event.
 */
export function reduceStamped(prev: DomainState, ev: DomainEvent): ReduceResult {
  const draft: DomainState = {
    ...prev,
    actorOrder: [...prev.actorOrder],
    actors: copyIdMap(prev.actors),
  };
  draft.simTimeMs = Math.max(prev.simTimeMs, ev.simMs);
  draft.wallTimeMs = Math.max(prev.wallTimeMs, ev.wallMs);
  // Ticks move time, not facts: a planner binding survives elapsed frames.
  const factsRevision = prev.factsRevision + (ev.kind === 'tick' ? 0 : 1);
  draft.factsRevision = factsRevision;

  let outcome: ReduceOutcome = { status: 'applied' };
  let touchedActorId: string | undefined;

  switch (ev.kind) {
    case 'fact': {
      if (ev.fact.worldId !== draft.worldId) {
        return { state: prev, outcome: { status: 'rejected', reason: 'WORLD_MISMATCH' } };
      }
      const actor = beginActor(draft, ev.fact.actorId, draft.config.maxActors);
      if (!actor) return { state: prev, outcome: { status: 'rejected', reason: 'ACTOR_LIMIT' } };
      touchedActorId = ev.fact.actorId;
      outcome = applyFact(draft, actor, ev, draft.config);
      break;
    }

    case 'command': {
      if (ev.command.worldId !== draft.worldId) {
        return { state: prev, outcome: { status: 'rejected', reason: 'WORLD_MISMATCH' } };
      }
      const actor = beginActor(draft, ev.command.actorId, draft.config.maxActors);
      if (!actor) return { state: prev, outcome: { status: 'rejected', reason: 'ACTOR_LIMIT' } };
      touchedActorId = ev.command.actorId;
      outcome = applyCommand(draft, actor, ev, draft.config);
      break;
    }

    case 'action.request':
    case 'action.started':
    case 'action.terminal':
    case 'goal.commit':
    case 'posture.changed':
    case 'safety.request':
    case 'safety.clear':
    case 'source.epoch.adopt': {
      const actor = beginActor(draft, ev.actorId, draft.config.maxActors);
      if (!actor) return { state: prev, outcome: { status: 'rejected', reason: 'ACTOR_LIMIT' } };
      touchedActorId = ev.actorId;
      outcome = applyRuntime(draft, actor, ev, draft.config, prev.factsRevision);
      break;
    }

    case 'tick': {
      // A zero-delta frame changes nothing; bumping revision/history for it
      // would make `revision` a frame counter rather than a state version.
      if (!(ev.dtMs > 0)) return { state: prev, outcome: { status: 'noop', reason: 'NO_TIME_ADVANCE' } };
      outcome = { status: 'applied' };
      break;
    }

    default: {
      return { state: prev, outcome: { status: 'rejected', reason: 'UNKNOWN_EVENT' } };
    }
  }

  if (outcome.status === 'rejected') return { state: prev, outcome };

  if (outcome.status === 'noop') {
    // A no-op must not advance the wall clock either: otherwise a duplicate
    // fact would bump the revision and break idempotency.
    return { state: prev, outcome };
  }

  finalize(draft, ev, touchedActorId, factsRevision);

  draft.revision = prev.revision + 1;
  return { state: deepFreeze(draft), outcome };
}
