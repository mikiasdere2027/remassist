'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import type { CreatedInvitation, CreatedReset, Invitation, TeamUser } from '@/lib/api/types';
import type { Role } from '@/lib/auth/roles';
import { formatDate, formatDateShort } from '@/lib/leads/display';
import InfoTooltip from '../../InfoTooltip';
import MenuButton from '../../MenuButton';
import styles from '../../../admin.module.css';

/** A link the admin must copy and send (invite or password reset). */
interface ShareableLink {
  kind: 'invite' | 'reset';
  who: string;
  url: string;
  emailed: boolean;
}

const STATUS_PILL: Record<Invitation['status'], [string, string]> = {
  pending: ['Waiting', styles.pillWait],
  accepted: ['Accepted', styles.pillOn],
  expired: ['Expired', styles.pillOff],
  revoked: ['Withdrawn', styles.pillOff],
};

export default function UsersManager({
  meId,
  users,
  invitations,
}: {
  meId: string;
  users: TeamUser[];
  invitations: Invitation[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [link, setLink] = useState<ShareableLink | null>(null);
  const [busy, setBusy] = useState(false);
  const [inviteErrors, setInviteErrors] = useState<Record<string, string>>({});

  /** Run one API call, report the outcome, and refresh the server data. */
  async function run(action: () => Promise<string | void>) {
    setBusy(true);
    setMessage(null);
    try {
      const ok = await action();
      if (ok) setMessage({ tone: 'ok', text: ok });
      router.refresh();
    } catch (err) {
      setMessage({ tone: 'err', text: err instanceof Error ? err.message : 'Something went wrong.' });
    } finally {
      setBusy(false);
    }
  }

  async function invite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    setInviteErrors({});
    setLink(null);
    await run(async () => {
      try {
        const created = await api.post<CreatedInvitation>('/admin/invitations', {
          email: String(form.get('email') ?? '').trim(),
          name: String(form.get('name') ?? '').trim() || undefined,
          role: String(form.get('role') ?? 'manager') as Role,
        });
        formEl.reset();
        setLink({ kind: 'invite', who: created.email, url: created.inviteUrl, emailed: created.emailed });
      } catch (err) {
        if (err instanceof ApiError) setInviteErrors(err.fieldErrors());
        throw err;
      }
    });
  }

  const revoke = (inv: Invitation) =>
    run(async () => {
      await api.delete(`/admin/invitations/${inv.id}`);
      return `Withdrew the invitation for ${inv.email}.`;
    });

  const setRole = (u: TeamUser, role: Role) =>
    run(async () => {
      await api.patch(`/admin/users/${u.id}`, { role });
      return `${u.name} is now ${role === 'admin' ? 'an admin' : 'a manager'}.`;
    });

  const setDisabled = (u: TeamUser, disabled: boolean) =>
    run(async () => {
      await api.patch(`/admin/users/${u.id}`, { disabled });
      return disabled
        ? `${u.name} is disabled and signed out everywhere.`
        : `${u.name} can sign in again.`;
    });

  const resetPassword = (u: TeamUser) =>
    run(async () => {
      const r = await api.post<CreatedReset>(`/admin/users/${u.id}/password-reset`);
      setLink({ kind: 'reset', who: u.name, url: r.resetUrl, emailed: r.emailed });
    });

  const pending = invitations.filter((i) => i.status === 'pending');
  const past = invitations.filter((i) => i.status !== 'pending').slice(0, 10);

  return (
    <div className={styles.view}>
      {message && (
        <p
          className={`${styles.signinMsg} ${message.tone === 'ok' ? styles.msgOk : styles.msgErr}`}
          role={message.tone === 'ok' ? 'status' : 'alert'}
        >
          {message.text}
        </p>
      )}

      {link && <LinkNotice link={link} onDone={() => setLink(null)} />}

      <div className={styles.teamTopGrid}>
        <section className={`${styles.panel} ${styles.section}`}>
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>Invite someone</h2>
            <InfoTooltip
              text="Managers edit content and work leads. Admins can also manage users and the price list."
              position="bottom-left"
            />
          </div>
          <form className={styles.stack} onSubmit={invite}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="invite-email">
                Email
              </label>
              <input className={styles.control} id="invite-email" name="email" type="email" required autoComplete="off" />
              {inviteErrors.email && <p className={styles.fieldErr}>{inviteErrors.email}</p>}
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="invite-name">
                Name <span className={styles.none}>(optional)</span>
              </label>
              <input className={styles.control} id="invite-name" name="name" type="text" maxLength={100} autoComplete="off" />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="invite-role">
                Role
              </label>
              <select className={styles.control} id="invite-role" name="role" defaultValue="manager">
                <option value="manager">Manager — content and leads</option>
                <option value="admin">Admin — everything, including users and prices</option>
              </select>
            </div>
            <button className={`${styles.btn} ${styles.btnPrimary}`} type="submit" disabled={busy}>
              Create invitation
            </button>
          </form>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>Invitations</h2>
            <span className={styles.panelNote}>{pending.length} waiting</span>
          </div>
          {pending.length + past.length === 0 ? (
            <p className={styles.empty}>
              <strong>No invitations yet</strong>
              Invite someone and their link appears here until they accept it.
            </p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Invited by</th>
                    <th>Expires</th>
                    <th className={styles.thActions}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {[...pending, ...past].map((inv) => {
                    const [label, pill] = STATUS_PILL[inv.status];
                    return (
                      <tr key={inv.id}>
                        <td className={styles.mono}>{inv.email}</td>
                        <td>
                          <span className={`${styles.pill} ${styles.rolePill}`}>{inv.role}</span>
                        </td>
                        <td>
                          <span className={`${styles.pill} ${pill}`}>{label}</span>
                        </td>
                        <td>{inv.invitedByName ?? <span className={styles.none}>—</span>}</td>
                        <td className={`${styles.mono} ${styles.nowrap}`}>{formatDateShort(inv.expiresAt)}</td>
                        <td className={styles.nowrap}>
                          {inv.status === 'pending' && (
                            <div className={styles.actions}>
                              <MenuButton label={`Options for invitation to ${inv.email}`}>
                                <button
                                  type="button"
                                  className={`${styles.memberDropdownItem} ${styles.memberDropdownItemDanger}`}
                                  onClick={() => revoke(inv)}
                                  disabled={busy}
                                >
                                  Withdraw invitation
                                </button>
                              </MenuButton>
                            </div>
                          )}
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
          <span className={styles.panelNote}>{users.length} total</span>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last sign-in</th>
                <th>Since</th>
                <th className={styles.thActions}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isMe = u.id === meId;
                return (
                  <tr key={u.id}>
                    <td>
                      {u.name}
                      {isMe && <span className={styles.tag}>You</span>}
                      <div className={`${styles.mono} ${styles.none}`}>{u.email}</div>
                    </td>
                    <td className={styles.mono}>@{u.username}</td>
                    <td>
                      <span className={`${styles.pill} ${styles.rolePill}`}>{u.role}</span>
                    </td>
                    <td>
                      {u.disabledAt ? (
                        <span className={`${styles.pill} ${styles.pillOff}`}>Disabled</span>
                      ) : (
                        <span className={`${styles.pill} ${styles.pillOn}`}>Active</span>
                      )}
                    </td>
                    <td className={`${styles.mono} ${styles.nowrap}`}>
                      {u.lastLoginAt ? formatDate(u.lastLoginAt) : <span className={styles.none}>Never</span>}
                    </td>
                    <td className={`${styles.mono} ${styles.nowrap}`}>{formatDateShort(u.createdAt)}</td>
                    <td className={styles.nowrap}>
                      {!isMe && (
                        <div className={styles.actions}>
                          <MenuButton label={`Options for ${u.name}`}>
                            {!u.disabledAt && (
                              <button type="button" className={styles.memberDropdownItem} onClick={() => resetPassword(u)} disabled={busy}>
                                Create password reset link
                              </button>
                            )}
                            <button
                              type="button"
                              className={styles.memberDropdownItem}
                              onClick={() => setRole(u, u.role === 'admin' ? 'manager' : 'admin')}
                              disabled={busy}
                            >
                              {u.role === 'admin' ? 'Make manager' : 'Make admin'}
                            </button>
                            <button
                              type="button"
                              className={
                                u.disabledAt
                                  ? styles.memberDropdownItem
                                  : `${styles.memberDropdownItem} ${styles.memberDropdownItemDanger}`
                              }
                              onClick={() => setDisabled(u, !u.disabledAt)}
                              disabled={busy}
                            >
                              {u.disabledAt ? 'Re-enable' : 'Disable'}
                            </button>
                          </MenuButton>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/** Shows a one-time link with a copy button. The API only returns it once. */
function LinkNotice({ link, onDone }: { link: ShareableLink; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const what = link.kind === 'invite' ? 'invitation' : 'password reset link';

  return (
    <div className={`${styles.signinMsg} ${styles.msgOk}`} role="status">
      <strong>
        {link.kind === 'invite' ? 'Invitation created' : 'Reset link created'} for {link.who}.
      </strong>{' '}
      {link.emailed
        ? `We emailed the ${what}. You can also copy it below.`
        : `Email isn't set up, so send them this ${what} yourself.`}{' '}
      It works once and is shown only now.
      <div className={styles.copyRow}>
        <input readOnly value={link.url} aria-label={`The ${what}`} onFocus={(e) => e.currentTarget.select()} />
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link.url);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  );
}
