'use client';

import { useState, useTransition } from 'react';
import type { ActionResult } from '../leads/[id]/actions';
import { LossDialog } from './DealBoard';
import s from '../crm.module.css';

/** The deal page's stage picker. Lost asks for a reason; everything else saves on change. */
export default function StageControl({ dealId, title, current, stages, reasons, move }: {
  dealId: string;
  title: string;
  current: string;
  stages: Array<{ id: string; name: string; kind: 'open' | 'won' | 'lost' }>;
  reasons: Array<{ id: string; label: string }>;
  move: (dealId: string, stageId: string, lossReasonId?: string, lossNote?: string) => Promise<ActionResult>;
}) {
  const [value, setValue] = useState(current);
  const [askLoss, setAskLoss] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save(stageId: string, reasonId?: string, note?: string) {
    const prev = value;
    setValue(stageId);
    setError(null);
    start(async () => {
      const r = await move(dealId, stageId, reasonId, note).catch(() => ({ ok: false as const, error: 'Could not move the deal.' }));
      if (!r.ok) {
        setValue(prev);
        setError(r.error);
      }
    });
  }

  return (
    <div className={s.kv}>
      <label className={s.kvLabel} htmlFor="deal-stage">Stage</label>
      <select
        id="deal-stage"
        className={s.select}
        value={value}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          if (stages.find((x) => x.id === next)?.kind === 'lost') setAskLoss(next);
          else save(next);
        }}
      >
        {stages.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
      </select>
      {pending && <span className={s.saving}>Saving…</span>}
      {error && <span className={s.error} role="alert">{error}</span>}
      {askLoss && (
        <LossDialog
          reasons={reasons}
          title={title}
          onCancel={() => setAskLoss(null)}
          onConfirm={(reasonId, note) => { save(askLoss, reasonId, note); setAskLoss(null); }}
        />
      )}
    </div>
  );
}
