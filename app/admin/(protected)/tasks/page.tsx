import Link from 'next/link';
import { apiServer } from '@/lib/api/server';
import type { TaskPage } from '@/lib/api/leads';
import { requireUser } from '@/lib/auth/require';
import { PRIORITY_LABELS, type Priority } from '@/lib/crm/display';
import { LocalTime, TaskCheck } from '../leads/[id]/LeadClient';
import AdminTopbar from '../AdminTopbar';
import admin from '../../admin.module.css';
import s from '../crm.module.css';

/**
 * Tasks — every follow-up, across all leads. "Mine" by default: the page a
 * salesperson opens in the morning. Tasks are created on a lead's page.
 */
export const dynamic = 'force-dynamic';

const TASK_VIEWS = [
  { key: 'open', label: 'Open' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'done', label: 'Completed' },
] as const;
type TaskView = (typeof TASK_VIEWS)[number]['key'];

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ view?: string; who?: string }> }) {
  const sp = await searchParams;
  await requireUser();
  const view: TaskView = TASK_VIEWS.some((v) => v.key === sp.view) ? (sp.view as TaskView) : 'open';
  const everyone = sp.who === 'all';
  const { items: rows, counts } = await apiServer<TaskPage>(
    `/admin/tasks?view=${view}&scope=${everyone ? 'all' : 'mine'}`,
  );
  const now = Date.now();
  const href = (v: TaskView, who = sp.who) => {
    const p = new URLSearchParams();
    if (v !== 'open') p.set('view', v);
    if (who === 'all') p.set('who', 'all');
    const q = p.toString();
    return `/admin/tasks${q ? `?${q}` : ''}`;
  };

  return (
    <>
      <AdminTopbar
        title="Tasks"
        subtitle={everyone ? 'Everyone’s follow-ups' : 'Your follow-ups, soonest first'}
        action={
          <span className={s.headerActions}>
            <Link className={`${admin.btn} ${everyone ? admin.btnGhost : admin.btnPrimary}`} href={href(view, undefined)}>Mine</Link>
            <Link className={`${admin.btn} ${everyone ? admin.btnPrimary : admin.btnGhost}`} href={href(view, 'all')}>Everyone</Link>
          </span>
        }
      />
      <div className={admin.view}>
        <div className={s.listStack}>
          <nav className={s.tabs} aria-label="Task views">
            {TASK_VIEWS.map((v) => (
              <Link key={v.key} href={href(v.key)} className={`${s.tab} ${view === v.key ? s.tabOn : ''}`} aria-current={view === v.key ? 'page' : undefined}>
                {v.label} <span className={s.tabCount}>{counts[v.key]}</span>
              </Link>
            ))}
          </nav>

          <section className={admin.panel}>
            {rows.length === 0 ? (
              <p className={admin.empty}>
                <strong>{view === 'done' ? 'Nothing completed yet' : view === 'overdue' ? 'Nothing overdue' : 'No open tasks'}</strong>
                Tasks are added from a lead&rsquo;s page, under the tabs.
              </p>
            ) : (
              <ul className={s.leadList}>
                {rows.map((t) => {
                  const overdue = !t.doneAt && t.dueAt && new Date(t.dueAt).getTime() < now;
                  return (
                    <li key={t.id} className={`${s.taskRow} ${t.doneAt ? s.taskDone : ''}`}>
                      <TaskCheck id={t.id} title={t.title} done={Boolean(t.doneAt)} />
                      <div className={s.leadWhoText}>
                        <span className={s.taskTitle}>{t.title}</span>
                        {t.leadId && (
                          <Link className={s.leadSub} href={`/admin/leads/${t.leadId}`}>
                            {t.leadName || t.leadEmail}{t.leadCompany ? ` · ${t.leadCompany}` : ''}
                          </Link>
                        )}
                      </div>
                      <span className={`${s.leadCellValue} ${overdue ? s.overdue : ''}`}>
                        {t.doneAt ? <>Done <LocalTime iso={t.doneAt} /></>
                          : t.dueAt ? <>{overdue ? 'Overdue · ' : 'Due '}<LocalTime iso={t.dueAt} /></>
                          : <span className={s.muted}>No due date</span>}
                      </span>
                      <span className={`${s.badge} ${s[`p_${t.priority}`]}`}>{PRIORITY_LABELS[t.priority as Priority]}</span>
                      <span className={s.leadCellValue}>{everyone ? (t.assigneeName || 'Unassigned') : ''}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
