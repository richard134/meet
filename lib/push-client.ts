'use client';

import React from 'react';

// Browser side of Web Push. Safari only lets pushManager.subscribe() run
// straight from a click, so the service worker registration and the server's
// public key are fetched ahead of time, and enable() calls subscribe() before
// awaiting anything.

export type PushState = 'loading' | 'unsupported' | 'needs-home-screen' | NotificationPermission;
type Ready = { registration: ServiceWorkerRegistration; key: Uint8Array<ArrayBuffer> };

function currentState(): PushState {
  const supported =
    'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (supported) {
    return Notification.permission;
  }
  // iPhone and iPad only offer Web Push to sites added to the Home Screen.
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return ios ? 'needs-home-screen' : 'unsupported';
}

function base64UrlToBytes(value: string) {
  const base64 = (value + '='.repeat((4 - (value.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

async function prepare(): Promise<Ready> {
  const registration = await navigator.serviceWorker.register('/sw.js');
  const response = await fetch('/api/push');
  if (!response.ok) {
    throw new Error(`push key: ${response.status}`);
  }
  const { publicKey } = await response.json();
  return { registration, key: base64UrlToBytes(publicKey) };
}

async function save(subscription: PushSubscription) {
  const response = await fetch('/api/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
}

export function usePush() {
  const [state, setState] = React.useState<PushState>('loading');
  const [ready, setReady] = React.useState<Ready>();
  // Permission alone is not enough: this device also needs a subscription
  // that the server knows about.
  const [subscribed, setSubscribed] = React.useState(false);

  React.useEffect(() => {
    const initial = currentState();
    setState(initial);
    if (initial === 'unsupported' || initial === 'needs-home-screen') {
      return;
    }
    prepare()
      .then(async (r) => {
        setReady(r);
        // Subscribed before: make sure the server still has it.
        const existing = await r.registration.pushManager.getSubscription();
        if (existing) {
          await save(existing);
          setSubscribed(true);
        }
      })
      .catch((e) => console.error('could not set up notifications', e));
  }, []);

  // Call straight from a click handler.
  const enable = React.useCallback(async () => {
    if (!ready) {
      return;
    }
    try {
      const subscription = await ready.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: ready.key,
      });
      await save(subscription);
      setSubscribed(true);
    } catch (e) {
      console.error('could not enable notifications', e);
    }
    setState(Notification.permission);
  }, [ready]);

  return { state, subscribed, canEnable: !!ready && !subscribed && state !== 'denied', enable };
}
