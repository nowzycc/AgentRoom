import type { ActorState, CommandRecord, DomainEvent, DomainState, ReduceOutcome } from '../types.js';
import type { DomainConfig } from './config.js';
import { readId, writeId } from './idmap.js';
import { layerRank } from '../goals/layers.js';

type CommandEvent = Extract<DomainEvent, { kind: 'command' }>;

/** RFC 8785-style canonical JSON: object keys sorted, undefined dropped. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`;
}

function payloadHash(event: CommandEvent): string {
  return canonicalJson(event.command);
}

/**
 * Commands are authorised intents, not animations. This module only registers
 * them (and their TTL); the arbiter decides, and the action runner (M2) is the
 * only thing that may claim a posture or a body channel.
 */
export function applyCommand(
  draft: DomainState,
  actor: ActorState,
  ev: CommandEvent,
  _config: DomainConfig,
): ReduceOutcome {
  const command = ev.command;
  if (command.worldId !== draft.worldId) return { status: 'rejected', reason: 'WORLD_MISMATCH' };

  const hash = payloadHash(ev);
  const existing = readId(actor.commands, command.commandId);
  if (existing) {
    if (existing.payloadHash !== hash) return { status: 'rejected', reason: 'COMMAND_CONFLICT' };
    return { status: 'noop', reason: 'DUPLICATE_COMMAND' };
  }

  const record: CommandRecord = {
    commandId: command.commandId,
    type: command.type,
    goalId: 'goal' in command ? command.goal : null,
    priorityClass: command.priorityClass,
    status: 'completed',
    receivedAtWallMs: ev.wallMs,
    expiresAtWallMs: null,
    payloadHash: hash,
    onConflict: command.onConflict ?? 'queue',
  };

  switch (command.type) {
    case 'goal.request': {
      // The safety layer is runtime-owned: a goal request cannot assert it.
      if (command.priorityClass === 'safety') return { status: 'rejected', reason: 'SAFETY_RESERVED' };
      if (command.onConflict === 'reject') {
        const active = actor.goal.active;
        const conflict =
          active !== null &&
          active.goalId !== command.goal &&
          layerRank(active.layer) >= layerRank(command.priorityClass);
        if (conflict) return { status: 'rejected', reason: 'GOAL_CONFLICT' };
      }
      record.status = 'active';
      record.expiresAtWallMs = ev.wallMs + command.ttlMs;
      writeId(actor.commands, command.commandId, record);
      return { status: 'applied' };
    }

    case 'goal.cancel': {
      const target = readId(actor.commands, command.targetCommandId);
      if (!target) return { status: 'rejected', reason: 'UNKNOWN_COMMAND' };
      if (target.type !== 'goal.request') return { status: 'rejected', reason: 'COMMAND_NOT_CANCELLABLE' };
      if (target.status !== 'active') return { status: 'rejected', reason: 'COMMAND_NOT_ACTIVE' };
      writeId(actor.commands, command.targetCommandId, { ...target, status: 'cancelled' });
      writeId(actor.commands, command.commandId, record);
      return { status: 'applied' };
    }

    case 'manual.acquire': {
      if (actor.manual) {
        const previous = readId(actor.commands, actor.manual.commandId);
        if (previous && previous.status === 'active') {
          writeId(actor.commands, actor.manual.commandId, { ...previous, status: 'cancelled' });
        }
      }
      record.status = 'active';
      record.expiresAtWallMs = ev.wallMs + command.ttlMs;
      writeId(actor.commands, command.commandId, record);
      actor.manual = {
        commandId: command.commandId,
        expiresAtWallMs: ev.wallMs + command.ttlMs,
      };
      return { status: 'applied' };
    }

    case 'manual.release': {
      if (!actor.manual || actor.manual.commandId !== command.targetCommandId) {
        return { status: 'rejected', reason: 'MANUAL_MISMATCH' };
      }
      const lease = readId(actor.commands, actor.manual.commandId);
      if (lease && lease.status === 'active') {
        writeId(actor.commands, actor.manual.commandId, { ...lease, status: 'completed' });
      }
      actor.manual = null;
      writeId(actor.commands, command.commandId, record);
      return { status: 'applied' };
    }

    case 'world.pause': {
      draft.worldPaused = true;
      writeId(actor.commands, command.commandId, record);
      return { status: 'applied' };
    }

    case 'world.resume': {
      draft.worldPaused = false;
      writeId(actor.commands, command.commandId, record);
      return { status: 'applied' };
    }

    default: {
      return { status: 'rejected', reason: 'UNKNOWN_COMMAND_TYPE' };
    }
  }
}
