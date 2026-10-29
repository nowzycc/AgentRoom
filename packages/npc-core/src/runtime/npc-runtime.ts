/**
 * NPC runtime glue (M2): the M1 domain store remains the only writer of domain
 * state. This host reads its snapshot, asks the PlannerPort for a plan bound to
 * the semantic revision, executes one action at a time through the executor and
 * commits effects only after execution confirmation. It is the only place that
 * implements the interruption handshake: cancel → safe exit → goal.commit.
 */
// allow: SIZE_OK — existing runtime owns the single executor/handshake; request data is split into single-action.ts.
import type { GoalId } from '@npc/contracts';
import { SingleActionLedger, type SingleActionReceipt } from './single-action.js';
import type { DomainStore } from '../domain/store.js';
import type { DomainState, Interruption } from '../types.js';
import { ActionExecutor, conditionsHold, type ActionRuntimeView, type ActionTerminal, type EvidenceReceipt } from '../actions/executor.js';
import type { BodyProfile, MotionAdapter } from '../actions/motion.js';
import {
  ACTION_CATALOG,
  defaultFacts,
  getActionDefinition,
  goalConditions,
  planSpecs,
  type ActionDefinition,
} from '../planner/catalog.js';
import { readId } from '../domain/idmap.js';
import { cancellationResumeKeys, type CancelIntent } from './cancellation.js';
import type { ChannelLocks } from '../resources/channels.js';
import { applyEffects } from '../planner/goap-core.js';
import type { FactSet, FactValue, PlanRequest, PlanResponse, PlannerPort } from '../planner/types.js';

/** Process-unique runtime sequence: plan/action ids must not collide between runtimes. */
let runtimeInstance = 0;

/** Bounded retries for a rejected goal commit (never a cancel/replan loop). */
const MAX_COMMIT_RETRIES = 3;
/** Bounded hazard-dedupe memory for long sessions. */
const MAX_REPORTED_HAZARDS = 1_024;

export interface NpcRuntimeOptions {
  store: DomainStore;
  actorId: string;
  planner: PlannerPort;
  motion: MotionAdapter;
  body?: BodyProfile;
  /** Actions this actor may use (M3 narrows by scene); defaults to the catalog. */
  actionKeys?: readonly string[];
  maxReplanAttempts?: number;
  planBudgetMs?: number;
  actionTimeoutMs?: number;
  /** Safe-exit watchdog; an unconfirmed exit holds the body (M2-SPEC-03). */
  exitTimeoutMs?: number;
  /** Bounded runtime logs (oldest dropped first). */
  maxTerminalLog?: number;
  maxFailureLog?: number;
  seatAvailable?: () => boolean;
  /**
   * Optional shared channel table. Each actor body owns one table; two runtimes
   * driving the same body must share it so the second cannot take a channel the
   * first is using (M2-SPEC2-05 / M3).
   */
  locks?: ChannelLocks;
  /** Optional degraded-mode planner, used only when the primary returns error. */
  fallback?: PlannerPort;
}

export type RuntimeFailureKind =
  | 'action-failed'
  | 'no-plan'
  | 'planner-timeout'
  | 'planner-error'
  | 'stale-plan'
  | 'commit-rejected'
  | 'exit-unconfirmed'
  | 'unsafe-release'
  | 'replan-exhausted';

export interface RuntimeFailure {
  readonly revision: number;
  atSimMs: number;
  goalId: GoalId | null;
  planId: string | null;
  kind: RuntimeFailureKind;
  reason: string | null;
}

export interface RuntimeStats {
  planRequests: number;
  plansApplied: number;
  plansDiscarded: number;
  plansRejected: number;
  actionsStarted: number;
  actionsSucceeded: number;
  actionsFailed: number;
  actionsCancelled: number;
  goalCommits: number;
  replans: number;
}

export interface RuntimeView {
  actorId: string;
  facts: FactSet;
  goalId: GoalId | null;
  goalLayer: string | null;
  plan: PlanResponse | null;
  planIndex: number;
  action: ActionRuntimeView | null;
  failures: readonly RuntimeFailure[];
  stats: RuntimeStats;
}

interface SessionState {
  goalId: GoalId;
  status: 'executing' | 'satisfied' | 'failed';
  fingerprint: string;
}

interface InFlight {
  planId: string;
  promise: Promise<void>;
}

