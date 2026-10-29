import type { SingleActionRequest } from '../../../../packages/npc-core/src/runtime/single-action.js';

// The shared wire schema is integer milliseconds; keep internal fixed-step precision.
export const reportTimeMs = (value: number | null): number | null => value === null ? null : Math.floor(value);

export function runtimeRequest(op: { readonly commandId: string; readonly actionKey: string; readonly issuedAtWallMs: number; readonly ttlMs: number }, nowUnixMs: number, nowRuntimeMs: number): SingleActionRequest {
  if (op.issuedAtWallMs > nowUnixMs || !Number.isSafeInteger(op.issuedAtWallMs + op.ttlMs)) throw new Error('INVALID_ACTION_TIME');
  if (op.issuedAtWallMs + op.ttlMs <= nowUnixMs) throw new Error('TTL_EXPIRED');
  // Translate the origin once; retain elapsed transport age and the original TTL.
  // The reused scene injects a relative clock, not Unix time.
  return { requestId: op.commandId, actionKey: op.actionKey, issuedAtWallMs: nowRuntimeMs - (nowUnixMs - op.issuedAtWallMs), ttlMs: op.ttlMs };
}
