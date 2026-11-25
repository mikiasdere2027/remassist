import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isDatabaseConfigured } from '@/db';
import { requireUser } from '@/lib/auth/require';
import { currentWorkspaceId } from '@/lib/crm/workspace';
import { getCompanyDetail } from '@/lib/crm/deals';
import { engagementsForCompany } from '@/lib/crm/engagementsData';
import { ENGAGEMENT_STATUS_LABELS, type EngagementStatus } from '@/lib/crm/engagements';
import { getTeam } from '@/lib/crm/leads';
import { formatMoney } from '@/lib/crm/money';
import { STATUS_LABELS, initials } from '@/lib/crm/display';
import AdminTopbar from '../../AdminTopbar';
import { BackLink, KV, TasksCard, TimelineCard } from '../../CrmParts';
import { Composer, InlineSelect, LocalTime } from '../../leads/[id]/LeadClient';
import { addRecordNote, addRecordTask, logRecordCall } from '../../crm-actions';
import { AddContactForm, CompanyDetailsForm, RemoveContact } from '../CompanyClient';
import { addContact, archiveContact, setCompanyOwner, updateCompany } from '../actions';
import BillingSection from '../../invoices/BillingSection';
import { canEditLeads } from '@/lib/auth/roles';
import admin from '../../../admin.module.css';
import s from '../../crm.module.css';

/**
 * Company — the account: its people, its deals, the leads that came from it,
 * and everything that has happened with it.
 */
export const dynamic = 'force-dynamic';

