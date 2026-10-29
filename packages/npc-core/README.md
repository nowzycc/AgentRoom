# @npc/core — domain state, clock, goal arbitration, planner and actions (M1/M2)

Pure TypeScript domain layer for NPC runtime v2. No Three, DOM, filesystem, network or timers: time
enters only through stamped events, so a complete recorded history replays to byte-identical state
(and a truncated checkpoint reports `complete: false` instead of a plausible wrong state).

```
src/clock/sim-clock.ts        fixed 60 Hz step, bounded catch-up, dropped/lag reporting
src/domain/keys.ts            source + sourceEpoch + session scoping for tool/run/speech records
src/domain/idmap.ts           null-prototype id-keyed maps; JSON snapshot rehydration
src/domain/facts.ts           wire facts -> records; tombstones; epoch retirement
src/domain/commands.ts        command ledger + TTL (accepted is not executed)
src/domain/runtime.ts         action ledger, goal.commit handshake, safety hold, posture
src/domain/activity.ts        activity derived from record phases (no ++/-- counters)
src/domain/finalize.ts        timers, candidate build, arbitration, trimming
src/domain/retention.ts       bounded terminal-record/tombstone retention
src/domain/reduce.ts          the one pure reducer (copy-on-write draft)
src/domain/store.ts           the only writer; frozen snapshots; tick(); replay()
src/domain/blackboard.ts      frozen projections + dependency subscriptions
src/goals/arbiter.ts          layer/score/hysteresis/minDwell/manual-pin decision
src/goals/candidates.ts       candidates projected from commands, activity, autonomy, safety
src/planner/types.ts          PlannerPort request/response, semantic revision binding
src/planner/catalog.ts        action preconditions/effects/cost + goal conditions (planning data only)
src/planner/goap-core.ts      adapter over the vendored goap-minimal@1.0.0 core
src/planner/worker-entry.ts   platform-neutral worker handler (browser/Node)
src/planner/worker-planner.ts one Worker per request, wall-clock budget, termination
src/planner/bt/reactive-planner.ts  greedy fallback behind the same port
src/actions/executor.ts       action phases, preflight, cancel handshake, single terminal
src/actions/motion.ts         MotionAdapter boundary + fake adapter for tests
src/resources/channels.ts     atomic body-channel locks
src/runtime/npc-runtime.ts    domain + planner + executor glue; interruption handshake
```

## Invariants

- `DomainStore` is the only writer. `snapshot` is deeply frozen; readers use `Blackboard`, never a
  writable state handle.
- Every id-keyed map (`actors`, `sources`, `tools`, `runs`, `speeches`, `commands`, `actions`,
  `tombstones`) is a null-prototype dictionary read through own-property checks. Object.prototype
  names (`toString`, `constructor`, `hasOwnProperty`, `valueOf`, …) are legal wire ids and behave
  like any other id. `rehydrateDomainState` is the only supported entry for a JSON-parsed or
  structured-cloned snapshot, because both restore `Object.prototype`.
- `revision` increments only when an applied event actually changes state. A duplicate or rejected
  event leaves the snapshot referenced by the same object. `factsRevision` is the semantic revision:
  it moves only for non-time events, and `tick(0)` is a no-op, so a plan bound to it survives elapsed
  frames but not a fact change.
- Activity is a projection of record phases. Parallel tools keep `work` true until the last one
  ends; the cooldown anchor is `activity.lastActiveSimMs`, advanced only by simulation ticks and by
  a work start/end transition — never by a heartbeat or a second tool start.
- A completion arriving before its start leaves a tombstone; a later start is recorded as ignored
  (`TOMBSTONED_START`) and cannot revive the activity. A start that arrives after an ordinary
  completion is reported separately as `ALREADY_COMPLETED`.
- `sessionId` is optional on every fact. When a terminal fact omits it, the runtime resolves the
  unique active record with the same `(source, sourceEpoch, toolCallId/runId/speechId)`; an ambiguous
  match is refused (`AMBIGUOUS_SESSION`). A completion that names a *different explicit* session than
  an active record is rejected `SESSION_MISMATCH` instead of silently leaving a tombstone; two
  explicit sessions are never merged.
- Epoch order is not inferred from arriving facts (`occurredAt` is not an ordering authority). A
  new `sourceEpoch` is adopted only through an explicit `source.epoch.adopt` runtime event from the
  component that owns the durable log; adoption retires the old epoch's in-flight records
  (`cancelled/epoch_retired`). Facts from an undeclared epoch are rejected with
  `EPOCH_NOT_DECLARED`, facts from a retired epoch with `STALE_EPOCH`.
