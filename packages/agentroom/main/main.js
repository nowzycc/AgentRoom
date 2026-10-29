'use strict';
/* AgentRoom 桌面壳 — Electron main 进程。
 * 职责（仅这些）：
 *  - 单实例锁（第二实例直接退出并聚焦既有窗口）
 *  - 每次启动生成新 epoch：随机 loopback 端口 + runtimeId + 两个独立随机 token（仅经 env 传给 sidecar；
 *    不落盘、不打日志、不写配置明文；渲染层只能一次性取得配对凭据）
 *  - spawn 原 Python H5a sidecar（snapshot 副本 + 冻结 R4 dist 的唯一 /h5 挂载替换）
 *  - capabilities 200 健康检查后创建 BrowserWindow（严格安全配置；就绪只信 200，不信 stdout）
 *  - 窄 IPC（校验 senderFrame = 主框架 + 精确壳 URL + payload 白名单）：显式命令/取消/退出
 *  - 回执契约与 H6 shared client 一致：delivery() 返回顶层 receipt（有 kind/status），
 *    或 admission {delivery:'pending'|'unknown', lastReceipt?}；不发明 wrapper。
 *  - POST 网络错误：不自动重发/不换 ID，保留原 commandId 标记 unknown，允许凭原 ID 查询。
 *  - 所有失败路径（fatal/正常退出）都先停自己的 sidecar 再退出。
 * 不是新 executor；不实现任何领域逻辑。 */
const { app, BrowserWindow, ipcMain, session, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const net = require('node:net');
const { spawn } = require('node:child_process');

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const WORLD_ID = 'apartment-v3';
const ACTOR_ID = 'npc-a';
// 与 H5a receipts.settled 相同语义（只读复刻，不重写执行器）
function receiptSettled(receipt) {
  if (!receipt) return false;
  switch (receipt.kind) {
    case 'goal': return receipt.status === 'withdrawn' || receipt.status === 'rejected';
    case 'cancel': return receipt.status === 'settled' || receipt.status === 'rejected';
    default: return ['succeeded', 'failed', 'cancelled', 'rejected'].includes(receipt.status);
  }
}

let win = null;
let sidecar = null;
let sidecarErrTail = '';
let ctx = null;          // { origin, port, epoch, scope, runtimeId, harnessToken, runtimeToken }
let pairTaken = false;
let quitting = false;

const isPackaged = app.isPackaged;
const backendRoot = isPackaged
  ? path.join(process.resourcesPath, 'app.asar.unpacked', 'backend')
  : path.join(app.getAppPath(), 'backend');
const h5aDir = path.join(backendRoot, 'room', 'tools', 'npc-v2', 'hardening', 'H5a');
const entryScript = path.join(h5aDir, 'run-desktop.py');

function sidecarPython() {
  if (process.platform === 'win32') {
    const bundled = path.join(backendRoot, 'runtime', 'python', 'python.exe');
    if (fs.existsSync(bundled)) return bundled;
    throw new Error('缺少内置 Python 运行时 backend/runtime/python/python.exe');
  }
  if (process.env.NPC_SIDECAR_PYTHON) return process.env.NPC_SIDECAR_PYTHON;
  const marker = path.join(backendRoot, 'python-linux.path');
  if (fs.existsSync(marker)) {
    const p = fs.readFileSync(marker, 'utf8').trim();
    if (p && fs.existsSync(p)) return p;
  }
  return 'python3';
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
  });
}

const newToken = () => crypto.randomBytes(32).toString('base64url');
const newId = (prefix) => `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}`;

