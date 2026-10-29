import { HarnessBridge, executionReceipt, parseHarnessEvent, parseHarnessPolicy } from './boundary.js';
const $ = id => document.getElementById(id);
const frame = $('scene');
const response = await fetch(new URL('./policy.json', import.meta.url), { signal: AbortSignal.timeout(10000) });
if (!response.ok) throw new Error(`POLICY_HTTP_${response.status}`);
const policy = parseHarnessPolicy(await response.json());
let api, slice, bridge, seq = 0, heartbeat = false, run = 0;
const log = [];
const epoch = `preview-${Date.now()}`;
let toolA, toolB, runId;
function receipt(result) {
  $('receipt').textContent = JSON.stringify(result);
  $('receipt').dataset.error = String(result.accepted === false);
  log.push(result); if (log.length > 60) log.shift();
  $('trace').textContent = JSON.stringify(log, null, 2);
  return result;
}
function emit(type, data = {}, ids = {}) {
  const event = parseHarnessEvent({ specVersion:'1.0', source:policy.source, sourceEpoch:epoch,
    sequence:++seq,eventId:`${epoch}-${seq}`,worldId:slice.store.snapshot.worldId,actorId:policy.observerId,
    sessionId:policy.sessionId,occurredAt:new Date().toISOString(),type,data,...ids });
  const result = bridge.ingest(event);
  render(); return receipt({ type, sequence:seq, occurredAt:event.occurredAt,
    receivedWallMs:slice.store.snapshot.wallTimeMs, ...result });
}
function render() {
  if (!bridge) return;
  const v = bridge.view(), actual = slice.view();
  const actor = slice.store.snapshot.actors[policy.actorId];
  const runtime = slice.runtime.view();
  const execution = executionReceipt(v.request, runtime, slice.runtime.terminals);
  const failures = runtime.failures;
  const status = actual.action ? `${actual.action.actionKey} / ${actual.action.phase}` : execution.goalStatus;
  const pending = execution.reason;
  $('mapping').textContent = policy.standingPlaceholder ? `原目标 ${policy.standingPlaceholder.originalGoal} · ${policy.standingPlaceholder.reason} · 当前配置 ${policy.goals.working}` : '';
  $('observed').textContent = v.observed.state;
  $('activity').textContent = `tools ${v.observed.activeTools} · runs ${v.observed.activeRuns} · heartbeat ${v.observed.receivedAtWallMs ?? 'none'}`;
  $('desired').textContent = v.desiredGoal ?? 'null（撤回 policy）';
  $('effective').textContent = `${v.effectiveGoal ?? 'null'}${v.manualCommandId ? ' · manual override' : ''}`;
  $('actual').textContent = status;
  $('execution').textContent = `本请求回执 ${execution.status}`;
  $('posture').textContent = `goal ${actual.goalId ?? 'none'} · posture ${actor?.posture ?? 'unknown'} · rig seated ${slice.rig.seated} · transition ${slice.rig.transitioning}`;
  $('reason').textContent = String(pending);
  $('command').textContent = `policy ${v.commandId ?? 'none'} · ${v.reason ?? 'command accepted ≠ executed'}`;
  return { ...v, execution, runtime, terminals:slice.runtime.terminals, actionHistory:actor?.actions, actual, actualPosture:actor?.posture, rigSeated:slice.rig.seated, rigTransitioning:slice.rig.transitioning, pending, failures };
}
async function boot() {
  const child = frame.contentWindow;
  if (!child?.__envnpc?.ready) { setTimeout(boot, 200); return; }
  api = child.__envnpc; slice = child.__npcStage;
  if (!slice?.store || !slice.runtime) throw new Error('EXISTING_RUNTIME_UNAVAILABLE');
  if (slice.actorId !== policy.actorId) throw new Error('POLICY_ACTOR_MISMATCH');
  const style = child.document.createElement('style');
  style.textContent = '#toolbar,#detail,#eventlog,#boundary,#hud{display:none!important}'; child.document.head.append(style);
  bridge = new HarnessBridge(slice.store, policy, {withdraw:id => slice.runtime.cancel({scope:'goal',targetCommandId:id}), revision:()=>slice.runtime.executionRevision});
  const bind = (id, handler) => { $(id).disabled = false; $(id).onclick = handler; };
  bind('working', () => {
    heartbeat = true; runId = `run-${++run}`; toolA = `${runId}-a`; toolB = `${runId}-b`;
    emit('presence.heartbeat',{status:'alive'}); emit('run.started',{}, {runId});
    emit('tool.started',{toolCallId:toolA,activityClass:'coding'},{runId});
    emit('tool.started',{toolCallId:toolB,activityClass:'coding'},{runId});
  });
  bind('one',()=>emit('tool.completed',{toolCallId:toolA,outcome:'success'},{runId}));
  bind('waiting',()=>{emit('tool.completed',{toolCallId:toolA,outcome:'success'},{runId});emit('tool.completed',{toolCallId:toolB,outcome:'success'},{runId});});
  bind('idle',()=>emit('run.completed',{outcome:'success'},{runId}));
  bind('disconnect',()=>{heartbeat=false;receipt({accepted:true,reason:'HEARTBEAT_STOPPED_WAIT_FOR_TIMEOUT'});render();});
  bind('manual',()=>{receipt({manualCommandId:bridge.manual('lookAround')});render();});
  bind('release',()=>{bridge.releaseManual();receipt({reason:'MANUAL_RELEASED'});render();});
  bind('single',()=>{receipt(bridge.singleAction('stand'));render();});
  setInterval(()=>{if(heartbeat)emit('presence.heartbeat',{status:'alive'});},1000);
  setInterval(()=>{bridge.refresh();render();},200);
  window.__h4a = { ready:true, view:render, emit, policy,
    ingest:input=>receipt(bridge.ingest(parseHarnessEvent(input))),
    step:async seconds=>{
      const steps=Math.max(1,Math.round(seconds*60));
      for(let i=0;i<steps;i++){bridge.refresh();await api.step(1/60);}
      bridge.refresh();return render();
    },
    setManual:on=>api.setManual(on), setRender:on=>api.setRender(on),
    manual:goal=>bridge.manual(goal),
    stopHeartbeat:()=>{heartbeat=false;}, history:()=>slice.store.history,
  };
  receipt({accepted:true,reason:'READY_EXISTING_SINGLE_RUNTIME'});render();
}
boot();
