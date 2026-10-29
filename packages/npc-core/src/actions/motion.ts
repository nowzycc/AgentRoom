/**
 * Motion/body adapter boundary. The executor never touches Three, VRM bones or
 * clips directly: M4 supplies a real adapter, M2 ships a fake one that covers
 * the full work/cancel/failure chain, including path, seat clearance, hand
 * reach and clip-confirmation failures.
 */
import type { ActionDefinition } from '../planner/catalog.js';
import type { EffectSet, FactSet } from '../planner/types.js';

export interface BodyProfile {
  /** Maximum comfortable hand reach from the seated shoulder position, metres. */
  handReachM: number;
  /** Distance from the seated shoulder to the keyboard target, metres. */
  keyboardDistanceM: number;
  /** Free space in front of the seat for a safe sit/stand, metres. */
  seatClearanceM: number;
}

export interface MotionContext {
  facts: FactSet;
  body: BodyProfile;
}

export type MotionCallKind =
  | 'preflight'
  | 'begin'
  | 'advance'
  | 'confirm'
  | 'exit'
  | 'force-stop'
  | 'cleanup';


export interface MotionCall {
  kind: MotionCallKind;
  actionId: string;
  actionKey: string;
  atSimMs: number;
}

export interface MotionFeasibility {
  ok: boolean;
  reason: string | null;
}

export type EvidenceDependencyKind = 'resource' | 'host' | 'scene' | 'matrix' | 'nav' | 'profile' | 'lease';

export interface EvidenceDependency {
  readonly kind: EvidenceDependencyKind;
  readonly id: string;
  readonly revision: number;
}

export interface PostPhysicsCompletion {
  readonly kind: 'post-physics';
  readonly observationKind: string;
  /** Last world step visible when the adapter proposed this terminal. */
  readonly afterSimStep: number;
  readonly dependencies: readonly EvidenceDependency[];
  readonly details?: Readonly<Record<string, boolean | number | string | null>>;
}

export interface LogicalCompletion {
  readonly kind: 'logical';
}

export type MotionCompletion = PostPhysicsCompletion | LogicalCompletion;

export interface MotionResult {
  status: 'running' | 'completed' | 'failed';
  reason: string | null;
  /**
   * Every completed action declares its success channel. Omission is an invalid
   * adapter result: it is retained only as a source-compatibility boundary for
   * frozen pre-H0 bundles, never interpreted as logical success by new core.
   */
  completion?: MotionCompletion;
}

export interface ActionEvidenceRequest {
  readonly actorId: string;
  readonly actionId: string;
  readonly attemptId: string;
  readonly observationKind: string;
  readonly afterSimStep: number;
  readonly dependencies: readonly EvidenceDependency[];
}

export interface MotionEvidence {
  readonly observationKind: string;
  readonly outcome: 'confirmed' | 'rejected';
  readonly reason: string | null;
  readonly simStep: number;
  readonly dependencies: readonly EvidenceDependency[];
}

export interface MotionAdapter {
  readonly calls: readonly MotionCall[];
  readonly exitDurationMs: number;
  /**
   * The body profile this adapter actually drives. NpcRuntime reads it for the
   * executor's reach/clearance preflight, so a wrapper (M3 claims, M4 IK) must
   * forward it instead of letting the runtime fall back to defaults
   * (M3-SPEC-03). Adapters without a body may omit it.
   */
  readonly body?: BodyProfile;
  preflight(definition: ActionDefinition, context: MotionContext, actionId: string): MotionFeasibility;
  begin(definition: ActionDefinition, context: MotionContext, actionId: string): void;
  advance(actionId: string, dtMs: number): void;
  result(actionId: string): MotionResult;
  /**
   * Evaluates a host observation against the adapter's own action state. Physical
   * adapters that request post-physics completion must implement this; logical
   * adapters omit it and never receive observations.
   */
  observe?(actionId: string, request: ActionEvidenceRequest): MotionEvidence;
  /**
   * Whether the body is PHYSICALLY in the slot this action claimed, even though
   * the action did not complete (e.g. a sit that failed its settle/contact gate
   * after the clip handed the body onto the chair). Claim wrappers use this in
   * cleanup so a failed action does not hand an occupied chair to another actor.
   * Adapters that cannot tell omit it; the wrapper then treats the body as gone.
   */
  slotHeld?(actionId: string): boolean;
  beginExit(actionId: string): void;
  advanceExit(actionId: string, dtMs: number): void;
  exitComplete(actionId: string): boolean;
  /**
   * Emergency stop when the safe exit exceeds its watchdog. Must synchronously
   * halt every motion applied by this adapter and return true only when the body
   * is at a safe rest pose. Returning false means "cannot confirm": the executor
   * then holds all body channels in `exit-unconfirmed` instead of releasing them.
   * A real (M4 Three/VRM) adapter implements this by stopping clips/IK and
   * snapping to a declared neutral pose, not by claiming success.
   */
  forceStop(actionId: string): boolean;
  cleanup(actionId: string): void;
}

