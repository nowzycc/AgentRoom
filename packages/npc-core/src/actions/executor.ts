/**
 * Action execution: created → preflight → acquiring → running → succeeded,
 * with cancel going through `exiting` until the motion adapter confirms a safe
 * stop. Exactly one terminal state is produced per action, cleanup runs once,
 * channel locks are released only after the body is clear, and effects are
 * handed back (never applied here) only on confirmed success.
 *
 * Safety contract for an exit that never confirms (M2-SPEC-03):
 * - the exit watchdog asks the adapter for a synchronous emergency stop;
 * - only an adapter-confirmed stop (`forceStop() === true`) may release the
 *   body and produce a `cancelled` terminal;
 * - otherwise the action enters `exit-unconfirmed`, keeps every channel, emits
 *   no terminal, and blocks any other action until `releaseUnconfirmed()` (an
 *   explicit operator/safety recovery) or a late adapter confirmation.
 */
// allow: SIZE_OK — existing executor safe-exit/evidence handshake; this slice only preserves its terminal identity.
import type { ActionDefinition, Channel } from '../planner/catalog.js';
import type { ConditionSet, EffectSet, FactSet, FactValue } from '../planner/types.js';
import { ChannelLocks } from '../resources/channels.js';
import type {
  ActionEvidenceRequest,
  BodyProfile,
  EvidenceDependency,
  MotionAdapter,
  MotionContext,
  MotionEvidence,
  MotionFeasibility,
  MotionResult,
  PostPhysicsCompletion,
} from './motion.js';

export type ExecPhase =
  | 'created'
  | 'preflight'
  | 'acquiring'
  | 'running'
  | 'awaiting-evidence'
  | 'exiting'
  | 'exit-unconfirmed'
  | 'succeeded'
  | 'failed'
  | 'cancelled';

export type TerminalOutcome = 'success' | 'failed' | 'cancelled';

export type HazardKind = 'exit-unconfirmed' | 'unsafe-release' | 'adapter-error';

/** A safety event the host must surface (never silently repaired). */
export interface ActionHazard {
  actionId: string;
  actionKey: string;
  goalId: string;
  planId: string;
  kind: HazardKind;
  reason: string;
  atSimMs: number;
}

export interface ActionTerminal {
  actionId: string;
  readonly attemptId: string;
  actionKey: string;
  goalId: string;
  planId: string;
  planRevision: number;
  outcome: TerminalOutcome;
  reason: string | null;
  /** Empty unless the outcome is `success`; the runtime commits these. */
  effects: EffectSet;
  atSimMs: number;
  elapsedMs: number;
  exitElapsedMs: number;
}

export interface ActionRuntimeView {
  actionId: string;
  actionKey: string;
  goalId: string;
  planId: string;
  planRevision: number;
  attemptId: string;
  evidenceKind: string | null;
  readonly phase: ExecPhase;
  channels: readonly Channel[];
  elapsedMs: number;
  exitElapsedMs: number;
  durationMs: number;
  reason: string | null;
}

export interface StartActionOptions {
  actorId?: string;
  actionId: string;
  goalId: string;
  planId: string;
  planRevision: number;
  facts: FactSet;
}

export interface StartResult {
  ok: boolean;
  actionId: string;
  attemptId: string | null;
  reason: string | null;
  terminal: ActionTerminal | null;
}

export interface EvidenceReceipt {
  readonly status: 'accepted' | 'rejected';
  readonly reason: string | null;
  readonly terminal: ActionTerminal | null;
}

export interface UpdateOptions {
  /**
   * True when the action's goal is being replaced and its outcome must not be
   * confirmed. A motion that completes in this frame is then downgraded to an
   * effect-less cancellation (M2-SPEC-01), because the goal request arrived
   * while the action was still running.
   */
  supersedes?: (goalId: string) => boolean;
}

export interface ActionExecutorOptions {
  motion: MotionAdapter;
  body: BodyProfile;
  locks?: ChannelLocks;
  nowSimMs?: () => number;
  /** Hard cap on running time; the safety net for a stalled animation. */
  actionTimeoutMs?: number;
  /** Hard cap on the safe exit; exceeding it asks the adapter to stop safely. */
  exitTimeoutMs?: number;
  /** Bounded terminal log (oldest dropped first). */
  maxTerminalLog?: number;
  maxHazardLog?: number;
}

