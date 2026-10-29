/**
 * M2 action lifecycle: channel locks, preflight (hand reach / path / seat),
 * the cancel handshake (`exiting` until the body is safe), confirmation-gated
 * effects and exactly one terminal state per action.
 */
import { describe, expect, it } from 'vitest';
import { ActionExecutor } from '../src/actions/executor.js';
import { FakeMotionAdapter, type BodyProfile } from '../src/actions/motion.js';
import { ACTION_CATALOG } from '../src/planner/catalog.js';
import { ChannelLocks } from '../src/resources/channels.js';

const BODY: BodyProfile = { handReachM: 0.7, keyboardDistanceM: 0.5, seatClearanceM: 0.3 };

function seatedFacts() {
  return { atDesk: true, sitting: true, handsOnKeyboard: false, seatAvailable: true } as const;
}

function makeExecutor(options: {
  motion?: FakeMotionAdapter;
  locks?: ChannelLocks;
  actionTimeoutMs?: number;
  exitTimeoutMs?: number;
} = {}) {
  const motion = options.motion ?? new FakeMotionAdapter({ body: { ...BODY } });
  const locks = options.locks ?? new ChannelLocks();
  // The executor's body profile is the same body the adapter measures; tests
  // that change reach/clearance on the adapter must see it here too.
  const body = { ...motion.body };
  const executor = new ActionExecutor({
    motion,
    locks,
    body,
    nowSimMs: () => 0,
    actionTimeoutMs: options.actionTimeoutMs ?? 5_000,
    exitTimeoutMs: options.exitTimeoutMs ?? 2_000,
  });
  return { executor, motion, locks };
}

describe('channel locks', () => {
  it('acquires an atomic multi-channel set or nothing at all', () => {
    const locks = new ChannelLocks();
    expect(locks.acquire('other', ['upperBody'])).toEqual({ ok: true, channels: ['upperBody'] });
    const conflict = locks.acquire('mine', ['upperBody', 'hands']);
    expect(conflict.ok).toBe(false);
    expect(conflict.conflict?.channel).toBe('upperBody');
    expect(conflict.conflict?.owner).toBe('other');
    expect(locks.ownerOf('hands')).toBeNull();

    expect(locks.acquire('mine', ['hands']).ok).toBe(true);
    expect(locks.ownerOf('hands')).toBe('mine');
    expect(locks.ownerOf('upperBody')).toBe('other');
  });

  it('releases only the owner’s channels and is idempotent', () => {
    const locks = new ChannelLocks();
    locks.acquire('a', ['locomotion', 'lowerBody']);
    expect(locks.release('b')).toEqual([]);
    expect(locks.ownerOf('locomotion')).toBe('a');
    expect(locks.release('a').sort()).toEqual(['locomotion', 'lowerBody']);
    expect(locks.release('a')).toEqual([]);
    expect(locks.ownerOf('locomotion')).toBeNull();
  });

  it('covers the voice channel too, so speech cannot be dual-driven', () => {
    const locks = new ChannelLocks();
    expect(locks.acquire('speech', ['voice', 'gaze']).ok).toBe(true);
    const conflict = locks.acquire('other', ['voice']);
    expect(conflict.ok).toBe(false);
    expect(conflict.conflict).toEqual({ channel: 'voice', owner: 'speech' });
    expect(locks.ownerOf('gaze')).toBe('speech');
  });
});

