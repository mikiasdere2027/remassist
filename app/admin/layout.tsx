import styles from './admin.module.css';

/**
 * The /admin shell — chrome only, no gate.
 *
 * The gate lives one level down in (protected)/layout.tsx, because
 * /admin/signin has to render to signed-out visitors. Putting the redirect
 * here would send the sign-in page to itself, forever.
 *
 * Deliberately does not use the marketing Header/Footer: /admin has no reason
 * to load the Calendly modal, the chat widget or the consent banner.
 */
export const metadata = {
  title: 'Admin',
  /* Belt and braces with robots.txt: a page behind a login should never be
     indexed even if the gate is ever misconfigured. */
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className={styles.shell}>{children}</div>;
}
