import { describe, expect, it } from 'vitest';
import { ACTION_CATALOG } from '../src/planner/catalog.js';

describe('location invalidation between workstation and fridge', () => {
  it('walking to fridge invalidates desk location and desk hand state', () => {
    expect(ACTION_CATALOG.walkToFridge!.effects).toMatchObject({ atDesk: false, handsOnKeyboard: false });
  });

  it('walking back to desk invalidates fridge alignment and reach', () => {
    expect(ACTION_CATALOG.walkToDesk!.effects).toMatchObject({
      atFridge: false,
      facingFridge: false,
      fridgeReachReady: false,
      fridgeGrasped: false,
    });
  });

  it('cannot walk to fridge while sitting', () => {
    expect(ACTION_CATALOG.walkToFridge!.preconditions).toMatchObject({ sitting: false });
  });
});
