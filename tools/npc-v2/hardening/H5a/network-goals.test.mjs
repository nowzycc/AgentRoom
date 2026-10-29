import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from '../../../../packages/npc-three/node_modules/esbuild/lib/main.js';
const bundled = await build({ stdin: { contents: `export { NetworkGoals } from './network-goals.ts'; export { DomainStore, NpcRuntime, FakeMotionAdapter } from '../../../../packages/npc-core/src/index.ts'; export { HarnessBridge } from '../../../../packages/npc-core/src/harness/bridge.ts'; export { planWithGoap } from '../../../../packages/npc-core/src/planner/goap-core.ts';`, resolveDir: new URL('./', import.meta.url).pathname }, bundle:true, write:false, platform:'node', format:'esm' });
const { NetworkGoals, DomainStore, NpcRuntime, FakeMotionAdapter, HarnessBridge, planWithGoap } = await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const policy={source:'fake',sessionId:'session',observerId:'observer',actorId:'actor',heartbeatStaleAfterMs:10000,failureVisibleForMs:50,goalTtlMs:10000,manualTtlMs:10000,goals:{unknown:null,disconnected:null,working:'converse',waiting:'lookAround',idle:'idle',error:'idle'}};
function fixture(t) {
 let unix=1793183449000, wall=250;
 t.mock.method(Date,'now',()=>unix);
 const store=new DomainStore({worldId:'world',actors:['actor'],wallClock:()=>wall,config:{minDwellMs:0}});
 const runtime=new NpcRuntime({store,actorId:'actor',motion:new FakeMotionAdapter(),planner:{name:'existing',terminate:()=>{},plan:async r=>({...planWithGoap(r),planId:r.planId,actorId:r.actorId,goalId:r.goalId,revision:r.revision})}});
 const bridge=new HarnessBridge(store,policy,{withdraw:id=>runtime.cancel({scope:'goal',targetCommandId:id}),revision:()=>runtime.executionRevision});
 const goals=new NetworkGoals({store,runtime,actorId:'actor'},bridge);
 const op=(commandId,goal='lookAround',priorityClass='task')=>({apiVersion:'h5a.1',scope:{worldId:'world',actorId:'actor',authorityEpoch:'epoch'},commandId,type:'goal.request',goal,priorityClass,onConflict:'replace',issuedAtWallMs:unix,ttlMs:10000});
 const advance=async ms=>{for(let i=0;i<ms;i+=20){await runtime.advance(Math.min(20,ms-i));for(const id of goals.ids())goals.receipt(id);}};
 return {store,runtime,bridge,goals,op,advance,clock:(u,w)=>{unix=u;wall=w;},now:()=>unix};
}
test('task is rejected without cancelling an explicit manual attempt',async t=>{
 // Given
 const f=fixture(t);f.goals.request(f.op('manual','lookAround','manual'),null);await f.advance(100);
 const started=f.goals.receipt('manual');assert.equal(started.status,'started');
 // When
 f.goals.request(f.op('task','idle'),null);await f.advance(100);
 // Then
 assert.equal(f.goals.receipt('task').reason,'MANUAL_PRIORITY');
 assert.equal(f.goals.receipt('manual').attemptId,started.attemptId);
 assert.equal(f.store.snapshot.actors.actor.commands.manual.status,'active');
});
test('transport age shortens goal TTL and expiry while paused withdraws without an attempt',async t=>{
 // Given: two seconds spent in transit; scene time and Unix time differ.
 const f=fixture(t), op={...f.op('ttl','idle'),issuedAtWallMs:f.now()-2000,ttlMs:4000};
 f.goals.request(op,null);
 assert.equal(f.bridge.requestReceipt('ttl').command.expiresAtWallMs,2250);
 // When: Unix reaches the original deadline without advancing simulation.
 f.clock(op.issuedAtWallMs+op.ttlMs,250);assert.equal(f.goals.expire(),true);
 // Then
 assert.equal(f.goals.receipt('ttl').status,'withdrawn');
 assert.deepEqual(f.goals.receipt('ttl').attempts,[]);
 assert.equal(f.runtime.stats.actionsStarted,0);
});
test('running goal TTL waits for the exact owned safe-exit terminal',async t=>{
 // Given
 const f=fixture(t), op={...f.op('ttl-running'),ttlMs:1000};f.goals.request(op,null);await f.advance(100);
 const started=f.goals.receipt(op.commandId);assert.equal(started.status,'started');
 // When
 f.clock(op.issuedAtWallMs+1000,250);f.goals.expire();
 assert.equal(f.goals.receipt(op.commandId).status,'pending');await f.advance(800);
 // Then
 const r=f.goals.receipt(op.commandId);assert.equal(r.status,'withdrawn');
 assert.deepEqual(r.attempts.map(a=>[a.actionId,a.attemptId,a.outcome]),[[started.actionId,started.attemptId,'cancelled']]);
});
test('new same-goal request excludes a pre-admission running attempt and its late terminal',async t=>{
 // Given
 const f=fixture(t);f.goals.request(f.op('old'),null);await f.advance(100);const old=f.goals.receipt('old');
 // When
 f.goals.request(f.op('new'),null);await f.advance(1600);
 // Then
 const r=f.goals.receipt('new');assert.equal(r.status,'maintaining');assert.deepEqual(r.attempts,[]);
 assert(f.runtime.terminals.some(a=>a.actionId===old.actionId&&a.attemptId===old.attemptId));
});
test('same payload retry preserves original TTL, binding and attempt',async t=>{
 // Given
 const f=fixture(t),op=f.op('same');f.goals.request(op,null);await f.advance(100);const before=f.goals.receipt('same');
 // When
 f.clock(f.now()+500,750);f.goals.request(op,null);
 // Then
 assert.deepEqual(f.goals.receipt('same'),before);
 assert.equal(f.bridge.requestReceipt('same').command.expiresAtWallMs,10250);
});
test('owned action ID cannot adopt a different attempt in a read projection',async t=>{
 // Given: actual execution has established the immutable pair.
 const f=fixture(t);f.goals.request(f.op('bound'),null);await f.advance(100);
 const before=f.goals.receipt('bound'),view=f.runtime.view();assert(view.action);
 // When: a projection-only negative fixture swaps the attempt (not a physical report).
 t.mock.method(f.runtime,'view',()=>({...view,action:{...view.action,attemptId:'unowned-attempt'}}));
 // Then
 assert.equal(f.goals.receipt('bound').attemptId,null);
 assert.equal(before.status,'started');
});
