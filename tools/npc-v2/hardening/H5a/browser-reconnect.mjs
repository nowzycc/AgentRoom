import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import assert from 'node:assert/strict';
import { chromium } from '../../../node_modules/playwright/index.mjs';

const here = new URL('./', import.meta.url);
const config = Object.fromEntries(readFileSync(new URL('.env.local', here), 'utf8').trim().split('\n').map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)]; }));
const id = `reconnect-${Date.now()}-${randomUUID()}`;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const evidence = { status: 'blocked', id, processes: [], errors: [], sources: {}, checks: {} };
for (const file of ['adapter.ts', 'dispatch-time.ts', 'broker.py', 'server.py', 'wire.ts', 'dist/adapter.js', 'browser-reconnect.mjs']) evidence.sources[file] = sha(readFileSync(new URL(file, here)));
const oldRoot = new URL('../../../layout-model-v3/web/', here);
const oldFiles = ['npc-h4b.html', 'harness-preview/scene.html', 'harness-preview/scene-app.js', 'harness-preview/npc-h4a-core.js', 'harness-preview/npc-h4a-worker.js'];
evidence.oldBundles = Object.fromEntries(oldFiles.map(file => [file, sha(readFileSync(new URL(file, oldRoot)))]));
const headers = { Authorization: `Bearer ${config.H5_HARNESS_TOKEN}` };
let service, browser;
const port = async () => { const s = createServer(); await new Promise(resolve => s.listen(0, '127.0.0.1', resolve)); const p = s.address().port; await new Promise(resolve => s.close(resolve)); return p; };
async function start() {
  const base = `http://127.0.0.1:${await port()}`;
  const log = [];
  const child = spawn('python3', [new URL('run.py', here).pathname], { env: { ...process.env, ...config, H5_ORIGIN: base }, stdio: ['ignore', 'ignore', 'pipe'] });
  child.stderr.on('data', bytes => log.push(bytes.toString()));
  const row = { pid: child.pid, base, cmdline: readFileSync(`/proc/${child.pid}/cmdline`, 'utf8').replaceAll('\0', ' ') };
  evidence.processes.push(row);
  service = { child, row, base, log };
  for (let n = 0; n < 80; n++) {
    if (child.exitCode !== null) throw new Error(`service exited ${child.exitCode}`);
    try { const r = await fetch(base + '/api/h5a/capabilities', { headers, signal: AbortSignal.timeout(500) }); if (r.status === 200) { row.probe = await r.json(); return service; } }
    catch (error) { if (!(error instanceof TypeError || error instanceof DOMException)) throw error; }
    await delay(50);
  }
  throw new Error('capabilities readiness timeout');
}
async function stop() {
  if (!service) return;
  const { child, row, base, log } = service;
  const cmdline = readFileSync(`/proc/${child.pid}/cmdline`, 'utf8').replaceAll('\0', ' ');
  assert(cmdline.includes(new URL('run.py', here).pathname));
  const exited = new Promise(resolve => child.once('exit', (code, signal) => resolve({ code, signal })));
  child.kill('SIGTERM');
  row.exit = await Promise.race([exited, delay(8000).then(() => { throw new Error('service stop timeout'); })]);
  row.log = log.join('');
  let listening = true;
  try { await fetch(base + '/api/h5a/capabilities', { headers, signal: AbortSignal.timeout(500) }); }
  catch (error) { if (!(error instanceof TypeError || error instanceof DOMException)) throw error; listening = false; }
  row.listeningAfter = listening;
  assert.equal(listening, false);
  service = null;
}
const read = async (base, path) => { const r = await fetch(`${base}/api/h5a/${path}`, { headers, signal: AbortSignal.timeout(5000) }); return { status: r.status, body: await r.json() }; };
const post = async (base, data) => { const r = await fetch(base + '/api/h5a/commands', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal: AbortSignal.timeout(5000) }); return { status: r.status, body: await r.json() }; };
async function pageAt(base, pair = true) {
  const context = await browser.newContext({ viewport: { width: 1000, height: 800 } });
  await context.addInitScript(() => {
    const Native = window.WebSocket;
    window.WebSocket = class extends Native {
      constructor(...args) {
        super(...args);
        if (String(args[0]).endsWith('/api/h5a/runtime') && !window.__testSocket) {
          window.__testSocket = this;
          this.addEventListener('message', event => { const data = JSON.parse(event.data); if (data.type === 'grant') window.__testGrant = event.data; });
        }
      }
    };
  });
  const page = await context.newPage();
  page.on('pageerror', error => evidence.errors.push(String(error)));
  await page.goto(base);
  await page.waitForFunction(() => window.__h5?.ready, null, { timeout: 90000 });
  await page.evaluate(() => { window.__h5.setManual(true); window.__h5.setRender(false); });
  if (pair) {
    await page.fill('#credential', config.H5_RUNTIME_TOKEN); await page.click('#connect');
    await page.waitForFunction(() => window.__h5.connected(), null, { timeout: 10000 });
  }
  return { context, page };
}
async function rawHello(page, report) {
  return page.evaluate(report => new Promise((resolve, reject) => {
    const ws = new WebSocket(location.origin.replace('http:', 'ws:') + '/api/h5a/runtime');
    const timer = setTimeout(() => { ws.close(); reject(new Error('raw hello timeout')); }, 5000);
    ws.onopen = () => ws.send(JSON.stringify(report));
    ws.onmessage = event => { clearTimeout(timer); const data = JSON.parse(event.data); ws.close(); resolve(data); };
  }), report);
}
try {
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
  const first = await start();
  const a = await pageAt(first.base);
  const b = await pageAt(first.base, false);
  const scope = await a.page.evaluate(() => window.__h5.scope());
  const hello = { apiVersion: 'h5a.1', type: 'hello', worldId: scope.worldId, actorId: scope.actorId, runtimeInstanceId: config.H5_RUNTIME_ID };
  const bPair = await b.page.request.post(first.base + '/api/h5a/pair', { headers: { Origin: first.base, Authorization: `Bearer ${config.H5_RUNTIME_TOKEN}` } });
  evidence.checks.secondRealBrowser = { status: bPair.status(), body: await bPair.json(), diagnostics: await b.page.evaluate(() => window.__h5.diagnostics()) };
  assert.equal(bPair.status(), 409);
  assert.equal(evidence.checks.secondRealBrowser.body.code, 'AUTHORITY_BUSY');
  assert.equal(evidence.checks.secondRealBrowser.diagnostics.calls.filter(c => c.method === 'begin').length, 0);
  evidence.checks.duplicateAttach = await rawHello(a.page, hello);
  assert.equal(evidence.checks.duplicateAttach.code, 'AUTHORITY_BUSY');
  assert.equal((await read(first.base, 'capabilities')).body.available, true);
  const command = { apiVersion: 'h5a.1', scope, commandId: id + '-unknown', type: 'action.request', actionKey: 'lookAround', issuedAtWallMs: Date.now(), ttlMs: 60000 };
  await post(first.base, command);
  await a.page.waitForFunction(() => window.__h5.trace().some(r => r.status === 'accepted'));
  await a.page.evaluate(() => window.__h5.step(.1));
  await a.page.waitForFunction(() => window.__h5.pendingReports() === 0);
  evidence.checks.started = await read(first.base, 'commands/' + command.commandId);
  assert.equal(evidence.checks.started.body.status, 'started');
  // Close the actual browser WS; do not replace the browser/runtime with a fake connection.
  await a.page.evaluate(() => { window.__testSocket.close(1000, 'network-test'); window.__h5.setManual(false); });
  await a.page.waitForFunction(() => !window.__h5.connected() && window.__h5.diagnostics().runtime.action === null);
  evidence.checks.safeExit = await a.page.evaluate(() => ({ status: document.querySelector('#status').textContent, diagnostics: window.__h5.diagnostics() }));
  evidence.checks.unknown = await read(first.base, 'commands/' + command.commandId);
  assert.equal(evidence.checks.unknown.body.delivery, 'unknown'); assert.equal(evidence.checks.unknown.body.execution, null);
  assert.equal(evidence.checks.unknown.body.lastReceipt.status, 'started');
  evidence.checks.retryUnknown = await post(first.base, command);
  assert.deepEqual(evidence.checks.retryUnknown.body, evidence.checks.unknown.body);
  evidence.checks.reconnect = await rawHello(a.page, hello);
  assert.equal(evidence.checks.reconnect.code, 'RESYNC_REQUIRED');
  // Fault injection of an already received renewal: stopped browser cannot revive.
  evidence.checks.lateGrant = await a.page.evaluate(() => {
    window.__testSocket.dispatchEvent(new MessageEvent('message', { data: window.__testGrant }));
    return { connected: window.__h5.connected(), status: document.querySelector('#status').textContent };
  });
  assert.equal(evidence.checks.lateGrant.connected, false);
  const before = evidence.checks.safeExit.diagnostics.calls.filter(c => c.method === 'begin').length;
  await a.page.evaluate(() => window.__h5.step(.2));
  assert.equal(await a.page.evaluate(() => window.__h5.diagnostics().calls.filter(c => c.method === 'begin').length), before);
  evidence.checks.offlineNew = await post(first.base, { ...command, commandId: id + '-blocked', issuedAtWallMs: Date.now() });
  assert.equal(evidence.checks.offlineNew.status, 503);
  assert.equal(await b.page.evaluate(() => window.__h5.connected()), false);
  const oldBoot = first.row.probe.brokerEpoch;
  await a.context.close(); await b.context.close(); // explicit old-page closure and observed quiescence before restart
  await stop();
  const second = await start();
  evidence.checks.staleRead = await read(second.base, `commands/${command.commandId}?brokerEpoch=${oldBoot}`);
  assert.equal(evidence.checks.staleRead.body.code, 'RESYNC_REQUIRED');
  const fresh = await pageAt(second.base);
  const newScope = await fresh.page.evaluate(() => window.__h5.scope());
  assert.notEqual(newScope.authorityEpoch, scope.authorityEpoch);
  evidence.checks.stalePost = await post(second.base, command);
  assert.equal(evidence.checks.stalePost.body.code, 'STALE_AUTHORITY_EPOCH');
  const next = { ...command, scope: newScope, commandId: id + '-fresh', issuedAtWallMs: Date.now() };
  await post(second.base, next);
  await fresh.page.waitForFunction(() => window.__h5.trace().some(r => r.status === 'accepted'));
  await fresh.page.evaluate(() => window.__h5.step(1.6));
  await fresh.page.waitForFunction(() => window.__h5.pendingReports() === 0);
  evidence.checks.recovered = await read(second.base, 'commands/' + next.commandId);
  evidence.checks.recoveredRuntime = await fresh.page.evaluate(() => window.__h5.diagnostics());
  assert.equal(evidence.checks.recovered.body.status, 'succeeded');
  assert(evidence.checks.recoveredRuntime.terminals.some(t => t.attemptId === evidence.checks.recovered.body.attemptId && t.outcome === 'success'));
  // Real old-epoch report over the active authenticated browser socket.
  const oldReport = { apiVersion: 'h5a.1', type: 'report', scope, runtimeInstanceId: config.H5_RUNTIME_ID, reportId: 'old-authority-report', reportSeq: 999, deliveryId: null, data: { apiVersion: 'h5a.1', code: 'INVALID_REQUEST', reason: 'stale test', retryable: false } };
  evidence.checks.oldReport = await fresh.page.evaluate(report => new Promise(resolve => {
    window.__testSocket.addEventListener('message', event => { const data = JSON.parse(event.data); if (data.code) resolve(data); });
    window.__testSocket.send(JSON.stringify(report));
  }), oldReport);
  assert.equal(evidence.checks.oldReport.code, 'STALE_AUTHORITY_EPOCH');
  await fresh.context.close(); await stop();
  // Original H5a.1 regression against a third, fresh loopback broker.
  const regression = await start();
  const run = spawn(process.execPath, [new URL('browser-network.mjs', here).pathname], { env: { ...process.env, H5_ORIGIN: regression.base, H5_HARNESS_TOKEN: config.H5_HARNESS_TOKEN, H5_RUNTIME_TOKEN: config.H5_RUNTIME_TOKEN }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = ''; run.stdout.on('data', b => { output += b; }); run.stderr.on('data', b => { output += b; });
  const exit = await new Promise(resolve => run.once('exit', resolve));
  evidence.checks.h5a1 = { exit, output }; assert.equal(exit, 0, output);
  await stop();
  for (const file of oldFiles) assert.equal(sha(readFileSync(new URL(file, oldRoot))), evidence.oldBundles[file]);
  assert.deepEqual(evidence.errors, []);
  evidence.status = 'ready_for_review';
} catch (error) { evidence.failure = String(error); process.exitCode = 1; }
finally {
  if (browser) await browser.close();
  await stop();
  mkdirSync(new URL('evidence/', here), { recursive: true });
  const path = new URL(`evidence/${id}.json`, here);
  writeFileSync(path, JSON.stringify(evidence, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ path: path.pathname, sha256: sha(readFileSync(path)), status: evidence.status, failure: evidence.failure }));
}
