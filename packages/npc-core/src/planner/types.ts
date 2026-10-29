/**
 * Planner boundary (M2). A plan is a prediction: it names action keys and the
 * facts those actions are predicted to produce. Nothing here mutates domain
 * state; effects are committed only after the executor confirms the motion.
 */
import type { GoalId } from '@npc/contracts';

export type FactValue = boolean | number;
export type NumericComparison = {
  eq?: number;
  gte?: number;
  lte?: number;
  gt?: number;
  lt?: number;
};
export type FactCondition = FactValue | NumericComparison;
export type FactEffect = FactValue | { inc: number };
export type FactSet = Readonly<Record<string, FactValue>>;
export type ConditionSet = Readonly<Record<string, FactCondition>>;
export type EffectSet = Readonly<Record<string, FactEffect>>;

/** Serializable action contract the planner reasons over (no animation data). */
export interface ActionPlanSpec {
  key: string;
  preconditions: ConditionSet;
  effects: EffectSet;
  cost: number;
}

export interface PlanRequest {
  /** Unique per request; a late response with another id is dropped. */
  planId: string;
  actorId: string;
  goalId: GoalId;
  /** Semantic revision (`DomainState.factsRevision`) the snapshot came from. */
  revision: number;
  facts: FactSet;
  conditions: ConditionSet;
  actions: readonly ActionPlanSpec[];
  /** Hard wall-clock budget in milliseconds, enforced by the host. */
  budgetMs: number;
}

export type PlanStatus = 'ok' | 'satisfied' | 'no-plan' | 'timeout' | 'error';

export interface PlanResponse {
  planId: string;
  actorId: string;
  goalId: GoalId;
  revision: number;
  status: PlanStatus;
  /** Ordered action keys. Empty unless status is `ok`. */
  actions: string[];
  cost: number;
  /** Predicted facts after the plan; never authoritative state. */
  predicted: FactSet;
  /** Which core produced this plan (`goap-minimal@1.0.0`, `reactive-bt`). */
  core: string;
  error?: string;
  elapsedMs?: number;
}

export interface PlannerPort {
  readonly name: string;
  plan(request: PlanRequest): Promise<PlanResponse>;
  /** Terminates any in-flight work; responses that arrive later are ignored. */
  terminate(): void;
}
