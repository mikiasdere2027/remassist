import Link from 'next/link';
import { isDatabaseConfigured } from '@/db';
import { requireUser } from '@/lib/auth/require';
import { currentWorkspaceId } from '@/lib/crm/workspace';
import { TASK_VIEWS, countTasks, listTasks, type TaskView } from '@/lib/crm/tasks';
import { PRIORITY_LABELS, type Priority } from '@/lib/crm/display';
import { LocalTime, TaskCheck } from '../leads/[id]/LeadClient';
import { setTaskDone } from '../leads/[id]/actions';
import AdminTopbar from '../AdminTopbar';
import admin from '../../admin.module.css';
import s from '../crm.module.css';

/**
 * Tasks — every follow-up, across all leads. "Mine" by default: the page a
 * salesperson opens in the morning. Tasks are created on a lead's page.
 */
export const dynamic = 'force-dynamic';

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ view?: string; who?: string }> }) {
  const sp = await searchParams;
  const me = await requireUser();
  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminTopbar title="Tasks" subtitle="Database not configured" />
        <div className={admin.view}><p className={admin.empty}>No database is configured in this environment.</p></div>
      </>
    );
  }

  const ws = currentWorkspaceId();
  const view: TaskView = TASK_VIEWS.some((v) => v.key === sp.view) ? (sp.view as TaskView) : 'open';
  const everyone = sp.who === 'all';
  const assigneeId = everyone ? undefined : me.id;
  const [rows, counts] = await Promise.all([listTasks(ws, { view, assigneeId }), countTasks(ws, assigneeId)]);
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
                  const overdue = !t.doneAt && t.dueAt && t.dueAt.getTime() < now;
                  return (
                    <li key={t.id} className={`${s.taskRow} ${t.doneAt ? s.taskDone : ''}`}>
                      <TaskCheck id={t.id} title={t.title} done={Boolean(t.doneAt)} action={setTaskDone} />
                      <div className={s.leadWhoText}>
                        <span className={s.taskTitle}>{t.title}</span>
                        {t.leadId && (
                          <Link className={s.leadSub} href={`/admin/leads/${t.leadId}`}>
                            {t.leadName || t.leadEmail}{t.leadCompany ? ` · ${t.leadCompany}` : ''}
                          </Link>
                        )}
                      </div>
                      <span className={`${s.leadCellValue} ${overdue ? s.overdue : ''}`}>
                        {t.doneAt ? <>Done <LocalTime iso={t.doneAt.toISOString()} /></>
                          : t.dueAt ? <>{overdue ? 'Overdue · ' : 'Due '}<LocalTime iso={t.dueAt.toISOString()} /></>
                          : <span className={s.muted}>No due date</span>}
                      </span>
                      <span className={`${s.badge} ${s[`p_${t.priority}`]}`}>{PRIORITY_LABELS[t.priority as Priority]}</span>
                      <span className={s.leadCellValue}>{everyone ? (t.assigneeName || t.assigneeEmail || 'Unassigned') : ''}</span>
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
