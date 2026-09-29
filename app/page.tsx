'use client';

import React, { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { copyWhenReady, fetchLink } from '@/lib/clipboard';
import { encodePassphrase, randomString } from '@/lib/client-utils';
import styles from '../styles/Home.module.css';

// The start page, behind the login: your channels with who is in them, a
// form for new channels, notifications, and ad-hoc meetings.

type Channel = { id: string; name: string; members: string[]; participants: string[] };

const REFRESH_MS = 15000;

function notify(message: string) {
  toast(message, { duration: 3000, position: 'top-center', className: 'lk-button' });
}

// POSTs from this page; the API refuses cross-site requests.
async function post(url: string, body?: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.status === 204 ? undefined : response.json();
}

function Channels() {
  const [channels, setChannels] = useState<Channel[]>();
  const [name, setName] = useState('');
  const missing = useSearchParams()?.get('missing') === 'channel';

  const load = React.useCallback(async () => {
    const response = await fetch('/api/channels');
    if (response.ok) {
      setChannels((await response.json()).channels);
    }
  }, []);

  React.useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const { id } = await post('/api/channels', { name });
      window.location.href = `/c/${id}`;
    } catch (e) {
      notify((e as Error).message);
    }
  };

  const invite = (channel: Channel) =>
    copyWhenReady(fetchLink(`/api/channels/${channel.id}/invite`))
      .then(() => notify(`Invite to ${channel.name} copied: works once, for 7 days`))
      .catch(() => notify('Could not copy the invite'));

  const leave = async (channel: Channel) => {
    if (!window.confirm(`Leave ${channel.name}? You need a new invite to come back.`)) {
      return;
    }
    await post(`/api/channels/${channel.id}/leave`).catch((e) => notify(e.message));
    load();
  };

  return (
    <div className={styles.tabContent}>
      <h3 style={{ margin: 0 }}>Channels</h3>
      {missing && (
        <p style={{ margin: 0 }}>That channel does not exist, or you are not a member of it.</p>
      )}
      {channels?.length === 0 && (
        <p style={{ margin: 0 }}>No channels yet. Create one, or ask someone for an invite.</p>
      )}
      {channels?.map((channel) => (
        <div key={channel.id} className={styles.channel}>
          <div className={styles.channelInfo}>
            <strong>{channel.name}</strong>
            <span className={styles.channelPresence}>
              {channel.participants.length > 0
                ? `In the call: ${channel.participants.join(', ')}`
                : 'Nobody here'}
            </span>
          </div>
          <a className="lk-button" href={`/c/${channel.id}`}>
            Join
          </a>
          <button className="lk-button" onClick={() => invite(channel)} title="Copy invite">
            Invite
          </button>
          <button className="lk-button" onClick={() => leave(channel)} title="Leave channel">
            Leave
          </button>
        </div>
      ))}
      <form className={styles.channelForm} onSubmit={create}>
        <input
          aria-label="Channel name"
          placeholder="New channel name"
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <button className="lk-button" type="submit">
          Create channel
        </button>
      </form>
    </div>
  );
}

function Meeting() {
  const [e2ee, setE2ee] = useState(false);
  const [sharedPassphrase, setSharedPassphrase] = useState(randomString(64));
  // A full navigation, not router.push: /new answers with a redirect to the
  // room's invite link.
  const startMeeting = () => {
    if (e2ee) {
      window.location.href = `/new#${encodePassphrase(sharedPassphrase)}`;
    } else {
      window.location.href = '/new';
    }
  };
  return (
    <div className={styles.tabContent}>
      <h3 style={{ margin: 0 }}>Meeting</h3>
      <p style={{ margin: 0 }}>Start a one-off meeting, then share its link to invite guests.</p>
      <button className="lk-button" onClick={startMeeting}>
        Start Meeting
      </button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem' }}>
          <input
            id="use-e2ee"
            type="checkbox"
            checked={e2ee}
            onChange={(ev) => setE2ee(ev.target.checked)}
          ></input>
          <label htmlFor="use-e2ee">Enable end-to-end encryption</label>
        </div>
        {e2ee && (
          <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem' }}>
            <label htmlFor="passphrase">Passphrase</label>
            <input
              id="passphrase"
              type="password"
              value={sharedPassphrase}
              onChange={(ev) => setSharedPassphrase(ev.target.value)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <main className={styles.main} data-lk-theme="default">
      <div className="header">
        <h1>Share</h1>
        <h2>Video calls and screen sharing.</h2>
      </div>
      <div className={styles.container}>
        <Suspense>
          <Channels />
        </Suspense>
      </div>
      <div className={styles.container}>
        <Meeting />
      </div>
    </main>
  );
}