export class NpcRuntime {
  private readonly store: DomainStore;
  private readonly actorId: string;
  private readonly planner: PlannerPort;
  private readonly fallback: PlannerPort | null;
  private readonly motion: MotionAdapter;
  private readonly executor: ActionExecutor;
  private readonly singles = new SingleActionLedger();
  private singleCounter = 0;
  private readonly actionKeys: readonly string[];
  private readonly maxReplanAttempts: number;
  private readonly planBudgetMs: number;
  private readonly maxTerminalLog: number;
  private readonly maxFailureLog: number;
  private readonly seatAvailable: () => boolean;

  private readonly instanceId = ++runtimeInstance;
  private factState: Record<string, FactValue>;
  /**
   * Already-applied external fact revisions (device feedback). Kept separate
   * from the domain store's facts revision: a device state lives in the device
   * controller, not in the M0 fact protocol, but a plan computed before the
   * feedback must still be recognised as stale.
   */
  private externalFactsRevision = 0;
  private currentPlan: PlanResponse | null = null;
  private steps: ActionDefinition[] = [];
  private stepIndex = 0;
  private session: SessionState | null = null;
  private attempts = 0;
  private planCounter = 0;
  private inFlight: InFlight | null = null;
  private lastCommitAttempt: string | null = null;
  private lastInterruptKey: string | null = null;
  private commitRetries = 0;
  private disposedFlag = false;
  private cancellationBaseline: ReadonlySet<string> | null = null;
  private cancelCounter = 0;
  private readonly reportedHazards = new Set<string>();
  private readonly failureLog: RuntimeFailure[] = [];
  private readonly terminalLog: ActionTerminal[] = [];
  private readonly counters: RuntimeStats = {
    planRequests: 0,
    plansApplied: 0,
    plansDiscarded: 0,
    plansRejected: 0,
    actionsStarted: 0,
    actionsSucceeded: 0,
    actionsFailed: 0,
    actionsCancelled: 0,
    goalCommits: 0,
    replans: 0,
  };

  constructor(options: NpcRuntimeOptions) {
    this.store = options.store;
    this.actorId = options.actorId;
    this.planner = options.planner;
    this.fallback = options.fallback ?? null;
    this.motion = options.motion;
    this.actionKeys = options.actionKeys ?? Object.keys(ACTION_CATALOG);
    this.maxReplanAttempts = Math.max(1, options.maxReplanAttempts ?? 3);
    this.planBudgetMs = Math.max(1, options.planBudgetMs ?? 4_000);
    this.maxTerminalLog = Math.max(1, options.maxTerminalLog ?? 256);
    this.maxFailureLog = Math.max(1, options.maxFailureLog ?? 512);
    this.seatAvailable = options.seatAvailable ?? (() => true);
    this.factState = defaultFacts();
    this.executor = new ActionExecutor({
      motion: this.motion,
      ...(options.locks ? { locks: options.locks } : {}),
      body: options.body ?? this.motionBody(),
      nowSimMs: () => this.store.snapshot.simTimeMs,
      actionTimeoutMs: options.actionTimeoutMs ?? 60_000,
      exitTimeoutMs: options.exitTimeoutMs,
      maxTerminalLog: this.maxTerminalLog,
    });
  }

  /** Explicitly resource-free: gaze animation, no candidate or fabricated revision. */
  singleActionCapabilities() {
    return this.actionKeys.includes('lookAround') ? [{ actionKey: 'lookAround', posture: 'standing', candidate: null,
      resourceDependencies: [], versionDependencies: [], channels: ACTION_CATALOG.lookAround?.channels ?? [] }] : [];
  }

  requestSingleAction(input: unknown): SingleActionReceipt {
    const actor = this.actorSnapshot();
    const manual = actor?.manual || actor?.goal.active?.layer === 'manual' ||
      actor?.goal.candidates.some(candidate => candidate.layer === 'manual');
    const refusal = this.disposedFlag ? 'DISPOSED' : manual ? 'MANUAL_PRIORITY' :
      this.store.snapshot.worldPaused || actor?.goal.active?.layer === 'safety' ? 'SAFETY_PRIORITY' :
      this.factState.sitting || actor?.posture === 'sitting' || this.factState.fridgeGrasped ? 'STANDING_REQUIRED' :
      !this.actionKeys.includes('lookAround') ? 'UNSUPPORTED_ACTION' :
      this.singles.active || this.executor.current || this.inFlight || this.pendingInterrupt() || this.executionHeld || this.steps.length > 0 ? 'BUSY' : null;
    return this.singles.accept(input, { nowWallMs: this.store.wallTimeMs, refusal });
  }

  singleActionReceipt(requestId: string): SingleActionReceipt | null { return this.singles.receipt(requestId); }