export interface FakeMotionOptions {
  body?: Partial<BodyProfile>;
  durations?: Record<string, number>;
  exitMs?: number;
  /** Action keys whose path is unreachable (NO_PATH), with remaining uses. */
  blocked?: readonly string[];
  /** Action keys blocked for the first N preflights (then reachable). */
  blockCounts?: Record<string, number>;
  /** Action keys forced to HAND_UNREACHABLE regardless of the body profile. */
  unreachable?: readonly string[];
  /** Action keys whose confirmation fails after the duration elapses. */
  failConfirmation?: Record<string, string>;
  /** Action keys whose animation never progresses (executor timeout). */
  stall?: readonly string[];
  /**
   * Action keys whose confirmation fails AFTER the body reached the slot (the
   * real SEAT_NOT_SETTLED case). Marks the fake body seated so `slotHeld`
   * reports the chair as physically occupied by a failed action.
   */
  failSeated?: readonly string[];
}

interface FakeActionState {
  key: string;
  durationMs: number;
  elapsedMs: number;
  exitElapsedMs: number;
  exiting: boolean;
  cleaned: boolean;
}

export class FakeMotionAdapter implements MotionAdapter {
  readonly body: BodyProfile;
  readonly exitDurationMs: number;
  private readonly durations: Record<string, number>;
  private readonly blocked: Map<string, number>;
  private readonly unreachable: Set<string>;
  private readonly failConfirmation: Record<string, string>;
  private readonly stalled: Set<string>;
  private readonly failSeated: Set<string>;
  private readonly actions = new Map<string, FakeActionState>();
  private readonly callLog: MotionCall[] = [];
  private simMs = 0;
  /** Fake posture: true while the body occupies a seat. */
  private seated = false;

  constructor(options: FakeMotionOptions = {}) {
    this.body = {
      handReachM: options.body?.handReachM ?? 0.7,
      keyboardDistanceM: options.body?.keyboardDistanceM ?? 0.5,
      seatClearanceM: options.body?.seatClearanceM ?? 0.3,
    };
    this.durations = { ...(options.durations ?? {}) };
    this.blocked = new Map<string, number>();
    for (const key of options.blocked ?? []) this.blocked.set(key, Number.POSITIVE_INFINITY);
    for (const [key, count] of Object.entries(options.blockCounts ?? {})) this.blocked.set(key, count);
    this.unreachable = new Set(options.unreachable ?? []);
    this.failConfirmation = { ...(options.failConfirmation ?? {}) };
    this.stalled = new Set(options.stall ?? []);
    this.failSeated = new Set(options.failSeated ?? []);
    this.exitDurationMs = Math.max(0, options.exitMs ?? 300);
  }

  get calls(): readonly MotionCall[] {
    return this.callLog;
  }

  block(actionKey: string, times = Number.POSITIVE_INFINITY): void {
    this.blocked.set(actionKey, times);
  }

  unblock(actionKey: string): void {
    this.blocked.delete(actionKey);
  }

  setSimMs(simMs: number): void {
    this.simMs = simMs;
  }

  private record(kind: MotionCallKind, actionId: string, actionKey: string): void {
    this.callLog.push({ kind, actionId, actionKey, atSimMs: this.simMs });
  }

  private state(actionId: string, actionKey: string): FakeActionState {
    let found = this.actions.get(actionId);
    if (!found) {
      found = { key: actionKey, durationMs: 0, elapsedMs: 0, exitElapsedMs: 0, exiting: false, cleaned: false };
      this.actions.set(actionId, found);
    }
    return found;
  }

