/**
 * Bounded retention for terminal records.
 *
 * Records are the audit trail of what a producer did, not an unbounded history:
 * the durable log is M5. What the domain still needs after a record is pruned:
 *  - activity/idle derives only from *active* records, so pruning terminal ones
 *    cannot change work;
 *  - a pruned completion leaves a tombstone id so a late start cannot revive it;
 *  - command records only matter while active (TTL/cancel/arbitration).
 *
 * Tombstones are bounded by count (oldest insertion evicted) and swept by
 * simulation age at most once every 30 s. A late start older than both windows
 * is outside the domain guarantee; M5's durable log owns that boundary.
 */
import type { ActorState, RunRecord, SpeechRecord, ToolRecord } from '../types.js';
import type { DomainConfig } from './config.js';
import { copyIdMap, deleteId, hasId, readId, writeId } from './idmap.js';
import { scopeKey } from './keys.js';

interface RetainableRecord {
  key: string;
  source: string;
  sourceEpoch: string;
  sessionId: string | null;
  phase: 'active' | 'terminal';
  endedSimMs: number | null;
}

interface ScopeStat {
  count: number;
  oldestKey: string;
  oldestAt: number;
  oldKeys: string[] | null;
}

const TOMBSTONE_SWEEP_MS = 30_000;
const BATCH_THRESHOLD = 8;

function mutableTombstoneMaps(actor: ActorState): void {
  if (Object.isFrozen(actor.tombstones)) {
    actor.tombstones = copyIdMap(actor.tombstones);
    actor.tombstoneOrder = [...actor.tombstoneOrder];
  }
}

function addTombstone(actor: ActorState, key: string, at: number, config: DomainConfig): void {
  if (hasId(actor.tombstones, key)) return;
  mutableTombstoneMaps(actor);
  writeId(actor.tombstones, key, at);
  actor.tombstoneOrder.push(key);
  while (actor.tombstoneOrder.length > config.maxTombstoneRecords) {
    const oldest = actor.tombstoneOrder.shift();
    if (oldest === undefined) break;
    deleteId(actor.tombstones, oldest);
  }
}

function retainMap<T extends RetainableRecord>(
  records: Record<string, T>,
  actor: ActorState,
  config: DomainConfig,
  nowSimMs: number,
): void {
  const cutoff = nowSimMs - config.terminalRecordRetentionMs;
  const scopes = new Map<string, ScopeStat>();

  for (const key of Object.keys(records)) {
    const rec = readId(records, key);
    if (!rec || rec.phase !== 'terminal') continue;
    const scope = scopeKey(rec.source, rec.sourceEpoch, rec.sessionId);
    const ended = rec.endedSimMs ?? nowSimMs;
    const stat = scopes.get(scope);
    if (stat) {
      stat.count += 1;
      if (ended < stat.oldestAt) {
        stat.oldestAt = ended;
        stat.oldestKey = key;
      }
      if (ended < cutoff) (stat.oldKeys ??= []).push(key);
    } else {
      scopes.set(scope, {
        count: 1,
        oldestKey: key,
        oldestAt: ended,
        oldKeys: ended < cutoff ? [key] : null,
      });
    }
  }

  for (const [scope, stat] of scopes) {
    let remaining = stat.count;
    if (stat.oldKeys) {
      for (const key of stat.oldKeys) {
        const rec = readId(records, key);
        if (!rec) continue;
        addTombstone(actor, key, rec.endedSimMs ?? nowSimMs, config);
        deleteId(records, key);
        remaining -= 1;
      }
    }
    if (remaining <= config.maxTerminalRecordsPerScope) continue;

    const excess = remaining - config.maxTerminalRecordsPerScope;
    if (excess > BATCH_THRESHOLD) {
      const entries: Array<{ key: string; endedAt: number }> = [];
      for (const key of Object.keys(records)) {
        const rec = readId(records, key);
        if (!rec || rec.phase !== 'terminal') continue;
        if (scopeKey(rec.source, rec.sourceEpoch, rec.sessionId) !== scope) continue;
        entries.push({ key, endedAt: rec.endedSimMs ?? nowSimMs });
      }
      entries.sort((a, b) => a.endedAt - b.endedAt);
      for (const entry of entries.slice(0, excess)) {
        addTombstone(actor, entry.key, entry.endedAt, config);
        deleteId(records, entry.key);
      }
      continue;
    }

    for (let i = 0; i < excess; i += 1) {
      let oldestKey: string | null = null;
      let oldestAt = Number.POSITIVE_INFINITY;
      for (const key of Object.keys(records)) {
        const rec = readId(records, key);
        if (!rec || rec.phase !== 'terminal') continue;
        if (scopeKey(rec.source, rec.sourceEpoch, rec.sessionId) !== scope) continue;
        const ended = rec.endedSimMs ?? nowSimMs;
        if (ended < oldestAt) {
          oldestAt = ended;
          oldestKey = key;
        }
      }
      if (oldestKey === null) break;
      addTombstone(actor, oldestKey, oldestAt, config);
      deleteId(records, oldestKey);
    }
  }
}

