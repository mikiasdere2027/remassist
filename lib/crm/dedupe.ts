/**
 * Matching keys for "have we seen this person or company before?".
 *
 * Pure functions; the lookups that use them live with the intake code. An
 * enquiry from jane@northwind.com attaches to the Northwind company; one from
 * jane@gmail.com does not invent a "gmail.com" company.
 */

const FREE_MAIL = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'ymail.com', 'hotmail.com', 'hotmail.co.uk',
  'outlook.com', 'live.com', 'msn.com', 'icloud.com', 'me.com', 'mac.com', 'aol.com', 'proton.me',
  'protonmail.com', 'gmx.com', 'gmx.net', 'mail.com', 'zoho.com', 'yandex.com', 'yandex.ru', 'qq.com',
  '163.com', 'hey.com', 'fastmail.com', 'tutanota.com',
]);

export function normalizeEmail(email: string | null | undefined): string | null {
  const e = email?.trim().toLowerCase();
  return e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
}

export function emailDomain(email: string | null | undefined): string | null {
  const e = normalizeEmail(email);
  return e ? e.slice(e.lastIndexOf('@') + 1) : null;
}

export function isFreeMailDomain(domain: string): boolean {
  return FREE_MAIL.has(domain.toLowerCase());
}

/** The company domain implied by a work email; null for personal mailboxes. */
export function companyDomainFromEmail(email: string | null | undefined): string | null {
  const d = emailDomain(email);
  return d && !isFreeMailDomain(d) ? d : null;
}

/** "https://www.Northwind.com/about" → "northwind.com". */
export function domainFromWebsite(website: string | null | undefined): string | null {
  if (!website?.trim()) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(website.trim()) ? website.trim() : `https://${website.trim()}`;
  try {
    const host = new URL(withScheme).hostname.toLowerCase().replace(/^www\./, '');
    return host.includes('.') ? host : null;
  } catch {
    return null;
  }
}
