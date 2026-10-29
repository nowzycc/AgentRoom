/**
 * Domain action catalog for the M2 vertical slice.
 *
 * Preconditions/effects/cost are the planning contract and are deliberately
 * serializable data: the worker plans over exactly this view and has no access
 * to the executor, animation clips or Three objects. Channels, durations and
 * contact requirements are execution data and are never sent to the planner.
 */
import type { GoalId } from '@npc/contracts';
import type { Posture } from '../types.js';
import type { ActionPlanSpec, ConditionSet, EffectSet, FactSet, FactValue } from './types.js';

export type Channel = 'locomotion' | 'lowerBody' | 'upperBody' | 'hands' | 'gaze' | 'voice';

export interface ActionDefinition extends ActionPlanSpec {
  description: string;
  channels: readonly Channel[];
  durationMs: number;
  /** Runtime binding requirement; planning must not pre-judge reachability. */
  reach?: { kind: 'hand'; target: string };
  /** Posture the executor confirms after success (never planned as a fact). */
  postureTarget?: Posture;
}

/** Facts are closed and bounded: every key starts false unless declared here. */
export const PLAN_FACTS: Readonly<Record<string, FactValue>> = Object.freeze({
  atDesk: false,
  sitting: false,
  handsOnKeyboard: false,
  facingSpeaker: false,
  lookedAround: false,
  rested: false,
  thinking: false,
  sleeping: false,
  seatAvailable: true,
  /**
   * Desk-lamp power, mirrored from the device controller's feedback event
   * (`slice.deviceFeedback`). The action's declared effect is the prediction;
   * the device's measured state is what the next plan is computed from.
   */
  lampOn: false,
  /**
   * Fridge chain (NE2 standing grasp). `fridgeDoorOpen` means "the leaf passed
   * the resource's declared minimum opening", not "reached the -100 deg hinge
   * limit". The motor is stopped at the declared target; the fact is only
   * committed when the measured leaf angle crossed that minimum.
   */
  atFridge: false,
  facingFridge: false,
  fridgeReachReady: false,
  fridgeGrasped: false,
  fridgeDoorOpen: false,
});

function def(
  key: string,
  description: string,
  preconditions: ConditionSet,
  effects: EffectSet,
  cost: number,
  channels: readonly Channel[],
  durationMs: number,
  extra: { reach?: { kind: 'hand'; target: string }; postureTarget?: Posture } = {},
): ActionDefinition {
  return Object.freeze({
    key,
    description,
    preconditions: Object.freeze({ ...preconditions }),
    effects: Object.freeze({ ...effects }),
    cost,
    channels: Object.freeze([...channels]),
    durationMs,
    ...extra,
  });
}

export const ACTION_CATALOG: Readonly<Record<string, ActionDefinition>> = Object.freeze({
  walkToDesk: def('walkToDesk', 'walk to the desk', { fridgeGrasped: false }, { atDesk: true, atFridge: false, facingFridge: false, fridgeReachReady: false, fridgeGrasped: false }, 3, ['locomotion'], 2_000),
  walkAway: def('walkAway', 'walk away from the desk', { sitting: false }, { atDesk: false }, 2, ['locomotion'], 1_500),
  sitOnDeskChair: def(
    'sitOnDeskChair',
    'sit on the desk chair',
    { atDesk: true, seatAvailable: true },
    { sitting: true },
    1,
    ['locomotion', 'lowerBody'],
    700,
    { postureTarget: 'sitting' },
  ),
  // Standing up takes the hands off the keys: leaving `handsOnKeyboard` set
  // after a stand made the next work plan believe typing was already done, so a
  // re-sit planned only `sitOnDeskChair` and then reported the goal satisfied
  // with the body seated but not typing (measured in the M4 re-sit probe).
  standUp: def('standUp', 'stand up from the desk chair', { sitting: true }, { sitting: false, handsOnKeyboard: false }, 1, [
    'locomotion',
    'lowerBody',
  ], 600, { postureTarget: 'standing' }),
  typeAtKeyboard: def(
    'typeAtKeyboard',
    'type at the keyboard',
    { atDesk: true, sitting: true },
    { handsOnKeyboard: true },
    2,
    ['upperBody', 'hands'],
    1_500,
    { reach: { kind: 'hand', target: 'keyboard' } },
  ),
  thinkAtDesk: def('thinkAtDesk', 'sit and think at the desk', { atDesk: true, sitting: true }, { thinking: true }, 1, [
    'upperBody',
    'gaze',
  ], 4_000),
  lookAround: def('lookAround', 'look around the room', {}, { lookedAround: true }, 1, ['gaze'], 1_200),
  turnToSpeaker: def('turnToSpeaker', 'turn toward the speaker', {}, { facingSpeaker: true }, 1, [
    'upperBody',
    'gaze',
  ], 900),
  restAtDesk: def('restAtDesk', 'rest at the desk', { atDesk: true }, { rested: true }, 1, ['upperBody'], 5_000),
  /**
   * Momentary switch press on a scene appliance. The precondition is the seated
   * desk posture (the lamp is on the desk and only reachable from the chair);
   * the effect is the device state the action predicts. A press is NOT planned
   * when the lamp is already in the requested state: the goal is satisfied by
   * the synced fact instead of a second press.
   */
  pressLampSwitchOn: def(
    'pressLampSwitchOn',
    'press the desk lamp switch on',
    { atDesk: true, sitting: true, lampOn: false },
    { lampOn: true },
    2,
    ['upperBody', 'hands'],
    1_200,
    { reach: { kind: 'hand', target: 'lamp-switch' } },
  ),
  pressLampSwitchOff: def(
    'pressLampSwitchOff',
    'press the desk lamp switch off',
    { atDesk: true, sitting: true, lampOn: true },
    { lampOn: false },
    2,
    ['upperBody', 'hands'],
    1_200,
    { reach: { kind: 'hand', target: 'lamp-switch' } },
  ),
  /**
   * Standing fridge-door chain (NE2). The plan is deliberately split into the
   * physically gated steps: walk, face, reach, grasp, open, release, withdraw.
   * `openFridgeDoor` predicts `fridgeDoorOpen`, but the adapter only completes
   * it after the measured leaf crossed the resource's minimum opening; a
   * blocked/grasp-lost action fails and the fact is not committed.
   */
  walkToFridge: def('walkToFridge', 'walk to the fridge operating stance', { sitting: false }, { atFridge: true, atDesk: false, handsOnKeyboard: false, facingFridge: false, fridgeReachReady: false, fridgeGrasped: false }, 3, ['locomotion'], 3_000),
  faceFridge: def('faceFridge', 'turn to face the fridge handle', { atFridge: true }, { facingFridge: true }, 1, ['upperBody', 'gaze'], 900),
  reachFridgeHandle: def(
    'reachFridgeHandle',
    'reach the standing hand to the fridge handle surface',
    { atFridge: true, facingFridge: true },
    { fridgeReachReady: true },
    2,
    ['upperBody', 'hands'],
    1_500,
    { reach: { kind: 'hand', target: 'fridge-handle' } },
  ),
  graspFridgeHandle: def(
    'graspFridgeHandle',
    'hold the fridge handle with the measured palm contact',
    { fridgeReachReady: true },
    { fridgeGrasped: true },
    1,
    ['hands'],
    700,
    { reach: { kind: 'hand', target: 'fridge-handle' } },
  ),
  openFridgeDoor: def(
    'openFridgeDoor',
    'drive the fridge door to the declared minimum opening while the hand follows the actual leaf',
    { fridgeGrasped: true },
    { fridgeDoorOpen: true },
    8,
    ['hands', 'upperBody'],
    5_000,
    { reach: { kind: 'hand', target: 'fridge-handle' } },
  ),
  releaseFridgeHandle: def(
    'releaseFridgeHandle',
    'stop the door motor and withdraw the hand from the handle',
    { fridgeDoorOpen: true, fridgeGrasped: true },
    { fridgeGrasped: false, fridgeReachReady: false },
    1,
    ['hands'],
    1_200,
  ),
  withdrawFromFridge: def(
    'withdrawFromFridge',
    'step back out of the fridge operating zone',
    { atFridge: true, fridgeGrasped: false },
    { atFridge: false, facingFridge: false },
    2,
    ['locomotion'],
    1_500,
  ),
});

