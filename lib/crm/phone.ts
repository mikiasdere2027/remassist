/**
 * Phone numbers to E.164 (+<country><number>), the form calls are matched on.
 *
 * Deliberately conservative: a number is only normalised when the result is
 * unambiguous. A wrong E.164 would attach a call to the wrong person, which is
 * worse than no match, so anything uncertain returns null and the raw value is
 * kept for display.
 */

/** Calling codes for the countries leads most often come from. */
const CALLING_CODES: Record<string, string> = {
  US: '1', CA: '1', ET: '251', KE: '254', GB: '44', UK: '44', AE: '971', SA: '966',
  ZA: '27', NG: '234', IN: '91', PH: '63', AU: '61', DE: '49', FR: '33', NL: '31',
};

/** Country names as the lead form sends them → ISO code. */
const COUNTRY_NAMES: Record<string, string> = {
  'united states': 'US', usa: 'US', 'united states of america': 'US', canada: 'CA', ethiopia: 'ET',
  kenya: 'KE', 'united kingdom': 'GB', uk: 'GB', 'united arab emirates': 'AE', uae: 'AE',
  'saudi arabia': 'SA', 'south africa': 'ZA', nigeria: 'NG', india: 'IN', philippines: 'PH',
  australia: 'AU', germany: 'DE', france: 'FR', netherlands: 'NL',
};

export function countryCode(country: string | null | undefined): string | undefined {
  if (!country) return undefined;
  const c = country.trim();
  if (/^[A-Za-z]{2}$/.test(c)) return c.toUpperCase();
  return COUNTRY_NAMES[c.toLowerCase()];
}

/**
 * @param raw     the number as typed
 * @param country ISO code or country name, used only when the number has no
 *                international prefix
 */
export function toE164(raw: string | null | undefined, country?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  // Extensions are not part of the dialable number.
  const main = trimmed.split(/\s*(?:ext\.?|x|#)\s*\d+$/i)[0];
  const digits = main.replace(/\D/g, '');
  if (!digits) return null;

  let intl: string | null = null;
  if (main.startsWith('+')) intl = digits;
  else if (digits.startsWith('00')) intl = digits.slice(2);
  else {
    const iso = countryCode(country);
    const cc = iso ? CALLING_CODES[iso] : undefined;
    if (cc === '1') {
      if (digits.length === 10) intl = `1${digits}`;
      else if (digits.length === 11 && digits.startsWith('1')) intl = digits;
    } else if (cc) {
      // National format drops the leading trunk 0 (0911 234 567 → +251 911 234 567).
      const national = digits.replace(/^0+/, '');
      if (national.length >= 7) intl = `${cc}${national}`;
    }
  }

  if (!intl || intl.startsWith('0')) return null;
  // E.164 allows at most 15 digits; fewer than 8 is not a real subscriber number.
  if (intl.length < 8 || intl.length > 15) return null;
  return `+${intl}`;
}
