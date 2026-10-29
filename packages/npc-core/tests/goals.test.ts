import { describe, expect, it } from 'vitest';
import { ACTOR, Harness, openActions } from './helpers.js';

describe('goal arbitration: layers', () => {
  it('lets a task goal preempt autonomy, but never the reverse', () => {
    const h = new Harness({ config: { autonomyScores: { idle: 0.99, lookAround: 0.98 } } });
    h.heartbeat();
    h.tickFor(100);
    expect(h.actor().goal.active?.goalId).toBe('idle');

    h.goalRequest({ goal: 'work', commandId: 'c-work', priorityClass: 'task', ttlMs: 600_000, onConflict: 'replace' });
    expect(h.actor().goal.active?.goalId).toBe('idle');
    expect(h.actor().goal.interrupt?.toGoalId).toBe('work');
    expect(h.actor().goal.interrupt?.reason).toBe('HIGHER_LAYER');

    h.commit('work');
    expect(h.actor().goal.active?.goalId).toBe('work');
    expect(h.actor().goal.active?.layer).toBe('task');

    h.tickFor(2_000);
    expect(h.actor().goal.active?.goalId).toBe('work');
    expect(h.actor().goal.interrupt).toBeNull();
    expect(h.actor().goal.heldReason).toBeNull();
  });

  it('requests an interruption instead of switching posture immediately', () => {
    const h = new Harness();
    h.heartbeat();
    h.tickFor(100);
    h.goalRequest({ goal: 'work', commandId: 'c-work', priorityClass: 'task', ttlMs: 600_000, onConflict: 'replace' });
    h.commit('work');
    h.actionRequest({ goalId: 'work', actionId: 'a1', actionKey: 'sit.desk' });
    h.actionStarted('a1');
    h.posture('sitting');
    h.toolStarted({ toolCallId: 't1' });
    h.tickFor(5_000);

    const res = h.goalRequest({
      goal: 'converse',
      commandId: 'c-manual',
      priorityClass: 'manual',
      ttlMs: 600_000,
      onConflict: 'replace',
    });
    expect(res.accepted).toBe(true);

    const goal = h.actor().goal;
    expect(goal.active?.goalId).toBe('work');
    expect(goal.active?.layer).toBe('task');
    expect(h.actor().posture).toBe('sitting');
    expect(goal.interrupt?.toGoalId).toBe('converse');
    expect(goal.interrupt?.reason).toBe('HIGHER_LAYER');
    // the interrupted goal's action is still running, not silently abandoned
    expect(openActions(h).map((a) => a.actionId)).toEqual(['a1']);

    h.commit('converse');
    expect(h.actor().goal.active?.goalId).toBe('converse');
    expect(h.actor().goal.active?.layer).toBe('manual');
    expect(h.actor().posture).toBe('sitting');
    expect(openActions(h)).toHaveLength(0);
    const abandoned = Object.values(h.actor().actions).find((a) => a.actionId === 'a1')!;
    expect(abandoned.phase).toBe('terminal');
    expect(abandoned.outcome).toBe('cancelled');
    expect(abandoned.reason).toBe('goal_switch');
    expect(h.actor().goal.history.at(-1)?.to).toBe('converse');
    expect(h.actor().goal.history.at(-1)?.from).toBe('work');
  });

  it('holds a same-layer replace request until minDwell elapses', () => {
    const h = new Harness({ config: { minDwellMs: 10_000 } });
    h.heartbeat();
    h.tickFor(100);
    h.goalRequest({ goal: 'work', commandId: 'c-work', priorityClass: 'task', ttlMs: 600_000, onConflict: 'replace' });
    h.commit('work');
    h.posture('sitting');

    h.tickFor(1_000);
    h.goalRequest({ goal: 'think', commandId: 'c-think', priorityClass: 'task', ttlMs: 600_000, onConflict: 'replace' });
    expect(h.actor().goal.interrupt).toBeNull();
    expect(h.actor().goal.heldReason).toBe('MIN_DWELL');
    expect(h.actor().posture).toBe('sitting');

    h.tickFor(10_000);
    expect(h.actor().goal.interrupt?.toGoalId).toBe('think');
    expect(h.actor().goal.interrupt?.reason).toBe('REPLACE_REQUESTED');
    expect(h.actor().goal.active?.goalId).toBe('work');
  });

  it('applies hysteresis to non-replace autonomy candidates', () => {
    const weak = new Harness({
      config: {
        autonomyIntervalMs: 1_000,
        minDwellMs: 200,
        hysteresisScore: 0.15,
        autonomyScores: { idle: 0.5, lookAround: 0.55 },
      },
    });
    weak.heartbeat();
    weak.tickFor(2_000);
    expect(weak.actor().goal.active?.goalId).toBe('idle');
    expect(weak.actor().goal.heldReason).toBe('HOLD_HYSTERESIS');
    expect(weak.actor().goal.interrupt).toBeNull();

    const strong = new Harness({
      config: {
        autonomyIntervalMs: 1_000,
        minDwellMs: 200,
        hysteresisScore: 0.15,
        autonomyScores: { idle: 0.5, lookAround: 0.8 },
      },
    });
    strong.heartbeat();
    strong.tickFor(2_000);
    expect(strong.actor().goal.interrupt?.toGoalId).toBe('lookAround');
    expect(strong.actor().goal.interrupt?.reason).toBe('HIGHER_SCORE');
  });

  it('lets the default lookAround candidate win after the autonomy interval', () => {
    const h = new Harness({ config: { autonomyIntervalMs: 1_000, minDwellMs: 200 } });
    h.heartbeat();
    h.tickFor(2_000);
    expect(h.actor().goal.active?.goalId).toBe('idle');
    expect(h.actor().goal.interrupt?.toGoalId).toBe('lookAround');
    expect(h.actor().goal.interrupt?.reason).toBe('HIGHER_SCORE');
  });

  it('keeps safety above manual', () => {
    const h = new Harness({ config: { minDwellMs: 0 } });
    h.heartbeat();
    h.tickFor(100);
    h.manualAcquire({ ttlMs: 60_000, commandId: 'm1' });
    h.goalRequest({ goal: 'converse', commandId: 'c1', priorityClass: 'manual', ttlMs: 60_000, onConflict: 'replace' });
    expect(h.actor().goal.interrupt?.toGoalId).toBe('converse');
    const committed = h.commit('converse');
    expect(committed.accepted).toBe(true);
    expect(h.actor().goal.active?.goalId).toBe('converse');
    expect(h.actor().goal.active?.layer).toBe('manual');

    h.store.dispatch({ kind: 'safety.request', actorId: ACTOR, reason: 'collision', goalId: 'idle', ttlMs: 5_000 });
    expect(h.actor().goal.interrupt?.toGoalId).toBe('idle');
    expect(h.actor().goal.interrupt?.reason).toBe('SAFETY');
    expect(h.actor().goal.active?.goalId).toBe('converse');

    const stopped = h.commit('idle');
    expect(stopped.accepted).toBe(true);
    expect(h.actor().goal.active?.layer).toBe('safety');
    h.store.dispatch({ kind: 'safety.clear', actorId: ACTOR, reason: 'clear' });
    h.tickFor(100);
    expect(h.actor().goal.active?.layer).toBe('safety');
    // the still-pending manual request resumes once the safety hold is cleared,
    // again as a request: the body only moves on commit
    expect(h.actor().goal.interrupt?.toGoalId).toBe('converse');
    expect(h.actor().goal.interrupt?.reason).toBe('ACTIVE_WITHDRAWN');
  });
});

