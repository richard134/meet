import { authorize } from '@/lib/server/auth';
import { acceptChannelInvite } from '@/lib/server/store';
import { NextRequest, NextResponse } from 'next/server';

// Accepts a membership invite (POST, from the button on /join/<invite>).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ invite: string }> },
) {
  const auth = authorize(request);
  if ('error' in auth) {
    return auth.error;
  }
  const channelId = await acceptChannelInvite(auth.user, (await params).invite);
  if (!channelId) {
    return new NextResponse('This invite is invalid, used or expired', { status: 404 });
  }
  return NextResponse.json({ channelId });
}
