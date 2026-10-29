# NPC protocol v1 (specVersion `1.0`)

This directory freezes the wire contract between an external harness, the control gateway and
the browser runtime. JSON Schema 2020-12 files in `schemas/` are the source of truth; `src/types.ts`
describes the post-parse shapes and `src/parse.ts` is the strict entry point used by tests.

## 1. Versioning

`schemaVersion`/`specVersion` is always the string `"1.0"`. A parser must reject any other value
with `UNKNOWN_SPEC_VERSION`; it must not try to read a newer document optimistically. v1 objects
forbid unknown properties. Adding a field is a protocol version bump; optional additive fields can
be introduced in a later minor version only with a new schema file.

There is no negotiation in v1. Capabilities advertise what the runtime can actually do; absence is
a capability gap, never permission to fake an animation.

## 2. Facts and commands are different things

- **Facts** (`event.schema.json`) describe what happened outside the NPC: a run/tool/speech started
  or ended, or a presence heartbeat. A fact may influence a goal; it never names a pose, bone,
  scene node, animation or coordinate.
- **Commands** (`command.schema.json`) are authorised intents: request/cancel a goal, acquire/release
  manual control, pause/resume the world. A command is not an animation. `accepted` means persisted,
  not executed; only runtime confirmation may report success.

Event ids are deduplicated by `(source, sourceEpoch, eventId)`. `sequence` orders facts within a
`sourceEpoch`. A completion may arrive before its start; the gateway stores a tombstone and a later
start must not revive the activity. These are gateway rules; M0 only fixes the fields that make
them implementable.

`sessionId` is optional. A terminal fact that omits it refers to the unique active record with the
same `(source, sourceEpoch, toolCallId|runId|speechId)`. Two distinct explicit sessions are never
merged; an ambiguous match must be refused rather than guessed.

## 3. Envelope

| field | type | required | meaning |
|---|---|---|---|
| `specVersion` | `"1.0"` | yes | protocol version |
| `eventId` | id | yes | stable id assigned by the producer; dedupe component |
| `source` | `provider:instance` | yes | e.g. `hermes:default`; lowercase provider, no wildcards/slashes |
| `sourceEpoch` | id | yes | process/boot epoch; ids are only unique within it |
| `sequence` | integer ≥ 0 | yes | per-sourceEpoch ordering |
| `worldId` | id | yes | target world |
| `actorId` | id | yes | subject; world-level facts still name the actor |
| `sessionId` | id | no | external session boundary |
| `runId` | id | no | generation/run boundary; required by `run.completed` |
| `type` | enum | yes | one of the seven fact types |
| `occurredAt` | RFC 3339 date-time | yes | producer clock; never used as ordering authority |
| `correlationId` | id | no | ties a fact to a task/command chain |
| `data` | object | yes | type-specific payload; see below |

The gateway must add its own `receivedAt` and ordering metadata; client timestamps are untrusted.
Epoch ordering is not inferred from `occurredAt` either: after a producer restart the gateway (the
owner of the durable log) declares the new `sourceEpoch`, and only that declaration retires the
previous one. A fact from an undeclared epoch is rejected, never adopted as the newest.

### Fact payloads

| type | required `data` | notes |
|---|---|---|
| `run.started` | `{}` | run identity is `runId` on the envelope |
| `run.completed` | `outcome`: `success\|failed\|cancelled` | requires envelope `runId` |
| `tool.started` | `toolCallId`, `activityClass` | activity class is a lower-case slug, not a provider/model name |
| `tool.completed` | `toolCallId`, `outcome` | same `toolCallId` as the start |
| `speech.started` | `speechId` | audio actually started, not text generation |
| `speech.completed` | `speechId` | audio actually ended |
| `presence.heartbeat` | `status`: `alive\|degraded` | liveness only; must not advance activity time |

## 4. Commands

Required common fields: `specVersion`, `commandId`, `worldId`, `actorId`, `type`,
`priorityClass` (`safety|manual|task|autonomy`). `onConflict` is one of `queue|reject|replace` and
defaults to `queue` when omitted.

| type | extra requirements |
|---|---|
| `goal.request` | `goal` (`work|think|converse|rest|idle`), `ttlMs` 1000..3600000 |
| `goal.cancel` | `targetCommandId`, `ttlMs` |
| `manual.acquire` | `ttlMs` |
| `manual.release` | `targetCommandId` |
| `world.pause` | non-empty `reason` |
| `world.resume` | none |

`constraints` may carry `capability` and/or `interactionId`. It is a request, not a guarantee: the
runtime may answer `CAPABILITY_UNAVAILABLE` or `RESOURCE_BUSY`.

`sleep` is deliberately absent from command goals in v1. It is a capability the default profile does
not offer.

Command lifecycle (implemented in M5): `accepted → queued → running → succeeded|failed|cancelled|expired`.
TTL expiry requests a safe cancel; the terminal state may arrive later while the actor exits. A
command is not restarted on duplicate delivery. Same `commandId` with a different payload is a
conflict (HTTP 409 in M5), not an update.

