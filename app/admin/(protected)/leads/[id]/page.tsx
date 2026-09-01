import Link from 'next/link';
import { notFound } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { leads, quizSubmissions } from '@/db/schema';
import {
  SOURCE_LABELS, answerFor, formatDate, orderedAnswers, questionFor, unknownRawKeys,
} from '@/lib/leads/display';
import StatusForm from './StatusForm';
import styles from '../../../admin.module.css';

/**
 * Lead detail — MIGRATION-PLAN §10, and the screen this phase exists for.
 *
 * The contract: everything the visitor actually submitted is on this page.
 * Named rows for the fields we know, a raw dump for anything a form has started
 * sending since, and the quiz answers rendered as the questions they answered.
 *
 * Empty values are rendered as "not provided", never omitted. A row that
 * disappears when null makes an unanswered field indistinguishable from one
 * that was never on the form.
 */
export const dynamic = 'force-dynamic';

export default async function LeadDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isDatabaseConfigured()) notFound();

  /* A malformed id would make Postgres throw on the uuid cast, which surfaces
     as a 500. A bad URL is a 404. */
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const db = getDb();
  const [lead] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  if (!lead) notFound();

  const quizzes = await db
    .select()
    .from(quizSubmissions)
    .where(eq(quizSubmissions.leadId, id))
    .orderBy(desc(quizSubmissions.createdAt));

  const raw = lead.rawFields ?? null;
  const extraKeys = unknownRawKeys(raw);

  return (
    <>
      <header className={styles.topbar}>
        <div className={styles.tbInner}>
          <div>
            <Link className={styles.back} href="/admin/leads">← All leads</Link>
            <h1 className={styles.tbTitle}>{lead.name || lead.email}</h1>
            <p className={styles.tbSub}>
              {SOURCE_LABELS[lead.source] ?? lead.source} · {formatDate(lead.createdAt)}
            </p>
          </div>
          <span className={`${styles.pill} ${styles[`s_${lead.status}`]}`}>{lead.status}</span>
        </div>
      </header>

      <div className={styles.view}>
        <div className={styles.detailGrid}>
          {/* 1 — what they typed */}
          <section className={`${styles.panel} ${styles.detailWide}`}>
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>Submitted fields</h2>
              <span className={styles.panelNote}>Every field on the form, filled or not</span>
            </div>
            <dl className={styles.dl}>
              <Row label="First name" value={lead.firstName} />
              <Row label="Last name" value={lead.lastName} />
              <Row label="Email" value={lead.email} mono />
              <Row label="Phone" value={lead.phone} mono />
              <Row label="Company" value={lead.company} />
              <Row label="Country" value={lead.country} />
              <Row label="Service interest" value={lead.serviceInterest} />
              <Row label="Message" value={lead.message} pre />
              <dt>Privacy consent</dt>
              <dd>
                {lead.consentAt ? (
                  <>Agreed <span className={styles.mono}>{formatDate(lead.consentAt)}</span></>
                ) : (
                  /* Honest rather than reassuring: every row written before the
                     consent column existed lands here, and so does any form
                     that does not ask. Neither is evidence of agreement. */
                  <span className={styles.none}>Not recorded</span>
                )}
              </dd>
            </dl>
          </section>

          {/* 2 — everything else it sent, so nothing is silently dropped */}
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>Raw submission</h2>
              <span className={styles.panelNote}>
                {raw ? `${Object.keys(raw).length} fields as submitted` : 'Not captured'}
              </span>
            </div>
            {raw && Object.keys(raw).length > 0 ? (
              <dl className={styles.dl}>
                {Object.entries(raw).map(([k, v]) => (
                  <Fragment key={k} k={k} v={v} flagged={extraKeys.includes(k)} />
                ))}
              </dl>
            ) : (
              <p className={styles.empty}>
                <strong>Nothing captured</strong>
                This lead predates raw-field capture, or arrived from a surface that does not send
                one. The named fields above are all there is.
              </p>
            )}
          </section>

          {/* 3 — where they came from */}
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>Context</h2>
            </div>
            <dl className={styles.dl}>
              <Row label="Source" value={SOURCE_LABELS[lead.source] ?? lead.source} />
              <Row label="Page" value={lead.pageUrl} mono />
              <Row label="Referrer" value={lead.referrer} mono />
              <Row label="Lead ID" value={lead.id} mono />
            </dl>
            {lead.utm && Object.keys(lead.utm).length > 0 ? (
              <pre className={styles.json}>{JSON.stringify(lead.utm, null, 2)}</pre>
            ) : (
              <p className={styles.empty}>No campaign attribution recorded.</p>
            )}
          </section>

          {/* 4 — the quiz, if they took it */}
          {quizzes.map((q) => (
            <section key={q.id} className={`${styles.panel} ${styles.detailWide}`}>
              <div className={styles.panelHead}>
                <h2 className={styles.panelTitle}>Fit finder answers</h2>
                <span className={styles.panelNote}>
                  {q.completed ? 'Completed' : 'Partial'} · {formatDate(q.createdAt)}
                </span>
              </div>

              <dl className={styles.qa}>
                {orderedAnswers(q.answers).map(([key, value]) => {
                  const a = answerFor(key, value);
                  return (
                    <div key={key}>
                      <dt>{questionFor(key) ?? key}</dt>
                      <dd>
                        {a.label}
                        {a.note && <span className={styles.answerNote}> — {a.note}</span>}
                      </dd>
                    </div>
                  );
                })}
              </dl>

              {q.result && (
                <>
                  <div className={styles.panelHead} style={{ borderTop: '1px solid #edf0f6' }}>
                    <h2 className={styles.panelTitle}>The quote they were shown</h2>
                    {/* Read from the stored snapshot, never recomputed. Rates
                        change; what this prospect was actually told does not. */}
                    <span className={styles.panelNote}>Snapshot as shown, not recalculated</span>
                  </div>
                  <div className={styles.quote}>
                    <Quote label="Service" value={q.result.service} />
                    <Quote label="Tier" value={q.result.tier} />
                    <Quote label="Seats" value={q.result.seats} />
                    <Quote label="Hours" value={q.result.hours} />
                    <Quote label="Rate" value={q.result.rate ? `$${q.result.rate}/hr` : undefined} />
                    <Quote label="Estimate" value={q.result.cost} />
                  </div>
                </>
              )}
            </section>
          ))}

          {/* 5 — the one thing that writes */}
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>Status</h2>
            </div>
            <StatusForm id={lead.id} current={lead.status} />
          </section>
        </div>
      </div>
    </>
  );
}

/** A labelled row that shows its own absence rather than vanishing. */
function Row({
  label, value, mono, pre,
}: { label: string; value?: string | null; mono?: boolean; pre?: boolean }) {
  return (
    <>
      <dt>{label}</dt>
      <dd className={mono ? styles.mono : undefined}>
        {value
          ? (pre ? <p className={styles.pre}>{value}</p> : value)
          : <span className={styles.none}>Not provided</span>}
      </dd>
    </>
  );
}

/** A raw key/value, flagged when no named row above already covers it. */
function Fragment({ k, v, flagged }: { k: string; v: string; flagged: boolean }) {
  return (
    <>
      <dt className={styles.mono}>
        {k}
        {flagged && <span className={styles.tag}>new</span>}
      </dt>
      <dd>
        {v ? <p className={styles.pre}>{v}</p> : <span className={styles.none}>Empty</span>}
      </dd>
    </>
  );
}

function Quote({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className={styles.quoteItem}>
      <span className={styles.quoteLabel}>{label}</span>
      <span className={styles.quoteValue}>
        {value === undefined || value === null || value === ''
          ? <span className={styles.none}>—</span>
          : value}
      </span>
    </div>
  );
}
