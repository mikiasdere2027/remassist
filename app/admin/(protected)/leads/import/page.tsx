import Link from 'next/link';
import { requireUser } from '@/lib/auth/require';
import { apiServer } from '@/lib/api/server';
import type { Assignee } from '@/lib/api/leads';
import AdminTopbar from '../../AdminTopbar';
import ImportClient from './ImportClient';
import admin from '../../../admin.module.css';
import s from '../../crm.module.css';

/** Import leads from a CSV file (a spreadsheet, another CRM, an event list). */
export const dynamic = 'force-dynamic';

export default async function ImportLeadsPage() {
  const me = await requireUser();
  const team = await apiServer<Assignee[]>('/admin/leads/assignees');
  return (
    <>
      <AdminTopbar title="Import leads" subtitle="From a spreadsheet, an event list or another CRM" />
      <div className={admin.view}>
        <Link className={admin.memberBackBtn} href="/admin/leads">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to leads
        </Link>
        <section className={`${s.card} ${s.narrow}`}>
          <div className={s.cardHead}>
            <h2 className={s.cardTitle}>Upload a CSV file</h2>
            <span className={s.cardNote}>Nothing is saved until you press Import</span>
          </div>
          <ImportClient team={team} me={me.id} />
        </section>
      </div>
    </>
  );
}
