'use strict';
/* W3 Onboarding — Hermes `config.yaml` 写入器。
 * 契约 CONTRACT-AGENT-V1「Onboarding」节：幂等、先备份、写后重新解析校验。
 * 用 yaml 的 Document API（parseDocument/setIn），只动 `mcp_servers.agentroom`，
 * 尽量保留其余键、注释与空行；文件不存在则新建。
 * 不记录 token（本模块根本不读 connection.json 内容，只写路径）。 */
const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');

const SERVER_KEY = 'agentroom';
const TIMEOUT = 30;          // 契约固定值
const CONNECT_TIMEOUT = 30;

function fail(msg) { throw new Error('[hermes-config] ' + msg); }

function requireAbsolute(label, value) {
  if (typeof value !== 'string' || value.trim() === '') fail(label + ' 必须是非空字符串');
  if (!path.isAbsolute(value)) fail(label + ' 必须是绝对路径: ' + value);
  return value;
}

function stamp(d = new Date()) {
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${p(d.getMilliseconds(), 3)}`;
}

// 结构比较用：键排序后序列化，避免键序差异误报
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((k) => [k, canonical(value[k])]));
  }
  return value;
}

function expectedEntry(pythonPath, launchPath, connectionFile) {
  return {
    command: pythonPath,
    args: [launchPath],
    env: { AGENTROOM_CONNECTION_FILE: connectionFile },
    timeout: TIMEOUT,
    connect_timeout: CONNECT_TIMEOUT
  };
}

/**
 * 写入 `<home>/config.yaml` 的 `mcp_servers.agentroom`。
 * @returns {{ok:true, configPath:string, changed:boolean, backup:string|null,
 *            entry:object}} changed=false 表示内容已一致（幂等，未重写、无新备份）
 */
function writeHermesConfig({ home, pythonPath, launchPath, connectionFile }) {
  if (typeof home !== 'string' || home.trim() === '') fail('home 必须是非空字符串');
  requireAbsolute('pythonPath', pythonPath);
  requireAbsolute('launchPath', launchPath);
  requireAbsolute('connectionFile', connectionFile);

  const dir = path.resolve(home);
  const configPath = path.join(dir, 'config.yaml');
  const existed = fs.existsSync(configPath);
  const original = existed ? fs.readFileSync(configPath, 'utf8') : '';

  let doc;
  if (existed) {
    doc = YAML.parseDocument(original, { keepSourceTokens: true });
    if (doc.errors.length) {
      fail('现有 config.yaml 解析失败，拒绝覆盖（' + String(doc.errors[0]).slice(0, 200) + '）');
    }
    if (doc.contents && doc.contents.constructor.name === 'YAMLSeq') {
      fail('现有 config.yaml 顶层是列表而非映射，拒绝写入');
    }
  } else {
    doc = new YAML.Document();
  }

  let servers = doc.getIn(['mcp_servers']);
  if (servers !== undefined && servers !== null &&
      servers.constructor && servers.constructor.name !== 'YAMLMap') {
    fail('现有 mcp_servers 不是映射，拒绝写入');
  }
  const entry = expectedEntry(pythonPath, launchPath, connectionFile);
  doc.setIn(['mcp_servers', SERVER_KEY], entry); // 路径缺失时自动建映射；其余键/注释保留
  const next = doc.toString();
  if (existed && next === original) {
    return { ok: true, configPath, changed: false, backup: null, entry };
  }

  let backup = null;
  let mode = 0o600;
  if (existed) {
    mode = fs.statSync(configPath).mode & 0o777;
    backup = configPath + '.bak.' + stamp();
    fs.writeFileSync(backup, original, { mode });
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(configPath, next, { mode });

  // 写后重解析校验：strict parse（出错即抛），并断言 agentroom 条目与预期完全一致
  const verifyRoot = YAML.parse(fs.readFileSync(configPath, 'utf8'));
  const verifyEntry = verifyRoot && verifyRoot.mcp_servers && verifyRoot.mcp_servers[SERVER_KEY];
  if (JSON.stringify(canonical(verifyEntry)) !== JSON.stringify(canonical(entry))) {
    fail('写后重解析校验失败：mcp_servers.agentroom 与预期不一致');
  }
  return { ok: true, configPath, changed: true, backup, entry };
}

module.exports = { writeHermesConfig, SERVER_KEY, expectedEntry };
