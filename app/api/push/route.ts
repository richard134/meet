import { authorize, loggedInUser } from '@/lib/server/auth';
import { isPushSubscription, vapidPublicKey } from '@/lib/server/push';
import { removeSubscription, saveSubscription } from '@/lib/server/store';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  if (!loggedInUser(request.headers)) {
    return new NextResponse('Not logged in', { status: 401 });
  }
  return NextResponse.json({ publicKey: vapidPublicKey() });
}

// Saves this device's push subscription for the logged-in user.
export async function POST(request: NextRequest) {
  const auth = authorize(request);
  if ('error' in auth) {
    return auth.error;
  }
  const subscription = await request.json().catch(() => undefined);
  if (!isPushSubscription(subscription)) {
    return new NextResponse('Not a push subscription', { status: 400 });
  }
  await saveSubscription(auth.user, {
    endpoint: subscription.endpoint,
    keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
  });
  return new NextResponse(null, { status: 204 });
}

export async function DELETE(request: NextRequest) {
  const auth = authorize(request);
  if ('error' in auth) {
    return auth.error;
  }
  const { endpoint } = await request.json().catch(() => ({}));
  if (typeof endpoint === 'string') {
    await removeSubscription(auth.user, endpoint);
  }
  return new NextResponse(null, { status: 204 });
}
