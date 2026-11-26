import { crmApi, type DealInput } from '@/lib/api/crm';
import { fail, run, type ActionResult } from '../crm-actions';

/**
 * Deal writes from the board, the deal page, the New deal form and a lead's
 * Conversion tab. They used to be server actions writing to the database;
 * they now call the backend (/v1/admin/deals, /v1/admin/leads/:id/convert),
 * which owns the rules (money, stages, conversion). Same names and results as
 * before, so the forms are unchanged.
 */
export type DealFormState = { error: string } | null;

/** The form's fields, as typed. Blank means "not given". */
function fields(fd: FormData, keys: readonly string[]): DealInput {
  return Object.fromEntries(
    keys.map((k) => {
      const v = fd.get(k);
      return [k, typeof v === 'string' && v.trim() !== '' ? v.trim() : null];
    }),
  );
}

const DEAL_FIELDS = [
  'title', 'companyName', 'contactEmail', 'contactName', 'service', 'tier', 'seats',
  'hoursPerMonth', 'rate', 'monthlyValue', 'probability', 'expectedClose', 'stageId', 'ownerId',
] as const;
const EDIT_FIELDS = [
  'title', 'service', 'tier', 'seats', 'hoursPerMonth', 'rate', 'monthlyValue', 'probability', 'expectedClose',
] as const;

/** The error to show on the form. */
function formError(err: unknown, fallback: string): DealFormState {
  const r = fail(err, fallback);
  return { error: r.ok ? fallback : r.error };
}

/** New deal from scratch; opens it on success. */
export async function createDealAction(_prev: DealFormState, fd: FormData): Promise<DealFormState> {
  try {
    const { id } = await crmApi.createDeal(fields(fd, DEAL_FIELDS));
    window.location.assign(`/admin/deals/${id}`);
    return null;
  } catch (err) {
    return formError(err, 'Could not open the deal.');
  }
}

/** Convert a lead: company + contact + deal, and the lead becomes Converted. */
export async function convertLeadAction(
  leadId: string,
  _prev: DealFormState,
  fd: FormData,
): Promise<DealFormState> {
  try {
    const { id } = await crmApi.convertLead(leadId, fields(fd, DEAL_FIELDS));
    window.location.assign(`/admin/deals/${id}`);
    return null;
  } catch (err) {
    return formError(err, 'Could not convert the lead.');
  }
}

/** Edit the deal's commercial fields. */
export const updateDealAction = (dealId: string, _prev: ActionResult | null, fd: FormData) =>
  run('Could not save the deal.', () => crmApi.updateDeal(dealId, fields(fd, EDIT_FIELDS)));

/** Move a deal to a stage (board drag, or the stage control on the deal page). */
export const moveDealStage = (dealId: string, stageId: string, lossReasonId?: string, lossNote?: string) =>
  run('Could not move the deal.', () =>
    crmApi.moveDeal(dealId, {
      stageId,
      ...(lossReasonId ? { lossReasonId } : {}),
      ...(lossNote?.trim() ? { lossNote: lossNote.trim() } : {}),
    }),
  );
