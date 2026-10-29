'use strict';
/* W3 Onboarding — 配置写入测试（纯 node，无框架、无 Electron、不碰真实 ~/.hermes、~/.dsh）。
 * 覆盖：Hermes 原有键/注释保留 + 幂等；DSH 追加与替换各一次 + 去重；备份存在；
 *       写后重解析成功；非法输入报错且不落盘。运行：node tests/onboarding/test_config.js */
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const YAML = require('yaml');
const { writeHermesConfig } = require('../../agent/config/hermes.js');
const { writeDshConfig, detectDsh } = require('../../agent/config/dsh.js');

const PY = '/tmp/fake-python/bin/python';
const LAUNCH = '/opt/agentroom/agent/mcp/launch.py';
const CONN = '/tmp/fake-state/agentroom/connection.json';

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agentroom-w3-'));
let passed = 0;
const failures = [];

function testCase(name, fn) {
  try { fn(); passed++; console.log('  ✓ ' + name); }
  catch (e) { failures.push({ name, e }); console.log('  ✗ ' + name + ' :: ' + e.message); }
}
function read(p) { return fs.readFileSync(p, 'utf8'); }

try {
  // ---------- Hermes ----------
  console.log('[Hermes config.yaml]');
  const hermesHome = path.join(tmpRoot, 'hermes-home');
  fs.mkdirSync(hermesHome, { recursive: true });
  const hermesOriginal = [
    '# 主配置（注释必须保留）',
    'locale: zh-CN',
    'log_level: info',
    'mcp_servers:',
    '  filesystem:',
    '    command: /usr/bin/filesystem-mcp',
    '    args: ["--root", "/tmp"]',
    ''
  ].join('\n');
  const hermesConfig = path.join(hermesHome, 'config.yaml');
  fs.writeFileSync(hermesConfig, hermesOriginal);

  testCase('首写：agentroom 条目写入，原有键与注释保留，备份存在且内容为原文', () => {
    const r = writeHermesConfig({ home: hermesHome, pythonPath: PY, launchPath: LAUNCH, connectionFile: CONN });
    assert.equal(r.ok, true);
    assert.equal(r.changed, true);
    assert.ok(r.backup && fs.existsSync(r.backup), '备份文件应存在');
    assert.equal(read(r.backup), hermesOriginal, '备份内容应为原文');
    const doc = YAML.parse(read(hermesConfig));
    assert.equal(doc.locale, 'zh-CN');
    assert.equal(doc.log_level, 'info');
    assert.deepEqual(doc.mcp_servers.filesystem, { command: '/usr/bin/filesystem-mcp', args: ['--root', '/tmp'] });
    assert.deepEqual(doc.mcp_servers.agentroom, {
      command: PY, args: [LAUNCH],
      env: { AGENTROOM_CONNECTION_FILE: CONN },
      timeout: 30, connect_timeout: 30
    });
    assert.ok(read(hermesConfig).includes('# 主配置（注释必须保留）'), '注释应保留');
  });

  testCase('幂等：同参数重写 changed=false，无新备份', () => {
    const before = fs.readdirSync(hermesHome).filter((f) => f.startsWith('config.yaml.bak'));
    const r = writeHermesConfig({ home: hermesHome, pythonPath: PY, launchPath: LAUNCH, connectionFile: CONN });
    assert.equal(r.changed, false);
    assert.equal(r.backup, null);
    const after = fs.readdirSync(hermesHome).filter((f) => f.startsWith('config.yaml.bak'));
    assert.deepEqual(after, before, '不应产生新备份');
  });

  testCase('重建：换 pythonPath 后条目被替换且其余键仍在', () => {
    const r = writeHermesConfig({ home: hermesHome, pythonPath: PY + '2', launchPath: LAUNCH, connectionFile: CONN });
    assert.equal(r.changed, true);
    const doc = YAML.parse(read(hermesConfig));
    assert.equal(doc.mcp_servers.agentroom.command, PY + '2');
    assert.equal(doc.locale, 'zh-CN');
    assert.ok(doc.mcp_servers.filesystem);
  });

  testCase('新建：config.yaml 不存在时创建且可解析', () => {
    const fresh = path.join(tmpRoot, 'hermes-fresh');
    const r = writeHermesConfig({ home: fresh, pythonPath: PY, launchPath: LAUNCH, connectionFile: CONN });
    assert.equal(r.changed, true);
    const doc = YAML.parse(read(path.join(fresh, 'config.yaml')));
    assert.equal(doc.mcp_servers.agentroom.command, PY);
  });

  testCase('非法输入：相对路径/空值报错，不产生备份', () => {
    const before = fs.readdirSync(hermesHome);
    assert.throws(() => writeHermesConfig({ home: hermesHome, pythonPath: 'python3', launchPath: LAUNCH, connectionFile: CONN }), /绝对路径/);
    assert.throws(() => writeHermesConfig({ home: hermesHome, pythonPath: PY, launchPath: '', connectionFile: CONN }), /非空字符串/);
    assert.throws(() => writeHermesConfig({ home: hermesHome, pythonPath: PY, launchPath: LAUNCH, connectionFile: CONN, home: undefined }), /home/);
    assert.deepEqual(fs.readdirSync(hermesHome), before, '失败调用不得改动目录');
  });

  testCase('损坏 YAML：报错且原文件原样保留', () => {
    const brokenHome = path.join(tmpRoot, 'hermes-broken');
    fs.mkdirSync(brokenHome, { recursive: true });
    const broken = 'a: [1, 2\nb: }{';
    fs.writeFileSync(path.join(brokenHome, 'config.yaml'), broken);
    assert.throws(() => writeHermesConfig({ home: brokenHome, pythonPath: PY, launchPath: LAUNCH, connectionFile: CONN }), /解析失败/);
    assert.equal(read(path.join(brokenHome, 'config.yaml')), broken, '原文件不得被改动');
    assert.equal(fs.readdirSync(brokenHome).filter((f) => f.includes('.bak.')).length, 0, '不得产生备份');
  });

  // ---------- DSH ----------
  console.log('[DSH cordis.patch.yml]');
  const dshHome = path.join(tmpRoot, 'dsh-home');
  const profile = 'default';
  const patchDir = path.join(dshHome, 'profiles', profile);
  const patchPath = path.join(patchDir, 'cordis.patch.yml');
  fs.mkdirSync(patchDir, { recursive: true });
  const dshOriginal = [
    '# DSH cordis patch（注释必须保留）',
    '- id: mcp-filesystem',
    '  name: \'@deepseek-ai/dsh-mcp-client\'',
    '  config:',
    '    serverName: filesystem',
    '    transport: stdio',
    '    command: /usr/bin/filesystem-mcp',
    '    args: []'
  ].join('\n');
  fs.writeFileSync(patchPath, dshOriginal);

  testCase('detectDsh：profiles/ 存在且列出子目录 profile', () => {
    const d = detectDsh(dshHome);
    assert.equal(d.present, true);
    assert.deepEqual(d.profiles, ['default']);
    const missing = detectDsh(path.join(tmpRoot, 'dsh-missing'));
    assert.equal(missing.present, false);
    assert.deepEqual(missing.profiles, []);
  });

  testCase('追加：已有 patch 无 mcp-agentroom 时追加到末尾，原条目与注释保留，备份存在', () => {
    const r = writeDshConfig({ dshHome, profile, pythonPath: PY, launchPath: LAUNCH, connectionFile: CONN });
    assert.equal(r.action, 'appended');
    assert.equal(r.changed, true);
    assert.ok(r.backup && fs.existsSync(r.backup));
    assert.equal(read(r.backup), dshOriginal);
    const list = YAML.parse(read(patchPath));
    assert.equal(list.length, 2);
    assert.equal(list[0].id, 'mcp-filesystem');
    assert.equal(list[1].id, 'mcp-agentroom');
    assert.deepEqual(list[1], {
      id: 'mcp-agentroom', name: '@deepseek-ai/dsh-mcp-client',
      config: { serverName: 'agentroom', transport: 'stdio', command: PY, args: [LAUNCH],
                env: { AGENTROOM_CONNECTION_FILE: CONN } }
    });
    assert.ok(read(patchPath).includes('# DSH cordis patch（注释必须保留）'));
  });

  testCase('替换：再次写入替换既有 mcp-agentroom 行（不重复追加），其余条目保留', () => {
    const r = writeDshConfig({ dshHome, profile, pythonPath: PY + 'x', launchPath: LAUNCH, connectionFile: CONN });
    assert.equal(r.action, 'replaced');
    const list = YAML.parse(read(patchPath));
    assert.equal(list.length, 2, '总条目数不变');
    assert.equal(list.filter((it) => it.id === 'mcp-agentroom').length, 1, '恰好一个 mcp-agentroom');
    assert.equal(list[0].id, 'mcp-filesystem');
    assert.equal(list.find((it) => it.id === 'mcp-agentroom').config.command, PY + 'x');
  });

  testCase('幂等：同参数重写 changed=false', () => {
    const before = fs.readdirSync(patchDir).filter((f) => f.startsWith('cordis.patch.yml.bak'));
    const r = writeDshConfig({ dshHome, profile, pythonPath: PY + 'x', launchPath: LAUNCH, connectionFile: CONN });
    assert.equal(r.changed, false);
    const after = fs.readdirSync(patchDir).filter((f) => f.startsWith('cordis.patch.yml.bak'));
    assert.deepEqual(after, before);
  });

  testCase('去重：历史遗留重复条目收敛为一个', () => {
    const dup = [
      '- id: mcp-agentroom',
      '  config:',
      '    command: /old/one',
      '- id: mcp-agentroom',
      '  config:',
      '    command: /old/two',
      ''
    ].join('\n');
    fs.writeFileSync(patchPath, dup);
    const r = writeDshConfig({ dshHome, profile, pythonPath: PY, launchPath: LAUNCH, connectionFile: CONN });
    assert.equal(r.action, 'replaced');
    const list = YAML.parse(read(patchPath));
    assert.equal(list.length, 1);
    assert.equal(list[0].config.command, PY);
  });

  testCase('新建：patch 文件与目录都不存在时创建', () => {
    const freshDsh = path.join(tmpRoot, 'dsh-fresh');
    const r = writeDshConfig({ dshHome: freshDsh, profile: 'work', pythonPath: PY, launchPath: LAUNCH, connectionFile: CONN });
    assert.equal(r.action, 'created');
    const list = YAML.parse(read(path.join(freshDsh, 'profiles', 'work', 'cordis.patch.yml')));
    assert.equal(list.length, 1);
    assert.equal(list[0].id, 'mcp-agentroom');
  });

  testCase('非法输入：profile 路径穿越/斜杠/相对路径 python 报错', () => {
    assert.throws(() => writeDshConfig({ dshHome, profile: '../evil', pythonPath: PY, launchPath: LAUNCH, connectionFile: CONN }), /profile/);
    assert.throws(() => writeDshConfig({ dshHome, profile: 'a/b', pythonPath: PY, launchPath: LAUNCH, connectionFile: CONN }), /profile/);
    assert.throws(() => writeDshConfig({ dshHome, profile: '.hidden', pythonPath: PY, launchPath: LAUNCH, connectionFile: CONN }), /profile/);
    assert.throws(() => writeDshConfig({ dshHome, profile, pythonPath: 'py', launchPath: LAUNCH, connectionFile: CONN }), /绝对路径/);
    assert.ok(fs.existsSync(path.join(dshHome, 'profiles', 'default')), '合法 profile 目录不受影响');
  });

  testCase('损坏 patch：报错且原文件保留', () => {
    const broken = '- id: [oops\n';
    fs.writeFileSync(patchPath, broken);
    assert.throws(() => writeDshConfig({ dshHome, profile, pythonPath: PY, launchPath: LAUNCH, connectionFile: CONN }), /解析失败/);
    assert.equal(read(patchPath), broken);
  });
} finally {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
}

console.log('');
if (failures.length) {
  console.log(`失败 ${failures.length}/${passed + failures.length} 项：`);
  for (const f of failures) console.log('  - ' + f.name + '\n    ' + (f.e.stack || f.e.message).split('\n').slice(0, 3).join('\n    '));
  process.exit(1);
}
console.log(`全部通过：${passed}/${passed} 项 ✓`);
