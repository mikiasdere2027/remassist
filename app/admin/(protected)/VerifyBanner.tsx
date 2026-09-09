import { sendVerificationEmail } from './settings/actions';
import type { AdminUser } from '@/lib/auth/require';
import { hoursToVerify, verifyState } from '@/lib/auth/verify';
import styles from '../admin.module.css';

/**
 * "Confirm your email address" — MIGRATION-PLAN §10, phase 5.
 *
 * No longer warn-only. The deadline in lib/auth/verify.ts locks the account a
 * day after the row is created, so this banner is the notice period rather than
 * the whole control, and its job changed with it: it has to say what happens
 * and when, not merely ask.
 *
 * A banner that asks is one people scroll past. A banner that says "16 hours
 * left, then this account is locked" is one they act on — and the point of
 * showing the number rather than the deadline is that nobody has to work out
 * what a timestamp means relative to now.
 *
 * A locked account never sees this: requireUser has already sent it to
 * /admin/verify, which is this banner's argument made in full.
 */

/** The last stretch, where the tone changes from notice to warning. */
const LOUD_UNDER_HOURS = 6;

export default function VerifyBanner({ user }: { user: AdminUser }) {
  /* Verified needs no banner, and locked never reaches this layout — the only
     state this renders for is the grace window. */
  if (verifyState(user) !== 'pending') return null;

  const hours = hoursToVerify(user);
  const loud = hours <= LOUD_UNDER_HOURS;

  return (
    <div
      className={`${styles.verifyBanner} ${loud ? styles.verifyLoud : ''}`}
      role={loud ? 'alert' : 'status'}
    >
      <div>
        <strong>
          {loud
            ? `${hours} ${hours === 1 ? 'hour' : 'hours'} left to confirm your email address`
            : 'Confirm your email address'}
        </strong>
        <span>
          {loud
            ? `When the time runs out this account is locked out of the admin until the
               address is confirmed. Nothing is lost — the code below unlocks it — but
               anything you are part-way through will have to wait.`
            : `We will email you a code. Entering it proves the address can receive mail,
               which is what makes password recovery possible. ${hours} hours from now an
               unconfirmed account is locked until it is done.`}
        </span>
      </div>
      <form action={sendVerificationEmail}>
        {/* A failed send belongs back on the screen that asked for it. */}
        <input type="hidden" name="returnTo" value="settings" />
        <button className={`${styles.btn} ${styles.btnGhost}`} type="submit">
          Send activation code
        </button>
      </form>
    </div>
  );
}
