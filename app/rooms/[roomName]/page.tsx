import * as React from 'react';
import { PageClientImpl } from './PageClientImpl';
import { isVideoCodec } from '@/lib/types';
import { verifyInvite } from '@/lib/invite';
import { getChannel } from '@/lib/server/store';

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ roomName: string }>;
  searchParams: Promise<{
    // FIXME: We should not allow values for regions if in playground mode.
    region?: string;
    hq?: string;
    codec?: string;
    singlePC?: string;
    invite?: string;
  }>;
}) {
  const _params = await params;
  const _searchParams = await searchParams;
  const codec =
    typeof _searchParams.codec === 'string' && isVideoCodec(_searchParams.codec)
      ? _searchParams.codec
      : 'vp9';
  const hq = _searchParams.hq === 'true' ? true : false;
  const singlePC = _searchParams.singlePC !== 'false';

  // A member invite into one of the member's channels: the room gets the
  // channel's controls and the member joins under their login name.
  const user = _searchParams.invite
    ? verifyInvite(_params.roomName, _searchParams.invite)?.user
    : undefined;
  const channel = user ? await getChannel(_params.roomName) : undefined;
  const member = user && channel?.members.includes(user) ? { user, channel } : undefined;

  return (
    <PageClientImpl
      roomName={_params.roomName}
      invite={_searchParams.invite}
      region={_searchParams.region}
      hq={hq}
      codec={codec}
      singlePeerConnection={singlePC}
      channel={member && { id: member.channel.id, name: member.channel.name }}
      memberName={member?.user}
    />
  );
}
