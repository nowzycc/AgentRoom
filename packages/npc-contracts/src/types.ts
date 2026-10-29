/**
 * NPC runtime v2 contract types (v1 protocol).
 *
 * These are post-parse shapes: defaults documented in spec.md are already
 * applied. Import this module with `import type` from browser code so the
 * Node-only schema loader never enters a render bundle.
 */

export const SPEC_VERSION = '1.0' as const;
export type SpecVersion = typeof SPEC_VERSION;

export type Id = string;
export type SourceId = string;
export type IsoDateTime = string;

export type GoalId = 'work' | 'think' | 'converse' | 'rest' | 'idle' | 'lookAround' | 'sleep' | 'lampOn' | 'lampOff' | 'fridgeOpen';
export type CommandGoalId = 'work' | 'think' | 'converse' | 'rest' | 'idle' | 'lookAround' | 'lampOn' | 'lampOff' | 'fridgeOpen';
export type PriorityClass = 'safety' | 'manual' | 'task' | 'autonomy';
export type Pose = 'standing' | 'sitting' | 'lying';
export type Outcome = 'success' | 'failed' | 'cancelled';

export type EventType =
  | 'run.started'
  | 'run.completed'
  | 'tool.started'
  | 'tool.completed'
  | 'speech.started'
  | 'speech.completed'
  | 'presence.heartbeat';

export interface FactEnvelopeBase {
  specVersion: SpecVersion;
  eventId: Id;
  source: SourceId;
  sourceEpoch: Id;
  sequence: number;
  worldId: Id;
  actorId: Id;
  sessionId?: Id;
  runId?: Id;
  occurredAt: IsoDateTime;
  correlationId?: Id;
}

export interface RunStartedEvent extends FactEnvelopeBase {
  type: 'run.started';
  data: Record<string, never>;
}
export interface RunCompletedEvent extends FactEnvelopeBase {
  type: 'run.completed';
  runId: Id;
  data: { outcome: Outcome };
}
export interface ToolStartedEvent extends FactEnvelopeBase {
  type: 'tool.started';
  data: { toolCallId: Id; activityClass: string };
}
export interface ToolCompletedEvent extends FactEnvelopeBase {
  type: 'tool.completed';
  data: { toolCallId: Id; outcome: Outcome };
}
export interface SpeechStartedEvent extends FactEnvelopeBase {
  type: 'speech.started';
  data: { speechId: Id };
}
export interface SpeechCompletedEvent extends FactEnvelopeBase {
  type: 'speech.completed';
  data: { speechId: Id };
}
export interface PresenceHeartbeatEvent extends FactEnvelopeBase {
  type: 'presence.heartbeat';
  data: { status: 'alive' | 'degraded' };
}

export type EventEnvelope =
  | RunStartedEvent
  | RunCompletedEvent
  | ToolStartedEvent
  | ToolCompletedEvent
  | SpeechStartedEvent
  | SpeechCompletedEvent
  | PresenceHeartbeatEvent;

export interface CommandBase {
  specVersion: SpecVersion;
  commandId: Id;
  worldId: Id;
  actorId: Id;
  priorityClass: PriorityClass;
  onConflict: 'queue' | 'reject' | 'replace';
  constraints?: { capability?: string; interactionId?: Id };
  correlationId?: Id;
  issuedAt?: IsoDateTime;
  reason?: string;
}

export interface GoalRequestCommand extends CommandBase {
  type: 'goal.request';
  goal: CommandGoalId;
  ttlMs: number;
}
export interface GoalCancelCommand extends CommandBase {
  type: 'goal.cancel';
  targetCommandId: Id;
  ttlMs: number;
}
export interface ManualAcquireCommand extends CommandBase {
  type: 'manual.acquire';
  ttlMs: number;
}
export interface ManualReleaseCommand extends CommandBase {
  type: 'manual.release';
  targetCommandId: Id;
}
export interface WorldPauseCommand extends CommandBase {
  type: 'world.pause';
  reason: string;
}
export interface WorldResumeCommand extends CommandBase {
  type: 'world.resume';
}

export type Command =
  | GoalRequestCommand
  | GoalCancelCommand
  | ManualAcquireCommand
  | ManualReleaseCommand
  | WorldPauseCommand
  | WorldResumeCommand;

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface ContactPoint {
  point: Vector3;
  toleranceMeters: number;
}

export interface Slot {
  id: Id;
  pose: Pose;
  localTransform: { position: [number, number, number]; yawDeg: number };
  facing: { yawDeg: number; toleranceDeg?: number };
  approach: { position: [number, number, number]; radiusMeters: number };
  exit?: { position: [number, number, number]; radiusMeters: number };
  contacts?: {
    seat?: ContactPoint;
    feet?: [ContactPoint, ContactPoint];
    hands?: [ContactPoint, ContactPoint];
  };
  capacity: 1;
  capabilities: string[];
  compatibleBodyProfiles: Id[];
  tags?: string[];
}

export interface Interaction {
  id: Id;
  revision: number;
  hostNode: string;
  kind: 'seat' | 'workstation' | 'keyboard' | 'bed' | 'door' | 'generic';
  slots: Slot[];
  composedOf?: { interactionId: Id; role: string }[];
  enabled: boolean;
  tags?: string[];
}

export interface Scene {
  specVersion: SpecVersion;
  sceneId: Id;
  revision: number;
  units: 'meters';
  upAxis: 'Y';
  asset: { uri: string; sha256?: string };
  interactions: Interaction[];
  spawnPoints: { id: Id; position: [number, number, number]; yawDeg: number }[];
  autonomy: {
    enabledGoals: ('idle' | 'lookAround' | 'rest')[];
    allowSleep: boolean;
    idleCooldownMs: number;
  };
}

export interface BodyProfile {
  specVersion: SpecVersion;
  bodyProfileId: Id;
  heightMeters: number;
  radiusMeters: number;
  eyeHeightMeters: number;
  hipHeightMeters: number;
  reach: { maxArmMeters: number; comfortableArmMeters: number };
  bones: {
    head: string;
    neck?: string;
    chest?: string;
    spine?: string;
    hips: string;
    leftHand: string;
    rightHand: string;
    leftFoot: string;
    rightFoot: string;
  };
}

export interface ActorProfile {
  specVersion: SpecVersion;
  actorId: Id;
  bodyProfileId: Id;
  displayName: string;
  capabilities: {
    goals: GoalId[];
    actions: string[];
    interactions: Id[];
  };
}

export interface CapabilityEntry {
  id: GoalId;
  available: boolean;
  reason?: string;
}
export interface ActionCapabilityEntry {
  id: string;
  available: boolean;
  reason?: string;
}
export interface InteractionCapabilityEntry {
  id: Id;
  available: boolean;
  reason?: string;
}

export interface Capabilities {
  specVersion: SpecVersion;
  worldId: Id;
  sceneId: Id;
  sceneRevision: number;
  authority: { mode: 'runtime' | 'none'; epoch?: Id; actorId?: Id };
  goals: CapabilityEntry[];
  actions: ActionCapabilityEntry[];
  interactions: InteractionCapabilityEntry[];
  features: { sleep: boolean; manualOverride: boolean; maxActors: number };
  limits: { maxEventPayloadBytes: number; commandsPerMinute: number };
}
