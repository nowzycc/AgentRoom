import { describe, expect, it } from 'vitest';
import { DomainStore } from '../src/domain/store.js';
import { HarnessBridge } from '../src/harness/bridge.js';
import { executionReceipt } from '../src/harness/receipt.js';
import { NpcRuntime } from '../src/runtime/npc-runtime.js';
import { FakeMotionAdapter } from '../src/actions/motion.js';
import { planWithGoap } from '../src/planner/goap-core.js';
import type { HarnessPolicy } from '../src/harness/policy.js';
const policy: HarnessPolicy = { source:'fake',sessionId:'session',observerId:'observer',actorId:'actor',
 heartbeatStaleAfterMs:10000,failureVisibleForMs:50,goalTtlMs:10000,manualTtlMs:10000,
 goals:{unknown:null,disconnected:null,working:'converse',waiting:'lookAround',idle:'idle',error:'idle'} };
function fixture() {
 const store = new DomainStore({worldId:'world',actors:['actor'],wallClock:()=>1000,config:{minDwellMs:0}});
 const runtime = new NpcRuntime({store,actorId:'actor',motion:new FakeMotionAdapter(),planner:{name:'existing',terminate:()=>{},
 plan:async r=>({...planWithGoap(r),planId:r.planId,actorId:r.actorId,goalId:r.goalId,revision:r.revision})}});
 const bridge = new HarnessBridge(store,policy,{withdraw:id=>runtime.cancel({scope:'goal',targetCommandId:id}),revision:()=>runtime.executionRevision});
 let seq=0;
 const event=(type:'presence.heartbeat'|'run.started'|'run.completed')=>bridge.ingest({specVersion:'1.0',worldId:'world',actorId:'observer',source:'fake',sourceEpoch:'epoch',sessionId:'session',occurredAt:'2001-01-01T00:00:00Z',eventId:`e-${++seq}`,sequence:seq,runId:'run',...type==='presence.heartbeat'?{type,data:{status:'alive'}}:type==='run.started'?{type,data:{}}:{type,data:{outcome:'success'}}});
 const goal=(goal:'idle'|'lookAround'|'converse',priorityClass:'task'|'manual'='task')=>bridge.explicit({specVersion:'1.0',worldId:'world',actorId:'actor',commandId:'external',type:'goal.request',goal,priorityClass,ttlMs:10000,onConflict:'replace'});
 return {store,runtime,bridge,event,goal};
}
describe('H5 explicit goal producer boundary',()=>{
 it.each(['explicit', 'local'] as const)('rejects task without withdrawing %s manual authority',async(source)=>{
  // Given: a manual request owns the existing runtime.
  const f=fixture();
  const manualId=source==='explicit' ? (f.goal('lookAround','manual'),'external') : f.bridge.manual('lookAround');
  await f.runtime.advance(100);
  const before=f.runtime.action;
  // When: a lower-priority task asks to replace it.
  const result=f.bridge.explicit({specVersion:'1.0',worldId:'world',actorId:'actor',commandId:'task-after-manual',
   type:'goal.request',goal:'idle',priorityClass:'task',ttlMs:10000,onConflict:'replace'});
  // Then: refusal preserves the manual command and its exact attempt.
  expect(result).toMatchObject({accepted:false,reason:'MANUAL_PRIORITY'});
  expect(f.store.snapshot.actors.actor?.commands[manualId ?? '']?.status).toBe('active');
  await f.runtime.advance(100);
  expect(f.runtime.action?.attemptId).toBe(before?.attemptId);
  expect(f.runtime.view().goalId).toBe('lookAround');
 });
 it('keeps a retired duplicate inert when a later manual owns authority',async()=>{
  // Given: an earlier external task was withdrawn and a manual replaced it.
  const f=fixture();f.goal('idle');f.runtime.cancel({scope:'goal',targetCommandId:'external'});
  f.bridge.manual('lookAround');await f.runtime.advance(100);
  const before=f.bridge.view().request;
  // When: the old request is retried with its identical payload.
  const duplicate=f.goal('idle');
  // Then: duplicate lookup cannot withdraw or replace the current manual.
  expect(duplicate).toMatchObject({accepted:false,reason:'DUPLICATE_COMMAND'});
  expect(f.bridge.view().request?.command.commandId).toBe(before?.command.commandId);
  expect(f.store.snapshot.actors.actor?.commands.external?.status).toBe('cancelled');
 });
 it('preserves external ID and restores latest observation when withdrawn',async()=>{
  // Given: working state, then a remote standing override.
  const f=fixture();f.event('presence.heartbeat');f.event('run.started');await f.runtime.advance(1200);
  // When: observation changes under the override, then runtime withdraws it.
  expect(f.goal('lookAround').accepted).toBe(true);f.event('run.completed');await f.runtime.advance(1500);
  expect(f.bridge.view().request?.command.commandId).toBe('external');
  expect(f.runtime.view().goalId).toBe('lookAround');
  f.runtime.cancel({scope:'goal',targetCommandId:'external'});f.bridge.refresh();await f.runtime.advance(100);
  // Then: current idle policy, not captured working/converse.
  expect(f.bridge.view().desiredGoal).toBe('idle');expect(f.runtime.view().goalId).toBe('idle');
 });
 it('maintains already satisfied idle without an invented successful attempt',async()=>{
  // Given
  const f=fixture();f.goal('idle');
  // When
  await f.runtime.advance(100);
  // Then
  expect(executionReceipt(f.bridge.view().request,f.runtime.view(),f.runtime.terminals)).toMatchObject({status:'maintaining',attempts:[]});
 });
 it('keeps independent single running when a task goal arrives or is withdrawn',async()=>{
  // Given
  const f=fixture();f.runtime.requestSingleAction({requestId:'single',actionKey:'lookAround',issuedAtWallMs:1000,ttlMs:10000});await f.runtime.advance(100);
  // When
  f.goal('idle');f.runtime.cancel({scope:'goal',targetCommandId:'external'});await f.runtime.advance(100);
  // Then
  expect(f.runtime.singleActionReceipt('single')?.status).toBe('started');
 });
 it('safely preempts independent single when explicit manual arrives',async()=>{
  // Given
  const f=fixture();f.runtime.requestSingleAction({requestId:'single',actionKey:'lookAround',issuedAtWallMs:1000,ttlMs:10000});await f.runtime.advance(100);
  // When
  f.goal('idle','manual');await f.runtime.advance(600);
  // Then
  expect(f.runtime.singleActionReceipt('single')).toMatchObject({status:'cancelled',reason:'cancel:MANUAL_PRIORITY'});
 });
});
