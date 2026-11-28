import { getSiteSettings } from '@/lib/site/get-settings';

/**
 * "Book a call". Every booking button on the site links here, and this sends
 * the visitor to the booking link set in the admin (Site details), so changing
 * the link is an edit, not a deploy. With JavaScript the booking modal opens
 * instead of leaving the page; this redirect is what a ctrl-click, a new tab
 * or a visitor without JavaScript gets.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const { bookingUrl } = await getSiteSettings();
  return new Response(null, {
    status: 302,
    headers: { location: bookingUrl, 'cache-control': 'no-store', 'x-robots-tag': 'noindex' },
  });
}
