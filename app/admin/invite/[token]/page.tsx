import Link from 'next/link';
import { isApiError } from '@/lib/api/errors';
import { apiServer } from '@/lib/api/server';
import type { InvitationInfo } from '@/lib/api/types';
import AuthCard from '../../AuthCard';
import AcceptForm from './AcceptForm';
import styles from '../../admin.module.css';

export const metadata = { title: 'Accept invitation' };
export const dynamic = 'force-dynamic';

const GONE: Record<Exclude<InvitationInfo['status'], 'pending'>, string> = {
  accepted: 'This invitation has already been used. Sign in with the account you created.',
  expired: 'This invitation has expired. Ask the admin who invited you for a new one.',
  revoked: 'This invitation was withdrawn or replaced. Ask an admin for a new one.',
};

/**
 * The invitee's side of an invitation link: pick a username and password.
 * The token in the URL is the credential; the backend checks it again on
 * submit, and the link works once.
 */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let info: InvitationInfo | null = null;
  try {
    info = await apiServer<InvitationInfo>(`/public/invitations/${encodeURIComponent(token)}`, {
      withCookies: false,
    });
  } catch (err) {
    if (!isApiError(err, 404)) throw err;
  }

  if (!info || info.status !== 'pending') {
    return (
      <AuthCard title="Invitation not valid">
        <p className={`${styles.signinMsg} ${styles.msgErr}`} role="alert">
          {info && info.status !== 'pending' ? GONE[info.status] : 'We couldn’t find this invitation.'}
        </p>
        <p className={styles.signinFoot}>
          <Link href="/admin/signin">Go to sign-in</Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Join the Rem Assist admin">
      <p className={styles.signinLede}>
        You&apos;ve been invited as {info.role === 'admin' ? 'an admin' : 'a manager'} (
        {info.email}). Choose how you&apos;ll sign in.
      </p>
      <AcceptForm token={token} name={info.name} />
    </AuthCard>
  );
}
