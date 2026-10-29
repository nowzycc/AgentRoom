/**
 * Domain types for the NPC runtime (M1).
 *
 * The domain layer is pure TypeScript: no Three, DOM, filesystem, network or
 * timers. All time arrives through events stamped by `DomainStore`; the reducer
 * is therefore deterministic and replayable.
 */
import type {
  Command,
  EventEnvelope,
  GoalId,
  Outcome,
  PriorityClass,
} from '@npc/contracts';

export type { GoalId, CommandGoalId, Outcome, PriorityClass } from '@npc/contracts';

export type ActorId = string;
export type LayerId = 'safety' | 'manual' | 'task' | 'autonomy';
export type Posture = 'standing' | 'sitting' | 'lying';
export type RecordPhase = 'active' | 'terminal';
export type TerminalReason = 'completed' | 'completed_before_start' | 'epoch_retired' | null;
export type ActionPhase = 'pending' | 'running' | 'terminal';

/** Inclusive time comparisons tolerate float error (milliseconds). */
export const TIME_EPSILON_MS = 1e-6;

export interface ScopedHeartbeat {
  readonly source: string;
  readonly epoch: string;
  readonly sessionId: string | null;
  readonly sequence: number;
  readonly status: 'alive' | 'degraded';
  readonly receivedAtWallMs: number;
}

export interface PresenceState {
  /** Bounded domain-owned samples. Eviction fails closed for that binding. */
  readonly samples: readonly ScopedHeartbeat[];
  status: 'unknown' | 'alive' | 'degraded';
  lastHeartbeatWallMs: number | null;
  heartbeatCount: number;
  /** Provenance of the single current presence sample, not diagnostic history. */
  heartbeatScope?: { readonly source: string; readonly epoch: string; readonly sessionId: string | null };
}

export interface SourceState {
  source: string;
  epoch: string;
  lastSequence: number;
  eventCount: number;
  outOfOrderCount: number;
  retiredEpochs: string[];
}

export interface ToolRecord {
  key: string;
  toolCallId: string;
  source: string;
  sourceEpoch: string;
  sessionId: string | null;
  activityClass: string;
  phase: RecordPhase;
  outcome: Outcome | null;
  reason: TerminalReason;
  tombstoned: boolean;
  startedSimMs: number | null;
  endedSimMs: number | null;
  startedWallMs: number | null;
  endedWallMs: number | null;
}

export interface RunRecord {
  key: string;
  runId: string;
  source: string;
  sourceEpoch: string;
  sessionId: string | null;
  phase: RecordPhase;
  outcome: Outcome | null;
  reason: TerminalReason;
  tombstoned: boolean;
  startedSimMs: number | null;
  endedSimMs: number | null;
  startedWallMs: number | null;
  endedWallMs: number | null;
}

export interface SpeechRecord {
  key: string;
  speechId: string;
  source: string;
  sourceEpoch: string;
  sessionId: string | null;
  phase: RecordPhase;
  outcome: Outcome | null;
  reason: TerminalReason;
  tombstoned: boolean;
  startedSimMs: number | null;
  endedSimMs: number | null;
  startedWallMs: number | null;
  endedWallMs: number | null;
}

export interface ActivityState {
  /** Simulation time at which work was last observed active or last ended. */
  lastActiveSimMs: number | null;
  /** Previous work sample; lets a heartbeat stay inert while work is running. */
  workActive: boolean;
}

export interface GoalCandidate {
  candidateId: string;
  goalId: GoalId;
  layer: LayerId;
  score: number;
  /** True when the requester explicitly asked to replace (`onConflict: replace`). */
  preempt: boolean;
  kind: 'command' | 'activity' | 'autonomy' | 'safety';
  commandId: string | null;
  requestedAtWallMs: number;
  reason: string;
}

export interface ActiveGoal {
  goalId: GoalId;
  /** Layer the goal was committed at; a manual lease raises the effective layer only. */
  layer: LayerId;
  score: number;
  sinceSimMs: number;
}

export type InterruptReason =
  | 'HIGHER_LAYER'
  | 'SAFETY'
  | 'REPLACE_REQUESTED'
  | 'HIGHER_SCORE'
  | 'ACTIVE_WITHDRAWN'
  | 'NO_CANDIDATE'
  | 'WORLD_PAUSED';

export interface Interruption {
  toGoalId: GoalId | null;
  fromGoalId: GoalId | null;
  fromLayer: LayerId | null;
  /** What the interruption promised, so a later commit can be checked against it. */
  toLayer: LayerId | null;
  toScore: number | null;
  /** State revision at which the promise was made (M2 planner binding). */
  atRevision: number;
  reason: InterruptReason;
  requestedAtSimMs: number;
}

export interface GoalHistoryEntry {
  atSimMs: number;
  from: GoalId | null;
  to: GoalId | null;
  fromLayer: LayerId | null;
  toLayer: LayerId | null;
  reason: string;
}

