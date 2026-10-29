import type { EventEnvelope, Command, GoalRequestCommand } from '@npc/contracts';
import type { DomainStore } from '../domain/store.js';
import type { DispatchResult } from '../types.js';
import { layerRank } from '../goals/layers.js';
import type { HarnessPolicy, HarnessGoal } from './policy.js';
import { observeHarness } from './observation.js';

/** Projection→intent adapter. DomainStore and the existing runtime retain authority. */
export class HarnessBridge {
  private serial = 0;
  private policyCommand: string | null = null;
  private manualCommand: string | null = null;
  private explicitCommand: string | null = null;
  private lastReason: string | null = null;
  private readonly requests = new Map<string, { readonly sinceSimMs: number; readonly revision: number }>();

  constructor(
    private readonly store: DomainStore,
    private readonly policy: HarnessPolicy,
    private readonly execution?: {
      readonly withdraw: (commandId: string) => boolean;
      readonly revision: () => number;
    },
  ) {}

  ingest(fact: EventEnvelope): DispatchResult {
    if (fact.actorId !== this.policy.observerId || fact.worldId !== this.store.snapshot.worldId ||
        fact.source !== this.policy.source || fact.sessionId !== this.policy.sessionId) {
      return { accepted: false, reason: 'HARNESS_BINDING_MISMATCH', revision: this.store.revision };
    }
    const heartbeat = this.store.snapshot.actors[this.policy.observerId]?.presence.samples.find(sample =>
      sample.source === fact.source && sample.epoch === fact.sourceEpoch && sample.sessionId === fact.sessionId);
    if (fact.type === 'presence.heartbeat' && heartbeat && fact.sequence < heartbeat.sequence) {
      return { accepted: false, reason: 'STALE_HEARTBEAT', revision: this.store.revision };
    }
    const result = this.store.dispatch({ kind: 'fact', fact });
    this.refresh();
    return result;
  }

  adoptEpoch(epoch: string): DispatchResult {
    const result = this.store.dispatch({ kind: 'source.epoch.adopt', actorId: this.policy.observerId, source: this.policy.source, epoch });
    this.refresh();
    return result;
  }

  refresh(): void {
    if (this.command(this.explicitCommand)?.status === 'active') return;
    this.explicitCommand = null;
    const observation = observeHarness(this.store, this.policy);
    const goal = this.policy.goals[observation.state];
    const current = this.command(this.policyCommand);
    if (current?.status === 'active' && current.goalId === goal) return;
    if (current?.status === 'active') this.cancel(current.commandId);
    this.policyCommand = null;
    if (goal !== null) this.policyCommand = this.request(goal, 'task', this.policy.goalTtlMs);
  }

  /** Register external identity without creating another execution authority. */
  explicit(command: GoalRequestCommand): DispatchResult {
    const actor = this.store.snapshot.actors[this.policy.actorId];
    // Admission may refuse a lower layer, never withdraw its higher-layer support.
    // Existing IDs still reach the store's duplicate/conflict check first.
    if (!actor?.commands[command.commandId] && layerRank(command.priorityClass) < layerRank('manual') &&
        (actor?.manual || Object.values(actor?.commands ?? {}).some(record =>
          record.status === 'active' && record.priorityClass === 'manual'))) {
      return { accepted: false, reason: 'MANUAL_PRIORITY', revision: this.store.revision };
    }
    const result = this.store.dispatch({ kind: 'command', command });
    if (!result.accepted) return result;
    if (this.explicitCommand === command.commandId) return result;
    if (this.explicitCommand && this.command(this.explicitCommand)?.status === 'active') this.cancel(this.explicitCommand);
    if (this.policyCommand && this.command(this.policyCommand)?.status === 'active') this.cancel(this.policyCommand);
    this.policyCommand = null;
    this.explicitCommand = command.commandId;
    this.requests.set(command.commandId, { sinceSimMs: this.store.simTimeMs, revision: this.execution?.revision() ?? this.store.snapshot.factsRevision });
    return result;
  }

  manual(goal: HarnessGoal): string | null {
    this.releaseManual();
    this.manualCommand = this.request(goal, 'manual', this.policy.manualTtlMs);
    return this.manualCommand;
  }

  releaseManual(): void {
    if (this.command(this.manualCommand)?.status === 'active' && this.manualCommand) this.cancel(this.manualCommand);
    this.manualCommand = null;
    this.refresh();
  }

  singleAction(_actionKey: string): { readonly accepted: false; readonly reason: string } {
    this.lastReason = 'H4B_SINGLE_ACTION_NOT_SUPPORTED';
    return { accepted: false, reason: this.lastReason };
  }

  requestReceipt(id: string) {
    const command = this.command(id), binding = this.requests.get(id);
    return command && binding ? { command, ...binding } : null;
  }

  view() {
    const observed = observeHarness(this.store, this.policy);
    const manual = this.command(this.manualCommand);
    const explicit = this.command(this.explicitCommand);
    const selected = manual?.status === 'active' ? manual : explicit?.status === 'active' ? explicit : this.command(this.policyCommand);
    const binding = selected ? this.requests.get(selected.commandId) : undefined;
    return {
      request: selected?.status === 'active' && binding ? { command: selected, ...binding } : null,
      observed,
      desiredGoal: this.policy.goals[observed.state],
      effectiveGoal: selected?.status === 'active' ? selected.goalId : this.policy.goals[observed.state],
      commandId: this.command(this.policyCommand)?.status === 'active' ? this.policyCommand : null,
      manualCommandId: manual?.status === 'active' ? this.manualCommand : null,
      reason: this.lastReason,
    };
  }

  private command(id: string | null) {
    return id === null ? undefined : this.store.snapshot.actors[this.policy.actorId]?.commands[id];
  }

  private base() {
    return { specVersion: '1.0', worldId: this.store.snapshot.worldId, actorId: this.policy.actorId,
      commandId: `h4a-${this.policy.observerId}-${++this.serial}`, onConflict: 'replace' } as const;
  }

  private request(goal: HarnessGoal, priorityClass: 'task' | 'manual', ttlMs: number): string | null {
    const command: Command = { ...this.base(), type: 'goal.request', goal, priorityClass, ttlMs };
    const result = this.store.dispatch({ kind: 'command', command });
    if (!result.accepted) this.lastReason = result.reason;
    if (result.accepted) {
      for (const id of this.requests.keys()) {
        if (this.command(id)?.status !== 'active') this.requests.delete(id);
      }
      // At most the current policy and manual binding; execution remains runtime-owned.
      this.requests.set(command.commandId, { sinceSimMs: this.store.simTimeMs, revision: this.execution?.revision() ?? this.store.snapshot.factsRevision });
    }
    return result.accepted ? command.commandId : null;
  }

  private cancel(targetCommandId: string): void {
    if (this.execution?.withdraw(targetCommandId)) return;
    const command: Command = { ...this.base(), type: 'goal.cancel', priorityClass: 'task', targetCommandId, ttlMs: this.policy.goalTtlMs };
    const result = this.store.dispatch({ kind: 'command', command });
    if (!result.accepted) this.lastReason = result.reason;
  }
}
