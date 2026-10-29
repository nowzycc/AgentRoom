import type {
  ActionIntent,
  ActiveGoal,
  ActorState,
  DomainEvent,
  DomainState,
  GoalCandidate,
  ReduceOutcome,
} from '../types.js';
import type { DomainConfig } from './config.js';
import { readId, writeId } from './idmap.js';
import { adoptSourceEpoch } from './facts.js';

type RuntimeEvent = Extract<
  DomainEvent,
  {
    kind:
      | 'safety.request'
      | 'safety.clear'
      | 'action.request'
      | 'action.started'
      | 'action.terminal'
      | 'goal.commit'
      | 'posture.changed'
      | 'source.epoch.adopt';
  }
>;

/** Runtime-local events (not wire protocol): execution confirmation and commits. */
export function applyRuntime(
  draft: DomainState,
  actor: ActorState,
  ev: RuntimeEvent,
  config: DomainConfig,
  prevFactsRevision: number,
): ReduceOutcome {
  switch (ev.kind) {
    case 'safety.request': {
      if (ev.goalId === 'sleep') return { status: 'rejected', reason: 'SLEEP_DISABLED' };
      // A non-positive TTL would install a hold that expires in the same reduce
      // while the caller believes safety is held. Refuse it by name.
      if (ev.ttlMs !== undefined && (!Number.isFinite(ev.ttlMs) || ev.ttlMs <= 0)) {
        return { status: 'rejected', reason: 'SAFETY_TTL_INVALID' };
      }
      actor.safety = {
        reason: ev.reason,
        goalId: ev.goalId,
        requestedAtWallMs: ev.wallMs,
        expiresAtWallMs: ev.ttlMs === undefined ? null : ev.wallMs + ev.ttlMs,
      };
      return { status: 'applied' };
    }

    case 'safety.clear': {
      if (!actor.safety) return { status: 'noop', reason: 'NO_SAFETY_HOLD' };
      actor.safety = null;
      return { status: 'applied' };
    }

    case 'source.epoch.adopt': {
      return adoptSourceEpoch(actor, ev.source, ev.epoch, ev.simMs, ev.wallMs);
    }

    case 'action.request': {
      const active = actor.goal.active;
      if (!active || active.goalId !== ev.goalId) return { status: 'rejected', reason: 'GOAL_NOT_ACTIVE' };

      const sameId = readId(actor.actions, ev.actionId);
      if (sameId) {
        if (sameId.goalId !== ev.goalId || sameId.actionKey !== ev.actionKey) {
          return { status: 'rejected', reason: 'DUPLICATE_ACTION_ID' };
        }
        return { status: 'rejected', reason: sameId.phase === 'terminal' ? 'ALREADY_TERMINAL' : 'DUPLICATE_ACTION' };
      }

      const duplicateKey = Object.values(actor.actions).some(
        (a) => a.goalId === ev.goalId && a.actionKey === ev.actionKey && a.phase !== 'terminal',
      );
      if (duplicateKey) return { status: 'rejected', reason: 'DUPLICATE_ACTION' };

      // The ledger is bounded by open actions, not by completed history: a
      // producer that never finishes its intents cannot grow it without limit.
      let open = 0;
      for (const intent of Object.values(actor.actions)) if (intent.phase !== 'terminal') open += 1;
      if (open >= config.maxOpenActions) return { status: 'rejected', reason: 'ACTION_LIMIT' };

      const intent: ActionIntent = {
        actionId: ev.actionId,
        goalId: ev.goalId,
        actionKey: ev.actionKey,
        phase: 'pending',
        outcome: null,
        reason: null,
        requestedAtSimMs: ev.simMs,
        endedAtSimMs: null,
      };
      writeId(actor.actions, ev.actionId, intent);
      actor.actionOrder.push(ev.actionId);
      return { status: 'applied' };
    }

    case 'action.started': {
      const intent = readId(actor.actions, ev.actionId);
      if (!intent) return { status: 'rejected', reason: 'UNKNOWN_ACTION' };
      if (intent.phase === 'terminal') return { status: 'rejected', reason: 'ALREADY_TERMINAL' };
      if (intent.phase === 'running') return { status: 'noop', reason: 'ALREADY_RUNNING' };
      writeId(actor.actions, ev.actionId, { ...intent, phase: 'running' });
      return { status: 'applied' };
    }

    case 'action.terminal': {
      const intent = readId(actor.actions, ev.actionId);
      if (!intent) return { status: 'rejected', reason: 'UNKNOWN_ACTION' };
      if (intent.phase === 'terminal') {
        return { status: 'noop', reason: 'ALREADY_TERMINAL' };
      }
      writeId(actor.actions, ev.actionId, {
        ...intent,
        phase: 'terminal',
        outcome: ev.outcome,
        reason: ev.reason ?? null,
        endedAtSimMs: ev.simMs,
      });
      return { status: 'applied' };
    }

    case 'goal.commit': {
      // The interruption is a promise made at a semantic revision. A commit
      // that does not name it (or names an older one) is a stale plan target.
      if (ev.atRevision === undefined) return { status: 'rejected', reason: 'MISSING_REVISION' };
      if (ev.atRevision !== prevFactsRevision) return { status: 'rejected', reason: 'STALE_COMMIT' };
      const interrupt = actor.goal.interrupt;
      if (!interrupt) return { status: 'rejected', reason: 'NO_INTERRUPT_PENDING' };
      const target = ev.goalId ?? null;
      if ((interrupt.toGoalId ?? null) !== target) return { status: 'rejected', reason: 'INTERRUPT_MISMATCH' };

      let candidate: GoalCandidate | null = null;
      if (target !== null) {
        candidate = actor.goal.candidates.find((c) => c.goalId === target) ?? null;
        if (!candidate) return { status: 'rejected', reason: 'STALE_INTERRUPT' };
        // The commit must honour the promise the interruption made. A candidate
        // whose layer/score no longer matches is a stale plan target.
        if (interrupt.toLayer !== null && candidate.layer !== interrupt.toLayer) {
          return { status: 'rejected', reason: 'STALE_INTERRUPT' };
        }
        if (
          interrupt.toScore !== null &&
          Math.abs(candidate.score - interrupt.toScore) > 1e-6
        ) {
          return { status: 'rejected', reason: 'STALE_INTERRUPT' };
        }
      }

      const previous = actor.goal.active;
      if (previous && previous.goalId !== target) abandonActions(actor, previous.goalId, ev.simMs);

      actor.goal.active = candidate
        ? {
            goalId: candidate.goalId,
            layer: candidate.layer,
            score: candidate.score,
            sinceSimMs: ev.simMs,
          }
        : null;
      actor.goal.interrupt = null;
      actor.goal.history.push({
        atSimMs: ev.simMs,
        from: previous?.goalId ?? null,
        to: target,
        fromLayer: previous?.layer ?? null,
        toLayer: candidate?.layer ?? null,
        reason: ev.reason,
      });
      return { status: 'applied' };
    }

    case 'posture.changed': {
      if (actor.posture === ev.posture) return { status: 'noop', reason: 'SAME_POSTURE' };
      actor.posture = ev.posture;
      return { status: 'applied' };
    }

    default:
      return { status: 'rejected', reason: 'UNKNOWN_RUNTIME_EVENT' };
  }
}

function abandonActions(actor: ActorState, goalId: GoalCandidate['goalId'] | ActiveGoal['goalId'], simMs: number): void {
  for (const [actionId, intent] of Object.entries(actor.actions)) {
    if (intent.goalId === goalId && intent.phase !== 'terminal') {
      writeId(actor.actions, actionId, {
        ...intent,
        phase: 'terminal',
        outcome: 'cancelled',
        reason: 'goal_switch',
        endedAtSimMs: simMs,
      });
    }
  }
}