interface InternalAction {
  definition: ActionDefinition;
  options: StartActionOptions;
  attemptId: string;
  phase: ExecPhase;
  startedAtSimMs: number;
  elapsedMs: number;
  exitElapsedMs: number;
  exitOutcome: 'cancelled' | 'failed';
  reason: string | null;
  completion: PostPhysicsCompletion | null;
  /** Why the exit is unconfirmed; null while the body is safely tracked. */
  unconfirmedReason: string | null;
  settled: boolean;
}

interface PendingTerminal {
  outcome: TerminalOutcome;
  reason: string | null;
}

const DEFAULT_MAX_TERMINAL_LOG = 256;
const DEFAULT_MAX_HAZARD_LOG = 32;

export class ActionExecutor {
  private readonly motion: MotionAdapter;
  private readonly body: BodyProfile;
  private readonly locks: ChannelLocks;
  private readonly nowSimMs: () => number;
  private readonly actionTimeoutMs: number;
  private readonly exitTimeoutMs: number;
  private readonly maxTerminalLog: number;
  private readonly maxHazardLog: number;
  private active: InternalAction | null = null;
  private disposed = false;
  private attemptCounter = 0;
  private readonly terminalLog: ActionTerminal[] = [];
  private readonly hazardLog: ActionHazard[] = [];
  private readonly pending: ActionTerminal[] = [];

  constructor(options: ActionExecutorOptions) {
    this.motion = options.motion;
    this.body = { ...options.body };
    this.locks = options.locks ?? new ChannelLocks();
    this.nowSimMs = options.nowSimMs ?? (() => 0);
    this.actionTimeoutMs = Math.max(1, options.actionTimeoutMs ?? 60_000);
    this.exitTimeoutMs = Math.max(1, options.exitTimeoutMs ?? 5_000);
    this.maxTerminalLog = Math.max(1, options.maxTerminalLog ?? DEFAULT_MAX_TERMINAL_LOG);
    this.maxHazardLog = Math.max(1, options.maxHazardLog ?? DEFAULT_MAX_HAZARD_LOG);
  }

  get current(): ActionRuntimeView | null {
    return this.active ? viewOf(this.active) : null;
  }

  get terminals(): readonly ActionTerminal[] {
    return this.terminalLog;
  }

  /** Safety events that need host/operator attention. Bounded, newest last. */
  get hazards(): readonly ActionHazard[] {
    return this.hazardLog;
  }

  get lockSnapshot(): ReadonlyArray<{ channel: Channel; owner: string }> {
    return this.locks.snapshot();
  }

  start(definition: ActionDefinition, options: StartActionOptions): StartResult {
    if (this.disposed) return { ok: false, actionId: options.actionId, attemptId: null, reason: 'DISPOSED', terminal: null };
    if (this.active) return { ok: false, actionId: options.actionId, attemptId: null, reason: 'BUSY', terminal: null };

    const attemptId = `${options.actionId}:attempt:${++this.attemptCounter}`;
    const action: InternalAction = {
      definition,
      options,
      attemptId,
      phase: 'created',
      startedAtSimMs: this.nowSimMs(),
      elapsedMs: 0,
      exitElapsedMs: 0,
      exitOutcome: 'cancelled',
      reason: null,
      completion: null,
      unconfirmedReason: null,
      settled: false,
    };
    this.active = action;

    action.phase = 'preflight';
    if (!conditionsHold(options.facts, definition.preconditions)) {
      const terminal = this.settle(action, { outcome: 'failed', reason: 'PRECONDITION_FAILED' });
      return { ok: false, actionId: options.actionId, attemptId, reason: 'PRECONDITION_FAILED', terminal };
    }
    const context: MotionContext = { facts: options.facts, body: this.body };
    let feasibility: MotionFeasibility;
    try {
      feasibility = this.motion.preflight(definition, context, options.actionId);
    } catch (error) {
      const reason = `ADAPTER_ERROR:${messageOf(error)}`;
      const terminal = this.settle(action, { outcome: 'failed', reason });
      return { ok: false, actionId: options.actionId, attemptId, reason, terminal };
    }
    if (!feasibility.ok) {
      const terminal = this.settle(action, { outcome: 'failed', reason: feasibility.reason ?? 'PREFLIGHT_FAILED' });
      return { ok: false, actionId: options.actionId, attemptId, reason: feasibility.reason ?? 'PREFLIGHT_FAILED', terminal };
    }

    action.phase = 'acquiring';
    const acquired = this.locks.acquire(options.actionId, definition.channels);
    if (!acquired.ok) {
      const reason = acquired.conflict ? 'CHANNEL_CONFLICT' : 'CHANNEL_CONFLICT';
      const terminal = this.settle(action, { outcome: 'failed', reason });
      return { ok: false, actionId: options.actionId, attemptId, reason, terminal };
    }

    action.phase = 'running';
    try {
      this.motion.begin(definition, context, options.actionId);
    } catch (error) {
      const reason = `ADAPTER_ERROR:${messageOf(error)}`;
      const terminal = this.settle(action, { outcome: 'failed', reason });
      return { ok: false, actionId: options.actionId, attemptId, reason, terminal };
    }
    return { ok: true, actionId: options.actionId, attemptId, reason: null, terminal: null };
  }

