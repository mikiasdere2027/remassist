import { requireUser } from '@/lib/auth/require';
import { currentWorkspaceId } from '@/lib/crm/workspace';
import { getStages } from '@/lib/crm/deals';
import { getTeam } from '@/lib/crm/leads';
import { SERVICES } from '@/lib/services';
import AdminTopbar from '../../AdminTopbar';
import { BackLink } from '../../CrmParts';
import DealForm from '../DealForm';
import { createDealAction } from '../actions';
import admin from '../../../admin.module.css';
import s from '../../crm.module.css';

/** A deal that did not start as a lead: an upsell, a renewal, a referral by phone. */
export const dynamic = 'force-dynamic';

export default async function NewDealPage() {
  await requireUser();
  const ws = currentWorkspaceId();
  const [stages, team] = await Promise.all([getStages(ws), getTeam()]);
  return (
    <>
      <AdminTopbar title="New deal" subtitle="For an existing customer, a referral, or anything that skipped the lead stage" />
      <div className={admin.view}>
        <BackLink href="/admin/deals">Back to deals</BackLink>
        <section className={`${s.card} ${s.narrow}`}>
          <div className={s.cardHead}>
            <h2 className={s.cardTitle}>Deal</h2>
            <span className={s.cardNote}>An existing company is linked by name or website</span>
          </div>
          <DealForm
            mode="new"
            action={createDealAction}
            submitLabel="Create deal"
            stages={stages.filter((x) => x.kind === 'open').map((x) => ({ id: x.id, name: x.name }))}
            stageProbabilities={Object.fromEntries(stages.map((x) => [x.id, x.probability]))}
            team={team}
            services={SERVICES.map((x) => x.name).filter((n) => n !== 'All Services')}
          />
        </section>
      </div>
    </>
  );
}
