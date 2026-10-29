import { describe, expect, it } from 'vitest';
import { DomainStore } from '../src/domain/store.js';
import { NpcRuntime } from '../src/runtime/npc-runtime.js';
import { FakeMotionAdapter } from '../src/actions/motion.js';
import { planWithGoap } from '../src/planner/goap-core.js';
import type { CommandGoalId } from '@npc/contracts';

function fixture() {
  let wall = 1000;
  const store = new DomainStore({ worldId: 'world', actors: ['actor'], wallClock: () => wall, config: { minDwellMs: 0 } });
  const motion = new FakeMotionAdapter({ body: { handReachM: .7, keyboardDistanceM: .5, seatClearanceM: .3 } });
  const runtime = new NpcRuntime({ store, actorId: 'actor', motion, planner: {
    name: 'existing-goap', terminate() {},
    plan: async request => ({ ...planWithGoap(request), planId: request.planId, actorId: request.actorId, goalId: request.goalId, revision: request.revision }),
  } });
  let serial = 0;
  const goal = (value: CommandGoalId, priorityClass: 'task' | 'manual' = 'task') => { wall += 1; return store.dispatch({ kind: 'command', command: {
    specVersion: '1.0', worldId: 'world', actorId: 'actor', commandId: `goal-${++serial}`, type: 'goal.request',
    goal: value, priorityClass, ttlMs: 100000, onConflict: 'replace',
  } }); };
  const request = (requestId: string) => ({ requestId, actionKey: 'lookAround', issuedAtWallMs: wall, ttlMs: 10000 });
  return { store, motion, runtime, goal, request, wall: (value: number) => { wall = value; } };
}

