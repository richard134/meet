import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  acceptChannelInvite,
  channelsOf,
  createChannel,
  createChannelInvite,
  getChannel,
  getChannelInvite,
  leaveChannel,
  removeEndpoints,
  saveSubscription,
  subscriptionsOf,
} from './store';

const sub = (endpoint: string) => ({ endpoint, keys: { p256dh: 'p', auth: 'a' } });

describe('store', () => {
  beforeEach(() => {
    process.env.DATA_DIR = mkdtempSync(path.join(tmpdir(), 'meet-store-'));
  });

  it('creates channels with unguessable ids and the creator as member', async () => {
    const a = await createChannel('anna', 'Lounge');
    const b = await createChannel('bo', 'Lounge');
    expect(a.id).toMatch(/^lounge-[a-z0-9]{6}$/);
    expect(a.id).not.toBe(b.id);
    expect(await channelsOf('anna')).toEqual([a]);
    expect(await channelsOf('bo')).toEqual([b]);
  });

  it('lets a member invite someone, once', async () => {
    const channel = await createChannel('anna', 'Lounge');
    const invite = (await createChannelInvite('anna', channel.id))!;
    expect(await getChannelInvite(invite)).toMatchObject({ createdBy: 'anna' });
    expect(await acceptChannelInvite('bo', invite)).toBe(channel.id);
    expect((await getChannel(channel.id))?.members).toEqual(['anna', 'bo']);
    expect(await acceptChannelInvite('cid', invite)).toBeUndefined();
    expect(await getChannelInvite(invite)).toBeUndefined();
  });

  it('does not let non-members invite', async () => {
    const channel = await createChannel('anna', 'Lounge');
    expect(await createChannelInvite('eve', channel.id)).toBeUndefined();
  });

  it('deletes a channel and its invites when the last member leaves', async () => {
    const channel = await createChannel('anna', 'Lounge');
    const invite = (await createChannelInvite('anna', channel.id))!;
    await leaveChannel('anna', channel.id);
    expect(await getChannel(channel.id)).toBeUndefined();
    expect(await acceptChannelInvite('bo', invite)).toBeUndefined();
  });

  it('ignores prototype keys from URLs', async () => {
    expect(await getChannel('__proto__')).toBeUndefined();
    expect(await getChannel('constructor')).toBeUndefined();
    expect(await acceptChannelInvite('bo', '__proto__')).toBeUndefined();
  });

  it('keeps one subscription per endpoint and drops gone ones', async () => {
    await saveSubscription('anna', sub('https://fcm.googleapis.com/a'));
    await saveSubscription('anna', sub('https://fcm.googleapis.com/a'));
    await saveSubscription('bo', sub('https://fcm.googleapis.com/b'));
    expect(await subscriptionsOf(['anna', 'bo'])).toHaveLength(2);
    await removeEndpoints(['https://fcm.googleapis.com/b']);
    expect(await subscriptionsOf(['bo'])).toEqual([]);
  });

  it('serialises concurrent writes', async () => {
    const channel = await createChannel('anna', 'Lounge');
    const invites = await Promise.all(
      Array.from({ length: 20 }, () => createChannelInvite('anna', channel.id)),
    );
    await Promise.all(invites.map((invite, i) => acceptChannelInvite(`user${i}`, invite!)));
    expect((await getChannel(channel.id))?.members).toHaveLength(21);
  });
});
