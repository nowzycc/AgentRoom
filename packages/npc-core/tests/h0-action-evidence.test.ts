import { describe, expect, it } from 'vitest';
import { ActionExecutor } from '../src/actions/executor.js';
import type {
  ActionEvidenceRequest,
  BodyProfile,
  MotionAdapter,
  MotionCall,
  MotionContext,
  MotionEvidence,
  MotionFeasibility,
  MotionResult,
} from '../src/actions/motion.js';
import { ACTION_CATALOG, type ActionDefinition } from '../src/planner/catalog.js';
import { NpcRuntime } from '../src/runtime/npc-runtime.js';
import type { PlannerPort } from '../src/planner/types.js';
import { ACTOR, Harness } from './helpers.js';

const BODY: BodyProfile = { handReachM: 0.7, keyboardDistanceM: 0.5, seatClearanceM: 0.3 };
const VERSION_1 = [
  { kind: 'resource', id: 'chair-main', revision: 4 },
  { kind: 'host', id: 'furniture_chair', revision: 9 },
] as const;

class EvidenceMotion implements MotionAdapter {
  readonly calls: readonly MotionCall[] = [];
  readonly exitDurationMs = 0;
  readonly body = BODY;
  evidence: MotionEvidence = {
    observationKind: 'seat-contact',
    outcome: 'confirmed',
    reason: null,
    simStep: 11,
    dependencies: VERSION_1,
  };
  private completed = false;
  private exiting = false;

  preflight(_definition: ActionDefinition, _context: MotionContext, _actionId: string): MotionFeasibility {
    return { ok: true, reason: null };
  }

  begin(_definition: ActionDefinition, _context: MotionContext, _actionId: string): void {}

  advance(_actionId: string, _dtMs: number): void {
    this.completed = true;
  }

  result(_actionId: string): MotionResult {
    return this.completed
      ? {
          status: 'completed',
          reason: null,
          completion: {
            kind: 'post-physics',
            observationKind: 'seat-contact',
            afterSimStep: 10,
            dependencies: VERSION_1,
          },
        }
      : { status: 'running', reason: null };
  }

  observe(_actionId: string, _request: ActionEvidenceRequest): MotionEvidence {
    return this.evidence;
  }

  beginExit(_actionId: string): void { this.exiting = true; }
  advanceExit(_actionId: string, _dtMs: number): void {}
  exitComplete(_actionId: string): boolean { return this.exiting; }
  forceStop(_actionId: string): boolean { return true; }
  cleanup(_actionId: string): void {}
}

function start(options: { actionTimeoutMs?: number } = {}): { executor: ActionExecutor; motion: EvidenceMotion; attemptId: string } {
  const motion = new EvidenceMotion();
  const executor = new ActionExecutor({ motion, body: BODY, ...options });
  const result = executor.start(ACTION_CATALOG.walkToDesk!, {
    actorId: 'npc-a',
    actionId: 'action-1',
    goalId: 'work',
    planId: 'plan-1',
    planRevision: 3,
    facts: {},
  });
  if (!result.attemptId) throw new Error('missing attempt id');
  return { executor, motion, attemptId: result.attemptId };
}

