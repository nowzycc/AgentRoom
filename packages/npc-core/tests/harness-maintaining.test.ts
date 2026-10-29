import { describe, expect, it } from 'vitest';
import { DomainStore } from '../src/domain/store.js';
import { HarnessBridge } from '../src/harness/bridge.js';
import { executionReceipt } from '../src/harness/receipt.js';
import { NpcRuntime } from '../src/runtime/npc-runtime.js';
import { FakeMotionAdapter } from '../src/actions/motion.js';
import { planWithGoap } from '../src/planner/goap-core.js';
import type { HarnessPolicy } from '../src/harness/policy.js';
import type { RuntimeView } from '../src/runtime/npc-runtime.js';

const policy: HarnessPolicy = {
 source:'fake', sessionId:'session', observerId:'observer', actorId:'actor',
 heartbeatStaleAfterMs:10000, failureVisibleForMs:50, goalTtlMs:10000, manualTtlMs:10000,
 goals:{unknown:null,disconnected:null,working:'converse',waiting:'lookAround',idle:'idle',error:'idle'},
};
function fixture() {
 const store = new DomainStore({worldId:'world',actors:['actor'],wallClock:()=>0,config:{minDwellMs:0}});
 const runtime = new NpcRuntime({store,actorId:'actor',motion:new FakeMotionAdapter(),planner:{
  name:'existing-goap',terminate:()=>{},plan:async r=>({...planWithGoap(r),planId:r.planId,actorId:r.actorId,goalId:r.goalId,revision:r.revision}),
 }});
 const bridge = new HarnessBridge(store,policy,{withdraw:id=>runtime.cancel({scope:'goal',targetCommandId:id}),revision:()=>runtime.executionRevision});
 const receipt = (view: RuntimeView = runtime.view()) => executionReceipt(bridge.view().request,view,runtime.terminals);
 return {store,runtime,bridge,receipt};
}

