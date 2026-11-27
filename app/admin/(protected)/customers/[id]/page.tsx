import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/require';
import { isApiError } from '@/lib/api/errors';
import { apiServer } from '@/lib/api/server';
import { ENGAGEMENT_STATUSES, FILE_KIND_LABELS, fileUrl, type EngagementPage } from '@/lib/api/crm';
import type { Assignee } from '@/lib/api/leads';
import { ENGAGEMENT_STATUS_LABELS, rolesToText, seatCount } from '@/lib/crm/engagements';
import { formatMoney } from '@/lib/crm/money';
import { formatBytes, initials } from '@/lib/crm/display';
import { SERVICES } from '@/lib/services';
import AdminTopbar from '../../AdminTopbar';
import { BackLink, KV, TasksCard, TimelineCard } from '../../CrmParts';
import { Composer, InlineSelect, LocalTime } from '../../leads/[id]/LeadClient';
import { Checklist, ContractForm, RemoveFile, RolesForm, StatusControl, TermsForm, UploadForm } from '../CustomerClient';
import admin from '../../../admin.module.css';
import s from '../../crm.module.css';

/**
 * Customer — one engagement. Engagement (what they buy and who delivers it),
 * Contract (dates, renewal and private files) and Delivery
 * (onboarding) tabs; the company
 * and its people on the left; status, revenue and renewal on the right.
 */
export const dynamic = 'force-dynamic';

const TABS = [
  { key: 'engagement', label: 'Engagement' },
  { key: 'contract', label: 'Contract' },
  { key: 'delivery', label: 'Delivery' },
] as const;
type Tab = (typeof TABS)[number]['key'];

