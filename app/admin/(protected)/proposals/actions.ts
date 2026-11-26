import { crmApi } from '@/lib/api/crm';
import { run, type ActionResult } from '../crm-actions';

/**
 * Proposal writes from the deal page and the proposal page. They used to be
 * server actions writing to the database; they now call the backend
 * (/v1/admin/proposals), which prices every save itself and freezes a
 * proposal once it is sent.
 */
const text = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
};

/** A new draft from the deal's terms; opens it. */
export async function newProposal(dealId: string): Promise<ActionResult> {
  const r = await run('Could not start a proposal.', async () => {
    const { id } = await crmApi.draftProposal(dealId);
    window.location.assign(`/admin/proposals/${id}`);
  });
  return r;
}

/** A new draft copying a sent proposal, for a revised offer; opens it. */
export async function reviseProposal(id: string): Promise<ActionResult> {
  return run('Could not start a revision.', async () => {
    const { id: draft } = await crmApi.reviseProposal(id);
    window.location.assign(`/admin/proposals/${draft}`);
  });
}

/** The editor's save: the backend works out the totals. */
export function saveProposal(id: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  let lines: unknown;
  try {
    lines = JSON.parse(String(fd.get('lines') ?? '[]'));
  } catch {
    return Promise.resolve({ ok: false, error: 'The lines could not be read. Reload and try again.' });
  }
  return run('Could not save the proposal.', () =>
    crmApi.saveProposal(id, {
      title: text(fd, 'title') ?? '',
      intro: text(fd, 'intro'),
      terms: text(fd, 'terms'),
      validUntil: text(fd, 'validUntil'),
      recipientName: text(fd, 'recipientName'),
      recipientEmail: text(fd, 'recipientEmail'),
      discount: text(fd, 'discount') ?? '',
      lines,
    }),
  );
}

export const markProposalSent = (id: string) =>
  run('Could not mark the proposal as sent.', () => crmApi.sendProposal(id));

export const withdrawProposal = (id: string) =>
  run('Could not withdraw the proposal.', () => crmApi.withdrawProposal(id));
