import { describe, it, expect } from 'vitest';
import { DomainStore } from '../src/domain/store.js';
import { HarnessBridge } from '../src/harness/bridge.js';
import { NpcRuntime } from '../src/runtime/npc-runtime.js';
import { FakeMotionAdapter } from '../src/actions/motion.js';
import { planWithGoap } from '../src/planner/goap-core.js';
import { executionReceipt } from '../src/harness/receipt.js';
import type { HarnessPolicy } from '../src/harness/policy.js';
import type { EventEnvelope } from '@npc/contracts';

const policy: HarnessPolicy = {
 source:'fake', sessionId:'session', observerId:'observer', actorId:'actor',
 heartbeatStaleAfterMs:100, failureVisibleForMs:50, goalTtlMs:10000, manualTtlMs:200,
 goals:{unknown:null,disconnected:null,working:'converse',waiting:'idle',idle:'idle',error:'idle'},
};
function fixture() {
 let wall=0, seq=0;
 const store=new DomainStore({worldId:'world',actors:['actor'],wallClock:()=>wall,config:{eventHistoryLimit:3,minDwellMs:0}});
 const bridge=new HarnessBridge(store,policy);
 const send=(type:'presence.heartbeat'|'tool.started'|'tool.completed', outcome:'success'|'failed'='success')=>{
  const base={specVersion:'1.0',worldId:'world',actorId:'observer',source:'fake',sourceEpoch:'epoch',sessionId:'session',eventId:`e${++seq}`,sequence:seq,occurredAt:'2001-01-01T00:00:00Z'} as const;
  const fact:EventEnvelope=type==='presence.heartbeat'?{...base,type,data:{status:'alive'}}:type==='tool.started'?{...base,type,data:{toolCallId:`t${Math.floor(seq/2)}`,activityClass:'coding'}}:{...base,type,data:{toolCallId:`t${Math.floor((seq-1)/2)}`,outcome}};
  return bridge.ingest(fact);
 };
 return {store,bridge,send,advance:(ms:number)=>{wall+=ms;store.tick(1000/60);bridge.refresh();}};
}
describe('H4a durable projection',()=>{
 it('keeps heartbeat after diagnostic history eviction',()=>{
  // Given
  const f=fixture();f.send('presence.heartbeat');
  // When
  for(let i=0;i<8;i++)f.advance(1);
  // Then
  expect(f.store.history.some(e=>e.kind==='fact')).toBe(false);
  expect(f.bridge.view().observed.state).toBe('idle');
  f.advance(100);expect(f.bridge.view().observed.state).toBe('disconnected');
 });
 it('does not reuse the retired epochs heartbeat',()=>{
  // Given
  const f=fixture();f.send('presence.heartbeat');
  // When
  f.bridge.adoptEpoch('new');
  // Then
  expect(f.bridge.view().observed.state).toBe('unknown');
 });
 it('expires a current failed activity without changing liveness',()=>{
  // Given
  const f=fixture();f.send('presence.heartbeat');f.send('tool.started');f.send('tool.completed','failed');
  expect(f.bridge.view().observed.state).toBe('error');
  // When
  f.advance(51);
  // Then
  expect(f.bridge.view().observed.state).toBe('idle');
 });
});
describe('H4a execution receipt',()=>{
 it('reports accepted then a real successful attempt even with no current action',async()=>{
  // Given
  const f=fixture();
  const runtime=new NpcRuntime({store:f.store,actorId:'actor',motion:new FakeMotionAdapter({body:{handReachM:.7,keyboardDistanceM:.5,seatClearanceM:.3}}),planner:{name:'existing-goap',terminate:()=>{},plan:async request=>({...planWithGoap(request),planId:request.planId,actorId:request.actorId,goalId:request.goalId,revision:request.revision})}});
  f.send('presence.heartbeat');f.send('tool.started');
  const request=f.bridge.view().request;
  expect(executionReceipt(request,runtime.view(),runtime.terminals).status).toBe('accepted');
  // When
  await runtime.advance(2000);
  // Then
  expect(runtime.action).toBeNull();
  expect(executionReceipt(request,runtime.view(),runtime.terminals).status).toBe('succeeded');
  expect(executionReceipt(request,runtime.view(),[]).status).not.toBe('succeeded');
 });
 it('does not report completion from an already-satisfied plan without attempt evidence',async()=>{
  // Given
  const f=fixture();const runtime=new NpcRuntime({store:f.store,actorId:'actor',motion:new FakeMotionAdapter({body:{handReachM:.7,keyboardDistanceM:.5,seatClearanceM:.3}}),planner:{name:'existing-goap',terminate:()=>{},plan:async request=>({...planWithGoap(request),planId:request.planId,actorId:request.actorId,goalId:request.goalId,revision:request.revision})}});
  f.send('presence.heartbeat');
  // When
  await runtime.advance(100);
  // Then
  expect(executionReceipt(f.bridge.view().request,runtime.view(),[]).status).not.toBe('succeeded');
 });
});
