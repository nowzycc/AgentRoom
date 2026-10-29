/**
 * Adapter over the selected upstream core (`goap-minimal@1.0.0`, MIT, vendored
 * under `vendor/`). It performs no search of its own: the Agent, Action, Goal
 * and A* loop are the upstream library. This module only validates the wire
 * shape and translates between plain facts and the library's WorldState.
 */
import { Action, Agent, Goal, WorldState } from 'goap-minimal';
import type { ActionPlanSpec, ConditionSet, EffectSet, FactSet, FactValue } from './types.js';

export const GOAP_CORE = 'goap-minimal@1.0.0';

export interface GoapPlanInput {
  facts: FactSet;
  conditions: ConditionSet;
  actions: readonly ActionPlanSpec[];
}

export interface GoapPlanResult {
  status: 'ok' | 'satisfied' | 'no-plan';
  actions: string[];
  cost: number;
  predicted: FactSet;
  core: string;
}

const MAX_COST = 1_000_000;
const MAX_FACT_VALUE = 1_000_000_000;

/**
 * Rejects values that would make the search space unbounded or ill-defined.
 * The upstream core has no budget of its own, so a malformed request must fail
 * before it reaches it.
 */
export function validatePlanInput(input: GoapPlanInput): void {
  if (!input || typeof input !== 'object') throw new Error('plan input must be an object');
  validateFacts(input.facts);
  validateConditions(input.conditions, 'conditions');
  if (!Array.isArray(input.actions)) throw new Error('actions must be an array');
  if (input.actions.length === 0) return;
  const seen = new Set<string>();
  for (const action of input.actions) {
    if (!action || typeof action.key !== 'string' || action.key.length === 0) throw new Error('action.key must be a non-empty string');
    if (seen.has(action.key)) throw new Error(`duplicate action key ${action.key}`);
    seen.add(action.key);
    validateConditions(action.preconditions, `preconditions of ${action.key}`);
    validateEffects(action.effects, action.key);
    if (typeof action.cost !== 'number' || !Number.isFinite(action.cost) || action.cost < 0) {
      throw new Error(`action ${action.key} must have a finite non-negative cost`);
    }
  }
}

function validateFacts(facts: FactSet): void {
  for (const [key, value] of Object.entries(facts ?? {})) {
    if (typeof value === 'boolean') continue;
    if (typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= MAX_FACT_VALUE) continue;
    throw new Error(`fact ${key} must be a boolean or a bounded finite number`);
  }
}

function validateConditions(conditions: ConditionSet, label: string): void {
  for (const [key, value] of Object.entries(conditions ?? {})) {
    if (typeof value === 'boolean') continue;
    if (typeof value === 'number' && Number.isFinite(value)) continue;
    if (value && typeof value === 'object') {
      const allowed = ['eq', 'gte', 'lte', 'gt', 'lt'];
      const keys = Object.keys(value);
      if (keys.length === 0) throw new Error(`${label}.${key} has an empty comparison`);
      for (const op of keys) {
        if (!allowed.includes(op)) throw new Error(`${label}.${key} has unsupported comparison ${op}`);
        const n = (value as Record<string, unknown>)[op];
        if (typeof n !== 'number' || !Number.isFinite(n) || Math.abs(n) > MAX_FACT_VALUE) {
          throw new Error(`${label}.${key}.${op} must be a bounded finite number`);
        }
      }
      continue;
    }
    throw new Error(`${label}.${key} is not a valid condition`);
  }
}

function validateEffects(effects: EffectSet, actionKey: string): void {
  for (const [key, value] of Object.entries(effects ?? {})) {
    if (typeof value === 'boolean') continue;
    if (typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= MAX_FACT_VALUE) continue;
    if (value && typeof value === 'object' && 'inc' in value) {
      const inc = (value as { inc: unknown }).inc;
      if (typeof inc !== 'number' || !Number.isFinite(inc) || Math.abs(inc) > MAX_FACT_VALUE) {
        throw new Error(`effect ${actionKey}.${key}.inc must be a bounded finite number`);
      }
      continue;
    }
    throw new Error(`effect ${actionKey}.${key} is not a valid effect`);
  }
}

export function satisfies(facts: FactSet, conditions: ConditionSet): boolean {
  return new WorldState({ ...facts }).satisfies(conditions as Record<string, unknown>);
}

export function countUnsatisfied(facts: FactSet, conditions: ConditionSet): number {
  return new WorldState({ ...facts }).countUnsatisfied(conditions as Record<string, unknown>);
}

/** Applies literal and delta effects; used only for predictions and tests. */
export function applyEffects(facts: FactSet, effects: EffectSet): FactSet {
  const next = new WorldState({ ...facts }).apply(effects as Record<string, unknown>).vars as Record<string, FactValue>;
  return next;
}

export function planWithGoap(input: GoapPlanInput): GoapPlanResult {
  validatePlanInput(input);
  const agent = new Agent({ ...input.facts });
  for (const spec of input.actions) {
    agent.addAction(
      new Action(
        spec.key,
        { ...spec.preconditions } as Record<string, unknown>,
        { ...spec.effects } as Record<string, unknown>,
        spec.cost,
      ),
    );
  }
  agent.addGoal(new Goal('goal', input.conditions as Record<string, unknown>));

  // Upstream returns an empty plan both for "already satisfied" and for "no
  // plan"; check satisfaction first so an empty plan is never read as success.
  if (agent.state.satisfies(input.conditions as Record<string, unknown>)) {
    return { status: 'satisfied', actions: [], cost: 0, predicted: { ...input.facts }, core: GOAP_CORE };
  }

  const result = agent.plan();
  const plan = result.plan ?? [];
  if (plan.length === 0) {
    return { status: 'no-plan', actions: [], cost: 0, predicted: { ...input.facts }, core: GOAP_CORE };
  }

  let predicted: FactSet = { ...input.facts };
  let cost = 0;
  const actions: string[] = [];
  for (const action of plan) {
    actions.push(action.key);
    cost += action.cost;
    predicted = applyEffects(predicted, action.effects as EffectSet);
  }
  if (cost > MAX_COST) throw new Error('plan cost exceeds the bounded cost limit');
  return { status: 'ok', actions, cost, predicted, core: GOAP_CORE };
}
