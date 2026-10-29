import Ajv2020 from '../../../../packages/npc-contracts/node_modules/ajv/dist/2020.js';
import addFormats from '../../../../packages/npc-contracts/node_modules/ajv-formats/dist/index.js';
import common from '../../../../packages/npc-contracts/schemas/common.schema.json';
import envelope from '../../../../packages/npc-contracts/schemas/envelope.schema.json';
import eventSchema from '../../../../packages/npc-contracts/schemas/event.schema.json';
import type { EventEnvelope } from '../../../../packages/npc-contracts/src/types.js';
import type { HarnessPolicy } from '../../../../packages/npc-core/src/harness/policy.js';
export { executionReceipt } from '../../../../packages/npc-core/src/harness/receipt.js';
export { HarnessBridge } from '../../../../packages/npc-core/src/harness/bridge.js';
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
ajv.addSchema(common); ajv.addSchema(envelope);
const event = ajv.compile<EventEnvelope>(eventSchema);
const goal = { enum: ['work', 'think', 'converse', 'rest', 'idle', 'lookAround', null] };
const policy = ajv.compile<HarnessPolicy>({ type: 'object', additionalProperties: false,
  required: ['source','sessionId','observerId','actorId','heartbeatStaleAfterMs','failureVisibleForMs','goalTtlMs','manualTtlMs','goals'],
  properties: {
    standingPlaceholder: { type:'object',additionalProperties:false,required:['originalGoal','reason'],properties:{originalGoal:{enum:['work']},reason:{type:'string',minLength:1}} },
    source: { type: 'string', minLength: 1 }, sessionId: { type: 'string', minLength: 1 },
    observerId: { type: 'string', minLength: 1 }, actorId: { type: 'string', minLength: 1 },
    failureVisibleForMs: { type: 'number', minimum: 0 },
    heartbeatStaleAfterMs: { type: 'number', exclusiveMinimum: 0 },
    goalTtlMs: { type: 'number', exclusiveMinimum: 0 }, manualTtlMs: { type: 'number', exclusiveMinimum: 0 },
    goals: { type: 'object', additionalProperties: false, required: ['unknown','disconnected','working','waiting','idle','error'],
      properties: { unknown: goal, disconnected: goal, working: goal, waiting: goal, idle: goal, error: goal } },
  },
});
export class HarnessInputError extends Error {
  constructor(readonly detail: string) { super(detail); }
}
export function parseHarnessEvent(input: unknown): EventEnvelope {
  if (!event(input)) throw new HarnessInputError(ajv.errorsText(event.errors));
  return input;
}
export function parseHarnessPolicy(input: unknown): HarnessPolicy {
  if (!policy(input)) throw new HarnessInputError(ajv.errorsText(policy.errors));
  if (input.observerId === input.actorId) throw new HarnessInputError('observerId must differ from actorId');
  return input;
}
