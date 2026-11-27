import Link from 'next/link';
import { isDatabaseConfigured } from '@/db';
import { requireUser } from '@/lib/auth/require';
import { APPOINTMENT_STATUSES, type AppointmentChannel, type AppointmentStatus } from '@/lib/crm/sla';
import { listAppointments } from '@/lib/crm/slaData';
import { currentWorkspaceId } from '@/lib/crm/workspace';
import { LocalTime } from '../leads/[id]/LeadClient';
import AdminTopbar from '../AdminTopbar';
import AppointmentStatusSelect from './AppointmentStatusSelect';
import admin from '../../admin.module.css';
import s from '../crm.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Appointments', robots: { index: false, follow: false } };

const CHANNEL_LABEL: Record<AppointmentChannel, string> = {
  rem_agent: 'REM Agent ($10)',
  ai_assistant: 'AI Assistant ($0)',
  internal: 'Internal ($0)',
};

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireUser();
  const sp = await searchParams;
  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminTopbar title="Appointments" subtitle="Database not configured" />
        <div className={admin.view}><p className={admin.empty}>No database is configured in this environment.</p></div>
      </>
    );
  }

  const filter = (APPOINTMENT_STATUSES as readonly string[]).includes(sp.status ?? '')
    ? (sp.status as AppointmentStatus)
    : undefined;
  const rows = await listAppointments(currentWorkspaceId(), filter);

  return (
    <>
      <AdminTopbar
        title="Appointments"
        subtitle="Update appointment statuses within 2 business days for Exhibit A commission reconciliation"
      />
      <div className={admin.view}>
        <div className={s.listStack}>
          <nav className={s.tabs} aria-label="Appointment status filter">
            <Link href="/admin/appointments" className={`${s.tab} ${!filter ? s.tabOn : ''}`}>All</Link>
            {APPOINTMENT_STATUSES.map((st) => (
              <Link key={st} href={`/admin/appointments?status=${st}`} className={`${s.tab} ${filter === st ? s.tabOn : ''}`}>
                {st.replace('_', ' ')}
              </Link>
            ))}
          </nav>

          <section className={admin.panel}>
            {rows.length === 0 ? (
              <p className={admin.empty}>
                <strong>No appointments recorded</strong>
                Booked appointments from REM agents and AI assistants appear here for commission reconciliation.
              </p>
            ) : (
              <div className={admin.tableWrap}>
                <table className={admin.table}>
                  <thead>
                    <tr>
                      <th>Lead</th>
                      <th>Booked By</th>
                      <th>Scheduled</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <Link className={admin.rowLink} href={`/admin/leads/${r.leadId}`}>
                            <span className={admin.cellPrimary}>{r.leadName || r.leadEmail}</span>
                          </Link>
                          <span className={`${admin.cellSecondary} ${admin.mono}`}>{r.leadEmail}</span>
                        </td>
                        <td>
                          <span className={admin.cellPrimary}>{CHANNEL_LABEL[r.bookedByChannel]}</span>
                          {r.bookedByName ? <span className={admin.cellSecondary}>{r.bookedByName}</span> : null}
                        </td>
                        <td><LocalTime iso={r.scheduledAt.toISOString()} /></td>
                        <td><AppointmentStatusSelect id={r.id} status={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
