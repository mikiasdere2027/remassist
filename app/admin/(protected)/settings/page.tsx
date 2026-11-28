import { apiServer } from '@/lib/api/server';
import type { DeviceSession } from '@/lib/auth/devices';
import { requireUser } from '@/lib/auth/require';
import AdminTopbar from '../AdminTopbar';
import ChangePasswordForm from './ChangePasswordForm';
import DevicesPanel from './DevicesPanel';
import styles from '../../admin.module.css';

export const metadata = { title: 'Settings' };
export const dynamic = 'force-dynamic';

/** Your own account: who you're signed in as, and your password. */
export default async function SettingsPage() {
  const [user, devices] = await Promise.all([
    requireUser(),
    apiServer<DeviceSession[]>('/admin/auth/sessions'),
  ]);

  return (
    <>
      <AdminTopbar title="Settings" subtitle="Your account, password and signed-in devices." />
      <div className={styles.view}>
        <div className={styles.teamTopGrid}>
          <section className={`${styles.panel} ${styles.section}`}>
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>Your account</h2>
            </div>
            <dl className={styles.dl}>
              <dt>Name</dt>
              <dd>{user.name}</dd>
              <dt>Username</dt>
              <dd className={styles.mono}>@{user.username}</dd>
              <dt>Email</dt>
              <dd className={styles.mono}>{user.email}</dd>
              <dt>Role</dt>
              <dd>
                <span className={`${styles.pill} ${styles.rolePill}`}>{user.role}</span>
              </dd>
            </dl>
            <p className={styles.panelNote}>
              To change your name, email or role, ask an admin.
            </p>
          </section>

          <section className={`${styles.panel} ${styles.section}`}>
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>Change password</h2>
            </div>
            <ChangePasswordForm username={user.username} />
          </section>
        </div>

        <section className={`${styles.panel} ${styles.section}`}>
          <div className={styles.panelHead}>
            <div>
              <h2 className={styles.panelTitle}>Signed-in devices</h2>
              <p className={styles.panelSub}>Where your account is signed in right now. Sign out any you don&rsquo;t recognise.</p>
            </div>
          </div>
          <DevicesPanel initial={devices} />
        </section>
      </div>
    </>
  );
}
