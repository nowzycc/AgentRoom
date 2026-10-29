# goap-minimal

A minimal Goal-Oriented Action Planner in [JSY](https://jsy-lang.github.io/) (a syntax preprocessor for
JavaScript from the [jsy-lang](https://github.com/jsy-lang) project), after Jeff Orkin's *Three States and
a Plan: The A.I. of F.E.A.R.* You declare a world state, a set of actions (preconditions, effects, cost),
and prioritized goals; the planner searches forward from the current state and returns the cheapest
action sequence that reaches the goal. A small three-state runtime (Goto / Animate / UseSmartObject)
executes a plan and replans when the world changes.

Built on [`astar-minimal`](https://www.npmjs.com/package/astar-minimal) for the underlying A\* search.

## Documentation

- [Explainer](./docs/explainer.md): background, the STRIPS/F.E.A.R. history, and why this implementation
  is built the way it is (forward search, the planner/consumer boundary, skills versus stats).
- [API reference](./docs/api.md): exact signatures, the condition/effect grammar, and its caveats.

## Install

```bash
npm install goap-minimal
```

## Usage

```javascript
import { Agent, Action, Goal, AgentRuntime } from 'goap-minimal'

const agent = new Agent({ ammo: 0 })

agent.addAction(new Action('Reload', {}, { ammo: 6 }))
agent.addAction(new Action('Attack', { ammo: { gte: 1 } }, { kTargetIsDead: true, ammo: { inc: -1 } }))
agent.addGoal(new Goal('KillEnemy', { kTargetIsDead: true }))

const { plan } = agent.plan()          // [Reload, Attack]

const rt = new AgentRuntime(agent)
rt.run()                               // ticks through FSM states until the goal is met
```

- **Conditions** are booleans (`kTargetIsDead: true`) or numeric comparisons (`{ gte, lte, gt, lt, eq }`).
- **Effects** are assignments (`ammo: 6`) or numeric deltas (`ammo: { inc: -1 }`).
- **Cost** is the fourth `Action` argument (default `1`); the planner minimizes total plan cost.

See the [API reference](./docs/api.md) for the full grammar and its closed-world/value caveats.

## Build

```bash
npm install
npm run build
```

JSY sources in `code/` compile to ES modules in `esm/`.

## Test

```bash
npm test        # builds, then runs the two suites below
node esm/test_goap.js          # cooperative chain, numeric, cheaper-plan, no-plan
node esm/test_runtime.js       # FSM execution and replan-on-world-change
```

`astar-minimal` ships and tests its own A\* search independently; see that package for its test suite.
