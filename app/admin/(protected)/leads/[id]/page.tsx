import { Fragment } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isDatabaseConfigured } from '@/db';
import {
  SOURCE_LABELS, answerFor, formatDate, formatUtm, orderedAnswers, questionFor, unknownRawKeys,
} from '@/lib/leads/display';
import { requireUser } from '@/lib/auth/require';
import { currentWorkspaceId } from '@/lib/crm/workspace';
import { getLeadDetail, getLeadFieldDefs, getTeam, type TimelineItem } from '@/lib/crm/leads';
import { scoreLead } from '@/lib/crm/scoring';
import {
  CALL_OUTCOME_LABELS, PRIORITIES, PRIORITY_LABELS, STATUS_LABELS, formatDuration, initials, responseClock,
  type CallOutcome,
} from '@/lib/crm/display';
import type { QuizResult } from '@/lib/quiz/quiz';
import StatusForm from './StatusForm';
import { Composer, InlineSelect, LocalTime, QualificationForm, TaskCheck } from './LeadClient';
import {
  addLeadNote, addLeadTask, logLeadCall, saveQualification, setLeadOwner, setLeadPriority, setTaskDone,
} from './actions';
import AdminTopbar from '../../AdminTopbar';
import admin from '../../../admin.module.css';
import s from '../../crm.module.css';

/**
 * Lead detail — the CRM's main working screen (phase 1).
 *
 * Profile on the left, Inquiry / Qualification / Conversion in the middle with
 * the composer and timeline under them, status rail on the right — after the
 * reference CRM's "Lead's information" layout.
 *
 * Still true from the original page: everything the visitor submitted is on
 * this page (Inquiry tab, with the raw submission under it), and an empty
 * value says so rather than vanishing.
 */
export const dynamic = 'force-dynamic';

const TABS = [
  { key: 'inquiry', label: 'Inquiry' },
  { key: 'qualification', label: 'Qualification' },
  { key: 'conversion', label: 'Conversion' },
] as const;
type Tab = (typeof TABS)[number]['key'];

