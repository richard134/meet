import * as React from 'react';
import toast from 'react-hot-toast';
import { copyWhenReady, fetchLink } from './clipboard';

function notify(message: string) {
  toast(message, { duration: 3000, position: 'top-center', className: 'lk-button' });
}

function copy(link: Promise<string>, done: string) {
  copyWhenReady(link)
    .then(() => notify(done))
    .catch((e) => {
      console.error(e);
      notify('Could not copy the link');
    });
}

function LinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M6.5 9.5 9.5 6.5M7 4.5l1.25-1.25a2.83 2.83 0 0 1 4 4L11 8.5M9 11.5l-1.25 1.25a2.83 2.83 0 0 1-4-4L5 7.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Outside channels the room URL is the invite: it carries the signed invite
// and, for encrypted meetings, the passphrase in the fragment, which is easy
// to lose when copying from the address bar. In a channel the address is
// /c/<id>, which only works for members, so guest links are minted instead.
export function CopyInviteLink({ channelId }: { channelId?: string }) {
  const onClick = () =>
    channelId
      ? copy(
          fetchLink(`/api/channels/${channelId}/guest-link`),
          'Guest link copied, valid for 24 hours',
        )
      : copy(Promise.resolve(window.location.href), 'Invite link copied');
  const label = channelId ? 'Guest link' : 'Copy invite link';
  return (
    <button className="lk-button" onClick={onClick} title={label}>
      <LinkIcon />
      <span className="meet-bar-label">{label}</span>
    </button>
  );
}

// A single-use link that makes a logged-in user a member of the channel.
export function InviteToChannel({ channelId }: { channelId: string }) {
  const onClick = () =>
    copy(
      fetchLink(`/api/channels/${channelId}/invite`),
      'Channel invite copied: works once, for 7 days',
    );
  return (
    <button className="lk-button" onClick={onClick} title="Invite to channel">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M1.5 13.5c.5-2.5 2.3-4 4.5-4s4 1.5 4.5 4M12.5 5v5M10 7.5h5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <span className="meet-bar-label">Invite to channel</span>
    </button>
  );
}
