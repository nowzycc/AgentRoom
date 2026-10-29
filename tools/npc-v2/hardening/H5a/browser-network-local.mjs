// Own only an ephemeral loopback service; reuse the existing network regression.
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import assert from 'node:assert/strict';
const here=new URL('./',import.meta.url),sha=b=>createHash('sha256').update(b).digest('hex');
const config=Object.fromEntries(readFileSync(new URL('.env.local',here),'utf8').trim().split('\n').map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1)];}));
const id=`network-local-${Date.now()}-${randomUUID()}`,evidence={id,status:'blocked',service:{},sources:{}};
for(const f of ['browser-network-local.mjs','browser-network.mjs','adapter.ts','network-goals.ts','receipts.py','dist/adapter.js'])evidence.sources[f]=sha(readFileSync(new URL(f,here)));
let service,base;
try{
 const socket=createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));base=`http://127.0.0.1:${port}`;
 service=spawn('python3',[new URL('run.py',here).pathname],{env:{...process.env,...config,H5_ORIGIN:base},stdio:['ignore','ignore','pipe']});
 evidence.service={pid:service.pid,base,log:''};service.stderr.on('data',b=>evidence.service.log+=b);
 for(let i=0;i<100;i++){assert.equal(service.exitCode,null,evidence.service.log);try{const r=await fetch(base+'/api/h5a/capabilities',{headers:{Authorization:`Bearer ${config.H5_HARNESS_TOKEN}`},signal:AbortSignal.timeout(500)});if(r.ok){evidence.probe=await r.json();break;}}catch(e){if(!(e instanceof TypeError||e instanceof DOMException))throw e;}await delay(50);}
 assert(evidence.probe,'authenticated capabilities probe');
 const regression=spawn(process.execPath,[new URL('browser-network.mjs',here).pathname],{env:{...process.env,H5_ORIGIN:base},stdio:['ignore','pipe','pipe']});
 evidence.stdout='';evidence.stderr='';regression.stdout.on('data',b=>evidence.stdout+=b);regression.stderr.on('data',b=>evidence.stderr+=b);
 evidence.exit=await new Promise(r=>regression.once('exit',(code,signal)=>r({code,signal})));
 assert.equal(evidence.exit.code,0,evidence.stdout+evidence.stderr);
 const result=JSON.parse(evidence.stdout.trim());assert.equal(result.status,'ready_for_review');
 evidence.regression=result;assert.equal(sha(readFileSync(result.path)),result.sha256);evidence.status='ready_for_review';
}catch(e){evidence.failure=String(e);process.exitCode=1;}
finally{
 if(service&&service.exitCode===null&&service.signalCode===null){evidence.service.cmdline=readFileSync(`/proc/${service.pid}/cmdline`,'utf8').replaceAll('\0',' ');assert(evidence.service.cmdline.includes(new URL('run.py',here).pathname));const exit=new Promise(r=>service.once('exit',(code,signal)=>r({code,signal})));service.kill('SIGTERM');evidence.service.exit=await exit;}
 const socket=createServer();await new Promise((resolve,reject)=>{socket.once('error',reject);socket.listen(Number(new URL(base).port),'127.0.0.1',resolve);});await new Promise(r=>socket.close(r));evidence.service.listeningAfter=false;
 const path=new URL(`evidence/${id}.json`,here);writeFileSync(path,JSON.stringify(evidence,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({path:path.pathname,sha256:sha(readFileSync(path)),status:evidence.status,failure:evidence.failure}));
}
