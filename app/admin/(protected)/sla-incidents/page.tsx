import { isDatabaseConfigured } from '@/db';
import { requireUser } from '@/lib/auth/require';
import { listSlaIncidents } from '@/lib/crm/slaData';
import { currentWorkspaceId } from '@/lib/crm/workspace';
import { LocalTime } from '../leads/[id]/LeadClient';
import AdminTopbar from '../AdminTopbar';
import { acknowledgeIncidentAction, resolveIncidentAction } from './actions';
import admin from '../../admin.module.css';
import s from '../crm.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'SLA Incidents', robots: { index: false, follow: false } };

export default async function SlaIncidentsPage() {
  await requireUser();
  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminTopbar title="SLA Incidents" subtitle="Database not configured" />
        <div className={admin.view}><p className={admin.empty}>No database is configured in this environment.</p></div>
      </>
    );
  }

  const rows = await listSlaIncidents(currentWorkspaceId());

  return (
    <>
      <AdminTopbar
        title="SLA Incidents"
        subtitle="Critical (15m response / 60m resolution) and coverage gap incident log"
      />
      <div className={admin.view}>
        <section className={admin.panel}>
          {rows.length === 0 ? (
            <p className={admin.empty}>
              <strong>No SLA incidents recorded</strong>
              Coverage gaps over 15 minutes detected by the SLA watchdog appear here.
            </p>
          ) : (
            <ul className={s.leadList}>
              {rows.map((inc) => (
                <li key={inc.id} className={s.taskRow} style={{ alignItems: 'flex-start', gap: '12px' }}>
                  <div className={s.leadWhoText} style={{ flex: 1 }}>
                    <span className={s.taskTitle}>
                      [{inc.severity.toUpperCase()}] {inc.title}
                    </span>
                    {inc.summary ? <span className={s.leadSub}>{inc.summary}</span> : null}
                    <span className={s.leadSub}>
                      Detected: <LocalTime iso={inc.detectedAt.toISOString()} />
                      {inc.acknowledgedAt ? <> · Ack: <LocalTime iso={inc.acknowledgedAt.toISOString()} /></> : null}
                      {inc.resolvedAt ? <> · Resolved: <LocalTime iso={inc.resolvedAt.toISOString()} /></> : null}
                    </span>
                    {inc.rootCause ? <span className={s.leadSub}>Root cause: {inc.rootCause}</span> : null}
                    {inc.correctiveAction ? <span className={s.leadSub}>Corrective action: {inc.correctiveAction}</span> : null}
                  </div>

                  {!inc.resolvedAt ? (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {!inc.acknowledgedAt ? (
                        <form action={acknowledgeIncidentAction}>
                          <input type="hidden" name="id" value={inc.id} />
                          <button type="submit" className={`${admin.btn} ${admin.btnGhost}`}>Acknowledge</button>
                        </form>
                      ) : null}
                      <form action={resolveIncidentAction} style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <input type="hidden" name="id" value={inc.id} />
                        <input name="rootCause" placeholder="Root cause" className={admin.input} style={{ width: '160px' }} />
                        <input name="correctiveAction" placeholder="Corrective action" className={admin.input} style={{ width: '180px' }} />
                        <button type="submit" className={`${admin.btn} ${admin.btnPrimary}`}>Resolve</button>
                      </form>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
