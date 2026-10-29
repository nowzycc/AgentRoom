import type {
  ActorState,
  DomainEvent,
  DomainState,
  Outcome,
  RecordPhase,
  ReduceOutcome,
  RunRecord,
  SourceState,
  SpeechRecord,
  TerminalReason,
  ToolRecord,
} from '../types.js';
import type { DomainConfig } from './config.js';
import { runKey, speechKey, toolKey } from './keys.js';
import { isPrunedTombstone } from './retention.js';
import { recordHeartbeat } from './presence.js';

type FactEvent = Extract<DomainEvent, { kind: 'fact' }>;

const MAX_RETIRED_EPOCHS = 16;

/**
 * Applies one wire fact. Facts are set-based: a record is created on start and
 * marked terminal on completion. A completion that arrives first leaves a
 * tombstone, so a later start can never revive the activity (M0 spec §2).
 */
export function applyFact(
  draft: DomainState,
  actor: ActorState,
  ev: FactEvent,
  _config: DomainConfig,
): ReduceOutcome {
  const fact = ev.fact;
  const sourceState = sourceForFact(actor, fact.source, fact.sourceEpoch);
  if (sourceState === 'undeclared') return { status: 'rejected', reason: 'EPOCH_NOT_DECLARED' };
  if (sourceState === 'retired') return { status: 'rejected', reason: 'STALE_EPOCH' };

  sourceState.eventCount += 1;
  if (fact.sequence < sourceState.lastSequence) sourceState.outOfOrderCount += 1;
  if (fact.sequence > sourceState.lastSequence) sourceState.lastSequence = fact.sequence;
  if (fact.type !== 'presence.heartbeat') {
    actor.presence = { ...actor.presence, samples: actor.presence.samples.map(sample =>
      sample.source === fact.source && sample.epoch === fact.sourceEpoch && sample.sessionId === (fact.sessionId ?? null)
        ? { ...sample, sequence: Math.max(sample.sequence, fact.sequence) } : sample) };
  }

  switch (fact.type) {
    case 'presence.heartbeat': {
      return recordHeartbeat(actor, fact, ev.wallMs);
    }

    case 'run.started': {
      if (!fact.runId) return { status: 'rejected', reason: 'MISSING_RUN_ID' };
      return startRun(actor, fact.source, fact.sourceEpoch, fact.sessionId ?? null, fact.runId, ev);
    }

    case 'run.completed': {
      if (!fact.runId) return { status: 'rejected', reason: 'MISSING_RUN_ID' };
      return completeRun(
        actor,
        fact.source,
        fact.sourceEpoch,
        fact.sessionId ?? null,
        fact.runId,
        fact.data.outcome,
        ev,
      );
    }

    case 'tool.started': {
      return startTool(
        actor,
        fact.source,
        fact.sourceEpoch,
        fact.sessionId ?? null,
        fact.data.toolCallId,
        fact.data.activityClass,
        ev,
      );
    }

    case 'tool.completed': {
      return completeTool(
        actor,
        fact.source,
        fact.sourceEpoch,
        fact.sessionId ?? null,
        fact.data.toolCallId,
        fact.data.outcome,
        ev,
      );
    }

    case 'speech.started': {
      return startSpeech(
        actor,
        fact.source,
        fact.sourceEpoch,
        fact.sessionId ?? null,
        fact.data.speechId,
        ev,
      );
    }

    case 'speech.completed': {
      return completeSpeech(
        actor,
        fact.source,
        fact.sourceEpoch,
        fact.sessionId ?? null,
        fact.data.speechId,
        ev,
      );
    }

    default: {
      return { status: 'rejected', reason: 'UNKNOWN_FACT_TYPE' };
    }
  }
}

function createSource(source: string, epoch: string): SourceState {
  return {
    source,
    epoch,
    lastSequence: -1,
    eventCount: 0,
    outOfOrderCount: 0,
    retiredEpochs: [],
  };
}

/**
 * Epoch ordering is not derived from facts. `occurredAt` is explicitly not an
 * ordering authority (M0 spec §3) and an unseen epoch can be an old delayed
 * event. Only an explicit `source.epoch.adopt` from the component that owns the
 * durable log may retire the current epoch.
 */
