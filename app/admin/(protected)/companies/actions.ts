'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, isNull, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb, isDatabaseConfigured } from '@/db';
import { companies, contacts, users } from '@/db/schema';
import { assertUser } from '@/lib/auth/require';
import { canEditLeads } from '@/lib/auth/roles';
import { currentWorkspaceId } from '@/lib/crm/workspace';
import { logActivity, recordEvent } from '@/lib/crm/events';
import { domainFromWebsite, normalizeEmail } from '@/lib/crm/dedupe';
import { toE164 } from '@/lib/crm/phone';
import type { ActionResult } from '../leads/[id]/actions';

/** Company and contact writes. Each re-checks the session (not covered by the layout gate). */

const UUID = /^[0-9a-f-]{36}$/i;
const opt = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : null));

async function editor() {
  const user = await assertUser();
  if (!canEditLeads(user.role)) throw new Error('forbidden');
  if (!isDatabaseConfigured()) throw new Error('database unavailable');
  return user;
}

function done(id: string): ActionResult {
  revalidatePath(`/admin/companies/${id}`);
  revalidatePath('/admin/companies');
  revalidatePath('/admin/contacts');
  return { ok: true, at: Date.now() };
}

const CompanyInput = z.object({
  name: z.string().trim().min(1, 'The company needs a name.').max(160),
  website: opt(300),
  industry: opt(120),
  size: opt(60),
  country: opt(80),
});

