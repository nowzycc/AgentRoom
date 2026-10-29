import type { ActorState } from '../types.js';

export interface ActivityDerivation {
  work: boolean;
  speech: boolean;
  activeToolKeys: string[];
  activeRunKeys: string[];
  activeSpeechKeys: string[];
}

/**
 * Activity is derived from record phases, never from ++/-- counters. A missed
 * or duplicated completion therefore cannot desynchronise it: either a record
 * is active or it is not.
 */
export function deriveActivity(actor: ActorState): ActivityDerivation {
  const activeToolKeys = Object.values(actor.tools)
    .filter((t) => t.phase === 'active')
    .map((t) => t.key);
  const activeRunKeys = Object.values(actor.runs)
    .filter((r) => r.phase === 'active')
    .map((r) => r.key);
  const activeSpeechKeys = Object.values(actor.speeches)
    .filter((s) => s.phase === 'active')
    .map((s) => s.key);
  return {
    work: activeToolKeys.length > 0 || activeRunKeys.length > 0,
    speech: activeSpeechKeys.length > 0,
    activeToolKeys,
    activeRunKeys,
    activeSpeechKeys,
  };
}
