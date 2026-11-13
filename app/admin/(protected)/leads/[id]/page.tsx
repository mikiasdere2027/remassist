import { Fragment } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isApiError } from '@/lib/api/errors';
import type { LeadDetail as Lead } from '@/lib/api/leads';
import { apiServer } from '@/lib/api/server';
import {
  SOURCE_LABELS, answerFor, formatDate, formatUtm, orderedAnswers, questionFor, unknownRawKeys,
} from '@/lib/leads/display';
import StatusForm from './StatusForm';
import AdminTopbar from '../../AdminTopbar';
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

  /* A malformed id is a 400 from the backend; to a visitor it is a bad URL. */
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  let lead: Lead;
  try {
    lead = await apiServer<Lead>(`/admin/leads/${id}`);
  } catch (err) {
    if (isApiError(err, 404) || isApiError(err, 400)) notFound();
    throw err;
  }
  const quizzes = lead.quizSubmissions;

  const raw = lead.rawFields ?? null;
  const extraKeys = unknownRawKeys(raw);
  const campaign = formatUtm(lead.utm);

  return (
    <>
      <AdminTopbar
        title="Lead"
        /* Who it is, the way the list names them: name over email, and email
           alone when a form did not ask for one. Not the source and date —
           those are on the strip and the panel note below. */
        subtitle={lead.name ? `${lead.name} · ${lead.email}` : lead.email}
        action={<StatusForm id={lead.id} current={lead.status} />}
      />

      <div className={styles.view}>
        {/* The same back button the team, catalog and review screens use, in the
            same place. It used to be the topbar's title, which cost the page a
            title and made this the one detail screen where going back was not
            where going back is everywhere else. */}
        <Link className={styles.memberBackBtn} href="/admin/leads">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to leads
        </Link>

        {/* Where the lead came from, on one strip. This was duplicated by a
            Context panel at the foot of the page which said the same three
            things again and added two more; the two extras moved up here and
            the panel went. One place to read context beats two that can
            disagree. */}
        <div className={styles.leadTopContextBar}>
          <ContextItem label="Source" value={SOURCE_LABELS[lead.source] ?? lead.source} />
          <Divider />
          <ContextItem label="Page" value={lead.pageUrl} fallback="—" mono />
          <Divider />
          <ContextItem label="Referrer" value={lead.referrer} fallback="Direct / None" mono />
          <Divider />
          <ContextItem label="Lead ID" value={lead.id} mono />
          <Divider />
          {/* The one field here that is genuinely often absent — most leads
              arrive with no campaign at all — so it says so in words rather
              than showing a dash that reads like a missing value. */}
          <ContextItem label="Campaign" value={campaign} fallback="None" mono />
        </div>

        <div className={styles.detailGrid}>
          {/* Top Row — Column 1: Submitted fields */}
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Submitted fields</h2>
                <span className={styles.panelNote}>Submitted on {formatDate(lead.createdAt)}</span>
              </div>
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
                  <span className={styles.none}>Not recorded</span>
                )}
              </dd>
            </dl>
          </section>

          {/* Top Row — Column 2: Raw submission */}
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Raw submission</h2>
                <span className={styles.panelNote}>
                  {raw ? `${Object.keys(raw).length} fields captured` : 'Not captured'} · {formatDate(lead.createdAt)}
                </span>
              </div>
            </div>
            {raw && Object.keys(raw).length > 0 ? (
              <dl className={styles.dl}>
                {Object.entries(raw).map(([k, v]) => (
                  <RawPair key={k} k={k} v={v} flagged={extraKeys.includes(k)} />
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

          {/* Fit finder answers (if taken) */}
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
                    <Fragment key={key}>
                      <dt>{questionFor(key) ?? key}</dt>
                      <dd>
                        {a.label}
                        {a.note && <span className={styles.answerNote}> — {a.note}</span>}
                      </dd>
                    </Fragment>
                  );
                })}
              </dl>

              {q.result && (
                <>
                  <div className={styles.panelHead} style={{ borderTop: '1px solid #edf0f6' }}>
                    <h2 className={styles.panelTitle}>The quote they were shown</h2>
                    <span className={styles.panelNote}>Priced when submitted, not recalculated</span>
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
        </div>
      </div>
    </>
  );
}

/**
 * One label/value pair on the context strip.
 *
 * Every label is a bare word. Two of these used to read "Page =" and
 * "Referrer =" while the third read "Source", which is the kind of difference
 * that makes a reader stop and wonder what the equals sign means.
 */
function ContextItem({
  label, value, fallback, mono,
}: { label: string; value?: string | null; fallback?: string; mono?: boolean }) {
  return (
    <div className={styles.leadContextItem}>
      <span className={styles.leadContextLabel}>{label}</span>
      <span className={`${styles.leadContextValue} ${mono ? styles.mono : ''}`}>
        {value || fallback || <span className={styles.none}>Not recorded</span>}
      </span>
    </div>
  );
}

function Divider() {
  return <span className={styles.leadContextDivider} aria-hidden="true" />;
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
function RawPair({ k, v, flagged }: { k: string; v: string; flagged: boolean }) {
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
