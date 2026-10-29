/**
 * Strict parsers for NPC protocol v1.
 *
 * Rules enforced beyond JSON Schema:
 * - only specVersion 1.0 is accepted (unknown versions never silently pass);
 * - every scene slot must state its facing;
 * - ids are unique where the runtime will look them up;
 * - sleep is off unless capabilities explicitly enable it AND mark it available.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import type { ErrorObject, ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import {
  SPEC_VERSION,
  type ActorProfile,
  type BodyProfile,
  type Capabilities,
  type Command,
  type EventEnvelope,
  type FactEnvelopeBase,
  type Id,
  type Scene,
} from './types.js';

const SCHEMA_DIR = fileURLToPath(new URL('../schemas/', import.meta.url));
const SCHEMA_IDS = {
  common: 'https://npc.local/schemas/v1/common.schema.json',
  envelope: 'https://npc.local/schemas/v1/envelope.schema.json',
  event: 'https://npc.local/schemas/v1/event.schema.json',
  command: 'https://npc.local/schemas/v1/command.schema.json',
  scene: 'https://npc.local/schemas/v1/scene.schema.json',
  body: 'https://npc.local/schemas/v1/body.schema.json',
  actor: 'https://npc.local/schemas/v1/actor.schema.json',
  capabilities: 'https://npc.local/schemas/v1/capabilities.schema.json',
} as const;

export type ContractErrorCode =
  | 'SCHEMA_INVALID'
  | 'UNKNOWN_SPEC_VERSION'
  | 'MISSING_FACING'
  | 'DUPLICATE_ID'
  | 'UNKNOWN_REFERENCE'
  | 'SLEEP_NOT_ENABLED'
  | 'INVALID_BODY';

export class ContractError extends Error {
  readonly code: ContractErrorCode;
  readonly path: string;
  readonly details?: unknown;

  constructor(code: ContractErrorCode, message: string, path = '/', details?: unknown) {
    super(`${code}: ${message}`);
    this.name = 'ContractError';
    this.code = code;
    this.path = path;
    this.details = details;
  }
}

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);

for (const name of ['common', 'envelope', 'event', 'command', 'scene', 'body', 'actor', 'capabilities'] as const) {
  const schema = JSON.parse(readFileSync(`${SCHEMA_DIR}${name}.schema.json`, 'utf8')) as Record<string, unknown>;
  ajv.addSchema(schema);
}

function validator(id: string): ValidateFunction {
  const validate = ajv.getSchema(id);
  if (!validate) throw new Error(`contract schema not registered: ${id}`);
  return validate;
}

const validateEnvelope = validator(SCHEMA_IDS.envelope);
const validateEvent = validator(SCHEMA_IDS.event);
const validateCommand = validator(SCHEMA_IDS.command);
const validateScene = validator(SCHEMA_IDS.scene);
const validateBody = validator(SCHEMA_IDS.body);
const validateActor = validator(SCHEMA_IDS.actor);
const validateCapabilities = validator(SCHEMA_IDS.capabilities);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function assertSpecVersion(value: unknown, kind: string): void {
  const version = isRecord(value) ? value.specVersion : undefined;
  if (version !== SPEC_VERSION) {
    throw new ContractError(
      'UNKNOWN_SPEC_VERSION',
      `${kind} specVersion must be "${SPEC_VERSION}", got ${JSON.stringify(version ?? null)}`,
      '/specVersion',
    );
  }
}

function assertSchema(kind: string, validate: ValidateFunction, value: unknown): void {
  if (!validate(value)) {
    const all = validate.errors ?? [];
    // Ajv reports every oneOf branch. Prefer the error that names the concrete
    // missing/extra field so operators get an actionable path instead of "/type".
    const required = all.find((e) => e.keyword === 'required');
    const additional = all.find((e) => e.keyword === 'additionalProperties');
    const chosen: ErrorObject | undefined = required ?? additional ?? all.find((e) => e.keyword !== 'oneOf') ?? all[0];
    let path = chosen?.instancePath || '/';
    let message = chosen?.message ?? 'invalid';
    if (required && typeof required.params.missingProperty === 'string') {
      path = `${required.instancePath || ''}/${required.params.missingProperty}`;
      message = `must have required property "${required.params.missingProperty}"`;
    } else if (additional && typeof additional.params.additionalProperty === 'string') {
      path = `${additional.instancePath || ''}/${additional.params.additionalProperty}`;
      message = `must not have additional property "${additional.params.additionalProperty}"`;
    }
    throw new ContractError('SCHEMA_INVALID', `${kind} failed schema validation at ${path}: ${message}`, path, {
      errors: all.slice(0, 12).map((e) => ({ path: e.instancePath || '/', keyword: e.keyword, message: e.message, params: e.params })),
    });
  }
}

function assertUnique(ids: Id[], pathPrefix: string, what: string): void {
  const seen = new Set<Id>();
  ids.forEach((id, index) => {
    if (seen.has(id)) {
      throw new ContractError('DUPLICATE_ID', `${what} id "${id}" is duplicated`, `${pathPrefix}/${index}/id`);
    }
    seen.add(id);
  });
}

function checkSlotFacing(value: unknown): void {
  if (!isRecord(value) || !Array.isArray(value.interactions)) return;
  value.interactions.forEach((interaction, i) => {
    if (!isRecord(interaction) || !Array.isArray(interaction.slots)) return;
    interaction.slots.forEach((slot, j) => {
      if (!isRecord(slot)) return;
      if (slot.facing === undefined) {
        const pose = typeof slot.pose === 'string' ? slot.pose : 'unknown';
        throw new ContractError(
          'MISSING_FACING',
          `${pose} slot must declare facing for align/preflight`,
          `/interactions/${i}/slots/${j}/facing`,
        );
      }
    });
  });
}

export function parseEnvelope(value: unknown): FactEnvelopeBase {
  assertSpecVersion(value, 'envelope');
  assertSchema('envelope', validateEnvelope, value);
  return value as FactEnvelopeBase;
}

export function parseEvent(value: unknown): EventEnvelope {
  assertSpecVersion(value, 'event');
  assertSchema('event', validateEvent, value);
  return value as EventEnvelope;
}

export function parseCommand(value: unknown): Command {
  assertSpecVersion(value, 'command');
  assertSchema('command', validateCommand, value);
  const command = structuredClone(value as Command);
  command.onConflict ??= 'queue';
  return command;
}

export interface SceneParseOptions {
  /** Body profile ids that are actually loaded; slot compatibility is checked when supplied. */
  bodyProfiles?: Id[];
}