describe('action lifecycle: success', () => {
  it('walks the phases and commits effects only after confirmation', () => {
    const { executor, motion, locks } = makeExecutor();
    const def = ACTION_CATALOG.walkToDesk!;
    const start = executor.start(def, { actionId: 'a1', goalId: 'work', planId: 'p', planRevision: 1, facts: {} });
    expect(start.ok).toBe(true);
    expect(start.actionId).toBe('a1');
    expect(executor.current?.phase).toBe('running');
    expect(locks.ownerOf('locomotion')).toBe('a1');
    expect(motion.calls.filter((c) => c.kind === 'begin')).toHaveLength(1);

    const mid = executor.update(1_000);
    expect(mid).toHaveLength(0);
    expect(executor.current?.phase).toBe('running');

    const done = executor.update(1_000);
    expect(done).toHaveLength(1);
    expect(motion.result('a1').completion).toEqual({ kind: 'logical' });
    expect(done[0]!.outcome).toBe('success');
    expect(done[0]!.effects).toEqual({ atDesk: true, atFridge: false, facingFridge: false, fridgeReachReady: false, fridgeGrasped: false });
    expect(done[0]!.actionId).toBe('a1');
    expect(executor.current).toBeNull();
    expect(locks.ownerOf('locomotion')).toBeNull();
    expect(motion.calls.filter((c) => c.kind === 'cleanup' && c.actionId === 'a1')).toHaveLength(1);

    // Exactly one terminal state: later frames are inert.
    expect(executor.update(1_000)).toHaveLength(0);
    expect(executor.terminals.filter((t) => t.actionId === 'a1')).toHaveLength(1);
  });

  it('fails a completed result whose adapter omitted an explicit completion class', () => {
    class UnclassifiedMotion extends FakeMotionAdapter {
      override result(actionId: string) {
        const result = super.result(actionId);
        return result.status === 'completed' ? { status: 'completed' as const, reason: null } : result;
      }
    }
    const motion = new UnclassifiedMotion({ durations: { walkToDesk: 1 } });
    const { executor } = makeExecutor({ motion });
    executor.start(ACTION_CATALOG.walkToDesk!, { actionId: 'unclassified', goalId: 'work', planId: 'p', planRevision: 1, facts: {} });

    expect(executor.update(10)).toEqual([]);
    expect(executor.current?.phase).toBe('exiting');
    expect(executor.lockSnapshot.length).toBeGreaterThan(0);
    const done = executor.update(motion.exitDurationMs);
    expect(done).toHaveLength(1);
    expect(done[0]).toMatchObject({ outcome: 'failed', reason: 'COMPLETION_CLASSIFICATION_REQUIRED', effects: {} });
  });

  it('refuses a second action while one owns the body', () => {
    const { executor } = makeExecutor();
    executor.start(ACTION_CATALOG.walkToDesk!, { actionId: 'a1', goalId: 'work', planId: 'p', planRevision: 1, facts: {} });
    const second = executor.start(ACTION_CATALOG.sitOnDeskChair!, {
      actionId: 'a2',
      goalId: 'work',
      planId: 'p',
      planRevision: 1,
      facts: { atDesk: true },
    });
    expect(second.ok).toBe(false);
    expect(second.reason).toBe('BUSY');
    expect(executor.terminals).toHaveLength(0);
  });
});

describe('action lifecycle: preflight failures', () => {
  it('fails a hand-unreachable action instead of faking contact', () => {
    const motion = new FakeMotionAdapter({
      body: { handReachM: 0.42, keyboardDistanceM: 0.58, seatClearanceM: 0.3 },
    });
    const { executor, locks } = makeExecutor({ motion });
    const start = executor.start(ACTION_CATALOG.typeAtKeyboard!, {
      actionId: 'type-1',
      goalId: 'work',
      planId: 'p',
      planRevision: 1,
      facts: seatedFacts(),
    });
    expect(start.ok).toBe(false);
    expect(start.reason).toBe('HAND_UNREACHABLE');
    expect(start.terminal?.outcome).toBe('failed');
    expect(start.terminal?.effects).toEqual({});
    expect(executor.current).toBeNull();
    expect(locks.ownerOf('hands')).toBeNull();
    expect(motion.calls.filter((c) => c.kind === 'begin')).toHaveLength(0);
    expect(motion.calls.filter((c) => c.kind === 'cleanup' && c.actionId === 'type-1')).toHaveLength(1);
  });

  it('fails an unreachable path with NO_PATH and fails a blocked seat', () => {
    const blockedPath = new FakeMotionAdapter({ body: { ...BODY }, blocked: ['walkToDesk'] });
    const ex1 = makeExecutor({ motion: blockedPath }).executor;
    const walk = ex1.start(ACTION_CATALOG.walkToDesk!, { actionId: 'w', goalId: 'work', planId: 'p', planRevision: 1, facts: {} });
    expect(walk.ok).toBe(false);
    expect(walk.reason).toBe('NO_PATH');

    const blockedSeat = new FakeMotionAdapter({ body: { ...BODY, seatClearanceM: 0.01 } });
    const ex2 = makeExecutor({ motion: blockedSeat }).executor;
    const sit = ex2.start(ACTION_CATALOG.sitOnDeskChair!, {
      actionId: 's',
      goalId: 'work',
      planId: 'p',
      planRevision: 1,
      facts: { atDesk: true, seatAvailable: true },
    });
    expect(sit.ok).toBe(false);
    expect(sit.reason).toBe('SEAT_BLOCKED');
  });

  it('refuses an action whose channels are held elsewhere, atomically', () => {
    const locks = new ChannelLocks();
    locks.acquire('other', ['hands']);
    const { executor } = makeExecutor({ locks });
    const start = executor.start(ACTION_CATALOG.typeAtKeyboard!, {
      actionId: 'type-1',
      goalId: 'work',
      planId: 'p',
      planRevision: 1,
      facts: seatedFacts(),
    });
    expect(start.ok).toBe(false);
    expect(start.reason).toBe('CHANNEL_CONFLICT');
    expect(locks.ownerOf('upperBody')).toBeNull();
    expect(locks.ownerOf('hands')).toBe('other');
    expect(executor.current).toBeNull();
  });
});

