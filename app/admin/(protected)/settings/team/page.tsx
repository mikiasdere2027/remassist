import { asc, desc, eq, isNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { getDb, isDatabaseConfigured } from '@/db';
import { invitations, users } from '@/db/schema/auth';
import { requireRole } from '@/lib/auth/require';
import { ALLOWED_DOMAINS } from '@/lib/auth/allowlist';
import { formatDate, formatDateShort } from '@/lib/leads/display';
import { inviteManager, setUserDisabled } from './actions';
import { teamMessage } from './messages';
import InfoTooltip from '../../InfoTooltip';
import MenuButton from '../../MenuButton';
import AdminTopbar from '../../AdminTopbar';
import styles from '../../../admin.module.css';

/**
 * Team administration — MIGRATION-PLAN §10.
 *
 * Admin only. requireRole redirects a manager away, and every action on this
 * page re-checks the role itself — see the note at the top of actions.ts for
 * why the redirect alone is not the permission.
 *
 * There is no delete control here, for either role, and no endpoint behind one.
 * Access is revoked by disabling, which keeps the record of who invited whom.
 * See canDelete in lib/auth/roles.ts.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Team',
  robots: { index: false, follow: false },
};

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const [admin, sp] = await Promise.all([requireRole('admin'), searchParams]);
  const message = teamMessage(sp.ok, sp.error);

  if (!isDatabaseConfigured()) {
    return (
      <>
        <Topbar />
        <div className={styles.view}>
          <div className={styles.notice}>
            <strong>No database configured</strong>
            There is no <code>DATABASE_URL</code> in this environment, so there are no accounts
            to show and no invitation can be sent.
          </div>
        </div>
      </>
    );
  }

  const db = getDb();
  /* Self-join to turn users.invitedBy into the inviter's address. Nullable on
     both sides: an account that nobody invited has no inviter to name. */
  const inviter = alias(users, 'inviter');
  const now = new Date();

  const [people, pending] = await Promise.all([
    db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        disabledAt: users.disabledAt,
        invitedByEmail: inviter.email,
      })
      .from(users)
      .leftJoin(inviter, eq(users.invitedBy, inviter.id))
      /* Admin first, then oldest account first, so the list reads as the order
         people arrived rather than reshuffling when somebody is disabled. */
      .orderBy(asc(users.role), asc(users.createdAt)),
    db
      .select({
        id: invitations.id,
        email: invitations.email,
        createdAt: invitations.createdAt,
        expiresAt: invitations.expiresAt,
        invitedByEmail: inviter.email,
      })
      .from(invitations)
      .leftJoin(inviter, eq(invitations.invitedBy, inviter.id))
      .where(isNull(invitations.acceptedAt))
      .orderBy(desc(invitations.createdAt)),
  ]);

  const live = pending.filter((p) => p.expiresAt.getTime() > now.getTime());

  return (
    <>
      <Topbar />

      <div className={styles.view}>
        {message && (
          <p
            className={`${styles.signinMsg} ${message.tone === 'ok' ? styles.msgOk : styles.msgErr}`}
            role="status"
          >
            {message.text}
          </p>
        )}

        {/* Invite + pending share the top row — the narrow invite form on the
            left (35%), the wider invitation list beside it (65%). Accounts
            follows beneath, full width. */}
        <div className={styles.teamTopGrid}>
        <section className={`${styles.panel} ${styles.section}`}>
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>Invite a manager</h2>
            <InfoTooltip
              text="They can read leads and change status. They cannot invite anyone."
              position="bottom-left"
              autoShowMs={5000}
            />
          </div>
          <form className={styles.inviteRow} action={inviteManager}>
            <div className={`${styles.field} ${styles.grow}`}>
              <label className={styles.fieldLabel} htmlFor="invite-email">Work email</label>
              <input
                className={styles.control}
                id="invite-email"
                name="email"
                type="email"
                placeholder={`colleague${ALLOWED_DOMAINS[0]}`}
                autoComplete="off"
                required
              />
            </div>
            <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit">
              Invite
            </button>
          </form>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>Pending invitations</h2>
            <span className={styles.panelNote} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              {live.length} outstanding
              {pending.length > live.length && `, ${pending.length - live.length} expired`}
              <InfoTooltip
                text="Outstanding invitations are waiting to be accepted. Expired links are kept as a record of who invited whom."
                position="bottom-left"
              />
            </span>
          </div>
          {pending.length === 0 ? (
            <p className={styles.empty}>
              <strong>Nothing outstanding</strong>
              Everyone who was invited has either accepted or let the link expire.
            </p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Invited by</th>
                    <th>Sent</th>
                    <th>Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((p) => {
                    const expired = p.expiresAt.getTime() <= now.getTime();
                    return (
                      <tr key={p.id}>
                        <td className={styles.mono}>{p.email}</td>
                        <td>
                          {expired
                            ? <span className={`${styles.pill} ${styles.pillOff}`}>Expired</span>
                            : <span className={`${styles.pill} ${styles.pillWait}`}>Waiting</span>}
                        </td>
                        <td className={styles.mono}>
                          {p.invitedByEmail ?? <span className={styles.none}>Unknown</span>}
                        </td>
                        <td className={`${styles.mono} ${styles.nowrap}`}>
                          {formatDateShort(p.createdAt)}
                        </td>
                        <td className={`${styles.mono} ${styles.nowrap}`}>
                          {formatDateShort(p.expiresAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
        </div>

        <section className={`${styles.panel} ${styles.section}`}>
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>Accounts</h2>
            <span className={styles.panelNote}>{people.length} total</span>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Verified</th>
                  <th>Invited by</th>
                  <th>Since</th>
                  <th className={styles.thActions}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {people.map((p) => (
                  <tr key={p.id}>
                    <td className={styles.mono}>
                      {p.email}
                      {p.id === admin.id && <span className={styles.tag}>You</span>}
                    </td>
                    <td>
                      <span className={`${styles.pill} ${styles.rolePill}`}>{p.role}</span>
                    </td>
                    <td>
                      {p.disabledAt
                        ? <span className={`${styles.pill} ${styles.pillOff}`}>Disabled</span>
                        : <span className={`${styles.pill} ${styles.pillOn}`}>Active</span>}
                    </td>
                    <td className={styles.nowrap}>
                      {p.emailVerified
                        ? <span className={styles.mono}>{formatDate(p.emailVerified)}</span>
                        : <span className={styles.none}>No</span>}
                    </td>
                    <td className={styles.mono}>
                      {/* A null invited_by means nobody invited them — NOT that
                          the CLI made them, which is what this used to claim.
                          The column records who let somebody in, and the rows
                          without one arrive by at least three routes: the CLI,
                          a hand-written INSERT, and Auth.js creating a user the
                          first time an allowlisted address redeems a code. We
                          do not store which, so the honest answer is the fact
                          we actually hold. An audit trail that guesses is worse
                          than one that admits the gap. */}
                      {p.invitedByEmail ?? <span className={styles.none}>Not invited</span>}
                    </td>
                    <td className={`${styles.mono} ${styles.nowrap}`}>{formatDate(p.createdAt)}</td>
                    <td className={styles.nowrap}>
                      {/* No menu at all for the admin's own row or for the
                          admin role generally — the action refuses both, and a
                          control that always errors is worse than no control.
                          There is still no delete here: see the note at the top
                          of this file and canDelete in lib/auth/roles.ts. */}
                      {p.role === 'manager' && p.id !== admin.id && (
                        <div className={styles.actions}>
                          <MenuButton label={`Options for ${p.email}`}>
                            <form action={setUserDisabled} style={{ margin: 0 }}>
                              <input type="hidden" name="userId" value={p.id} />
                              <input type="hidden" name="disable" value={p.disabledAt ? '0' : '1'} />
                              <button
                                className={
                                  p.disabledAt
                                    ? styles.memberDropdownItem
                                    : `${styles.memberDropdownItem} ${styles.memberDropdownItemDanger}`
                                }
                                type="submit"
                              >
                                {p.disabledAt ? (
                                  <>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                      <path d="M20 11a8 8 0 1 0-1.5 5.2" />
                                      <path d="M20 4v7h-7" />
                                    </svg>
                                    Re-enable
                                  </>
                                ) : (
                                  <>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                      <circle cx="12" cy="12" r="10" />
                                      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                                    </svg>
                                    Disable
                                  </>
                                )}
                              </button>
                            </form>
                          </MenuButton>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

function Topbar() {
  return (
    <AdminTopbar
      title="Team"
      subtitle="Who can reach the admin, and who let them in"
    />
  );
}