export default async function LeadDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!isDatabaseConfigured()) notFound();
  /* A malformed id would make Postgres throw on the uuid cast — a 500 for
     what is really a bad URL. */
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const me = await requireUser();
  const ws = currentWorkspaceId();
  const [detail, defs, team] = await Promise.all([getLeadDetail(ws, id), getLeadFieldDefs(ws), getTeam()]);
  if (!detail) notFound();
  const { lead, quizzes, timeline, tasks } = detail;

  const tab: Tab = TABS.some((t) => t.key === sp.tab) ? (sp.tab as Tab) : 'inquiry';
  const custom = (lead.custom ?? {}) as Record<string, unknown>;
  const quiz = quizzes[0];
  const quote = quiz?.result as Partial<QuizResult> | undefined;
  const score = scoreLead({
    source: lead.source,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    message: lead.message,
    serviceInterest: lead.serviceInterest,
    quiz: quiz ? { completed: quiz.completed, seats: Number(quote?.seats) || 0, timing: quiz.answers?.timing } : null,
  });
  const clock = responseClock(lead.createdAt, lead.firstContactedAt, new Date(), lead.status);
  const openTasks = tasks.filter((t) => !t.doneAt);
  const doneTasks = tasks.filter((t) => t.doneAt);
  const displayName = lead.name || lead.email;
  const ownerOptions = team.map((m) => ({ value: m.id, label: m.id === me.id ? `${m.name} (me)` : m.name }));
  const raw = lead.rawFields ?? null;
  const extraKeys = unknownRawKeys(raw);
  const campaign = formatUtm(lead.utm);

  return (
    <>
      <AdminTopbar
        title={displayName}
        subtitle={[lead.company, SOURCE_LABELS[lead.source] ?? lead.source].filter(Boolean).join(' · ')}
        action={<StatusForm id={lead.id} current={lead.status} />}
      />

      <div className={admin.view}>
        <Link className={admin.memberBackBtn} href="/admin/leads">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to leads
        </Link>

        <div className={s.layout}>
          {/* ── profile ── */}
          <aside className={s.profileCol} aria-label="Lead profile">
            <div className={s.card}>
              <div className={s.identity}>
                <span className={s.avatar} aria-hidden="true">{initials(displayName)}</span>
                <h2 className={s.personName}>{displayName}</h2>
                <p className={s.personSub}>{lead.company || 'No company given'}</p>
              </div>
              <div className={s.section}>
                <InlineSelect
                  id="lead-owner"
                  label="Owner"
                  value={lead.ownerId ?? ''}
                  placeholder="Unassigned"
                  options={ownerOptions}
                  action={setLeadOwner.bind(null, lead.id)}
                />
              </div>
              <div className={s.section}>
                <h3 className={s.sectionTitle}>Contact</h3>
                <KV label="Email"><a href={`mailto:${lead.email}`}>{lead.email}</a></KV>
                <KV label="Phone">{lead.phone ? <a href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`}>{lead.phone}</a> : null}</KV>
                <KV label="Country">{lead.country}</KV>
                <KV label="Privacy consent">{lead.consentAt ? <>Agreed <LocalTime iso={lead.consentAt.toISOString()} mode="date" /></> : null}</KV>
              </div>
              <div className={s.section}>
                <h3 className={s.sectionTitle}>Source</h3>
                <KV label="Channel">{SOURCE_LABELS[lead.source] ?? lead.source}</KV>
                <KV label="Received"><LocalTime iso={lead.createdAt.toISOString()} /></KV>
                <KV label="Campaign">{campaign || 'None'}</KV>
                <KV label="Landing page">{lead.pageUrl}</KV>
                <KV label="Referrer">{lead.referrer || 'Direct / none'}</KV>
              </div>
            </div>
          </aside>

          {/* ── main ── */}
          <div className={s.mainCol}>
            <div className={s.mainHead}>
              <nav className={s.tabs} aria-label="Lead sections">
                {TABS.map((t) => (
                  <Link
                    key={t.key}
                    href={t.key === 'inquiry' ? `/admin/leads/${lead.id}` : `/admin/leads/${lead.id}?tab=${t.key}`}
                    className={`${s.tab} ${tab === t.key ? s.tabOn : ''}`}
                    aria-current={tab === t.key ? 'page' : undefined}
                    scroll={false}
                  >
                    {t.label}
                  </Link>
                ))}
              </nav>
            </div>

            {tab === 'inquiry' && (
              <>
                <section className={s.card}>
                  <div className={s.cardHead}>
                    <h2 className={s.cardTitle}>What they asked for</h2>
                    <span className={s.cardNote}>Submitted {formatDate(lead.createdAt)}</span>
                  </div>
                  <div className={s.cardBody}>
                    <div className={s.fieldGrid}>
                      <KV label="Service interest">{lead.serviceInterest}</KV>
                      <KV label="Name given">{[lead.firstName, lead.lastName].filter(Boolean).join(' ') || lead.name}</KV>
                      <div className={s.fieldWide}>
                        <KV label="Message">{lead.message ? <p className={s.message}>{lead.message}</p> : null}</KV>
                      </div>
                    </div>
                  </div>
                </section>

                {quizzes.map((q) => (
                  <section key={q.id} className={s.card}>
                    <div className={s.cardHead}>
                      <h2 className={s.cardTitle}>Fit finder answers</h2>
                      <span className={s.cardNote}>{q.completed ? 'Completed' : 'Partial'} · {formatDate(q.createdAt)}</span>
                    </div>
                    <dl className={admin.qa}>
                      {orderedAnswers(q.answers).map(([key, value]) => {
                        const a = answerFor(key, value);
                        return (
                          <Fragment key={key}>
                            <dt>{questionFor(key) ?? key}</dt>
                            <dd>
                              {a.label}
                              {a.note && <span className={admin.answerNote}> — {a.note}</span>}
                            </dd>
                          </Fragment>
                        );
                      })}
                    </dl>
                    {q.result && (
                      <>
                        <div className={s.cardHead} style={{ borderTop: '1px solid var(--hairline)' }}>
                          <h2 className={s.cardTitle}>The quote they were shown</h2>
                          <span className={s.cardNote}>Snapshot as shown, not recalculated</span>
                        </div>
                        <div className={admin.quote}>
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

                <details className={s.card}>
                  <summary className={s.cardHead} style={{ cursor: 'pointer' }}>
                    <span className={s.cardTitle}>Raw submission</span>
                    <span className={s.cardNote}>
                      {raw ? `${Object.keys(raw).length} fields captured` : 'Not captured'} · Lead ID {lead.id}
                    </span>
                  </summary>
                  {raw && Object.keys(raw).length > 0 ? (
                    <dl className={admin.dl}>
                      {Object.entries(raw).map(([k, v]) => (
                        <Fragment key={k}>
                          <dt className={admin.mono}>
                            {k}
                            {extraKeys.includes(k) && <span className={admin.tag}>new</span>}
                          </dt>
                          <dd>{v ? <p className={admin.pre}>{v}</p> : <span className={admin.none}>Empty</span>}</dd>
                        </Fragment>
                      ))}
                    </dl>
                  ) : (
                    <p className={admin.empty}>
                      <strong>Nothing captured</strong>
                      This lead predates raw-field capture, or arrived from a surface that does not send one.
                    </p>
                  )}
                </details>
              </>
            )}

            {tab === 'qualification' && (
              <section className={s.card}>
                <div className={s.cardHead}>
                  <h2 className={s.cardTitle}>Qualification</h2>
                  <span className={s.cardNote}>Is this a fit, and what would they buy?</span>
                </div>
                <QualificationForm defs={defs} values={custom} action={saveQualification.bind(null, lead.id)} />
              </section>
            )}

            {tab === 'conversion' && (
              <section className={s.card}>
                <div className={s.cardHead}>
                  <h2 className={s.cardTitle}>Ready to convert?</h2>
                  <span className={s.cardNote}>Converting creates the company, contact and deal</span>
                </div>
                <div className={s.cardBody}>
                  <ul className={s.checklist}>
                    <Check ok={Boolean(lead.ownerId)}>Has an owner</Check>
                    <Check ok={['qualified', 'converted', 'won'].includes(lead.status)}>Status is Qualified</Check>
                    <Check ok={Boolean(lead.company)}>Company is known</Check>
                    <Check ok={Array.isArray(custom.services_needed) && custom.services_needed.length > 0}>Services needed are recorded</Check>
                    <Check ok={Boolean(custom.budget) && custom.budget !== 'Not shared'}>Budget is known</Check>
                    <Check ok={Boolean(custom.decision_maker)}>Decision maker is identified</Check>
                  </ul>
                  <p className={s.cardNote}>
                    Converting a lead into a deal arrives with the Deals pipeline (phase 2). Until then, use this list
                    to see what is still missing.
                  </p>
                </div>
              </section>
            )}

            <Composer
              note={addLeadNote.bind(null, lead.id)}
              call={logLeadCall.bind(null, lead.id)}
              task={addLeadTask.bind(null, lead.id)}
              team={team}
              me={me.id}
            />

            <section className={s.card}>
              <div className={s.cardHead}>
                <h2 className={s.cardTitle}>Activity</h2>
                <span className={s.cardNote}>{timeline.length} {timeline.length === 1 ? 'entry' : 'entries'}</span>
              </div>
              {timeline.length === 0 ? (
                <p className={admin.empty}>
                  <strong>No activity yet</strong>
                  Notes, calls, tasks and status changes will appear here.
                </p>
              ) : (
                <ol className={s.timeline}>
                  {timeline.map((a) => <TimelineEntry key={a.id} a={a} />)}
                </ol>
              )}
            </section>
          </div>

          {/* ── rail ── */}
          <aside className={s.railCol} aria-label="Lead status">
            <section className={s.card}>
              <div className={s.cardBody}>
                <div className={s.statRow}>
                  <span className={s.kvLabel}>Lead score</span>
                  <span className={`${s.badge} ${s[`p_${score.priority}`]}`}>{PRIORITY_LABELS[score.priority]} score</span>
                </div>
                <span className={s.scoreBig}>{score.score}<span className={s.cardNote}> / 100</span></span>
                <div className={s.scoreBar}><div className={s.scoreFill} style={{ width: `${score.score}%` }} /></div>
                {score.reasons.length > 0 && (
                  <ul className={s.reasons} aria-label="Why this score">
                    {score.reasons.map((r) => <li key={r}>{r}</li>)}
                  </ul>
                )}
                <InlineSelect
                  id="lead-priority"
                  label="Priority"
                  value={lead.priority}
                  options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))}
                  action={setLeadPriority.bind(null, lead.id)}
                />
              </div>
            </section>

            <section className={s.card}>
              <div className={s.cardBody}>
                <span className={s.kvLabel}>First response</span>
                <div className={`${s.clock} ${clock.late ? s.clockLate : ''}`}>
                  <span className={s.clockRing} aria-hidden="true" />
                  <div>
                    <div className={s.clockValue}>{clock.state === 'unknown' ? 'Not recorded' : formatDuration(clock.ms)}</div>
                    <div className={s.clockLabel}>
                      {clock.state === 'responded' ? 'to first contact'
                        : clock.state === 'waiting' ? 'waiting for first contact'
                        : 'contacted before response times were tracked'}
                      {clock.late ? ' · over the 24h target' : ''}
                    </div>
                  </div>
                </div>
                <KV label="Next follow-up">
                  {lead.nextFollowUpAt ? <LocalTime iso={lead.nextFollowUpAt.toISOString()} /> : null}
                </KV>
                <KV label="Status">{STATUS_LABELS[lead.status] ?? lead.status}</KV>
              </div>
            </section>

            <section className={s.card}>
              <div className={s.cardHead}>
                <h2 className={s.cardTitle}>Tasks</h2>
                <span className={s.cardNote}>{openTasks.length} open</span>
              </div>
              <div className={s.cardBody}>
                {openTasks.length === 0 ? (
                  <p className={s.cardNote}>No open tasks. Add one below the tabs to schedule the next follow-up.</p>
                ) : (
                  <TaskItems items={openTasks} />
                )}
                {doneTasks.length > 0 && (
                  <details>
                    <summary className={s.doneToggle}>{doneTasks.length} completed</summary>
                    <TaskItems items={doneTasks} />
                  </details>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}

function KV({ label, children }: { label: string; children: React.ReactNode }) {
  const empty = children === null || children === undefined || children === '';
  return (
    <div className={s.kv}>
      <span className={s.kvLabel}>{label}</span>
      <span className={s.kvValue}>{empty ? <span className={s.muted}>Not provided</span> : children}</span>
    </div>
  );
}

function Check({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li>
      <span className={`${s.tick} ${ok ? s.tickOk : ''}`} aria-hidden="true">{ok ? '✓' : '·'}</span>
      <span>{children}<span className={admin.srOnly}>{ok ? ' (done)' : ' (missing)'}</span></span>
    </li>
  );
}

function Quote({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className={admin.quoteItem}>
      <span className={admin.quoteLabel}>{label}</span>
      <span className={admin.quoteValue}>
        {value === undefined || value === null || value === '' ? <span className={admin.none}>—</span> : value}
      </span>
    </div>
  );
}

function TaskItems({ items }: { items: Array<{ id: string; title: string; dueAt: Date | null; doneAt: Date | null; priority: string; assigneeName: string | null; assigneeEmail: string | null }> }) {
  const now = Date.now();
  return (
    <ul className={s.taskList}>
      {items.map((t) => {
        const overdue = !t.doneAt && t.dueAt && t.dueAt.getTime() < now;
        return (
          <li key={t.id} className={`${s.task} ${t.doneAt ? s.taskDone : ''}`}>
            <TaskCheck id={t.id} title={t.title} done={Boolean(t.doneAt)} action={setTaskDone} />
            <div>
              <div className={s.taskTitle}>{t.title}</div>
              <div className={s.taskMeta}>
                {t.dueAt && (
                  <span className={overdue ? s.overdue : undefined}>
                    {overdue ? 'Overdue · ' : 'Due '}<LocalTime iso={t.dueAt.toISOString()} />
                  </span>
                )}
                <span>{t.assigneeName || t.assigneeEmail || 'Unassigned'}</span>
                {t.priority === 'high' && <span className={s.overdue}>High</span>}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

const ICONS: Record<string, React.ReactNode> = {
  note: <path d="M4 4h12l4 4v12H4zM8 10h8M8 14h8M8 18h5" />,
  call: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />,
  status_change: <path d="M4 12h12M12 6l6 6-6 6" />,
  owner_change: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  system: <><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" /></>,
};

function TimelineEntry({ a }: { a: TimelineItem }) {
  const who = a.actorName?.trim() || a.actorEmail || 'System';
  const meta = (a.meta ?? {}) as Record<string, unknown>;
  let head: React.ReactNode;
  let body: string | null = a.body;

  switch (a.type) {
    case 'note':
      head = <><b>{who}</b> added a note</>;
      break;
    case 'call': {
      const outcome = CALL_OUTCOME_LABELS[meta.outcome as CallOutcome] ?? 'Call';
      const mins = Math.round(Number(meta.durationSec ?? 0) / 60);
      head = <><b>{who}</b> logged a call · {outcome}{mins > 0 ? ` · ${mins} min` : ''}</>;
      break;
    }
    case 'status_change':
      head = <><b>{who}</b> changed status: {STATUS_LABELS[String(meta.from)] ?? String(meta.from)} → <b>{STATUS_LABELS[String(meta.to)] ?? String(meta.to)}</b></>;
      body = null;
      break;
    case 'owner_change':
      head = meta.to
        ? <><b>{who}</b> assigned the lead to <b>{String(meta.toName ?? 'someone')}</b></>
        : <><b>{who}</b> unassigned the lead</>;
      body = null;
      break;
    default:
      head = a.actorName || a.actorEmail ? <><b>{who}</b> · {a.body}</> : <>{a.body}</>;
      body = null;
  }

  const reasons = Array.isArray(meta.reasons) ? (meta.reasons as string[]) : null;
  return (
    <li className={s.event}>
      <span className={`${s.eventIcon} ${s[`ev_${a.type}`] ?? ''}`} aria-hidden="true">
        <svg viewBox="0 0 24 24">{ICONS[a.type] ?? ICONS.system}</svg>
      </span>
      <div>
        <div className={s.eventHead}>
          <span>{head}</span>
          <span className={s.eventTime}><LocalTime iso={a.occurredAt.toISOString()} /></span>
        </div>
        {body && <p className={s.eventBody}>{body}</p>}
        {reasons && reasons.length > 0 && (
          <ul className={s.reasons} aria-label="Score reasons">{reasons.map((r) => <li key={r}>{r}</li>)}</ul>
        )}
      </div>
    </li>
  );
}