function sourceForFact(
  actor: ActorState,
  source: string,
  epoch: string,
): SourceState | 'undeclared' | 'retired' {
  const current = actor.sources[source];
  if (!current) {
    const created = createSource(source, epoch);
    actor.sources[source] = created;
    return created;
  }
  if (current.epoch === epoch) return current;
  if (current.retiredEpochs.includes(epoch)) return 'retired';
  return 'undeclared';
}

/** Explicit epoch adoption: retires the old epoch's in-flight records. */
export function adoptSourceEpoch(
  actor: ActorState,
  source: string,
  epoch: string,
  simMs: number,
  wallMs: number,
): ReduceOutcome {
  const current = actor.sources[source];
  if (!current) {
    actor.sources[source] = createSource(source, epoch);
    return { status: 'applied' };
  }
  if (current.epoch === epoch) return { status: 'noop', reason: 'ALREADY_CURRENT_EPOCH' };
  if (current.retiredEpochs.includes(epoch)) return { status: 'rejected', reason: 'EPOCH_RETIRED' };

  retireEpoch(actor, source, current.epoch, simMs, wallMs);
  current.retiredEpochs = [...current.retiredEpochs, current.epoch].slice(-MAX_RETIRED_EPOCHS);
  current.epoch = epoch;
  current.lastSequence = -1;
  return { status: 'applied' };
}

interface RetirableRecord {
  key: string;
  source: string;
  sourceEpoch: string;
  phase: RecordPhase;
  outcome: Outcome | null;
  reason: TerminalReason;
  endedSimMs: number | null;
  endedWallMs: number | null;
}

function retireRecords<T extends RetirableRecord>(
  records: Record<string, T>,
  source: string,
  epoch: string,
  simMs: number,
  wallMs: number,
): void {
  for (const [key, rec] of Object.entries(records) as Array<[string, T]>) {
    if (rec.source !== source || rec.sourceEpoch !== epoch || rec.phase !== 'active') continue;
    records[key] = {
      ...rec,
      phase: 'terminal',
      outcome: 'cancelled',
      reason: 'epoch_retired',
      endedSimMs: simMs,
      endedWallMs: wallMs,
    };
  }
}

function retireEpoch(
  actor: ActorState,
  source: string,
  epoch: string,
  simMs: number,
  wallMs: number,
): void {
  // Epoch ids are only unique per source (M0 spec §3), so never touch another
  // producer's records that happen to use the same epoch string.
  retireRecords(actor.tools, source, epoch, simMs, wallMs);
  retireRecords(actor.runs, source, epoch, simMs, wallMs);
  retireRecords(actor.speeches, source, epoch, simMs, wallMs);
}

interface ScopedRecord {
  key: string;
  source: string;
  sourceEpoch: string;
  sessionId: string | null;
  phase: RecordPhase;
}

type Lookup<T> =
  | { kind: 'found'; key: string; rec: T }
  | { kind: 'ambiguous' }
  | { kind: 'none' };

/**
 * Resolves a start/completion pair when the exact scoped key missed because the
 * optional `sessionId` is present on one side only. Two *different* explicit
 * sessions never match (isolation); an ambiguous match is refused rather than
 * guessed.
 */
function lookupCounterpart<T extends ScopedRecord>(
  records: Record<string, T>,
  source: string,
  epoch: string,
  idOf: (rec: T) => string,
  id: string,
  sessionId: string | null,
): Lookup<T> {
  let found: { key: string; rec: T } | null = null;
  for (const key in records) {
    const rec = records[key];
    if (!rec || rec.source !== source || rec.sourceEpoch !== epoch) continue;
    if (idOf(rec) !== id) continue;
    if (rec.sessionId !== null && sessionId !== null && rec.sessionId !== sessionId) continue;
    if (found) return { kind: 'ambiguous' };
    found = { key, rec };
  }
  return found ? { kind: 'found', ...found } : { kind: 'none' };
}

