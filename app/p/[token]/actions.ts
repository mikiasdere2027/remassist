import { crmApi } from '@/lib/api/crm';
import { ApiError } from '@/lib/api/errors';

/**
 * The client's answer to a proposal, from the public page. No sign-in: the
 * unguessable token in the URL is the credential, as with any shared
 * document link. The backend rate-limits answers per visitor; a hidden
 * field catches bots.
 */
export type AnswerState = { ok: true; accepted: boolean } | { ok: false; error: string } | null;

export async function answerProposal(
  token: string,
  accept: boolean,
  _prev: AnswerState,
  fd: FormData,
): Promise<AnswerState> {
  if (fd.get('website')) return { ok: true, accepted: accept }; // honeypot: say nothing useful
  const name = String(fd.get('name') ?? '').trim();
  const note = String(fd.get('note') ?? '').trim();
  if (name.length < 2) return { ok: false, error: 'Type your full name.' };
  if (accept && fd.get('agree') !== 'on') return { ok: false, error: 'Tick the box to confirm you accept.' };
  try {
    await crmApi.answerProposal(token, { accept, name, note: note || null });
    return { ok: true, accepted: accept };
  } catch (err) {
    if (err instanceof ApiError && err.status === 429) {
      return { ok: false, error: 'Too many attempts. Wait a few minutes and try again.' };
    }
    const message = err instanceof Error ? err.message : '';
    return {
      ok: false,
      error: /^This/.test(message) ? message : 'Something went wrong. Please try again, or reply to our email.',
    };
  }
}
