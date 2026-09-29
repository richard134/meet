'use client';

import React from 'react';

export function AcceptInvite({ invite }: { invite: string }) {
  const [error, setError] = React.useState<string>();
  const accept = async () => {
    const response = await fetch(`/api/invites/${encodeURIComponent(invite)}`, { method: 'POST' });
    if (!response.ok) {
      setError(await response.text());
      return;
    }
    const { channelId } = await response.json();
    window.location.href = `/c/${channelId}`;
  };
  return (
    <>
      <button className="lk-button" onClick={accept}>
        Join channel
      </button>
      {error && <p style={{ margin: 0 }}>{error}</p>}
    </>
  );
}
