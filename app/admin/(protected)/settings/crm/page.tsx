import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/require';
import { canManageCrmSettings } from '@/lib/auth/roles';
import { apiServer } from '@/lib/api/server';
import type { CrmSettings, DigestPreview } from '@/lib/api/crm';
import type { Assignee } from '@/lib/api/leads';
import { rulesToText } from '@/lib/crm/automation';
import AdminTopbar from '../../AdminTopbar';
import { AutomationForm, SendDigest } from './AutomationClient';
import { AddReasonForm, AddStageForm, ReasonRow, StageRow } from './SettingsClient';
import admin from '../../../admin.module.css';
import s from '../../crm.module.css';

/**
 * CRM settings — lead assignment and the first-contact task, the daily
 * digest, the pipeline's stages and the reasons a deal can be lost. Admin only.
 */
export const dynamic = 'force-dynamic';

export default async function CrmSettingsPage() {
  const me = await requireUser();
  if (!canManageCrmSettings(me.role)) redirect('/admin/deals');
  const [{ stages, lossReasons: reasons, automation: auto }, team, digest] = await Promise.all([
    apiServer<CrmSettings>('/admin/crm/settings'),
    apiServer<Assignee[]>('/admin/leads/assignees'),
    apiServer<DigestPreview>('/admin/crm/digest'),
  ]);
  const open = stages.filter((x) => x.kind === 'open');

  return (
    <>
      <AdminTopbar title="CRM settings" subtitle="Lead assignment, digest, pipeline stages and loss reasons" />
      <div className={admin.view}>
        <div className={`${s.listStack} ${s.narrowWide}`}>
          <section className={s.card}>
            <div className={s.cardHead}>
              <h2 className={s.cardTitle}>Lead assignment</h2>
              <span className={s.cardNote}>What happens to every new website enquiry</span>
            </div>
            <AutomationForm
              team={team}
              values={{
                assignMode: auto.assignMode,
                defaultOwnerId: auto.defaultOwnerId,
                pool: auto.pool,
                rulesText: rulesToText(auto.rules, team),
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
              <h2 className={s.cardTitle}>Daily digest and integrations</h2>
              <span className={s.cardNote}>Slack {digest.configured ? 'connected' : 'not connected'} · Calendly {digest.calendly ? 'connected' : 'not connected'}</span>
            </div>
            <div className={s.cardBody}>
              <p className={s.cardNote}>
                Every weekday at 09:00 (Addis Ababa) the team&rsquo;s Slack channel gets this summary.
                {!digest.configured && ' It is not being sent: set DIGEST_WEBHOOK_URL or LEAD_WEBHOOK_URL (a Slack incoming-webhook URL) on the API server first.'}
              </p>
              <pre className={s.digest}>{digest.text ?? 'Nothing to report today: no overdue tasks, no waiting leads, no renewals in the next 30 days.'}</pre>
              <SendDigest configured={digest.configured} />
              {!digest.calendly && (
                <p className={s.cardNote}>
                  Calendly bookings are not coming in yet. Register the webhook on the API server with{' '}
                  <code>node dist/cli/calendly-webhook.js</code> and add CALENDLY_WEBHOOK_SIGNING_KEY to its .env;
                  bookings then appear on the lead with a task at the meeting time.
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
                  />
                );
              })}
              <AddStageForm />
            </div>
          </section>

          <section className={s.card}>
            <div className={s.cardHead}>
              <h2 className={s.cardTitle}>Loss reasons</h2>
              <span className={s.cardNote}>Offered when a deal is marked lost; archived ones stay on old deals</span>
            </div>
            <div className={s.cardBody}>
              {reasons.map((r) => (
                <ReasonRow key={r.id} id={r.id} label={r.label} />
              ))}
              <AddReasonForm />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
