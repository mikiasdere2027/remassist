import { isDatabaseConfigured } from '@/db';
import { requireUser } from '@/lib/auth/require';
import { listSlaIncidents } from '@/lib/crm/slaData';
import { currentWorkspaceId } from '@/lib/crm/workspace';
import { LocalTime } from '../leads/[id]/LeadClient';
import AdminTopbar from '../AdminTopbar';
import { acknowledgeIncidentAction, resolveIncidentAction } from './actions';
import admin from '../../admin.module.css';
import s from './sla-incidents.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'SLA Incidents', robots: { index: false, follow: false } };

function SeverityBadge({ severity }: { severity: string }) {
  if (severity === 'critical') return <span className={s.badgeCritical}>Critical</span>;
  if (severity === 'high') return <span className={s.badgeHigh}>High</span>;
  return <span className={s.badgeStandard}>Standard</span>;
}

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
            <ul className={s.incidentList}>
              {rows.map((inc) => (
                <li
                  key={inc.id}
                  className={`${s.incidentRow}${inc.resolvedAt ? ` ${s.resolved}` : ''}`}
                >
                  {/* ── Info block ── */}
                  <div className={s.incidentInfo}>
                    <div className={s.incidentTitle}>
                      <SeverityBadge severity={inc.severity} />
                      {inc.title}
                      {inc.resolvedAt ? <span className={s.resolvedTag}>Resolved</span> : null}
                    </div>

                    {inc.summary ? (
                      <p className={s.incidentDetail}>{inc.summary}</p>
                    ) : null}

                    <div className={s.incidentMeta}>
                      <span>Detected: <LocalTime iso={inc.detectedAt.toISOString()} /></span>
                      {inc.acknowledgedAt ? (
                        <span>Ack: <LocalTime iso={inc.acknowledgedAt.toISOString()} /></span>
                      ) : null}
                      {inc.resolvedAt ? (
                        <span>Resolved: <LocalTime iso={inc.resolvedAt.toISOString()} /></span>
                      ) : null}
                    </div>

                    {inc.rootCause ? (
                      <p className={s.incidentDetail}><strong>Root cause:</strong> {inc.rootCause}</p>
                    ) : null}
                    {inc.correctiveAction ? (
                      <p className={s.incidentDetail}><strong>Corrective action:</strong> {inc.correctiveAction}</p>
                    ) : null}
                  </div>

                  {/* ── Action buttons (only when unresolved) ── */}
                  {!inc.resolvedAt ? (
                    <div className={s.incidentActions}>
                      {!inc.acknowledgedAt ? (
                        <form action={acknowledgeIncidentAction}>
                          <input type="hidden" name="id" value={inc.id} />
                          <button type="submit" className={`${admin.btn} ${admin.btnGhost}`}>
                            Acknowledge
                          </button>
                        </form>
                      ) : null}

                      <form action={resolveIncidentAction} className={s.resolveForm}>
                        <input type="hidden" name="id" value={inc.id} />
                        <input
                          name="rootCause"
                          placeholder="Root cause"
                          className={admin.control}
                          style={{ width: '160px' }}
                        />
                        <input
                          name="correctiveAction"
                          placeholder="Corrective action"
                          className={admin.control}
                          style={{ width: '180px' }}
                        />
                        <button type="submit" className={`${admin.btn} ${admin.btnPrimary}`}>
                          Resolve
                        </button>
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
