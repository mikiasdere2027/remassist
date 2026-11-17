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
import admin from '../../../admin.module.css';
import s from '../../crm.module.css';

/** CRM settings — the pipeline's stages and the reasons a deal can be lost. Admin only. */
export const dynamic = 'force-dynamic';

export default async function CrmSettingsPage() {
  const me = await requireUser();
  if (!canManageCrmSettings(me.role)) redirect('/admin/deals');
  if (!isDatabaseConfigured()) notFound();
  const ws = currentWorkspaceId();
  const [stages, reasons] = await Promise.all([getStages(ws), getLossReasons(ws)]);
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
