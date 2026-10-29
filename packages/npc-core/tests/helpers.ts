/**
 * Test harness for the M1 domain layer. Builds real wire facts/commands from
 * `@npc/contracts` (type-only, parsed shapes) and drives a DomainStore with a
 * fake wall clock so every run is deterministic.
 */
import type {
  Command,
  EventEnvelope,
  GoalRequestCommand,
  ManualAcquireCommand,
  ManualReleaseCommand,
  ToolCompletedEvent,
  ToolStartedEvent,
  RunStartedEvent,
  RunCompletedEvent,
  SpeechStartedEvent,
  SpeechCompletedEvent,
  PresenceHeartbeatEvent,
  GoalCancelCommand,
  WorldPauseCommand,
  WorldResumeCommand,
  Outcome,
  PriorityClass,
  CommandGoalId,
  GoalId,
} from '@npc/contracts';
import { DomainStore } from '../src/domain/store.js';
import { deriveActivity } from '../src/domain/activity.js';
import type { DomainConfigInput } from '../src/domain/config.js';
import type { DispatchResult, TickResult } from '../src/types.js';

export const WORLD = 'apt-1';
export const ACTOR = 'npc-a';
export const ACTOR_B = 'npc-b';
export const FIXED_TIME = '2026-10-25T03:00:00.000Z';

let eventCounter = 0;
export const nextEventId = (prefix = 'ev'): string => `${prefix}-${++eventCounter}`;

let sequenceCounter = 0;
const nextSequence = (): number => ++sequenceCounter;

export interface HarnessOptions {
  config?: DomainConfigInput;
  actors?: string[];
  startWallMs?: number;
}

export interface ToolStartInput {
  toolCallId: string;
  actorId?: string;
  activityClass?: string;
  source?: string;
  sourceEpoch?: string;
  sessionId?: string;
  runId?: string;
  eventId?: string;
  sequence?: number;
}

export interface ToolCompleteInput extends ToolStartInput {
  outcome?: Outcome;
}

export class Harness {
  readonly store: DomainStore;
  wallMs: number;

  constructor(options: HarnessOptions = {}) {
    sequenceCounter = 0;
    this.wallMs = options.startWallMs ?? 0;
    this.store = new DomainStore({
      worldId: WORLD,
      config: options.config,
      actors: options.actors ?? [ACTOR],
      wallClock: () => this.wallMs,
    });
  }

  get snapshot() {
    return this.store.snapshot;
  }

  actor(actorId: string = ACTOR) {
    const a = this.store.snapshot.actors[actorId];
    if (!a) throw new Error(`no actor ${actorId}`);
    return a;
  }

  /** Advance the fake wall clock without simulating. */
  advanceWall(ms: number): void {
    this.wallMs += ms;
  }

  /** Simulate `ms` of real time in fixed ~60 Hz frames, advancing wall time with it. */
  tickFor(ms: number, frameMs = 1000 / 60): TickResult {
    let left = ms;
    let last: TickResult = { steps: 0, simTimeMs: this.store.simTimeMs, droppedMs: 0, lagMs: 0, revision: this.store.revision };
    let guard = 0;
    while (left > 1e-9) {
      if (++guard > 2_000_000) throw new Error('tickFor guard');
      const dt = Math.min(frameMs, left);
      this.wallMs += dt;
      last = this.store.tick(dt);
      left -= dt;
    }
    return last;
  }

  dispatchFact(fact: EventEnvelope): DispatchResult {
    return this.store.dispatch({ kind: 'fact', fact });
  }

  dispatchCommand(command: Command): DispatchResult {
    return this.store.dispatch({ kind: 'command', command });
  }

  toolStarted(input: ToolStartInput): DispatchResult {
    const ev: ToolStartedEvent = {
      specVersion: '1.0',
      eventId: input.eventId ?? nextEventId('ts'),
      source: input.source ?? 'hermes:test',
      sourceEpoch: input.sourceEpoch ?? 'epoch-1',
      sequence: input.sequence ?? nextSequence(),
      worldId: WORLD,
      actorId: input.actorId ?? ACTOR,
      sessionId: input.sessionId,
      runId: input.runId,
      occurredAt: FIXED_TIME,
      type: 'tool.started',
      data: { toolCallId: input.toolCallId, activityClass: input.activityClass ?? 'coding' },
    };
    return this.dispatchFact(ev);
  }

