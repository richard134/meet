import { authorize } from '@/lib/server/auth';
import { leaveChannel } from '@/lib/server/store';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = authorize(request);
  if ('error' in auth) {
    return auth.error;
  }
  await leaveChannel(auth.user, (await params).id);
  return new NextResponse(null, { status: 204 });
}