export interface SuppressedCandidate {
  candidateId: string;
  goalId: GoalId;
  reason: 'WORLD_PAUSED' | 'MANUAL_PIN' | 'LIVENESS_STALE' | 'SLEEP_DISABLED';
}

export interface ExpiredGoal {
  commandId: string | null;
  goalId: GoalId | null;
  atWallMs: number;
  reason: 'TTL_EXPIRED';
}

export interface GoalState {
  active: ActiveGoal | null;
  winner: GoalCandidate | null;
  interrupt: Interruption | null;
  heldReason: string | null;
  candidates: GoalCandidate[];
  suppressed: SuppressedCandidate[];
  history: GoalHistoryEntry[];
  expired: ExpiredGoal[];
}

export interface CommandRecord {
  commandId: string;
  type: Command['type'];
  goalId: GoalId | null;
  priorityClass: PriorityClass;
  status: 'active' | 'expired' | 'cancelled' | 'completed';
  receivedAtWallMs: number;
  expiresAtWallMs: number | null;
  payloadHash: string;
  onConflict: 'queue' | 'reject' | 'replace';
}

export interface ManualLease {
  commandId: string;
  expiresAtWallMs: number;
}

export interface SafetyHold {
  reason: string;
  goalId: GoalId;
  requestedAtWallMs: number;
  expiresAtWallMs: number | null;
}

export interface ActionIntent {
  actionId: string;
  goalId: GoalId;
  actionKey: string;
  phase: ActionPhase;
  outcome: Outcome | null;
  reason: string | null;
  requestedAtSimMs: number;
  endedAtSimMs: number | null;
}

export interface ActorCounters {
  lateStartsIgnored: number;
  manualExpired: number;
  commandsExpired: number;
}

export interface ActorState {
  actorId: ActorId;
  presence: PresenceState;
  sources: Record<string, SourceState>;
  tools: Record<string, ToolRecord>;
  runs: Record<string, RunRecord>;
  speeches: Record<string, SpeechRecord>;
  commands: Record<string, CommandRecord>;
  activity: ActivityState;
  goal: GoalState;
  manual: ManualLease | null;
  safety: SafetyHold | null;
  actions: Record<string, ActionIntent>;
  actionOrder: string[];
  posture: Posture;
  /**
   * Compact ids of terminal records that retention has already pruned. Keeps a
   * late start from reviving a completed activity after its full record is gone.
   * `tombstoneOrder` is insertion order (bounded by maxTombstoneRecords).
   */
  tombstones: Record<string, number>;
  tombstoneOrder: string[];
  /** Last simulation time a time-based tombstone sweep ran. */
  tombstoneSweptSimMs: number;
  counters: ActorCounters;
}

export interface DomainState {
  worldId: string;
  /** Monotonic; increments only when an applied event actually changes state. */
  revision: number;
  /**
   * Semantic revision: moves only when a non-time event applies. Ticks advance
   * `revision`/`simTimeMs` but never this value, so a plan bound to it is not
   * invalidated by elapsed frames (M2 planner binding).
   */
  factsRevision: number;
  simTimeMs: number;
  wallTimeMs: number;
  config: import('./domain/config.js').DomainConfig;
  actorOrder: ActorId[];
  actors: Record<ActorId, ActorState>;
  /** World-level pause; one hidden page pauses every actor, not only its own. */
  worldPaused: boolean;
}

export interface DispatchResult {
  accepted: boolean;
  reason: string | null;
  revision: number;
}

export interface ReduceOutcome {
  status: 'applied' | 'noop' | 'rejected';
  reason?: string;
}


export interface TickResult {
  steps: number;
  simTimeMs: number;
  droppedMs: number;
  lagMs: number;
  revision: number;
}

export interface RejectionRecord {
  atWallMs: number;
  kind: string;
  reason: string;
}

export type DomainEventInput =
  | { kind: 'fact'; fact: EventEnvelope }
  | { kind: 'command'; command: Command }
  | {
      kind: 'safety.request';
      actorId: ActorId;
      reason: string;
      goalId: GoalId;
      ttlMs?: number;
    }
  | { kind: 'safety.clear'; actorId: ActorId; reason: string }
  | { kind: 'source.epoch.adopt'; actorId: ActorId; source: string; epoch: string }
  | {
      kind: 'action.request';
      actorId: ActorId;
      goalId: GoalId;
      actionId: string;
      actionKey: string;
    }
  | { kind: 'action.started'; actorId: ActorId; actionId: string }
  | {
      kind: 'action.terminal';
      actorId: ActorId;
      actionId: string;
      outcome: Outcome;
      reason?: string;
    }
  | { kind: 'goal.commit'; actorId: ActorId; goalId: GoalId | null; reason: string; atRevision?: number }
  | { kind: 'posture.changed'; actorId: ActorId; posture: Posture; reason: string }
  | { kind: 'tick'; dtMs: number };

export interface DomainEventBase {
  /** Wall clock observed by the host; used for TTL and authority only. */
  wallMs: number;
  /** Simulation time after this event's step; used for behaviour timers. */
  simMs: number;
}

export type DomainEvent = DomainEventInput & DomainEventBase;
