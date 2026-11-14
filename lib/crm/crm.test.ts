import { describe, expect, it } from 'vitest';
import { customFromFormData, formatCustomValue, validateCustomFields, type FieldDef } from './fields';

describe('custom fields', () => {
  const defs: FieldDef[] = [
    { key: 'seats_needed', label: 'Seats needed', type: 'number', required: true },
    { key: 'shift', label: 'Shift', type: 'select', options: ['day', 'night'] },
    { key: 'go_live', label: 'Go-live', type: 'date' },
    { key: 'old_field', label: 'Old', type: 'text', archivedAt: new Date() },
  ];
  it('accepts valid values and drops unknown keys', () => {
    const r = validateCustomFields(defs, { seats_needed: 3, shift: 'night', junk: 1 });
    expect(r.success && r.data).toEqual({ seats_needed: 3, shift: 'night' });
  });
  it('rejects bad values and missing required ones', () => {
    expect(validateCustomFields(defs, { seats_needed: 3, shift: 'weekend' }).success).toBe(false);
    expect(validateCustomFields(defs, { seats_needed: 3, go_live: '12/01/2026' }).success).toBe(false);
    expect(validateCustomFields(defs, {}).success).toBe(false);
  });
  it('reads a form into typed values', () => {
    const fd = new FormData();
    fd.set('cf_seats_needed', ' 4 ');
    fd.set('cf_shift', '');
    fd.append('cf_tags', 'a');
    fd.append('cf_tags', 'b');
    const withTags: FieldDef[] = [...defs, { key: 'tags', label: 'Tags', type: 'multiselect', options: ['a', 'b'] }];
    expect(customFromFormData(withTags, fd)).toEqual({ seats_needed: 4, shift: null, go_live: null, tags: ['a', 'b'] });
    expect(formatCustomValue(withTags[4], ['a', 'b'])).toBe('a, b');
    expect(formatCustomValue(defs[0], null)).toBe('');
  });
  it('keeps values of archived fields', () => {
    const r = validateCustomFields(defs, { seats_needed: 1 }, { old_field: 'kept' });
    expect(r.success && r.data).toEqual({ old_field: 'kept', seats_needed: 1 });
  });
});
