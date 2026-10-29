import { HarnessBridge, parseHarnessEvent, parseHarnessPolicy, canonicalJson, grant, dispatch, ack, wireError, reportValid } from './wire.js';
import type { Scope, Dispatch } from './wire.js';
import { runtimeRequest, reportTimeMs } from './dispatch-time.js';
import type { Slice } from '../../../../packages/npc-three/src/slice.js';
import type { SingleActionReceipt } from '../../../../packages/npc-core/src/runtime/single-action.js';
import type { ActionTerminal } from '../../../../packages/npc-core/src/actions/executor.js';
import { NetworkGoals, isSettled } from './network-goals.js';
import type { CancelBinding } from './network-goals.js';

type SceneApi = { readonly ready: boolean; readonly setManual: (on: boolean) => void; readonly setRender: (on: boolean) => void; readonly step: (seconds: number) => Promise<void> };
declare global { interface Window { __npcStage?: Slice; __envnpc?: SceneApi; __h5?: ReturnType<typeof hooks> } }
const frame = document.querySelector<HTMLIFrameElement>('#scene');
const status = document.querySelector<HTMLElement>('#status');
const pending = new Map<string, string>();
const requests = new Map<string, { readonly message: Dispatch; last: string }>();
const seen = new Map<string, string>();
const cancellations = new Map<string, CancelBinding>();
const cancelledTargets = new Set<string>();
let goals: NetworkGoals;
let slice: Slice, api: SceneApi, bridge: HarnessBridge, socket: WebSocket;
let scope: Scope | null = null, runtimeId = '', connectionId = '', deadline = 0, sequence = 0, cursor = 'unbound/0';
let online = false, stopped = false, manual = false, render = true, stepping = false, nextRenew = 0;
let lastSnapshot = 0;
const trace: unknown[] = [];
const hops: unknown[] = [];
function hop(name: string, fields: Record<string, unknown> = {}): void {
  hops.push({ hop: name, at: performance.now(), ...fields });
  if (hops.length > 256) hops.shift();
}
const terminal = (t: ActionTerminal | null) => t ? ({ actionId: t.actionId, attemptId: t.attemptId, actionKey: t.actionKey,
  outcome: t.outcome, reason: t.reason, atSimMs: t.atSimMs, planRevision: t.planRevision }) : null;
