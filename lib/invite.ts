import { createHmac, timingSafeEqual } from 'node:crypto';

// Room invites carry a signature that binds the room name and expiry to the
// API secret, so only the server can mint them. The token endpoint issues a
// join token only for a valid, unexpired invite.
//
// - Guest invites, `<expiresAt>.<signature>`, come from /new and a channel's
//   guest link: anyone holding one may join that room for 24 hours.
// - Member invites, `<expiresAt>.<user>.<signature>`, come from /c/<id>, which
//   is behind the login. They also bind the logged-in user, so the public
//   token endpoint knows which member is joining. They last ten minutes: the
//   room page swaps its address for /c/<id> right away, so the link a member
//   might copy from the address bar is useless to anyone else.
//
// Room names never contain ':' (ad-hoc rooms and channel ids are [a-z0-9-]),
// and user names never do either, so the signed strings cannot collide.
const GUEST_TTL_SECONDS = 24 * 60 * 60;
const MEMBER_TTL_SECONDS = 10 * 60;

function sign(message: string): string {
  const secret = process.env.LIVEKIT_API_SECRET;
  if (!secret) {
    throw new Error('LIVEKIT_API_SECRET is not defined');
  }
  return createHmac('sha256', secret).update(message).digest('base64url');
}

function matches(signature: string, message: string) {
  const expected = Buffer.from(sign(message));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function createInvite(roomName: string, now = Date.now()): string {
  const expiresAt = Math.floor(now / 1000) + GUEST_TTL_SECONDS;
  return `${expiresAt}.${sign(`${roomName}:${expiresAt}`)}`;
}

export function createMemberInvite(roomName: string, user: string, now = Date.now()): string {
  const expiresAt = Math.floor(now / 1000) + MEMBER_TTL_SECONDS;
  return `${expiresAt}.${user}.${sign(`${roomName}:${expiresAt}:${user}`)}`;
}

// The invite's member, `{}` for a guest invite, or undefined if it is not
// valid for this room right now.
export function verifyInvite(
  roomName: string,
  invite: string,
  now = Date.now(),
): { user?: string } | undefined {
  const parts = invite.split('.');
  const expiresAt = Number(parts[0]);
  if (!Number.isInteger(expiresAt) || expiresAt * 1000 < now) {
    return undefined;
  }
  if (parts.length === 2 && parts[1] && matches(parts[1], `${roomName}:${expiresAt}`)) {
    return {};
  }
  if (
    parts.length === 3 &&
    parts[1] &&
    parts[2] &&
    matches(parts[2], `${roomName}:${expiresAt}:${parts[1]}`)
  ) {
    return { user: parts[1] };
  }
  return undefined;
}
