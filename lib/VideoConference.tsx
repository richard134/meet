import type {
  MessageDecoder,
  MessageEncoder,
  TrackReferenceOrPlaceholder,
  WidgetState,
} from '@livekit/components-react';
import {
  CarouselLayout,
  Chat,
  ConnectionStateToast,
  ControlBar,
  FocusLayout,
  FocusLayoutContainer,
  GridLayout,
  isTrackReference,
  LayoutContextProvider,
  ParticipantTile,
  RoomAudioRenderer,
  useCreateLayoutContext,
  usePinnedTracks,
  useTracks,
  type MessageFormatter,
} from '@livekit/components-react';
import { RoomEvent, Track } from 'livekit-client';
import * as React from 'react';
import { CopyInviteLink } from './CopyInviteLink';

// The VideoConference prefab from @livekit/components-react 2.9.24, copied so
// the room can have controls the prefab has no slots for: an invite link
// next to the ControlBar, and a button that hides the participant strip
// beside a focused screen share. Kept close to the original to make upstream diffs easy to
// follow; changes are marked "fork:".

export interface VideoConferenceProps extends React.HTMLAttributes<HTMLDivElement> {
  chatMessageFormatter?: MessageFormatter;
  chatMessageEncoder?: MessageEncoder;
  chatMessageDecoder?: MessageDecoder;
  SettingsComponent?: React.ComponentType;
}

// fork: isEqualTrackRef and isWeb are from @livekit/components-core, which is
// not a direct dependency.
function trackReferenceId(ref: TrackReferenceOrPlaceholder) {
  return isTrackReference(ref)
    ? `${ref.participant.identity}_${ref.publication.source}_${ref.publication.trackSid}`
    : `${ref.participant.identity}_${ref.source}_placeholder`;
}

function isEqualTrackRef(a?: TrackReferenceOrPlaceholder, b?: TrackReferenceOrPlaceholder) {
  if (a === undefined || b === undefined) {
    return false;
  }
  if (isTrackReference(a) && isTrackReference(b)) {
    return a.publication.trackSid === b.publication.trackSid;
  }
  return trackReferenceId(a) === trackReferenceId(b);
}

const isWeb = () => typeof document !== 'undefined';

function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(false);
  React.useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);
  return matches;
}

