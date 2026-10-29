import type { Slice } from '../../../../packages/npc-three/src/slice.js';
import type { HarnessBridge } from '../../../../packages/npc-core/src/harness/bridge.js';
import { executionReceipt } from '../../../../packages/npc-core/src/harness/receipt.js';
import type { GoalRequestReceipt } from '../../../../packages/npc-core/src/harness/receipt.js';
import type { GoalOperation, CancelOperation } from './wire.js';

type Binding = { readonly op: GoalOperation; readonly request: GoalRequestReceipt | null; readonly excluded: ReadonlySet<string>; readonly owned: Map<string, string>; readonly refusal: string | null; last: GoalReceipt | null };
type GoalReceipt = { readonly apiVersion: 'h5a.1'; readonly scope: GoalOperation['scope']; readonly commandId: string; readonly kind: 'goal'; readonly accepted: boolean; readonly status: string; readonly goalStatus: string; readonly reason: string | null; readonly actionId: string | null; readonly attemptId: string | null; readonly attempts: readonly unknown[] };
export type TargetReceipt = GoalReceipt | { readonly kind: 'action'; readonly commandId: string; readonly status: string };
export const isSettled = (r: TargetReceipt): boolean => r.kind === 'goal' ? ['withdrawn','rejected'].includes(r.status) : ['succeeded','failed','cancelled','rejected'].includes(r.status);

/** Network request bindings and read projections, never an execution scheduler. */
export class NetworkGoals {
  private readonly goals = new Map<string, Binding>();
  constructor(private readonly slice: Slice, private readonly bridge: HarnessBridge) {}
  request(op: GoalOperation, refusal: string | null): void {
    // Adapter owns payload conflict checks; a retry cannot remap TTL or ownership.
    if (this.goals.has(op.commandId)) return;
    const runtime = this.slice.runtime;
    const excluded = new Set(runtime.terminals.map(t => t.actionId));
    if (runtime.action) excluded.add(runtime.action.actionId);
    const remaining = Math.floor(op.issuedAtWallMs + op.ttlMs - Date.now());
    let reason = refusal ?? (remaining < 1000 ? 'TTL_TOO_SHORT' : null);
    if (!reason) {
      const result = this.bridge.explicit({ specVersion:'1.0',worldId:op.scope.worldId,actorId:op.scope.actorId,
        commandId:op.commandId,type:'goal.request',goal:op.goal,priorityClass:op.priorityClass,onConflict:op.onConflict,
        ttlMs:remaining,issuedAt:new Date(op.issuedAtWallMs).toISOString() });
      if (!result.accepted) reason = result.reason;
    }
    const request = this.bridge.requestReceipt(op.commandId);
    this.goals.set(op.commandId, { op, refusal:reason, excluded, owned:new Map(),
      request:request?.command.commandId === op.commandId ? request : null, last:null });
  }
  expire(): boolean {
    let changed = false;
    for (const [id,b] of this.goals) {
      if (Date.now() >= b.op.issuedAtWallMs + b.op.ttlMs && this.active(id)) {
        changed = this.slice.runtime.cancel({scope:'goal',targetCommandId:id}) || changed;
      }
    }
    return changed;
  }
  withdraw(id: string): void {
    if (this.active(id)) this.slice.runtime.cancel({scope:'goal',targetCommandId:id});
    this.bridge.refresh();
  }
  stop(): void { for (const id of this.goals.keys()) this.withdraw(id); }
  ids(): readonly string[] { return [...this.goals.keys()]; }
  private active(id: string): boolean { return this.slice.store.snapshot.actors[this.slice.actorId]?.commands[id]?.status === 'active'; }
  receipt(id: string): GoalReceipt | null {
    const b = this.goals.get(id);
    if (!b) return null;
    if (b.last && ['withdrawn','rejected'].includes(b.last.status)) return b.last;
    const runtime = this.slice.runtime.view(), action = runtime.action;
    const selected = this.bridge.view().request?.command.commandId === id;
    const owns = (actionId: string, revision: number) => !b.excluded.has(actionId) && revision >= (b.request?.revision ?? Infinity);
    if (selected && this.active(id)) {
      if (action?.goalId === b.op.goal && owns(action.actionId,action.planRevision) && !b.owned.has(action.actionId)) b.owned.set(action.actionId,action.attemptId);
      for (const t of this.slice.runtime.terminals) if (t.goalId === b.op.goal && owns(t.actionId,t.planRevision) && !b.owned.has(t.actionId)) b.owned.set(t.actionId,t.attemptId);
    }
    const attempts = this.slice.runtime.terminals.filter(t => b.owned.get(t.actionId) === t.attemptId);
    const current = action && b.owned.get(action.actionId) === action.attemptId ? action : null;
    const projection = executionReceipt(b.request, {...runtime, action:current}, attempts);
    const retired = !this.active(id);
    const status = b.refusal ? 'rejected' : retired ? current ? 'pending' : 'withdrawn' :
      !selected ? 'pending' : projection.status === 'succeeded' ? 'maintaining' : projection.status;
    b.last = { apiVersion:'h5a.1',scope:b.op.scope,commandId:id,kind:'goal',accepted:!b.refusal,status,
      goalStatus:b.refusal ? 'failed' : retired ? current ? 'active' : 'withdrawn' : projection.goalStatus,
      reason:b.refusal ?? (retired ? current ? 'SAFE_EXIT_PENDING' : 'GOAL_WITHDRAWN' : projection.reason),
      actionId:current?.actionId ?? null,attemptId:current?.attemptId ?? null,
      attempts:attempts.map(t=>({actionId:t.actionId,attemptId:t.attemptId,actionKey:t.actionKey,outcome:t.outcome,reason:t.reason,atSimMs:t.atSimMs,planRevision:t.planRevision})) };
    return b.last;
  }
}

export type CancelBinding = { readonly op: CancelOperation; readonly deliveryId: string; readonly refusal: string | null; last: string };
