'use strict';
/* W3 Onboarding — DSH `profiles/<profile>/cordis.patch.yml` 写入器。
 *
 * DSH 的 patch 层不是「往条目列表末尾追加一个条目」：patch 项默认按 `id`
 * 定位已存在的条目做覆盖；要新增插件必须在 patch 项里用 `insert: [...]`
 * （见 @deepseek-ai/dsh-app-boot 的 applyEntryPatches）。写成
 * `- id: mcp-agentroom` 只会得到 "patch: entry not found" 并被静默跳过。
 *
 * 本写入器保证：
 * - 幂等：重复执行只有一份生效的 mcp-agentroom；
 * - 兼容旧错误形状：顶层 `- id: mcp-agentroom` 会被清掉；
 * - 保留其余 patch 项与注释；
 * - 写前备份、写后重新解析校验。
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

/** 把 patch 列表展开成真正会生效的条目（insert 展开，其余项自身）。 */
function flattenEntries(patches) {
  const out = [];
  for (const item of patches) {
    if (item && typeof item === 'object' && Array.isArray(item.insert)) out.push(...item.insert);
    else if (item && typeof item === 'object') out.push(item);
  }
  return out;
}

function findOurEntries(patches) {
  return flattenEntries(patches).filter((it) => it && typeof it === 'object' && it.id === ENTRY_ID);
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

function isMap(node) {
  return !!node && node.constructor && node.constructor.name === 'YAMLMap';
}

/** 在 doc 中就地替换/清理我们的条目；返回是否找到了旧条目。 */
function spliceOurEntry(doc, entry) {
  let found = false;
  const items = doc.contents.items;
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    if (!isMap(item)) continue;

    // 旧错误形状：顶层 `- id: mcp-agentroom ...`，DSH 会当作无效 patch 跳过。
    // 原地改写成 insert patch，既纠正形状又不丢位置。
    if (item.get('id') === ENTRY_ID) {
      if (found) {
        doc.delete(i);
      } else {
        items[i] = doc.createNode({ insert: [entry] });
        found = true;
      }
      continue;
    }

    const insert = item.get('insert');
    if (!insert || !Array.isArray(insert.items)) continue;

    // 在 insert 数组里找我们的条目：首个替换，其余删除。
    for (let j = insert.items.length - 1; j >= 0; j--) {
      const child = insert.items[j];
      if (!isMap(child) || child.get('id') !== ENTRY_ID) continue;
      if (found) {
        insert.items.splice(j, 1);
      } else {
        insert.items[j] = doc.createNode(entry);
        found = true;
      }
    }
    if (insert.items.length === 0) doc.delete(i);
  }
  return found;
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
    if (spliceOurEntry(doc, entry)) {
      action = 'replaced';
    } else {
      action = 'appended';
      doc.add({ insert: [entry] });
    }
    // 兜底：任何编辑路径都必须留下恰好一份生效条目。
    if (findOurEntries(YAML.parse(doc.toString())).length === 0) {
      doc.add({ insert: [entry] });
    }
  } else {
    doc = new YAML.Document([{ insert: [entry] }]);
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

  // 写后重解析校验：严格解析 + 恰好一个生效的 mcp-agentroom 条目且与预期一致。
  const verify = YAML.parse(fs.readFileSync(configPath, 'utf8'));
  if (!Array.isArray(verify)) fail('写后重解析校验失败：顶层不是列表');
  const ours = findOurEntries(verify);
  if (ours.length !== 1) fail('写后重解析校验失败：生效的 mcp-agentroom 条目数=' + ours.length);
  if (JSON.stringify(canonical(ours[0])) !== JSON.stringify(canonical(entry))) {
    fail('写后重解析校验失败：mcp-agentroom 条目与预期不一致');
  }
  return { ok: true, configPath, changed: true, backup, action, entry, total: verify.length };
}

module.exports = { writeDshConfig, detectDsh, ENTRY_ID, expectedEntry, flattenEntries };
