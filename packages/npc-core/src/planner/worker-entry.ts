/**
 * Worker entry for the planner. It imports no Node or DOM APIs: the same
 * bundle runs inside `node:worker_threads` (through the test adapter) and in a
 * browser Worker (M4), where the scope wiring below installs itself.
 */
import { GOAP_CORE, planWithGoap, validatePlanInput } from './goap-core.js';
import type { PlanRequest, PlanResponse } from './types.js';

export function handlePlanRequest(request: PlanRequest): PlanResponse {
  const base = {
    planId: request?.planId ?? '',
    actorId: request?.actorId ?? '',
    goalId: request?.goalId ?? ('idle' as PlanResponse['goalId']),
    revision: request?.revision ?? -1,
    core: GOAP_CORE,
  };
  try {
    validatePlanInput({ facts: request.facts, conditions: request.conditions, actions: request.actions });
    const result = planWithGoap({
      facts: request.facts,
      conditions: request.conditions,
      actions: request.actions,
    });
    return {
      ...base,
      status: result.status,
      actions: result.actions,
      cost: result.cost,
      predicted: result.predicted,
    };
  } catch (error) {
    return {
      ...base,
      status: 'error',
      actions: [],
      cost: 0,
      predicted: {},
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

interface WorkerScope {
  addEventListener?: (type: string, listener: (event: { data: unknown }) => void) => void;
  postMessage?: (message: unknown) => void;
  document?: unknown;
}

const scope = globalThis as unknown as WorkerScope;
if (typeof scope.addEventListener === 'function' && typeof scope.postMessage === 'function' && scope.document === undefined) {
  scope.addEventListener('message', (event) => {
    scope.postMessage?.(handlePlanRequest(event.data as PlanRequest));
  });
}
