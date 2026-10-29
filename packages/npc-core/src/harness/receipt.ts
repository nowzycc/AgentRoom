import type { CommandRecord } from '../types.js';
import type { RuntimeView } from '../runtime/npc-runtime.js';
import { conditionsHold, type ActionTerminal } from '../actions/executor.js';
import { goalConditions } from '../planner/catalog.js';
export interface GoalRequestReceipt {
 readonly command: CommandRecord;
 readonly sinceSimMs: number;
 /** Runtime execution revision, including external observations; not domain revision. */
 readonly revision: number;
}
/** Read-only projection of existing predicates and attempt logs, never an executor.
 * `status=succeeded` requires this request's confirmed attempt AND current satisfaction.
 * `goalStatus=maintaining` describes present satisfaction, not a new action terminal.
 */
export function executionReceipt(request: GoalRequestReceipt | null, runtime: RuntimeView, terminals: readonly ActionTerminal[]) {
 if (!request) return { status: 'withdrawn', goalStatus: 'withdrawn', reason: 'NO_REQUEST', attempts: [] } as const;
 const goal = request.command.goalId;
 const attempts = terminals.filter(t => t.goalId === goal && t.atSimMs >= request.sinceSimMs && t.planRevision >= request.revision);
 const failure = [...runtime.failures].reverse().find(f => f.goalId === goal && f.atSimMs >= request.sinceSimMs && f.revision >= request.revision);
 const action = runtime.action;
 // A prior goal may still be safely exiting; its action is not this request's start.
 if (goal === null || runtime.goalId !== goal) return { status: 'accepted', goalStatus: 'pending', reason: 'GOAL_PENDING', attempts } as const;
 if (action?.goalId === goal && action.planRevision >= request.revision) {
  return { status: 'started', goalStatus: 'active', reason: action.phase, attempts } as const;
 }
 const conditions = goalConditions(goal);
 // An empty action plan can be legal (idle while standing). Neither plan length
 // nor an old satisfied label proves the current predicates or a finished safe exit.
 const maintaining = !action && runtime.plan?.goalId === goal && runtime.plan.status === 'satisfied' &&
  Object.keys(conditions).length > 0 && conditionsHold(runtime.facts, conditions);
 const latest = attempts.at(-1);
 if (maintaining) {
  if (latest?.outcome === 'success' && (!failure || failure.atSimMs <= latest.atSimMs)) {
   return { status: 'succeeded', goalStatus: 'maintaining', reason: 'CONFIRMED_ATTEMPT', attempts } as const;
  }
  return { status: 'maintaining', goalStatus: 'maintaining', reason: 'CURRENT_GOAL_SATISFIED', attempts } as const;
 }
 if (failure) return { status: 'failed', goalStatus: 'failed', reason: failure.reason ?? failure.kind, attempts } as const;
 return { status: 'pending', goalStatus: 'pending', reason: 'PLANNING_OR_EXECUTION_PENDING', attempts } as const;
}