## 5. Scene manifest

A scene describes geometry and interaction resources. It must not contain behaviour code, VRM bone
names, prompts or per-NPC coordinates.

Required: `specVersion`, `sceneId`, `revision`, `units: "meters"`, `upAxis: "Y"`, `asset.uri`,
`interactions[]`, `spawnPoints[]`.

An interaction has `id`, `revision`, `hostNode`, `kind`
(`seat|workstation|keyboard|bed|door|generic`), one or more `slots`, optional `composedOf` references
and optional `enabled` (default `true`). `hostNode` is an asset node name; combined furniture keeps
separate interactions for chair and keyboard and links them with `composedOf`, so moving one host
does not silently move the other's slot.

A slot has:

- `id`, `pose` (`standing|sitting|lying`);
- `localTransform`: position `[x,y,z]` and yaw in degrees, in the host node's local frame;
- `facing`: required yaw and optional tolerance. **Every slot must state facing**; a slot without it fails with `MISSING_FACING` before schema
  validation so the error names the exact slot;
- `approach` and optional `exit`: position and radius;
- `capacity: 1` (one actor per slot in v1);
- `capabilities[]` and `compatibleBodyProfiles[]`;
- optional `contacts` (`seat`, two `feet`, two `hands`), each with a point **in the host node's
  local frame** and a tolerance in metres. The frame is host-node local, not slot local: contacts
  follow the furniture node when it moves or rotates, and are not shifted by the slot's own
  `localTransform`. Tolerances are copied verbatim; consumers never rewrite them.

`autonomy` is optional and defaults to:

```json
{ "enabledGoals": ["idle", "lookAround"], "allowSleep": false, "idleCooldownMs": 30000 }
```

Sleep is never enabled by default. A scene may contain a bed, but that does not grant sleep.

## 6. Body profile

`bodyProfileId`, height/radius/eye/hip metrics, reach (`maxArmMeters`, `comfortableArmMeters`), and a
semantic bone map: `head`, `hips`, `leftHand`, `rightHand`, `leftFoot`, `rightFoot` are required;
`neck`, `chest`, `spine` are optional. Semantic slots must map to distinct bone names. Scene node
names are not valid here; the character owns its skeleton naming.

`comfortableArmMeters > maxArmMeters` is rejected (`INVALID_BODY`).

## 7. Actor profile

`actorId`, `bodyProfileId`, `displayName`, and capability lists for `goals`, `actions` and
`interactions`. When a body-profile registry is supplied, an unknown reference fails
`UNKNOWN_REFERENCE`. Actor profiles do not contain transforms or animation names.

## 8. Capabilities

`capabilities.schema.json` reports `worldId`, `sceneId`, `sceneRevision`, `authority`
(`mode: runtime|none`, optional `epoch`/`actorId`), per-goal/action/interaction availability and
reasons, features and limits.

Parser defaults:

```json
"features": { "sleep": false, "manualOverride": true, "maxActors": 1 },
"limits": { "maxEventPayloadBytes": 65536, "commandsPerMinute": 60 }
```

If `features.sleep` is false, a `sleep` goal marked `available: true` is rejected with
`SLEEP_NOT_ENABLED`. An unavailable sleep entry with a reason is valid and is the expected v1 shape.

## 9. Error codes (contract layer)

| code | cause |
|---|---|
| `UNKNOWN_SPEC_VERSION` | `specVersion` missing or not `"1.0"` |
| `SCHEMA_INVALID` | JSON Schema violation; `path` names the missing/extra field where possible |
| `MISSING_FACING` | a slot omitted `facing` |
| `DUPLICATE_ID` | duplicate interaction, slot, spawn, goal, action or interaction capability id |
| `UNKNOWN_REFERENCE` | `composedOf`, slot body profile or actor body profile points at nothing loaded |
| `SLEEP_NOT_ENABLED` | sleep advertised available while the feature is off |
| `INVALID_BODY` | comfortable reach exceeds max reach, or two semantic bones map to one bone |

Gateway error payloads (`UNAUTHORIZED`, `NO_PATH`, `RESOURCE_BUSY`, …) are defined in M5 and use the
same `code/message/retryable/details/correlationId` shape; they are not contract-parser errors.

## 10. Privacy and authority

Facts and commands carry ids, classifications, outcomes and reason strings only. They must not carry
user prompts, terminal commands, file contents, credentials, model/provider names or free-form
persona text. `source` is a scoped identity (`provider:instance`), not a claim the gateway trusts
without authentication. Payload size and rate limits are enforced at the gateway (M5); the contract
only publishes the advertised limits.

## 11. Examples and tests

`examples/valid/` contains two scenes, two body profiles, two actors, capabilities, three facts and
three commands. `examples/invalid/` contains one fixture per rejection rule. Tests iterate the whole
directory, so a new example is either parsed or explicitly assigned an error code.

Run:

```bash
cd <repo>/packages/npc-contracts
npm ci
npm test
npx tsc --noEmit
```
