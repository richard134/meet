import { randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

// Channels, their members, pending membership invites and push subscriptions,
// in one JSON file on a persistent volume. The app runs as a single replica
// (Recreate strategy), so an in-process queue is enough to serialise access;
// writes go to a temporary file first and are renamed into place, so a crash
// never leaves half a file.

export type Channel = { id: string; name: string; members: string[]; createdAt: number };
export type ChannelInvite = { channelId: string; createdBy: string; expiresAt: number };
export type PushSubscription = { endpoint: string; keys: { p256dh: string; auth: string } };

type Data = {
  channels: Record<string, Channel>;
  invites: Record<string, ChannelInvite>;
  subscriptions: Record<string, PushSubscription[]>;
};

const CHANNEL_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_SUBSCRIPTIONS_PER_USER = 10;

function file() {
  const dir = process.env.DATA_DIR;
  if (!dir) {
    throw new Error('DATA_DIR is not defined');
  }
  return path.join(dir, 'store.json');
}

async function load(): Promise<Data> {
  try {
    return JSON.parse(await fs.readFile(file(), 'utf8'));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      return { channels: {}, invites: {}, subscriptions: {} };
    }
    throw e;
  }
}

let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job);
  queue = run.catch(() => undefined);
  return run;
}

function read<T>(fn: (data: Data) => T): Promise<T> {
  return enqueue(async () => fn(await load()));
}

function update<T>(fn: (data: Data) => T): Promise<T> {
  return enqueue(async () => {
    const data = await load();
    const now = Date.now();
    for (const [id, invite] of Object.entries(data.invites)) {
      if (invite.expiresAt < now) {
        delete data.invites[id];
      }
    }
    const result = fn(data);
    const tmp = `${file()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data));
    await fs.rename(tmp, file());
    return result;
  });
}

// Channel ids are the room names: a slug of the name plus six random
// characters, so two groups can both have a "Lounge" and ids cannot be
// guessed. Ad-hoc rooms are "xxxx-xxxx", which a channel id never matches.
function channelId(name: string) {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || 'channel';
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const suffix = [...randomBytes(6)].map((b) => alphabet[b % alphabet.length]).join('');
  return `${slug}-${suffix}`;
}

export function createChannel(user: string, name: string) {
  return update((data) => {
    const channel = { id: channelId(name), name, members: [user], createdAt: Date.now() };
    data.channels[channel.id] = channel;
    return channel;
  });
}

// Own-property lookups only: ids come from URLs, and "__proto__" or
// "constructor" would otherwise find something.
function has(record: object, key: string) {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function channel(data: Data, id: string) {
  return has(data.channels, id) ? data.channels[id] : undefined;
}

function invite(data: Data, inviteId: string) {
  return has(data.invites, inviteId) ? data.invites[inviteId] : undefined;
}

export function getChannel(id: string) {
  return read((data) => channel(data, id));
}

export function channelsOf(user: string) {
  return read((data) =>
    Object.values(data.channels)
      .filter((c) => c.members.includes(user))
      .sort((a, b) => a.name.localeCompare(b.name)),
  );
}

// Leaving removes the member; the last one to leave deletes the channel and
// its pending invites.
export function leaveChannel(user: string, id: string) {
  return update((data) => {
    const found = channel(data, id);
    if (!found) {
      return;
    }
    found.members = found.members.filter((m) => m !== user);
    if (found.members.length === 0) {
      delete data.channels[id];
      for (const [inviteId, invite] of Object.entries(data.invites)) {
        if (invite.channelId === id) {
          delete data.invites[inviteId];
        }
      }
    }
  });
}

// Membership invites are single use: accepting one deletes it. The id is 128
// random bits, so it is only ever known to whoever it was shared with.
export function createChannelInvite(user: string, id: string) {
  return update((data) => {
    if (!channel(data, id)?.members.includes(user)) {
      return undefined;
    }
    const inviteId = randomBytes(16).toString('base64url');
    data.invites[inviteId] = {
      channelId: id,
      createdBy: user,
      expiresAt: Date.now() + CHANNEL_INVITE_TTL_MS,
    };
    return inviteId;
  });
}

export function getChannelInvite(inviteId: string) {
  return read((data) => {
    const found = invite(data, inviteId);
    if (!found || found.expiresAt < Date.now()) {
      return undefined;
    }
    const target = channel(data, found.channelId);
    return target ? { channel: target, createdBy: found.createdBy } : undefined;
  });
}

export function acceptChannelInvite(user: string, inviteId: string) {
  return update((data) => {
    const found = invite(data, inviteId);
    const target = found && channel(data, found.channelId);
    if (!found || !target) {
      return undefined;
    }
    delete data.invites[inviteId];
    if (!target.members.includes(user)) {
      target.members.push(user);
    }
    return target.id;
  });
}

function subscriptions(data: Data, user: string) {
  return has(data.subscriptions, user) ? data.subscriptions[user] : [];
}

export function saveSubscription(user: string, subscription: PushSubscription) {
  return update((data) => {
    const existing = subscriptions(data, user).filter((s) => s.endpoint !== subscription.endpoint);
    data.subscriptions[user] = [...existing, subscription].slice(-MAX_SUBSCRIPTIONS_PER_USER);
  });
}

export function removeSubscription(user: string, endpoint: string) {
  return update((data) => {
    data.subscriptions[user] = subscriptions(data, user).filter((s) => s.endpoint !== endpoint);
  });
}

export function subscriptionsOf(users: string[]) {
  return read((data) => users.flatMap((u) => subscriptions(data, u)));
}

// Drops subscriptions the push service reported as gone.
export function removeEndpoints(endpoints: string[]) {
  return update((data) => {
    for (const user of Object.keys(data.subscriptions)) {
      data.subscriptions[user] = data.subscriptions[user].filter(
        (s) => !endpoints.includes(s.endpoint),
      );
    }
  });
}
