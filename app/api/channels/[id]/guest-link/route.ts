import { createInvite } from '@/lib/invite';
import { authorize } from '@/lib/server/auth';
import { getChannel } from '@/lib/server/store';
import { NextRequest, NextResponse } from 'next/server';

// A 24-hour link into the channel's call for someone without a login. They
// join as a guest and never become a member. Members only.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = authorize(request);
  if ('error' in auth) {
    return auth.error;
  }
  const channel = await getChannel((await params).id);
  if (!channel?.members.includes(auth.user)) {
    return new NextResponse('Not found', { status: 404 });
  }
  return NextResponse.json({ path: `/rooms/${channel.id}?invite=${createInvite(channel.id)}` });
}
