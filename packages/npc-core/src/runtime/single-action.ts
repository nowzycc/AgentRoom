import type { ActionTerminal } from '../actions/executor.js';
import type { ActionRuntimeView } from '../actions/executor.js';
import { canonicalJson } from '../domain/commands.js';

export interface SingleActionRequest {
  readonly requestId: string;
  readonly actionKey: string;
  readonly issuedAtWallMs: number;
  readonly ttlMs: number;
}
export type SingleActionStatus = 'rejected' | 'accepted' | 'started' | 'cancel_requested' | 'succeeded' | 'cancelled' | 'failed';
export interface SingleActionReceipt {
  readonly requestId: string | null;
  readonly accepted: boolean;
  readonly status: SingleActionStatus;
  readonly reason: string | null;
  readonly actionId: string | null;
  readonly attemptId: string | null;
  readonly terminal: ActionTerminal | null;
}
interface Entry {
  readonly request: SingleActionRequest;
  readonly fingerprint: string;
  receipt: SingleActionReceipt;
}
function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}
function parseRequest(input: unknown): SingleActionRequest | null {
  if (!isRecord(input) || Object.keys(input).some(key => !['requestId', 'actionKey', 'issuedAtWallMs', 'ttlMs'].includes(key))) return null;
  if (typeof input.requestId !== 'string' || input.requestId.length === 0 || input.requestId.length > 128 ||
      typeof input.actionKey !== 'string' || typeof input.issuedAtWallMs !== 'number' || typeof input.ttlMs !== 'number') return null;
  return { requestId: input.requestId, actionKey: input.actionKey, issuedAtWallMs: input.issuedAtWallMs, ttlMs: input.ttlMs };
}
const rejected = (requestId: string | null, reason: string): SingleActionReceipt =>
  Object.freeze({ requestId, accepted: false, status: 'rejected', reason, actionId: null, attemptId: null, terminal: null });

/** Request correlation only. No adapter, executor, timer, goal snapshot or step loop. */
export class SingleActionLedger {
  private readonly entries = new Map<string, Entry>();
  private activeId: string | null = null;

  get active(): Entry | null { return this.activeId === null ? null : this.entries.get(this.activeId) ?? null; }
  receipt(id: string): SingleActionReceipt | null { return this.entries.get(id)?.receipt ?? null; }

  accept(input: unknown, context: { readonly nowWallMs: number; readonly refusal: string | null }): SingleActionReceipt {
    const request = parseRequest(input);
    if (!request) return rejected(isRecord(input) && typeof input.requestId === 'string' ? input.requestId : null, 'INVALID_ACTION_REQUEST');
    const fingerprint = canonicalJson(request);
    const existing = this.entries.get(request.requestId);
    if (existing) return existing.fingerprint === fingerprint ? existing.receipt : rejected(request.requestId, 'COMMAND_CONFLICT');
    if (this.entries.size >= 256) return rejected(request.requestId, 'COMMAND_LEDGER_FULL');
    let reason = context.refusal;
    if (request.actionKey !== 'lookAround') reason = 'UNSUPPORTED_ACTION';
    else if (!Number.isFinite(request.issuedAtWallMs) || !Number.isFinite(request.ttlMs) || request.ttlMs <= 0 ||
             request.issuedAtWallMs > context.nowWallMs || !Number.isFinite(request.issuedAtWallMs + request.ttlMs)) reason = 'INVALID_ACTION_TIME';
    else if (request.issuedAtWallMs + request.ttlMs <= context.nowWallMs) reason = 'TTL_EXPIRED';
    const receipt: SingleActionReceipt = reason ? rejected(request.requestId, reason) :
      Object.freeze({ requestId: request.requestId, accepted: true, status: 'accepted', reason: null, actionId: null, attemptId: null, terminal: null });
    this.entries.set(request.requestId, { request, fingerprint, receipt });
    if (receipt.accepted) this.activeId = request.requestId;
    return receipt;
  }

  started(action: ActionRuntimeView): void {
    this.update({ status: 'started', actionId: action.actionId, attemptId: action.attemptId });
  }
  bind(actionId: string, attemptId: string | null): void { this.update({ actionId, attemptId }); }
  cancel(reason: string): boolean {
    const entry = this.active;
    if (!entry) return false;
    if (entry.receipt.status === 'cancel_requested') return true;
    this.update({ status: 'cancel_requested', reason });
    return true;
  }
  finish(terminal: ActionTerminal): boolean {
    const receipt = this.active?.receipt;
    if (!receipt || receipt.actionId !== terminal.actionId || receipt.attemptId !== terminal.attemptId) return false;
    const status = terminal.outcome === 'success' ? 'succeeded' : terminal.outcome === 'cancelled' ? 'cancelled' : 'failed';
    this.update({ status, reason: terminal.reason, terminal });
    this.activeId = null;
    return true;
  }
  finishBeforeStart(status: 'failed' | 'cancelled', reason: string): void {
    this.update({ status, reason });
    this.activeId = null;
  }
  private update(patch: Partial<SingleActionReceipt>): void {
    const entry = this.active;
    if (entry) entry.receipt = Object.freeze({ ...entry.receipt, ...patch });
  }
}
