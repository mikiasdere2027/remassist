/**
 * Is this href one of the site's "Book a call" links? Those are the site's own
 * /book (which redirects to the booking link set in the admin under Site
 * details) and, for old pages or a link someone pasted, a direct calendly.com
 * address. The booking modal opens for both.
 */
export function isBookingLink(href: string | null | undefined, origin: string): boolean {
  if (!href) return false;
  try {
    const url = new URL(href, origin);
    if (/(^|\.)calendly\.com$/i.test(url.hostname)) return true;
    return url.origin === origin && /^\/book\/?$/.test(url.pathname);
  } catch {
    return false;
  }
}
