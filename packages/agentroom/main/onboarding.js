'use strict';
/* W3 Onboarding — 接入向导（独立窗口 + 窄 IPC）。
 *
 * registerOnboarding({ ipcMain, app, shell, paths }) → { show, close, window, channels }
 *   - ipcMain/app：由父壳注入（不改 main/main.js，父集成见 ONBOARDING-HANDOFF.md）
 *   - shell：可选 { win, url }（或取值函数）；仅用于把向导设为主壳窗口的子窗口（视觉关联）。
 *   - paths：可选 { pythonPath, launchPath, connectionFile, skillInstaller, agentRoot,
 *             hermesHome, dshHome }；缺省按契约路径推导。
 *
 * 信任边界：向导 IPC 只接受「向导窗口自身主框架」且 frame.url 逐字符等于向导页面的
 * file:// URL（同父壳 trustedSender 的严格程度）。不记录 token；所有错误/输出先脱敏再截 400 字。
 * 连通测试：直接 spawn MCP 启动器（launch.py），initialize → tools/list，断言 7 个工具名。 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawn, spawnSync } = require('node:child_process');
// 打包后 main/ 在 app.asar 内，而 agent/ 在 app.asar.unpacked：不能用相对
// require，必须按运行时传入的 agentRoot 绝对路径加载。
let configCache = null;
function config(agentRoot) {
  if (!configCache || configCache.root !== agentRoot) {
    const dir = path.join(agentRoot, 'agent', 'config');
    configCache = {
      root: agentRoot,
      hermes: require(path.join(dir, 'hermes.js')),
      dsh: require(path.join(dir, 'dsh.js'))
    };
  }
  return configCache;
}

let BrowserWindow = null;
try { BrowserWindow = require('electron').BrowserWindow || null; } catch { /* 非 Electron 环境 */ }

const CHANNELS = ['agentroom:onboarding:state', 'agentroom:onboarding:install', 'agentroom:onboarding:test', 'agentroom:onboarding:close'];
// 与 packages/npc-mcp/src/npc_mcp/server.py DESCRIPTIONS 一致（7 工具，顺序不敏感）
const EXPECTED_TOOLS = ['npc_capabilities', 'npc_snapshot', 'npc_publish_observations', 'npc_request_action', 'npc_request_goal', 'npc_query_receipt', 'npc_cancel'];
const PROTOCOL_VERSION = '2025-06-18';
const ERR_MAX = 400;

let active = null; // 单例：重复 register 返回同一句柄

/* ---------- 工具 ---------- */
function sanitize(text) {
  let s = String(text == null ? '' : text);
  s = s.replace(/"(harnessToken|runtimeToken)"\s*:\s*"[^"]*"/g, '"$1":"[已脱敏]"');
  s = s.replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]{8,}/gi, '$1[已脱敏]');
  s = s.replace(/((?:harness|runtime|access)?[Tt]oken[=:]\s*)[A-Za-z0-9._~+/=-]{12,}/g, '$1[已脱敏]');
  return s;
}
function tail400(text) {
  const s = sanitize(text);
  return s.length > ERR_MAX ? s.slice(-ERR_MAX) : s;
}
function errText(e) { return tail400((e && e.message) || String(e)); }
function exists(p) { try { return !!p && fs.existsSync(p); } catch { return false; } }

/* ---------- 路径解析（缺省与父壳/契约一致） ---------- */
function defaultConnectionFile() {
  if (process.platform === 'win32') {
    const base = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    return path.join(base, 'AgentRoom', 'connection.json');
  }
  const base = process.env.XDG_STATE_HOME || path.join(os.homedir(), '.local', 'state');
  return path.join(base, 'agentroom', 'connection.json');
}
function resolvePaths(paths = {}) {
  const agentRoot = paths.agentRoot ? path.resolve(paths.agentRoot) : path.resolve(__dirname, '..');
  const p = {
    agentRoot,
    launchPath: paths.launchPath || path.join(agentRoot, 'agent', 'mcp', 'launch.py'),
    skillInstaller: paths.skillInstaller || path.join(agentRoot, 'agent', 'install', 'install_skill.py'),
    connectionFile: paths.connectionFile || defaultConnectionFile(),
    hermesHome: paths.hermesHome || process.env.HERMES_HOME || path.join(os.homedir(), '.hermes'),
    dshHome: paths.dshHome || process.env.DSH_HOME || path.join(os.homedir(), '.dsh'),
    pythonPath: paths.pythonPath
  };
  if (!p.pythonPath) {
    if (process.platform === 'win32') {
      const bundled = path.join(agentRoot, 'backend', 'runtime', 'python', 'python.exe');
      p.pythonPath = exists(bundled) ? bundled : 'python.exe';
    } else if (process.env.NPC_SIDECAR_PYTHON) {
      p.pythonPath = process.env.NPC_SIDECAR_PYTHON;
    } else {
      const marker = path.join(agentRoot, 'backend', 'python-linux.path');
      let markerPython = '';
      try { markerPython = fs.readFileSync(marker, 'utf8').trim(); } catch { /* 无标记文件 */ }
      p.pythonPath = (markerPython && exists(markerPython)) ? markerPython : 'python3';
    }
  }
  return p;
}

