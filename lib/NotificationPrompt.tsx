import * as React from 'react';
import { usePush } from './push-client';

// Shown once per device when a member enters a channel and this browser has
// not been asked about notifications yet. "Not now" is remembered.
const DISMISSED = 'meet-notification-prompt-dismissed';

function dismissed() {
  try {
    return localStorage.getItem(DISMISSED) === '1';
  } catch {
    return false;
  }
}

export function NotificationPrompt({ channelName }: { channelName: string }) {
  const { state, canEnable, enable } = usePush();
  const [hidden, setHidden] = React.useState(dismissed);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED, '1');
    } catch {}
    setHidden(true);
  };

  if (hidden) {
    return null;
  }
  if (state === 'needs-home-screen') {
    return (
      <div className="meet-prompt" role="dialog" aria-label="Notifications">
        <p>
          To get notified when someone starts hanging out in {channelName}, add this site to your
          Home Screen: tap Share, then Add to Home Screen, and open it from there.
        </p>
        <div className="meet-prompt-actions">
          <button className="lk-button" onClick={dismiss}>
            OK
          </button>
        </div>
      </div>
    );
  }
  if (!canEnable) {
    return null;
  }
  return (
    <div className="meet-prompt" role="dialog" aria-label="Notifications">
      <p>Get a notification when someone starts hanging out in {channelName}?</p>
      <div className="meet-prompt-actions">
        <button className="lk-button" onClick={dismiss}>
          Not now
        </button>
        <button
          className="lk-button meet-prompt-primary"
          onClick={() => enable().then(() => setHidden(true))}
        >
          Enable
        </button>
      </div>
    </div>
  );
}