  requestCancel(reason: string): boolean {
    const action = this.active;
    if (!action || (action.phase !== 'running' && action.phase !== 'awaiting-evidence')) return false;
    return this.beginSafeExit(action, reason);
  }

  update(dtMs: number, options: UpdateOptions = {}): ActionTerminal[] {
    const action = this.active;
    if (!action) return this.drain();
    const dt = Math.max(0, dtMs);

    if (action.phase === 'running') {
      action.elapsedMs += dt;
      try {
        this.motion.advance(action.options.actionId, dt);
      } catch (error) {
        this.beginSafeExit(action, `ADAPTER_ERROR:${messageOf(error)}`, 'failed');
        return this.drain();
      }
      let result: MotionResult;
      try {
        result = this.motion.result(action.options.actionId);
      } catch (error) {
        this.beginSafeExit(action, `ADAPTER_ERROR:${messageOf(error)}`, 'failed');
        return this.drain();
      }
      if (result.status === 'completed') {
        if (options.supersedes?.(action.options.goalId)) {
          // The goal was replaced while the action was still running. The body
          // reached rest (the adapter confirmed it), so cleanup is safe, but the
          // predicted effect must not become a fact for the next plan.
          this.settle(action, { outcome: 'cancelled', reason: 'cancel:goal_switch:superseded' });
        } else if (result.completion?.kind === 'post-physics') {
          if (!this.motion.observe) {
            this.beginSafeExit(action, 'EVIDENCE_ADAPTER_UNSUPPORTED', 'failed');
          } else {
            action.completion = result.completion;
            action.phase = 'awaiting-evidence';
          }
        } else if (result.completion?.kind === 'logical') {
          this.settle(action, { outcome: 'success', reason: null });
        } else {
          this.beginSafeExit(action, 'COMPLETION_CLASSIFICATION_REQUIRED', 'failed');
        }
      } else if (result.status === 'failed') {
        this.beginSafeExit(action, result.reason ?? 'MOTION_FAILED', 'failed');
      } else if (action.elapsedMs > this.actionTimeoutMs) {
        this.beginSafeExit(action, 'ACTION_TIMEOUT', 'failed');
      }
    } else if (action.phase === 'awaiting-evidence') {
      action.elapsedMs += dt;
      if (action.elapsedMs > this.actionTimeoutMs) this.beginSafeExit(action, 'evidence_timeout');
    } else if (action.phase === 'exiting' || action.phase === 'exit-unconfirmed') {
      action.exitElapsedMs += dt;
      let complete: boolean;
      try {
        this.motion.advanceExit(action.options.actionId, dt);
        complete = this.motion.exitComplete(action.options.actionId);
      } catch (error) {
        this.enterUnconfirmed(action, `advance_exit:${messageOf(error)}`, 'adapter-error');
        return this.drain();
      }
      if (complete) {
        const reason =
          action.unconfirmedReason === null
            ? action.reason
            : `${action.reason}:exit_unconfirmed:late_complete`;
        this.settle(action, { outcome: action.exitOutcome, reason });
      } else if (action.phase === 'exiting' && action.exitElapsedMs > this.exitTimeoutMs) {
        if (this.requestForcedStop(action)) {
          // The adapter synchronously stopped the motion and confirmed a safe
          // rest pose; only now may the body be released.
          this.settle(action, { outcome: action.exitOutcome, reason: `${action.reason ?? 'cancel'}:forced_stop` });
        } else {
          this.enterUnconfirmed(action, `exit_timeout:${this.exitTimeoutMs}ms`, 'exit-unconfirmed');
        }
      }
    }

    return this.drain();
  }