  toolCompleted(input: ToolCompleteInput): DispatchResult {
    const ev: ToolCompletedEvent = {
      specVersion: '1.0',
      eventId: input.eventId ?? nextEventId('tc'),
      source: input.source ?? 'hermes:test',
      sourceEpoch: input.sourceEpoch ?? 'epoch-1',
      sequence: input.sequence ?? nextSequence(),
      worldId: WORLD,
      actorId: input.actorId ?? ACTOR,
      sessionId: input.sessionId,
      runId: input.runId,
      occurredAt: FIXED_TIME,
      type: 'tool.completed',
      data: { toolCallId: input.toolCallId, outcome: input.outcome ?? 'success' },
    };
    return this.dispatchFact(ev);
  }

  runStarted(input: { runId: string; actorId?: string; sessionId?: string; sourceEpoch?: string; eventId?: string; source?: string }): DispatchResult {
    const ev: RunStartedEvent = {
      specVersion: '1.0',
      eventId: input.eventId ?? nextEventId('rs'),
      source: input.source ?? 'hermes:test',
      sourceEpoch: input.sourceEpoch ?? 'epoch-1',
      sequence: nextSequence(),
      worldId: WORLD,
      actorId: input.actorId ?? ACTOR,
      sessionId: input.sessionId,
      runId: input.runId,
      occurredAt: FIXED_TIME,
      type: 'run.started',
      data: {},
    };
    return this.dispatchFact(ev);
  }

  runCompleted(input: { runId: string; actorId?: string; sessionId?: string; sourceEpoch?: string; outcome?: Outcome; source?: string }): DispatchResult {
    const ev: RunCompletedEvent = {
      specVersion: '1.0',
      eventId: nextEventId('rc'),
      source: input.source ?? 'hermes:test',
      sourceEpoch: input.sourceEpoch ?? 'epoch-1',
      sequence: nextSequence(),
      worldId: WORLD,
      actorId: input.actorId ?? ACTOR,
      sessionId: input.sessionId,
      runId: input.runId,
      occurredAt: FIXED_TIME,
      type: 'run.completed',
      data: { outcome: input.outcome ?? 'success' },
    };
    return this.dispatchFact(ev);
  }

  speechStarted(input: { speechId: string; actorId?: string; sessionId?: string }): DispatchResult {
    const ev: SpeechStartedEvent = {
      specVersion: '1.0',
      eventId: nextEventId('ss'),
      source: 'hermes:test',
      sourceEpoch: 'epoch-1',
      sequence: nextSequence(),
      worldId: WORLD,
      actorId: input.actorId ?? ACTOR,
      sessionId: input.sessionId,
      occurredAt: FIXED_TIME,
      type: 'speech.started',
      data: { speechId: input.speechId },
    };
    return this.dispatchFact(ev);
  }

  speechCompleted(input: { speechId: string; actorId?: string; sessionId?: string }): DispatchResult {
    const ev: SpeechCompletedEvent = {
      specVersion: '1.0',
      eventId: nextEventId('sc'),
      source: 'hermes:test',
      sourceEpoch: 'epoch-1',
      sequence: nextSequence(),
      worldId: WORLD,
      actorId: input.actorId ?? ACTOR,
      sessionId: input.sessionId,
      occurredAt: FIXED_TIME,
      type: 'speech.completed',
      data: { speechId: input.speechId },
    };
    return this.dispatchFact(ev);
  }

  heartbeat(
    input: { actorId?: string; status?: 'alive' | 'degraded'; sourceEpoch?: string; source?: string } = {},
  ): DispatchResult {
    return this.dispatchFact(this.heartbeatFact(nextEventId('hb'), input));
  }

  /** Raw heartbeat envelope builder, used by tests that need to replay an event id. */
  heartbeatFact(
    eventId: string,
    input: { actorId?: string; status?: 'alive' | 'degraded'; sourceEpoch?: string; source?: string } = {},
  ): PresenceHeartbeatEvent {
    return {
      specVersion: '1.0',
      eventId,
      source: input.source ?? 'hermes:test',
      sourceEpoch: input.sourceEpoch ?? 'epoch-1',
      sequence: nextSequence(),
      worldId: WORLD,
      actorId: input.actorId ?? ACTOR,
      occurredAt: FIXED_TIME,
      type: 'presence.heartbeat',
      data: { status: input.status ?? 'alive' },
    };
  }

  /**
   * Declares a new producer epoch. The domain refuses to infer epoch order from
   * arriving facts; the host/gateway that owns the durable log declares it.
   */
  sourceEpochAdopt(input: { epoch: string; source?: string; actorId?: string }): DispatchResult {
    return this.store.dispatch({
      kind: 'source.epoch.adopt',
      actorId: input.actorId ?? ACTOR,
      source: input.source ?? 'hermes:test',
      epoch: input.epoch,
    } as never);
  }

