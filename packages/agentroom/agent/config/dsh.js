'use strict';
/* W3 Onboarding — DSH `profiles/<profile>/cordis.patch.yml` 写入器。
 * 契约 CONTRACT-AGENT-V1「Onboarding」节：幂等、先备份、写后重新解析校验。
 * 已存在 `id: mcp-agentroom` 条目则整体替换该项（多余重复项去重），否则追加到列表末尾；
 * 文件不存在则新建（顶层为补丁条目列表）。其余条目/注释尽量原样保留。
 * 不记录 token（只写 connection.json 的路径）。 */
const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');

const ENTRY_ID = 'mcp-agentroom';

function fail(msg) { throw new Error('[dsh-config] ' + msg); }

function requireAbsolute(label, value) {
  if (typeof value !== 'string' || value.trim() === '') fail(label + ' 必须是非空字符串');
  if (!path.isAbsolute(value)) fail(label + ' 必须是绝对路径: ' + value);
  return value;
}

function stamp(d = new Date()) {
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${p(d.getMilliseconds(), 3)}`;
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((k) => [k, canonical(value[k])]));
  }
  return value;
}

function expectedEntry(pythonPath, launchPath, connectionFile) {
  return {
    id: ENTRY_ID,
    name: '@deepseek-ai/dsh-mcp-client',
    config: {
      serverName: 'agentroom',
      transport: 'stdio',
      command: pythonPath,
      args: [launchPath],
      env: { AGENTROOM_CONNECTION_FILE: connectionFile }
    }
  };
}

/**
 * DSH 安装探测：`profiles/` 是否存在 + 可用 profile 列表（其下的子目录）。
 * @returns {{home:string, profilesDir:string, present:boolean, profiles:string[]}}
 */
function detectDsh(dshHome) {
  if (typeof dshHome !== 'string' || dshHome.trim() === '') fail('dshHome 必须是非空字符串');
  const home = path.resolve(dshHome);
  const profilesDir = path.join(home, 'profiles');
  let present = false;
  let profiles = [];
  try {
    const st = fs.statSync(profilesDir);
    if (st.isDirectory()) {
      present = true;
      profiles = fs.readdirSync(profilesDir, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort();
    }
  } catch { /* 不存在 → present=false */ }
  return { home, profilesDir, present, profiles };
}

/**
 * 写入 `<dshHome>/profiles/<profile>/cordis.patch.yml`。
 * @returns {{ok:true, configPath:string, changed:boolean, backup:string|null,
 *            action:'created'|'replaced'|'appended', entry:object, total:number}}
 */
function writeDshConfig({ dshHome, profile, pythonPath, launchPath, connectionFile }) {
  if (typeof dshHome !== 'string' || dshHome.trim() === '') fail('dshHome 必须是非空字符串');
  if (typeof profile !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(profile)) {
    fail('profile 非法（仅限字母/数字/._-，不以点开头，≤64 字符）: ' + String(profile));
  }
  requireAbsolute('pythonPath', pythonPath);
  requireAbsolute('launchPath', launchPath);
  requireAbsolute('connectionFile', connectionFile);

  const home = path.resolve(dshHome);
  const profileDir = path.join(home, 'profiles', profile);
  const configPath = path.join(profileDir, 'cordis.patch.yml');
  const existed = fs.existsSync(configPath);
  const original = existed ? fs.readFileSync(configPath, 'utf8') : '';

  const entry = expectedEntry(pythonPath, launchPath, connectionFile);
  let doc;
  let action;
  if (existed) {
    doc = YAML.parseDocument(original, { keepSourceTokens: true });
    if (doc.errors.length) {
      fail('现有 cordis.patch.yml 解析失败，拒绝覆盖（' + String(doc.errors[0]).slice(0, 200) + '）');
    }
    if (!doc.contents || doc.contents.constructor.name !== 'YAMLSeq') {
      fail('现有 cordis.patch.yml 顶层必须是列表');
    }
    const matches = [];
    doc.contents.items.forEach((item, idx) => {
      const isMap = item && item.constructor && item.constructor.name === 'YAMLMap';
      if (isMap && item.get('id') === ENTRY_ID) matches.push(idx);
    });
    if (matches.length > 0) {
      action = 'replaced';
      doc.set(matches[0], entry);           // 首个匹配整体替换
      for (let i = matches.length - 1; i >= 1; i--) doc.delete(matches[i]); // 重复项去重
    } else {
      action = 'appended';
      doc.add(entry);
    }
  } else {
    doc = new YAML.Document([entry]);
    action = 'created';
  }

  const next = doc.toString();
  if (existed && next === original) {
    return { ok: true, configPath, changed: false, backup: null, action, entry,
             total: YAML.parse(next).length };
  }

  let backup = null;
  fs.mkdirSync(profileDir, { recursive: true });
  if (existed) {
    const mode = fs.statSync(configPath).mode & 0o777;
    backup = configPath + '.bak.' + stamp();
    fs.writeFileSync(backup, original, { mode });
  }
  fs.writeFileSync(configPath, next, { mode: 0o600 });

  // 写后重解析校验：严格解析 + 恰好一个 mcp-agentroom 条目且与预期一致
  const verify = YAML.parse(fs.readFileSync(configPath, 'utf8'));
  if (!Array.isArray(verify)) fail('写后重解析校验失败：顶层不是列表');
  const ours = verify.filter((it) => it && typeof it === 'object' && it.id === ENTRY_ID);
  if (ours.length !== 1) fail('写后重解析校验失败：mcp-agentroom 条目数=' + ours.length);
  if (JSON.stringify(canonical(ours[0])) !== JSON.stringify(canonical(entry))) {
    fail('写后重解析校验失败：mcp-agentroom 条目与预期不一致');
  }
  return { ok: true, configPath, changed: true, backup, action, entry, total: verify.length };
}

module.exports = { writeDshConfig, detectDsh, ENTRY_ID, expectedEntry };
