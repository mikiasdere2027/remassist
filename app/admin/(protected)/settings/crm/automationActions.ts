'use server';

import { revalidatePath } from 'next/cache';
import { eq, isNull } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { users, workspaces } from '@/db/schema';
import { assertUser } from '@/lib/auth/require';
import { canManageCrmSettings } from '@/lib/auth/roles';
import { currentWorkspaceId } from '@/lib/crm/workspace';
import { AutomationSettings, formatDigest } from '@/lib/crm/automation';
import { digestData } from '@/lib/crm/automationData';
import { notifyText } from '@/lib/notify';
import { SITE_URL } from '@/lib/site';
import type { ActionResult } from '../../leads/[id]/actions';

/** Lead assignment and digest settings. Admin only, re-checked here. */

async function admin() {
  const user = await assertUser();
  if (!canManageCrmSettings(user.role)) throw new Error('forbidden');
  if (!isDatabaseConfigured()) throw new Error('database unavailable');
  return user;
}

export async function saveAutomation(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  await admin();
  const team = await getDb().select({ id: users.id, email: users.email }).from(users).where(isNull(users.disabledAt));
  const byEmail = new Map(team.map((u) => [u.email.toLowerCase(), u.id]));

  const rules: Array<{ service: string; ownerId: string }> = [];
  const lines = String(fd.get('rules') ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const [i, line] of lines.entries()) {
    const [service, email] = line.split('|').map((x) => x.trim());
    const ownerId = byEmail.get((email ?? '').toLowerCase());
    if (!service || !ownerId) return { ok: false, error: `Rule ${i + 1}: write "service | email of a team member".` };
    rules.push({ service, ownerId });
  }
  const parsed = AutomationSettings.safeParse({
    assignMode: fd.get('assignMode'),
    defaultOwnerId: fd.get('defaultOwnerId') || null,
    pool: fd.getAll('pool').map(String).filter((id) => team.some((u) => u.id === id)),
    rules,
    firstContactTask: fd.get('firstContactTask') === 'on',
    firstContactHours: Number(fd.get('firstContactHours') || 2),
  });
  if (!parsed.success) return { ok: false, error: 'Check the settings: the reply target is 1 to 72 hours.' };
  if (parsed.data.assignMode === 'single' && !parsed.data.defaultOwnerId) return { ok: false, error: 'Choose who gets every new lead.' };

  const ws = currentWorkspaceId();
  await getDb().transaction(async (tx) => {
    const [w] = await tx.select({ settings: workspaces.settings }).from(workspaces).where(eq(workspaces.id, ws)).for('update');
    await tx.update(workspaces).set({ settings: { ...(w?.settings ?? {}), automation: parsed.data } }).where(eq(workspaces.id, ws));
  });
  revalidatePath('/admin/settings/crm');
  return { ok: true, at: Date.now() };
}

/** Post today's digest to Slack now (also what the daily job does). */
export async function sendDigestNow(): Promise<ActionResult> {
  await admin();
  if (!process.env.LEAD_WEBHOOK_URL) return { ok: false, error: 'Slack is not connected: LEAD_WEBHOOK_URL is not set on the server.' };
  const text = formatDigest(await digestData(currentWorkspaceId(), SITE_URL));
  if (!text) return { ok: false, error: 'Nothing to report today, so nothing was sent.' };
  await notifyText(text);
  return { ok: true, at: Date.now() };
}
