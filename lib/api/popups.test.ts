import { describe, expect, it } from 'vitest';
import { ApiError } from './errors';
import { isoToLocal, localToIso, missingFromError } from './popups';

describe('popup schedule conversion', () => {
  it('turns a datetime-local value into an ISO instant with an offset', () => {
    const iso = localToIso('2026-09-08T10:30');
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(isoToLocal(iso)).toBe('2026-09-08T10:30');
  });

  it('treats empty as no bound', () => {
    expect(localToIso('')).toBeNull();
    expect(isoToLocal(null)).toBe('');
    expect(isoToLocal('nonsense')).toBe('');
  });
});

describe('missingFromError', () => {
  it('reads the backend publish gate', () => {
    const err = new ApiError(400, { message: 'Incomplete', missing: ['Message', 'CTA label'] });
    expect(missingFromError(err)).toEqual(['Message', 'CTA label']);
  });

  it('is empty for anything else', () => {
    expect(missingFromError(new ApiError(409, { message: 'taken' }))).toEqual([]);
    expect(missingFromError(new Error('x'))).toEqual([]);
  });
});
