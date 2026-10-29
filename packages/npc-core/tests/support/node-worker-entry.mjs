// Node worker adapter for the platform-neutral planner bundle. The bundle
// exports handlePlanRequest and wires itself only in a browser Worker scope;
// here `node:worker_threads` supplies the message port.
import { parentPort } from 'node:worker_threads';
import { handlePlanRequest } from '../../dist/planner-worker.mjs';

if (!parentPort) throw new Error('node-worker-entry must run inside a Worker');
parentPort.on('message', (message) => {
  parentPort.postMessage(handlePlanRequest(message));
});
