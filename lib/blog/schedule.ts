/**
 * The schedule box on a post takes a local date and time ("2026-12-01T09:30",
 * what <input type="datetime-local"> produces). This returns the ISO time the
 * API wants, or null when it isn't a real time at least a minute from now.
 */
export function scheduleIso(local: string, now: Date = new Date()): string | null {
  if (!local) return null;
  const at = new Date(local);
  if (Number.isNaN(at.getTime())) return null;
  if (at.getTime() < now.getTime() + 60_000) return null;
  return at.toISOString();
}