describe('H0 fixed-step completion evidence', () => {
  it('reads a newer solved observation from the adapter before committing effects', () => {
    const { executor } = start();

    expect(executor.update(16)).toEqual([]);
    expect(executor.current?.phase).toBe('awaiting-evidence');
    expect(executor.terminals).toEqual([]);

    const receipt = executor.observe();
    expect(receipt.status).toBe('accepted');
    expect(receipt.terminal?.outcome).toBe('success');
    expect(receipt.terminal?.effects).toEqual(ACTION_CATALOG.walkToDesk!.effects);
  });

  it('rejects same-kind evidence when the adapter re-measures invalid post-physics contact', () => {
    const { executor, motion } = start();
    executor.update(16);
    motion.evidence = { ...motion.evidence, outcome: 'rejected', reason: 'SEAT_CONTACT:0.120m' };

    const receipt = executor.observe();

    expect(receipt.status).toBe('rejected');
    expect(receipt.reason).toBe('SEAT_CONTACT:0.120m');
    expect(receipt.terminal).toBeNull();
    expect(executor.current?.phase).toBe('exiting');
    expect(executor.lockSnapshot).not.toEqual([]);
    expect(executor.update(0)[0]).toMatchObject({ outcome: 'failed', reason: 'SEAT_CONTACT:0.120m', effects: {} });
  });

  it('rejects a resource revision changed after the candidate and exits safely', () => {
    const { executor, motion } = start();
    executor.update(16);
    motion.evidence = {
      ...motion.evidence,
      dependencies: [
        { kind: 'resource', id: 'chair-main', revision: 5 },
        VERSION_1[1],
      ],
    };

    const receipt = executor.observe();

    expect(receipt.status).toBe('rejected');
    expect(receipt.reason).toBe('EVIDENCE_VERSION_MISMATCH:resource:chair-main');
    expect(receipt.terminal).toBeNull();
    expect(executor.current?.phase).toBe('exiting');
    expect(executor.update(0)[0]).toMatchObject({
      outcome: 'failed',
      reason: 'EVIDENCE_VERSION_MISMATCH:resource:chair-main',
      effects: {},
    });
  });

  it('rejects evidence from the candidate step or an older solved step', () => {
    const { executor, motion } = start();
    executor.update(16);

    motion.evidence = { ...motion.evidence, simStep: 10 };
    expect(executor.observe().reason).toBe('EVIDENCE_STEP_NOT_AFTER_CANDIDATE');
    expect(executor.current?.phase).toBe('exiting');
  });

  it('gives cancellation priority over confirmation in the same frame', () => {
    const { executor } = start();
    executor.update(16);

    expect(executor.requestCancel('operator')).toBe(true);
    const late = executor.observe();
    expect(late.status).toBe('rejected');
    expect(late.reason).toBe('EVIDENCE_NOT_AWAITED');

    const terminals = executor.update(0);
    expect(terminals).toHaveLength(1);
    expect(terminals[0]?.outcome).toBe('cancelled');
    expect(executor.terminals).toHaveLength(1);
  });

  it('times out while awaiting evidence through the safe-exit handshake', () => {
    const { executor } = start({ actionTimeoutMs: 20 });
    executor.update(16);

    expect(executor.update(5)).toEqual([]);
    expect(executor.current?.phase).toBe('exiting');
    expect(executor.lockSnapshot).not.toEqual([]);
    expect(executor.update(0)[0]).toMatchObject({ outcome: 'cancelled', reason: 'cancel:evidence_timeout', effects: {} });
  });

  it('routes a real runtime action awaiting → adapter observe → effect commit', async () => {
    const h = new Harness({ config: { minDwellMs: 0, idleCooldownMs: 0 } });
    const motion = new EvidenceMotion();
    const planner: PlannerPort = {
      name: 'h0-one-action',
      plan: async (request) => ({
        planId: request.planId,
        actorId: request.actorId,
        goalId: request.goalId,
        revision: request.revision,
        status: 'ok',
        actions: ['walkToDesk'],
        cost: 1,
        predicted: { ...request.facts, atDesk: true },
        core: 'h0-test',
      }),
      terminate: () => undefined,
    };
    const runtime = new NpcRuntime({ store: h.store, actorId: ACTOR, planner, motion });
    h.heartbeat();
    h.toolStarted({ toolCallId: 'h0-runtime' });
    await runtime.requestPlan();
    for (let step = 0; step < 8 && runtime.action?.phase !== 'awaiting-evidence'; step += 1) {
      runtime.step(16);
      await runtime.settle();
    }

    expect(runtime.action).toMatchObject({ phase: 'awaiting-evidence', evidenceKind: 'seat-contact' });
    expect(runtime.facts.atDesk).toBe(false);

    const receipt = runtime.observeAction();
    expect(receipt.status).toBe('accepted');
    expect(runtime.facts.atDesk).toBe(true);
    expect(runtime.terminals.at(-1)).toMatchObject({ actionKey: 'walkToDesk', outcome: 'success' });
  });

  it('accepts one adapter observation and rejects a duplicate without a second terminal', () => {
    const { executor } = start();
    executor.update(16);

    expect(executor.observe().status).toBe('accepted');
    const duplicate = executor.observe();
    expect(duplicate.status).toBe('rejected');
    expect(duplicate.reason).toBe('EVIDENCE_NO_ACTIVE_ACTION');
    expect(executor.terminals).toHaveLength(1);
  });
});