  cancelSingleAction(requestId: string, reason = 'operator:single-action'): boolean {
    const entry = this.singles.active;
    if (!entry || entry.request.requestId !== requestId) return false;
    this.singles.cancel(reason);
    if (entry.receipt.actionId) this.executor.requestCancel(reason);
    else this.singles.finishBeforeStart('cancelled', reason);
    return true;
  }

  /** Drive a command only through this runtime's existing executor. */
  private stepSingleAction(): void {
    const entry = this.singles.active;
    if (!entry || entry.receipt.status !== 'accepted') return;
    if (entry.request.issuedAtWallMs + entry.request.ttlMs <= this.store.wallTimeMs) {
      this.singles.finishBeforeStart('failed', 'TTL_EXPIRED');
      return;
    }
    const definition = getActionDefinition(entry.request.actionKey);
    if (!definition) { this.singles.finishBeforeStart('failed', 'UNSUPPORTED_ACTION'); return; }
    this.resetPlan();
    const actionId = `single-${this.instanceId}-${++this.singleCounter}`;
    const result = this.executor.start(definition, { actorId: this.actorId, actionId,
      goalId: 'single-action', planId: actionId, planRevision: this.executionRevision, facts: this.facts });
    this.singles.bind(actionId, result.attemptId);
    if (result.ok && this.executor.current) {
      this.singles.started(this.executor.current);
      this.counters.actionsStarted += 1;
    }
    this.processTerminals(this.executor.drain(), null);
  }

  private refreshSingleActionPriority(): void {
    const entry = this.singles.active;
    if (!entry) return;
    const actor = this.actorSnapshot();
    const reason = this.store.snapshot.worldPaused || actor?.goal.active?.layer === 'safety' ? 'SAFETY_PRIORITY' :
      actor?.manual || actor?.goal.candidates.some(candidate => candidate.layer === 'manual') ? 'MANUAL_PRIORITY' :
      entry.request.issuedAtWallMs + entry.request.ttlMs <= this.store.wallTimeMs ? 'TTL_EXPIRED' : null;
    if (reason) this.cancelSingleAction(entry.request.requestId, reason);
  }

  /** Cancellation pauses execution, never invents a stand or releases a lease. */
  get executionHeld(): boolean {
    return this.cancellationBaseline !== null;
  }

  cancel(intent: CancelIntent): boolean {
    if (this.disposedFlag) return false;
    if (intent.scope === 'action' && this.singles.active) return this.cancelSingleAction(this.singles.active.request.requestId);
    const actor = this.actorSnapshot();
    const cancelCommand = (targetCommandId: string): boolean => this.store.dispatch({
      kind: 'command',
      command: {
        specVersion: '1.0', commandId: `runtime-${this.instanceId}-cancel-${++this.cancelCounter}`,
        worldId: this.store.snapshot.worldId, actorId: this.actorId,
        type: 'goal.cancel', targetCommandId, priorityClass: 'task', ttlMs: 60_000, onConflict: 'queue',
      },
    }).accepted;
    let hold = true;
    switch (intent.scope) {
      case 'action':
        if (!this.executor.current) return false;
        break;
      case 'goal': {
        const target = actor ? readId(actor.commands, intent.targetCommandId) : undefined;
        if (!cancelCommand(intent.targetCommandId)) return false;
        // A goal withdrawal is not cancellation of an independently owned command.
        if (this.singles.active) return true;
        if (target?.goalId !== actor?.goal.active?.goalId) return true;
        const candidates = this.actorSnapshot()?.goal.candidates ?? [];
        if (candidates.some((candidate) => candidate.layer !== 'autonomy' && candidate.goalId === target?.goalId)) return true;
        hold = !candidates.some((candidate) => candidate.layer !== 'autonomy');
        break;
      }
      case 'work':
        for (const command of Object.values(actor?.commands ?? {})) {
          if (command.type === 'goal.request' && command.status === 'active') cancelCommand(command.commandId);
        }
        break;
      default: {
        const exhaustive: never = intent;
        return exhaustive;
      }
    }
    if (hold) this.cancellationBaseline = cancellationResumeKeys(this.actorSnapshot());
    this.externalFactsRevision += 1; // invalidate an already-running planner response
    this.resetPlan();
    this.factState.handsOnKeyboard = false;
    this.executor.requestCancel(`operator:${intent.scope}`);
    return true;
  }

  private refreshCancellationHold(): void {
    if (!this.cancellationBaseline) return;
    const keys = cancellationResumeKeys(this.actorSnapshot());
    if ([...keys].some((key) => !this.cancellationBaseline?.has(key))) this.cancellationBaseline = null;
  }

