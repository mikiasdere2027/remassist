import Link from 'next/link';
import { desc, eq, isNull, sql } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { leads, quizSubmissions } from '@/db/schema';
import { requireUser } from '@/lib/auth/require';
import { answerFor, formatDate, orderedAnswers, questionFor } from '@/lib/leads/display';
import styles from '../../admin.module.css';
import AdminTopbar from '../AdminTopbar';
import AnswerAccordion from './AnswerAccordion';

/**
 * Fit finder submissions.
 *
 * The reason this screen exists: a submission whose lead_id is null appears
 * nowhere else. The lead detail page renders quiz answers, but only the ones
 * joined to that lead — so somebody who worked through the quiz and then chose
 * not to leave their details produced a record no human could read. That is
 * demand the business has already paid to generate and then cannot see.
 *
 * Read-only, and both roles may see it: it is the same lead data by another
 * route, and canViewLeads is true for a manager.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Fit finder',
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 50;

export default async function QuizzesPage({
  searchParams,
}: {
  searchParams: Promise<{ only?: string }>;
}) {
  const [, sp] = await Promise.all([requireUser(), searchParams]);
  const anonymousOnly = sp.only === 'anonymous';

  if (!isDatabaseConfigured()) {
    return (
      <>
        <Topbar total={null} anonymousOnly={anonymousOnly} />
        <div className={styles.view}>
          <div className={styles.notice}>
            <strong>No database configured</strong>
            There is no <code>DATABASE_URL</code> in this environment, so there are no
            submissions to show.
          </div>
        </div>
      </>
    );
  }

  const db = getDb();
  const [rows, allCountRes, anonCountRes] = await Promise.all([
    db
      .select({
        id: quizSubmissions.id,
        createdAt: quizSubmissions.createdAt,
        answers: quizSubmissions.answers,
        result: quizSubmissions.result,
        completed: quizSubmissions.completed,
        leadId: quizSubmissions.leadId,
        leadEmail: leads.email,
        leadName: leads.name,
      })
      .from(quizSubmissions)
      .leftJoin(leads, eq(quizSubmissions.leadId, leads.id))
      .where(anonymousOnly ? isNull(quizSubmissions.leadId) : undefined)
      .orderBy(desc(quizSubmissions.createdAt))
      .limit(PAGE_SIZE),
    db.select({ count: sql<number>`count(*)::int` }).from(quizSubmissions),
    db.select({ count: sql<number>`count(*)::int` }).from(quizSubmissions).where(isNull(quizSubmissions.leadId)),
  ]);

  const totalCount = Number(allCountRes[0]?.count ?? 0);
  const anonCount = Number(anonCountRes[0]?.count ?? 0);

  return (
    <>
      <Topbar total={totalCount} anonymousOnly={anonymousOnly} />

      <div className={styles.view}>
        <div className={styles.filterbar}>
          <div className={styles.filterPills} role="group" aria-label="Filter fit finder submissions">
            <Tab
              href="/admin/quizzes"
              on={!anonymousOnly}
              label="All submissions"
              count={totalCount}
            />
            <Tab
              href="/admin/quizzes?only=anonymous"
              on={anonymousOnly}
              label="No contact details"
              count={anonCount}
            />
          </div>
        </div>

        {rows.length === 0 ? (
          <div className={styles.panel}>
            <p className={styles.empty}>
              <strong>{anonymousOnly ? 'Nobody abandoned the quiz' : 'No submissions yet'}</strong>
              {anonymousOnly
                ? 'Every submission so far came with contact details, which is the outcome you want.'
                : 'The fit finder on the home page and /qualify both write here.'}
            </p>
          </div>
        ) : (
          rows.map((q) => {
            /* Computed once so the accordion can say how many questions were
               answered without the visitor having to open it. */
            const answerPairs = orderedAnswers(q.answers);
            return (
              <section className={`${styles.panel} ${styles.section}`} key={q.id}>
                <div className={styles.panelHead}>
                  <div>
                    <h2 className={styles.panelTitle}>
                      {q.leadId
                        ? (q.leadName ?? q.leadEmail ?? 'Linked lead')
                        : 'Anonymous — no contact details'}
                      {/* Email sits on the same line as the name, not under it:
                          the card head is one row, name · email on the left,
                          date · Open the lead on the right. */}
                      {q.leadId && q.leadEmail && (
                        <span className={styles.panelTitleMeta}>
                          <span aria-hidden="true"> · </span>
                          <span className={styles.mono}>{q.leadEmail}</span>
                        </span>
                      )}
                    </h2>
                  </div>
                  <span className={`${styles.panelNote} ${styles.panelHeadNote}`}>
                    <span className={styles.mono}>{formatDate(q.createdAt)}</span>
                    {!q.completed && <span className={styles.tag}>Partial</span>}
                    {/* No · before it any more: the separator belongs between
                        runs of text, and this is a button sitting beside one. */}
                    {q.leadId && (
                      <Link className={styles.panelHeadLink} href={`/admin/leads/${q.leadId}`}>
                        <span>Open the lead</span>
                        {/* Points at where the link goes — the lead record on
                            its own page, not a panel that opens in place. */}
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M5 12h13M13 6l6 6-6 6" />
                        </svg>
                      </Link>
                    )}
                  </span>
                </div>

                {/* One mini card per figure, so the list scans as columns of
                    service line, tier and price. The answers that produced the
                    estimate fold away behind the bottom arrow. */}
                {q.result && (
                  <div className={styles.estimateGrid}>
                    <Quote label="Service" value={q.result.service} />
                    <Quote label="Tier" value={q.result.tier} />
                    <Quote label="Seats" value={q.result.seats} />
                    <Quote label="Hours" value={q.result.hours} />
                    <Quote label="Rate" value={q.result.rate ? `$${q.result.rate}/hr` : undefined} />
                    <Quote label="Estimate" value={q.result.cost} />
                  </div>
                )}

                {!q.leadId && (
                  <p className={styles.panelIntro}>
                    {/* Said plainly, because the instinct on seeing an interesting
                        answer set is to look for the person attached to it. */}
                    This person did not leave an address, so there is nobody to reply to. The
                    answers are still worth reading as demand.
                  </p>
                )}

                <AnswerAccordion count={answerPairs.length}>
                  <div className={styles.answerList}>
                    {answerPairs.map(([key, value], i) => {
                      const a = answerFor(key, value);
                      return (
                        <div className={styles.answerCard} key={key}>
                          <span className={styles.answerNum}>{i + 1}</span>
                          <div className={styles.answerBody}>
                            <span className={styles.answerQ}>{questionFor(key) ?? key}</span>
                            <span className={styles.answerA}>
                              {a.label}
                              {a.note && <span className={styles.answerNote}> — {a.note}</span>}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AnswerAccordion>
              </section>
            );
          })
        )}

        {rows.length === PAGE_SIZE && (
          <p className={styles.panelNote}>
            Showing the {PAGE_SIZE} most recent. Older submissions are not paged yet.
          </p>
        )}
      </div>
    </>
  );
}

function Quote({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className={styles.estimateCard}>
      <span className={styles.estimateLabel}>{label}</span>
      <span className={styles.estimateValue}>
        {value ?? <span className={styles.none}>—</span>}
      </span>
    </div>
  );
}

function Topbar({ total, anonymousOnly }: { total: number | null; anonymousOnly: boolean }) {
  return (
    <AdminTopbar
      title="Fit finder"
      subtitle={
        total === null
          ? 'Database not configured'
          : anonymousOnly
            ? `${total} with no contact details`
            : `${total} submissions`
      }
    />
  );
}

function Tab({
  href,
  on,
  label,
  count,
}: {
  href: string;
  on: boolean;
  label: string;
  count?: number;
}) {
  return (
    <Link
      className={`${styles.fbtn} ${on ? styles.fbtnOn : ''}`}
      href={href}
      aria-current={on ? 'true' : undefined}
    >
      {label}
      {count !== undefined && <span className={styles.fbtnCount}>{count}</span>}
    </Link>
  );
}

