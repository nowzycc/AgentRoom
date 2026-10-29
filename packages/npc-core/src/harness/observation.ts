import type { DomainStore } from '../domain/store.js';
import type { HarnessPolicy, HarnessState } from './policy.js';

export interface HarnessObservation {
  readonly state: HarnessState;
  readonly activeTools: number;
  readonly activeRuns: number;
  readonly receivedAtWallMs: number | null;
  readonly reason: string;
}

/** Read the existing scoped sets. No event, command or physical-state ledger. */
export function observeHarness(store: DomainStore, policy: HarnessPolicy): HarnessObservation {
  const state = store.snapshot;
  const actor = state.actors[policy.observerId];
  const epoch = actor?.sources[policy.source]?.epoch;
  const scoped = (record: { source: string; sourceEpoch: string; sessionId: string | null }) =>
    record.source === policy.source && record.sourceEpoch === epoch && record.sessionId === policy.sessionId;
  const tools = Object.values(actor?.tools ?? {}).filter(scoped);
  const runs = Object.values(actor?.runs ?? {}).filter(scoped);
  const activeTools = tools.filter(t => t.phase === 'active').length;
  const activeRuns = runs.filter(r => r.phase === 'active').length;
  const heartbeat = actor?.presence.samples.find(sample =>
    sample.source === policy.source && sample.epoch === epoch && sample.sessionId === policy.sessionId);
  const receivedAtWallMs = heartbeat?.receivedAtWallMs ?? null;
  const base = { activeTools, activeRuns, receivedAtWallMs };
  if (receivedAtWallMs === null) return { ...base, state: 'unknown', reason: 'NO_HEARTBEAT' };
  if (state.wallTimeMs - receivedAtWallMs >= policy.heartbeatStaleAfterMs || heartbeat?.status !== 'alive') {
    return { ...base, state: 'disconnected', reason: 'HEARTBEAT_STALE_OR_DEGRADED' };
  }
  if (activeTools > 0) return { ...base, state: 'working', reason: 'ACTIVE_TOOL_SET' };
  if (activeRuns > 0) return { ...base, state: 'waiting', reason: 'RUN_WITHOUT_ACTIVE_TOOLS' };
  const terminal = [...tools, ...runs].filter(t => t.phase === 'terminal')
    .sort((a, b) => (b.endedWallMs ?? 0) - (a.endedWallMs ?? 0));
  if (terminal[0]?.outcome === 'failed' && terminal[0].reason === 'completed' &&
      state.wallTimeMs - (terminal[0].endedWallMs ?? 0) < policy.failureVisibleForMs) return { ...base, state: 'error', reason: 'LAST_TERMINAL_FAILED' };
  return { ...base, state: 'idle', reason: 'NO_ACTIVE_ACTIVITY' };
}
