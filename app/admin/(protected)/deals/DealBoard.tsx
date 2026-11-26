'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { effectiveProbability, formatMoney, formatMoneyShort, weightedCents } from '@/lib/crm/money';
import { initials } from '@/lib/crm/display';
import { moveDealStage } from './actions';
import admin from '../../admin.module.css';
import s from '../crm.module.css';

export interface BoardStage { id: string; name: string; kind: 'open' | 'won' | 'lost'; probability: number }
export interface BoardDeal {
  id: string;
  title: string;
  stageId: string;
  probability: number | null;
  monthlyValueCents: number;
  currency: string;
  companyName: string | null;
  ownerName: string | null;
  expectedClose: string | null;
  stageChangedAt: string;
}


/**
 * The pipeline board. Drag a card to another column, or use the card's stage
 * menu (keyboard and touch). Moving to Lost asks for the reason first. Moves
 * are optimistic and roll back if the server refuses.
 */
export default function DealBoard({ stages, deals: initial, lossReasons }: {
  stages: BoardStage[];
  deals: BoardDeal[];
  lossReasons: Array<{ id: string; label: string }>;
}) {
  const router = useRouter();
  const [deals, setDeals] = useState(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingLoss, setPendingLoss] = useState<{ dealId: string; stageId: string } | null>(null);
  const [, start] = useTransition();
  useEffect(() => setDeals(initial), [initial]);

  const stageOf = (id: string) => stages.find((x) => x.id === id);

  function request(dealId: string, stageId: string) {
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stageId === stageId) return;
    if (stageOf(stageId)?.kind === 'lost') {
      setPendingLoss({ dealId, stageId });
      return;
    }
    commit(dealId, stageId);
  }

  function commit(dealId: string, stageId: string, reasonId?: string, note?: string) {
    const before = deals;
    setError(null);
    setDeals((ds) => ds.map((d) => (d.id === dealId ? { ...d, stageId, stageChangedAt: new Date().toISOString() } : d)));
    start(async () => {
      const r = await moveDealStage(dealId, stageId, reasonId, note).catch(() => ({ ok: false as const, error: 'Could not move the deal.' }));
      if (!r.ok) {
        setDeals(before);
        setError(r.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <>
      {error && <p className={s.error} role="alert">{error}</p>}
      <div className={s.board}>
        {stages.map((st) => {
          const items = deals.filter((d) => d.stageId === st.id);
          const total = items.reduce((n, d) => n + d.monthlyValueCents, 0);
          const weighted = items.reduce((n, d) => n + weightedCents(d.monthlyValueCents, effectiveProbability(d.probability, st.probability)), 0);
          return (
            <section
              key={st.id}
              aria-label={`${st.name}: ${items.length} deals`}
              className={`${s.column} ${s[`col_${st.kind}`]} ${overStage === st.id ? s.columnOver : ''}`}
              onDragOver={(e) => { if (dragId) { e.preventDefault(); setOverStage(st.id); } }}
              onDragLeave={() => setOverStage((o) => (o === st.id ? null : o))}
              onDrop={(e) => { e.preventDefault(); setOverStage(null); if (dragId) request(dragId, st.id); setDragId(null); }}
            >
              <header className={s.columnHead}>
                <h2>{st.name}</h2>
                <span className={s.tabCount}>{items.length}</span>
              </header>
              <p className={s.columnTotal}>
                {formatMoneyShort(total)}<span>/mo</span>
                {st.kind === 'open' && <span className={s.cardNote}> · {formatMoneyShort(weighted)} weighted</span>}
                {st.kind !== 'open' && <span className={s.cardNote}> · last 30 days</span>}
              </p>
              <ul className={s.columnList}>
                {items.map((d) => (
                  <li
                    key={d.id}
                    className={`${s.dealCard} ${dragId === d.id ? s.dealDragging : ''}`}
                    draggable
                    onDragStart={(e) => { setDragId(d.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', d.id); }}
                    onDragEnd={() => { setDragId(null); setOverStage(null); }}
                  >
                    <Link href={`/admin/deals/${d.id}`} className={s.dealTitle}>{d.title}</Link>
                    {d.companyName && <span className={s.leadSub}>{d.companyName}</span>}
                    <div className={s.dealMeta}>
                      <b>{formatMoney(d.monthlyValueCents, d.currency)}<span className={s.cardNote}>/mo</span></b>
                      {d.ownerName && <span className={`${s.avatar} ${s.avatarXs}`} title={d.ownerName}>{initials(d.ownerName)}</span>}
                    </div>
                    <div className={s.dealFoot}>
                      <span className={s.cardNote}>
                        {d.expectedClose ? `Close ${d.expectedClose}` : `${daysSince(d.stageChangedAt)}d in stage`}
                      </span>
                      <select
                        aria-label={`Move ${d.title} to stage`}
                        className={s.miniSelect}
                        value={d.stageId}
                        onChange={(e) => request(d.id, e.target.value)}
                      >
                        {stages.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                      </select>
                    </div>
                  </li>
                ))}
                {items.length === 0 && <li className={s.columnEmpty}>Drop a deal here</li>}
              </ul>
            </section>
          );
        })}
      </div>

      {pendingLoss && (
        <LossDialog
          reasons={lossReasons}
          title={deals.find((d) => d.id === pendingLoss.dealId)?.title ?? 'this deal'}
          onCancel={() => setPendingLoss(null)}
          onConfirm={(reasonId, note) => { commit(pendingLoss.dealId, pendingLoss.stageId, reasonId, note); setPendingLoss(null); }}
        />
      )}
    </>
  );
}

function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

/** Why was it lost? Required before a deal moves to Lost. */
export function LossDialog({ reasons, title, onCancel, onConfirm }: {
  reasons: Array<{ id: string; label: string }>;
  title: string;
  onCancel: () => void;
  onConfirm: (reasonId: string, note: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  useEffect(() => {
    const el = ref.current;
    if (el && !el.open) el.showModal();
  }, []);
  return (
    <dialog ref={ref} className={admin.modal} aria-labelledby="loss-title" onCancel={(e) => { e.preventDefault(); onCancel(); }}>
      <div className={admin.modalPanel}>
      <form
        className={s.cardBody}
        onSubmit={(e) => { e.preventDefault(); if (reason) onConfirm(reason, note); }}
      >
        <h2 id="loss-title" className={s.cardTitle}>Mark &ldquo;{title}&rdquo; as lost</h2>
        <div>
          <label className={s.label} htmlFor="loss-reason">Why was it lost? *</label>
          <select id="loss-reason" className={s.select} value={reason} onChange={(e) => setReason(e.target.value)} required>
            <option value="">Choose a reason</option>
            {reasons.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </div>
        <div>
          <label className={s.label} htmlFor="loss-note">Note</label>
          <textarea id="loss-note" className={s.textarea} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000}
            placeholder="Anything worth knowing if they come back" />
        </div>
        <div className={s.formFoot}>
          <button type="submit" className={`${admin.btn} ${admin.btnPrimary}`} disabled={!reason}>Mark as lost</button>
          <button type="button" className={`${admin.btn} ${admin.btnGhost}`} onClick={onCancel}>Cancel</button>
        </div>
      </form>
      </div>
    </dialog>
  );
}
