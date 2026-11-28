import { describe, expect, it } from 'vitest';
import { isBookingLink } from './link';

const ORIGIN = 'https://remassistance.com';

describe('isBookingLink', () => {
  it('knows the site\'s own booking link', () => {
    expect(isBookingLink('/book', ORIGIN)).toBe(true);
    expect(isBookingLink('https://remassistance.com/book', ORIGIN)).toBe(true);
    expect(isBookingLink('https://remassistance.com/book?utm_source=x', ORIGIN)).toBe(true);
    expect(isBookingLink('/book/', ORIGIN)).toBe(true);
  });
  it('still knows a direct Calendly link (old pages, pasted links)', () => {
    expect(isBookingLink('https://calendly.com/anyone/meeting', ORIGIN)).toBe(true);
    expect(isBookingLink('https://app.calendly.com/x', ORIGIN)).toBe(true);
  });
  it('leaves everything else alone', () => {
    expect(isBookingLink('/booking', ORIGIN)).toBe(false);
    expect(isBookingLink('/book-a-demo', ORIGIN)).toBe(false);
    expect(isBookingLink('/api/voice/book', ORIGIN)).toBe(false);
    expect(isBookingLink('https://evil.example/book', ORIGIN)).toBe(false);
    expect(isBookingLink('https://notcalendly.com/x', ORIGIN)).toBe(false);
    expect(isBookingLink('mailto:support@remassistance.com', ORIGIN)).toBe(false);
    expect(isBookingLink('', ORIGIN)).toBe(false);
    expect(isBookingLink(null, ORIGIN)).toBe(false);
  });
});
