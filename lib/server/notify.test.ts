import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const sent = vi.hoisted(() => [] as string[]);
vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(async (s: { endpoint: string }, payload: string) => {
      sent.push(`${s.endpoint} ${JSON.parse(payload).body}`);
    }),
  },
}));

import { notifyChannelStarted } from './push';
import { createChannel, saveSubscription } from './store';

const RICHARD = 'https://updates.push.services.mozilla.com/wpush/v2/richard';
const BO = 'https://fcm.googleapis.com/fcm/send/bo';
const at = (seconds: number) => vi.setSystemTime(new Date(Date.UTC(2026, 8, 29, 9, 40, seconds)));

describe('notifyChannelStarted', () => {
  beforeAll(() => {
    process.env.DATA_DIR = mkdtempSync(path.join(tmpdir(), 'meet-notify-'));
    process.env.VAPID_PUBLIC_KEY = 'public';
    process.env.VAPID_PRIVATE_KEY = 'private';
    process.env.VAPID_SUBJECT = 'https://share.example';
    vi.useFakeTimers({ toFake: ['Date'] });
  });
  afterAll(() => vi.useRealTimers());

  it('replays the missed notification: a lone member joining must not mute the next join', async () => {
    const channel = await createChannel('richard', 'dev');
    await saveSubscription('richard', { endpoint: RICHARD, keys: { p256dh: 'p', auth: 'a' } });

    at(1); // richard joins the empty channel: nobody else to tell
    await notifyChannelStarted(channel, 'richard', 'richard');
    expect(sent).toEqual([]);

    at(103); // a guest joins the empty channel 102 seconds later
    await notifyChannelStarted(channel, 'Hehe (guest)');
    expect(sent).toEqual([`${RICHARD} Hehe (guest) started hanging out`]);

    at(133); // and drops out and back in: richard was just told, so no second ping
    await notifyChannelStarted(channel, 'Hehe (guest)');
    expect(sent).toHaveLength(1);
  });

  it('tracks each member separately', async () => {
    sent.length = 0;
    const channel = await createChannel('anna', 'lounge');
    channel.members.push('bo');
    await saveSubscription('anna', {
      endpoint: RICHARD.replace('richard', 'anna'),
      keys: { p256dh: 'p', auth: 'a' },
    });
    await saveSubscription('bo', { endpoint: BO, keys: { p256dh: 'p', auth: 'a' } });

    at(10); // anna starts: bo is told
    await notifyChannelStarted(channel, 'anna', 'anna');
    expect(sent).toEqual([`${BO} anna started hanging out`]);

    at(40); // bo starts again 30 seconds later: anna has not been told yet, bo is not pinged
    await notifyChannelStarted(channel, 'bo', 'bo');
    expect(sent).toEqual([
      `${BO} anna started hanging out`,
      `${RICHARD.replace('richard', 'anna')} bo started hanging out`,
    ]);
  });
});
