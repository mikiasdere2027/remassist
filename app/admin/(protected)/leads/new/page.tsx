import Link from 'next/link';
import { requireUser } from '@/lib/auth/require';
import { getTeam } from '@/lib/crm/leads';
import { SERVICES } from '@/lib/services';
import AdminTopbar from '../../AdminTopbar';
import NewLeadForm from './NewLeadForm';
import admin from '../../../admin.module.css';
import s from '../../crm.module.css';

/** Add a lead by hand: a referral, an event contact, an outbound prospect. */
export const dynamic = 'force-dynamic';

export default async function NewLeadPage() {
  const me = await requireUser();
  const team = await getTeam();
  const services = SERVICES.map((x) => x.name).filter((n) => n !== 'All Services');

  return (
    <>
      <AdminTopbar title="Add lead" subtitle="Someone you met, were referred to, or are reaching out to" />
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
            <h2 className={s.cardTitle}>New lead</h2>
            <span className={s.cardNote}>Email is required; it is how duplicates are caught</span>
          </div>
          <NewLeadForm team={team} me={me.id} services={services} />
        </section>
      </div>
    </>
  );
}
