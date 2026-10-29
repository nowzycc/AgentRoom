/**
 * Types for the vendored upstream `goap-minimal@1.0.0` (MIT). The package ships
 * JavaScript only; these declarations mirror its published API surface and are
 * used by the M2 adapter. They intentionally describe loose records because the
 * library's condition/effect grammar is data-driven.
 */
declare module 'goap-minimal' {
  export class WorldState {
    constructor(vars?: Record<string, unknown>);
    vars: Record<string, unknown>;
    get(key: string): unknown;
    satisfies(conditions: Record<string, unknown>): boolean;
    countUnsatisfied(conditions: Record<string, unknown>): number;
    apply(effects: Record<string, unknown>): WorldState;
    key(): string;
    clone(): WorldState;
  }

  export class Action {
    constructor(
      key: string,
      preconditions?: Record<string, unknown>,
      effects?: Record<string, unknown>,
      cost?: number,
    );
    key: string;
    preconditions: Record<string, unknown>;
    effects: Record<string, unknown>;
    cost: number;
    isApplicable(state: WorldState): boolean;
    resultOf(state: WorldState): WorldState;
  }

  export class Goal {
    constructor(key: string, conditions?: Record<string, unknown>, priority?: number);
    key: string;
    conditions: Record<string, unknown>;
    priority: number;
  }

  export class GOAP {
    constructor(agent: Agent);
    plan(): { goal?: Goal; plan: Action[] };
  }

  export class Agent {
    constructor(state?: Record<string, unknown>);
    state: WorldState;
    actions: Action[];
    goals: { push(goal: Goal): void; peek(): Goal | undefined };
    planner: GOAP;
    addAction(action: Action): Action;
    addGoal(goal: Goal): Goal;
    getGoal(): Goal | undefined;
    plan(): { goal?: Goal; plan: Action[] };
  }

  export const FSM: { Goto: string; Animate: string; UseSmartObject: string };
  export function fsmStateFor(action: Action): string;
}
