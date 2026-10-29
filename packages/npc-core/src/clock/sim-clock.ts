/**
 * Fixed-step simulation clock.
 *
 * Behaviour runs on a monotonic fixed step (default 60 Hz). Render time and
 * wall time are separate concerns: this clock only produces simulation steps.
 * A bounded catch-up budget prevents a long stall (tab hidden, GC pause) from
 * spiralling into an unbounded step loop; the unserved time is reported as
 * `droppedMs`/`lagMs` so the caller can surface it instead of hiding it.
 */

export interface SimClockOptions {
  /** Steps per simulated second. Fixed for the lifetime of the clock. */
  stepHz?: number;
  /** Maximum steps served by a single advance() call. */
  maxCatchUpSteps?: number;
}

export interface AdvanceResult {
  /** Number of fixed steps served by this call. */
  steps: number;
  /** Total simulated time after this call, in milliseconds. */
  simTimeMs: number;
  /** Simulation time discarded by the catch-up cap in this call. */
  droppedMs: number;
  /** Real time still owed to the simulation after this call (dropped + pending). */
  lagMs: number;
  /** Interpolation factor within the next step, in [0, 1). */
  alpha: number;
}

const EPSILON_MS = 1e-9;

export class SimClock {
  readonly stepHz: number;
  readonly stepMs: number;
  readonly maxCatchUpSteps: number;

  private simTimeMs = 0;
  private pendingMs = 0;
  private droppedTotalMs = 0;

  constructor(options: SimClockOptions = {}) {
    const hz = options.stepHz ?? 60;
    const cap = options.maxCatchUpSteps ?? 15;
    if (!Number.isFinite(hz) || hz <= 0 || hz > 1000) {
      throw new Error(`SimClock: stepHz must be in (0, 1000], got ${String(hz)}`);
    }
    if (!Number.isInteger(cap) || cap < 1) {
      throw new Error(`SimClock: maxCatchUpSteps must be an integer >= 1, got ${String(cap)}`);
    }
    this.stepHz = hz;
    this.stepMs = 1000 / hz;
    this.maxCatchUpSteps = cap;
  }

  get timeMs(): number {
    return this.simTimeMs;
  }

  get totalDroppedMs(): number {
    return this.droppedTotalMs;
  }

  /**
   * Feed real elapsed milliseconds and receive whole simulation steps.
   * Negative or non-finite deltas are programming errors, not input to absorb.
   */
  advance(realDeltaMs: number): AdvanceResult {
    if (!Number.isFinite(realDeltaMs) || realDeltaMs < 0) {
      throw new Error(`SimClock: delta must be a finite non-negative number, got ${String(realDeltaMs)}`);
    }

    this.pendingMs += realDeltaMs;

    let steps = 0;
    while (this.pendingMs + EPSILON_MS >= this.stepMs && steps < this.maxCatchUpSteps) {
      this.pendingMs -= this.stepMs;
      if (this.pendingMs < 0) this.pendingMs = 0;
      this.simTimeMs += this.stepMs;
      steps += 1;
    }

    let droppedMs = 0;
    if (this.pendingMs + EPSILON_MS >= this.stepMs) {
      // Still over budget after serving the cap: discard whole unserved steps
      // only. The sub-step remainder stays for interpolation.
      const whole = Math.floor(this.pendingMs / this.stepMs);
      droppedMs = whole * this.stepMs;
      this.pendingMs -= droppedMs;
      this.droppedTotalMs += droppedMs;
    }

    const alpha = Math.min(Math.max(this.pendingMs / this.stepMs, 0), 1 - Number.EPSILON);

    return {
      steps,
      simTimeMs: this.simTimeMs,
      droppedMs,
      lagMs: droppedMs + this.pendingMs,
      alpha,
    };
  }
}