let pythonCheckCache = null; // 裸命令（python3）的可用性只探一次
function pythonFound(pythonPath) {
  if (exists(pythonPath)) return true;
  if (path.isAbsolute(pythonPath)) return false;
  if (pythonCheckCache === null) {
    const r = spawnSync(pythonPath, ['--version'], { timeout: 5000, windowsHide: true });
    pythonCheckCache = !r.error;
  }
  return pythonCheckCache;
}

/* ---------- MCP stdio 握手（连通测试） ---------- */
function mcpProbe({ pythonPath, launchPath, connectionFile }) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    let stderrTail = '';
    let buffer = '';
    let child = null;
    let settled = false;
    let waiters = new Map(); // id -> resolve
    let nextTimer = null;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(nextTimer);
      waiters.clear();
      try { if (child) { child.removeAllListeners('exit'); child.kill('SIGTERM'); } } catch { /* 已退出 */ }
      setTimeout(() => { try { if (child && child.exitCode === null) child.kill('SIGKILL'); } catch { /* 已退出 */ } }, 2000);
      resolve({ ...result, durationMs: Date.now() - startedAt, stderr: tail400(stderrTail) });
    };

    const fail = (stage, message) => finish({ ok: false, stage, error: tail400(message) });

    try {
      child = spawn(pythonPath, [launchPath, '--connection-file', connectionFile], {
        cwd: path.dirname(launchPath),
        env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8', PYTHONUNBUFFERED: '1' },
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true
      });
    } catch (e) { return fail('spawn', errText(e)); }

    child.on('error', (e) => fail('spawn', errText(e)));
    child.stderr.on('data', (c) => { stderrTail = (stderrTail + c.toString('utf8')).slice(-4000); });
    child.on('exit', (code) => {
      if (!settled) fail('exit', 'MCP 启动器提前退出 code=' + code + (stderrTail ? '：' + stderrTail.slice(-300) : ''));
    });

    const dispatch = (line) => {
      let msg;
      try { msg = JSON.parse(line); } catch { return; } // 非JSON行（启动横幅等）忽略
      if (!msg || typeof msg !== 'object') return;
      if (msg.id !== undefined && waiters.has(msg.id)) {
        const w = waiters.get(msg.id);
        waiters.delete(msg.id);
        w(msg);
      }
    };
    child.stdout.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      let idx;
      while ((idx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (line) dispatch(line);
      }
    });

    const request = (id, method, params, timeoutMs, stage) => new Promise((resolveReq, rejectReq) => {
      const timer = setTimeout(() => {
        waiters.delete(id);
        rejectReq(new Error(stage + ' 超时（' + timeoutMs / 1000 + 's）'));
      }, timeoutMs);
      waiters.set(id, (msg) => {
        clearTimeout(timer);
        if (msg.error) return rejectReq(new Error(stage + ' 失败：' + JSON.stringify(msg.error).slice(0, 200)));
        resolveReq(msg.result);
      });
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    });

    (async () => {
      const init = await request(1, 'initialize', {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: 'agentroom-onboarding', version: '0.1.0' }
      }, 30000, 'initialize');
      if (!init || !init.serverInfo) return fail('initialize', 'initialize 响应缺少 serverInfo');
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
      const listed = await request(2, 'tools/list', {}, 30000, 'tools/list');
      const tools = (listed && Array.isArray(listed.tools) ? listed.tools : []).map((t) => t && t.name).filter(Boolean);
      const missing = EXPECTED_TOOLS.filter((n) => !tools.includes(n));
      const extra = tools.filter((n) => !EXPECTED_TOOLS.includes(n));
      const ok = missing.length === 0 && tools.length === EXPECTED_TOOLS.length;
      return finish({ ok, stage: ok ? 'done' : 'tools', tools, expected: EXPECTED_TOOLS, missing, extra });
    })().catch((e) => fail('handshake', errText(e)));
  });
}