export function parseScene(value: unknown, options: SceneParseOptions = {}): Scene {
  assertSpecVersion(value, 'scene');
  checkSlotFacing(value);
  assertSchema('scene', validateScene, value);

  const raw = value as Scene;
  assertUnique(raw.interactions.map((i) => i.id), '/interactions', 'interaction');
  for (let i = 0; i < raw.interactions.length; i += 1) {
    const interaction = raw.interactions[i]!;
    assertUnique(interaction.slots.map((s) => s.id), `/interactions/${i}/slots`, 'slot');
    for (const part of interaction.composedOf ?? []) {
      if (!raw.interactions.some((candidate) => candidate.id === part.interactionId)) {
        throw new ContractError(
          'UNKNOWN_REFERENCE',
          `composedOf references missing interaction "${part.interactionId}"`,
          `/interactions/${i}/composedOf`,
        );
      }
    }
    if (options.bodyProfiles) {
      for (let j = 0; j < interaction.slots.length; j += 1) {
        const slot = interaction.slots[j]!;
        for (const profile of slot.compatibleBodyProfiles) {
          if (!options.bodyProfiles.includes(profile)) {
            throw new ContractError(
              'UNKNOWN_REFERENCE',
              `slot references body profile "${profile}" that is not loaded`,
              `/interactions/${i}/slots/${j}/compatibleBodyProfiles`,
            );
          }
        }
      }
    }
  }
  const spawnIds = raw.spawnPoints.map((s) => s.id);
  assertUnique(spawnIds, '/spawnPoints', 'spawn point');

  const scene = structuredClone(raw);
  for (const interaction of scene.interactions) interaction.enabled ??= true;
  scene.autonomy = {
    enabledGoals: scene.autonomy?.enabledGoals ?? ['idle', 'lookAround'],
    allowSleep: scene.autonomy?.allowSleep ?? false,
    idleCooldownMs: scene.autonomy?.idleCooldownMs ?? 30000,
  };
  return scene;
}

export function parseBody(value: unknown): BodyProfile {
  assertSpecVersion(value, 'body');
  assertSchema('body', validateBody, value);
  const body = value as BodyProfile;
  if (body.reach.comfortableArmMeters > body.reach.maxArmMeters) {
    throw new ContractError(
      'INVALID_BODY',
      'comfortableArmMeters must not exceed maxArmMeters',
      '/reach/comfortableArmMeters',
    );
  }
  const boneNames = Object.values(body.bones).filter((name): name is string => typeof name === 'string');
  if (new Set(boneNames).size !== boneNames.length) {
    throw new ContractError('INVALID_BODY', 'semantic bone slots must map to distinct bone names', '/bones');
  }
  return body;
}

export function parseActor(value: unknown, options: { bodyProfiles?: Id[] } = {}): ActorProfile {
  assertSpecVersion(value, 'actor');
  assertSchema('actor', validateActor, value);
  const actor = value as ActorProfile;
  if (options.bodyProfiles && !options.bodyProfiles.includes(actor.bodyProfileId)) {
    throw new ContractError(
      'UNKNOWN_REFERENCE',
      `actor references body profile "${actor.bodyProfileId}" that is not loaded`,
      '/bodyProfileId',
    );
  }
  return actor;
}

export function parseCapabilities(value: unknown): Capabilities {
  assertSpecVersion(value, 'capabilities');
  assertSchema('capabilities', validateCapabilities, value);
  const caps = structuredClone(value as Capabilities);

  assertUnique(caps.goals.map((g) => g.id), '/goals', 'goal');
  assertUnique(caps.actions.map((a) => a.id), '/actions', 'action');
  assertUnique(caps.interactions.map((i) => i.id), '/interactions', 'interaction');

  caps.features = {
    sleep: caps.features?.sleep ?? false,
    manualOverride: caps.features?.manualOverride ?? true,
    maxActors: caps.features?.maxActors ?? 1,
  };
  caps.limits = {
    maxEventPayloadBytes: caps.limits?.maxEventPayloadBytes ?? 65536,
    commandsPerMinute: caps.limits?.commandsPerMinute ?? 60,
  };

  if (!caps.features.sleep) {
    const sleep = caps.goals.find((goal) => goal.id === 'sleep');
    if (sleep?.available) {
      throw new ContractError(
        'SLEEP_NOT_ENABLED',
        'sleep goal cannot be available while features.sleep is false',
        `/goals/${caps.goals.indexOf(sleep)}/available`,
      );
    }
  }
  return caps;
}
