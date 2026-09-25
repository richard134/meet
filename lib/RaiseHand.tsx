import {
  ParticipantTile,
  useLocalParticipant,
  useParticipantAttribute,
  useRoomContext,
  useTrackRefContext,
} from '@livekit/components-react';
import { Participant, RoomEvent, Track } from 'livekit-client';
import * as React from 'react';
import toast from 'react-hot-toast';

// A raised hand is the participant attribute `hand` (the time it was raised);
// an empty value removes it. Attributes, unlike data messages, are part of the
// room state, so people who join later still see who has a hand up. Setting
// them needs the canUpdateOwnMetadata grant (connection-details route).
const HAND = 'hand';

export function RaiseHandButton() {
  const { localParticipant } = useLocalParticipant();
  const raised = !!useParticipantAttribute(HAND, { participant: localParticipant });
  const toggle = () =>
    localParticipant
      .setAttributes({ [HAND]: raised ? '' : String(Date.now()) })
      .catch((e) => console.error('could not change raised hand', e));

  return (
    <button
      className="lk-button"
      onClick={toggle}
      aria-pressed={raised}
      title={raised ? 'Lower hand' : 'Raise hand'}
    >
      <span aria-hidden="true">✋</span>
      <span className="meet-bar-label">{raised ? 'Lower hand' : 'Raise hand'}</span>
    </button>
  );
}

// ParticipantTile with a hand badge on camera tiles. Used as the template in
// the grid and carousel layouts, which provide the track reference context.
export function Tile() {
  const trackRef = useTrackRefContext();
  const raised = !!useParticipantAttribute(HAND, { participant: trackRef.participant });
  return (
    <div className="meet-tile">
      <ParticipantTile />
      {raised && trackRef.source === Track.Source.Camera && (
        <div className="meet-hand-badge" title="Hand raised">
          ✋
        </div>
      )}
    </div>
  );
}

// A toast when someone else raises their hand, so it is noticed even when
// their tile is off screen or the participant strip is hidden.
export function useRaisedHandToasts() {
  const room = useRoomContext();
  React.useEffect(() => {
    const onChange = (changed: Record<string, string>, participant: Participant) => {
      if (changed[HAND] && !participant.isLocal) {
        toast(`${participant.name || participant.identity} raised their hand`, {
          icon: '✋',
          duration: 4000,
          position: 'top-center',
          className: 'lk-button',
        });
      }
    };
    room.on(RoomEvent.ParticipantAttributesChanged, onChange);
    return () => {
      room.off(RoomEvent.ParticipantAttributesChanged, onChange);
    };
  }, [room]);
}
