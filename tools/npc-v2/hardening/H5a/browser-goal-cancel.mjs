import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import assert from 'node:assert/strict';
import { chromium } from '../../../node_modules/playwright/index.mjs';
const here = new URL('./', import.meta.url), root = new URL('../../../../',here);
const config = Object.fromEntries(readFileSync(new URL('.env.local',here),'utf8').trim().split('\n').map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)];}));
const id=`goal-cancel-${Date.now()}-${randomUUID()}`, sha=b=>createHash('sha256').update(b).digest('hex');
const evidence={id,status:'blocked',checks:{},errors:[],sources:{},sse:[]};
for(const f of ['adapter.ts','network-goals.ts','wire.ts','broker.py','receipts.py','server.py','dist/adapter.js','browser-goal-cancel.mjs']) evidence.sources[f]=sha(readFileSync(new URL(f,here)));
for(const f of ['packages/npc-core/src/harness/bridge.ts','tools/npc-v2/hardening/H4-closeout/schema/contract.schema.json']) evidence.sources[f]=sha(readFileSync(new URL(f,root)));
const headers={Authorization:`Bearer ${config.H5_HARNESS_TOKEN}`};
let service,browser,base,reader;
async function terminate(child){if(!child||child.exitCode!==null||child.signalCode!==null)return;const exit=new Promise(resolve=>child.once('exit',(code,signal)=>resolve({code,signal})));child.kill('SIGTERM');return Promise.race([exit,delay(8000).then(()=>{throw new Error('shutdown timeout');})]);}
try{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;await new Promise(r=>server.close(r));base=`http://127.0.0.1:${port}`;
 service=spawn('python3',[new URL('run.py',here).pathname],{env:{...process.env,...config,H5_ORIGIN:base},stdio:['ignore','ignore','pipe']});
 evidence.service={pid:service.pid,base,log:''};service.stderr.on('data',b=>evidence.service.log+=b);
 for(let i=0;i<80;i++){assert.equal(service.exitCode,null,evidence.service.log);try{const r=await fetch(base+'/api/h5a/capabilities',{headers,signal:AbortSignal.timeout(500)});if(r.ok){evidence.probe=await r.json();break;}}catch(e){if(!(e instanceof TypeError||e instanceof DOMException))throw e;}await delay(50);}
 assert(evidence.probe,'authenticated capabilities probe');
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 const page=await browser.newPage();page.on('pageerror',e=>evidence.errors.push(String(e)));
 const ws=[];page.on('websocket',socket=>{socket.on('framereceived',f=>{const m=JSON.parse(String(f.payload));if(m.type==='dispatch')ws.push(m);});});
 await page.goto(base);await page.waitForFunction(()=>window.__h5?.ready,null,{timeout:90000});
 await page.evaluate(()=>{window.__h5.setManual(true);window.__h5.setRender(false);});
 await page.fill('#credential',config.H5_RUNTIME_TOKEN);await page.click('#connect');
 await page.waitForFunction(()=>window.__h5.connected()&&window.__h5.pendingReports()===0);
 const scope=await page.evaluate(()=>window.__h5.scope());
 const get=async path=>{const r=await fetch(base+'/api/h5a/'+path,{headers,signal:AbortSignal.timeout(5000)});return {status:r.status,body:await r.json()};};
 const post=async(path,data)=>{const r=await fetch(base+'/api/h5a/'+path,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(5000)});return {status:r.status,body:await r.json()};};
 const step=s=>page.evaluate(s=>window.__h5.step(s),s);
 const wait=async(commandId,status)=>{await page.waitForFunction(({commandId,status})=>window.__h5.trace().some(r=>r.commandId===commandId&&r.status===status)||!window.__h5.connected(),{commandId,status},{timeout:10000});await page.waitForFunction(()=>window.__h5.pendingReports()===0);const r=await get('commands/'+commandId);assert.equal(r.body.status,status,JSON.stringify(r));return r.body;};
 const sample=async name=>{evidence.checks[name]=await page.evaluate(()=>({snapshot:window.__h5.snapshot(),diagnostics:window.__h5.diagnostics(),hops:window.__h5.hops()}));return evidence.checks[name];};
 const query=new URLSearchParams({worldId:scope.worldId,actorId:scope.actorId});const initial=await get('snapshot?'+query);
 query.set('brokerEpoch',initial.body.brokerEpoch);query.set('after',initial.body.cursor);
 reader=spawn('python3',[new URL('sse-client.py',here).pathname,base+'/api/h5a/events?'+query],{env:{...process.env,H5_HARNESS_TOKEN:config.H5_HARNESS_TOKEN},stdio:['ignore','pipe','pipe']});
 let buffer='';reader.stdout.on('data',b=>{buffer+=b;const lines=buffer.split('\n');buffer=lines.pop();for(const l of lines)if(l)evidence.sse.push(JSON.parse(l));});
 let seq=0;const fact=(type,data,ids={})=>({specVersion:'1.0',source:'fake:h4a',sourceEpoch:id+'-source',sequence:++seq,eventId:id+'-e-'+seq,worldId:scope.worldId,actorId:'harness-observation',sessionId:'session-h4a',occurredAt:new Date().toISOString(),type,data,...ids});
 const batch=async(suffix,events)=>{assert.equal((await post('events/batch',{apiVersion:'h5a.1',scope,batchId:id+suffix,events})).status,202);await page.waitForFunction(()=>window.__h5.pendingReports()===0);};
 const goal=(suffix,name)=>({apiVersion:'h5a.1',scope,commandId:id+suffix,type:'goal.request',goal:name,priorityClass:'task',onConflict:'replace',issuedAtWallMs:Date.now(),ttlMs:60000});
 const cancel=(suffix,target,kind)=>({apiVersion:'h5a.1',scope,commandId:id+suffix,type:'cancel',target:{kind,commandId:target}});
 // Given working policy; When explicit idle arrives; Then real standing maintaining.
 await batch('-working',[fact('presence.heartbeat',{status:'alive'}),fact('run.started',{}, {runId:id+'-run'}),fact('tool.started',{toolCallId:id+'-tool',activityClass:'coding'},{runId:id+'-run'})]);
 await page.waitForFunction(()=>window.__h5.snapshot().observation.state==='working');await step(1.8);
 assert.equal((await sample('working')).diagnostics.runtime.goalId,'converse');
 const idle=goal('-idle','idle');assert.equal((await post('commands',idle)).status,202);await wait(idle.commandId,'accepted');await step(.4);
 evidence.checks.idle=await wait(idle.commandId,'maintaining');assert.deepEqual(evidence.checks.idle.attempts,[]);
 const maintained=await sample('maintaining');assert.equal(maintained.diagnostics.runtime.facts.sitting,false);assert.equal(maintained.diagnostics.runtime.goalId,'idle');
 // Latest state changes beneath explicit override; withdrawal must restore this idle, not working.
 await batch('-finish',[fact('tool.completed',{toolCallId:id+'-tool',outcome:'success'},{runId:id+'-run'}),fact('run.completed',{outcome:'success'},{runId:id+'-run'})]);await page.waitForFunction(()=>window.__h5.snapshot().observation.state==='idle');await step(.1);
 assert.equal((await sample('overrideStillIdle')).diagnostics.runtime.goalId,'idle');
 const cancelIdle=cancel('-cancel-idle',idle.commandId,'goal');assert.equal((await post('cancel',cancelIdle)).status,202);await step(.2);
 evidence.checks.withdrawn=await wait(idle.commandId,'withdrawn');evidence.checks.cancelIdle=await wait(cancelIdle.commandId,'settled');
 const restored=await sample('restoredLatest');assert.equal(restored.snapshot.desiredGoal,'idle');assert.equal(restored.diagnostics.runtime.goalId,'idle');assert.equal(restored.snapshot.observation.state,'idle');
 // A running explicit goal also waits for the existing safe exit.
 const look=goal('-goal-look','lookAround');await post('commands',look);await wait(look.commandId,'accepted');await step(.1);evidence.checks.goalStarted=await wait(look.commandId,'started');
 const cg=cancel('-cancel-goal',look.commandId,'goal');await post('cancel',cg);await wait(cg.commandId,'requested');await step(.8);
 evidence.checks.goalWithdrawn=await wait(look.commandId,'withdrawn');await wait(cg.commandId,'settled');
 assert(evidence.checks.goalWithdrawn.attempts.some(t=>t.actionId===evidence.checks.goalStarted.actionId&&t.attemptId===evidence.checks.goalStarted.attemptId&&t.outcome==='cancelled'));
 // Manual owns the actual attempt; a lower-layer task cannot cancel it to gain admission.
 const manual={...goal('-manual','lookAround'),priorityClass:'manual'};
 await post('commands',manual);await wait(manual.commandId,'accepted');await step(.1);
 evidence.checks.manualStarted=await wait(manual.commandId,'started');
 const lower=goal('-task-after-manual','idle');await post('commands',lower);
 evidence.checks.taskRefused=await wait(lower.commandId,'rejected');assert.equal(evidence.checks.taskRefused.reason,'MANUAL_PRIORITY');
 const manualNow=(await get('commands/'+manual.commandId)).body;
 assert.equal(manualNow.attemptId,evidence.checks.manualStarted.attemptId);
 assert.deepEqual((await post('commands',manual)).body,manualNow);
 await step(.1);const manualHeld=await sample('manualHeld');
 assert.equal(manualHeld.diagnostics.runtime.action.attemptId,manualNow.attemptId);
 const cm=cancel('-cancel-manual',manual.commandId,'goal');await post('cancel',cm);await wait(cm.commandId,'requested');await step(.8);
 await wait(manual.commandId,'withdrawn');await wait(cm.commandId,'settled');
 // Explicit independent action cancellation: same action/attempt real terminal.
 const action={apiVersion:'h5a.1',scope,commandId:id+'-single',type:'action.request',actionKey:'lookAround',issuedAtWallMs:Date.now(),ttlMs:60000};
 await post('commands',action);await wait(action.commandId,'accepted');await step(.1);evidence.checks.singleStarted=await wait(action.commandId,'started');
 const ca=cancel('-cancel-action',action.commandId,'action');await post('cancel',ca);await wait(ca.commandId,'requested');await step(.8);
 evidence.checks.singleCancelled=await wait(action.commandId,'cancelled');evidence.checks.cancelAction=await wait(ca.commandId,'settled');
 assert.equal(evidence.checks.singleCancelled.attemptId,evidence.checks.singleStarted.attemptId);
 const done=await sample('safeTerminal');assert(done.diagnostics.terminals.some(t=>t.actionId===evidence.checks.singleStarted.actionId&&t.attemptId===evidence.checks.singleStarted.attemptId&&t.outcome==='cancelled'));
 const starts=done.diagnostics.runtime.stats.actionsStarted,dispatches=ws.length;
 assert.deepEqual((await post('cancel',ca)).body,evidence.checks.cancelAction);await step(.1);assert.equal(ws.length,dispatches);assert.equal((await sample('repeat')).diagnostics.runtime.stats.actionsStarted,starts);
 const completedCancel=cancel('-already-terminal',action.commandId,'action');await post('cancel',completedCancel);await wait(completedCancel.commandId,'settled');
 // Wrong target, old epoch and wrong kind must leave another action running.
 const next={...action,commandId:id+'-next',issuedAtWallMs:Date.now()};await post('commands',next);await wait(next.commandId,'accepted');await step(.1);const nextStarted=await wait(next.commandId,'started');
 evidence.checks.wrong=await post('cancel',cancel('-wrong','absent','action'));assert.equal(evidence.checks.wrong.status,404);
 evidence.checks.old=await post('cancel',{...ca,scope:{...scope,authorityEpoch:'old'}});assert.equal(evidence.checks.old.body.code,'STALE_AUTHORITY_EPOCH');
 evidence.checks.kind=await post('cancel',cancel('-wrong-kind',next.commandId,'goal'));assert.equal(evidence.checks.kind.body.code,'TARGET_KIND_MISMATCH');
 assert.equal((await get('commands/'+next.commandId)).body.attemptId,nextStarted.attemptId);await step(1.5);await wait(next.commandId,'succeeded');
 // Goal TTL on Unix time must publish withdrawal even with simulation paused.
 const ttl={...goal('-ttl-paused','idle'),ttlMs:1200};await post('commands',ttl);await wait(ttl.commandId,'maintaining');
 evidence.checks.ttlPaused=await wait(ttl.commandId,'withdrawn');assert.deepEqual(evidence.checks.ttlPaused.attempts,[]);
 await page.waitForFunction(()=>window.__h5.pendingReports()===0);const final=await get('snapshot?worldId='+scope.worldId+'&actorId='+scope.actorId);evidence.checks.final=final;
 for(const cid of [idle.commandId,look.commandId,manual.commandId,lower.commandId,ttl.commandId,action.commandId,ca.commandId]){const http=(await get('commands/'+cid)).body;assert.deepEqual(final.body.commands.find(r=>r.commandId===cid).result,http);for(let i=0;i<100&&!evidence.sse.some(r=>r.event==='receipt'&&r.data.data.commandId===cid&&r.data.data.status===http.status);i++)await delay(20);const event=evidence.sse.findLast(r=>r.event==='receipt'&&r.data.data.commandId===cid&&r.data.data.status===http.status);assert(event,cid+' SSE');assert.deepEqual(event.data.data,http);}
 assert.deepEqual(evidence.errors,[]);evidence.dispatch=ws;evidence.status='ready_for_review';
 // Optional affected old network chain in its own new browser and fresh service is run separately.
}catch(e){evidence.failure=String(e);process.exitCode=1;}
finally{
 if(browser){for(const context of browser.contexts())for(const page of context.pages())evidence.finalBrowser=await page.evaluate(()=>window.__h5?{trace:window.__h5.trace(),hops:window.__h5.hops(),diagnostics:window.__h5.diagnostics()}:null).catch(()=>null);await browser.close();}
 await terminate(reader);
 if(service){evidence.service.cmdline=readFileSync(`/proc/${service.pid}/cmdline`,'utf8').replaceAll('\0',' ');assert(evidence.service.cmdline.includes(new URL('run.py',here).pathname));evidence.service.exit=await terminate(service);let listening=true;try{await fetch(base+'/api/h5a/capabilities',{headers,signal:AbortSignal.timeout(500)});}catch(e){if(!(e instanceof TypeError||e instanceof DOMException))throw e;listening=false;}evidence.service.listeningAfter=listening;assert.equal(listening,false);}
 const path=new URL(`evidence/${id}.json`,here);writeFileSync(path,JSON.stringify(evidence,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({path:path.pathname,sha256:sha(readFileSync(path)),status:evidence.status,failure:evidence.failure}));
}
