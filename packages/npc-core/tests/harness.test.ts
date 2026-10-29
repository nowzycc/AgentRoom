import { describe, it, expect } from 'vitest';
import { DomainStore } from '../src/domain/store.js';
import { HarnessBridge } from '../src/harness/bridge.js';
import type { HarnessPolicy } from '../src/harness/policy.js';
import type { EventEnvelope } from '@npc/contracts';

const policy: HarnessPolicy = {
  source: 'fake:h4a', sessionId: 'session-1', observerId: 'observed', actorId: 'npc-a',
  heartbeatStaleAfterMs: 100, failureVisibleForMs: 50, goalTtlMs: 10000, manualTtlMs: 200,
  goals: { unknown: null, disconnected: null, working: 'work', waiting: 'think', idle: 'think', error: 'think' },
};
function fixture(custom: HarnessPolicy = policy) {
  let wall = 0;
  const store = new DomainStore({ worldId: 'world', actors: ['npc-a'], wallClock: () => wall });
  const bridge = new HarnessBridge(store, custom);
  let seq = 0;
  const event = (type: EventEnvelope['type'], id = 'tool-1'): EventEnvelope => {
    const base = { specVersion: '1.0', source: policy.source, sourceEpoch: 'epoch-1', sessionId: policy.sessionId,
      runId: 'run-1', actorId: policy.observerId, worldId: 'world', sequence: ++seq, eventId: `e-${seq}`,
      occurredAt: '2001-01-01T00:00:00.000Z' } as const;
    switch (type) {
      case 'tool.started': return { ...base, type, data: { toolCallId: id, activityClass: 'coding' } };
      case 'tool.completed': return { ...base, type, data: { toolCallId: id, outcome: 'success' } };
      case 'run.started': return { ...base, type, data: {} };
      case 'run.completed': return { ...base, type, data: { outcome: 'success' } };
      case 'presence.heartbeat': return { ...base, type, data: { status: 'alive' } };
      case 'speech.started': return { ...base, type, data: { speechId: id } };
      case 'speech.completed': return { ...base, type, data: { speechId: id } };
      default: { const exhaustive: never = type; return exhaustive; }
    }
  };
  const send = (type: EventEnvelope['type'], id?: string) => bridge.ingest(event(type, id));
  send('presence.heartbeat');
  return { store, bridge, event, send, advance: (ms: number) => { wall += ms; store.tick(1000 / 60); bridge.refresh(); } };
}

