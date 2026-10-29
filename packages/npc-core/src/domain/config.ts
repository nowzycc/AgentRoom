/**
 * Domain configuration. Kept inside `DomainState` so a replay is
 * self-contained and does not depend on the live config object.
 */
export type AutonomyGoalId = 'idle' | 'lookAround' | 'rest';

export interface DomainConfig {
  worldId: string;
  /** Idle cooldown after work ends, in simulation ms. */
  idleCooldownMs: number;
  /** Presence is stale after this much wall time without a heartbeat. */
  heartbeatStaleAfterMs: number;
  /** Minimum time a goal stays active before a same-layer preemption is allowed. */
  minDwellMs: number;
  /** Score margin required to preempt at the same layer without `replace`. */
  hysteresisScore: number;
  /** How long the actor must be idle before `lookAround` becomes a candidate. */
  autonomyIntervalMs: number;
  autonomyScores: { idle: number; lookAround: number; rest: number };
  enabledAutonomyGoals: AutonomyGoalId[];
  allowSleep: boolean;
  requireLivenessForAutonomy: boolean;
  maxActionHistory: number;
  /** Open (pending/running) action intents allowed at once; the ledger cap. */
  maxOpenActions: number;
  maxGoalHistory: number;
  /** Largest number of registered actors; unknown ids beyond it are rejected. */
  maxActors: number;
  /** Terminal tool/run/speech records kept per (source, epoch, session). */
  maxTerminalRecordsPerScope: number;
  /** Terminal records older than this (simulation ms) are pruned. */
  terminalRecordRetentionMs: number;
  /** Pruned-record ids kept so a late start cannot revive them (simulation ms). */
  tombstoneRetentionMs: number;
  maxTombstoneRecords: number;
  /** Terminal (expired/cancelled/completed) command records retained. */
  maxCommandRecords: number;
  /** Terminal command records older than this (wall ms) are pruned. */
  commandRetentionMs: number;
  /** Facts remembered for duplicate-id rejection; a rolling window, not the durable log. */
  factDedupeLimit: number;
  /** Bounded diagnostic/replay buffer; the gateway log is the durable record (M5). */
  eventHistoryLimit: number;
}

export type DomainConfigInput = Partial<Omit<DomainConfig, 'worldId' | 'autonomyScores'>> & {
  autonomyScores?: Partial<DomainConfig['autonomyScores']>;
};

export const DEFAULT_AUTONOMY_GOALS: AutonomyGoalId[] = ['idle', 'lookAround'];

export function resolveConfig(worldId: string, input: DomainConfigInput = {}): DomainConfig {
  const config: DomainConfig = {
    worldId,
    idleCooldownMs: input.idleCooldownMs ?? 30_000,
    heartbeatStaleAfterMs: input.heartbeatStaleAfterMs ?? 8_000,
    minDwellMs: input.minDwellMs ?? 10_000,
    hysteresisScore: input.hysteresisScore ?? 0.15,
    autonomyIntervalMs: input.autonomyIntervalMs ?? 120_000,
    autonomyScores: {
      idle: input.autonomyScores?.idle ?? 0.5,
      lookAround: input.autonomyScores?.lookAround ?? 0.7,
      rest: input.autonomyScores?.rest ?? 0.35,
    },
    enabledAutonomyGoals: [...(input.enabledAutonomyGoals ?? DEFAULT_AUTONOMY_GOALS)],
    allowSleep: input.allowSleep ?? false,
    requireLivenessForAutonomy: input.requireLivenessForAutonomy ?? true,
    maxActionHistory: input.maxActionHistory ?? 64,
    maxOpenActions: input.maxOpenActions ?? 4,
    maxGoalHistory: input.maxGoalHistory ?? 32,
    maxActors: input.maxActors ?? 16,
    maxTerminalRecordsPerScope: input.maxTerminalRecordsPerScope ?? 512,
    terminalRecordRetentionMs: input.terminalRecordRetentionMs ?? 300_000,
    tombstoneRetentionMs: input.tombstoneRetentionMs ?? 900_000,
    maxTombstoneRecords: input.maxTombstoneRecords ?? 1_024,
    maxCommandRecords: input.maxCommandRecords ?? 256,
    commandRetentionMs: input.commandRetentionMs ?? 600_000,
    factDedupeLimit: input.factDedupeLimit ?? 8_192,
    eventHistoryLimit: input.eventHistoryLimit ?? 20_000,
  };

  if (config.idleCooldownMs < 0) throw new Error('idleCooldownMs must be >= 0');
  if (config.minDwellMs < 0) throw new Error('minDwellMs must be >= 0');
  if (config.hysteresisScore < 0) throw new Error('hysteresisScore must be >= 0');
  if (config.heartbeatStaleAfterMs <= 0) throw new Error('heartbeatStaleAfterMs must be > 0');
  if (config.autonomyIntervalMs < 0) throw new Error('autonomyIntervalMs must be >= 0');
  if (config.eventHistoryLimit < 1) throw new Error('eventHistoryLimit must be >= 1');
  if (config.maxGoalHistory < 1 || config.maxActionHistory < 1) throw new Error('history limits must be >= 1');
  if (!Number.isInteger(config.maxOpenActions) || config.maxOpenActions < 1) {
    throw new Error('maxOpenActions must be an integer >= 1');
  }
  if (!Number.isInteger(config.maxActors) || config.maxActors < 1) throw new Error('maxActors must be an integer >= 1');
  if (!Number.isInteger(config.maxTerminalRecordsPerScope) || config.maxTerminalRecordsPerScope < 1) {
    throw new Error('maxTerminalRecordsPerScope must be an integer >= 1');
  }
  if (config.terminalRecordRetentionMs < 0) throw new Error('terminalRecordRetentionMs must be >= 0');
  if (config.tombstoneRetentionMs < config.terminalRecordRetentionMs) {
    throw new Error('tombstoneRetentionMs must be >= terminalRecordRetentionMs');
  }
  if (!Number.isInteger(config.maxTombstoneRecords) || config.maxTombstoneRecords < 1) {
    throw new Error('maxTombstoneRecords must be an integer >= 1');
  }
  if (!Number.isInteger(config.maxCommandRecords) || config.maxCommandRecords < 1) {
    throw new Error('maxCommandRecords must be an integer >= 1');
  }
  if (config.commandRetentionMs < 0) throw new Error('commandRetentionMs must be >= 0');
  if (!Number.isInteger(config.factDedupeLimit) || config.factDedupeLimit < 1) {
    throw new Error('factDedupeLimit must be an integer >= 1');
  }
  if (config.allowSleep) {
    throw new Error('sleep is not implemented in v1; allowSleep must stay false');
  }
  return config;
}
