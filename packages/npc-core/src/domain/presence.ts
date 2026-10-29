import type { EventEnvelope } from '@npc/contracts';
import type { ActorState, ReduceOutcome } from '../types.js';

const MAX_HEARTBEAT_SCOPES = 64;

/** Domain liveness, not a bridge cache: immutable samples survive history eviction. */
export function recordHeartbeat(actor: ActorState, fact: Extract<EventEnvelope, { type: 'presence.heartbeat' }>, wallMs: number): ReduceOutcome {
 const sessionId = fact.sessionId ?? null;
 const sameScope = (sample: ActorState['presence']['samples'][number]) =>
  sample.source === fact.source && sample.epoch === fact.sourceEpoch && sample.sessionId === sessionId;
 const previous = actor.presence.samples.find(sameScope);
 if (previous && fact.sequence <= previous.sequence) return { status: 'rejected', reason: 'STALE_HEARTBEAT' };
 actor.presence = {
  status: fact.data.status,
  lastHeartbeatWallMs: wallMs,
  heartbeatCount: actor.presence.heartbeatCount + 1,
  heartbeatScope: { source: fact.source, epoch: fact.sourceEpoch, sessionId },
  samples: [...actor.presence.samples.filter(sample => !sameScope(sample)), {
   source: fact.source, epoch: fact.sourceEpoch, sessionId, sequence: fact.sequence,
   status: fact.data.status, receivedAtWallMs: wallMs,
  }].slice(-MAX_HEARTBEAT_SCOPES),
 };
 return { status: 'applied' };
}