export function VideoConference({
  chatMessageFormatter,
  chatMessageDecoder,
  chatMessageEncoder,
  SettingsComponent,
  ...props
}: VideoConferenceProps) {
  const [widgetState, setWidgetState] = React.useState<WidgetState>({
    showChat: false,
    unreadMessages: 0,
    showSettings: false,
  });
  // fork: participant strip beside a focused track, hidden on request.
  const [stripHidden, setStripHidden] = React.useState(false);
  // fork: the bar holds the ControlBar and our groups, so it decides when
  // labels fit (the ControlBar alone would keep them down to 760px, 1000px
  // with chat open). Measured while sharing: labelled ControlBar 873px, our
  // labelled groups 590px, icon-only groups about 200px, chat 450px.
  const chatOffset = widgetState.showChat ? 450 : 0;
  const controlBarLabels = useMediaQuery(`(min-width: ${1200 + chatOffset}px)`);
  const ourLabels = useMediaQuery(`(min-width: ${1600 + chatOffset}px)`);
  const lastAutoFocusedScreenShareTrack = React.useRef<TrackReferenceOrPlaceholder | null>(null);

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { updateOnlyOn: [RoomEvent.ActiveSpeakersChanged], onlySubscribed: false },
  );

  const layoutContext = useCreateLayoutContext();

  const screenShareTracks = tracks
    .filter(isTrackReference)
    .filter((track) => track.publication.source === Track.Source.ScreenShare);

  const focusTrack = usePinnedTracks(layoutContext)?.[0];
  const carouselTracks = tracks.filter((track) => !isEqualTrackRef(track, focusTrack));

  React.useEffect(() => {
    // If screen share tracks are published, and no pin is set explicitly, auto set the screen share.
    if (
      screenShareTracks.some((track) => track.publication.isSubscribed) &&
      lastAutoFocusedScreenShareTrack.current === null
    ) {
      layoutContext.pin.dispatch?.({ msg: 'set_pin', trackReference: screenShareTracks[0] });
      lastAutoFocusedScreenShareTrack.current = screenShareTracks[0];
    } else if (
      lastAutoFocusedScreenShareTrack.current &&
      !screenShareTracks.some(
        (track) =>
          track.publication.trackSid ===
          lastAutoFocusedScreenShareTrack.current?.publication?.trackSid,
      )
    ) {
      layoutContext.pin.dispatch?.({ msg: 'clear_pin' });
      lastAutoFocusedScreenShareTrack.current = null;
    }
    if (focusTrack && !isTrackReference(focusTrack)) {
      const updatedFocusTrack = tracks.find(
        (tr) =>
          tr.participant.identity === focusTrack.participant.identity &&
          tr.source === focusTrack.source,
      );
      if (updatedFocusTrack !== focusTrack && isTrackReference(updatedFocusTrack)) {
        layoutContext.pin.dispatch?.({ msg: 'set_pin', trackReference: updatedFocusTrack });
      }
    }
  }, [
    screenShareTracks
      .map((ref) => `${ref.publication.trackSid}_${ref.publication.isSubscribed}`)
      .join(),
    focusTrack?.publication?.trackSid,
    tracks,
  ]);

  return (
    <div className="lk-video-conference" {...props}>
      {isWeb() && (
        <LayoutContextProvider value={layoutContext} onWidgetChange={setWidgetState}>
          <div className="lk-video-conference-inner meet-conference-inner">
            {!focusTrack ? (
              <div className="lk-grid-layout-wrapper">
                <GridLayout tracks={tracks}>
                  <ParticipantTile />
                </GridLayout>
              </div>
            ) : (
              <div className={`lk-focus-layout-wrapper${stripHidden ? ' meet-strip-hidden' : ''}`}>
                <FocusLayoutContainer>
                  {!stripHidden && (
                    <CarouselLayout tracks={carouselTracks}>
                      <ParticipantTile />
                    </CarouselLayout>
                  )}
                  {focusTrack && <FocusLayout trackRef={focusTrack} />}
                </FocusLayoutContainer>
              </div>
            )}
            {/* fork: the ControlBar between our own control groups. */}
            <div className={ourLabels ? 'meet-bar' : 'meet-bar meet-bar-compact'}>
              <div className="meet-bar-side">
                <CopyInviteLink />
              </div>
              <ControlBar
                variation={controlBarLabels ? 'verbose' : 'minimal'}
                controls={{ chat: true, settings: !!SettingsComponent }}
              />
              <div className="meet-bar-side meet-bar-side-end">
                {focusTrack && (
                  <button
                    className="lk-button meet-strip-toggle"
                    onClick={() => setStripHidden(!stripHidden)}
                    aria-pressed={stripHidden}
                    title={stripHidden ? 'Show participants' : 'Hide participants'}
                  >
                    <StripIcon />
                    <span className="meet-bar-label">
                      {stripHidden ? 'Show participants' : 'Hide participants'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
          <Chat
            style={{ display: widgetState.showChat ? 'grid' : 'none' }}
            messageFormatter={chatMessageFormatter}
            messageEncoder={chatMessageEncoder}
            messageDecoder={chatMessageDecoder}
          />
          {SettingsComponent && (
            <div
              className="lk-settings-menu-modal"
              style={{ display: widgetState.showSettings ? 'block' : 'none' }}
            >
              <SettingsComponent />
            </div>
          )}
        </LayoutContextProvider>
      )}
      <RoomAudioRenderer />
      <ConnectionStateToast />
    </div>
  );
}

function StripIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect
        x="1.5"
        y="2.5"
        width="13"
        height="11"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M5.5 2.5v11" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