describe('H4a current long-lived goal satisfaction',()=>{
 it('maintains a newly requested goal already satisfied by a previous real attempt',async()=>{
  // Given: the old request really executed, but is not the new request.
  const f=fixture();f.bridge.manual('lookAround');await f.runtime.advance(1500);
  const starts=f.runtime.stats.actionsStarted;
  const terminals=[...f.runtime.terminals];
  // When
  f.bridge.manual('lookAround');await f.runtime.advance(100);
  // Then: holding current facts needs no manufactured execution success.
  expect(f.receipt()).toMatchObject({status:'maintaining',goalStatus:'maintaining',attempts:[]});
  expect(f.runtime.stats.actionsStarted).toBe(starts);
  expect(f.runtime.terminals).toEqual(terminals);
 });
 it('maintains idle with a legal empty action plan when already standing',async()=>{
  // Given
  const f=fixture();f.bridge.manual('idle');
  // When
  await f.runtime.advance(100);
  // Then: idle has the existing sitting=false predicate, not an empty goal.
  expect(f.runtime.plan).toMatchObject({status:'satisfied',actions:[]});
  expect(f.receipt()).toMatchObject({status:'maintaining',goalStatus:'maintaining',attempts:[]});
  expect(f.runtime.stats.actionsStarted).toBe(0);
  expect(f.runtime.terminals).toEqual([]);
 });
 it('separates a confirmed request execution from current maintaining state',async()=>{
  // Given
  const f=fixture();f.bridge.manual('converse');
  // When
  await f.runtime.advance(1200);
  // Then
  expect(f.receipt()).toMatchObject({status:'succeeded',goalStatus:'maintaining'});
  expect(f.receipt().attempts.map(t=>t.outcome)).toEqual(['success']);
 });
 it('stops claiming succeeded when current facts no longer satisfy an old satisfied plan',async()=>{
  // Given
  const f=fixture();f.bridge.manual('converse');await f.runtime.advance(1200);
  expect(f.runtime.plan?.status).toBe('satisfied');
  // When: measured feedback invalidates the predicate before replanning.
  f.runtime.applyExternalFacts({facingSpeaker:false});
  // Then: neither the stale plan label nor its success proves present satisfaction.
  expect(f.receipt()).toMatchObject({status:'pending',goalStatus:'pending'});
  expect(f.receipt().attempts.map(t=>t.outcome)).toEqual(['success']);
 });
 it('does not maintain a new request whose inherited facts are no longer satisfied',async()=>{
  // Given
  const f=fixture();f.bridge.manual('lookAround');await f.runtime.advance(1500);
  f.runtime.applyExternalFacts({lookedAround:false});
  // When
  f.bridge.manual('lookAround');
  // Then
  expect(f.receipt()).toMatchObject({status:'pending',goalStatus:'pending',attempts:[]});
 });
 it('does not complete a new request with a late terminal from an older running attempt',async()=>{
  // Given
  const f=fixture();
  const base={specVersion:'1.0',worldId:'world',actorId:'observer',source:'fake',sourceEpoch:'epoch',sessionId:'session',occurredAt:'2001-01-01T00:00:00Z'} as const;
  f.bridge.ingest({...base,type:'presence.heartbeat',eventId:'heartbeat',sequence:1,data:{status:'alive'}});
  f.bridge.ingest({...base,type:'tool.started',eventId:'start',sequence:2,data:{toolCallId:'tool',activityClass:'coding'}});
  await f.runtime.advance(100);
  // When
  f.bridge.manual('converse');await f.runtime.advance(1100);
  // Then: the old success is excluded while the new request is still executing.
  expect(f.runtime.terminals.map(t=>t.outcome)).toEqual(['success']);
  expect(f.receipt()).toMatchObject({status:'started',goalStatus:'active',attempts:[]});
 });
 it('keeps idle pending while a previous action is safely exiting',async()=>{
  // Given
  const f=fixture();f.bridge.manual('lookAround');await f.runtime.advance(100);
  // When
  f.bridge.manual('idle');await f.runtime.advance(16);
  // Then
  expect(f.runtime.action?.phase).toBe('exiting');
  expect(f.receipt()).toMatchObject({status:'accepted',goalStatus:'pending',attempts:[]});
 });
 it('maintains idle only after the real safe exit without inventing an idle success',async()=>{
  // Given
  const f=fixture();f.bridge.manual('lookAround');await f.runtime.advance(100);
  // When
  f.bridge.manual('idle');await f.runtime.advance(1000);
  // Then
  expect(f.runtime.action).toBeNull();
  expect(f.runtime.terminals.map(t=>t.outcome)).toEqual(['cancelled']);
  expect(f.receipt()).toMatchObject({status:'maintaining',goalStatus:'maintaining',attempts:[]});
 });
 it('does not interpret an empty ok plan as satisfied when predicates are false',async()=>{
  // Given: a receipt DTO with an empty plan, not a fabricated runtime effect.
  const f=fixture();f.bridge.manual('lookAround');await f.runtime.advance(16);
  const view=f.runtime.view();expect(view.plan).not.toBeNull();
  // When
  const receipt=f.receipt({...view,plan:view.plan ? {...view.plan,status:'ok',actions:[]} : null});
  // Then
  expect(receipt).toMatchObject({status:'pending',goalStatus:'pending',attempts:[]});
 });
 it('does not treat an old satisfied idle plan as proof while currently seated',async()=>{
  // Given: negative projection input only; no domain/physics mutation.
  const f=fixture();f.bridge.manual('idle');await f.runtime.advance(100);
  const view=f.runtime.view();
  // When
  const receipt=f.receipt({...view,facts:{...view.facts,sitting:true}});
  // Then
  expect(receipt).toMatchObject({status:'pending',goalStatus:'pending',attempts:[]});
 });
 it('requires a settled plan for this goal, not a different goals satisfied label',async()=>{
  // Given
  const f=fixture();f.bridge.manual('idle');await f.runtime.advance(100);
  const view=f.runtime.view();expect(view.plan).not.toBeNull();
  // When
  const receipt=f.receipt({...view,plan:view.plan ? {...view.plan,goalId:'sleep'} : null});
  // Then
  expect(receipt).toMatchObject({status:'pending',goalStatus:'pending'});
 });
 it('does not imply maintaining after the request has been withdrawn',async()=>{
  // Given
  const f=fixture();f.bridge.manual('idle');await f.runtime.advance(100);
  // When
  f.bridge.releaseManual();
  // Then
  expect(f.receipt()).toMatchObject({status:'withdrawn',goalStatus:'withdrawn',attempts:[]});
 });
});