describe('goal arbitration: TTL and manual lease', () => {
  it('expires a goal request and asks the runtime to stop safely', () => {
    const h = new Harness();
    h.heartbeat();
    h.tickFor(100);
    h.goalRequest({ goal: 'work', commandId: 'cw', priorityClass: 'task', ttlMs: 1_000, onConflict: 'replace' });
    h.commit('work');

    h.tickFor(500);
    expect(h.actor().goal.active?.goalId).toBe('work');

    h.tickFor(600);
    expect(h.actor().commands['cw']?.status).toBe('expired');
    expect(h.actor().goal.interrupt?.toGoalId).toBeNull();
    expect(h.actor().goal.interrupt?.reason).toBe('NO_CANDIDATE');
    expect(h.actor().goal.active?.goalId).toBe('work');

    h.commit(null);
    expect(h.actor().goal.active?.goalId).toBe('idle');
  });

  it('cancels a goal by target command id', () => {
    const h = new Harness();
    h.heartbeat();
    h.tickFor(100);
    h.goalRequest({ goal: 'work', commandId: 'cw', priorityClass: 'task', ttlMs: 600_000, onConflict: 'replace' });
    h.commit('work');
    const res = h.goalCancel({ targetCommandId: 'cw' });
    expect(res.accepted).toBe(true);
    expect(h.actor().commands['cw']?.status).toBe('cancelled');
    expect(h.actor().goal.interrupt?.reason).toBe('NO_CANDIDATE');
    expect(h.actor().goal.active?.goalId).toBe('work');

    const again = h.goalCancel({ targetCommandId: 'cw' });
    expect(again.accepted).toBe(false);
    expect(again.reason).toBe('COMMAND_NOT_ACTIVE');
  });

  it('pins the active goal at manual layer until the lease TTL expires', () => {
    const h = new Harness();
    h.heartbeat();
    h.tickFor(100);
    expect(h.actor().goal.active?.goalId).toBe('idle');

    h.manualAcquire({ ttlMs: 5_000, commandId: 'm1' });
    expect(h.actor().manual?.commandId).toBe('m1');

    h.goalRequest({ goal: 'work', commandId: 'cw', priorityClass: 'task', ttlMs: 600_000, onConflict: 'replace' });
    expect(h.actor().goal.interrupt).toBeNull();
    expect(h.actor().goal.heldReason).toBe('MANUAL_PIN');
    expect(h.actor().goal.active?.goalId).toBe('idle');

    h.advanceWall(4_000);
    h.tickFor(100);
    expect(h.actor().manual?.commandId).toBe('m1');
    expect(h.actor().goal.interrupt).toBeNull();

    h.advanceWall(1_000);
    h.tickFor(100);
    expect(h.actor().manual).toBeNull();
    expect(h.actor().goal.interrupt?.toGoalId).toBe('work');
    expect(h.actor().goal.interrupt?.reason).toBe('HIGHER_LAYER');
  });

  it('honours onConflict reject when an equal-or-higher goal is active', () => {
    const h = new Harness();
    h.heartbeat();
    h.tickFor(100);
    h.goalRequest({ goal: 'work', commandId: 'w1', priorityClass: 'task', ttlMs: 600_000, onConflict: 'replace' });
    h.commit('work');

    const rejected = h.goalRequest({
      goal: 'think',
      commandId: 'cw',
      priorityClass: 'task',
      ttlMs: 600_000,
      onConflict: 'reject',
    });
    expect(rejected.accepted).toBe(false);
    expect(rejected.reason).toBe('GOAL_CONFLICT');
    expect(h.actor().commands['cw']).toBeUndefined();
    expect(h.actor().goal.interrupt).toBeNull();
    expect(h.actor().goal.active?.goalId).toBe('work');

    const accepted = h.goalRequest({
      goal: 'think',
      commandId: 'cw2',
      priorityClass: 'task',
      ttlMs: 600_000,
      onConflict: 'queue',
    });
    expect(accepted.accepted).toBe(true);
  });

  it('rejects a duplicate command id with a different payload', () => {
    const h = new Harness();
    h.heartbeat();
    h.tickFor(100);
    const first = h.goalRequest({ goal: 'work', commandId: 'cw', priorityClass: 'task', ttlMs: 600_000 });
    expect(first.accepted).toBe(true);
    h.commit('work');

    const same = h.goalRequest({ goal: 'work', commandId: 'cw', priorityClass: 'task', ttlMs: 600_000 });
    expect(same.accepted).toBe(false);
    expect(same.reason).toBe('DUPLICATE_COMMAND');

    const conflicting = h.goalRequest({ goal: 'think', commandId: 'cw', priorityClass: 'task', ttlMs: 600_000 });
    expect(conflicting.accepted).toBe(false);
    expect(conflicting.reason).toBe('COMMAND_CONFLICT');
    expect(h.actor().goal.history.filter((entry) => entry.to === 'work')).toHaveLength(1);
  });

  it('does not restart a goal that is already active', () => {
    const h = new Harness({ config: { minDwellMs: 0 } });
    h.heartbeat();
    h.tickFor(100);
    h.goalRequest({ goal: 'work', commandId: 'cw1', priorityClass: 'task', ttlMs: 600_000, onConflict: 'replace' });
    h.commit('work');
    const since = h.actor().goal.active!.sinceSimMs;
    h.tickFor(1_000);

    h.goalRequest({ goal: 'work', commandId: 'cw2', priorityClass: 'task', ttlMs: 600_000, onConflict: 'replace' });
    h.tickFor(100);
    expect(h.actor().goal.active?.goalId).toBe('work');
    expect(h.actor().goal.active?.sinceSimMs).toBe(since);
    expect(h.actor().goal.interrupt).toBeNull();
    expect(h.actor().goal.history.filter((entry) => entry.reason !== 'AUTO_START')).toHaveLength(1);
  });

  it('releases manual control early and rejects a mismatched release', () => {
    const h = new Harness();
    h.heartbeat();
    h.tickFor(100);
    h.manualAcquire({ ttlMs: 60_000, commandId: 'm1' });

    const wrong = h.manualRelease({ targetCommandId: 'nope' });
    expect(wrong.accepted).toBe(false);
    expect(wrong.reason).toBe('MANUAL_MISMATCH');

    const ok = h.manualRelease({ targetCommandId: 'm1' });
    expect(ok.accepted).toBe(true);
    expect(h.actor().manual).toBeNull();
  });
});

