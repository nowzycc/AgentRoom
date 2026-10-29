/**
 * PlannerPort implementation that owns one real Worker per request, a hard
 * wall-clock budget and termination. The upstream core has no internal budget
 * (M0 measured a 200k-state job killed by the host at 400 ms), so the budget
 * lives here and a timeout settles exactly once.
 *
 * Planning is event-driven (goal/session change or invalidation), never per
 * frame; one worker per request keeps termination and stale-result handling
 * simple. The worker factory is injected so Node tests and the browser (M4)
 * share the same port.
 */
import { GOAP_CORE } from './goap-core.js';
import type { PlanRequest, PlanResponse, PlannerPort } from './types.js';

export interface PlannerWorkerLike {
  postMessage(message: unknown): void;
  terminate(): void | Promise<unknown>;
  onMessage(listener: (message: unknown) => void): void;
  onError(listener: (error: unknown) => void): void;
}

export type PlannerWorkerFactory = () => PlannerWorkerLike;

export interface WorkerPlannerOptions {
  factory: PlannerWorkerFactory;
  defaultBudgetMs?: number;
  maxBudgetMs?: number;
  now?: () => number;
  setTimer?: (callback: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

export interface WorkerPlannerStats {
  requests: number;
  ok: number;
  noPlan: number;
  satisfied: number;
  timeout: number;
  error: number;
  /** Responses whose plan id did not match the in-flight request. */
  dropped: number;
  /** Workers terminated after settling (one per request in this design). */
  terminated: number;
}

interface InFlight {
  planId: string;
  request: PlanRequest;
  worker: PlannerWorkerLike;
  startedAt: number;
  timer: unknown;
  settled: boolean;
  resolve: (response: PlanResponse) => void;
}

const DEFAULT_MAX_BUDGET_MS = 15_000;

export class WorkerPlanner implements PlannerPort {
  readonly name = 'goap-worker';
  private readonly factory: PlannerWorkerFactory;
  private readonly defaultBudgetMs: number;
  private readonly maxBudgetMs: number;
  private readonly now: () => number;
  private readonly setTimer: (callback: () => void, ms: number) => unknown;
  private readonly clearTimer: (handle: unknown) => void;
  private readonly inflight = new Map<string, InFlight>();
  private readonly counters: WorkerPlannerStats = {
    requests: 0,
    ok: 0,
    noPlan: 0,
    satisfied: 0,
    timeout: 0,
    error: 0,
    dropped: 0,
    terminated: 0,
  };

  constructor(options: WorkerPlannerOptions) {
    this.factory = options.factory;
    this.defaultBudgetMs = Math.max(1, options.defaultBudgetMs ?? 4_000);
    this.maxBudgetMs = Math.max(this.defaultBudgetMs, options.maxBudgetMs ?? DEFAULT_MAX_BUDGET_MS);
    this.now = options.now ?? (() => Date.now());
    this.setTimer =
      options.setTimer ??
      ((callback, ms) => {
        const handle = setTimeout(callback, ms);
        // Do not keep a Node process alive for a planner budget alone.
        (handle as { unref?: () => void }).unref?.();
        return handle;
      });
    this.clearTimer =
      options.clearTimer ??
      ((handle) => {
        clearTimeout(handle as ReturnType<typeof setTimeout>);
      });
  }

  get stats(): WorkerPlannerStats {
    return { ...this.counters };
  }

  get inFlight(): number {
    return this.inflight.size;
  }

  plan(request: PlanRequest): Promise<PlanResponse> {
    const budgetMs = this.clampBudget(request.budgetMs);
    this.counters.requests += 1;

    return new Promise<PlanResponse>((resolve) => {
      let worker: PlannerWorkerLike;
      try {
        worker = this.factory();
      } catch (error) {
        this.counters.error += 1;
        resolve(this.failure(request, 'error', error instanceof Error ? error.message : 'worker_factory_failed'));
        return;
      }

      const entry: InFlight = {
        planId: request.planId,
        request,
        worker,
        startedAt: this.now(),
        timer: null,
        settled: false,
        resolve,
      };
      this.inflight.set(entry.planId, entry);

      worker.onMessage((message) => this.onMessage(entry, message));
      worker.onError((error) => {
        this.settle(entry, this.failure(request, 'error', error instanceof Error ? error.message : String(error)));
      });
      entry.timer = this.setTimer(() => {
        this.settle(entry, this.failure(request, 'timeout', 'budget_exceeded'));
      }, budgetMs);

      try {
        worker.postMessage({ ...request, budgetMs });
      } catch (error) {
        this.settle(entry, this.failure(request, 'error', error instanceof Error ? error.message : 'postMessage_failed'));
      }
    });
  }

  terminate(): void {
    for (const entry of [...this.inflight.values()]) {
      this.settle(entry, this.failure(entry.request, 'error', 'planner_terminated'));
    }
  }

  private clampBudget(requested: number): number {
    if (typeof requested !== 'number' || !Number.isFinite(requested)) return this.defaultBudgetMs;
    return Math.max(1, Math.min(requested, this.maxBudgetMs));
  }

  private onMessage(entry: InFlight, message: unknown): void {
    if (entry.settled) return;
    if (!message || typeof message !== 'object') {
      this.counters.dropped += 1;
      return;
    }
    const response = message as Partial<PlanResponse>;
    if (response.planId !== entry.planId) {
      // A late answer from another request (or a terminated worker) is never
      // allowed to settle this one.
      this.counters.dropped += 1;
      return;
    }
    const validStatus = ['ok', 'satisfied', 'no-plan', 'error'].includes(response.status ?? '');
    if (!validStatus || !Array.isArray(response.actions) || !response.actions.every((key) => typeof key === 'string')) {
      this.settle(entry, this.failure(entry.request, 'error', 'invalid_worker_response'));
      return;
    }
    this.settle(entry, {
      planId: entry.planId,
      actorId: entry.request.actorId,
      goalId: entry.request.goalId,
      revision: entry.request.revision,
      status: response.status as PlanResponse['status'],
      actions: response.actions,
      cost: typeof response.cost === 'number' && Number.isFinite(response.cost) ? response.cost : 0,
      predicted: response.predicted && typeof response.predicted === 'object' ? response.predicted : {},
      core: typeof response.core === 'string' ? response.core : GOAP_CORE,
      ...(typeof response.error === 'string' ? { error: response.error } : {}),
      elapsedMs: this.now() - entry.startedAt,
    });
  }

  private settle(entry: InFlight, response: PlanResponse): void {
    if (entry.settled) return;
    entry.settled = true;
    this.inflight.delete(entry.planId);
    this.clearTimer(entry.timer);
    const termination = entry.worker.terminate();
    if (termination && typeof (termination as Promise<unknown>).catch === 'function') {
      (termination as Promise<unknown>).catch(() => undefined);
    }
    this.counters.terminated += 1;
    if (response.status === 'ok') this.counters.ok += 1;
    else if (response.status === 'no-plan') this.counters.noPlan += 1;
    else if (response.status === 'satisfied') this.counters.satisfied += 1;
    else if (response.status === 'timeout') this.counters.timeout += 1;
    else this.counters.error += 1;
    entry.resolve(response);
  }

  private failure(request: PlanRequest, status: 'timeout' | 'error', error: string): PlanResponse {
    return {
      planId: request.planId,
      actorId: request.actorId,
      goalId: request.goalId,
      revision: request.revision,
      status,
      actions: [],
      cost: 0,
      predicted: {},
      core: GOAP_CORE,
      error,
    };
  }
}