  /** Same version coordinate used by planner requests and attempt terminals. */
  get executionRevision(): number { return this.factsRevision(); }

  get facts(): FactSet {
    return { ...this.factState };
  }

  /**
   * Apply a measured EXTERNAL state (a device's feedback event) to the plan
   * facts. Only declared facts may be written; an unknown key is a programming
   * error, not a new fact. The action that predicted the same change still
   * commits its effect as a no-op, so the device remains the single authority.
   *
   * A plan in flight is invalidated by bumping the revision the planner sees.
   */
  applyExternalFacts(partial: Readonly<Record<string, boolean>>): { applied: string[]; revision: number } {
    const applied: string[] = [];
    for (const [key, value] of Object.entries(partial)) {
      if (!Object.prototype.hasOwnProperty.call(this.factState, key)) {
        throw new Error(`UNKNOWN_FACT:${key}`);
      }
      if (typeof value !== 'boolean') throw new TypeError(`FACT_NOT_BOOLEAN:${key}`);
      if (this.factState[key] !== value) {
        this.factState[key] = value;
        applied.push(key);
      }
    }
    if (applied.length > 0) this.externalFactsRevision += 1;
    return { applied, revision: this.factsRevision() };
  }

  private factsRevision(): number {
    return this.store.snapshot.factsRevision + this.externalFactsRevision;
  }

  get plan(): PlanResponse | null {
    return this.currentPlan;
  }

  get action(): ActionRuntimeView | null {
    return this.executor.current;
  }

  /** Reads and commits one adapter-owned post-world-step observation. */
  observeAction(): EvidenceReceipt {
    const receipt = this.executor.observe();
    this.processTerminals(this.executor.drain(), this.pendingInterrupt());
    this.reportHazards();
    return receipt;
  }

  get terminals(): readonly ActionTerminal[] {
    return this.terminalLog;
  }

  get failures(): readonly RuntimeFailure[] {
    return this.failureLog;
  }

  get stats(): RuntimeStats {
    return { ...this.counters };
  }

  get busy(): boolean {
    return this.inFlight !== null;
  }

  get disposed(): boolean {
    return this.disposedFlag;
  }

  /**
   * Operator/safety recovery for an unconfirmed safe exit. The body must already
   * have been made safe by the caller; the release is recorded as a hazard and
   * the action terminates exactly once (M2-SPEC-03).
   */
  recoverUnconfirmedExit(reason: string): ActionTerminal | null {
    const actionId = this.executor.current?.actionId;
    if (!actionId) return null;
    const terminal = this.executor.releaseUnconfirmed(actionId, reason);
    this.reportHazards();
    return terminal;
  }

  /**
   * Tears the runtime down: no further steps or plans, the active action is
   * force-stopped and settled once, and the planner (plus any fallback) is
   * terminated so no worker outlives the runtime (M2-SPEC-05).
   */
  dispose(reason = 'runtime_dispose'): void {
    if (this.disposedFlag) return;
    this.disposedFlag = true;
    if (this.singles.active && !this.singles.active.receipt.actionId) this.singles.finishBeforeStart('cancelled', reason);
    this.executor.dispose(reason);
    this.processTerminals(this.executor.drain(), null);
    this.reportHazards();
    try {
      this.planner.terminate();
    } catch {
      // Teardown must not throw out of dispose.
    }
    if (this.fallback) {
      try {
        this.fallback.terminate();
      } catch {
        // Same.
      }
    }
    this.inFlight = null;
    this.resetPlan();
  }

  /** Awaits every in-flight plan, including one started while settling. */
  async settle(): Promise<void> {
    let guard = 0;
    while (this.inFlight && guard < 8) {
      guard += 1;
      const pending = this.inFlight.promise;
      await pending;
      if (this.inFlight && this.inFlight.promise === pending) break;
    }
  }

  /** Advances one frame: domain time, execution, handshake, planning. */
  step(dtMs: number): void {
    if (this.disposedFlag) return;
    this.store.tick(dtMs);
    this.refreshCancellationHold();
    this.syncFacts();
    // Read the pending interruption before execution advances: a goal request
    // that arrived while the action was still running must suppress the effect
    // even if this very frame completes the motion (M2-SPEC-01).
    this.refreshSingleActionPriority();
    const interrupt = this.pendingInterrupt();
    const direct = this.singles.active !== null;
    const supersedes =
      direct || interrupt === null ? undefined : (goalId: string): boolean => interrupt.toGoalId !== goalId;
    this.processTerminals(this.executor.update(dtMs, { supersedes }), interrupt);
    this.reportHazards();
    this.stepSingleAction();
    if (this.singles.active) return;
    this.handleGoalState();
    this.startNextStep();
    this.refreshPlan();
  }

