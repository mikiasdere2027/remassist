import type { AssignmentRule } from '@/lib/api/crm';
import type { Assignee } from '@/lib/api/leads';

/**
 * Lead assignment rules as the settings form shows them: one per line,
 * "service | email of a team member" (a username works too). The backend
 * stores the person's id. From Mikias's saveAutomation.
 */
export type ParsedRules = { ok: true; rules: AssignmentRule[] } | { ok: false; error: string };

export function parseRules(text: string, team: Pick<Assignee, 'id' | 'username' | 'email'>[]): ParsedRules {
  const byKey = new Map<string, string>();
  for (const u of team) {
    byKey.set(u.email.toLowerCase(), u.id);
    byKey.set(u.username.toLowerCase(), u.id);
  }
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rules: AssignmentRule[] = [];
  for (const [i, line] of lines.entries()) {
    const [service, who] = line.split('|').map((x) => x.trim());
    const ownerId = byKey.get((who ?? '').toLowerCase());
    if (!service || !ownerId) return { ok: false, error: `Rule ${i + 1}: write "service | email of a team member".` };
    rules.push({ service, ownerId });
  }
  return { ok: true, rules };
}

export function rulesToText(rules: AssignmentRule[], team: Pick<Assignee, 'id' | 'email'>[]): string {
  const emailOf = new Map(team.map((u) => [u.id, u.email]));
  return rules.map((r) => `${r.service} | ${emailOf.get(r.ownerId) ?? ''}`).join('\n');
}