export async function updateCompany(id: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await editor();
  if (!UUID.test(id)) return { ok: false, error: 'Unknown company.' };
  const parsed = CompanyInput.safeParse(Object.fromEntries(['name', 'website', 'industry', 'size', 'country'].map((k) => [k, fd.get(k) ?? undefined])));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const ws = currentWorkspaceId();
  const domain = domainFromWebsite(parsed.data.website);
  if (parsed.data.website && !domain) return { ok: false, error: 'The website should look like northwind.com.' };

  try {
    await getDb().transaction(async (tx) => {
      const [before] = await tx.select().from(companies).where(and(eq(companies.workspaceId, ws), eq(companies.id, id))).for('update');
      if (!before) throw new Error('That company no longer exists.');
      if (domain) {
        const [clash] = await tx.select({ name: companies.name }).from(companies)
          .where(and(eq(companies.workspaceId, ws), eq(companies.domain, domain), ne(companies.id, id))).limit(1);
        if (clash) throw new Error(`${clash.name} already uses ${domain}.`);
      }
      const next = { ...parsed.data, domain: domain ?? before.domain };
      const changed = (Object.keys(next) as Array<keyof typeof next>).filter((k) => (before[k] ?? null) !== (next[k] ?? null));
      if (changed.length === 0) return;
      await tx.update(companies).set({ ...next, updatedAt: new Date() }).where(eq(companies.id, id));
      await recordEvent(tx, { workspaceId: ws, type: 'company.updated', subjectType: 'company', subjectId: id, actorId: user.id, payload: { fields: changed } });
      await logActivity(tx, { workspaceId: ws, type: 'system', companyId: id, actorId: user.id, body: `Company details updated: ${changed.join(', ')}` });
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error && !/^(forbidden|database)/.test(e.message) ? e.message : 'Could not save the company.' };
  }
  return done(id);
}

export async function setCompanyOwner(id: string, ownerId: string): Promise<ActionResult> {
  const user = await editor();
  if (!UUID.test(id)) return { ok: false, error: 'Unknown company.' };
  const ws = currentWorkspaceId();
  const next = ownerId || null;
  if (next) {
    const [u] = await getDb().select({ id: users.id }).from(users).where(and(eq(users.id, next), isNull(users.disabledAt)));
    if (!u) return { ok: false, error: 'That person no longer has access.' };
  }
  await getDb().transaction(async (tx) => {
    const [before] = await tx.select({ ownerId: companies.ownerId }).from(companies).where(and(eq(companies.workspaceId, ws), eq(companies.id, id))).for('update');
    if (!before || before.ownerId === next) return;
    await tx.update(companies).set({ ownerId: next, updatedAt: new Date() }).where(eq(companies.id, id));
    await logActivity(tx, { workspaceId: ws, type: 'owner_change', companyId: id, actorId: user.id, meta: { from: before.ownerId, to: next } });
  });
  return done(id);
}

const ContactInput = z.object({
  firstName: opt(60),
  lastName: opt(60),
  email: z.union([z.literal(''), z.string().trim().toLowerCase().email('Enter a valid email address.')]).optional().transform((v) => v || null),
  phone: opt(40),
  jobTitle: opt(120),
});

export async function addContact(companyId: string, _prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await editor();
  if (!UUID.test(companyId)) return { ok: false, error: 'Unknown company.' };
  const parsed = ContactInput.safeParse(Object.fromEntries(['firstName', 'lastName', 'email', 'phone', 'jobTitle'].map((k) => [k, fd.get(k) ?? undefined])));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const c = parsed.data;
  if (!c.firstName && !c.lastName && !c.email) return { ok: false, error: 'Give a name or an email.' };
  const ws = currentWorkspaceId();

  try {
    await getDb().transaction(async (tx) => {
      const [company] = await tx.select({ id: companies.id, country: companies.country }).from(companies)
        .where(and(eq(companies.workspaceId, ws), eq(companies.id, companyId))).limit(1);
      if (!company) throw new Error('That company no longer exists.');
      const email = normalizeEmail(c.email);
      if (email) {
        const [dup] = await tx.select({ id: contacts.id }).from(contacts).where(and(eq(contacts.workspaceId, ws), eq(contacts.email, email))).limit(1);
        if (dup) throw new Error('A contact with this email already exists.');
      }
      const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(contacts).where(and(eq(contacts.companyId, companyId), isNull(contacts.archivedAt)));
      const [row] = await tx.insert(contacts).values({
        workspaceId: ws, companyId, email, firstName: c.firstName, lastName: c.lastName, phone: c.phone,
        phoneE164: toE164(c.phone, company.country), jobTitle: c.jobTitle, isPrimary: n === 0,
      }).returning({ id: contacts.id });
      await recordEvent(tx, { workspaceId: ws, type: 'contact.created', subjectType: 'contact', subjectId: row.id, actorId: user.id, payload: { companyId } });
      await logActivity(tx, {
        workspaceId: ws, type: 'system', companyId, actorId: user.id,
        body: `Contact added: ${[c.firstName, c.lastName].filter(Boolean).join(' ') || email}`,
      });
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error && !/^(forbidden|database)/.test(e.message) ? e.message : 'Could not add the contact.' };
  }
  return done(companyId);
}

/** Remove a contact from the company list. Archived, never deleted. */
export async function archiveContact(contactId: string): Promise<ActionResult> {
  const user = await editor();
  if (!UUID.test(contactId)) return { ok: false, error: 'Unknown contact.' };
  const ws = currentWorkspaceId();
  let companyId: string | null = null;
  await getDb().transaction(async (tx) => {
    const [c] = await tx.select().from(contacts).where(and(eq(contacts.workspaceId, ws), eq(contacts.id, contactId))).for('update');
    if (!c || c.archivedAt) return;
    companyId = c.companyId;
    await tx.update(contacts).set({ archivedAt: new Date(), isPrimary: false, updatedAt: new Date() }).where(eq(contacts.id, contactId));
    if (c.companyId) {
      await logActivity(tx, {
        workspaceId: ws, type: 'system', companyId: c.companyId, actorId: user.id,
        body: `Contact removed: ${[c.firstName, c.lastName].filter(Boolean).join(' ') || c.email}`,
      });
      /* Keep exactly one primary contact while any remain. */
      if (c.isPrimary) {
        const [nextPrimary] = await tx.select({ id: contacts.id }).from(contacts)
          .where(and(eq(contacts.companyId, c.companyId), isNull(contacts.archivedAt))).limit(1);
        if (nextPrimary) await tx.update(contacts).set({ isPrimary: true }).where(eq(contacts.id, nextPrimary.id));
      }
    }
  });
  return companyId ? done(companyId) : { ok: true, at: Date.now() };
}
