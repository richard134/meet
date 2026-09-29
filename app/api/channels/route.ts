import { authorize, loggedInUser } from '@/lib/server/auth';
import { participantNames } from '@/lib/server/rooms';
import { channelsOf, createChannel } from '@/lib/server/store';
import { NextRequest, NextResponse } from 'next/server';

// The logged-in user's channels, with who is in each right now.
export async function GET(request: NextRequest) {
  const user = loggedInUser(request.headers);
  if (!user) {
    return new NextResponse('Not logged in', { status: 401 });
  }
  const channels = await Promise.all(
    (await channelsOf(user)).map(async (c) => ({
      id: c.id,
      name: c.name,
      members: c.members,
      participants: await participantNames(c.id),
    })),
  );
  return NextResponse.json({ user, channels });
}

export async function POST(request: NextRequest) {
  const auth = authorize(request);
  if ('error' in auth) {
    return auth.error;
  }
  const { name } = await request.json().catch(() => ({}));
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (trimmed.length < 1 || trimmed.length > 40 || /[\u0000-\u001f\u007f]/.test(trimmed)) {
    return new NextResponse('A channel name is 1 to 40 characters', { status: 400 });
  }
  const channel = await createChannel(auth.user, trimmed);
  return NextResponse.json({ id: channel.id });
}