/**
 * Goal conditions. `sleep` is unreachable on purpose: the capability is
 * disabled, so an accidental request must return no-plan rather than "done".
 */
export const GOAL_CONDITIONS: Readonly<Record<GoalId, ConditionSet>> = Object.freeze({
  work: Object.freeze({ atDesk: true, sitting: true, handsOnKeyboard: true }),
  think: Object.freeze({ atDesk: true, sitting: true }),
  converse: Object.freeze({ facingSpeaker: true }),
  rest: Object.freeze({ rested: true }),
  idle: Object.freeze({ sitting: false }),
  lookAround: Object.freeze({ lookedAround: true }),
  sleep: Object.freeze({ sleeping: true }),
  // Appliance goals are satisfied by the device's own synced state, not by the
  // body posture: a lamp that is already on must not make the NPC walk over.
  lampOn: Object.freeze({ lampOn: true }),
  lampOff: Object.freeze({ lampOn: false }),
  // "Opened" is the resource's minimum opening, and the hand must be off the
  // handle when the goal is satisfied. Requiring `atFridge:false` is what makes
  // release+withdraw part of the plan instead of stopping with the arm out.
  fridgeOpen: Object.freeze({ fridgeDoorOpen: true, fridgeGrasped: false, atFridge: false }),
});

export function goalConditions(goalId: GoalId): ConditionSet {
  if (!Object.prototype.hasOwnProperty.call(GOAL_CONDITIONS, goalId)) return EMPTY_CONDITIONS;
  return GOAL_CONDITIONS[goalId] ?? EMPTY_CONDITIONS;
}

/**
 * Dynamic action ids come from plans and (later) scene data. A plain-object
 * lookup would resolve `toString`/`constructor` from Object.prototype, exactly
 * the M1 prototype-key defect on a new surface, so every lookup is own-property.
 */
export function getActionDefinition(key: string): ActionDefinition | undefined {
  if (!Object.prototype.hasOwnProperty.call(ACTION_CATALOG, key)) return undefined;
  return ACTION_CATALOG[key];
}

const EMPTY_CONDITIONS: ConditionSet = Object.freeze({});

/** Serializable planning view; execution-only fields are dropped. */
export function planSpecs(keys?: readonly string[]): ActionPlanSpec[] {
  const selected = keys
    ? keys.map((key) => getActionDefinition(key)).filter((d): d is ActionDefinition => !!d)
    : Object.values(ACTION_CATALOG);
  return selected.map((definition) => ({
    key: definition.key,
    preconditions: { ...definition.preconditions },
    effects: { ...definition.effects },
    cost: definition.cost,
  }));
}

export function defaultFacts(): Record<string, FactValue> {
  return { ...PLAN_FACTS };
}

export function factsForConditions(conditions: ConditionSet): FactSet {
  return conditions as FactSet;
}