describe('H4a existing domain event projection', () => {
  it('keeps working when one parallel tool completes', () => {
    // Given
    const f = fixture(); f.send('tool.started', 'a'); f.send('tool.started', 'b');
    // When
    f.send('tool.completed', 'a');
    // Then
    expect(f.bridge.view().observed.state).toBe('working');
    expect(f.bridge.view().observed.activeTools).toBe(1);
  });
  it('keeps finish-before-start terminal even with an older sequence', () => {
    // Given
    const f = fixture(); const start = f.event('tool.started'); f.send('tool.completed');
    // When
    f.bridge.ingest(start);
    // Then
    expect(f.bridge.view().observed.activeTools).toBe(0);
  });
  it('accepts lower-sequence completion for a distinct parallel tool', () => {
    // Given
    const f = fixture(); f.send('tool.started', 'a'); f.send('tool.started', 'b');
    const complete = f.event('tool.completed', 'a'); f.send('tool.completed', 'b');
    // When
    const result = f.bridge.ingest(complete);
    // Then
    expect(result.accepted).toBe(true); expect(f.bridge.view().observed.state).toBe('idle');
  });
  it('deduplicates without restarting the mapped goal', () => {
    // Given
    const f = fixture(); const e = f.event('tool.started'); f.bridge.ingest(e);
    const command = f.bridge.view().commandId;
    // When
    const result = f.bridge.ingest(e);
    // Then
    expect(result.reason).toBe('DUPLICATE_EVENT'); expect(f.bridge.view().commandId).toBe(command);
  });
  it('does not restart the same goal on unrelated tool or heartbeat events', () => {
    // Given
    const f = fixture(); f.send('tool.started', 'a'); const command = f.bridge.view().commandId;
    // When
    f.send('tool.started', 'b'); f.send('presence.heartbeat');
    // Then
    expect(f.bridge.view().commandId).toBe(command);
  });
  it('rejects retired epochs and requires explicit adoption', () => {
    // Given
    const f = fixture(); const old = f.event('tool.started');
    f.bridge.adoptEpoch('epoch-2');
    // When
    const result = f.bridge.ingest(old);
    // Then
    expect(result.reason).toBe('STALE_EPOCH'); expect(f.bridge.view().observed.activeTools).toBe(0);
  });
  it('rejects an undeclared epoch', () => {
    // Given
    const f = fixture();
    // When
    const result = f.bridge.ingest({ ...f.event('tool.started'), sourceEpoch: 'unannounced' });
    // Then
    expect(result.reason).toBe('EPOCH_NOT_DECLARED');
  });
  it('does not let an old heartbeat extend liveness', () => {
    // Given
    const f = fixture(); const old = f.event('presence.heartbeat'); f.send('tool.started'); f.advance(101);
    // When
    const result = f.bridge.ingest(old);
    // Then
    expect(result.reason).toBe('STALE_HEARTBEAT'); expect(f.bridge.view().observed.state).toBe('disconnected');
    expect(f.bridge.view().commandId).toBe(null);
  });
  it('uses received wall time rather than occurred time for liveness', () => {
    // Given
    const f = fixture(); f.advance(30);
    // When
    f.send('presence.heartbeat');
    // Then
    expect(f.bridge.view().observed.receivedAtWallMs).toBe(30);
    expect(f.store.history.some(e => e.kind === 'fact' && e.fact.occurredAt.startsWith('2001-'))).toBe(true);
  });
  it('shows waiting while a run remains active after tool completion', () => {
    // Given
    const f = fixture(); f.send('run.started'); f.send('tool.started');
    // When
    f.send('tool.completed');
    // Then
    expect(f.bridge.view().observed.state).toBe('waiting');
  });
  it('uses the supplied configuration rather than a hardcoded working goal', () => {
    // Given
    const f = fixture({ ...policy, goals: { ...policy.goals, working: 'converse' } });
    // When
    f.send('tool.started');
    // Then
    expect(f.bridge.view().desiredGoal).toBe('converse');
  });
  it('restores the policy goal after manual release without changing observation', () => {
    // Given
    const f = fixture(); f.send('tool.started'); f.bridge.manual('think');
    // When
    f.bridge.releaseManual();
    // Then
    expect(f.bridge.view().effectiveGoal).toBe('work'); expect(f.bridge.view().observed.state).toBe('working');
  });
  it('restores policy after manual TTL expiry', () => {
    // Given
    const f = fixture(); f.send('tool.started'); f.bridge.manual('converse');
    // When
    f.advance(190); f.send('presence.heartbeat'); f.advance(11);
    // Then
    expect(f.bridge.view().manualCommandId).toBe(null);
    expect(f.bridge.view().effectiveGoal).toBe('work');
  });
  it('refuses single action rather than executing a domain intent as a command', () => {
    // Given
    const f = fixture(); f.send('tool.started'); const before = f.bridge.view().observed;
    // When
    const result = f.bridge.singleAction('stand');
    // Then
    expect(result).toEqual({ accepted: false, reason: 'H4B_SINGLE_ACTION_NOT_SUPPORTED' });
    expect(f.bridge.view().observed).toEqual(before);
  });
  it('rejects events outside the configured source/session binding', () => {
    // Given
    const f = fixture();
    // When
    const result = f.bridge.ingest({ ...f.event('tool.started'), sessionId: 'other' });
    // Then
    expect(result.reason).toBe('HARNESS_BINDING_MISMATCH');
  });
});
