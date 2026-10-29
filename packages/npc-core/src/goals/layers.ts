import type { GoalId, LayerId } from '../types.js';

export const LAYER_RANK: Record<LayerId, number> = Object.freeze({
  safety: 4,
  manual: 3,
  task: 2,
  autonomy: 1,
});

export const LAYER_ORDER: LayerId[] = ['autonomy', 'task', 'manual', 'safety'];

export function layerRank(layer: LayerId): number {
  return LAYER_RANK[layer];
}

export function isHigherLayer(a: LayerId, b: LayerId): boolean {
  return LAYER_RANK[a] > LAYER_RANK[b];
}

/** Task-layer score per goal; safety/manual/autonomy scores live in the arbiter. */
export const GOAL_SCORES: Record<GoalId, number> = Object.freeze({
  work: 0.7,
  think: 0.68,
  converse: 0.65,
  rest: 0.4,
  idle: 0.5,
  lookAround: 0.7,
  sleep: 0.3,
  // Manual appliance goals. They sit just under `work` so an operator request
  // wins over autonomy but does not preempt an active work activity by score
  // alone (the command's `replace` flag is what preempts).
  lampOn: 0.66,
  lampOff: 0.66,
  // Operator-requested standing door operation.
  fridgeOpen: 0.66,
});
