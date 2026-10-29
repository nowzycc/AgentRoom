import type {
  DomainEvent,
  DomainEventInput,
  DomainState,
  DispatchResult,
  RejectionRecord,
  TickResult,
} from '../types.js';
import { SimClock } from '../clock/sim-clock.js';
import { resolveConfig, type DomainConfig, type DomainConfigInput } from './config.js';
import { createInitialState, deepFreeze } from './state.js';
import { reduceStamped } from './reduce.js';
import { factDedupeKey } from './keys.js';

export interface DomainStoreOptions {
  worldId: string;
  config?: DomainConfigInput;
  /** Actors created with the initial state; others are created by their first event. */
  actors?: string[];
  /** Wall clock; injected so tests and replay are deterministic. */
  wallClock?: () => number;
  stepHz?: number;
  maxCatchUpSteps?: number;
}

export type StoreListener = (state: DomainState, previous: DomainState) => void;

/** A self-describing replay input: events plus the revision they must reproduce. */
export interface HistoryCheckpoint {
  config: DomainConfig;
  actors: string[];
  events: DomainEvent[];
  /** Revision of the live state when the checkpoint was taken. */
  revision: number;
  /** True when the buffer had already evicted older events. */
  truncated: boolean;
}

export interface ReplayResult {
  state: DomainState;
  /** False when the checkpoint is truncated or otherwise incomplete. */
  complete: boolean;
  replayedRevision: number;
}

const MAX_REJECTIONS = 128;

/**
 * The only writer of `DomainState`. Snapshots are deeply frozen; readers get a
 * blackboard projection (see blackboard.ts), never a writable state handle.
 */
export class DomainStore {
  private state: DomainState;
  private readonly clock: SimClock;
  private readonly wallClock: () => number;
  private readonly historyBuffer: DomainEvent[] = [];
  private readonly rejectionBuffer: RejectionRecord[] = [];
  private readonly seenFacts = new Map<string, true>();
  private readonly listeners = new Set<StoreListener>();
  private historyTruncated = false;

  constructor(options: DomainStoreOptions) {
    const config: DomainConfig = resolveConfig(options.worldId, options.config);
    this.state = createInitialState(config, options.actors ?? []);
    this.clock = new SimClock({
      stepHz: options.stepHz ?? 60,
      maxCatchUpSteps: options.maxCatchUpSteps ?? 15,
    });
    this.wallClock = options.wallClock ?? (() => Date.now());
  }

  get snapshot(): DomainState {
    return this.state;
  }

  get revision(): number {
    return this.state.revision;
  }

  /** Current injected wall clock, including time since the last domain tick. */
  get wallTimeMs(): number { return this.wallClock(); }

  get simTimeMs(): number {
    return this.state.simTimeMs;
  }

  /** Frozen copy; the internal buffer is never handed out. */
  get history(): readonly DomainEvent[] {
    return Object.freeze([...this.historyBuffer]);
  }

  /** Frozen copy of the bounded not-applied log (rejections and no-ops). */
  get rejections(): readonly RejectionRecord[] {
    return Object.freeze([...this.rejectionBuffer]);
  }

  /**
   * A replay input that carries its own completeness expectation. A truncated
   * buffer cannot silently masquerade as a full history.
   */
  checkpoint(): HistoryCheckpoint {
    return {
      config: this.state.config,
      actors: [...this.state.actorOrder],
      events: [...this.historyBuffer],
      revision: this.state.revision,
      truncated: this.historyTruncated,
    };
  }

  dispatch(input: DomainEventInput): DispatchResult {
    if (input.kind === 'tick') throw new Error('dispatch: use tick(deltaMs) for time');
    const wallMs = this.wallClock();
    const stamped = { ...input, wallMs, simMs: this.clock.timeMs } as DomainEvent;

    if (input.kind === 'fact') {
      const key = factDedupeKey(input.fact.source, input.fact.sourceEpoch, input.fact.eventId);
      if (this.seenFacts.has(key)) {
        return this.reject('fact', 'DUPLICATE_EVENT', wallMs);
      }
      const result = reduceStamped(this.state, stamped);
      if (result.outcome.status === 'applied') this.rememberFact(key);
      return this.commit(result.state, result.outcome, stamped, wallMs);
    }

    const result = reduceStamped(this.state, stamped);
    return this.commit(result.state, result.outcome, stamped, wallMs);
  }

