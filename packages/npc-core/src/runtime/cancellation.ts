import type { ActorState } from '../types.js';

/** Local operator intents, not a new wire protocol or action authority. */
export type CancelIntent =
  | { readonly scope: 'action' }
  | { readonly scope: 'goal'; readonly targetCommandId: string }
  | { readonly scope: 'work' };

/** Only a genuinely new task/safety intent resumes an operator hold. */
export function cancellationResumeKeys(actor: ActorState | undefined): ReadonlySet<string> {
  const keys = new Set<string>();
  if (!actor) return keys;
  for (const command of Object.values(actor.commands)) {
    if (command.type === 'goal.request' && command.status === 'active') keys.add(`command:${command.commandId}`);
  }
  for (const tool of Object.values(actor.tools)) {
    if (tool.phase === 'active') keys.add(`tool:${tool.key}`);
  }
  for (const run of Object.values(actor.runs)) {
    if (run.phase === 'active') keys.add(`run:${run.key}`);
  }
  if (actor.safety) keys.add(`safety:${actor.safety.reason}:${actor.safety.requestedAtWallMs}`);
  return keys;
}