async function startSidecar() {
  const port = await freePort();
  const runtimeId = newId('runtime');
  const harnessToken = newToken();
  const runtimeToken = newToken();
  if (harnessToken === runtimeToken) throw new Error('token 冲突（契约要求两个不同凭据）');
  const python = sidecarPython(); // 可能 throw：统一由 boot() 的 await 捕获，不再用 async executor 吞错
  if (!fs.existsSync(entryScript)) throw new Error('缺少 sidecar 入口: ' + entryScript);
  const env = {
    ...process.env,
    H5_ORIGIN: `http://127.0.0.1:${port}`,
    H5_RUNTIME_ID: runtimeId,
    H5_HARNESS_TOKEN: harnessToken,
    H5_RUNTIME_TOKEN: runtimeToken,
    H5_WORLD_ID: WORLD_ID,
    H5_ACTOR_ID: ACTOR_ID,
    H5_QUIESCENT: 'confirmed',
    // 中文 Windows 默认 GBK：冻结 H5a 用 read_text() 读 UTF-8 schema/policy。
    // 在壳层强制 UTF-8 模式，不改冻结源码（Windows 实测 UnicodeDecodeError 后补）。
    PYTHONUTF8: '1',
    PYTHONIOENCODING: 'utf-8',
    PYTHONUNBUFFERED: '1'
  };
  const proc = spawn(python, [entryScript], { cwd: h5aDir, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  sidecar = proc;
  proc.stdout.on('data', () => {}); // ready 行仅事件元数据，无凭据；就绪判定只信 capabilities 200
  proc.stderr.on('data', (chunk) => {
    sidecarErrTail = (sidecarErrTail + chunk.toString('utf8')).slice(-4000); // 服务端仅 hop 元数据日志
  });
  proc.once('exit', (code) => {
    if (!quitting && !win) {
      // 启动早期即退出：交给 waitReady 的失败路径展示
      sidecarErrTail = (sidecarErrTail + `\n[sidecar 早退 code=${code}]`).slice(-4000);
    }
  });
  ctx = { origin: `http://127.0.0.1:${port}`, port, epoch: null, scope: null, runtimeId, harnessToken, runtimeToken };
}

function authHeaders() {
  return { authorization: 'Bearer ' + ctx.harnessToken, 'content-type': 'application/json' };
}

async function waitReady(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastErr = '';
  while (Date.now() < deadline) {
    if (sidecar.exitCode !== null) throw new Error('sidecar 启动失败: ' + (sidecarErrTail.slice(-400) || ('exit ' + sidecar.exitCode)));
    try {
      const res = await fetch(ctx.origin + '/api/h5a/capabilities', {
        headers: { authorization: 'Bearer ' + ctx.harnessToken },
        signal: AbortSignal.timeout(2000)
      });
      if (res.ok) {
        const cap = await res.json();
        if (cap && cap.apiVersion === 'h5a.1' && cap.scope &&
            typeof cap.scope.worldId === 'string' && typeof cap.scope.actorId === 'string' &&
            typeof cap.scope.authorityEpoch === 'string') {
          ctx.epoch = cap.brokerEpoch;
          ctx.scope = cap.scope; // 直接采用 capabilities.scope 完整原值，不从内部序号拼装
          return;
        }
        lastErr = 'capabilities 响应异常';
      } else lastErr = 'HTTP ' + res.status;
    } catch (e) { lastErr = String((e && e.message) || e); }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('sidecar 30 秒内未就绪（' + lastErr + '）');
}

// delivery() 契约（与 H6 shared client 一致）：
//  - 顶层 receipt：{apiVersion, scope, commandId, kind, status, ...terminal?/targetReceipt?}
//  - admission：{apiVersion, scope, commandId, delivery:'pending'|'unknown', execution, lastReceipt?}
function classify(body) {
  if (!body || typeof body !== 'object') return null;
  if (typeof body.kind === 'string' && typeof body.status === 'string') return { kind: 'receipt', receipt: body };
  if (body.delivery === 'pending' || body.delivery === 'unknown') {
    return { kind: 'admission', admission: body.delivery, lastReceipt: body.lastReceipt || null };
  }
  return null;
}

function pushUpdate(commandId, fields) {
  if (win && !win.isDestroyed()) win.webContents.send('npc:command-update', { commandId, ...fields });
}

async function pollCommand(id, maxTries) {
  let lastFingerprint = '';
  for (let i = 0; i < maxTries; i++) {
    if (!ctx || quitting) return;
    try {
      const res = await fetch(`${ctx.origin}/api/h5a/commands/${encodeURIComponent(id)}?brokerEpoch=${encodeURIComponent(ctx.epoch)}`,
        { headers: { authorization: 'Bearer ' + ctx.harnessToken }, signal: AbortSignal.timeout(2000) });
      if (res.status === 409) { pushUpdate(id, { code: 'RESYNC_REQUIRED' }); return; }
      if (res.status === 404) { pushUpdate(id, { code: 'UNKNOWN_COMMAND' }); return; }
      if (res.ok) {
        const body = await res.json();
        const cls = classify(body);
        if (!cls) { pushUpdate(id, { code: 'INVALID_DELIVERY_SHAPE' }); return; }
        const fingerprint = JSON.stringify(cls);
        if (fingerprint !== lastFingerprint) {
          lastFingerprint = fingerprint;
          pushUpdate(id, cls.kind === 'receipt'
            ? { receipt: cls.receipt }
            : { admission: cls.admission, lastReceipt: cls.lastReceipt });
        }
        if (cls.kind === 'receipt' && receiptSettled(cls.receipt)) return;
        if (cls.kind === 'receipt' && cls.receipt.kind === 'goal') {
          // goal 是长寿目标：拿到回执即停止轮询；maintaining/succeeded 不当 single terminal
          return;
        }
      }
    } catch { /* 瞬时网络错误继续轮询 */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  pushUpdate(id, { code: 'RECEIPT_TIMEOUT' });
}

function validateCommand(p) {
  if (!p || typeof p !== 'object' || !ctx || !ctx.scope) return null;
  const base = { apiVersion: 'h5a.1', scope: { ...ctx.scope }, commandId: newId('cmd'), issuedAtWallMs: Date.now(), ttlMs: 30000 };
  if (p.kind === 'lookAround') return { ...base, type: 'action.request', actionKey: 'lookAround' };
  if ((p.kind === 'goal') && (p.goal === 'converse' || p.goal === 'idle')) {
    return { ...base, type: 'goal.request', goal: p.goal, priorityClass: 'manual', onConflict: 'replace' };
  }
  return null;
}

function validateCancel(p) {
  if (!p || typeof p !== 'object' || !ctx || !ctx.scope) return null;
  const kind = p.kind === 'action' ? 'action' : p.kind === 'goal' ? 'goal' : null;
  if (!kind || typeof p.commandId !== 'string' || !ID_PATTERN.test(p.commandId)) return null;
  return { apiVersion: 'h5a.1', scope: { ...ctx.scope }, commandId: newId('cancel'), type: 'cancel', target: { kind, commandId: p.commandId } };
}

async function postApi(endpoint, payload) {
  const res = await fetch(ctx.origin + endpoint, { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload), signal: AbortSignal.timeout(5000) });
  let body = null;
  try { body = await res.json(); } catch {}
  return { res, body };
}

// IPC 信任边界：主框架 + 精确本机壳 URL；preload 会注入同源 iframe，必须按 frame 拒绝
function trustedSender(event) {
  if (!win || win.isDestroyed() || event.sender !== win.webContents) return false;
  const frame = event.senderFrame;
  if (!frame || frame.parent !== null) return false; // 只接受主框架
  return frame.url === ctx.origin + '/';
}

function registerIpc() {
  ipcMain.handle('npc:take-pair-credential', (event) => {
    if (!trustedSender(event) || pairTaken || !ctx) return null; // 一次性
    pairTaken = true;
    return ctx.runtimeToken;
  });
  ipcMain.handle('npc:command', async (event, p) => {
    if (!trustedSender(event)) return { error: 'FORBIDDEN_SENDER' };
    const payload = validateCommand(p);
    if (!payload) return { error: 'INVALID_COMMAND' };
    try {
      const { res, body } = await postApi('/api/h5a/commands', payload);
      const cls = classify(body);
      if (res.status === 202 || res.status === 200) {
        pushUpdate(payload.commandId, cls && cls.kind === 'receipt' ? { receipt: cls.receipt }
          : { admission: cls ? cls.admission : 'unknown', lastReceipt: cls && cls.lastReceipt || null });
        pollCommand(payload.commandId, 40);
        return { commandId: payload.commandId, httpStatus: res.status };
      }
      // 4xx/5xx：broker 明确拒绝
      return { commandId: payload.commandId, httpStatus: res.status, code: body && body.code || 'REJECTED' };
    } catch (e) {
      // 响应丢失/网络错误：broker 可能已接收；不自动重发、不换 ID，允许凭原 ID 查询
      pollCommand(payload.commandId, 6);
      return { commandId: payload.commandId, unknown: true, error: 'POST_UNKNOWN', detail: String((e && e.message) || e) };
    }
  });
  ipcMain.handle('npc:cancel', async (event, p) => {
    if (!trustedSender(event)) return { error: 'FORBIDDEN_SENDER' };
    const payload = validateCancel(p);
    if (!payload) return { error: 'INVALID_CANCEL' };
    try {
      const { res, body } = await postApi('/api/h5a/cancel', payload);
      const cls = classify(body);
      if (res.status === 202 || res.status === 200) {
        pushUpdate(payload.commandId, cls && cls.kind === 'receipt' ? { receipt: cls.receipt }
          : { admission: cls ? cls.admission : 'unknown', lastReceipt: cls && cls.lastReceipt || null });
        pollCommand(payload.commandId, 40);
        return { commandId: payload.commandId, httpStatus: res.status };
      }
      if (res.status === 404) return { commandId: payload.commandId, httpStatus: 404, code: 'UNKNOWN_COMMAND' };
      return { commandId: payload.commandId, httpStatus: res.status, code: body && body.code || 'REJECTED' };
    } catch (e) {
      pollCommand(payload.commandId, 6);
      return { commandId: payload.commandId, unknown: true, error: 'POST_UNKNOWN', detail: String((e && e.message) || e) };
    }
  });
  ipcMain.on('npc:exit', (event) => { if (trustedSender(event)) app.quit(); });
}

async function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 480,
    minHeight: 640,
    show: false,
    backgroundColor: '#111923',
    title: 'AgentRoom（私用预览）',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      session: session.fromPartition('npc-epoch-' + ctx.runtimeId), // 内存分区；新 epoch 隔离旧 cookie
      spellcheck: false
    }
  });
  const ses = win.webContents.session;
  ses.setPermissionRequestHandler((_wc, _perm, cb) => cb(false));
  ses.setPermissionCheckHandler(() => false);
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-attach-webview', (e) => e.preventDefault());
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(ctx.origin + '/') && url !== ctx.origin + '/') e.preventDefault(); // 只允许同源
  });
  win.webContents.on('did-fail-load', (_e, code, desc, url, isMainFrame) => {
    if (isMainFrame) fatalExit(`页面加载失败 (${code}) ${desc}`);
  });
  win.once('ready-to-show', () => { if (win) win.show(); });
  win.on('closed', () => { win = null; });
  await win.loadURL(ctx.origin + '/');
}