  tick(realDeltaMs: number): TickResult {
    const advance = this.clock.advance(realDeltaMs);
    const wallMs = this.wallClock();
    const before = this.state;

    // Always observe wall time, even on a sub-step frame: TTLs are wall-based.
    const steps = Math.max(advance.steps, 1);
    for (let i = 0; i < steps; i += 1) {
      const realStep = i < advance.steps;
      const simMs = realStep
        ? advance.simTimeMs - (advance.steps - 1 - i) * this.clock.stepMs
        : advance.simTimeMs;
      const event: DomainEvent = {
        kind: 'tick',
        dtMs: realStep ? this.clock.stepMs : 0,
        wallMs,
        simMs,
      };
      const result = reduceStamped(this.state, event);
      if (result.outcome.status === 'applied') {
        this.state = result.state;
        this.pushHistory(event);
      }
    }

    if (this.state !== before) this.notify(before);

    return {
      steps: advance.steps,
      simTimeMs: this.state.simTimeMs,
      droppedMs: advance.droppedMs,
      lagMs: advance.lagMs,
      revision: this.state.revision,
    };
  }

  subscribeRaw(listener: StoreListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Rebuilds state from a checkpoint. `complete` is false if the buffer had
   * evicted events or if the replay does not land on the recorded revision;
   * callers analysing behaviour must not treat an incomplete replay as truth.
   */
  static replay(checkpoint: HistoryCheckpoint): ReplayResult {
    let state = createInitialState(checkpoint.config, checkpoint.actors);
    for (const event of checkpoint.events) {
      const result = reduceStamped(state, event);
      if (result.outcome.status === 'applied') state = result.state;
    }
    return {
      state,
      complete: !checkpoint.truncated && state.revision === checkpoint.revision,
      replayedRevision: state.revision,
    };
  }

  private commit(
    next: DomainState,
    outcome: { status: 'applied' | 'noop' | 'rejected'; reason?: string },
    event: DomainEvent,
    wallMs: number,
  ): DispatchResult {
    if (outcome.status === 'applied') {
      const previous = this.state;
      this.state = next;
      this.pushHistory(event);
      this.notify(previous);
      return { accepted: true, reason: outcome.reason ?? null, revision: next.revision };
    }
    if (outcome.status === 'noop') {
      this.recordRejection(event.kind, outcome.reason ?? 'NO_CHANGE', wallMs);
      return { accepted: false, reason: outcome.reason ?? 'NO_CHANGE', revision: this.state.revision };
    }
    return this.reject(event.kind, outcome.reason ?? 'REJECTED', wallMs);
  }

  private reject(kind: string, reason: string, wallMs: number): DispatchResult {
    this.recordRejection(kind, reason, wallMs);
    return { accepted: false, reason, revision: this.state.revision };
  }

  private recordRejection(kind: string, reason: string, wallMs: number): void {
    if (this.rejectionBuffer.length >= MAX_REJECTIONS) this.rejectionBuffer.shift();
    this.rejectionBuffer.push(Object.freeze({ atWallMs: wallMs, kind, reason }));
  }

  private rememberFact(key: string): void {
    if (this.seenFacts.size >= this.state.config.factDedupeLimit) {
      const oldest = this.seenFacts.keys().next();
      if (!oldest.done) this.seenFacts.delete(oldest.value);
    }
    this.seenFacts.set(key, true);
  }

  private pushHistory(event: DomainEvent): void {
    // Store a frozen copy: a caller mutating the dispatched fact afterwards
    // must not rewrite the replay log behind the state's back.
    this.historyBuffer.push(deepFreeze(structuredClone(event)));
    const limit = this.state.config.eventHistoryLimit;
    if (this.historyBuffer.length > limit) {
      this.historyBuffer.splice(0, this.historyBuffer.length - limit);
      this.historyTruncated = true;
    }
  }

  private notify(previous: DomainState): void {
    for (const listener of this.listeners) listener(this.state, previous);
  }
}
