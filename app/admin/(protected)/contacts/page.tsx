import Link from 'next/link';
import { and, asc, eq, ilike, isNull, or, type SQL } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { companies, contacts } from '@/db/schema';
import { requireUser } from '@/lib/auth/require';
import { currentWorkspaceId } from '@/lib/crm/workspace';
import { escapeLike } from '@/lib/leads/query';
import AdminTopbar from '../AdminTopbar';
import admin from '../../admin.module.css';
import s from '../crm.module.css';

/** Contacts — every person across all companies. Edited on their company's page. */
export const dynamic = 'force-dynamic';

export default async function ContactsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  await requireUser();
  if (!isDatabaseConfigured()) {
    return (
      <>
        <AdminTopbar title="Contacts" subtitle="Database not configured" />
        <div className={admin.view}><p className={admin.empty}>No database is configured in this environment.</p></div>
      </>
    );
  }
  const where: SQL[] = [eq(contacts.workspaceId, currentWorkspaceId()), isNull(contacts.archivedAt)];
  const q = sp.q?.trim();
  if (q) {
    const like = `%${escapeLike(q)}%`;
    const m = or(ilike(contacts.firstName, like), ilike(contacts.lastName, like), ilike(contacts.email, like), ilike(companies.name, like));
    if (m) where.push(m);
  }
  const rows = await getDb()
    .select({
      id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName, email: contacts.email,
      phone: contacts.phone, phoneE164: contacts.phoneE164, jobTitle: contacts.jobTitle, isPrimary: contacts.isPrimary,
      companyId: contacts.companyId, companyName: companies.name,
    })
    .from(contacts)
    .leftJoin(companies, eq(companies.id, contacts.companyId))
    .where(and(...where))
    .orderBy(asc(companies.name), asc(contacts.firstName))
    .limit(500);

  return (
    <>
      <AdminTopbar title={`Contacts (${rows.length})`} subtitle="The people at your prospects and customers" />
      <div className={admin.view}>
        <section className={admin.panel}>
          <form className={admin.filters} method="get">
            <div className={admin.field}>
              <label className={admin.fieldLabel} htmlFor="ct-q">Search</label>
              <input id="ct-q" name="q" type="search" className={`${admin.control} ${admin.controlSearch}`} placeholder="Name, email or company" defaultValue={sp.q ?? ''} />
            </div>
            <button className={`${admin.btn} ${admin.btnSoft}`} type="submit">Search</button>
            <Link className={`${admin.btn} ${admin.btnGhost}`} href="/admin/contacts">Reset</Link>
          </form>
          {rows.length === 0 ? (
            <p className={admin.empty}>
              <strong>No contacts {q ? 'match' : 'yet'}</strong>
              Contacts are created when a lead is converted, or added on a company&rsquo;s page.
            </p>
          ) : (
            <div className={admin.tableWrap}>
              <table className={admin.table}>
                <thead><tr><th scope="col">Name</th><th scope="col">Company</th><th scope="col">Email</th><th scope="col">Phone</th></tr></thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <span className={admin.cellPrimary}>{[c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || 'Unnamed'}</span>
                        <span className={admin.cellSecondary}>{[c.jobTitle, c.isPrimary ? 'Primary contact' : null].filter(Boolean).join(' · ')}</span>
                      </td>
                      <td>{c.companyId ? <Link href={`/admin/companies/${c.companyId}`}>{c.companyName}</Link> : <span className={s.muted}>No company</span>}</td>
                      <td>{c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : <span className={s.muted}>—</span>}</td>
                      <td className={admin.nowrap}>{c.phone ? <a href={`tel:${c.phoneE164 ?? c.phone}`}>{c.phone}</a> : <span className={s.muted}>—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