  /**
   * Reads one authoritative post-world-step observation from the adapter. The
   * executor supplies identity, the candidate's last visible step and declared
   * dependencies; callers cannot manufacture a solved step or contact outcome.
   */
  observe(): EvidenceReceipt {
    const action = this.active;
    if (!action) return { status: 'rejected', reason: 'EVIDENCE_NO_ACTIVE_ACTION', terminal: null };
    if (action.phase !== 'awaiting-evidence' || !action.completion) {
      return { status: 'rejected', reason: 'EVIDENCE_NOT_AWAITED', terminal: null };
    }
    if (!this.motion.observe) {
      return this.rejectThroughSafeExit(action, 'EVIDENCE_ADAPTER_UNSUPPORTED');
    }
    const request: ActionEvidenceRequest = {
      actorId: action.options.actorId ?? '',
      actionId: action.options.actionId,
      attemptId: action.attemptId,
      observationKind: action.completion.observationKind,
      afterSimStep: action.completion.afterSimStep,
      dependencies: action.completion.dependencies,
    };
    let evidence: MotionEvidence;
    try {
      evidence = this.motion.observe(action.options.actionId, request);
    } catch (error) {
      return this.rejectThroughSafeExit(action, `ADAPTER_ERROR:${messageOf(error)}`);
    }
    if (evidence.observationKind !== request.observationKind) {
      return this.rejectThroughSafeExit(action, 'EVIDENCE_KIND_MISMATCH');
    }
    if (evidence.simStep <= request.afterSimStep) {
      return this.rejectThroughSafeExit(action, 'EVIDENCE_STEP_NOT_AFTER_CANDIDATE');
    }
    const mismatch = firstDependencyMismatch(request.dependencies, evidence.dependencies);
    if (mismatch) {
      return this.rejectThroughSafeExit(action, `EVIDENCE_VERSION_MISMATCH:${mismatch.kind}:${mismatch.id}`);
    }
    if (evidence.outcome === 'rejected') {
      return this.rejectThroughSafeExit(action, evidence.reason ?? 'EVIDENCE_REJECTED');
    }
    const terminal = this.settle(action, { outcome: 'success', reason: null });
    return { status: 'accepted', reason: null, terminal };
  }

  /**
   * Explicit operator/safety recovery from `exit-unconfirmed`. The caller takes
   * responsibility for the body (e.g. having teleported/reset it by hand); the
   * release is recorded as a hazard so it can never look like a clean exit.
   */
  releaseUnconfirmed(actionId: string, reason: string): ActionTerminal | null {
    const action = this.active;
    if (!action || action.options.actionId !== actionId || action.phase !== 'exit-unconfirmed') return null;
    this.recordHazard(action, 'unsafe-release', reason);
    return this.settle(action, {
      outcome: 'cancelled',
      reason: `${action.reason}:exit_unconfirmed:released:${reason}`,
    });
  }

  /**
   * Tears the executor down: no new actions, the active action is force-stopped
   * and settled once. Disposal is host teardown, so a refused force-stop is
   * recorded as an unsafe release rather than leaving the runtime wedged.
   */
  dispose(reason = 'dispose'): void {
    if (this.disposed) return;
    this.disposed = true;
    const action = this.active;
    if (!action) return;
    const safe = this.requestForcedStop(action);
    if (!safe) this.recordHazard(action, 'unsafe-release', `${reason}:force_stop_unconfirmed`);
    this.settle(action, { outcome: 'cancelled', reason: `${action.reason ?? 'dispose'}:disposed:${reason}` });
  }

  drain(): ActionTerminal[] {
    const out = this.pending.splice(0, this.pending.length);
    return out;
  }

  private rejectThroughSafeExit(action: InternalAction, reason: string): EvidenceReceipt {
    this.beginSafeExit(action, `evidence_rejected:${reason}`);
    return { status: 'rejected', reason, terminal: null };
  }

  private beginSafeExit(action: InternalAction, reason: string, outcome: 'cancelled' | 'failed' = 'cancelled'): boolean {
    action.completion = null;
    action.exitOutcome = outcome;
    action.reason = outcome === 'failed' ? reason : `cancel:${reason}`;
    action.exitElapsedMs = 0;
    action.phase = 'exiting';
    try {
      this.motion.beginExit(action.options.actionId);
    } catch (error) {
      // The adapter never started an exit: the body state is unknown, so hold it.
      this.enterUnconfirmed(action, `begin_exit:${messageOf(error)}`, 'adapter-error');
    }
    return true;
  }

  private requestForcedStop(action: InternalAction): boolean {
    try {
      return this.motion.forceStop(action.options.actionId) === true;
    } catch (error) {
      this.recordHazard(action, 'adapter-error', `force_stop:${messageOf(error)}`);
      return false;
    }
  }

  private enterUnconfirmed(action: InternalAction, cause: string, kind: HazardKind): void {
    if (action.phase === 'exit-unconfirmed') return;
    action.phase = 'exit-unconfirmed';
    action.unconfirmedReason = cause;
    this.recordHazard(action, kind, cause);
  }

