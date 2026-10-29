import { describe, it, expect } from 'vitest';
import { DomainStore } from '../src/domain/store.js';
import { HarnessBridge } from '../src/harness/bridge.js';
import { executionReceipt } from '../src/harness/receipt.js';
import { NpcRuntime } from '../src/runtime/npc-runtime.js';
import { FakeMotionAdapter } from '../src/actions/motion.js';
import { planWithGoap } from '../src/planner/goap-core.js';
import type { HarnessPolicy } from '../src/harness/policy.js';
import type { EventEnvelope } from '@npc/contracts';

const policy: HarnessPolicy = {
 source:'fake', sessionId:'a', observerId:'observer', actorId:'actor',
 heartbeatStaleAfterMs:10000, failureVisibleForMs:50, goalTtlMs:10000, manualTtlMs:2000,
 goals:{unknown:null,disconnected:null,working:'converse',waiting:'idle',idle:'idle',error:'idle'},
};
function fixture(blocks = 0) {
 let seq=0, wall=0;
 const store=new DomainStore({worldId:'world',actors:['actor'],wallClock:()=>wall,config:{minDwellMs:0,eventHistoryLimit:3}});
 const motion=new FakeMotionAdapter({blockCounts:{turnToSpeaker:blocks}});
 const runtime=new NpcRuntime({store,actorId:'actor',motion,planner:{name:'goap',terminate:()=>{},plan:async r=>({...planWithGoap(r),planId:r.planId,actorId:r.actorId,goalId:r.goalId,revision:r.revision})}});
 const bridge=new HarnessBridge(store,policy,{withdraw:id=>runtime.cancel({scope:'goal',targetCommandId:id}),revision:()=>runtime.executionRevision});
 const event=(source='fake',sessionId='a',sourceEpoch='epoch'):EventEnvelope=>({specVersion:'1.0',worldId:'world',actorId:'observer',source,sessionId,sourceEpoch,sequence:++seq,eventId:`e${seq}`,occurredAt:'2001-01-01T00:00:00Z',type:'presence.heartbeat',data:{status:'alive'}});
 const working=()=>{bridge.ingest(event());bridge.ingest({...event(),type:'tool.started',data:{toolCallId:`t${seq}`,activityClass:'coding'}});};
 const receipt=()=>executionReceipt(bridge.view().request,runtime.view(),runtime.terminals);
 return {store,runtime,motion,bridge,event,working,receipt,advance:async(ms:number)=>{wall+=ms;await runtime.advance(ms);bridge.refresh();}};
}

describe('H4a request correlation and retry',()=>{
 it('reports a successful retry rather than latching an earlier failed attempt',async()=>{
  // Given: one deterministic adapter preflight fault, not a physical obstacle.
  const f=fixture(1);f.working();
  // When
  await f.advance(2000);
  // Then
  expect(f.runtime.terminals.map(t=>t.outcome)).toEqual(['failed','success']);
  expect(f.receipt().status).toBe('succeeded');
 });
 it('does not reuse a previous requests failure after a fresh same-goal request',async()=>{
  // Given
  const f=fixture(3);f.working();await f.runtime.advance(200);
  expect(f.receipt().status).toBe('failed');
  // When
  f.bridge.manual('converse');
  // Then
  expect(f.receipt().status).not.toBe('failed');expect(f.receipt().attempts).toEqual([]);
 });
 it('does not label another goals exiting action as the requested action',async()=>{
  // Given
  const f=fixture();f.working();await f.advance(100);
  // When
  f.bridge.manual('rest');
  // Then
  expect(f.receipt().status).toBe('accepted');
 });
 it('does not reuse a late old terminal after a same-goal request at the same simulation time',async()=>{
  // Given: external revisions make domain revision alone incomparable.
  const f=fixture();for(let i=0;i<30;i++)f.runtime.applyExternalFacts({lampOn:i%2===0});
  f.working();await f.runtime.advance(100);const old=f.bridge.view().request;
  expect(old).not.toBeNull();
  // When: a new manual request for the identical goal must have its own window.
  f.bridge.manual('converse');await f.runtime.advance(850);
  // Then: the old late success exists, but the new request has no terminal.
  expect(f.runtime.terminals).toHaveLength(1);
  expect(f.runtime.terminals[0]?.outcome).toBe('success');
  expect(f.receipt().status).not.toBe('succeeded');
  expect(f.receipt().attempts).toEqual([]);
 });
 it('restores the existing policy after a real manual action without replaying it',async()=>{
  // Given
  const f=fixture();f.working();await f.runtime.advance(2000);const id=f.bridge.view().commandId;
  f.bridge.manual('rest');await f.runtime.advance(2500);
  // When
  f.bridge.releaseManual();await f.runtime.advance(2000);const started=f.runtime.stats.actionsStarted;
  for(let i=0;i<6;i++){f.bridge.refresh();await f.runtime.advance(300);}
  // Then
  expect(f.bridge.view().commandId).toBe(id);
  expect(f.runtime.view().goalId).toBe('converse');
  expect(f.runtime.stats.actionsStarted).toBe(started);
  expect(f.receipt().status).toBe('succeeded');
 });
});

describe('H4a scoped domain presence',()=>{
 it('accepts a bound heartbeat after a higher sequence in another session',()=>{
  // Given
  const f=fixture();f.working();const next=f.event();
  f.store.dispatch({kind:'fact',fact:{...f.event('fake','b'),sequence:900}});
  // When
  const result=f.bridge.ingest(next);
  // Then
  expect(result.accepted).toBe(true);expect(f.bridge.view().observed.state).toBe('working');
 });
 it('bounds samples and fails closed when a binding is evicted',()=>{
  // Given
  const f=fixture();f.working();
  // When
  for(let i=0;i<70;i++)f.store.dispatch({kind:'fact',fact:f.event('fake',`session-${i}`)});
  // Then
  expect(f.store.snapshot.actors.observer?.presence.samples).toHaveLength(64);
  expect(f.bridge.view().observed.state).toBe('unknown');
 });
 it('preserves the bound heartbeat across other source and session interleaving and history eviction',()=>{
  // Given
  const f=fixture();f.working();const bound=f.bridge.view().observed;
  // When: bypass this bridge via legitimate other domain producers.
  f.store.dispatch({kind:'fact',fact:f.event('other','a')});
  f.store.dispatch({kind:'fact',fact:f.event('fake','b')});
  for(let i=0;i<8;i++)f.store.tick(20);
  // Then
  expect(f.bridge.view().observed).toEqual(bound);
 });
 it('keeps source retirement isolated and refuses old-epoch heartbeat resurrection',()=>{
  // Given
  const f=fixture();f.working();f.store.dispatch({kind:'fact',fact:f.event('other','a')});
  // When
  f.store.dispatch({kind:'source.epoch.adopt',actorId:'observer',source:'other',epoch:'next'});
  // Then
  expect(f.bridge.view().observed.state).toBe('working');
  f.bridge.adoptEpoch('next');expect(f.bridge.view().observed.state).toBe('unknown');
  expect(f.bridge.ingest(f.event()).reason).toBe('STALE_EPOCH');
  f.bridge.ingest(f.event('fake','a','next'));expect(f.bridge.view().observed.state).toBe('idle');
 });
});
