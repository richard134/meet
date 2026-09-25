import { createHmac, timingSafeEqual } from 'node:crypto';

// An invite is `<expiresAt>.<signature>`, where the signature binds the room
// name and expiry to the API secret. Only /new mints invites, and the ingress
// keeps /new behind a login, so guests can join a room they were invited to
// but cannot create rooms of their own.
const INVITE_TTL_SECONDS = 24 * 60 * 60;

function sign(roomName: string, expiresAt: number): string {
  const secret = process.env.LIVEKIT_API_SECRET;
  if (!secret) {
    throw new Error('LIVEKIT_API_SECRET is not defined');
  }
  return createHmac('sha256', secret).update(`${roomName}:${expiresAt}`).digest('base64url');
}

export function createInvite(roomName: string, now = Date.now()): string {
  const expiresAt = Math.floor(now / 1000) + INVITE_TTL_SECONDS;
  return `${expiresAt}.${sign(roomName, expiresAt)}`;
}

export function isValidInvite(roomName: string, invite: string, now = Date.now()): boolean {
  const [expiresAtRaw, signature] = invite.split('.');
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isInteger(expiresAt) || expiresAt * 1000 < now || !signature) {
    return false;
  }
  const expected = Buffer.from(sign(roomName, expiresAt));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
