import * as React from 'react';
import toast from 'react-hot-toast';

// The room URL is the invite: it carries the signed invite and, for encrypted
// meetings, the passphrase in the fragment, which is easy to lose when
// copying from the address bar.
export function CopyInviteLink() {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast('Invite link copied', {
        duration: 2000,
        position: 'top-center',
        className: 'lk-button',
      });
    } catch (e) {
      console.error(e);
      toast('Could not copy the link, copy it from the address bar instead', {
        position: 'top-center',
        className: 'lk-button',
      });
    }
  };

  return (
    <button className="lk-button copy-invite-link" onClick={copy} title="Copy invite link">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M6.5 9.5 9.5 6.5M7 4.5l1.25-1.25a2.83 2.83 0 0 1 4 4L11 8.5M9 11.5l-1.25 1.25a2.83 2.83 0 0 1-4-4L5 7.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <span className="copy-invite-link-label">Copy invite link</span>
    </button>
  );
}
