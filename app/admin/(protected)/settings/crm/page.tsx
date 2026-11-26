import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/require';
import { canManageCrmSettings } from '@/lib/auth/roles';
import { apiServer } from '@/lib/api/server';
import type { CrmSettings } from '@/lib/api/crm';
import AdminTopbar from '../../AdminTopbar';
import { AddReasonForm, AddStageForm, ReasonRow, StageRow } from './SettingsClient';
import admin from '../../../admin.module.css';
import s from '../../crm.module.css';

/** CRM settings — the pipeline's stages and the reasons a deal can be lost. Admin only. */
export const dynamic = 'force-dynamic';

export default async function CrmSettingsPage() {
  const me = await requireUser();
  if (!canManageCrmSettings(me.role)) redirect('/admin/deals');
  const { stages, lossReasons: reasons } = await apiServer<CrmSettings>('/admin/crm/settings');
  const open = stages.filter((x) => x.kind === 'open');

  return (
    <>
      <AdminTopbar title="CRM settings" subtitle="Pipeline stages and loss reasons" />
      <div className={admin.view}>
        <div className={`${s.listStack} ${s.narrowWide}`}>
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