- Heartbeats update liveness only. They never touch activity time or the idle cooldown.
- Arbitration ranks layers (`safety > manual > task > autonomy`), then explicit `replace`, then
  score. A preemption is an *interruption request*: `goal.active` moves only when the action runner
  confirms a safe exit through `goal.commit`; `posture` moves only through the executor's
  `posture.changed` confirmation event, never through a command. A `goal.request` cannot claim the
  safety layer (`SAFETY_RESERVED`): safety holds are runtime events.
- One action per `(goalId, actionKey)` while non-terminal; a second request is `DUPLICATE_ACTION`.
  Open (pending/running) intents are capped by `maxOpenActions` (default 4) and rejected
  `ACTION_LIMIT` beyond it; terminal actions free capacity.
- `goal.commit` requires the semantic revision the interruption was promised at (`atRevision`):
  missing is `MISSING_REVISION`, an older one is `STALE_COMMIT`.
- A safety hold with a non-positive or non-finite TTL is rejected `SAFETY_TTL_INVALID`; it cannot
  install a hold that disappears in the same reduce.
- M2: the planner is the vendored `goap-minimal@1.0.0` behind `PlannerPort`, run in a Worker with a
  hard wall-clock budget and terminated on timeout. Plans carry the `factsRevision` they were
  computed from and are discarded when it moved. Effects are predictions: `ActionExecutor` commits
  them only after the motion adapter confirms, and a cancel goes through `exiting` until the body is
  safe. Channel locks are atomic across locomotion/lowerBody/upperBody/hands/gaze/voice. A completion
  in the same frame as a goal request settles as an effect-less `cancelled` (never a success), a fact
  during the safe exit refreshes the interruption's `atRevision` instead of wedging the commit, and
  an exit the adapter cannot confirm enters `exit-unconfirmed` with every channel still held.
- `manual.acquire` raises the active goal's *effective* arbitration layer to manual until its TTL or
  `manual.release` (the committed `active.layer` keeps its base layer), suppressing autonomy but
  never overriding safety.
- `world.pause`/`world.resume` are world-level: one hidden page pauses every actor in the state, not
  only the requester.
- Terminal tool/run/speech records are retained per `(source, sourceEpoch, sessionId)` up to
  `maxTerminalRecordsPerScope` (512) and `terminalRecordRetentionMs` (5 min simulation time).
  Pruned completions leave a bounded tombstone id (`maxTombstoneRecords`, 1 024; swept by
  `tombstoneRetentionMs`) so a late start cannot revive them. Terminal commands are bounded by
  `maxCommandRecords` (256) and `commandRetentionMs`. This keeps per-event cost proportional to the
  retained window, not to uptime.
- Command payload identity is canonical JSON (sorted keys), so a re-sent command with reordered keys
  is `DUPLICATE_COMMAND`, not `COMMAND_CONFLICT`.
- `factDedupeLimit` (8 192) is a rolling duplicate-id window, not the durable log; an event older
  than the window is re-applied, and the set-based fact handlers make that harmless.
- `maxActors` (16) caps the actor registry; an unknown id beyond the cap is rejected (`ACTOR_LIMIT`)
  instead of creating an actor.
- `goal.commit(null)` can auto-start the next winner in the same reduce; `NpcRuntime` re-reads
  `goal.active` after a commit instead of assuming it is null.
- Default autonomy scores are `idle 0.5`, `lookAround 0.7`, so `lookAround` can clear the 0.15
  hysteresis margin after `autonomyIntervalMs`; groups that should never wander simply omit it from
  `enabledAutonomyGoals`.
- `eventHistoryLimit` (default 20 000 events ≈ 5.5 min at 60 Hz) is a diagnostic replay buffer, not
  the durable log; the gateway log owns long history in M5. `store.checkpoint()` carries the
  revision it must reproduce and `DomainStore.replay(checkpoint)` returns `{state, complete}`;
  `complete: false` means the buffer was truncated and the replay must not be trusted as history.
- `onConflict: 'reject'` is honoured in M1 when an equal-or-higher goal is already active
  (`GOAL_CONFLICT`); `queue` and `replace` keep their documented meanings.

## Commands

```bash
export PATH=<home>/.nvm/versions/node/v22.22.1/bin:$PATH
cd <repo>/packages/npc-core
npm ci --no-audit --no-fund
npm test          # 171 tests (17 files)
npm run typecheck
npm run evidence:m2   # real worker acceptance probe
```

Raw evidence lives in `../tools/npc-v2/logs/M1-*.log` and `M2-*.log` (red/green, typecheck,
acceptance probe, legacy hashes). The mutation replay is reproducible with:

```bash
cd <repo> && node tools/npc-v2/scripts/m1-mutation-replay.mjs
```
