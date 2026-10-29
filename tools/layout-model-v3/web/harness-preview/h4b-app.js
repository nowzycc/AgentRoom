import './app.js';
const $ = id => document.getElementById(id);
let runtime, lastRequest = null, lastResult = null;
const transitions = [];
function render() {
  const receipt = lastRequest ? runtime.singleActionReceipt(lastRequest.requestId) ?? lastResult : lastResult;
  $('single-status').textContent = receipt?.status ?? 'none';
  $('single-detail').textContent = JSON.stringify({ request: lastRequest, receipt }, null, 2);
  const view = window.__h4a.view();
  $('observation-reason').textContent = view.observed.reason;
  if (receipt && JSON.stringify(transitions.at(-1)) !== JSON.stringify(receipt)) transitions.push(receipt);
  return receipt;
}
function submit(input) {
  lastResult = runtime.requestSingleAction(input);
  if (lastResult.accepted) lastRequest = input;
  $('receipt').textContent = JSON.stringify(lastResult);
  render();
  return lastResult;
}
function boot() {
  if (!window.__h4a?.ready) { setTimeout(boot, 100); return; }
  const slice = $('scene').contentWindow.__npcStage;
  runtime = slice.runtime;
  const capabilities = runtime.singleActionCapabilities();
  $('single-capabilities').textContent = JSON.stringify(capabilities, null, 2);
  $('single').onclick = () => submit({ requestId: `single-ui-${Array.from(crypto.getRandomValues(new Uint32Array(4)), value => value.toString(16)).join('-')}`, actionKey: 'lookAround',
    issuedAtWallMs: slice.store.wallTimeMs, ttlMs: 10000 });
  $('single-repeat').disabled = false;
  $('single-repeat').onclick = () => lastRequest && submit(lastRequest);
  $('single-cancel').disabled = false;
  $('single-cancel').onclick = () => { if (lastRequest) runtime.cancelSingleAction(lastRequest.requestId); render(); };
  window.__h4b = { ready: true, capabilities, submit, receipt: id => runtime.singleActionReceipt(id),
    request: () => lastRequest, view: render, transitions: () => transitions.slice(),
    cancel: id => { const result = runtime.cancelSingleAction(id); render(); return result; },
    step: async seconds => { const view = await window.__h4a.step(seconds); render(); return view; } };
  setInterval(render, 100);
  render();
}
boot();
