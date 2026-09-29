import {
  ParticipantTile,
  useDataChannel,
  useLocalParticipant,
  useRoomContext,
  useTrackRefContext,
} from '@livekit/components-react';
import { Participant, RoomEvent, Track } from 'livekit-client';
import * as React from 'react';
import toast from 'react-hot-toast';

// Raised hands are data messages on the `hand` topic. The server stamps each
// message with its sender, so nobody can raise or lower someone else's hand,
// and tokens need no canUpdateOwnMetadata (which would also let participants
// rename themselves). Whoever has a hand up sends it to each newcomer, so
// people who join later see it too.
const TOPIC = 'hand';
type Message = { raised: boolean; sync?: boolean };

const encoder = new TextEncoder();
const decoder = new TextDecoder();

type Hands = { raised: Set<string>; mine: boolean; toggle: () => void };
const HandsContext = React.createContext<Hands>({
  raised: new Set(),
  mine: false,
  toggle: () => {},
});

function withHand(set: Set<string>, identity: string, raised: boolean) {
  const next = new Set(set);
  if (raised) {
    next.add(identity);
  } else {
    next.delete(identity);
  }
  return next;
}

export function HandsProvider({ children }: React.PropsWithChildren) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [raised, setRaised] = React.useState<Set<string>>(new Set());
  const mine = raised.has(localParticipant.identity);

  const { send } = useDataChannel(TOPIC, (msg) => {
    if (!msg.from) {
      return;
    }
    let message: Message;
    try {
      message = JSON.parse(decoder.decode(msg.payload));
    } catch {
      return;
    }
    const up = message.raised === true;
    const sync = message.sync === true;
    setRaised((prev) => withHand(prev, msg.from!.identity, up));
    if (up && !sync) {
      toast(`${msg.from.name || msg.from.identity} raised their hand`, {
        icon: '✋',
        duration: 4000,
        position: 'top-center',
        className: 'lk-button',
      });
    }
  });

  const publish = React.useCallback(
    (message: Message, destinationIdentities?: string[]) =>
      send(encoder.encode(JSON.stringify(message)), {
        reliable: true,
        destinationIdentities,
      }).catch((e) => console.error('could not send raised hand', e)),
    [send],
  );

  const toggle = () => {
    publish({ raised: !mine });
    setRaised((prev) => withHand(prev, localParticipant.identity, !mine));
  };

  React.useEffect(() => {
    const onJoin = (p: Participant) => {
      if (mine) {
        publish({ raised: true, sync: true }, [p.identity]);
      }
    };
    const onLeave = (p: Participant) => setRaised((prev) => withHand(prev, p.identity, false));
    room.on(RoomEvent.ParticipantConnected, onJoin);
    room.on(RoomEvent.ParticipantDisconnected, onLeave);
    return () => {
      room.off(RoomEvent.ParticipantConnected, onJoin);
      room.off(RoomEvent.ParticipantDisconnected, onLeave);
    };
  }, [room, mine, publish]);

  return <HandsContext.Provider value={{ raised, mine, toggle }}>{children}</HandsContext.Provider>;
}

export function RaiseHandButton() {
  const { mine, toggle } = React.useContext(HandsContext);
  return (
    <button
      className="lk-button"
      onClick={toggle}
      aria-pressed={mine}
      title={mine ? 'Lower hand' : 'Raise hand'}
    >
      <span aria-hidden="true">✋</span>
      <span className="meet-bar-label">{mine ? 'Lower hand' : 'Raise hand'}</span>
    </button>
  );
}

// ParticipantTile with a hand badge on camera tiles. Used as the template in
// the grid and carousel layouts, which provide the track reference context.
export function Tile() {
  const trackRef = useTrackRefContext();
  const { raised } = React.useContext(HandsContext);
  return (
    <div className="meet-tile">
      <ParticipantTile />
      {raised.has(trackRef.participant.identity) && trackRef.source === Track.Source.Camera && (
        <div className="meet-hand-badge" title="Hand raised">
          ✋
        </div>
      )}
    </div>
  );
}
