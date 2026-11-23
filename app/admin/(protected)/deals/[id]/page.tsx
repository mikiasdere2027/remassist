import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isDatabaseConfigured } from '@/db';
import { requireUser } from '@/lib/auth/require';
import { currentWorkspaceId } from '@/lib/crm/workspace';
import { getDealDetail, getLossReasons, getStages } from '@/lib/crm/deals';
import { getTeam } from '@/lib/crm/leads';
import { effectiveProbability, formatMoney, weightedCents } from '@/lib/crm/money';
import { initials } from '@/lib/crm/display';
import { SERVICES } from '@/lib/services';
import AdminTopbar from '../../AdminTopbar';
import { BackLink, KV, TasksCard, TimelineCard } from '../../CrmParts';
import { Composer, InlineSelect, LocalTime } from '../../leads/[id]/LeadClient';
import { addRecordNote, addRecordTask, logRecordCall } from '../../crm-actions';
import DealForm from '../DealForm';
import StageControl from '../StageControl';
import { moveDealStage, setDealOwner, updateDealAction } from '../actions';
import { proposalsForDeal } from '@/lib/crm/proposalsData';
import { PROPOSAL_STATUS_LABELS } from '@/lib/crm/proposals';
import { newProposal } from '../../proposals/actions';
import admin from '../../../admin.module.css';
import s from '../../crm.module.css';

/**
 * Deal — company and contact on the left, the deal's terms and its timeline
 * in the middle, stage and forecast on the right.
 */
