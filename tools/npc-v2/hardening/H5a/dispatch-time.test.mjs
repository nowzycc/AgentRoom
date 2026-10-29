import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from '../../../../packages/npc-three/node_modules/esbuild/lib/main.js';
const result = await build({ stdin: { contents: `export { runtimeRequest, reportTimeMs } from './dispatch-time.ts'; export { reportValid } from './wire.ts'; export { SingleActionLedger } from '../../../../packages/npc-core/src/runtime/single-action.ts';`, resolveDir: new URL('./', import.meta.url).pathname }, bundle: true, write: false, platform: 'node', format: 'esm' });
const { runtimeRequest, reportTimeMs, reportValid, SingleActionLedger } = await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
const unix = 1793183449000;
const command = { commandId: 'network-clock', actionKey: 'lookAround', issuedAtWallMs: unix, ttlMs: 1000 };
test('Unix dispatch reaches the existing relative-clock ledger without becoming a future request', () => {
  const context = { nowWallMs: 250, refusal: null };
  const raw = new SingleActionLedger().accept({ requestId: command.commandId, actionKey: command.actionKey, issuedAtWallMs: command.issuedAtWallMs, ttlMs: command.ttlMs }, context);
  assert.equal(raw.reason, 'INVALID_ACTION_TIME');
  const mapped = runtimeRequest(command, unix + 150, context.nowWallMs);
  const ledger = new SingleActionLedger();
  assert.equal(ledger.accept(mapped, context).status, 'accepted');
  assert.equal(mapped.issuedAtWallMs + mapped.ttlMs, 1100, 'only 850ms remains; transport must not renew TTL');
  assert.equal(ledger.accept(mapped, context), ledger.receipt(command.commandId), 'immutable mapped request stays idempotent');
});
test('working observation fractional scene clock serializes as integer milliseconds without weakening schema', () => {
  const scope = { worldId: 'apartment-v3', actorId: 'npc-a', authorityEpoch: 'test-epoch' };
  const snapshot = { apiVersion: 'h5a.1', scope, cursor: 'broker-test/0', runtimeInstanceId: 'runtime-test', connection: 'online', observation: { state: 'working', sourceEpoch: 'source-test', source: 'fake:h4a', sessionId: 'session-h4a', receivedAtWallMs: 1700.000000000002 }, desiredGoal: 'converse', actual: { goalId: 'converse', posture: 'standing', actionId: null, attemptId: null, phase: null }, receipts: [], receiptsComplete: true, historyComplete: false, capturedAtWallMs: unix };
  const report = { apiVersion: 'h5a.1', type: 'report', scope, runtimeInstanceId: 'runtime-test', reportId: 'report-test', reportSeq: 1, deliveryId: null, data: snapshot };
  assert.equal(reportValid(report), false);
  snapshot.observation.receivedAtWallMs = reportTimeMs(snapshot.observation.receivedAtWallMs);
  assert.equal(reportValid(report), true);
  assert.equal(snapshot.observation.receivedAtWallMs, 1700);
  assert.equal(reportTimeMs(null), null);
});
test('future and expired Unix requests are rejected before any runtime call', () => {
  assert.throws(() => runtimeRequest(command, unix - 1, 250), /INVALID_ACTION_TIME/);
  assert.throws(() => runtimeRequest(command, unix + 1000, 250), /TTL_EXPIRED/);
});
