import { describe, expect, it } from 'vitest';
import type { EventEnvelope } from '@npc/contracts';
import { DomainStore } from '../src/domain/store.js';
import { NpcRuntime } from '../src/runtime/npc-runtime.js';
import { SingleActionLedger } from '../src/runtime/single-action.js';
import { FakeMotionAdapter } from '../src/actions/motion.js';
import { planWithGoap } from '../src/planner/goap-core.js';
import { HarnessBridge } from '../src/harness/bridge.js';
import type { HarnessPolicy } from '../src/harness/policy.js';

const policy: HarnessPolicy = {
  source: 'fake', sessionId: 'session', observerId: 'observer', actorId: 'actor',
  heartbeatStaleAfterMs: 100, failureVisibleForMs: 50, goalTtlMs: 10000, manualTtlMs: 10000,
  goals: { unknown: null, disconnected: null, working: 'converse', waiting: 'lookAround', idle: 'idle', error: 'idle' },
};
function fixture() {
  let wall = 1000;
  const store = new DomainStore({ worldId: 'world', actors: ['actor'], wallClock: () => wall, config: { minDwellMs: 0 } });
  const motion = new FakeMotionAdapter();
  const runtime = new NpcRuntime({ store, actorId: 'actor', motion, planner: {
    name: 'goap', terminate() {},
    plan: async request => ({ ...planWithGoap(request), planId: request.planId, actorId: request.actorId, goalId: request.goalId, revision: request.revision }),
  } });
  const bridge = new HarnessBridge(store, policy, {
    withdraw: id => runtime.cancel({ scope: 'goal', targetCommandId: id }), revision: () => runtime.executionRevision,
  });
  const heartbeat: EventEnvelope = { specVersion: '1.0', worldId: 'world', actorId: 'observer', source: 'fake',
    sourceEpoch: 'epoch', sessionId: 'session', sequence: 1, eventId: 'heartbeat', occurredAt: '2001-01-01T00:00:00Z',
    type: 'presence.heartbeat', data: { status: 'alive' } };
  const request = (requestId: string) => ({ requestId, actionKey: 'lookAround', issuedAtWallMs: wall, ttlMs: 10000 });
  return { store, motion, runtime, bridge, heartbeat, request, wall: (value: number) => { wall = value; } };
}