function lateStartOutcome(existing: { tombstoned: boolean }): ReduceOutcome {
  return {
    status: 'applied',
    reason: existing.tombstoned ? 'TOMBSTONED_START' : 'ALREADY_COMPLETED',
  };
}

/**
 * A completion may legitimately omit `sessionId` and resolve a single active
 * record, but it may never silently complete work that another explicit
 * session owns. Name that case instead of leaving a tombstone behind.
 */
function explicitSessionMismatch<T extends ScopedRecord>(
  records: Record<string, T>,
  source: string,
  epoch: string,
  idOf: (rec: T) => string,
  id: string,
  sessionId: string | null,
): boolean {
  if (sessionId === null) return false;
  for (const key in records) {
    const rec = records[key];
    if (!rec || rec.source !== source || rec.sourceEpoch !== epoch) continue;
    if (idOf(rec) !== id) continue;
    if (rec.phase !== 'active') continue;
    if (rec.sessionId !== null && rec.sessionId !== sessionId) return true;
  }
  return false;
}

function startTool(
  actor: ActorState,
  source: string,
  epoch: string,
  sessionId: string | null,
  toolCallId: string,
  activityClass: string,
  ev: FactEvent,
): ReduceOutcome {
  const key = toolKey(source, epoch, sessionId, toolCallId);
  const existing = actor.tools[key];
  if (existing) {
    if (existing.phase === 'terminal') {
      actor.counters.lateStartsIgnored += 1;
      return lateStartOutcome(existing);
    }
    return { status: 'noop', reason: 'ALREADY_ACTIVE' };
  }
  if (isPrunedTombstone(actor, key)) {
    actor.counters.lateStartsIgnored += 1;
    return { status: 'applied', reason: 'TOMBSTONED_START' };
  }
  const counterpart = lookupCounterpart(actor.tools, source, epoch, (rec) => rec.toolCallId, toolCallId, sessionId);
  if (counterpart.kind === 'ambiguous') return { status: 'rejected', reason: 'AMBIGUOUS_SESSION' };
  if (counterpart.kind === 'found') {
    if (counterpart.rec.phase === 'terminal') {
      actor.counters.lateStartsIgnored += 1;
      return lateStartOutcome(counterpart.rec);
    }
    return { status: 'noop', reason: 'ALREADY_ACTIVE' };
  }
  actor.tools[key] = {
    key,
    toolCallId,
    source,
    sourceEpoch: epoch,
    sessionId,
    activityClass,
    phase: 'active',
    outcome: null,
    reason: null,
    tombstoned: false,
    startedSimMs: ev.simMs,
    endedSimMs: null,
    startedWallMs: ev.wallMs,
    endedWallMs: null,
  };
  return { status: 'applied' };
}

function completeTool(
  actor: ActorState,
  source: string,
  epoch: string,
  sessionId: string | null,
  toolCallId: string,
  outcome: ToolRecord['outcome'],
  ev: FactEvent,
): ReduceOutcome {
  const key = toolKey(source, epoch, sessionId, toolCallId);
  const existing = actor.tools[key];
  if (existing) {
    if (existing.phase === 'terminal') return { status: 'noop', reason: 'ALREADY_TERMINAL' };
    actor.tools[key] = {
      ...existing,
      phase: 'terminal',
      outcome,
      reason: 'completed',
      endedSimMs: ev.simMs,
      endedWallMs: ev.wallMs,
    };
    return { status: 'applied' };
  }
  if (isPrunedTombstone(actor, key)) return { status: 'noop', reason: 'ALREADY_TERMINAL' };

  const counterpart = lookupCounterpart(actor.tools, source, epoch, (rec) => rec.toolCallId, toolCallId, sessionId);
  if (counterpart.kind === 'ambiguous') return { status: 'rejected', reason: 'AMBIGUOUS_SESSION' };
  if (counterpart.kind === 'found') {
    if (counterpart.rec.phase === 'terminal') return { status: 'noop', reason: 'ALREADY_TERMINAL' };
    actor.tools[counterpart.key] = {
      ...counterpart.rec,
      phase: 'terminal',
      outcome,
      reason: 'completed',
      endedSimMs: ev.simMs,
      endedWallMs: ev.wallMs,
    };
    return { status: 'applied' };
  }

  if (explicitSessionMismatch(actor.tools, source, epoch, (rec) => rec.toolCallId, toolCallId, sessionId)) {
    return { status: 'rejected', reason: 'SESSION_MISMATCH' };
  }

  actor.tools[key] = {
    key,
    toolCallId,
    source,
    sourceEpoch: epoch,
    sessionId,
    activityClass: 'unknown',
    phase: 'terminal',
    outcome,
    reason: 'completed_before_start',
    tombstoned: true,
    startedSimMs: null,
    endedSimMs: ev.simMs,
    startedWallMs: null,
    endedWallMs: ev.wallMs,
  };
  return { status: 'applied' };
}

