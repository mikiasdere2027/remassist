'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api/client';
import { missingFromError, type AdminPopup, type PopupState } from '@/lib/api/popups';
import { formatDate, formatRelativeTime } from '@/lib/leads/display';
import { listMissing } from '@/lib/popups/completeness';
import { POPUP_PLACEMENT_LABEL, isPopupPlacement } from '@/lib/popups/placement';
import { POPUP_TEMPLATE_LABEL, isPopupTemplate } from '@/lib/popups/templates';
import PopupRowMenu from './RowMenu';
import styles from '../../../admin.module.css';

/**
 * The popups table and its one in-place action: publish / suspend.
 *
 * Publishing is gated by the backend on completeness; when it refuses, its
 * `missing` list is shown here so the editor knows what to fill in.
 */

const STATE_PILL: Record<PopupState, [string, string]> = {
  live: ['Live', styles.pillLow],
  scheduled: ['Scheduled', styles.pillWait],
  ended: ['Ended', styles.pillOff],
  draft: ['Draft', styles.pillMed],
};

/** How a schedule reads in one line. */
function scheduleText(startsAt: string | null, endsAt: string | null): string {
  const short = (v: string) =>
    new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (startsAt && endsAt) return `${short(startsAt)} → ${short(endsAt)}`;
  if (endsAt) return `Until ${short(endsAt)}`;
  if (startsAt) return `From ${short(startsAt)}`;
  return 'Anytime';
}

function placementLabel(value: string): string {
  return isPopupPlacement(value) ? POPUP_PLACEMENT_LABEL[value] : value;
}

function templateLabel(value: string): string {
  return isPopupTemplate(value) ? POPUP_TEMPLATE_LABEL[value] : value;
}

export default function PopupsTable({
  rows,
  mayEdit,
  nothingYet,
}: {
  rows: AdminPopup[];
  mayEdit: boolean;
  /** No popups at all (not merely none matching the search or tab). */
  nothingYet: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  async function setPublished(p: AdminPopup, published: boolean) {
    setBusy(true);
    setMessage(null);
    try {
      const saved = await api.patch<AdminPopup>(`/admin/popups/${p.id}`, { published });
      setMessage({
        tone: 'ok',
        text: !published
          ? `“${p.name}” is suspended. Nothing was deleted — the draft is kept.`
          : saved.state === 'scheduled'
            ? `“${p.name}” is published and scheduled — it starts showing at its start time.`
            : saved.state === 'ended'
              ? `“${p.name}” is published, but its end time has passed, so it shows nowhere.`
              : `“${p.name}” is live — it can now appear on its placement.`,
      });
      router.refresh();
    } catch (err) {
      const missing = missingFromError(err);
      setMessage({
        tone: 'err',
        text: missing.length
          ? `“${p.name}” is not finished, so it was not published. Still needed: ${listMissing(missing)}.`
          : err instanceof Error
            ? err.message
            : 'Something went wrong.',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {message && (
        <p
          className={`${styles.signinMsg} ${message.tone === 'ok' ? styles.msgOk : styles.msgErr}`}
          role={message.tone === 'ok' ? 'status' : 'alert'}
        >
          {message.text}
        </p>
      )}

      <section className={styles.panel}>
        {rows.length === 0 ? (
          <p className={styles.empty}>
            <strong>{nothingYet ? 'No popups yet' : 'No popups match'}</strong>
            {nothingYet
              ? 'Use “New popup” above to create the first one.'
              : 'Try another search, or a different tab.'}
          </p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Popup</th>
                  <th scope="col">Placement</th>
                  <th scope="col">Schedule</th>
                  <th scope="col">Status</th>
                  <th scope="col">Updated</th>
                  <th scope="col" className={styles.nowrap} style={{ textAlign: 'right' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const [label, pill] = STATE_PILL[p.state];
                  return (
                    <tr key={p.id}>
                      <td>
                        <Link className={styles.rowLink} href={`/admin/content/popups/${p.id}`}>
                          {p.name}
                        </Link>
                        <span className={styles.cellSecondary}>{p.campaign}</span>
                      </td>
                      <td>
                        <span className={styles.cellSecondary}>{placementLabel(p.placement)}</span>
                        <span className={styles.cellSecondary}>{templateLabel(p.template)}</span>
                      </td>
                      <td>
                        <span className={styles.cellSecondary}>{scheduleText(p.startsAt, p.endsAt)}</span>
                      </td>
                      <td>
                        <span className={`${styles.pill} ${pill}`}>{label}</span>
                        {!p.published && p.missing.length > 0 && (
                          <span className={styles.cellSecondary} title={`Still needed: ${listMissing(p.missing)}`}>
                            {p.missing.length} to fill in
                          </span>
                        )}
                      </td>
                      <td className={styles.nowrap}>
                        <span className={styles.relativeTime} title={formatDate(p.updatedAt)}>
                          {formatRelativeTime(p.updatedAt)}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          {mayEdit ? (
                            <PopupRowMenu
                              id={p.id}
                              name={p.name}
                              published={p.published}
                              disabled={busy}
                              onToggle={() => setPublished(p, !p.published)}
                            />
                          ) : (
                            <Link className={styles.rowLink} href={`/admin/content/popups/${p.id}`}>
                              Open
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