export default async function CustomerPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const me = await requireUser();
  let e: EngagementPage;
  let team: Assignee[];
  try {
    [e, team] = await Promise.all([
      apiServer<EngagementPage>(`/admin/customers/${id}`),
      apiServer<Assignee[]>('/admin/leads/assignees'),
    ]);
  } catch (err) {
    if (isApiError(err, 404) || isApiError(err, 400)) notFound();
    throw err;
  }
  const { company, deal, contacts, timeline, tasks } = e;

  const tab: Tab = TABS.some((t) => t.key === sp.tab) ? (sp.tab as Tab) : 'engagement';
  const roles = e.roles ?? [];
  const steps = e.onboarding ?? [];
  /* Worked out by the backend: onboarding progress and the renewal's state. */
  const ob = e.progress;
  const rn = e.renewal;
  const names = new Map(team.map((m) => [m.id, m.name]));
  const name = company?.name ?? e.title;
  const services = SERVICES.map((x) => x.name).filter((n) => n !== 'All Services');
  const href = (t: Tab) => (t === 'engagement' ? `/admin/customers/${e.id}` : `/admin/customers/${e.id}?tab=${t}`);

  return (
    <>
      <AdminTopbar title={name} subtitle={[e.service, ENGAGEMENT_STATUS_LABELS[e.status]].filter(Boolean).join(' · ')} />
      <div className={admin.view}>
        <BackLink href="/admin/customers">Back to customers</BackLink>
        <div className={s.layout}>
          <aside className={s.profileCol} aria-label="Customer profile">
            <div className={s.card}>
              <div className={s.identity}>
                <span className={s.avatar} aria-hidden="true">{initials(name)}</span>
                <h2 className={s.personName}>{company ? <Link href={`/admin/companies/${company.id}`}>{company.name}</Link> : e.title}</h2>
                <p className={s.personSub}>{company?.domain ?? e.title}</p>
              </div>
              <div className={s.section}>
                <InlineSelect
                  id="eng-owner"
                  label="Account manager"
                  value={e.ownerId ?? ''}
                  placeholder="Unassigned"
                  options={team.map((m) => ({ value: m.id, label: m.id === me.id ? `${m.name} (me)` : m.name }))}
                  record={{ kind: 'engagement', id: e.id }}
                  field="owner"
                />
              </div>
              <div className={s.section}>
                <h3 className={s.sectionTitle}>People ({contacts.length})</h3>
                {contacts.length === 0 ? <p className={s.cardNote}>No contacts. Add them on the company page.</p> : (
                  <ul className={s.taskList}>
                    {contacts.map((c) => {
                      const n = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || 'Unnamed';
                      return (
                        <li key={c.id} className={s.contactItem}>
                          <span className={s.taskTitle}>{n}{c.isPrimary && <span className={s.cardNote}> · primary</span>}</span>
                          <span className={s.taskMeta}>
                            {c.email && <a href={`mailto:${c.email}`}>{c.email}</a>}
                            {c.phone && <a href={`tel:${c.phone.replace(/[^\d+]/g, '')}`}>{c.phone}</a>}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <div className={s.section}>
                <h3 className={s.sectionTitle}>History</h3>
                <KV label="Customer since"><LocalTime iso={e.createdAt} mode="date" /></KV>
                <KV label="Won deal">{deal?.id ? <Link href={`/admin/deals/${deal.id}`}>{deal.title}</Link> : 'Added directly'}</KV>
              </div>
            </div>
          </aside>

          <div className={s.mainCol}>
            <nav className={s.tabs} aria-label="Customer sections">
              {TABS.map((t) => (
                <Link key={t.key} href={href(t.key)} scroll={false} className={`${s.tab} ${tab === t.key ? s.tabOn : ''}`} aria-current={tab === t.key ? 'page' : undefined}>
                  {t.label}{t.key === 'delivery' && ob.total > 0 ? ` ${ob.done}/${ob.total}` : ''}
                </Link>
              ))}
            </nav>

            {tab === 'engagement' && (
              <>
                <section className={s.card}>
                  <div className={s.cardHead}>
                    <h2 className={s.cardTitle}>Roles and staff placed</h2>
                    <span className={s.cardNote}>{seatCount(roles)} {seatCount(roles) === 1 ? 'seat' : 'seats'}</span>
                  </div>
                  {roles.length > 0 && (
                    <div className={s.cardBody}>
                      <ul className={s.roleList}>
                        {roles.map((r, i) => (
                          <li key={`${r.role}-${i}`}>
                            <b>{r.role}</b>
                            <span>{r.seats} {r.seats === 1 ? 'seat' : 'seats'}{r.hoursPerMonth ? ` · ${r.hoursPerMonth} h/mo` : ''}</span>
                            <span className={s.cardNote}>{r.staff && r.staff.length ? r.staff.join(', ') : 'Not staffed yet'}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <RolesForm engagementId={e.id} text={rolesToText(roles)} />
                </section>
                <section className={s.card}>
                  <div className={s.cardHead}>
                    <h2 className={s.cardTitle}>Terms</h2>
                    <span className={s.cardNote}>What they pay each month</span>
                  </div>
                  <TermsForm
                    engagementId={e.id}
                    services={services}
                    values={{ title: e.title, service: e.service, monthlyValue: e.monthlyValueCents ? String(e.monthlyValueCents / 100) : '' }}
                  />
                </section>
              </>
            )}

            {tab === 'contract' && (
              <section className={s.card}>
                <div className={s.cardHead}>
                  <h2 className={s.cardTitle}>Contract</h2>
                  <span className={s.cardNote}>Dates drive the renewal reminders</span>
                </div>
                <ContractForm
                  engagementId={e.id}
                  values={{ startDate: e.startDate, contractEnd: e.contractEnd, renewalDate: e.renewalDate, noticeDays: e.noticeDays }}
                />
                <div className={s.cardHead} style={{ borderTop: '1px solid var(--hairline)' }}>
                  <h3 className={s.cardTitle}>Files</h3>
                  <span className={s.cardNote}>{e.files.length} {e.files.length === 1 ? 'file' : 'files'}</span>
                </div>
                {e.files.length > 0 && (
                  <ul className={s.fileList}>
                    {e.files.map((f) => (
                      <li key={f.id} className={s.fileItem}>
                        <a href={fileUrl(f.id)} target="_blank" rel="noopener">{f.name}</a>
                        <RemoveFile fileId={f.id} name={f.name} />
                        <span className={s.cardNote}>
                          {FILE_KIND_LABELS[f.kind]} · {formatBytes(f.sizeBytes)} · {f.uploaderName?.trim() || 'Unknown'} · <LocalTime iso={f.createdAt} mode="date" />
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <UploadForm engagementId={e.id} />
              </section>
            )}

            {tab === 'delivery' && (
              <section className={s.card}>
                <div className={s.cardHead}>
                  <h2 className={s.cardTitle}>Onboarding</h2>
                  <span className={s.cardNote}>{ob.complete ? 'Complete' : `${ob.done} of ${ob.total} done`}{e.status === 'onboarding' ? ' · the last step makes them Active' : ''}</span>
                </div>
                <div className={s.cardBody}>
                  <div className={s.scoreBar}><div className={s.scoreFill} style={{ width: `${ob.pct}%` }} /></div>
                  <Checklist
                    engagementId={e.id}
                    steps={steps.map((st) => ({ key: st.key, label: st.label, doneAt: st.doneAt ?? null, doneByName: st.doneBy ? names.get(st.doneBy) ?? null : null }))}
                  />
                </div>
              </section>
            )}

            <Composer
              record={{ kind: 'engagement', id: e.id }}
              team={team}
              me={me.id}
            />
            <TimelineCard items={timeline} subject="customer" />
          </div>

          <aside className={s.railCol} aria-label="Customer status">
            <section className={s.card}>
              <div className={s.cardBody}>
                <StatusControl
                  engagementId={e.id}
                  current={e.status}
                  options={ENGAGEMENT_STATUSES.map((x) => ({ value: x, label: ENGAGEMENT_STATUS_LABELS[x] }))}
                />
                <span className={s.kvLabel}>Monthly recurring revenue</span>
                <span className={s.scoreBig}>{formatMoney(e.monthlyValueCents, e.currency)}<span className={s.cardNote}> /mo</span></span>
                <KV label="Annual value">{formatMoney(e.monthlyValueCents * 12, e.currency)}</KV>
                {e.status === 'churned' && <KV label="Why they left">{e.churnReason}</KV>}
              </div>
            </section>
            <section className={s.card}>
              <div className={s.cardBody}>
                <span className={s.kvLabel}>Renewal</span>
                <div className={`${s.clock} ${rn?.overdue || rn?.noticePassed ? s.clockLate : ''}`}>
                  <span className={s.clockRing} aria-hidden="true" />
                  <div>
                    <div className={s.clockValue}>
                      {!rn ? 'No date set' : rn.overdue ? `${-rn.daysLeft} days overdue` : `${rn.daysLeft} days`}
                    </div>
                    <div className={s.clockLabel}>
                      {rn ? `Renews ${e.renewalDate}` : 'Set it on the Contract tab'}
                      {rn?.noticeBy ? ` · notice by ${rn.noticeBy}${rn.noticePassed ? ' (passed)' : ''}` : ''}
                    </div>
                  </div>
                </div>
                <KV label="Started">{e.startDate}</KV>
                <KV label="Contract ends">{e.contractEnd}</KV>
                <KV label="Onboarding">{ob.total ? `${ob.pct}% · ${ob.done} of ${ob.total}` : null}</KV>
              </div>
            </section>
            <TasksCard tasks={tasks} emptyHint="No open tasks. Add the next step below." />
          </aside>
        </div>
      </div>
    </>
  );
}
