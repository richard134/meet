import webpush from 'web-push';
import { Channel, PushSubscription, removeEndpoints, subscriptionsOf } from './store';

// Web Push to channel members. The payload is encrypted for the device, so the
// browser vendor's push service only sees that a push was sent.

// The server POSTs to whatever endpoint a subscription names, so only the
// browsers' own push services are accepted: anything else would let a
// logged-in user make the server call arbitrary, including internal, URLs.
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/, // Chrome, Edge on Android, Brave
  /^updates\.push\.services\.mozilla\.com$/, // Firefox, Zen
  /^web\.push\.apple\.com$/, // Safari, iPhone Home Screen apps
  /^[a-z0-9-]+\.notify\.windows\.com$/, // Edge on Windows
];

export function isPushSubscription(value: unknown): value is PushSubscription {
  const s = value as PushSubscription;
  if (
    typeof s?.endpoint !== 'string' ||
    typeof s.keys?.p256dh !== 'string' ||
    typeof s.keys?.auth !== 'string'
  ) {
    return false;
  }
  try {
    const url = new URL(s.endpoint);
    return url.protocol === 'https:' && PUSH_HOSTS.some((host) => host.test(url.hostname));
  } catch {
    return false;
  }
}

export function vapidPublicKey() {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    throw new Error('VAPID_PUBLIC_KEY is not defined');
  }
  return key;
}

let configured = false;
function configure() {
  if (!configured) {
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;
    if (!privateKey || !subject) {
      throw new Error('VAPID_PRIVATE_KEY and VAPID_SUBJECT must be defined');
    }
    webpush.setVapidDetails(subject, vapidPublicKey(), privateKey);
    configured = true;
  }
}

// At most one "started hanging out" per channel every two minutes, so someone
// dropping out and back in does not ping everyone twice.
const QUIET_MS = 2 * 60 * 1000;
const lastSent = new Map<string, number>();

export async function notifyChannelStarted(channel: Channel, byName: string, byUser?: string) {
  const now = Date.now();
  if (now - (lastSent.get(channel.id) ?? 0) < QUIET_MS) {
    return;
  }
  lastSent.set(channel.id, now);
  configure();

  const recipients = channel.members.filter((m) => m !== byUser);
  const payload = JSON.stringify({
    title: channel.name,
    body: `${byName} started hanging out`,
    url: `/c/${channel.id}`,
    tag: channel.id,
  });
  const gone: string[] = [];
  await Promise.all(
    (await subscriptionsOf(recipients)).map((s) =>
      webpush.sendNotification(s, payload, { TTL: 300, urgency: 'high' }).catch((e) => {
        if (e.statusCode === 404 || e.statusCode === 410) {
          gone.push(s.endpoint);
        } else {
          console.error('push failed', e.statusCode, e.body);
        }
      }),
    ),
  );
  if (gone.length > 0) {
    await removeEndpoints(gone);
  }
}