export const dynamic = 'force-dynamic';

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isDatabaseConfigured() || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const me = await requireUser();
  const ws = currentWorkspaceId();
  const [detail, stages, reasons, team, props] = await Promise.all([getDealDetail(ws, id), getStages(ws), getLossReasons(ws), getTeam(), proposalsForDeal(ws, id)]);
  if (!detail) notFound();
  const { deal, stage, company, contact, lead, lossReason, timeline, tasks } = detail;

  const probability = effectiveProbability(deal.probability, stage.probability);
  const daysInStage = Math.floor((Date.now() - deal.stageChangedAt.getTime()) / 86_400_000);
  const contactName = contact ? [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.email : null;
  const services = SERVICES.map((x) => x.name).filter((n) => n !== 'All Services');

  return (
    <>
      <AdminTopbar title={deal.title} subtitle={[company?.name, stage.name].filter(Boolean).join(' · ')} />
      <div className={admin.view}>
        <BackLink href="/admin/deals">Back to deals</BackLink>
        <div className={s.layout}>
          <aside className={s.profileCol} aria-label="Who the deal is with">
            <div className={s.card}>
              <div className={s.identity}>
                <span className={s.avatar} aria-hidden="true">{initials(company?.name ?? deal.title)}</span>
                <h2 className={s.personName}>
                  {company ? <Link href={`/admin/companies/${company.id}`}>{company.name}</Link> : 'No company'}
                </h2>
                <p className={s.personSub}>{company?.domain ?? (company ? 'No website' : 'Add one by converting a lead or from Companies')}</p>
              </div>
              <div className={s.section}>
                <InlineSelect
                  id="deal-owner"
                  label="Owner"
                  value={deal.ownerId ?? ''}
                  placeholder="Unassigned"
                  options={team.map((m) => ({ value: m.id, label: m.id === me.id ? `${m.name} (me)` : m.name }))}
                  action={setDealOwner.bind(null, deal.id)}
                />
              </div>
              <div className={s.section}>
                <h3 className={s.sectionTitle}>Contact</h3>
                <KV label="Name">{contactName}</KV>
                <KV label="Email">{contact?.email ? <a href={`mailto:${contact.email}`}>{contact.email}</a> : null}</KV>
                <KV label="Phone">{contact?.phone ? <a href={`tel:${contact.phoneE164 ?? contact.phone}`}>{contact.phone}</a> : null}</KV>
              </div>
              <div className={s.section}>
                <h3 className={s.sectionTitle}>History</h3>
                <KV label="Created"><LocalTime iso={deal.createdAt.toISOString()} mode="date" /></KV>
                <KV label="From lead">{lead?.id ? <Link href={`/admin/leads/${lead.id}`}>{lead.name || lead.email}</Link> : 'Added directly'}</KV>
              </div>
            </div>
          </aside>

          <div className={s.mainCol}>
            <section className={s.card}>
              <div className={s.cardHead}>
                <h2 className={s.cardTitle}>Terms</h2>
                <span className={s.cardNote}>What they are buying and what it is worth each month</span>
              </div>
              <DealForm
                mode="edit"
                action={updateDealAction.bind(null, deal.id)}
                submitLabel="Save changes"
                stages={[]}
                team={team}
                services={services}
                stageProbabilities={{ [stage.id]: stage.probability }}
                values={{
                  title: deal.title,
                  service: deal.service,
                  tier: deal.tier,
                  seats: deal.seats,
                  hoursPerMonth: deal.hoursPerMonth,
                  rate: deal.rateCents ? String(deal.rateCents / 100) : '',
                  monthlyValue: deal.hoursPerMonth && deal.rateCents ? '' : String(deal.monthlyValueCents / 100),
                  probability: deal.probability,
                  expectedClose: deal.expectedClose,
                  stageId: stage.id,
                }}
              />
            </section>

            <section className={s.card}>
              <div className={s.cardHead}>
                <h2 className={s.cardTitle}>Proposals</h2>
                <form action={newProposal.bind(null, deal.id)}>
                  <button type="submit" className={s.doneToggle}>New proposal</button>
                </form>
              </div>
              {props.length === 0 ? (
                <p className={admin.empty}><strong>No proposal yet</strong>A new proposal starts from this deal&rsquo;s terms and the rate catalogue.</p>
              ) : (
                <ul className={s.miniList}>
                  {props.map((pr) => (
                    <li key={pr.id}>
                      <span>
                        <Link href={`/admin/proposals/${pr.id}`}>{pr.number} · {pr.title}</Link>{' '}
                        <span className={`${s.badge} ${s[`s_${pr.status}`]}`}>{PROPOSAL_STATUS_LABELS[pr.status]}</span>
                      </span>
                      <span className={s.miniMeta}>{formatMoney(pr.monthlyCents, pr.currency)}/mo</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <Composer
              note={addRecordNote.bind(null, 'deal', deal.id)}
              call={logRecordCall.bind(null, 'deal', deal.id)}
              task={addRecordTask.bind(null, 'deal', deal.id)}
              team={team}
              me={me.id}
            />
            <TimelineCard items={timeline} subject="deal" />
          </div>

          <aside className={s.railCol} aria-label="Deal status">
            <section className={s.card}>
              <div className={s.cardBody}>
                <StageControl
                  dealId={deal.id}
                  title={deal.title}
                  current={deal.stageId}
                  stages={stages.map((x) => ({ id: x.id, name: x.name, kind: x.kind }))}
                  reasons={reasons.map((x) => ({ id: x.id, label: x.label }))}
                  move={moveDealStage}
                />
                <div className={s.statRow}>
                  <span className={s.kvLabel}>Monthly value</span>
                  <span className={`${s.badge} ${stage.kind === 'won' ? s.p_low : stage.kind === 'lost' ? s.p_high : s.p_medium}`}>
                    {stage.kind === 'won' ? 'Won' : stage.kind === 'lost' ? 'Lost' : `${probability}% likely`}
                  </span>
                </div>
                <span className={s.scoreBig}>{formatMoney(deal.monthlyValueCents, deal.currency)}<span className={s.cardNote}> /mo</span></span>
                {stage.kind === 'open' && (
                  <>
                    <div className={s.scoreBar}><div className={s.scoreFill} style={{ width: `${probability}%` }} /></div>
                    <KV label="Weighted forecast">{formatMoney(weightedCents(deal.monthlyValueCents, probability), deal.currency)}/mo</KV>
                  </>
                )}
                <KV label="Expected close">{deal.expectedClose}</KV>
                <KV label={stage.kind === 'open' ? 'In this stage' : 'Closed'}>
                  {stage.kind === 'open' ? `${daysInStage} ${daysInStage === 1 ? 'day' : 'days'}` : deal.closedAt ? <LocalTime iso={deal.closedAt.toISOString()} mode="date" /> : null}
                </KV>
                {stage.kind === 'lost' && <KV label="Why it was lost">{[lossReason, deal.lossNote].filter(Boolean).join(' — ')}</KV>}
              </div>
            </section>
            <TasksCard tasks={tasks} emptyHint="No open tasks. Add the next step below the terms." />
          </aside>
        </div>
      </div>
    </>
  );
}
