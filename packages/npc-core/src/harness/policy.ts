export type HarnessState = 'unknown' | 'disconnected' | 'working' | 'waiting' | 'idle' | 'error';
export type HarnessGoal = 'work' | 'think' | 'converse' | 'idle' | 'rest' | 'lookAround';
export interface HarnessPolicy {
  readonly source: string;
  readonly sessionId: string;
  readonly observerId: string;
  readonly actorId: string;
  readonly heartbeatStaleAfterMs: number;
  readonly failureVisibleForMs: number;
  readonly goalTtlMs: number;
  readonly manualTtlMs: number;
  readonly standingPlaceholder?: { readonly originalGoal: HarnessGoal; readonly reason: string };
  readonly goals: Readonly<Record<HarnessState, HarnessGoal | null>>;
}
