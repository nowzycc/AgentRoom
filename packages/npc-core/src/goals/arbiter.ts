import type {
  ActiveGoal,
  GoalCandidate,
  Interruption,
  InterruptReason,
  LayerId,
  SuppressedCandidate,
} from '../types.js';
import { TIME_EPSILON_MS } from '../types.js';
import type { DomainConfig } from '../domain/config.js';
import { layerRank } from './layers.js';

export interface ArbitrationInput {
  candidates: GoalCandidate[];
  active: ActiveGoal | null;
  manual: boolean;
  worldPaused: boolean;
  livenessStale: boolean;
  nowSimMs: number;
  /** Revision of the state this arbitration belongs to (promise binding). */
  revision: number;
  config: DomainConfig;
}

export interface ArbitrationResult {
  winner: GoalCandidate | null;
  /** Candidates that survived suppression, strongest first. */
  considered: GoalCandidate[];
  suppressed: SuppressedCandidate[];
  interrupt: Interruption | null;
  heldReason: string | null;
}

/**
 * Deterministic candidate order:
 * 1. layer (safety > manual > task > autonomy) always wins;
 * 2. an explicit `replace` request outranks non-replace candidates in its layer,
 *    newest replace first;
 * 3. otherwise higher score, then oldest request, then stable id.
 */
export function compareCandidates(a: GoalCandidate, b: GoalCandidate): number {
  const byLayer = layerRank(b.layer) - layerRank(a.layer);
  if (byLayer !== 0) return byLayer;

  if (a.preempt !== b.preempt) return a.preempt ? -1 : 1;
  if (a.preempt && b.preempt) {
    if (a.requestedAtWallMs !== b.requestedAtWallMs) return b.requestedAtWallMs - a.requestedAtWallMs;
  } else {
    if (a.score !== b.score) return b.score - a.score;
    if (a.requestedAtWallMs !== b.requestedAtWallMs) return a.requestedAtWallMs - b.requestedAtWallMs;
  }
  return a.candidateId < b.candidateId ? -1 : a.candidateId > b.candidateId ? 1 : 0;
}

export function arbitrate(input: ArbitrationInput): ArbitrationResult {
  const { active, manual, worldPaused, livenessStale, nowSimMs, revision, config } = input;
  const suppressed: SuppressedCandidate[] = [];
  const considered: GoalCandidate[] = [];

  for (const candidate of input.candidates) {
    let reason: SuppressedCandidate['reason'] | null = null;
    if (worldPaused && candidate.layer !== 'safety') reason = 'WORLD_PAUSED';
    else if (manual && candidate.layer === 'autonomy') reason = 'MANUAL_PIN';
    else if (livenessStale && config.requireLivenessForAutonomy && candidate.layer === 'autonomy') {
      reason = 'LIVENESS_STALE';
    } else if (candidate.goalId === 'sleep' && !config.allowSleep) reason = 'SLEEP_DISABLED';

    if (reason) suppressed.push({ candidateId: candidate.candidateId, goalId: candidate.goalId, reason });
    else considered.push(candidate);
  }

  considered.sort(compareCandidates);
  const winner = considered[0] ?? null;

  const pinned = manual && active !== null && active.layer !== 'safety';
  // A goal is supported if a candidate still exists for it at its own layer (or
  // above); a manual lease is itself the support. Without support the goal must
  // be exited even if a lower-layer candidate is waiting.
  const activeSupported = active
    ? pinned ||
      considered.some(
        (c) => c.goalId === active.goalId && layerRank(c.layer) >= layerRank(active.layer),
      )
    : false;

  const base = { considered, suppressed };

  const interruptTo = (candidate: GoalCandidate | null, reason: InterruptReason): ArbitrationResult => ({
    ...base,
    winner: candidate,
    heldReason: null,
    interrupt: {
      toGoalId: candidate?.goalId ?? null,
      fromGoalId: active?.goalId ?? null,
      fromLayer: active?.layer ?? null,
      toLayer: candidate?.layer ?? null,
      toScore: candidate?.score ?? null,
      atRevision: revision,
      reason,
      requestedAtSimMs: nowSimMs,
    },
  });

  const hold = (reason: string | null): ArbitrationResult => ({
    ...base,
    winner,
    heldReason: reason,
    interrupt: null,
  });

  if (!winner) {
    if (!active) return hold('NO_CANDIDATE');
    if (pinned) return hold('MANUAL_PIN');
    return interruptTo(null, worldPaused ? 'WORLD_PAUSED' : 'NO_CANDIDATE');
  }

  if (!active) return hold(null);
  const effective: LayerId = pinned ? 'manual' : active.layer;
  if (winner.goalId === active.goalId && layerRank(winner.layer) === layerRank(effective)) {
    return hold(null);
  }
  if (!activeSupported) return interruptTo(winner, 'ACTIVE_WITHDRAWN');

  const activeRank = layerRank(effective);
  const winnerRank = layerRank(winner.layer);
  if (pinned && winnerRank < layerRank('manual')) return hold('MANUAL_PIN');
  // The winner cannot be below the active layer while the active goal is
  // supported: `considered` is sorted by layer and support requires a candidate
  // at or above that layer, so the winner is always at least as high.
  if (winnerRank > activeRank) {
    return interruptTo(winner, winner.layer === 'safety' ? 'SAFETY' : 'HIGHER_LAYER');
  }

  // Same layer: an explicit replace wins once the dwell is respected; otherwise
  // the challenger must clear the hysteresis margin.
  const dwellSatisfied = nowSimMs - active.sinceSimMs >= config.minDwellMs - TIME_EPSILON_MS;
  if (winner.preempt) {
    return dwellSatisfied ? interruptTo(winner, 'REPLACE_REQUESTED') : hold('MIN_DWELL');
  }
  if (winner.score >= active.score + config.hysteresisScore - TIME_EPSILON_MS) {
    return dwellSatisfied ? interruptTo(winner, 'HIGHER_SCORE') : hold('MIN_DWELL');
  }
  return hold('HOLD_HYSTERESIS');
}
