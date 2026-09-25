import { generateRoomId } from '@/lib/client-utils';
import { createInvite } from '@/lib/invite';

// Creates a room and redirects to its invite link. The ingress puts this route
// behind a login; everything else is public, so the link is all a guest needs.
// The redirect is relative so it does not depend on the Host the app sees, and
// browsers carry an e2ee passphrase in the URL fragment across it.
export function GET() {
  const roomName = generateRoomId();
  return new Response(null, {
    status: 303,
    headers: { Location: `/rooms/${roomName}?invite=${createInvite(roomName)}` },
  });
}
