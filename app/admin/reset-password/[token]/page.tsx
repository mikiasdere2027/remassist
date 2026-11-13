import Link from 'next/link';
import { isApiError } from '@/lib/api/errors';
import { apiServer } from '@/lib/api/server';
import type { ResetInfo } from '@/lib/api/types';
import AuthCard from '../../AuthCard';
import ResetForm from './ResetForm';
import styles from '../../admin.module.css';

export const metadata = { title: 'Choose a new password' };
export const dynamic = 'force-dynamic';

const GONE: Record<Exclude<ResetInfo['status'], 'pending'>, string> = {
  used: 'This reset link has already been used.',
  expired: 'This reset link has expired.',
  revoked: 'This reset link was replaced by a newer one, or the account was disabled.',
};

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  let info: ResetInfo | null = null;
  try {
    info = await apiServer<ResetInfo>(
      `/public/password-resets/${encodeURIComponent(token)}`,
      { withCookies: false },
    );
  } catch (err) {
    if (!isApiError(err, 404)) throw err;
  }

  if (!info || info.status !== 'pending') {
    return (
      <AuthCard title="Link not valid">
        <p className={`${styles.signinMsg} ${styles.msgErr}`} role="alert">
          {info && info.status !== 'pending' ? GONE[info.status] : 'We couldn’t find this reset link.'} Ask for a new one
          below, or ask an admin to create one for you.
        </p>
        <p className={styles.signinFoot}>
          <Link href="/admin/forgot-password">Get a new link</Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password">
      <ResetForm token={token} username={info.username} />
    </AuthCard>
  );
}
