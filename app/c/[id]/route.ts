import { createMemberInvite } from '@/lib/invite';
import { loggedInUser } from '@/lib/server/auth';
import { getChannel } from '@/lib/server/store';
import { NextRequest, NextResponse } from 'next/server';

// A channel's permanent address, behind the login. Members are sent into the
// call with a short-lived member invite; everyone else gets the same answer
// whether the channel exists or not.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = loggedInUser(request.headers);
  if (!user) {
    return new NextResponse('Not logged in', { status: 401 });
  }
  const channel = await getChannel((await params).id);
  const location = channel?.members.includes(user)
    ? `/rooms/${channel.id}?invite=${createMemberInvite(channel.id, user)}`
    : '/?missing=channel';
  // Relative, so it does not depend on the Host the app sees.
  return new Response(null, { status: 303, headers: { Location: location } });
}
