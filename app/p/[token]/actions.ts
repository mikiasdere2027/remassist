'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { decide } from '@/lib/crm/proposalsData';
import { rateLimit } from '@/lib/rate-limit';

/**
 * The client's answer to a proposal, from the public page. No sign-in: the
 * unguessable token in the URL is the credential, as with any shared
 * document link. Rate-limited per address; a hidden field catches bots.
 */
export type AnswerState = { ok: true; accepted: boolean } | { ok: false; error: string } | null;

const Answer = z.object({
  name: z.string().trim().min(2, 'Type your full name.').max(120),
  note: z.string().trim().max(2000).optional(),
  agree: z.literal('on', { message: 'Tick the box to confirm.' }).optional(),
});

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get('x-real-ip') ?? h.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
}

export async function answerProposal(token: string, accept: boolean, _prev: AnswerState, fd: FormData): Promise<AnswerState> {
  if (fd.get('website')) return { ok: true, accepted: accept };            // honeypot: say nothing useful
  if (!rateLimit(`proposal:${await clientIp()}`, { limit: 8, windowSec: 600 })) {
    return { ok: false, error: 'Too many attempts. Wait a few minutes and try again.' };
  }
  const parsed = Answer.safeParse({ name: fd.get('name') ?? '', note: fd.get('note') || undefined, agree: fd.get('agree') ?? undefined });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (accept && parsed.data.agree !== 'on') return { ok: false, error: 'Tick the box to confirm you accept.' };
  try {
    await decide(token, accept, parsed.data.name, parsed.data.note ?? null);
  } catch (e) {
    return { ok: false, error: e instanceof Error && /^This/.test(e.message) ? e.message : 'Something went wrong. Please try again, or reply to our email.' };
  }
  revalidatePath(`/p/${token}`);
  return { ok: true, accepted: accept };
}