describe('actions ledger', () => {
  it('does not start the same action twice for the same goal', () => {
    const h = new Harness();
    h.heartbeat();
    h.tickFor(100);
    h.goalRequest({ goal: 'work', commandId: 'cw', priorityClass: 'task', ttlMs: 600_000, onConflict: 'replace' });
    h.commit('work');

    const first = h.actionRequest({ goalId: 'work', actionId: 'a1', actionKey: 'sit.desk' });
    expect(first.accepted).toBe(true);
    const before = h.store.snapshot;
    const second = h.actionRequest({ goalId: 'work', actionId: 'a2', actionKey: 'sit.desk' });
    expect(second.accepted).toBe(false);
    expect(second.reason).toBe('DUPLICATE_ACTION');
    expect(h.store.snapshot).toBe(before);
    expect(openActions(h)).toHaveLength(1);
    expect(openActions(h)[0]!.actionId).toBe('a1');

    h.actionStarted('a1');
    const terminal = h.actionTerminal('a1', 'success');
    expect(terminal.accepted).toBe(true);
    const again = h.actionTerminal('a1', 'success');
    expect(again.accepted).toBe(false);
    expect(again.reason).toBe('ALREADY_TERMINAL');
    expect(h.actor().actions['a1']?.outcome).toBe('success');
  });

  it('rejects actions for a goal that is not active and conflicting action ids', () => {
    const h = new Harness();
    h.heartbeat();
    h.tickFor(100);
    h.goalRequest({ goal: 'work', commandId: 'cw', priorityClass: 'task', ttlMs: 600_000, onConflict: 'replace' });
    h.commit('work');

    const wrongGoal = h.actionRequest({ goalId: 'think', actionId: 'x1', actionKey: 'think.look' });
    expect(wrongGoal.accepted).toBe(false);
    expect(wrongGoal.reason).toBe('GOAL_NOT_ACTIVE');

    h.actionRequest({ goalId: 'work', actionId: 'a1', actionKey: 'sit.desk' });
    const conflict = h.actionRequest({ goalId: 'work', actionId: 'a1', actionKey: 'stand.exit' });
    expect(conflict.accepted).toBe(false);
    expect(conflict.reason).toBe('DUPLICATE_ACTION_ID');
  });
});