  goalRequest(input: {
    goal: CommandGoalId;
    commandId?: string;
    actorId?: string;
    priorityClass?: PriorityClass;
    ttlMs?: number;
    onConflict?: 'queue' | 'reject' | 'replace';
    constraints?: { capability?: string; interactionId?: string };
  }): DispatchResult {
    const cmd: GoalRequestCommand = {
      specVersion: '1.0',
      commandId: input.commandId ?? nextEventId('cmd'),
      worldId: WORLD,
      actorId: input.actorId ?? ACTOR,
      type: 'goal.request',
      goal: input.goal,
      ttlMs: input.ttlMs ?? 600_000,
      priorityClass: input.priorityClass ?? 'task',
      onConflict: input.onConflict ?? 'queue',
      constraints: input.constraints,
    };
    return this.dispatchCommand(cmd);
  }

  goalCancel(input: { targetCommandId: string; commandId?: string; actorId?: string; priorityClass?: PriorityClass }): DispatchResult {
    const cmd: GoalCancelCommand = {
      specVersion: '1.0',
      commandId: input.commandId ?? nextEventId('cancel'),
      worldId: WORLD,
      actorId: input.actorId ?? ACTOR,
      type: 'goal.cancel',
      targetCommandId: input.targetCommandId,
      ttlMs: 60_000,
      priorityClass: input.priorityClass ?? 'task',
      onConflict: 'replace',
    };
    return this.dispatchCommand(cmd);
  }

  manualAcquire(input: { ttlMs?: number; commandId?: string; actorId?: string } = {}): DispatchResult {
    const cmd: ManualAcquireCommand = {
      specVersion: '1.0',
      commandId: input.commandId ?? nextEventId('manual'),
      worldId: WORLD,
      actorId: input.actorId ?? ACTOR,
      type: 'manual.acquire',
      ttlMs: input.ttlMs ?? 60_000,
      priorityClass: 'manual',
      onConflict: 'replace',
    };
    return this.dispatchCommand(cmd);
  }

  manualRelease(input: { targetCommandId: string; commandId?: string; actorId?: string }): DispatchResult {
    const cmd: ManualReleaseCommand = {
      specVersion: '1.0',
      commandId: input.commandId ?? nextEventId('release'),
      worldId: WORLD,
      actorId: input.actorId ?? ACTOR,
      type: 'manual.release',
      targetCommandId: input.targetCommandId,
      priorityClass: 'manual',
      onConflict: 'replace',
    };
    return this.dispatchCommand(cmd);
  }

  worldPause(input: { reason?: string; actorId?: string } = {}): DispatchResult {
    const cmd: WorldPauseCommand = {
      specVersion: '1.0',
      commandId: nextEventId('pause'),
      worldId: WORLD,
      actorId: input.actorId ?? ACTOR,
      type: 'world.pause',
      reason: input.reason ?? 'test pause',
      priorityClass: 'manual',
      onConflict: 'replace',
    };
    return this.dispatchCommand(cmd);
  }

  worldResume(input: { actorId?: string } = {}): DispatchResult {
    const cmd: WorldResumeCommand = {
      specVersion: '1.0',
      commandId: nextEventId('resume'),
      worldId: WORLD,
      actorId: input.actorId ?? ACTOR,
      type: 'world.resume',
      priorityClass: 'manual',
      onConflict: 'replace',
    };
    return this.dispatchCommand(cmd);
  }

  commit(goalId: GoalId | null, reason = 'test exit complete'): DispatchResult {
    return this.store.dispatch({
      kind: 'goal.commit',
      actorId: ACTOR,
      goalId,
      reason,
      atRevision: this.store.snapshot.factsRevision,
    });
  }

  posture(posture: 'standing' | 'sitting' | 'lying', reason = 'test'): DispatchResult {
    return this.store.dispatch({ kind: 'posture.changed', actorId: ACTOR, posture, reason });
  }

  actionRequest(input: { goalId: CommandGoalId; actionId: string; actionKey: string; actorId?: string }): DispatchResult {
    return this.store.dispatch({
      kind: 'action.request',
      actorId: input.actorId ?? ACTOR,
      goalId: input.goalId,
      actionId: input.actionId,
      actionKey: input.actionKey,
    });
  }

  actionStarted(actionId: string, actorId: string = ACTOR): DispatchResult {
    return this.store.dispatch({ kind: 'action.started', actorId, actionId });
  }

  actionTerminal(actionId: string, outcome: Outcome = 'success', actorId: string = ACTOR): DispatchResult {
    return this.store.dispatch({ kind: 'action.terminal', actorId, actionId, outcome });
  }
}

export function workActive(h: Harness, actorId: string = ACTOR): boolean {
  return deriveActivity(h.actor(actorId)).work;
}

export function openActions(h: Harness, actorId: string = ACTOR) {
  return Object.values(h.actor(actorId).actions).filter((a) => a.phase !== 'terminal');
}