describe('H4b explicit single action through the existing executor', () => {
  it('executes consecutive distinct requests even when the predicate is already true', async () => {
    // Given
    const f = fixture(); f.goal('idle'); await f.runtime.advance(100);
    // When
    const first = f.runtime.requestSingleAction(f.request('first'));
    await f.runtime.advance(1400);
    const second = f.runtime.requestSingleAction(f.request('second'));
    await f.runtime.advance(1400);
    // Then
    expect(first.status).toBe('accepted'); expect(second.status).toBe('accepted');
    expect(f.runtime.singleActionReceipt('first')?.status).toBe('succeeded');
    expect(f.runtime.singleActionReceipt('second')?.status).toBe('succeeded');
    expect(f.motion.calls.filter(c => c.kind === 'begin' && c.actionKey === 'lookAround')).toHaveLength(2);
    expect(f.runtime.singleActionReceipt('first')?.attemptId).not.toBe(f.runtime.singleActionReceipt('second')?.attemptId);
    expect(f.runtime.view().goalId).toBe('idle');
  });
  it('returns the same receipt for duplicate payload without a second begin', async () => {
    // Given
    const f = fixture(); const request = f.request('same');
    const accepted = f.runtime.requestSingleAction(request);
    // When
    const duplicate = f.runtime.requestSingleAction({ ...request }); await f.runtime.advance(1400);
    const completed = f.runtime.singleActionReceipt('same');
    // Then
    expect(duplicate).toBe(accepted);
    expect(f.runtime.requestSingleAction(request)).toBe(completed);
    expect(f.motion.calls.filter(c => c.kind === 'begin')).toHaveLength(1);
  });
  it('rejects a conflicting payload without replacing the original receipt', () => {
    // Given
    const f = fixture(); const request = f.request('same'); const accepted = f.runtime.requestSingleAction(request);
    // When
    const conflict = f.runtime.requestSingleAction({ ...request, ttlMs: 2000 });
    // Then
    expect(conflict.reason).toBe('COMMAND_CONFLICT'); expect(conflict.accepted).toBe(false);
    expect(f.runtime.singleActionReceipt('same')).toBe(accepted);
  });
  it.each([
    ['unknown', { actionKey: 'standUp' }, 'UNSUPPORTED_ACTION'],
    ['pose', { pose: { x: 1 } }, 'INVALID_ACTION_REQUEST'],
    ['expired', { issuedAtWallMs: 0, ttlMs: 1000 }, 'TTL_EXPIRED'],
    ['future', { issuedAtWallMs: 1001 }, 'INVALID_ACTION_TIME'],
  ])('rejects %s before any execution', (_name, change, reason) => {
    // Given
    const f = fixture();
    // When
    const receipt = f.runtime.requestSingleAction({ ...f.request('bad'), ...change });
    // Then
    expect(receipt.accepted).toBe(false); expect(receipt.reason).toBe(reason); expect(f.motion.calls).toEqual([]);
  });
  it('rejects a second request while accepted and preserves rejection on retry', () => {
    // Given
    const f = fixture(); f.runtime.requestSingleAction(f.request('first')); const next = f.request('busy');
    // When
    const receipt = f.runtime.requestSingleAction(next);
    // Then
    expect(receipt.reason).toBe('BUSY'); expect(f.runtime.requestSingleAction(next)).toBe(receipt);
  });
  it('rejects manual priority before a single action', () => {
    // Given
    const f = fixture(); f.goal('lookAround', 'manual');
    // When
    const receipt = f.runtime.requestSingleAction(f.request('manual'));
    // Then
    expect(receipt.reason).toBe('MANUAL_PRIORITY'); expect(receipt.accepted).toBe(false);
  });
  it('keeps old terminals out of a newly accepted command', async () => {
    // Given
    const f = fixture(); f.runtime.requestSingleAction(f.request('old')); await f.runtime.advance(1400);
    // When
    f.runtime.requestSingleAction(f.request('new')); f.runtime.step(16);
    // Then
    expect(f.runtime.singleActionReceipt('new')?.status).toBe('started');
    expect(f.runtime.singleActionReceipt('new')?.terminal).toBeNull();
  });
  it('cancels through safe exit once and resumes the latest policy instead of a snapshot', async () => {
    // Given
    const f = fixture(); f.goal('converse'); await f.runtime.advance(1100);
    f.runtime.requestSingleAction(f.request('cancel')); await f.runtime.advance(100); f.goal('idle');
    // When
    expect(f.runtime.cancelSingleAction('cancel')).toBe(true);
    expect(f.runtime.singleActionReceipt('cancel')?.status).toBe('cancel_requested');
    await f.runtime.advance(10);
    expect(f.runtime.singleActionReceipt('cancel')?.status).toBe('cancel_requested');
    await f.runtime.advance(1000);
    // Then
    const receipt = f.runtime.singleActionReceipt('cancel');
    expect(receipt?.status).toBe('cancelled'); expect(f.runtime.executionHeld).toBe(false);
    expect(f.runtime.view().goalId).toBe('idle');
    expect(f.runtime.terminals.filter(t => t.actionId === receipt?.actionId)).toHaveLength(1);
    expect(f.runtime.cancelSingleAction('cancel')).toBe(false);
  });
  it('expires an accepted command before begin when the wall clock advances', async () => {
    // Given
    const f = fixture(); f.runtime.requestSingleAction({ ...f.request('expire'), ttlMs: 10 });
    f.wall(1010);
    // When
    await f.runtime.advance(100);
    // Then
    expect(f.runtime.singleActionReceipt('expire')?.reason).toBe('TTL_EXPIRED');
    expect(f.motion.calls.filter(c => c.kind === 'begin')).toHaveLength(0);
  });
  it('reports a started adapter failure once and resumes a changed policy without retry', async () => {
    // Given
    const f = fixture(); f.goal('converse'); await f.runtime.advance(1100);
    f.runtime.requestSingleAction(f.request('failed')); await f.runtime.advance(100);
    f.goal('idle');
    const result = f.motion.result.bind(f.motion);
    f.motion.result = id => id === f.runtime.singleActionReceipt('failed')?.actionId
      ? { status: 'failed', reason: 'INJECTED_ADAPTER_FAULT_NOT_PHYSICAL' } : result(id);
    // When
    await f.runtime.advance(1000);
    // Then
    const receipt = f.runtime.singleActionReceipt('failed');
    expect(receipt?.status).toBe('failed'); expect(receipt?.reason).toBe('INJECTED_ADAPTER_FAULT_NOT_PHYSICAL');
    expect(f.runtime.view().goalId).toBe('idle');
    expect(f.runtime.terminals.filter(t => t.actionId === receipt?.actionId)).toHaveLength(1);
    expect(f.motion.calls.filter(c => c.actionKey === 'lookAround' && c.kind === 'begin')).toHaveLength(1);
  });
  it('fails preflight without claiming started or committing its effects', async () => {
    // Given
    const f = fixture(); f.motion.block('lookAround'); f.runtime.requestSingleAction(f.request('preflight'));
    // When
    await f.runtime.advance(100);
    // Then
    expect(f.runtime.singleActionReceipt('preflight')?.status).toBe('failed');
    expect(f.runtime.facts.lookedAround).toBe(false);
    expect(f.motion.calls.filter(c => c.kind === 'begin')).toHaveLength(0);
  });
  it('honors a newly arriving manual intent through safe exit', async () => {
    // Given
    const f = fixture(); f.runtime.requestSingleAction(f.request('preempt')); await f.runtime.advance(100);
    f.goal('converse', 'manual');
    // When
    await f.runtime.advance(16);
    // Then
    expect(f.runtime.singleActionReceipt('preempt')?.status).toBe('cancel_requested');
    expect(f.runtime.action?.phase).toBe('exiting');
  });
  it('rejects a request while the policy executor is actually running', async () => {
    // Given
    const f = fixture(); f.goal('converse'); await f.runtime.advance(100);
    expect(f.runtime.action?.actionKey).toBe('turnToSpeaker');
    // When
    const receipt = f.runtime.requestSingleAction(f.request('busy-policy'));
    // Then
    expect(receipt.reason).toBe('BUSY');
  });
  it('does not suppress an explicit action on policy changes even on its terminal frame', async () => {
    // Given
    const f = fixture(); f.goal('converse'); await f.runtime.advance(1100);
    f.runtime.requestSingleAction(f.request('switch')); await f.runtime.advance(1190); f.goal('idle');
    // When
    await f.runtime.advance(100);
    // Then
    expect(f.runtime.singleActionReceipt('switch')?.status).toBe('succeeded');
    expect(f.runtime.view().goalId).toBe('idle');
  });
  it('settles accepted-but-unstarted requests on disposal', () => {
    // Given
    const f = fixture(); f.runtime.requestSingleAction(f.request('dispose'));
    // When
    f.runtime.dispose();
    // Then
    expect(f.runtime.singleActionReceipt('dispose')?.status).toBe('cancelled');
  });
  it('lets the mapper withdraw the policy goal without cancelling the explicit action', async () => {
    // Given
    const f = fixture(); f.goal('converse'); await f.runtime.advance(1100);
    f.runtime.requestSingleAction(f.request('withdraw')); await f.runtime.advance(100);
    // When
    f.runtime.cancel({ scope: 'goal', targetCommandId: 'goal-1' }); f.goal('idle');
    await f.runtime.advance(1400);
    // Then
    expect(f.runtime.singleActionReceipt('withdraw')?.status).toBe('succeeded');
    expect(f.runtime.view().goalId).toBe('idle'); expect(f.runtime.executionHeld).toBe(false);
  });
  it('offers only a resource-free standing capability without invented versions', () => {
    // Given
    const f = fixture();
    // When
    const capabilities = f.runtime.singleActionCapabilities();
    // Then
    expect(capabilities).toEqual([{ actionKey: 'lookAround', posture: 'standing', candidate: null,
      resourceDependencies: [], versionDependencies: [], channels: ['gaze'] }]);
  });
});