  /** Test/UI convenience: fixed sub-steps until `ms` elapses, awaiting plans. */
  async advance(ms: number, frameMs = 16): Promise<void> {
    let left = Math.max(0, ms);
    while (left > 1e-9) {
      const dt = Math.min(frameMs, left);
      this.step(dt);
      if (this.busy) await this.settle();
      left -= dt;
    }
  }

  /** Forces a planner round-trip (diagnostics/tests); respects `inFlight`. */
  requestPlan(): Promise<void> {
    this.refreshPlan(true);
    return this.settle();
  }

  view(): RuntimeView {
    const actor = this.actorSnapshot();
    return {
      actorId: this.actorId,
      facts: { ...this.factState },
      goalId: actor?.goal.active?.goalId ?? null,
      goalLayer: actor?.goal.active?.layer ?? null,
      plan: this.currentPlan,
      planIndex: this.stepIndex,
      action: this.executor.current,
      failures: this.failureLog,
      stats: { ...this.counters },
    };
  }

  private motionBody(): BodyProfile {
    // The adapter is the authority on the body it actually drives; a wrapper
    // that hides it must not silently get the default profile (M3-SPEC-03).
    const body = this.motion.body;
    return body ? { ...body } : { handReachM: 0.7, keyboardDistanceM: 0.5, seatClearanceM: 0.3 };
  }

  private actorSnapshot(): DomainState['actors'][string] | undefined {
    const state = this.store.snapshot;
    return readId(state.actors, this.actorId);
  }

  private syncFacts(): void {
    const actor = this.actorSnapshot();
    this.factState.sitting = actor?.posture === 'sitting';
    this.factState.seatAvailable = this.seatAvailable();
    // "Hands on the keyboard" is a state of the WORK goal, not a posture that
    // survives it: once the goal is withdrawn (cancel) or replaced (think), the
    // hands are off the keys. Leaving the committed typing effect behind made a
    // later work request look already satisfied, so the re-sit/cancel recovery
    // never planned `typeAtKeyboard` (measured in the M4 re-sit probe after a
    // stand and after an operator cancel).
    if (this.executionHeld || (actor?.goal.active?.goalId ?? null) !== 'work') this.factState.handsOnKeyboard = false;
  }

  private activeGoalId(): GoalId | null {
    return this.actorSnapshot()?.goal.active?.goalId ?? null;
  }

  private pendingInterrupt(): Interruption | null {
    return this.actorSnapshot()?.goal.interrupt ?? null;
  }

  /**
   * Surfaces safety events from the executor once each. An unconfirmed exit or
   * an operator release is a real failure of the clean handshake, never a silent
   * success, and it is what a host/UI must show.
   */
  private reportHazards(): void {
    for (const hazard of this.executor.hazards) {
      const key = `${hazard.actionId}:${hazard.kind}:${hazard.reason}`;
      if (this.reportedHazards.has(key)) continue;
      this.reportedHazards.add(key);
      // The dedupe set is a long-session structure too: keep it bounded by
      // dropping the oldest insertions (Set preserves insertion order).
      if (this.reportedHazards.size > MAX_REPORTED_HAZARDS) {
        const oldest = this.reportedHazards.values().next();
        if (!oldest.done) this.reportedHazards.delete(oldest.value);
      }
      if (hazard.kind === 'unsafe-release') {
        this.recordFailure('unsafe-release', `${hazard.actionKey}:${hazard.reason}`);
      } else {
        this.recordFailure('exit-unconfirmed', `${hazard.actionKey}:${hazard.kind}:${hazard.reason}`);
      }
    }
  }

  private fingerprint(): string {
    const keys = Object.keys(this.factState).sort();
    return JSON.stringify(keys.map((key) => [key, this.factState[key]]));
  }

  private resetPlan(): void {
    this.currentPlan = null;
    this.steps = [];
    this.stepIndex = 0;
    this.session = null;
  }

