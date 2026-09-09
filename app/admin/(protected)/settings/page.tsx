import { requireUser } from '@/lib/auth/require';
import { MIN_PASSWORD_LENGTH } from '@/lib/auth/password';
import { formatDate } from '@/lib/leads/display';
import { verifyDeadline } from '@/lib/auth/verify';
import { changePassword } from './actions';
import { settingsMessage } from './messages';
import AdminTopbar from '../AdminTopbar';
import styles from '../../admin.module.css';

/**
 * Your own account — MIGRATION-PLAN §10.
 *
 * Reachable by both roles: everything here acts on the signed-in user and
 * nobody else, so there is nothing for a manager to be kept out of. The
 * admin-only screen is one level down at settings/team.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Settings',
  robots: { index: false, follow: false },
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const [user, sp] = await Promise.all([requireUser(), searchParams]);
  const message = settingsMessage(sp.ok, sp.error);

  return (
    <>
      <AdminTopbar title="Settings" subtitle="Your account" />

      <div className={styles.view}>
        {message && (
          <p
            className={`${styles.signinMsg} ${message.tone === 'ok' ? styles.msgOk : styles.msgErr}`}
            role="status"
          >
            {message.text}
          </p>
        )}

        <section className={`${styles.panel} ${styles.section}`}>
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>Your account</h2>
            <span className={styles.panelNote}>
              Only an administrator can change a role or invite anyone
            </span>
          </div>
          <dl className={styles.dl}>
            <dt>Email</dt>
            <dd className={styles.mono}>{user.email}</dd>

            <dt>Name</dt>
            <dd>{user.name ?? <span className={styles.none}>Not set</span>}</dd>

            <dt>Role</dt>
            <dd>
              <span className={`${styles.pill} ${styles.rolePill}`}>{user.role}</span>
            </dd>

            <dt>Email verified</dt>
            <dd>
              {user.emailVerified
                ? <span className={styles.mono}>{formatDate(user.emailVerified)}</span>
                /* The date, not just the fact: this screen is where somebody
                   comes to find out what the banner meant, and "not yet" alone
                   does not say what happens or when. */
                : (
                  <span className={styles.none}>
                    Not yet, and locked after {formatDate(verifyDeadline(user.createdAt))}
                  </span>
                )}
            </dd>

            <dt>Member since</dt>
            <dd className={styles.mono}>{formatDate(user.createdAt)}</dd>
          </dl>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>
              {user.hasPassword ? 'Change your password' : 'Set a password'}
            </h2>
            <span className={styles.panelNote}>
              At least {MIN_PASSWORD_LENGTH} characters
            </span>
          </div>

          <form className={styles.stack} action={changePassword}>
            {user.hasPassword && (
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="pw-current">Current password</label>
                <input
                  className={styles.control}
                  id="pw-current"
                  name="current"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </div>
            )}

            {!user.hasPassword && (
              <p className={styles.panelNote}>
                This account has only ever signed in with an emailed code, so there is no
                current password to confirm. Setting one here does not remove the code —
                both will work.
              </p>
            )}

            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="pw-next">New password</label>
              <input
                className={styles.control}
                id="pw-next"
                name="next"
                type="password"
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="pw-confirm">Repeat new password</label>
              <input
                className={styles.control}
                id="pw-confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                required
              />
            </div>

            <div>
              <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit">
                {user.hasPassword ? 'Change password' : 'Set password'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}
