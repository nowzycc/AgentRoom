import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  ContractError,
  parseActor,
  parseBody,
  parseCapabilities,
  parseCommand,
  parseEvent,
  parseScene,
  SPEC_VERSION,
  type Capabilities,
  type Command,
  type Scene,
} from '../src/index.js';

const examplesDir = fileURLToPath(new URL('../examples/', import.meta.url));
const read = (file: string): unknown => JSON.parse(readFileSync(`${examplesDir}${file}`, 'utf8'));
const VALID = readdirSync(`${examplesDir}valid`).sort();
const INVALID = readdirSync(`${examplesDir}invalid`).sort();
const BODY_PROFILES = ['body-companion', 'body-visitor'];

function parseByKind(file: string, value: unknown): unknown {
  const kind = file.slice(0, file.indexOf('-'));
  switch (kind) {
    case 'scene':
      return parseScene(value, { bodyProfiles: BODY_PROFILES });
    case 'body':
      return parseBody(value);
    case 'actor':
      return parseActor(value, { bodyProfiles: BODY_PROFILES });
    case 'capabilities':
      return parseCapabilities(value);
    case 'command':
      return parseCommand(value);
    case 'event':
      return parseEvent(value);
    default:
      throw new Error(`no parser for example ${file}`);
  }
}

describe('valid examples', () => {
  it('parses every valid example through its strict parser', () => {
    expect(VALID.length).toBeGreaterThanOrEqual(12);
    for (const file of VALID) {
      expect(() => parseByKind(file, read(`valid/${file}`)), file).not.toThrow();
    }
  });

  it('describes two independent scenes without behaviour coordinates', () => {
    const apartment = parseScene(read('valid/scene-apartment.json'), { bodyProfiles: BODY_PROFILES });
    const studio = parseScene(read('valid/scene-studio.json'), { bodyProfiles: BODY_PROFILES });
    expect(new Set([apartment.sceneId, studio.sceneId]).size).toBe(2);
    expect(apartment.interactions.map((i) => i.id)).toContain('desk-workstation');
    expect(studio.interactions.map((i) => i.id)).toContain('bench-combo');
    // Combined workstation references separately hosted seat and keyboard interactions.
    const desk = apartment.interactions.find((i) => i.id === 'desk-workstation')!;
    expect(desk.composedOf).toEqual([
      { interactionId: 'chair-main', role: 'seat' },
      { interactionId: 'keyboard-main', role: 'keyboard' },
    ]);
    expect(desk.composedOf!.every((ref) => apartment.interactions.some((i) => i.id === ref.interactionId))).toBe(true);
    // Parsed defaults: interactions enabled, autonomy sleep disabled.
    expect(apartment.interactions.every((i) => i.enabled)).toBe(true);
    expect(apartment.autonomy.allowSleep).toBe(false);
    expect(studio.interactions.every((i) => i.enabled)).toBe(true);
    expect(studio.autonomy).toEqual({ enabledGoals: ['idle', 'lookAround'], allowSleep: false, idleCooldownMs: 30000 });
  });

  it('describes two actors with distinct body profiles', () => {
    const companion = parseActor(read('valid/actor-companion.json'), { bodyProfiles: BODY_PROFILES });
    const visitor = parseActor(read('valid/actor-visitor.json'), { bodyProfiles: BODY_PROFILES });
    expect(companion.actorId).not.toBe(visitor.actorId);
    expect(companion.bodyProfileId).not.toBe(visitor.bodyProfileId);
    expect(parseBody(read('valid/body-companion.json')).bones.leftHand).toBe('J_Bip_L_Hand');
    expect(parseBody(read('valid/body-visitor.json')).bones.leftHand).toBe('mixamorigLeftHand');
  });

  it('keeps sleep unavailable by default in capabilities', () => {
    const caps = parseCapabilities(read('valid/capabilities-apartment.json'));
    expect(caps.features.sleep).toBe(false);
    expect(caps.goals.find((g) => g.id === 'sleep')?.available).toBe(false);
    expect(caps.limits.maxEventPayloadBytes).toBe(65536);
  });

  it('parses fact and command examples into discriminated shapes', () => {
    const tool = parseEvent(read('valid/event-tool-started.json'));
    expect(tool.type).toBe('tool.started');
    if (tool.type !== 'tool.started') throw new Error('unreachable');
    expect(tool.data.toolCallId).toBe('call-a');
    const cmd = parseCommand(read('valid/command-goal-request.json')) as Extract<Command, { type: 'goal.request' }>;
    expect(cmd.goal).toBe('work');
    expect(cmd.ttlMs).toBe(60000);
    // Schema-level default applied when omitted.
    const pause = parseCommand({
      specVersion: '1.0', commandId: 'cmd-p', worldId: 'apartment', actorId: 'companion',
      type: 'world.pause', priorityClass: 'manual', reason: 'inspect',
    });
    expect(pause.onConflict).toBe('queue');
  });
});

