import { loggedInUser } from '@/lib/server/auth';
import { getChannelInvite } from '@/lib/server/store';
import { headers } from 'next/headers';
import styles from '../../../styles/Home.module.css';
import { AcceptInvite } from './AcceptInvite';

// Where a membership invite lands, behind the login. Opening the link changes
// nothing: joining takes the button, which POSTs from this page, so a link
// alone can never add anyone to a channel.
export default async function Page({ params }: { params: Promise<{ invite: string }> }) {
  const { invite } = await params;
  const user = loggedInUser(await headers());
  const found = await getChannelInvite(invite);

  let content: React.ReactNode;
  if (!user || !found) {
    content = <p style={{ margin: 0 }}>This invite is invalid, already used or expired.</p>;
  } else if (found.channel.members.includes(user)) {
    content = (
      <>
        <p style={{ margin: 0 }}>You are already a member of {found.channel.name}.</p>
        <a className="lk-button" href={`/c/${found.channel.id}`}>
          Open {found.channel.name}
        </a>
      </>
    );
  } else {
    content = (
      <>
        <p style={{ margin: 0 }}>
          {found.createdBy} invited you to <strong>{found.channel.name}</strong>.
        </p>
        <AcceptInvite invite={invite} />
      </>
    );
  }

  return (
    <main className={styles.main} data-lk-theme="default">
      <div className="header">
        <h1>Share</h1>
      </div>
      <div className={styles.container}>
        <div className={styles.tabContent}>{content}</div>
      </div>
    </main>
  );
}