describe('H4 closeout authority boundaries', () => {
  it('carries the executor attempt identity into its terminal', async () => {
    // Given
    const f = fixture(); f.runtime.requestSingleAction(f.request('identity')); f.runtime.step(16);
    const attemptId = f.runtime.singleActionReceipt('identity')?.attemptId;
    // When
    await f.runtime.advance(1400);
    // Then
    expect(attemptId).toBeTypeOf('string');
    expect(f.runtime.singleActionReceipt('identity')?.terminal).toMatchObject({ attemptId });
  });
  it('rejects a stale attempt even when the action id matches', async () => {
    // Given: a real executor terminal, not an invented success fixture.
    const f = fixture(); f.runtime.requestSingleAction(f.request('source')); await f.runtime.advance(1400);
    const terminal = f.runtime.singleActionReceipt('source')?.terminal;
    if (!terminal) throw new Error('Expected source terminal');
    const ledger = new SingleActionLedger();
    ledger.accept(f.request('target'), { nowWallMs: 1000, refusal: null });
    ledger.bind(terminal.actionId, 'new-attempt');
    // When
    const accepted = ledger.finish(terminal);
    // Then
    expect(accepted).toBe(false); expect(ledger.receipt('target')?.terminal).toBeNull();
  });
  it('rejects an old action id even with the current attempt id', async () => {
    // Given
    const f = fixture(); f.runtime.requestSingleAction(f.request('old')); await f.runtime.advance(1400);
    const terminal = f.runtime.singleActionReceipt('old')?.terminal;
    const attemptId = f.runtime.singleActionReceipt('old')?.attemptId;
    if (!terminal || !attemptId) throw new Error('Expected source terminal');
    const ledger = new SingleActionLedger();
    ledger.accept(f.request('target'), { nowWallMs: 1000, refusal: null }); ledger.bind('new-action', attemptId);
    // When
    const accepted = ledger.finish(terminal);
    // Then
    expect(accepted).toBe(false); expect(ledger.receipt('target')?.terminal).toBeNull();
  });
  it('never begins an accepted request at its exact TTL deadline', async () => {
    // Given
    const f = fixture(); f.runtime.requestSingleAction({ ...f.request('expire'), ttlMs: 10 }); f.wall(1010);
    // When
    await f.runtime.advance(100);
    // Then: cancellation arbitration happens before stepSingleAction.
    expect(f.runtime.singleActionReceipt('expire')).toMatchObject({ accepted: true, status: 'cancelled', reason: 'TTL_EXPIRED', actionId: null, attemptId: null, terminal: null });
    expect(f.motion.calls.filter(call => call.kind === 'begin')).toEqual([]);
  });
  it.each(['before-start', 'running'] as const)('lets manual preempt safely with simultaneous observation disconnect: %s', async phase => {
    // Given
    const f = fixture(); f.bridge.ingest(f.heartbeat); await f.runtime.advance(100);
    f.runtime.requestSingleAction(f.request('manual-race'));
    if (phase === 'running') await f.runtime.advance(100);
    f.wall(1100); f.store.tick(0); f.bridge.refresh(); f.bridge.manual('converse');
    // When
    f.runtime.step(16);
    // Then
    expect(f.bridge.view().observed.state).toBe('disconnected');
    expect(f.runtime.singleActionReceipt('manual-race')?.reason).toBe('MANUAL_PRIORITY');
    if (phase === 'running') {
      expect(f.runtime.singleActionReceipt('manual-race')?.status).toBe('cancel_requested');
      expect(f.runtime.action?.phase).toBe('exiting');
    } else {
      expect(f.runtime.singleActionReceipt('manual-race')?.status).toBe('cancelled');
      expect(f.motion.calls.filter(call => call.actionKey === 'lookAround' && call.kind === 'begin')).toEqual([]);
    }
    await f.runtime.advance(2000);
    expect(f.runtime.singleActionReceipt('manual-race')?.status).toBe('cancelled');
    expect(f.runtime.view().goalId).toBe('converse');
  });
  it('does not confuse observation disconnect with execution-authority loss', async () => {
    // Given
    const f = fixture(); f.bridge.ingest(f.heartbeat); await f.runtime.advance(100);
    f.runtime.requestSingleAction(f.request('disconnect')); await f.runtime.advance(100);
    f.wall(1100); f.store.tick(0);
    // When
    f.bridge.refresh(); await f.runtime.advance(1400);
    // Then: independent explicit command can finish; observed harness is never success-forged.
    expect(f.bridge.view().observed.state).toBe('disconnected');
    expect(f.runtime.singleActionReceipt('disconnect')?.status).toBe('succeeded');
  });
  it('rejects the 257th distinct request but preserves retained duplicates and conflicts', () => {
    // Given: well-formed unsupported requests consume retained refusal slots too.
    const f = fixture();
    const first = { ...f.request('r-0'), actionKey: 'standUp' };
    const receipt = f.runtime.requestSingleAction(first);
    for (let index = 1; index < 256; index++) f.runtime.requestSingleAction({ ...first, requestId: `r-${index}` });
    // When
    const overflow = f.runtime.requestSingleAction(f.request('overflow'));
    // Then
    expect(receipt.reason).toBe('UNSUPPORTED_ACTION'); expect(overflow.reason).toBe('COMMAND_LEDGER_FULL');
    expect(f.runtime.requestSingleAction(first)).toBe(receipt);
    expect(f.runtime.requestSingleAction({ ...first, ttlMs: 1 }).reason).toBe('COMMAND_CONFLICT');
    expect(f.motion.calls).toEqual([]);
  });
});