describe('goal commit handshake', () => {
  it('rejects a commit with no pending interruption and a mismatched target', () => {
    const h = new Harness();
    h.heartbeat();
    h.tickFor(100);
    const none = h.commit('work');
    expect(none.accepted).toBe(false);
    expect(none.reason).toBe('NO_INTERRUPT_PENDING');

    h.goalRequest({ goal: 'work', commandId: 'cw', priorityClass: 'task', ttlMs: 600_000, onConflict: 'replace' });
    const mismatch = h.commit('rest');
    expect(mismatch.accepted).toBe(false);
    expect(mismatch.reason).toBe('INTERRUPT_MISMATCH');
    expect(h.actor().goal.active?.goalId).toBe('idle');
  });

  it('treats a redundant safety clear and posture change as no-ops', () => {
    const h = new Harness();
    h.heartbeat();
    h.tickFor(100);
    const before = h.store.snapshot;
    const clear = h.store.dispatch({ kind: 'safety.clear', actorId: ACTOR, reason: 'nothing to clear' });
    expect(clear.accepted).toBe(false);
    expect(clear.reason).toBe('NO_SAFETY_HOLD');
    expect(h.store.snapshot).toBe(before);

    const posture = h.posture('standing');
    expect(posture.accepted).toBe(false);
    expect(posture.reason).toBe('SAME_POSTURE');
    expect(h.store.snapshot).toBe(before);
  });

  it('pauses autonomy and stops the active goal without moving the body', () => {
    const h = new Harness({ config: { idleCooldownMs: 1_000 } });
    h.heartbeat();
    h.tickFor(100);
    expect(h.actor().goal.active?.goalId).toBe('idle');
    h.posture('sitting');
    h.tickFor(500);

    h.worldPause({ reason: 'user hid the page' });
    expect(h.store.snapshot.worldPaused).toBe(true);
    expect(h.actor().posture).toBe('sitting');
    expect(h.actor().goal.interrupt?.toGoalId).toBeNull();
    expect(h.actor().goal.interrupt?.reason).toBe('WORLD_PAUSED');

    h.commit(null);
    h.tickFor(500);
    expect(h.actor().goal.active).toBeNull();
    expect(h.actor().goal.candidates).toHaveLength(0);

    h.worldResume();
    h.tickFor(100);
    expect(h.actor().goal.active?.goalId).toBe('idle');
  });
});
