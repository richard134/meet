import { authorize } from '@/lib/server/auth';
import { createChannelInvite } from '@/lib/server/store';
import { NextRequest, NextResponse } from 'next/server';

// A single-use link that makes a logged-in user a member. Members only.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = authorize(request);
  if ('error' in auth) {
    return auth.error;
  }
  const inviteId = await createChannelInvite(auth.user, (await params).id);
  if (!inviteId) {
    return new NextResponse('Not found', { status: 404 });
  }
  return NextResponse.json({ path: `/join/${inviteId}` });
}