  private handleGoalState(): void {
    if (this.disposedFlag) return;
    const actor = this.actorSnapshot();
    const active = actor?.goal.active ?? null;
    const interrupt = actor?.goal.interrupt ?? null;
    const action = this.executor.current;

    if (!active) {
      if (action) this.executor.requestCancel('no_active_goal');
      this.resetPlan();
      return;
    }

    if (!interrupt) {
      this.lastCommitAttempt = null;
      this.lastInterruptKey = null;
      this.commitRetries = 0;
    }

    if (interrupt) {
      const target = interrupt.toGoalId;
      // A body cannot snap into a new goal: exit the old action first.
      if (action && action.goalId !== target) {
        if (action.phase === 'running' || action.phase === 'awaiting-evidence') this.executor.requestCancel('goal_switch');
        return;
      }
      const semanticKey = `${target ?? 'null'}:${interrupt.reason}`;
      if (this.lastInterruptKey !== semanticKey) {
        this.lastInterruptKey = semanticKey;
        this.commitRetries = 0;
      }
      const key = `${interrupt.atRevision}:${semanticKey}`;
      if (this.lastCommitAttempt !== key) {
        this.lastCommitAttempt = key;
        const result = this.store.dispatch({
          kind: 'goal.commit',
          actorId: this.actorId,
          goalId: target,
          reason: `runtime:${interrupt.reason}`,
          atRevision: interrupt.atRevision,
        });
        if (result.accepted) {
          this.counters.goalCommits += 1;
          this.attempts = 0;
          this.commitRetries = 0;
          this.lastCommitAttempt = null;
          this.resetPlan();
        } else {
          this.recordFailure('commit-rejected', result.reason);
          // A stale promise is retried at the revision the interruption is
          // re-observed at, but only a bounded number of times: an unresolvable
          // promise must surface as a failure, never as a cancel/replan loop
          // (M2-SPEC-02).
          if (result.reason === 'STALE_COMMIT' && this.commitRetries < MAX_COMMIT_RETRIES) {
            this.commitRetries += 1;
            this.lastCommitAttempt = null;
          }
        }
      }
      return;
    }

    // A goal that changed without an interruption (auto-start or an external
    // commit) invalidates the plan for the previous goal.
    if (this.session && this.session.goalId !== active.goalId) this.resetPlan();
    if (this.currentPlan && this.currentPlan.goalId !== active.goalId) this.resetPlan();
  }

  private processTerminals(terminals: ActionTerminal[], interrupt: Interruption | null): void {
    for (const terminal of terminals) {
      if (this.singles.finish(terminal)) {
        this.pushTerminal(terminal);
        switch (terminal.outcome) {
          case 'success': this.counters.actionsSucceeded += 1; this.commitEffects(terminal); break;
          case 'failed': this.counters.actionsFailed += 1; break;
          case 'cancelled': this.counters.actionsCancelled += 1; break;
          default: { const exhaustive: never = terminal.outcome; return exhaustive; }
        }
        this.resetPlan();
        continue;
      }
      // Belt-and-braces: the executor already downgrades a superseded success.
      // If a success still arrives while its goal is being replaced, its effect
      // is dropped and it is reported as a cancellation, never as work done.
      const superseded =
        terminal.outcome === 'success' && interrupt !== null && interrupt.toGoalId !== terminal.goalId;
      const effective: ActionTerminal = superseded
        ? { ...terminal, outcome: 'cancelled', effects: {} }
        : terminal;
      this.pushTerminal(effective);
      if (effective.outcome === 'success') {
        this.counters.actionsSucceeded += 1;
        this.attempts = 0;
        this.commitEffects(effective);
      } else if (effective.outcome === 'failed') {
        this.counters.actionsFailed += 1;
        this.recordFailure('action-failed', effective.reason, effective);
        this.steps = [];
        this.currentPlan = null;
        this.attempts += 1;
        this.counters.replans += 1;
        if (this.attempts >= this.maxReplanAttempts) {
          this.recordFailure('replan-exhausted', effective.reason, effective);
          this.session = {
            goalId: effective.goalId as GoalId,
            status: 'failed',
            fingerprint: this.fingerprint(),
          };
        } else {
          this.session = null;
        }
      } else {
        this.counters.actionsCancelled += 1;
        this.steps = [];
        this.currentPlan = null;
        this.session = null;
      }
    }
  }

  private commitEffects(terminal: ActionTerminal): void {
    // Effects are predictions until this point: only a confirmed action may
    // change the facts the next plan is computed from.
    const next = applyEffects(this.factState, terminal.effects);
    this.factState = { ...next } as Record<string, FactValue>;
    if (terminal.actionKey === 'sitOnDeskChair') this.dispatchPosture('sitting', terminal);
    if (terminal.actionKey === 'standUp') this.dispatchPosture('standing', terminal);
    this.syncFacts();
  }

  private dispatchPosture(posture: 'sitting' | 'standing', terminal: ActionTerminal): void {
    this.store.dispatch({
      kind: 'posture.changed',
      actorId: this.actorId,
      posture,
      reason: `action:${terminal.actionKey}`,
    });
  }

