import {
  LocalParticipant,
  ScreenSharePresets,
  ScreenShareCaptureOptions,
  TrackPublishOptions,
  VideoCodec,
} from 'livekit-client';

// Screen shares tuned for sharp text. The SDK defaults work against that in
// three ways: it captures at 1080p (so larger screens are downscaled), it
// forces a 'motion' hint on VP9/AV1 screen shares (so the encoder drops
// resolution, not frames, when bandwidth is short), and it caps the bitrate
// at 2.5 Mbps. The ControlBar in the VideoConference prefab hardcodes its
// capture options and offers no way to pass publish options, so
// sharpenScreenShares wraps the participant method the ControlBar calls.

const MAX_BITRATE = 15_000_000;
const MAX_FRAMERATE = 30;

const captureOptions: ScreenShareCaptureOptions = {
  // 0x0 means uncapped: capture at the screen's native resolution.
  resolution: ScreenSharePresets.original.resolution,
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
        width: Math.round(screen.width * devicePixelRatio),
        height: Math.round(screen.height * devicePixelRatio),
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
