import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import assert from 'node:assert/strict';
import { chromium } from '../../../node_modules/playwright/index.mjs';
const here = new URL('./', import.meta.url);
const config = Object.fromEntries(readFileSync(new URL('.env.local', here), 'utf8').trim().split('\n').map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)]; }));
const id = `sse-${Date.now()}-${randomUUID()}`, sha = bytes => createHash('sha256').update(bytes).digest('hex');
const evidence = { status: 'blocked', id, errors: [], checks: {}, sources: {}, clients: [], service: null };
for (const file of ['adapter.ts', 'dispatch-time.ts', 'broker.py', 'server.py', 'journal.py', 'read_api.py', 'sse-client.py', 'dist/adapter.js', 'browser-sse.mjs']) evidence.sources[file] = sha(readFileSync(new URL(file, here)));
const headers = { Authorization: `Bearer ${config.H5_HARNESS_TOKEN}` };
const children = [];
let service, browser, base;
function bounded(promise, label, ms = 15000) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label)), ms); })]).finally(() => clearTimeout(timer));
}
async function terminate(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise(resolve => child.once('exit', (code, signal) => resolve({ code, signal })));
  child.kill('SIGTERM'); return bounded(exited, `stop ${child.pid}`, 8000);
}
async function start() {
  const server = createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port; await new Promise(resolve => server.close(resolve)); base = `http://127.0.0.1:${port}`;
  service = spawn('python3', [new URL('run.py', here).pathname], { env: { ...process.env, ...config, H5_ORIGIN: base }, stdio: ['ignore', 'ignore', 'pipe'] });
  const row = evidence.service = { pid: service.pid, base, log: '', cmdline: readFileSync(`/proc/${service.pid}/cmdline`, 'utf8').replaceAll('\0', ' ') };
  service.stderr.on('data', bytes => { row.log += bytes; });
  for (let n = 0; n < 80; n++) {
    assert.equal(service.exitCode, null, row.log);
    try { const r = await fetch(base + '/api/h5a/capabilities', { headers, signal: AbortSignal.timeout(500) }); if (r.ok) { row.probe = await r.json(); return; } }
    catch (error) { if (!(error instanceof TypeError || error instanceof DOMException)) throw error; }
    await delay(50);
  }
  throw new Error('authenticated readiness failed');
}
const get = async path => { const r = await fetch(base + '/api/h5a/' + path, { headers, signal: AbortSignal.timeout(5000) }); return { status: r.status, body: await r.json() }; };
function client(query, last) {
  const child = spawn('python3', [new URL('sse-client.py', here).pathname, base + '/api/h5a/events?' + query], { env: { ...process.env, H5_HARNESS_TOKEN: config.H5_HARNESS_TOKEN, ...(last ? { H5_LAST_EVENT_ID: last } : {}) }, stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(child);
  const row = { pid: child.pid, rows: [], errors: '', closed: false }; evidence.clients.push(row);
  let buffer = '', changed = () => {};
  child.stdout.on('data', bytes => { buffer += bytes; const lines = buffer.split('\n'); buffer = lines.pop(); for (const line of lines) if (line) row.rows.push(JSON.parse(line)); changed(); });
  child.stderr.on('data', bytes => { row.errors += bytes; });
  child.on('exit', (code, signal) => { row.closed = true; row.exit = { code, signal }; changed(); });
  const until = async predicate => {
    while (!predicate(row.rows)) {
      if (row.closed) throw new Error(`client closed early: ${row.errors}`);
      await bounded(new Promise(resolve => { changed = resolve; }), 'SSE event timeout');
    }
    return row.rows;
  };
  return { row, until, stop: () => terminate(child) };
}
try {
  await start();
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
  const page = await browser.newPage(); page.on('pageerror', error => evidence.errors.push(String(error)));
  await page.goto(base); await page.waitForFunction(() => window.__h5?.ready, null, { timeout: 90000 });
  await page.evaluate(() => { window.__h5.setManual(true); window.__h5.setRender(false); });
  await page.fill('#credential', config.H5_RUNTIME_TOKEN); await page.click('#connect');
  await page.waitForFunction(() => window.__h5.connected() && window.__h5.pendingReports() === 0);
  const scope = await page.evaluate(() => window.__h5.scope());
  const scopeQuery = new URLSearchParams({ worldId: scope.worldId, actorId: scope.actorId }).toString();
  const initial = evidence.checks.initial = await get('snapshot?' + scopeQuery);
  assert.equal(initial.status, 200); const epoch = initial.body.brokerEpoch;
  const query = `${scopeQuery}&brokerEpoch=${epoch}&after=${encodeURIComponent(initial.body.cursor)}`;
  // Given snapshot; When a real command/report arrives BEFORE either SSE subscription.
  const command = { apiVersion: 'h5a.1', scope, commandId: id + '-look', type: 'action.request', actionKey: 'lookAround', issuedAtWallMs: Date.now(), ttlMs: 60000 };
  const submitted = await fetch(base + '/api/h5a/commands', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(command), signal: AbortSignal.timeout(5000) });
  assert.equal(submitted.status, 202);
  await page.waitForFunction(() => window.__h5.trace().some(r => r.status === 'accepted') && window.__h5.pendingReports() === 0);
  const a = client(query), b = client(query);
  const matches = (rows, status) => rows.some(r => r.event === 'receipt' && r.data.data.commandId === command.commandId && r.data.data.status === status);
  await Promise.all([a.until(rows => matches(rows, 'accepted')), b.until(rows => matches(rows, 'accepted'))]);
  await page.evaluate(() => window.__h5.step(.1));
  await Promise.all([a.until(rows => matches(rows, 'started')), b.until(rows => matches(rows, 'started'))]);
  const saved = b.row.rows.filter(r => r.id).at(-1).id;
  await b.stop(); // Reader B is really disconnected while the runtime continues.
  await page.evaluate(() => window.__h5.step(1.5));
  await a.until(rows => matches(rows, 'succeeded'));
  await page.waitForFunction(() => window.__h5.pendingReports() === 0);
  evidence.checks.http = await get('commands/' + command.commandId);
  evidence.checks.runtime = await page.evaluate(() => window.__h5.diagnostics());
  const terminal = a.row.rows.find(r => r.event === 'receipt' && r.data.data.status === 'succeeded').data.data;
  assert.deepEqual(terminal, evidence.checks.http.body);
  assert(evidence.checks.runtime.terminals.some(t => t.actionId === terminal.actionId && t.attemptId === terminal.attemptId && t.outcome === 'success'));
  // Last-Event-ID overrides a different valid after, preventing replay of consumed rows.
  const resumed = client(query, saved); await resumed.until(rows => matches(rows, 'succeeded'));
  assert(resumed.row.rows.filter(r => r.id).every(r => Number(r.id.split('/')[1]) > Number(saved.split('/')[1])));
  const merged = [...b.row.rows, ...resumed.row.rows].filter(r => r.id && r.data.data.commandId === command.commandId);
  assert.deepEqual(merged.map(r => r.data.data.status ?? r.data.data.delivery), ['pending', 'accepted', 'started', 'succeeded']);
  assert.equal(new Set(merged.map(r => r.id)).size, merged.length);
  evidence.checks.savedCursor = saved;
  evidence.checks.finalSnapshot = await get('snapshot?' + scopeQuery);
  assert.deepEqual(evidence.checks.finalSnapshot.body.commands[0].result, terminal);
  await Promise.all([a.stop(), resumed.stop()]);
  const stale = client(`${scopeQuery}&brokerEpoch=broker-old&after=broker-old%2F0`);
  await stale.until(rows => rows.some(r => r.event === 'resync_required'));
  await bounded(new Promise(resolve => stale.row.closed ? resolve() : children.at(-1).once('exit', resolve)), 'stale EOF');
  assert.equal(stale.row.rows.filter(r => r.id).length, 0);
  evidence.checks.oldSnapshot = await get(`snapshot?${scopeQuery}&brokerEpoch=broker-old`); assert.equal(evidence.checks.oldSnapshot.status, 409);
  // Cursor at the beginning deliberately replays, proving clients must dedupe persisted IDs.
  const replay = client(query); await replay.until(rows => matches(rows, 'succeeded'));
  assert.equal(replay.row.rows.find(r => r.event === 'receipt' && r.data.data.status === 'succeeded').id, a.row.rows.find(r => r.event === 'receipt' && r.data.data.status === 'succeeded').id);
  await replay.stop();
  assert.deepEqual(evidence.errors, []); evidence.status = 'ready_for_review';
} catch (error) { evidence.failure = String(error); process.exitCode = 1; }
finally {
  for (const child of children) await terminate(child);
  if (browser) await browser.close();
  if (service) {
    assert(readFileSync(`/proc/${service.pid}/cmdline`, 'utf8').includes(new URL('run.py', here).pathname));
    evidence.service.exit = await terminate(service);
    let listening = true;
    try { await fetch(base + '/api/h5a/capabilities', { headers, signal: AbortSignal.timeout(500) }); }
    catch (error) { if (!(error instanceof TypeError || error instanceof DOMException)) throw error; listening = false; }
    evidence.service.listeningAfter = listening; assert.equal(listening, false);
  }
  mkdirSync(new URL('evidence/', here), { recursive: true }); const path = new URL(`evidence/${id}.json`, here);
  writeFileSync(path, JSON.stringify(evidence, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ path: path.pathname, sha256: sha(readFileSync(path)), status: evidence.status, failure: evidence.failure }));
}