  private startNextStep(): void {
    if (this.executionHeld || this.executor.current) return;
    if (!this.currentPlan || this.currentPlan.status !== 'ok') return;
    if (this.steps.length === 0) {
      this.finishPlanIfSatisfied();
      return;
    }
    const definition = this.steps[0];
    if (!definition) return;
    if (!conditionsHold(this.factState, definition.preconditions)) {
      // The world moved under the plan: re-plan instead of forcing a step.
      this.recordFailure('action-failed', `PRECONDITION_STALE:${definition.key}`);
      this.steps = [];
      this.currentPlan = null;
      this.session = null;
      this.attempts += 1;
      this.counters.replans += 1;
      if (this.attempts >= this.maxReplanAttempts) {
        this.recordFailure('replan-exhausted', `PRECONDITION_STALE:${definition.key}`);
        const active = this.activeGoalId();
        if (active) this.session = { goalId: active, status: 'failed', fingerprint: this.fingerprint() };
      }
      return;
    }
    const actionId = `${this.currentPlan.planId}:${this.stepIndex}`;
    const result = this.executor.start(definition, {
      actorId: this.actorId,
      actionId,
      goalId: this.currentPlan.goalId,
      planId: this.currentPlan.planId,
      planRevision: this.currentPlan.revision,
      facts: { ...this.factState },
    });
    if (result.ok) {
      this.steps.shift();
      this.stepIndex += 1;
      this.counters.actionsStarted += 1;
    }
    // A synchronous preflight failure produced a terminal in the executor's
    // pending queue; it is processed by the next update, never swallowed.
  }

  private finishPlanIfSatisfied(): void {
    if (!this.currentPlan) return;
    const goalId = this.currentPlan.goalId;
    const conditions = goalConditions(goalId);
    if (conditionsHold(this.factState, conditions)) {
      this.session = { goalId, status: 'satisfied', fingerprint: this.fingerprint() };
      this.currentPlan = { ...this.currentPlan, status: 'satisfied' };
    } else {
      this.session = null;
      this.currentPlan = null;
    }
  }

  private needsPlan(force: boolean): boolean {
    if (this.disposedFlag || this.executionHeld || this.singles.active) return false;
    if (this.inFlight) return false;
    // Never plan (or re-run) a goal whose replacement is already promised: that
    // is the second engine of the M2-SPEC-02 livelock.
    if (this.pendingInterrupt()) return false;
    const active = this.activeGoalId();
    if (!active) return false;
    const fingerprint = this.fingerprint();
    if (!force && this.session && this.session.goalId === active) {
      if (this.session.status === 'satisfied' && this.session.fingerprint === fingerprint) return false;
      if (this.session.status === 'failed' && this.session.fingerprint === fingerprint) return false;
      if (this.session.status === 'executing' && (this.steps.length > 0 || this.executor.current !== null)) return false;
    }
    return true;
  }

  private refreshPlan(force = false): void {
    if (!this.needsPlan(force)) return;
    const active = this.activeGoalId();
    if (!active) return;
    const revision = this.factsRevision();
    // Runtime-scoped plan id: two runtimes may share one channel table (same body),
    // so their action ids must never collide (a shared owner would look like the
    // same action and bypass the channel conflict).
    const planId = `plan-${this.instanceId}-${this.actorId}-${++this.planCounter}`;
    const request: PlanRequest = {
      planId,
      actorId: this.actorId,
      goalId: active,
      revision,
      facts: { ...this.factState },
      conditions: goalConditions(active),
      actions: planSpecs(this.actionKeys),
      budgetMs: this.planBudgetMs,
    };
    this.counters.planRequests += 1;
    const promise = this.planner
      .plan(request)
      .then((response) => this.onPlan(request, response))
      .catch((error: unknown) => {
        this.inFlight = null;
        if (this.disposedFlag) return;
        this.recordFailure('planner-error', error instanceof Error ? error.message : String(error));
      })
      .then(() => undefined);
    this.inFlight = { planId, promise };
  }

