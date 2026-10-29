/**
 * Body channel locks. A channel (locomotion, lowerBody, upperBody, hands, gaze,
 * voice) is owned by at most one action at a time. Acquisition of a set is
 * atomic in stable order: either every channel is taken or none is, so a
 * failed multi-channel request can never leave a half-held body.
 */
import type { Channel } from '../planner/catalog.js';

export interface ChannelConflict {
  channel: Channel;
  owner: string;
}

export interface AcquireResult {
  ok: boolean;
  channels: Channel[];
  conflict?: ChannelConflict;
}

export class ChannelLocks {
  private readonly owners = new Map<Channel, string>();

  acquire(owner: string, channels: readonly Channel[]): AcquireResult {
    const requested = [...new Set(channels)].sort();
    for (const channel of requested) {
      const holder = this.owners.get(channel);
      if (holder !== undefined && holder !== owner) {
        return { ok: false, channels: [], conflict: { channel, owner: holder } };
      }
    }
    for (const channel of requested) this.owners.set(channel, owner);
    return { ok: true, channels: requested };
  }

  release(owner: string): Channel[] {
    const released: Channel[] = [];
    for (const [channel, holder] of this.owners) {
      if (holder === owner) {
        this.owners.delete(channel);
        released.push(channel);
      }
    }
    return released.sort();
  }

  ownerOf(channel: Channel): string | null {
    return this.owners.get(channel) ?? null;
  }

  heldBy(owner: string): Channel[] {
    const out: Channel[] = [];
    for (const [channel, holder] of this.owners) if (holder === owner) out.push(channel);
    return out.sort();
  }

  snapshot(): Array<{ channel: Channel; owner: string }> {
    return [...this.owners.entries()].map(([channel, owner]) => ({ channel, owner })).sort((a, b) => a.channel.localeCompare(b.channel));
  }
}