describe('invalid examples', () => {
  const cases: Array<[string, string, string]> = [
    ['event-unknown-version.json', 'UNKNOWN_SPEC_VERSION', '/specVersion'],
    ['event-bad-source.json', 'SCHEMA_INVALID', '/source'],
    ['event-tool-missing-callid.json', 'SCHEMA_INVALID', '/data'],
    ['event-unknown-type.json', 'SCHEMA_INVALID', '/type'],
    ['scene-missing-facing.json', 'MISSING_FACING', '/interactions/0/slots/0/facing'],
    ['scene-duplicate-interaction.json', 'DUPLICATE_ID', '/interactions/1/id'],
    ['scene-composed-unknown.json', 'UNKNOWN_REFERENCE', '/interactions/0/composedOf'],
    ['command-request-missing-goal.json', 'SCHEMA_INVALID', ''],
    ['capabilities-sleep-implicit.json', 'SLEEP_NOT_ENABLED', '/goals/0/available'],
    ['body-missing-bone.json', 'SCHEMA_INVALID', ''],
  ];

  it('rejects every invalid example with a specific, inspectable error', () => {
    expect(INVALID.sort()).toEqual(cases.map(([file]) => file).sort());
    for (const [file, code, pathPart] of cases) {
      let caught: unknown;
      try {
        parseByKind(file, read(`invalid/${file}`));
      } catch (error) {
        caught = error;
      }
      expect(caught, `${file} should be rejected`).toBeInstanceOf(ContractError);
      const err = caught as ContractError;
      expect(err.code, file).toBe(code);
      if (pathPart) expect(err.path, file).toContain(pathPart);
    }
  });

  it('rejects unknown specVersion even when the rest of the payload looks valid', () => {
    const event = read('valid/event-tool-started.json') as Record<string, unknown>;
    expect(() => parseEvent({ ...event, specVersion: '1.1' })).toThrowError(/UNKNOWN_SPEC_VERSION/);
    expect(() => parseCommand({ ...(read('valid/command-goal-request.json') as object), specVersion: '1.0.0' }))
      .toThrowError(/UNKNOWN_SPEC_VERSION/);
  });

  it('never lets a slot pass without facing', () => {
    const scene = read('valid/scene-apartment.json') as Scene;
    const seated = structuredClone(scene);
    delete (seated.interactions[1]!.slots[0] as { facing?: unknown }).facing;
    expect(() => parseScene(seated, { bodyProfiles: BODY_PROFILES })).toThrowError(/MISSING_FACING/);
    const standing = structuredClone(scene);
    delete (standing.interactions[0]!.slots[0] as { facing?: unknown }).facing;
    expect(() => parseScene(standing, { bodyProfiles: BODY_PROFILES })).toThrowError(/MISSING_FACING/);
  });

  it('applies sleep=false defaults and rejects an implicit sleep capability', () => {
    const minimal = {
      specVersion: '1.0', worldId: 'apartment', sceneId: 'apartment-v3', sceneRevision: 1,
      authority: { mode: 'none' }, goals: [{ id: 'idle', available: true }], actions: [], interactions: [],
    };
    const caps = parseCapabilities(minimal) as Capabilities;
    expect(caps.features).toEqual({ sleep: false, manualOverride: true, maxActors: 1 });
    expect(caps.limits).toEqual({ maxEventPayloadBytes: 65536, commandsPerMinute: 60 });
    expect(() => parseCapabilities({
      ...minimal,
      goals: [{ id: 'sleep', available: true }],
    })).toThrowError(/SLEEP_NOT_ENABLED/);
  });

  it('rejects unknown properties, malformed ids and missing body references', () => {
    const event = read('valid/event-heartbeat.json') as Record<string, unknown>;
    expect(() => parseEvent({ ...event, model: 'deepseek-flash' })).toThrowError(/SCHEMA_INVALID/);
    expect(() => parseEvent({ ...event, source: 'hermes:default:extra' })).toThrowError(/SCHEMA_INVALID/);
    expect(() => parseEvent({ ...event, eventId: 'bad id with spaces' })).toThrowError(/SCHEMA_INVALID/);
    const actor = read('valid/actor-companion.json') as Record<string, unknown>;
    expect(() => parseActor(actor, { bodyProfiles: ['body-other'] })).toThrowError(/UNKNOWN_REFERENCE/);
    const body = read('valid/body-companion.json') as { reach: { comfortableArmMeters: number } };
    expect(() => parseBody({ ...body, reach: { ...body.reach, comfortableArmMeters: 1.05 } })).toThrowError(/INVALID_BODY/);
  });
});

describe('schema version pin', () => {
  it('exposes exactly one protocol version', () => {
    expect(SPEC_VERSION).toBe('1.0');
  });
});
