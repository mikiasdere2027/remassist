import { z } from 'zod';

/**
 * Lead payload validation — MIGRATION-PLAN §9.1.
 *
 * Kept out of the route handler so it can be unit-tested without a database or
 * a running server: this is the boundary that decides what reaches Postgres,
 * and it is the part most worth having tests on.
 */
export const LEAD_SOURCES = ['qualify_quiz', 'ask_widget', 'contact_form', 'pricing_cta'] as const;

export const LeadBody = z.object({
  name: z.string().trim().max(120).optional(),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: z.string().trim().max(40).optional(),
  company: z.string().trim().max(160).optional(),
  message: z.string().trim().max(5000).optional(),
  page: z.string().url().max(500).optional(),
  source: z.enum(LEAD_SOURCES),
  /* Hidden field. A human never sees it, so anything in it is a bot.
     Deliberately NOT `.max(0)`: that makes the parser reject the body with a
     400, which tells the bot its submission failed and what to change. Letting
     it through validation lets the route answer 200 and drop it silently,
     which is the behaviour §9.1 describes. */
  honey: z.string().max(500).optional(),
  /* First/last touch campaign data, read from the visitor's attribution
     cookies at submit time. Client-supplied and therefore untrusted, so both
     the number of keys and the length of each value are bounded — this lands
     in a jsonb column and an unbounded record is a free write amplifier.
     See lib/analytics/attribution.ts for why the cookie exists at all. */
  attribution: z
    .object({
      first: z.record(z.string().max(40), z.string().max(200)).optional(),
      last: z.record(z.string().max(40), z.string().max(200)).optional(),
    })
    .refine(
      (a) => Object.keys(a.first ?? {}).length <= 20 && Object.keys(a.last ?? {}).length <= 20,
      { message: 'too many attribution keys' },
    )
    .optional(),
  /* Optional quiz payload, sent when source is qualify_quiz. */
  quiz: z
    .object({
      answers: z.record(z.string(), z.string()),
      result: z.record(z.string(), z.unknown()),
      completed: z.boolean().optional(),
    })
    .optional(),
});

export type LeadInput = z.infer<typeof LeadBody>;

/** UTM parameters worth keeping, pulled from the submitting page's query. */
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;

/**
 * Extract UTM parameters from the page URL the client reported. Returns
 * undefined rather than an empty object so the column stays NULL when there is
 * nothing to record.
 */
export function utmFromPage(page: string | undefined): Record<string, string> | undefined {
  if (!page) return undefined;
  let params: URLSearchParams;
  try {
    params = new URL(page).searchParams;
  } catch {
    return undefined;
  }
  const out: Record<string, string> = {};
  for (const k of UTM_KEYS) {
    const v = params.get(k);
    if (v) out[k] = v.slice(0, 200);
  }
  return Object.keys(out).length ? out : undefined;
}
