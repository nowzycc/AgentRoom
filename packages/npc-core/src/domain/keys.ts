/**
 * Record keys. A tool/run/speech identity is only unique inside its producer
 * scope, so every key carries source + sourceEpoch + sessionId. Two sessions
 * (or two providers) using the same toolCallId must not collide.
 */
const SEP = '\u001f';

export function scopeKey(source: string, sourceEpoch: string, sessionId: string | null): string {
  return [source, sourceEpoch, sessionId ?? ''].join(SEP);
}

export function toolKey(source: string, epoch: string, sessionId: string | null, toolCallId: string): string {
  return scopeKey(source, epoch, sessionId) + SEP + toolCallId;
}

export function runKey(source: string, epoch: string, sessionId: string | null, runId: string): string {
  return scopeKey(source, epoch, sessionId) + SEP + runId;
}

export function speechKey(source: string, epoch: string, sessionId: string | null, speechId: string): string {
  return scopeKey(source, epoch, sessionId) + SEP + speechId;
}

/** Gateway-level fact dedupe identity (M0 spec §2). */
export function factDedupeKey(source: string, sourceEpoch: string, eventId: string): string {
  return [source, sourceEpoch, eventId].join(SEP);
}
