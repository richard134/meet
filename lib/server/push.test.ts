import { describe, expect, it } from 'vitest';
import { isPushSubscription } from './push';

const keys = { p256dh: 'p', auth: 'a' };

describe('isPushSubscription', () => {
  it('accepts the browsers push services', () => {
    for (const endpoint of [
      'https://fcm.googleapis.com/fcm/send/abc',
      'https://updates.push.services.mozilla.com/wpush/v2/abc',
      'https://web.push.apple.com/abc',
      'https://wns2-par02p.notify.windows.com/w/?token=abc',
    ]) {
      expect(isPushSubscription({ endpoint, keys })).toBe(true);
    }
  });

  it('refuses any other endpoint, so the server cannot be made to call it', () => {
    for (const endpoint of [
      'http://fcm.googleapis.com/fcm/send/abc',
      'https://livekit.livekit.svc.cluster.local/twirp',
      'https://169.254.169.254/latest',
      'https://fcm.googleapis.com.evil.example/abc',
      'https://evil.example/web.push.apple.com',
      'not a url',
    ]) {
      expect(isPushSubscription({ endpoint, keys })).toBe(false);
    }
  });

  it('refuses malformed subscriptions', () => {
    expect(isPushSubscription(undefined)).toBe(false);
    expect(isPushSubscription({ endpoint: 'https://web.push.apple.com/a' })).toBe(false);
  });
});