  private recordHazard(action: InternalAction, kind: HazardKind, reason: string): void {
    this.hazardLog.push({
      actionId: action.options.actionId,
      actionKey: action.definition.key,
      goalId: action.options.goalId,
      planId: action.options.planId,
      kind,
      reason,
      atSimMs: this.nowSimMs(),
    });
    if (this.hazardLog.length > this.maxHazardLog) {
      this.hazardLog.splice(0, this.hazardLog.length - this.maxHazardLog);
    }
  }

  private settle(action: InternalAction, terminal: PendingTerminal): ActionTerminal | null {
    if (action.settled) return null;
    action.settled = true;
    action.phase = terminal.outcome === 'success' ? 'succeeded' : terminal.outcome === 'cancelled' ? 'cancelled' : 'failed';
    action.reason = terminal.reason;

    // Cleanup and lock release run exactly once, on every exit path. An adapter
    // that throws in cleanup must not swallow the terminal or leak the channels.
    try {
      this.motion.cleanup(action.options.actionId);
    } catch (error) {
      this.recordHazard(action, 'adapter-error', `cleanup:${messageOf(error)}`);
    }
    this.locks.release(action.options.actionId);

    const terminalOutcome = terminal.outcome === 'cancelled' && action.reason?.startsWith('cancel:evidence_rejected:')
      ? 'failed'
      : terminal.outcome;
    const terminalReason = terminalOutcome === 'failed' && action.reason?.startsWith('cancel:evidence_rejected:')
      ? action.reason.slice('cancel:evidence_rejected:'.length)
      : terminal.reason;
    const result: ActionTerminal = {
      actionId: action.options.actionId,
      attemptId: action.attemptId,
      actionKey: action.definition.key,
      goalId: action.options.goalId,
      planId: action.options.planId,
      planRevision: action.options.planRevision,
      outcome: terminalOutcome,
      reason: terminalReason,
      effects: terminalOutcome === 'success' ? action.definition.effects : {},
      atSimMs: this.nowSimMs(),
      elapsedMs: action.elapsedMs,
      exitElapsedMs: action.exitElapsedMs,
    };
    this.terminalLog.push(result);
    if (this.terminalLog.length > this.maxTerminalLog) {
      this.terminalLog.splice(0, this.terminalLog.length - this.maxTerminalLog);
    }
    this.pending.push(result);
    if (this.active === action) this.active = null;
    return result;
  }
}

function firstDependencyMismatch(
  expected: readonly EvidenceDependency[],
  actual: readonly EvidenceDependency[],
): EvidenceDependency | null {
  const actualByKey = new Map(actual.map((dependency) => [`${dependency.kind}:${dependency.id}`, dependency.revision]));
  for (const dependency of expected) {
    if (actualByKey.get(`${dependency.kind}:${dependency.id}`) !== dependency.revision) return dependency;
  }
  return null;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function viewOf(action: InternalAction): ActionRuntimeView {
  return {
    actionId: action.options.actionId,
    actionKey: action.definition.key,
    goalId: action.options.goalId,
    planId: action.options.planId,
    planRevision: action.options.planRevision,
    attemptId: action.attemptId,
    evidenceKind: action.completion?.observationKind ?? null,
    phase: action.phase,
    channels: action.definition.channels,
    elapsedMs: action.elapsedMs,
    exitElapsedMs: action.exitElapsedMs,
    durationMs: action.definition.durationMs,
    reason: action.unconfirmedReason === null ? action.reason : `${action.reason}:exit_unconfirmed:${action.unconfirmedReason}`,
  };
}

/** Preconditions are checked against confirmed facts, with missing = false. */
export function conditionsHold(facts: FactSet, conditions: ConditionSet): boolean {
  for (const [key, condition] of Object.entries(conditions)) {
    const value: FactValue | FactValue[] = facts[key] ?? false;
    if (typeof condition === 'boolean') {
      if (value !== condition) return false;
      continue;
    }
    if (typeof condition === 'number') {
      if (value !== condition) return false;
      continue;
    }
    if (typeof value !== 'number') return false;
    if (condition.eq !== undefined && value !== condition.eq) return false;
    if (condition.gte !== undefined && !(value >= condition.gte)) return false;
    if (condition.lte !== undefined && !(value <= condition.lte)) return false;
    if (condition.gt !== undefined && !(value > condition.gt)) return false;
    if (condition.lt !== undefined && !(value < condition.lt)) return false;
  }
  return true;
}