describe('action lifecycle: cancel handshake', () => {
  it('holds the body in exiting until the safe exit completes, then terminates once', () => {
    const { executor, motion, locks } = makeExecutor();
    executor.start(ACTION_CATALOG.typeAtKeyboard!, {
      actionId: 'type-1',
      goalId: 'work',
      planId: 'p',
      planRevision: 1,
      facts: seatedFacts(),
    });
    expect(executor.update(300)).toHaveLength(0);
    expect(executor.current?.phase).toBe('running');

    expect(executor.requestCancel('goal_switch')).toBe(true);
    expect(executor.current?.phase).toBe('exiting');
    // Holding the channels during exit prevents another action from driving the
    // same limbs while the body is still moving.
    expect(locks.ownerOf('hands')).toBe('type-1');
    expect(executor.update(100)).toHaveLength(0);
    expect(executor.current?.phase).toBe('exiting');

    const terminal = executor.update(300);
    expect(terminal).toHaveLength(1);
    expect(terminal[0]!.outcome).toBe('cancelled');
    expect(terminal[0]!.effects).toEqual({});
    expect(terminal[0]!.reason).toContain('goal_switch');
    expect(executor.current).toBeNull();
    expect(locks.ownerOf('hands')).toBeNull();
    expect(locks.ownerOf('upperBody')).toBeNull();
    expect(motion.calls.filter((c) => c.kind === 'cleanup' && c.actionId === 'type-1')).toHaveLength(1);
    expect(executor.requestCancel('late')).toBe(false);
    expect(executor.update(1_000)).toHaveLength(0);
    expect(executor.terminals.filter((t) => t.actionId === 'type-1')).toHaveLength(1);
  });

  it('does not commit effects when the adapter cannot confirm the motion', () => {
    const motion = new FakeMotionAdapter({ body: { ...BODY }, failConfirmation: { typeAtKeyboard: 'CLIP_MISSING' } });
    const { executor } = makeExecutor({ motion });
    executor.start(ACTION_CATALOG.typeAtKeyboard!, {
      actionId: 'type-1',
      goalId: 'work',
      planId: 'p',
      planRevision: 1,
      facts: seatedFacts(),
    });
    expect(executor.update(1_500)).toEqual([]);
    expect(executor.current?.phase).toBe('exiting');
    expect(executor.lockSnapshot.length).toBeGreaterThan(0);
    const terminal = executor.update(motion.exitDurationMs);
    expect(terminal).toHaveLength(1);
    expect(terminal[0]!.outcome).toBe('failed');
    expect(terminal[0]!.reason).toBe('CLIP_MISSING');
    expect(terminal[0]!.effects).toEqual({});
  });

  it('fails a stalled motion once by timeout and cleans up', () => {
    const motion = new FakeMotionAdapter({ body: { ...BODY }, stall: ['typeAtKeyboard'] });
    const { executor, locks } = makeExecutor({ motion, actionTimeoutMs: 250 });
    executor.start(ACTION_CATALOG.typeAtKeyboard!, {
      actionId: 'type-1',
      goalId: 'work',
      planId: 'p',
      planRevision: 1,
      facts: seatedFacts(),
    });
    expect(executor.update(100)).toHaveLength(0);
    expect(executor.update(200)).toEqual([]);
    expect(executor.current?.phase).toBe('exiting');
    expect(locks.ownerOf('hands')).toBe('type-1');
    expect(motion.calls.filter((call) => call.kind === 'cleanup')).toHaveLength(0);
    const terminal = executor.update(motion.exitDurationMs);
    expect(terminal).toHaveLength(1);
    expect(terminal[0]!.outcome).toBe('failed');
    expect(terminal[0]!.reason).toBe('ACTION_TIMEOUT');
    expect(terminal[0]!.effects).toEqual({});
    expect(locks.ownerOf('hands')).toBeNull();
    expect(motion.calls.filter((c) => c.kind === 'cleanup' && c.actionId === 'type-1')).toHaveLength(1);
    expect(executor.update(1_000)).toHaveLength(0);
  });
});