  preflight(definition: ActionDefinition, context: MotionContext, actionId: string): MotionFeasibility {
    this.record('preflight', actionId, definition.key);
    const remaining = this.blocked.get(definition.key) ?? 0;
    if (remaining > 0) {
      if (Number.isFinite(remaining)) this.blocked.set(definition.key, remaining - 1);
      return { ok: false, reason: 'NO_PATH' };
    }
    if (this.unreachable.has(definition.key)) return { ok: false, reason: 'HAND_UNREACHABLE' };
    if (definition.reach?.kind === 'hand') {
      // The reach test uses the body profile, not a planner prediction.
      if (context.body.handReachM + 1e-9 < context.body.keyboardDistanceM) {
        return { ok: false, reason: 'HAND_UNREACHABLE' };
      }
    }
    if (definition.key === 'sitOnDeskChair' && context.body.seatClearanceM < 0.05) {
      return { ok: false, reason: 'SEAT_BLOCKED' };
    }
    return { ok: true, reason: null };
  }

  begin(definition: ActionDefinition, _context: MotionContext, actionId: string): void {
    const state = this.state(actionId, definition.key);
    state.durationMs = this.durations[definition.key] ?? definition.durationMs;
    state.elapsedMs = 0;
    state.exitElapsedMs = 0;
    state.exiting = false;
    state.cleaned = false;
    this.record('begin', actionId, definition.key);
  }

  advance(actionId: string, dtMs: number): void {
    const state = this.actions.get(actionId);
    if (!state) return;
    if (!this.stalled.has(state.key)) state.elapsedMs += Math.max(0, dtMs);
    this.record('advance', actionId, state.key);
  }

  result(actionId: string): MotionResult {
    const state = this.actions.get(actionId);
    if (!state) return { status: 'failed', reason: 'UNKNOWN_ACTION' };
    this.record('confirm', actionId, state.key);
    if (state.elapsedMs + 1e-9 < state.durationMs) return { status: 'running', reason: null };
    const failure = this.failConfirmation[state.key];
    if (failure) {
      // A failure that happens after the body reached the seat (SEAT_NOT_SETTLED)
      // leaves the fake body seated, exactly like the real rig.
      if (this.failSeated.has(state.key)) this.seated = true;
      return { status: 'failed', reason: failure };
    }
    if (state.key === 'sitOnDeskChair') this.seated = true;
    if (state.key === 'standUp') this.seated = false;
    return { status: 'completed', reason: null, completion: { kind: 'logical' } };
  }

  /** True while the body physically occupies a seat (fake posture). */
  slotHeld(actionId: string): boolean {
    const state = this.actions.get(actionId);
    if (!state) return false;
    const seatAction = state.key === 'sitOnDeskChair' || state.key === 'typeAtKeyboard';
    // Only a failure that happened AFTER hand-over holds the slot; a completed
    // action is already handled by the wrapper's completed branch, and a motion
    // vetoed before commitment (scene moved) must not look like a seated body.
    return seatAction && this.seated && this.failSeated.has(state.key);
  }

  beginExit(actionId: string): void {
    const state = this.actions.get(actionId);
    if (!state) return;
    state.exiting = true;
    state.exitElapsedMs = 0;
    this.record('exit', actionId, state.key);
  }

  advanceExit(actionId: string, dtMs: number): void {
    const state = this.actions.get(actionId);
    if (!state || !state.exiting) return;
    state.exitElapsedMs += Math.max(0, dtMs);
  }

  exitComplete(actionId: string): boolean {
    const state = this.actions.get(actionId);
    if (!state) return true;
    return state.exitElapsedMs + 1e-9 >= this.exitDurationMs;
  }

  /**
   * The fake adapter "stops" by finishing the exit track synchronously: after
   * this call exitComplete() is true, which is exactly the confirmation the
   * executor requires before releasing the body. Adapters that cannot do that
   * return false and the executor keeps the channels.
   */
  forceStop(actionId: string): boolean {
    const state = this.actions.get(actionId);
    this.record('force-stop', actionId, state?.key ?? 'unknown');
    if (!state) return true;
    state.exiting = false;
    state.exitElapsedMs = Math.max(state.exitElapsedMs, this.exitDurationMs);
    return true;
  }

  cleanup(actionId: string): void {
    const state = this.actions.get(actionId);
    this.record('cleanup', actionId, state?.key ?? 'unknown');
    if (state) state.cleaned = true;
  }

  private defaultDurationFor(actionKey: string): number {
    // The executor passes the catalog duration via begin(); the fake records it
    // from the definition. This fallback keeps result() safe for unknown keys.
    return 0;
  }
}
