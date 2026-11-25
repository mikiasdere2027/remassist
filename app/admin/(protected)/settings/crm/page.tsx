import { notFound, redirect } from 'next/navigation';
import { isDatabaseConfigured } from '@/db';
import { requireUser } from '@/lib/auth/require';
import { canManageCrmSettings } from '@/lib/auth/roles';
import { currentWorkspaceId } from '@/lib/crm/workspace';
import { getLossReasons, getStages } from '@/lib/crm/deals';
import AdminTopbar from '../../AdminTopbar';
import { AddReasonForm, AddStageForm, ReasonRow, StageRow } from './SettingsClient';
import {
  addLossReason, addStage, archiveLossReason, archiveStage, moveStage, saveLossReason, saveStage,
} from './actions';
import { getTeam } from '@/lib/crm/leads';
import { workspaceSettings } from '@/lib/crm/engagementsData';
import { formatDigest, readAutomation } from '@/lib/crm/automation';
import { digestData } from '@/lib/crm/automationData';
import { getDb } from '@/db';
import { SITE_URL } from '@/lib/site';
import { AutomationForm, SendDigest } from './AutomationClient';
import { saveAutomation, sendDigestNow } from './automationActions';
import { readBilling } from '@/lib/crm/invoices';
import { BillingSettingsForm } from '../../invoices/InvoiceClient';
import { saveBillingSettings } from '../../invoices/actions';
import admin from '../../../admin.module.css';
import s from '../../crm.module.css';

/** CRM settings — the pipeline's stages and the reasons a deal can be lost. Admin only. */
export const dynamic = 'force-dynamic';

export default async function CrmSettingsPage() {
  const me = await requireUser();
  if (!canManageCrmSettings(me.role)) redirect('/admin/deals');
  if (!isDatabaseConfigured()) notFound();
  const ws = currentWorkspaceId();
  const [stages, reasons, team, settings, digest] = await Promise.all([
    getStages(ws), getLossReasons(ws), getTeam(), workspaceSettings(getDb(), ws), digestData(ws, SITE_URL),
  ]);
  const auto = readAutomation(settings);
  const billing = readBilling(settings);
  const emailOf = new Map(team.map((m) => [m.id, m.email]));
  const digestText = formatDigest(digest);
  const slack = Boolean(process.env.LEAD_WEBHOOK_URL);
  const calendly = Boolean(process.env.CALENDLY_WEBHOOK_SIGNING_KEY);
  const open = stages.filter((x) => x.kind === 'open');

  return (
    <>
      <AdminTopbar title="CRM settings" subtitle="Pipeline, lead assignment, invoicing and integrations" />
      <div className={admin.view}>
        <div className={`${s.listStack} ${s.narrowWide}`}>
          <section className={s.card}>
            <div className={s.cardHead}>
              <h2 className={s.cardTitle}>Lead assignment</h2>
              <span className={s.cardNote}>What happens to every new website enquiry</span>
            </div>
            <AutomationForm
              action={saveAutomation}
              team={team}
              values={{
                assignMode: auto.assignMode,
                defaultOwnerId: auto.defaultOwnerId,
                pool: auto.pool,
                rulesText: auto.rules.map((r) => `${r.service} | ${emailOf.get(r.ownerId) ?? ''}`).join('\n'),
                firstContactTask: auto.firstContactTask,
                firstContactHours: auto.firstContactHours,
              }}
            />
            <p className={`${s.cardNote} ${s.padNote}`}>
              New enquiries are also linked automatically to a contact with the same email, or a company with the same website domain.
            </p>
          </section>

          <section className={s.card}>
            <div className={s.cardHead}>
              <h2 className={s.cardTitle}>Invoicing</h2>
              <span className={s.cardNote}>Your details as printed on every invoice</span>
            </div>
            <BillingSettingsForm action={saveBillingSettings} values={billing} />
          </section>

          <section className={s.card}>
            <div className={s.cardHead}>
              <h2 className={s.cardTitle}>Daily digest and integrations</h2>
              <span className={s.cardNote}>Slack {slack ? 'connected' : 'not connected'} · Calendly {calendly ? 'connected' : 'not connected'}</span>
            </div>
            <div className={s.cardBody}>
              <p className={s.cardNote}>
                Every weekday at 09:00 the team&rsquo;s Slack channel gets this summary.
                {!slack && ' It is not being sent: set LEAD_WEBHOOK_URL (a Slack incoming-webhook URL) on the server first.'}
              </p>
              <pre className={s.digest}>{digestText ?? 'Nothing to report today: no overdue tasks, no waiting leads, no renewals in the next 30 days.'}</pre>
              <SendDigest action={sendDigestNow} configured={slack} />
              {!calendly && (
                <p className={s.cardNote}>
                  Calendly bookings are not coming in yet. Register the webhook with tools/calendly-webhook.mts and add
                  CALENDLY_WEBHOOK_SIGNING_KEY to the server; bookings then appear on the lead with a task at the meeting time.
                </p>
              )}
            </div>
          </section>

          <section className={s.card}>
            <div className={s.cardHead}>
              <h2 className={s.cardTitle}>Pipeline stages</h2>
              <span className={s.cardNote}>The percentage is each stage&rsquo;s default chance of winning, used for the forecast</span>
            </div>
            <div className={s.cardBody}>
              {stages.map((st) => {
                const i = open.findIndex((o) => o.id === st.id);
                return (
                  <StageRow
                    key={st.id}
                    stage={{ id: st.id, name: st.name, probability: st.probability, kind: st.kind }}
                    first={i === 0}
                    last={i === open.length - 1}
                    save={saveStage.bind(null, st.id)}
                    move={moveStage.bind(null, st.id)}
                    archive={archiveStage.bind(null, st.id)}
                  />
                );
              })}
              <AddStageForm action={addStage} />
            </div>
          </section>

          <section className={s.card}>
            <div className={s.cardHead}>
              <h2 className={s.cardTitle}>Loss reasons</h2>
              <span className={s.cardNote}>Offered when a deal is marked lost; archived ones stay on old deals</span>
            </div>
            <div className={s.cardBody}>
              {reasons.map((r) => (
                <ReasonRow key={r.id} label={r.label} save={saveLossReason.bind(null, r.id)} archive={archiveLossReason.bind(null, r.id)} />
              ))}
              <AddReasonForm action={addLossReason} />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