function startRun(
  actor: ActorState,
  source: string,
  epoch: string,
  sessionId: string | null,
  runId: string,
  ev: FactEvent,
): ReduceOutcome {
  const key = runKey(source, epoch, sessionId, runId);
  const existing = actor.runs[key];
  if (existing) {
    if (existing.phase === 'terminal') {
      actor.counters.lateStartsIgnored += 1;
      return lateStartOutcome(existing);
    }
    return { status: 'noop', reason: 'ALREADY_ACTIVE' };
  }
  if (isPrunedTombstone(actor, key)) {
    actor.counters.lateStartsIgnored += 1;
    return { status: 'applied', reason: 'TOMBSTONED_START' };
  }
  const counterpart = lookupCounterpart(actor.runs, source, epoch, (rec) => rec.runId, runId, sessionId);
  if (counterpart.kind === 'ambiguous') return { status: 'rejected', reason: 'AMBIGUOUS_SESSION' };
  if (counterpart.kind === 'found') {
    if (counterpart.rec.phase === 'terminal') {
      actor.counters.lateStartsIgnored += 1;
      return lateStartOutcome(counterpart.rec);
    }
    return { status: 'noop', reason: 'ALREADY_ACTIVE' };
  }
  actor.runs[key] = {
    key,
    runId,
    source,
    sourceEpoch: epoch,
    sessionId,
    phase: 'active',
    outcome: null,
    reason: null,
    tombstoned: false,
    startedSimMs: ev.simMs,
    endedSimMs: null,
    startedWallMs: ev.wallMs,
    endedWallMs: null,
  };
  return { status: 'applied' };
}

function completeRun(
  actor: ActorState,
  source: string,
  epoch: string,
  sessionId: string | null,
  runId: string,
  outcome: RunRecord['outcome'],
  ev: FactEvent,
): ReduceOutcome {
  const key = runKey(source, epoch, sessionId, runId);
  const existing = actor.runs[key];
  if (existing) {
    if (existing.phase === 'terminal') return { status: 'noop', reason: 'ALREADY_TERMINAL' };
    actor.runs[key] = {
      ...existing,
      phase: 'terminal',
      outcome,
      reason: 'completed',
      endedSimMs: ev.simMs,
      endedWallMs: ev.wallMs,
    };
    return { status: 'applied' };
  }
  if (isPrunedTombstone(actor, key)) return { status: 'noop', reason: 'ALREADY_TERMINAL' };

  const counterpart = lookupCounterpart(actor.runs, source, epoch, (rec) => rec.runId, runId, sessionId);
  if (counterpart.kind === 'ambiguous') return { status: 'rejected', reason: 'AMBIGUOUS_SESSION' };
  if (counterpart.kind === 'found') {
    if (counterpart.rec.phase === 'terminal') return { status: 'noop', reason: 'ALREADY_TERMINAL' };
    actor.runs[counterpart.key] = {
      ...counterpart.rec,
      phase: 'terminal',
      outcome,
      reason: 'completed',
      endedSimMs: ev.simMs,
      endedWallMs: ev.wallMs,
    };
    return { status: 'applied' };
  }

  if (explicitSessionMismatch(actor.runs, source, epoch, (rec) => rec.runId, runId, sessionId)) {
    return { status: 'rejected', reason: 'SESSION_MISMATCH' };
  }

  actor.runs[key] = {
    key,
    runId,
    source,
    sourceEpoch: epoch,
    sessionId,
    phase: 'terminal',
    outcome,
    reason: 'completed_before_start',
    tombstoned: true,
    startedSimMs: null,
    endedSimMs: ev.simMs,
    startedWallMs: null,
    endedWallMs: ev.wallMs,
  };
  return { status: 'applied' };
}

