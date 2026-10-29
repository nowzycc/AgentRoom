/**
 * Fallback reactive planner (behaviour-tree style, no search) behind the same
 * PlannerPort. It exists only for a degraded mode where the GOAP worker cannot
 * be used; the selected planning core remains goap-minimal. It is intentionally
 * greedy and bounded: one applicable action with the largest goal progress per
 * cost, at most `maxDepth` steps, no backtracking. It never claims success for
 * an unsatisfied goal.
 */
import { applyEffects, countUnsatisfied, satisfies } from '../goap-core.js';
import type { ActionPlanSpec, FactSet, PlanRequest, PlanResponse, PlannerPort } from '../types.js';

export const REACTIVE_CORE = 'reactive-bt';

export interface ReactivePlannerOptions {
  maxDepth?: number;
}

export class ReactivePlanner implements PlannerPort {
  readonly name = 'reactive-bt';
  private readonly maxDepth: number;

  constructor(options: ReactivePlannerOptions = {}) {
    this.maxDepth = Math.max(1, options.maxDepth ?? 8);
  }

  async plan(request: PlanRequest): Promise<PlanResponse> {
    const base = {
      planId: request.planId,
      actorId: request.actorId,
      goalId: request.goalId,
      revision: request.revision,
      core: REACTIVE_CORE,
    };
    let facts: FactSet = { ...request.facts };
    if (satisfies(facts, request.conditions)) {
      return { ...base, status: 'satisfied', actions: [], cost: 0, predicted: facts };
    }

    const actions: string[] = [];
    let cost = 0;
    for (let depth = 0; depth < this.maxDepth; depth += 1) {
      let best: { spec: ActionPlanSpec; next: FactSet; score: number } | null = null;
      const unsatisfied = countUnsatisfied(facts, request.conditions);
      for (const spec of request.actions) {
        if (!satisfies(facts, spec.preconditions)) continue;
        const next = applyEffects(facts, spec.effects);
        const gain = unsatisfied - countUnsatisfied(next, request.conditions);
        if (gain <= 0) continue;
        const score = gain / Math.max(spec.cost, 1e-6);
        if (!best || score > best.score) best = { spec, next, score };
      }
      if (!best) return { ...base, status: 'no-plan', actions: [], cost: 0, predicted: facts };
      actions.push(best.spec.key);
      cost += best.spec.cost;
      facts = best.next;
      if (satisfies(facts, request.conditions)) {
        return { ...base, status: 'ok', actions, cost, predicted: facts };
      }
    }
    return { ...base, status: 'no-plan', actions: [], cost: 0, predicted: { ...request.facts } };
  }

  terminate(): void {
    // Synchronous and stateless: nothing to terminate.
  }
}