const LIFECYCLE: Record<string, string> = { prospect: 'Prospect', customer: 'Customer', former: 'Former customer' };

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isDatabaseConfigured() || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const me = await requireUser();
  const ws = currentWorkspaceId();
  const [detail, team, customerOf] = await Promise.all([getCompanyDetail(ws, id), getTeam(), engagementsForCompany(ws, id)]);
  if (!detail) notFound();
  const { company, contacts, deals, leads, timeline, tasks } = detail;

  const open = deals.filter((d) => d.stageKind === 'open');
  const won = deals.filter((d) => d.stageKind === 'won');
  const openValue = open.reduce((n, d) => n + d.monthlyValueCents, 0);
  const wonValue = won.reduce((n, d) => n + d.monthlyValueCents, 0);

  return (
    <>
      <AdminTopbar title={company.name} subtitle={[LIFECYCLE[company.lifecycle], company.domain].filter(Boolean).join(' · ')} />
      <div className={admin.view}>
        <BackLink href="/admin/companies">Back to companies</BackLink>
        <div className={s.layout}>
          <aside className={s.profileCol} aria-label="Company profile">
            <div className={s.card}>
              <div className={s.identity}>
                <span className={s.avatar} aria-hidden="true">{initials(company.name)}</span>
                <h2 className={s.personName}>{company.name}</h2>
                <p className={s.personSub}>{company.domain ?? 'No website'}</p>
              </div>
              <div className={s.section}>
                <InlineSelect
                  id="company-owner"
                  label="Account owner"
                  value={company.ownerId ?? ''}
                  placeholder="Unassigned"
                  options={team.map((m) => ({ value: m.id, label: m.id === me.id ? `${m.name} (me)` : m.name }))}
                  action={setCompanyOwner.bind(null, company.id)}
                />
              </div>
              <div className={s.section}>
                <h3 className={s.sectionTitle}>People ({contacts.length})</h3>
                {contacts.length === 0 ? (
                  <p className={s.cardNote}>No contacts yet. Add one under Details.</p>
                ) : (
                  <ul className={s.taskList}>
                    {contacts.map((c) => {
                      const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || 'Unnamed';
                      return (
                        <li key={c.id} className={s.contactItem}>
                          <span className={s.taskTitle}>{name}{c.isPrimary && <span className={s.cardNote}> · primary</span>}</span>
                          <span className={s.taskMeta}>
                            {c.jobTitle && <span>{c.jobTitle}</span>}
                            {c.email && <a href={`mailto:${c.email}`}>{c.email}</a>}
                            {c.phone && <a href={`tel:${c.phoneE164 ?? c.phone}`}>{c.phone}</a>}
                          </span>
                          <RemoveContact id={c.id} name={name} action={archiveContact} />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </aside>

          <div className={s.mainCol}>
            {customerOf.length > 0 && (
              <section className={s.card}>
                <div className={s.cardHead}>
                  <h2 className={s.cardTitle}>Customer engagements</h2>
                  <Link className={s.doneToggle} href="/admin/customers">All customers</Link>
                </div>
                <div className={admin.tableWrap}>
                  <table className={admin.table}>
                    <thead><tr><th scope="col">Engagement</th><th scope="col">Status</th><th scope="col">Monthly</th><th scope="col">Renews</th></tr></thead>
                    <tbody>
                      {customerOf.map((c) => (
                        <tr key={c.id}>
                          <td><Link className={admin.rowLink} href={`/admin/customers/${c.id}`}><span className={admin.cellPrimary}>{c.title}</span></Link></td>
                          <td><span className={`${s.badge} ${s[`s_${c.status}`]}`}>{ENGAGEMENT_STATUS_LABELS[c.status as EngagementStatus]}</span></td>
                          <td className={admin.nowrap}>{formatMoney(c.monthlyValueCents, c.currency)}</td>
                          <td className={admin.nowrap}>{c.renewalDate ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
            {customerOf.length > 0 && <BillingSection ws={ws} companyId={company.id} engagementId={customerOf.length === 1 ? customerOf[0].id : null} canEdit={canEditLeads(me.role)} />}
            <section className={s.card}>
              <div className={s.cardHead}>
                <h2 className={s.cardTitle}>Deals</h2>
                <Link className={s.doneToggle} href="/admin/deals/new">New deal</Link>
              </div>
              {deals.length === 0 ? (
                <p className={admin.empty}><strong>No deals yet</strong>Deals appear here when a lead from this company is converted.</p>
              ) : (
                <div className={admin.tableWrap}>
                  <table className={admin.table}>
                    <thead><tr><th scope="col">Deal</th><th scope="col">Stage</th><th scope="col">Monthly value</th><th scope="col">Close</th></tr></thead>
                    <tbody>
                      {deals.map((d) => (
                        <tr key={d.id}>
                          <td><Link className={admin.rowLink} href={`/admin/deals/${d.id}`}><span className={admin.cellPrimary}>{d.title}</span></Link></td>
                          <td>{d.stageName}</td>
                          <td className={admin.nowrap}>{formatMoney(d.monthlyValueCents, d.currency)}</td>
                          <td className={admin.nowrap}>
                            {d.closedAt ? <LocalTime iso={d.closedAt.toISOString()} mode="date" /> : d.expectedClose ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <details className={s.card}>
              <summary className={s.cardHead} style={{ cursor: 'pointer' }}>
                <span className={s.cardTitle}>Details and contacts</span>
                <span className={s.cardNote}>Edit the company, add a person</span>
              </summary>
              <CompanyDetailsForm
                action={updateCompany.bind(null, company.id)}
                values={{ name: company.name, website: company.website ?? company.domain, industry: company.industry, size: company.size, country: company.country }}
              />
              <div className={s.cardHead} style={{ borderTop: '1px solid var(--hairline)' }}>
                <h3 className={s.cardTitle}>Add a contact</h3>
              </div>
              <AddContactForm action={addContact.bind(null, company.id)} />
            </details>

            <Composer
              note={addRecordNote.bind(null, 'company', company.id)}
              call={logRecordCall.bind(null, 'company', company.id)}
              task={addRecordTask.bind(null, 'company', company.id)}
              team={team}
              me={me.id}
            />
            <TimelineCard items={timeline} subject="company" />
          </div>

          <aside className={s.railCol} aria-label="Account summary">
            <section className={s.card}>
              <div className={s.cardBody}>
                <div className={s.statRow}>
                  <span className={s.kvLabel}>Account</span>
                  <span className={`${s.badge} ${company.lifecycle === 'customer' ? s.p_low : s.p_medium}`}>{LIFECYCLE[company.lifecycle]}</span>
                </div>
                <KV label="Won (monthly)">{wonValue > 0 ? `${formatMoney(wonValue)}/mo` : 'Nothing won yet'}</KV>
                <KV label="Open pipeline">{open.length > 0 ? `${formatMoney(openValue)}/mo · ${open.length} ${open.length === 1 ? 'deal' : 'deals'}` : 'No open deals'}</KV>
                <KV label="Industry">{company.industry}</KV>
                <KV label="Country">{company.country}</KV>
              </div>
            </section>
            {leads.length > 0 && (
              <section className={s.card}>
                <div className={s.cardHead}>
                  <h2 className={s.cardTitle}>Leads</h2>
                  <span className={s.cardNote}>{leads.length}</span>
                </div>
                <ul className={`${s.taskList} ${s.cardBody}`}>
                  {leads.map((l) => (
                    <li key={l.id} className={s.contactItem}>
                      <Link className={s.taskTitle} href={`/admin/leads/${l.id}`}>{l.name || l.email}</Link>
                      <span className={s.taskMeta}>{STATUS_LABELS[l.status] ?? l.status} · <LocalTime iso={l.createdAt.toISOString()} mode="date" /></span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <TasksCard tasks={tasks} emptyHint="No open tasks for this account." />
          </aside>
        </div>
      </div>
    </>
  );
}
