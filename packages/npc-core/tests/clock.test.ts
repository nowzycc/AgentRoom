import { describe, expect, it } from 'vitest';
import { SimClock } from '../src/clock/sim-clock.js';

describe('SimClock fixed step', () => {
  it('produces one step per 1/60 s and keeps sub-step remainder as alpha', () => {
    const clock = new SimClock({ stepHz: 60, maxCatchUpSteps: 15 });
    const a = clock.advance(1000 / 60);
    expect(a.steps).toBe(1);
    expect(a.simTimeMs).toBeCloseTo(1000 / 60, 9);
    expect(a.alpha).toBeGreaterThanOrEqual(0);
    expect(a.alpha).toBeLessThan(1);
    expect(a.droppedMs).toBe(0);
  });

  it('is deterministic for the same delta sequence', () => {
    const run = () => {
      const c = new SimClock({ stepHz: 60, maxCatchUpSteps: 15 });
      const out: number[] = [];
      for (const dt of [7, 8.5, 16.6, 33.3, 3.2, 16.7]) {
        const r = c.advance(dt);
        out.push(r.steps, Number(r.simTimeMs.toFixed(6)));
      }
      return out.join(',');
    };
    expect(run()).toBe(run());
  });

  it('caps catch-up work and reports dropped simulated time instead of spiralling', () => {
    const clock = new SimClock({ stepHz: 60, maxCatchUpSteps: 15 });
    const r = clock.advance(5000);
    expect(r.steps).toBe(15);
    expect(r.simTimeMs).toBeCloseTo(15 * (1000 / 60), 9);
    expect(r.droppedMs).toBeGreaterThan(4000);
    expect(r.lagMs).toBeGreaterThan(0);
  });

  it('reports lag when a normal frame arrives after a long stall', () => {
    const clock = new SimClock({ stepHz: 60, maxCatchUpSteps: 4 });
    clock.advance(16.6667);
    const r = clock.advance(250);
    expect(r.steps).toBe(4);
    expect(r.lagMs).toBeGreaterThan(100);
    // 250 ms with a 4-step cap discards whole steps, leaving no sub-step remainder
    expect(r.alpha).toBeGreaterThanOrEqual(0);
    expect(r.alpha).toBeLessThan(1e-5);
  });

  it('rejects negative and non-finite deltas instead of silently absorbing them', () => {
    const clock = new SimClock({ stepHz: 60, maxCatchUpSteps: 15 });
    expect(() => clock.advance(-1)).toThrow(/delta/i);
    expect(() => clock.advance(Number.NaN)).toThrow(/delta/i);
    expect(() => clock.advance(Number.POSITIVE_INFINITY)).toThrow(/delta/i);
  });

  it('accumulates sub-step time until a full step is due', () => {
    const clock = new SimClock({ stepHz: 60, maxCatchUpSteps: 15 });
    const a = clock.advance(5);
    const b = clock.advance(5);
    expect(a.steps).toBe(0);
    expect(b.steps).toBe(0);
    const c = clock.advance(7);
    expect(c.steps).toBe(1);
    expect(c.simTimeMs).toBeCloseTo(1000 / 60, 9);
  });
});
