'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { teamApi, teamErrorText } from '@/lib/api/team';
import styles from '../../../../admin.module.css';

/**
 * The two placement controls on a member's edit page: publish/unpublish, and
 * the homepage position. The position is a number you type or step, sent as
 * the whole new order (PUT /admin/team/order) — the API refuses a stale list
 * with 409 rather than guessing, so a reload is the fix for that error.
 */
export default function MemberPlacement({
  id,
  published,
  orderIds,
}: {
  id: string;
  published: boolean;
  /** Every member's id, in the current homepage order. */
  orderIds: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const at = orderIds.indexOf(id);
  const total = orderIds.length;

  async function run(action: () => Promise<string | null>) {
    setBusy(true);
    setMessage(null);
    try {
      const ok = await action();
      if (ok) setMessage({ tone: 'ok', text: ok });
      router.refresh();
    } catch (err) {
      setMessage({ tone: 'err', text: teamErrorText(err) });
    } finally {
      setBusy(false);
    }
  }

  const toggle = () =>
    run(async () => {
      await teamApi.setPublished(id, !published);
      return published
        ? 'That member is off the homepage. Nothing was deleted — their card is kept.'
        : 'That member is live on the homepage.';
    });

  function setPosition(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const wanted = Number(new FormData(e.currentTarget).get('position'));
    return run(async () => {
      if (!Number.isFinite(wanted)) throw new Error('That position is not a number.');
      // Clamped rather than refused: the intent of "0" or "99" is unambiguous.
      const target = Math.min(Math.max(Math.round(wanted), 1), total) - 1;
      if (target === at) return 'Order updated.';
      const ids = orderIds.filter((x) => x !== id);
      ids.splice(target, 0, id);
      await teamApi.reorder(ids);
      return 'Order updated.';
    });
  }

  return (
    <div className={styles.memberTopActions}>
      <button className={`${styles.btn} ${styles.btnGhost}`} type="button" disabled={busy} onClick={toggle}>
        {published ? 'Take off the homepage' : 'Put it live'}
      </button>

      {/* Type a position or step it — a number input gives both, and either
          way it is one submit rather than one per place moved. */}
      <form className={styles.memberOrderForm} onSubmit={setPosition}>
        <label className={styles.memberOrderLabel} htmlFor="position">Order</label>
        <input
          key={at}
          className={styles.memberOrderInput}
          id="position"
          name="position"
          type="number"
          min={1}
          max={total}
          step={1}
          defaultValue={at + 1}
          aria-label={`Position on the homepage, 1 to ${total}`}
        />
        <span className={styles.memberOrderOf}>of {total}</span>
        <button className={`${styles.btn} ${styles.btnGhost}`} type="submit" disabled={busy}>
          Set
        </button>
      </form>

      {message && (
        <p
          className={`${styles.signinMsg} ${message.tone === 'ok' ? styles.msgOk : styles.msgErr}`}
          role={message.tone === 'ok' ? 'status' : 'alert'}
          style={{ flexBasis: '100%', margin: 0 }}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
