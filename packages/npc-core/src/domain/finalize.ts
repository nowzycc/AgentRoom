import type { ActorState, DomainEvent, DomainState } from '../types.js';
import { TIME_EPSILON_MS } from '../types.js';
import type { DomainConfig } from './config.js';
import { deriveActivity } from './activity.js';
import { mutableActor } from './state.js';
import { deleteId, readId, writeId } from './idmap.js';
import { buildCandidates } from '../goals/candidates.js';
import { arbitrate } from '../goals/arbiter.js';
import {
  pruneCommandRecords,
  pruneRunRecords,
  pruneSpeechRecords,
  pruneToolRecords,
  sweepTombstones,
} from './retention.js';

export function isPresenceStale(actor: ActorState, wallMs: number, config: DomainConfig): boolean {
  if (actor.presence.lastHeartbeatWallMs === null) return true;
  // Inclusive, matching TTL expiry (`>= deadline`), so a limit means the same
  // thing everywhere.
  return wallMs - actor.presence.lastHeartbeatWallMs >= config.heartbeatStaleAfterMs - TIME_EPSILON_MS;
}

/**
 * Re-derives activity, expires TTLs and re-runs arbitration for every actor.
 * Runs for every applied event, so no caller can forget to arbitrate.
 */
export function finalize(
  draft: DomainState,
  ev: DomainEvent,
  touchedActorId?: string,
  factsRevision: number = draft.factsRevision,
): void {
  for (const actorId of draft.actorOrder) {
    // The event actor is already a mutable copy in the draft; cloning it again
    // would double the per-event cost for the common single-actor case.
    const actor = actorId === touchedActorId ? readId(draft.actors, actorId) : mutableActor(draft, actorId);
    if (!actor) continue;

    expireTimers(actor, draft.wallTimeMs);

    const activity = deriveActivity(actor);
    if (activity.work) {
      // Simulation time advances activity; a heartbeat or a second tool start
      // must not re-stamp the cooldown anchor.
      if (!actor.activity.workActive || ev.kind === 'tick') actor.activity.lastActiveSimMs = ev.simMs;
      actor.activity.workActive = true;
    } else if (actor.activity.workActive) {
      actor.activity.workActive = false;
      actor.activity.lastActiveSimMs = ev.simMs;
    }

    const candidates = buildCandidates(actor, draft.config, ev.simMs);
    const arbitration = arbitrate({
      candidates,
      active: actor.goal.active,
      manual: actor.manual !== null,
      worldPaused: draft.worldPaused,
      livenessStale: isPresenceStale(actor, draft.wallTimeMs, draft.config),
      nowSimMs: ev.simMs,
      revision: factsRevision,
      config: draft.config,
    });

    actor.goal.candidates = arbitration.considered;
    actor.goal.suppressed = arbitration.suppressed;
    actor.goal.winner = arbitration.winner;
    const nextInterrupt = arbitration.interrupt;
    const pending = actor.goal.interrupt;
    const sameInterrupt =
      nextInterrupt !== null &&
      pending !== null &&
      pending.toGoalId === nextInterrupt.toGoalId &&
      pending.reason === nextInterrupt.reason &&
      pending.fromGoalId === nextInterrupt.fromGoalId &&
      pending.toLayer === nextInterrupt.toLayer &&
      pending.toScore === nextInterrupt.toScore;
    // Keep the original request time: an interruption is raised once, not
    // re-stamped on every 60 Hz tick while the body is still exiting. The
    // revision, however, must follow the state in which the same promise was
    // last re-observed (M2-SPEC-02): a heartbeat/tool fact during the safe exit
    // otherwise leaves the promise bound to a revision that no longer exists,
    // and every later goal.commit is rejected as STALE_COMMIT. Re-stamping the
    // revision does not weaken the binding: goal.commit still re-validates the
    // candidate layer/score and rejects any commit that names an older state.
    actor.goal.interrupt = sameInterrupt
      ? pending.atRevision === factsRevision
        ? pending
        : { ...pending, atRevision: factsRevision }
      : nextInterrupt;

    actor.goal.heldReason = arbitration.heldReason;

    if (!actor.goal.active && arbitration.winner) {
      const winner = arbitration.winner;
      actor.goal.active = {
        goalId: winner.goalId,
        layer: winner.layer,
        score: winner.score,
        sinceSimMs: ev.simMs,
      };
      actor.goal.history.push({
        atSimMs: ev.simMs,
        from: null,
        to: winner.goalId,
        fromLayer: null,
        toLayer: winner.layer,
        reason: 'AUTO_START',
      });
    }

    trim(actor, draft.config, ev.simMs, draft.wallTimeMs);
  }
}

function expireTimers(actor: ActorState, wallMs: number): void {
  for (const [commandId, cmd] of Object.entries(actor.commands)) {
    if (cmd.status !== 'active' || cmd.expiresAtWallMs === null) continue;
    if (wallMs + TIME_EPSILON_MS < cmd.expiresAtWallMs) continue;
    writeId(actor.commands, commandId, { ...cmd, status: 'expired' });
    actor.counters.commandsExpired += 1;
    if (cmd.type === 'goal.request') {
      actor.goal.expired.push({
        commandId: cmd.commandId,
        goalId: cmd.goalId,
        atWallMs: wallMs,
        reason: 'TTL_EXPIRED',
      });
    }
  }

  if (actor.manual && wallMs + TIME_EPSILON_MS >= actor.manual.expiresAtWallMs) {
    actor.manual = null;
    actor.counters.manualExpired += 1;
  }

  if (
    actor.safety &&
    actor.safety.expiresAtWallMs !== null &&
    wallMs + TIME_EPSILON_MS >= actor.safety.expiresAtWallMs
  ) {
    actor.safety = null;
  }
}

function trim(actor: ActorState, config: DomainConfig, nowSimMs: number, nowWallMs: number): void {
  if (actor.goal.history.length > config.maxGoalHistory) {
    actor.goal.history = actor.goal.history.slice(-config.maxGoalHistory);
  }
  if (actor.goal.expired.length > config.maxGoalHistory) {
    actor.goal.expired = actor.goal.expired.slice(-config.maxGoalHistory);
  }

  pruneToolRecords(actor, config, nowSimMs);
  pruneRunRecords(actor, config, nowSimMs);
  pruneSpeechRecords(actor, config, nowSimMs);
  pruneCommandRecords(actor, config, nowWallMs);
  sweepTombstones(actor, config, nowSimMs);

  if (actor.actionOrder.length <= config.maxActionHistory) return;

  const overflow = actor.actionOrder.length - config.maxActionHistory;
  const keep: string[] = [];
  let dropped = 0;
  for (const actionId of actor.actionOrder) {
    const intent = readId(actor.actions, actionId);
    if (dropped < overflow && intent && intent.phase === 'terminal') {
      deleteId(actor.actions, actionId);
      dropped += 1;
      continue;
    }
    keep.push(actionId);
  }
  actor.actionOrder = keep;
}
