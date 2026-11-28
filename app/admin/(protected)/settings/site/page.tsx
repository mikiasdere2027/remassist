import { apiServer } from '@/lib/api/server';
import { requireRole } from '@/lib/auth/require';
import type { SiteSettings } from '@/lib/site/settings';
import AdminTopbar from '../../AdminTopbar';
import SiteSettingsForm from './SiteSettingsForm';
import styles from '../../../admin.module.css';

export const metadata = { title: 'Site details' };
export const dynamic = 'force-dynamic';

/**
 * Site details — the phone, email, booking link and social links the public
 * site shows (footer, contact links, "Book a call", legal pages, search-engine
 * data). Admins only.
 */
export default async function SiteDetailsPage() {
  await requireRole('admin');
  const settings = await apiServer<SiteSettings>('/admin/site-settings');
  return (
    <>
      <AdminTopbar title="Site details" subtitle="The contact details and links the public website shows." />
      <div className={styles.view}>
        <section className={`${styles.panel} ${styles.section}`}>
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>Contact and links</h2>
          </div>
          <SiteSettingsForm initial={settings} />
        </section>
      </div>
    </>
  );
}
