import type { ReactNode } from 'react';
import styles from './admin.module.css';

/** The centred card used by every "getting in" screen (sign-in, reset, invite). */
export default function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.signinWrap}>
      <div className={styles.signinCard}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.signinLogo} src="/images/rem-logo.svg" alt="Rem Assist" />
        <h1 className={styles.signinTitle}>{title}</h1>
        {children}
      </div>
    </div>
  );
}
