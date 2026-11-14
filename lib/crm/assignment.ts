/**
 * Who gets a new lead.
 *
 * Rules are checked in order (e.g. "Managed IT enquiries go to Sam"); if none
 * matches, the lead goes round-robin to the next eligible person after whoever
 * received the previous one. Pure: the caller loads candidates, rules and the
 * last assignee, and writes the result.
 */

export interface AssignmentRule {
  /** Matches when the lead's service interest contains this text (case-insensitive). */
  service?: string;
  source?: string;
  ownerId: string;
}

export interface Candidate {
  id: string;
  disabled?: boolean;
}

export interface AssignmentInput {
  service?: string | null;
  source?: string | null;
}

export function pickOwner(
  lead: AssignmentInput,
  candidates: Candidate[],
  rules: AssignmentRule[],
  lastAssigneeId: string | null,
): string | null {
  const eligible = candidates.filter((c) => !c.disabled).map((c) => c.id).sort();
  if (eligible.length === 0) return null;

  for (const r of rules) {
    if (!eligible.includes(r.ownerId)) continue;
    const serviceOk = !r.service || (lead.service ?? '').toLowerCase().includes(r.service.toLowerCase());
    const sourceOk = !r.source || r.source === lead.source;
    if (serviceOk && sourceOk && (r.service || r.source)) return r.ownerId;
  }

  if (!lastAssigneeId) return eligible[0];
  // Next id after the last one in sorted order, wrapping; works even if the
  // last assignee has since been disabled or removed.
  return eligible.find((id) => id > lastAssigneeId) ?? eligible[0];
}
