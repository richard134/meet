import { RoomServiceClient, TwirpError } from 'livekit-server-sdk';

// Who is in a room right now, asked of livekit-server over the cluster network
// (LIVEKIT_API_URL, the livekit Service), not through the public ingress.
let client: RoomServiceClient | undefined;

function rooms() {
  const url = process.env.LIVEKIT_API_URL;
  if (!url) {
    throw new Error('LIVEKIT_API_URL is not defined');
  }
  client ??= new RoomServiceClient(
    url,
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
  );
  return client;
}

export async function participantNames(room: string): Promise<string[]> {
  try {
    return (await rooms().listParticipants(room)).map((p) => p.name || p.identity);
  } catch (e) {
    // A room only exists while someone is in it.
    if (e instanceof TwirpError && e.code === 'not_found') {
      return [];
    }
    throw e;
  }
}