function sameScope(value: Scope): boolean { return canonicalJson(value) === canonicalJson(scope); }
function live(): boolean { if (online && performance.now() >= deadline) stop(); return online; }
function stop(): void {
  if (stopped) return;
  stopped = true; online = false;
  for (const id of requests.keys()) slice.runtime.cancelSingleAction(id, 'AUTHORITY_OFFLINE');
  goals.stop();
  const goalId = bridge.view().commandId;
  if (goalId) slice.runtime.cancel({ scope: 'goal', targetCommandId: goalId });
  if (socket?.readyState === WebSocket.OPEN) socket.close();
  if (status) status.textContent = 'offline / pending unknown；只完成既有 safe-exit；禁止自动重连';
}
function sendReport(data: unknown, deliveryId: string | null): void {
  if (!live() || !scope) return;
  const report = { apiVersion: 'h5a.1', type: 'report', scope, runtimeInstanceId: runtimeId,
    reportId: `report-${++sequence}`, reportSeq: sequence, deliveryId, data };
  if (!reportValid(report)) {
    hop('report.invalid', { errors: reportValid.errors?.map(e => ({ path: e.instancePath, keyword: e.keyword })) });
    throw new Error('INVALID_BROWSER_REPORT');
  }
  const encoded = JSON.stringify(report);
  if (pending.size >= 256) { stop(); return; }
  pending.set(report.reportId, encoded); socket.send(encoded);
  hop('report.sent', { reportId: report.reportId, deliveryId });
}
function actionReceipt(id: string, r: SingleActionReceipt) {
  return { apiVersion: 'h5a.1', scope, commandId: id, kind: 'action' as const, accepted: r.accepted,
    status: r.status, reason: r.reason, actionId: r.actionId, attemptId: r.attemptId, terminal: terminal(r.terminal) };
}
function expireActions(): void {
  const now = Date.now();
  if (goals.expire()) publishActions();
  for (const [id, entry] of requests) {
    const op = entry.message.operation;
    if ('issuedAtWallMs' in op && op.type === 'action.request' && now >= op.issuedAtWallMs + op.ttlMs && slice.runtime.cancelSingleAction(id, 'TTL_EXPIRED')) publishActions();
  }
}
function targetReceipt(id: string) {
  const action = slice.runtime.singleActionReceipt(id);
  return action ? actionReceipt(id, action) : goals.receipt(id);
}
function publishActions(): void {
  for (const [id, entry] of requests) {
    const data = targetReceipt(id);
    if (!data) continue;
    const fingerprint = canonicalJson(data);
    if (entry.last === fingerprint) continue;
    entry.last = fingerprint; trace.push(data); sendReport(data, entry.message.deliveryId);
  }
  for (const [id,b] of cancellations) {
    const target = targetReceipt(b.op.target.commandId);
    const data = {apiVersion:'h5a.1',scope,commandId:id,kind:'cancel',target:b.op.target,
      status:b.refusal ? 'rejected' : target && isSettled(target) ? 'settled' : 'requested',
      reason:b.refusal, targetReceipt:target};
    const fingerprint = canonicalJson(data);
    if (fingerprint === b.last) continue;
    b.last = fingerprint; trace.push(data); sendReport(data,b.deliveryId);
  }
}
function snapshot() {
  const v = bridge.view(), actual = slice.runtime.view();
  const source = slice.store.snapshot.actors[policy.observerId]?.sources[policy.source];
  return { apiVersion: 'h5a.1', scope, cursor, runtimeInstanceId: runtimeId, connection: online ? 'online' : 'offline',
    observation: { state: v.observed.state, sourceEpoch: source?.epoch ?? null, source: policy.source, sessionId: policy.sessionId, receivedAtWallMs: reportTimeMs(v.observed.receivedAtWallMs) },
    desiredGoal: online ? v.desiredGoal : null,
    actual: { goalId: actual.goalId, posture: slice.rig.seated || slice.rig.transitioning ? 'unknown' : 'standing',
      actionId: actual.action?.actionId ?? null, attemptId: actual.action?.attemptId ?? null, phase: actual.action?.phase ?? null },
    receipts: [...requests.keys()].flatMap(id => { const r = targetReceipt(id); return r ? [r] : []; }),
    receiptsComplete: true, historyComplete: false, capturedAtWallMs: Date.now() };
}
function receive(message: Dispatch): void {
  const matches = sameScope(message.scope) && sameScope(message.operation.scope);
  hop('adapter.dispatch', { deliveryId: message.deliveryId, online: live(), matches });
  if (!live() || !matches) return;
  const op = message.operation;
  const id = 'commandId' in op ? op.commandId : op.batchId;
  const fingerprint = canonicalJson(op), prior = seen.get(id);
  if (prior && prior !== fingerprint) { stop(); return; }
  if (prior) { publishActions(); return; }
  if (seen.size >= 512) { stop(); return; }
  seen.set(id, fingerprint);
  if ('commandId' in op && op.type === 'cancel') {
    const target = targetReceipt(op.target.commandId);
    const refusal = !target ? 'UNKNOWN_COMMAND' : target.kind !== op.target.kind ? 'TARGET_KIND_MISMATCH' : null;
    if (!refusal && target && !isSettled(target) && !cancelledTargets.has(op.target.commandId)) {
      cancelledTargets.add(op.target.commandId);
      if (op.target.kind === 'action') slice.runtime.cancelSingleAction(op.target.commandId);
      else goals.withdraw(op.target.commandId);
    }
    cancellations.set(id,{op,deliveryId:message.deliveryId,refusal,last:''});
    publishActions();
  } else if ('commandId' in op) {
    const now = Date.now();
    const reason = op.issuedAtWallMs > now || !Number.isSafeInteger(op.issuedAtWallMs + op.ttlMs) ? 'INVALID_ACTION_TIME' : op.issuedAtWallMs + op.ttlMs <= now ? 'TTL_EXPIRED' : null;
    requests.set(id, { message, last: '' });
    if (op.type === 'goal.request') { goals.request(op,reason); publishActions(); return; }
    if (reason) {
      sendReport(actionReceipt(id, { requestId: id, accepted: false, status: 'rejected', reason, actionId: null, attemptId: null, terminal: null }), message.deliveryId);
      return;
    }
    const runtimeNowMs = slice.store.wallTimeMs;
    const receipt = slice.runtime.requestSingleAction(runtimeRequest(op, now, runtimeNowMs));
    hop('runtime.request', { commandId: op.commandId, status: receipt.status, reason: receipt.reason, runtimeNowMs, wireIssuedAtWallMs: op.issuedAtWallMs });
    publishActions();
  } else {
    const results = op.events.map((input, index) => {
      const fact = parseHarnessEvent(input);
      const result = bridge.ingest(fact);
      return { index, eventId: fact.eventId, accepted: result.accepted, reason: result.reason ?? null, revision: result.revision };
    });
    sendReport({ apiVersion: 'h5a.1', scope, batchId: op.batchId, results }, message.deliveryId);
    sendReport(snapshot(), null);
  }
}
async function step(seconds: number): Promise<void> {
  const steps = Math.max(1, Math.round(seconds * 60));
  for (let i = 0; i < steps; i++) {
    expireActions();
    if (live()) bridge.refresh();
    await api.step(1 / 60); // existing runtime, actual rig, physics and evidence loop
    publishActions(); // every fixed step, never infer success from an empty action
  }
  if (render) api.setRender(true);
  if (live()) sendReport(snapshot(), null);
}
function hooks() {
  return { ready: true, connected: () => online, scope: () => scope, trace: () => trace.slice(), hops: () => hops.slice(), pendingReports: () => pending.size, snapshot,
    step, disconnect: stop, setManual: (on: boolean) => { manual = on; }, setRender: (on: boolean) => { render = on; api.setRender(on); },
    diagnostics: () => ({ rig: slice.rig.frame(), terminals: slice.runtime.terminals, calls: slice.claiming.calls, runtime: slice.runtime.view() }) };
}
// Explicit bounded fetch policy; no ky installation for this isolated adapter.
async function readJson(url: string): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.timeout(10000), cache: 'no-store' });
  if (!response.ok) throw new Error(`CONFIG_HTTP_${response.status}`);
  return response.json();
}
const policy = parseHarnessPolicy(await readJson('/room/web/harness-preview/policy.json'));
const context = await new Promise<{ slice: Slice; api: SceneApi }>(resolve => {
  const timer = setInterval(() => {
    const child = frame?.contentWindow;
    if (!child?.__envnpc?.ready || !child.__npcStage) return;
    api = child.__envnpc; slice = child.__npcStage; api.setManual(true);
    const style = child.document.createElement('style'); style.textContent = '#toolbar,#detail,#eventlog,#boundary,#hud{display:none!important}'; child.document.head.append(style);
    clearInterval(timer); resolve({ slice, api });
  }, 50);
});
slice = context.slice; api = context.api;
bridge = new HarnessBridge(context.slice.store, policy, { withdraw: id => slice.runtime.cancel({ scope: 'goal', targetCommandId: id }), revision: () => slice.runtime.executionRevision });
goals = new NetworkGoals(slice,bridge);
const button = document.querySelector<HTMLButtonElement>('#connect');
if (button) button.onclick = async () => {
  const input = document.querySelector<HTMLInputElement>('#credential');
  if (!input || online || stopped) return;
  const credential = input.value; input.value = '';
  const response = await fetch('/api/h5a/pair', { method: 'POST', headers: { Authorization: `Bearer ${credential}` }, signal: AbortSignal.timeout(5000) });
  if (!response.ok) { if (status) status.textContent = `配对拒绝 ${response.status}`; return; }
  const paired: unknown = await response.json();
  if (typeof paired !== 'object' || paired === null || !('runtimeInstanceId' in paired) || typeof paired.runtimeInstanceId !== 'string') throw new Error('INVALID_PAIR');
  runtimeId = paired.runtimeInstanceId;
  socket = new WebSocket(`${location.origin.replace('http:', 'ws:')}/api/h5a/runtime`);
  socket.onopen = () => socket.send(JSON.stringify({ apiVersion: 'h5a.1', type: 'hello', worldId: slice.store.snapshot.worldId, actorId: slice.actorId, runtimeInstanceId: runtimeId }));
  socket.onclose = stop;
  socket.onmessage = event => {
    const data: unknown = JSON.parse(event.data);
    hop('ws.received', { type: typeof data === 'object' && data !== null && 'type' in data && ['grant', 'dispatch', 'report_ack'].includes(String(data.type)) ? data.type : 'other' });
    if (grant(data)) { if (stopped || online && performance.now() >= deadline) { stop(); return; } scope = data.scope; connectionId = data.connectionId; deadline = performance.now() + data.leaseMs; online = true; if (status) status.textContent = '已认证 WS / 本机浏览器执行权威'; sendReport(snapshot(), null); }
    else if (dispatch(data)) receive(data);
    else if (ack(data)) { pending.delete(data.reportId); cursor = data.cursor; hop('report.ack', { reportId: data.reportId }); }
    else if (wireError(data)) { trace.push(data); stop(); }
    else { hop('wire.invalid', { errors: dispatch.errors?.map(e => ({ path: e.instancePath, keyword: e.keyword })) }); stop(); }
  };
  button.disabled = true;
};
window.__h5 = hooks();
window.addEventListener('pagehide', stop);
setInterval(async () => {
  const now = performance.now();
  expireActions();
  if (live() && now >= nextRenew) {
    nextRenew = now + 1000;
    socket.send(JSON.stringify({ apiVersion: 'h5a.1', type: 'renew', scope, connectionId, runtimeInstanceId: runtimeId }));
    for (const encoded of pending.values()) socket.send(encoded);
  }
  if (!manual && !stepping && (online || stopped && slice.runtime.view().action)) {
    stepping = true;
    try { await step(1 / 60); } finally { stepping = false; }
  }
  if (online && now - lastSnapshot >= 1000) { lastSnapshot = now; sendReport(snapshot(), null); }
}, 16);