function startSpeech(
  actor: ActorState,
  source: string,
  epoch: string,
  sessionId: string | null,
  speechId: string,
  ev: FactEvent,
): ReduceOutcome {
  const key = speechKey(source, epoch, sessionId, speechId);
  const existing = actor.speeches[key];
  if (existing) {
    if (existing.phase === 'terminal') {
      actor.counters.lateStartsIgnored += 1;
      return lateStartOutcome(existing);
    }
    return { status: 'noop', reason: 'ALREADY_ACTIVE' };
  }
  if (isPrunedTombstone(actor, key)) {
    actor.counters.lateStartsIgnored += 1;
    return { status: 'applied', reason: 'TOMBSTONED_START' };
  }
  const counterpart = lookupCounterpart(actor.speeches, source, epoch, (rec) => rec.speechId, speechId, sessionId);
  if (counterpart.kind === 'ambiguous') return { status: 'rejected', reason: 'AMBIGUOUS_SESSION' };
  if (counterpart.kind === 'found') {
    if (counterpart.rec.phase === 'terminal') {
      actor.counters.lateStartsIgnored += 1;
      return lateStartOutcome(counterpart.rec);
    }
    return { status: 'noop', reason: 'ALREADY_ACTIVE' };
  }
  actor.speeches[key] = {
    key,
    speechId,
    source,
    sourceEpoch: epoch,
    sessionId,
    phase: 'active',
    outcome: null,
    reason: null,
    tombstoned: false,
    startedSimMs: ev.simMs,
    endedSimMs: null,
    startedWallMs: ev.wallMs,
    endedWallMs: null,
  };
  return { status: 'applied' };
}

function completeSpeech(
  actor: ActorState,
  source: string,
  epoch: string,
  sessionId: string | null,
  speechId: string,
  ev: FactEvent,
): ReduceOutcome {
  const key = speechKey(source, epoch, sessionId, speechId);
  const existing = actor.speeches[key];
  if (existing) {
    if (existing.phase === 'terminal') return { status: 'noop', reason: 'ALREADY_TERMINAL' };
    actor.speeches[key] = {
      ...existing,
      phase: 'terminal',
      outcome: 'success',
      reason: 'completed',
      endedSimMs: ev.simMs,
      endedWallMs: ev.wallMs,
    };
    return { status: 'applied' };
  }
  if (isPrunedTombstone(actor, key)) return { status: 'noop', reason: 'ALREADY_TERMINAL' };

  const counterpart = lookupCounterpart(actor.speeches, source, epoch, (rec) => rec.speechId, speechId, sessionId);
  if (counterpart.kind === 'ambiguous') return { status: 'rejected', reason: 'AMBIGUOUS_SESSION' };
  if (counterpart.kind === 'found') {
    if (counterpart.rec.phase === 'terminal') return { status: 'noop', reason: 'ALREADY_TERMINAL' };
    actor.speeches[counterpart.key] = {
      ...counterpart.rec,
      phase: 'terminal',
      outcome: 'success',
      reason: 'completed',
      endedSimMs: ev.simMs,
      endedWallMs: ev.wallMs,
    };
    return { status: 'applied' };
  }

  if (explicitSessionMismatch(actor.speeches, source, epoch, (rec) => rec.speechId, speechId, sessionId)) {
    return { status: 'rejected', reason: 'SESSION_MISMATCH' };
  }

  actor.speeches[key] = {
    key,
    speechId,
    source,
    sourceEpoch: epoch,
    sessionId,
    phase: 'terminal',
    outcome: 'success',
    reason: 'completed_before_start',
    tombstoned: true,
    startedSimMs: null,
    endedSimMs: ev.simMs,
    startedWallMs: null,
    endedWallMs: ev.wallMs,
  };
  return { status: 'applied' };
}