export function pruneToolRecords(actor: ActorState, config: DomainConfig, nowSimMs: number): void {
  retainMap<ToolRecord>(actor.tools, actor, config, nowSimMs);
}

export function pruneRunRecords(actor: ActorState, config: DomainConfig, nowSimMs: number): void {
  retainMap<RunRecord>(actor.runs, actor, config, nowSimMs);
}

export function pruneSpeechRecords(actor: ActorState, config: DomainConfig, nowSimMs: number): void {
  retainMap<SpeechRecord>(actor.speeches, actor, config, nowSimMs);
}

/** Time-based tombstone sweep, throttled: count overflow is handled on insert. */
export function sweepTombstones(actor: ActorState, config: DomainConfig, nowSimMs: number): void {
  if (nowSimMs - actor.tombstoneSweptSimMs < TOMBSTONE_SWEEP_MS) return;
  actor.tombstoneSweptSimMs = nowSimMs;
  const cutoff = nowSimMs - config.tombstoneRetentionMs;
  let changed = false;
  const keep: string[] = [];
  for (const key of actor.tombstoneOrder) {
    const at = readId(actor.tombstones, key);
    if (at === undefined) continue;
    if (at < cutoff) {
      changed = true;
      continue;
    }
    keep.push(key);
  }
  if (!changed) return;
  mutableTombstoneMaps(actor);
  const kept = new Set(keep);
  for (const key of Object.keys(actor.tombstones)) {
    if (!kept.has(key)) deleteId(actor.tombstones, key);
  }
  actor.tombstoneOrder = keep;
}

/** Terminal commands are kept for diagnostics/TTL audit, bounded by count and age. */
export function pruneCommandRecords(actor: ActorState, config: DomainConfig, nowWallMs: number): void {
  const cutoff = nowWallMs - config.commandRetentionMs;
  const terminal: Array<{ id: string; at: number }> = [];
  for (const [id, cmd] of Object.entries(actor.commands)) {
    if (cmd.status === 'active') continue;
    terminal.push({ id, at: cmd.expiresAtWallMs ?? cmd.receivedAtWallMs });
  }
  if (terminal.length === 0) return;
  const hasOld = terminal.some((entry) => entry.at < cutoff);
  if (!hasOld && terminal.length <= config.maxCommandRecords) return;

  terminal.sort((a, b) => a.at - b.at);
  let remaining = terminal.length;
  for (const entry of terminal) {
    if (entry.at < cutoff || remaining > config.maxCommandRecords) {
      deleteId(actor.commands, entry.id);
      remaining -= 1;
    }
  }
}

export function isPrunedTombstone(actor: ActorState, key: string): boolean {
  return hasId(actor.tombstones, key);
}