  private onPlan(request: PlanRequest, response: PlanResponse): void {
    if (this.disposedFlag) {
      this.inFlight = null;
      return;
    }
    if (this.inFlight && this.inFlight.planId === request.planId) this.inFlight = null;

    const currentRevision = this.factsRevision();
    const active = this.activeGoalId();
    if (this.executionHeld || response.revision !== currentRevision || active !== request.goalId || response.planId !== request.planId) {
      // Stale: facts or the goal moved while the worker was thinking.
      this.counters.plansDiscarded += 1;
      this.currentPlan = null;
      this.steps = [];
      this.session = null;
      return;
    }

    if (response.status === 'no-plan') {
      this.currentPlan = response;
      this.steps = [];
      this.recordFailure('no-plan', response.error ?? 'NO_PLAN');
      this.session = { goalId: request.goalId, status: 'failed', fingerprint: this.fingerprint() };
      return;
    }
    if (response.status === 'timeout' || response.status === 'error') {
      this.currentPlan = response;
      this.steps = [];
      this.recordFailure(
        response.status === 'timeout' ? 'planner-timeout' : 'planner-error',
        response.error ?? response.status,
      );
      // A degraded planner may still act through the same validated lifecycle.
      if (this.fallback) {
        void this.fallback.plan(request).then((fallbackResponse) => this.onFallback(request, fallbackResponse));
      } else {
        this.session = { goalId: request.goalId, status: 'failed', fingerprint: this.fingerprint() };
      }
      return;
    }
    if (response.status === 'satisfied') {
      this.currentPlan = response;
      this.steps = [];
      this.session = { goalId: request.goalId, status: 'satisfied', fingerprint: this.fingerprint() };
      return;
    }

    // Validate the whole plan before applying any part of it. A plan that names
    // an unknown or a not-permitted action is refused as a unit (never executed
    // half-way, M2Q-05) and fails the session, so a bad plan cannot turn into a
    // per-frame replan storm (M2Q-02 / M2-SPEC2-03).
    const unknown = response.actions.filter((key) => getActionDefinition(key) === undefined);
    const disallowed = response.actions.filter((key) => !this.actionKeys.includes(key));
    if (unknown.length > 0 || disallowed.length > 0) {
      const reason =
        unknown.length > 0
          ? `UNKNOWN_ACTION_IN_PLAN:${unknown.join(',')}`
          : `DISALLOWED_ACTION_IN_PLAN:${disallowed.join(',')}`;
      this.counters.plansRejected += 1;
      this.recordFailure('no-plan', reason);
      this.steps = [];
      this.currentPlan = null;
      this.attempts += 1;
      this.counters.replans += 1;
      this.session = { goalId: request.goalId, status: 'failed', fingerprint: this.fingerprint() };
      if (this.attempts >= this.maxReplanAttempts) this.recordFailure('replan-exhausted', reason);
      return;
    }

    this.currentPlan = response;
    this.steps = response.actions
      .map((key) => getActionDefinition(key))
      .filter((definition): definition is ActionDefinition => definition !== undefined);
    this.stepIndex = 0;
    if (this.steps.length === 0) {
      // An "ok" plan with no executable action is not a success.
      this.recordFailure('no-plan', 'EMPTY_PLAN');
      this.currentPlan = null;
      this.session = { goalId: request.goalId, status: 'failed', fingerprint: this.fingerprint() };
      return;
    }
    this.counters.plansApplied += 1;
    if (this.steps.length !== response.actions.length) {
      this.recordFailure('no-plan', 'UNKNOWN_ACTION_IN_PLAN');
      this.steps = [];
      this.currentPlan = null;
      this.session = null;
      return;
    }
    this.session = { goalId: request.goalId, status: 'executing', fingerprint: this.fingerprint() };
  }

  private onFallback(request: PlanRequest, response: PlanResponse): void {
    const active = this.activeGoalId();
    if (response.revision !== this.store.snapshot.factsRevision || active !== request.goalId) {
      this.counters.plansDiscarded += 1;
      return;
    }
    if (response.status !== 'ok' && response.status !== 'satisfied') {
      this.session = { goalId: request.goalId, status: 'failed', fingerprint: this.fingerprint() };
      return;
    }
    this.onPlan({ ...request, planId: response.planId }, { ...response, planId: request.planId });
  }

  private recordFailure(kind: RuntimeFailureKind, reason: string | null, terminal?: ActionTerminal): void {
    this.failureLog.push({
      revision: terminal?.planRevision ?? this.currentPlan?.revision ?? this.factsRevision(),
      atSimMs: this.store.snapshot.simTimeMs,
      goalId: (terminal?.goalId as GoalId | undefined) ?? this.activeGoalId(),
      planId: terminal?.planId ?? this.currentPlan?.planId ?? null,
      kind,
      reason,
    });
    this.trim(this.failureLog, this.maxFailureLog);
  }

  private pushTerminal(terminal: ActionTerminal): void {
    this.terminalLog.push(terminal);
    this.trim(this.terminalLog, this.maxTerminalLog);
  }

  private trim<T>(log: T[], limit: number): void {
    if (log.length > limit) log.splice(0, log.length - limit);
  }
}
