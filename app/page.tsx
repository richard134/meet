'use client';

import React, { useState } from 'react';
import { encodePassphrase, randomString } from '@/lib/client-utils';
import styles from '../styles/Home.module.css';

export default function Page() {
  const [e2ee, setE2ee] = useState(false);
  const [sharedPassphrase, setSharedPassphrase] = useState(randomString(64));
  // A full navigation, not router.push: /new is behind a login and answers
  // with a redirect to the room's invite link.
  const startMeeting = () => {
    if (e2ee) {
      window.location.href = `/new#${encodePassphrase(sharedPassphrase)}`;
    } else {
      window.location.href = '/new';
    }
  };
  return (
    <main className={styles.main} data-lk-theme="default">
      <div className="header">
        <h1>Share</h1>
        <h2>Video calls and screen sharing.</h2>
      </div>
      <div className={styles.container}>
        <div className={styles.tabContent}>
          <p style={{ margin: 0 }}>Start a meeting, then share its link to invite guests.</p>
          <button style={{ marginTop: '1rem' }} className="lk-button" onClick={startMeeting}>
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
      </div>
    </main>
  );
}