/* ---------- 注册入口 ---------- */
function registerOnboarding({ ipcMain, app, shell, paths } = {}) {
  if (!ipcMain) throw new Error('[onboarding] 必须注入 ipcMain');
  if (active) return active;

  const P = resolvePaths(paths || {});
  const htmlPath = path.resolve(__dirname, '..', 'renderer', 'onboarding.html');
  const preloadPath = path.resolve(__dirname, '..', 'renderer', 'onboarding.preload.js');
  const pageUrl = pathToFileURL(htmlPath).toString(); // 信任边界：逐字符比较的精确壳 URL

  let wizard = null;

  const shellWin = () => {
    try {
      if (!shell) return null;
      const w = typeof shell === 'function' ? shell() : (typeof shell.win === 'function' ? shell.win() : shell.win);
      return (w && !w.isDestroyed && !w.isDestroyed()) ? w : null;
    } catch { return null; }
  };

  function markerFile() {
    try { return path.join(app.getPath('userData'), 'onboarding-completed.json'); }
    catch { return null; }
  }
  const firstRunPending = () => {
    const m = markerFile();
    return !m || !exists(m);
  };
  const markDone = () => {
    const m = markerFile();
    if (!m) return;
    try { fs.mkdirSync(path.dirname(m), { recursive: true }); fs.writeFileSync(m, JSON.stringify({ completedAt: new Date().toISOString() })); } catch { /* 尽力而为 */ }
  };

  function show() {
    if (!BrowserWindow) throw new Error('[onboarding] BrowserWindow 不可用（非 Electron 主进程？）');
    if (wizard && !wizard.isDestroyed()) { wizard.show(); wizard.focus(); return wizard; }
    const parent = shellWin();
    wizard = new BrowserWindow({
      width: 760,
      height: 660,
      minWidth: 640,
      minHeight: 520,
      show: false,
      title: 'AgentRoom 接入设置',
      backgroundColor: '#111923',
      autoHideMenuBar: true,
      ...(parent ? { parent } : {}),
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        session: require('electron').session.fromPartition('agentroom-onboarding'), // 内存分区
        spellcheck: false
      }
    });
    const ses = wizard.webContents.session;
    ses.setPermissionRequestHandler((_wc, _perm, cb) => cb(false));
    ses.setPermissionCheckHandler(() => false);
    wizard.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    wizard.webContents.on('will-attach-webview', (e) => e.preventDefault());
    wizard.webContents.on('will-navigate', (e) => e.preventDefault()); // 静态页，禁止任何跳转
    wizard.on('closed', () => { wizard = null; markDone(); });
    wizard.once('ready-to-show', () => { if (wizard) wizard.show(); });
    wizard.loadURL(pageUrl).catch((e) => {
      // 页面缺失属装配错误：直接报出来，不带任何凭据
      const { dialog } = require('electron');
      dialog.showErrorBox('AgentRoom 接入设置', '向导页面加载失败：' + errText(e));
    });
    return wizard;
  }

  /* ---------- IPC ---------- */
  function trusted(event) {
    if (!wizard || wizard.isDestroyed()) return false;
    if (event.sender !== wizard.webContents) return false;
    const frame = event.senderFrame;
    if (!frame || frame.parent !== null) return false;           // 只接受主框架
    if (frame !== wizard.webContents.mainFrame) return false;    // === 主框架本身
    return frame.url === pageUrl;                                // 精确等于壳 URL
  }

  function onState() {
    const dsh = config(P.agentRoot).dsh.detectDsh(P.dshHome);
    return {
      ok: true,
      python: { path: P.pythonPath, found: pythonFound(P.pythonPath) },
      launch: { path: P.launchPath, found: exists(P.launchPath) },
      connection: { path: P.connectionFile, found: exists(P.connectionFile) },
      skillInstaller: { path: P.skillInstaller, found: exists(P.skillInstaller) },
      hermes: { home: P.hermesHome, configPath: path.join(P.hermesHome, 'config.yaml'), detected: exists(P.hermesHome) },
      dsh: { home: dsh.home, profilesDir: dsh.profilesDir, detected: dsh.present, profiles: dsh.profiles }
    };
  }

  function runSkillInstall(agent, root) {
    if (!exists(P.skillInstaller)) {
      return { ok: false, error: 'Skill 安装器不存在（W2 未交付或路径未装配）: ' + P.skillInstaller };
    }
    let r;
    try {
      r = spawnSync(P.pythonPath, [P.skillInstaller, '--agent', agent, '--root', root],
        { encoding: 'utf8', timeout: 120000, windowsHide: true });
    } catch (e) { return { ok: false, error: errText(e) }; }
    if (r.error) return { ok: false, error: errText(r.error) };
    const out = tail400([r.stdout, r.stderr].filter(Boolean).join('\n'));
    if (r.status !== 0) return { ok: false, error: out || ('安装器退出 code=' + r.status) };
    return { ok: true, output: out };
  }

  function onInstall(payload) {
    const agents = Array.isArray(payload && payload.agents) ? payload.agents : [];
    if (!agents.length || agents.some((a) => a !== 'hermes' && a !== 'dsh')) {
      return { ok: false, error: 'agents 必须是 ["hermes","dsh"] 的非空子集' };
    }
    let profile = 'default';
    if (payload.profile != null) {
      if (typeof payload.profile !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(payload.profile)) {
        return { ok: false, error: 'profile 非法: ' + String(payload.profile).slice(0, 64) };
      }
      profile = payload.profile;
    }
    let cfg;
    try { cfg = config(P.agentRoot); }
    catch (e) { return { ok: false, error: '加载配置模块失败: ' + errText(e) }; }
    const result = { ok: true, agents: {} };
    for (const agent of agents) {
      const item = { config: null, skill: null, error: null };
      try {
        if (agent === 'hermes') {
          item.config = cfg.hermes.writeHermesConfig({ home: P.hermesHome, pythonPath: P.pythonPath, launchPath: P.launchPath, connectionFile: P.connectionFile });
          item.skill = runSkillInstall('hermes', P.hermesHome);
        } else {
          item.config = cfg.dsh.writeDshConfig({ dshHome: P.dshHome, profile, pythonPath: P.pythonPath, launchPath: P.launchPath, connectionFile: P.connectionFile });
          item.skill = runSkillInstall('dsh', P.dshHome);
        }
      } catch (e) { item.error = errText(e); }
      if (item.error || (item.skill && !item.skill.ok)) result.ok = false;
      result.agents[agent] = item;
    }
    return result;
  }

  async function onTest() {
    if (!exists(P.launchPath)) {
      return { ok: false, stage: 'precheck', error: 'MCP 启动器不存在: ' + P.launchPath, expected: EXPECTED_TOOLS };
    }
    if (!pythonFound(P.pythonPath)) {
      return { ok: false, stage: 'precheck', error: 'Python 不可用: ' + P.pythonPath, expected: EXPECTED_TOOLS };
    }
    if (!exists(P.connectionFile)) {
      return { ok: false, stage: 'precheck', error: 'connection.json 不存在（桌面壳未运行或尚未就绪）: ' + P.connectionFile, expected: EXPECTED_TOOLS };
    }
    return mcpProbe({ pythonPath: P.pythonPath, launchPath: P.launchPath, connectionFile: P.connectionFile });
  }

  ipcMain.handle('agentroom:onboarding:state', (event) => (trusted(event) ? onState() : { ok: false, error: 'FORBIDDEN_SENDER' }));
  ipcMain.handle('agentroom:onboarding:install', (event, payload) => (trusted(event) ? onInstall(payload) : { ok: false, error: 'FORBIDDEN_SENDER' }));
  ipcMain.handle('agentroom:onboarding:test', (event) => (trusted(event) ? onTest() : { ok: false, error: 'FORBIDDEN_SENDER' }));
  ipcMain.on('agentroom:onboarding:close', (event) => { if (trusted(event) && wizard) wizard.close(); });

  active = {
    show,
    close: () => { if (wizard && !wizard.isDestroyed()) wizard.close(); },
    window: () => wizard,
    channels: CHANNELS
  };
  // 首次启动自动显示；之后从菜单「接入设置」重开（父壳调用 handle.show()）
  if (app) {
    if (firstRunPending()) {
      if (app.isReady()) show();
      else app.whenReady().then(show).catch(() => {});
    }
  }
  return active;
}

module.exports = { registerOnboarding, EXPECTED_TOOLS, sanitize, tail400 };
