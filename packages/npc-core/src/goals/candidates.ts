import type { ActorState, GoalCandidate, GoalId, LayerId } from '../types.js';
import { TIME_EPSILON_MS } from '../types.js';
import type { AutonomyGoalId, DomainConfig } from '../domain/config.js';
import { deriveActivity } from '../domain/activity.js';
import { GOAL_SCORES } from './layers.js';
import { compareCandidates } from './arbiter.js';

function scoreFor(layer: LayerId, goalId: GoalId, config: DomainConfig): number {
  if (layer === 'autonomy') {
    if (goalId === 'idle') return config.autonomyScores.idle;
    if (goalId === 'lookAround') return config.autonomyScores.lookAround;
    if (goalId === 'rest') return config.autonomyScores.rest;
    return 0.5;
  }
  if (layer === 'safety') return 1;
  if (layer === 'manual') return 0.9;
  return GOAL_SCORES[goalId];
}

/**
 * Builds the candidate set from facts and commands. Candidates are a
 * projection, never a stored source of truth: they are rebuilt from records on
 * every event, so a duplicate completion cannot leave a phantom goal behind.
 */
export function buildCandidates(actor: ActorState, config: DomainConfig, nowSimMs: number): GoalCandidate[] {
  const list: GoalCandidate[] = [];

  for (const cmd of Object.values(actor.commands)) {
    if (cmd.status !== 'active' || cmd.type !== 'goal.request' || cmd.goalId === null) continue;
    list.push({
      candidateId: `command:${cmd.commandId}`,
      goalId: cmd.goalId,
      layer: cmd.priorityClass,
      score: scoreFor(cmd.priorityClass, cmd.goalId, config),
      preempt: cmd.onConflict === 'replace',
      kind: 'command',
      commandId: cmd.commandId,
      requestedAtWallMs: cmd.receivedAtWallMs,
      reason: `command:${cmd.priorityClass}`,
    });
  }

  const activity = deriveActivity(actor);
  if (activity.work) {
    list.push({
      candidateId: 'activity:work',
      goalId: 'work',
      layer: 'task',
      score: scoreFor('task', 'work', config),
      preempt: false,
      kind: 'activity',
      commandId: null,
      requestedAtWallMs: 0,
      reason: 'tool_or_run_active',
    });
  }
  if (activity.speech) {
    list.push({
      candidateId: 'activity:converse',
      goalId: 'converse',
      layer: 'task',
      score: scoreFor('task', 'converse', config),
      preempt: false,
      kind: 'activity',
      commandId: null,
      requestedAtWallMs: 0,
      reason: 'speech_active',
    });
  }

  if (actor.safety) {
    list.push({
      candidateId: 'safety',
      goalId: actor.safety.goalId,
      layer: 'safety',
      score: 1,
      preempt: true,
      kind: 'safety',
      commandId: null,
      requestedAtWallMs: actor.safety.requestedAtWallMs,
      reason: `safety:${actor.safety.reason}`,
    });
  }

  const autonomyAllowed = actor.goal.active === null || actor.goal.active.layer === 'autonomy';
  if (autonomyAllowed && !activity.work) {
    const cooldownEnd =
      actor.activity.lastActiveSimMs === null
        ? null
        : actor.activity.lastActiveSimMs + config.idleCooldownMs;
    const idleReady = cooldownEnd === null || nowSimMs + TIME_EPSILON_MS >= cooldownEnd;
    if (idleReady && config.enabledAutonomyGoals.includes('idle')) {
      list.push({
        candidateId: 'autonomy:idle',
        goalId: 'idle',
        layer: 'autonomy',
        score: config.autonomyScores.idle,
        preempt: false,
        kind: 'autonomy',
        commandId: null,
        requestedAtWallMs: 0,
          reason: cooldownEnd === null ? 'no_work_yet' : 'work_cooldown_elapsed',
      });
    }
    const idleFor =
      actor.goal.active?.goalId === 'idle' ? nowSimMs - actor.goal.active.sinceSimMs : -1;
    if (
      config.enabledAutonomyGoals.includes('lookAround') &&
      idleFor >= config.autonomyIntervalMs - TIME_EPSILON_MS
    ) {
      list.push({
        candidateId: 'autonomy:lookAround',
        goalId: 'lookAround',
        layer: 'autonomy',
        score: config.autonomyScores.lookAround,
        preempt: false,
        kind: 'autonomy',
        commandId: null,
        requestedAtWallMs: 0,
          reason: 'idle_interval_elapsed',
      });
    }
  }

  // A committed autonomy goal is a continuous session, not a one-frame
  // candidate: keep it supported while it is active so the arbiter does not
  // withdraw it in the same reduce that committed it. It still yields to any
  // higher layer (work/manual/safety) through the normal interruption path.
  const active = actor.goal.active;
  if (
    active &&
    active.layer === 'autonomy' &&
    config.enabledAutonomyGoals.includes(active.goalId as AutonomyGoalId) &&
    !list.some((candidate) => candidate.goalId === active.goalId)
  ) {
    list.push({
      candidateId: `autonomy:continue:${active.goalId}`,
      goalId: active.goalId,
      layer: 'autonomy',
      score: active.score,
      preempt: false,
      kind: 'autonomy',
      commandId: null,
      requestedAtWallMs: 0,
      reason: 'active_autonomy_session',
    });
  }

  return dedupeByGoal(list);
}

/** One representative per goal, so projections and comparisons stay unambiguous. */
function dedupeByGoal(list: GoalCandidate[]): GoalCandidate[] {
  const sorted = [...list].sort(compareCandidates);
  const seen = new Set<GoalId>();
  const out: GoalCandidate[] = [];
  for (const candidate of sorted) {
    if (seen.has(candidate.goalId)) continue;
    seen.add(candidate.goalId);
    out.push(candidate);
  }
  return out.sort(compareCandidates);
}
