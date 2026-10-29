/**
 * M1-Q-01 performance guard: retention must keep the domain inside the 60 Hz
 * frame budget after a long ingest, and the state must stay bounded.
 */
import { describe, expect, it } from 'vitest';
import { ACTOR, Harness } from './helpers.js';

const tools = (h: Harness, actorId = ACTOR) => Object.values(h.actor(actorId).tools);

describe('M1-Q-01 sustained ingest', () => {
  it('ticks inside the 60 Hz budget after 10 000 completed tools', { timeout: 120_000 }, () => {
    const h = new Harness();
    h.heartbeat();
    for (let i = 0; i < 10_000; i += 1) {
      h.toolStarted({ toolCallId: `t${i}` });
      h.toolCompleted({ toolCallId: `t${i}` });
    }
    expect(tools(h).length).toBeLessThanOrEqual(1_024);

    const started = process.hrtime.bigint();
    h.tickFor(1_000);
    const msPerTick = Number(process.hrtime.bigint() - started) / 1e6 / 60;
    expect(msPerTick).toBeLessThan(16.67);
  });
});
