import {
  LocalParticipant,
  ScreenShareCaptureOptions,
  TrackPublishOptions,
  VideoCodec,
} from 'livekit-client';

// Screen shares tuned for sharp text. The SDK defaults work against that in
// three ways: it captures at 1080p (so most screens are downscaled), it
// forces a 'motion' hint on VP9/AV1 screen shares (so the encoder drops
// resolution, not frames, when bandwidth is short), and it caps the bitrate
// at 2.5 Mbps. The ControlBar in the VideoConference prefab hardcodes its
// capture options and offers no way to pass publish options, so
// sharpenScreenShares wraps the participant method the ControlBar calls.

// Every full-screen change (switching windows, resizing a terminal) has to be
// sent within one frame's share of the bitrate, so the first frame after it
// comes out rough and the next ones sharpen it. Fewer pixels and fewer frames
// both mean more bits per frame. 1440p keeps text sharp for viewers, whose
// tile is rarely larger, while a Retina or ultrawide screen captured natively
// is 8-19 million pixels. 20 fps is still smooth for scrolling code.
const MAX_BITRATE = 15_000_000;
const MAX_FRAMERATE = 20;
const MAX_WIDTH = 2560;
const MAX_HEIGHT = 1440;

const captureOptions: ScreenShareCaptureOptions = {
  // A bound, not a target: the browser scales larger screens down to fit,
  // keeping the aspect ratio, and leaves smaller ones alone (a 3360x1418
  // screen comes out 2558x1080 in Chrome).
  resolution: { width: MAX_WIDTH, height: MAX_HEIGHT, frameRate: MAX_FRAMERATE },
  // Keep resolution and drop frames when the encoder is short on bits.
  contentHint: 'detail',
};

// H.264 only where the browser encodes it in hardware, VP8 otherwise. LiveKit
// strips H.264 High profile from publisher offers, so what gets negotiated is
// Constrained Baseline, and that is the profile asked about here. Safari
// encodes it in hardware; Chrome on macOS encodes it in software (OpenH264),
// which looks worse than VP8 at the same bitrate. VP9 and AV1 are out: see
// the 'motion' hint above.
async function screenShareCodec(): Promise<VideoCodec> {
  try {
    const info = await navigator.mediaCapabilities.encodingInfo({
      type: 'webrtc',
      video: {
        contentType: 'video/H264;packetization-mode=1;profile-level-id=42e01f',
        width: MAX_WIDTH,
        height: MAX_HEIGHT,
        bitrate: MAX_BITRATE,
        framerate: MAX_FRAMERATE,
      },
    });
    return info.supported && info.powerEfficient ? 'h264' : 'vp8';
  } catch {
    // Browsers without WebRTC support in MediaCapabilities.
    return 'vp8';
  }
}

export function sharpenScreenShares(participant: LocalParticipant) {
  // Resolved once, up front: Safari and Firefox only allow getDisplayMedia
  // straight from the click, so the wrapper below must not await anything
  // before handing over to the SDK. Until the check finishes, VP8.
  let videoCodec: VideoCodec = 'vp8';
  screenShareCodec().then((codec) => (videoCodec = codec));

  const setScreenShareEnabled = participant.setScreenShareEnabled.bind(participant);
  participant.setScreenShareEnabled = (enabled, capture, publish) => {
    if (!enabled) {
      return setScreenShareEnabled(enabled, capture, publish);
    }
    const publishOptions: TrackPublishOptions = {
      ...publish,
      videoCodec,
      screenShareEncoding: { maxBitrate: MAX_BITRATE, maxFramerate: MAX_FRAMERATE },
    };
    return setScreenShareEnabled(enabled, { ...capture, ...captureOptions }, publishOptions);
  };
}
