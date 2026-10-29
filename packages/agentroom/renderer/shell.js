/* 中文窄壳：自动配对（一次性凭据）+ 状态/回执展示 + 显式命令按钮。
 * 不实现领域逻辑；真实 runtime 仍是 /h5/adapter.js（冻结 R4）。
 * 回执契约：main 推送的 update 为
 *   {commandId, receipt:{kind,status,terminal?...}}     顶层回执
 *   {commandId, admission:'pending'|'unknown', lastReceipt?} 准入状态
 *   {commandId, code} / {error, ...}；POST 失败返回 unknown + 原 commandId，不换 ID。 */
(function () {
  'use strict';
  const $ = (sel) => document.querySelector(sel);
  const credentialEl = $('#credential');
  const connectEl = $('#connect');
  const receiptsEl = $('#receipts');
  const postureEl = $('#posture');
  const goalEl = $('#goal');
  const mirrorEl = $('#mirror');
  const dotEl = $('#conn-dot');
  const lookBtn = $('#btn-look');
  const converseBtn = $('#btn-converse');
  const idleBtn = $('#btn-idle');
  const cancelBtn = $('#btn-cancel');

  const outstanding = new Map(); // commandId -> {kind:'action'|'goal', settled:bool, unknown:bool}

  function addReceipt(text) {
    const li = document.createElement('li');
    li.textContent = text;
    receiptsEl.prepend(li);
    while (receiptsEl.children.length > 12) receiptsEl.removeChild(receiptsEl.lastChild);
  }

  function fmtReceipt(r) {
    let text = `${r.kind}/${r.status}`;
    if (r.terminal) text += `/${r.terminal.outcome}${r.terminal.reason ? ':' + r.terminal.reason : ''}`;
    else if (r.reason) text += `:${r.reason}`;
    return text;
  }

  // 与 H5a receipts.settled 相同语义（长寿 goal 只在 withdrawn/rejected 时算结清）
  function settledLike(r) {
    switch (r.kind) {
      case 'goal': return r.status === 'withdrawn' || r.status === 'rejected';
      case 'cancel': return r.status === 'settled' || r.status === 'rejected';
      default: return ['succeeded', 'failed', 'cancelled', 'rejected'].includes(r.status);
    }
  }

  function lastUnsettled() {
    for (const [id, v] of outstanding) { if (v.kind === 'action' && !v.settled) return { kind: 'action', commandId: id }; }
    for (const [id, v] of outstanding) { if (!v.settled) return { kind: 'goal', commandId: id }; }
    return null;
  }

  window.npcDesktop.onCommandUpdate((u) => {
    const v = outstanding.get(u.commandId);
    if (u.receipt) {
      addReceipt(`${u.commandId} → ${fmtReceipt(u.receipt)}`);
      if (v) v.settled = settledLike(u.receipt);
    } else if (u.admission) {
      addReceipt(`${u.commandId} → ${u.admission === 'unknown' ? 'unknown（是否接收未知，等待回执/可查原ID）' : 'pending（已受理，等待回执）'}`);
      if (v && u.admission === 'unknown') v.unknown = true;
    } else if (u.code) {
      addReceipt(`${u.commandId} → ${u.code}`);
      if (v && (u.code === 'UNKNOWN_COMMAND' || u.code === 'RESYNC_REQUIRED' || u.code === 'RECEIPT_TIMEOUT')) v.settled = true;
    } else {
      addReceipt(`${u.commandId} → ${JSON.stringify(u).slice(0, 80)}`);
    }
  });

  // 自动配对：adapter 为异步模块，window.__h5 出现即 #connect 已绑定
  const pairTimer = setInterval(async () => {
    if (!window.__h5) return;
    clearInterval(pairTimer);
    const cred = await window.npcDesktop.takePairCredential();
    if (!cred) { mirrorEl.textContent = '未取得配对凭据（可能已配对或非首个窗口）'; return; }
    credentialEl.value = cred;
    connectEl.click();
  }, 200);

  // 500ms 刷新：连接态 + 实际姿态/相位（动作完成看这里，不看命令回执）
  setInterval(() => {
    const h5 = window.__h5;
    if (!h5) { $('#status-line').textContent = '场景加载中…'; return; }
    $('#status-line').textContent = ($('#status') && $('#status').textContent) || '—';
    const online = Boolean(h5.connected());
    dotEl.className = 'dot ' + (online ? 'on' : 'off');
    mirrorEl.textContent = online ? '已认证 WS（本机执行）' : '未连接';
    lookBtn.disabled = converseBtn.disabled = idleBtn.disabled = cancelBtn.disabled = !online;
    let snap = null;
    try { snap = h5.snapshot(); } catch { snap = null; }
    if (snap && snap.actual) {
      const a = snap.actual;
      postureEl.textContent = [a.posture, a.phase].filter(Boolean).join(' / ') || '—';
      goalEl.textContent = snap.desiredGoal ? snap.desiredGoal.goal || JSON.stringify(snap.desiredGoal) : '—';
    }
  }, 500);

  async function submitResult(r) {
    if (r && r.commandId && r.unknown) {
      outstanding.set(r.commandId, { kind: 'action', settled: false, unknown: true });
      addReceipt(`${r.commandId} 提交结果未知（网络/响应丢失），保留原ID可查询，未自动重发`);
    } else if (r && r.commandId && (r.httpStatus === 202 || r.httpStatus === 200)) {
      outstanding.set(r.commandId, { kind: 'action', settled: false, unknown: false });
      addReceipt(`${r.commandId} 已提交（等待回执）`);
    } else if (r && r.commandId && r.httpStatus) {
      addReceipt(`${r.commandId} 被拒绝：${r.code || ('HTTP ' + r.httpStatus)}`);
    } else {
      addReceipt('提交失败：' + JSON.stringify(r).slice(0, 120));
    }
  }

  lookBtn.addEventListener('click', async () => {
    await submitResult(await window.npcDesktop.sendCommand({ kind: 'lookAround' }));
  });
  async function goal(goalName) {
    const r = await window.npcDesktop.sendCommand({ kind: 'goal', goal: goalName });
    if (r && r.commandId && (r.httpStatus === 202 || r.httpStatus === 200)) {
      outstanding.set(r.commandId, { kind: 'goal', settled: false, unknown: Boolean(r.unknown) });
      addReceipt(`${r.commandId} 已提交（${goalName}）`);
    } else if (r && r.commandId && r.unknown) {
      outstanding.set(r.commandId, { kind: 'goal', settled: false, unknown: true });
      addReceipt(`${r.commandId} 提交结果未知（保留原ID可查询）`);
    } else {
      addReceipt(`${goalName} 提交失败：${(r && (r.code || r.error)) || JSON.stringify(r).slice(0, 80)}`);
    }
  }
  converseBtn.addEventListener('click', () => goal('converse'));
  idleBtn.addEventListener('click', () => goal('idle'));
  cancelBtn.addEventListener('click', async () => {
    const t = lastUnsettled();
    if (!t) { addReceipt('没有待取消的命令'); return; }
    const r = await window.npcDesktop.sendCancel(t);
    if (r && r.commandId && (r.httpStatus === 202 || r.httpStatus === 200)) {
      addReceipt(`${r.commandId} 取消请求已提交 → ${t.commandId}`);
    } else if (r && r.code === 'UNKNOWN_COMMAND') {
      addReceipt(`取消失败：原命令 ${t.commandId} 服务端无记录`);
    } else {
      addReceipt(`取消失败：${(r && (r.code || r.error)) || JSON.stringify(r).slice(0, 80)}`);
    }
  });
  $('#btn-exit').addEventListener('click', () => window.npcDesktop.requestExit());
  $('#panel-head').addEventListener('click', () => $('#panel').classList.toggle('folded'));
  $('#btn-panel').addEventListener('click', (e) => e.stopPropagation());
})();