// 统一失败边界：先展示错误、停自己的 sidecar，再退出（绝不绕过清理）
async function fatalExit(message) {
  if (quitting) { app.exit(1); return; }
  quitting = true;
  const detail = sidecarErrTail ? '\nsidecar 输出末尾：\n' + sidecarErrTail.slice(-600) : '';
  try { dialog.showErrorBox('AgentRoom', message + detail); } catch {}
  try { if (win) { win.destroy(); win = null; } } catch {}
  try { await stopSidecar(); } catch {}
  app.exit(1);
}

async function stopSidecar() {
  const proc = sidecar;
  sidecar = null;
  if (!proc || proc.exitCode !== null) return;
  try {
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(proc.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    else proc.kill('SIGTERM');
  } catch {}
  await new Promise((resolve) => {
    const timer = setTimeout(() => { try { proc.kill('SIGKILL'); } catch {} resolve(); }, 5000);
    proc.once('exit', () => { clearTimeout(timer); resolve(); });
  });
}

async function boot() {
  registerIpc();
  await startSidecar();
  await waitReady(30000);
  await createWindow();
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.exit(0); // 第二实例直接退出，不 spawn sidecar
} else {
  app.on('second-instance', () => {
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });
  app.whenReady().then(boot).catch((e) => {
    console.error('[boot]', e && e.message);
    fatalExit('启动失败：' + ((e && e.message) || e));
  });
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', (e) => {
    if (quitting) return;
    quitting = true;
    e.preventDefault();
    stopSidecar().finally(() => app.exit(app.exitCode || 0));
  });
  process.on('uncaughtException', (e) => {
    console.error('[uncaught]', e && e.message);
    fatalExit('未捕获异常：' + ((e && e.message) || e));
  });
}
