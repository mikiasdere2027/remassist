import { describe, expect, it } from 'vitest';
import { parseRules, rulesToText } from './automation';

const team = [
  { id: 'u1', name: 'Sam Girma', username: 'sam', email: 'sam@remassistance.com' },
  { id: 'u2', name: 'Hana Tesfaye', username: 'hana', email: 'Hana@remassistance.com' },
];

describe('assignment rules as text', () => {
  it('reads "service | email" lines, one rule each, ignoring blank lines', () => {
    expect(parseRules('Managed IT | sam@remassistance.com\n\n  HR & Recruiting |hana@REMASSISTANCE.com  ', team)).toEqual({
      ok: true,
      rules: [
        { service: 'Managed IT', ownerId: 'u1' },
        { service: 'HR & Recruiting', ownerId: 'u2' },
      ],
    });
  });
  it('also takes a username', () => {
    expect(parseRules('Bookkeeping | hana', team)).toEqual({ ok: true, rules: [{ service: 'Bookkeeping', ownerId: 'u2' }] });
  });
  it('names the line it cannot read', () => {
    expect(parseRules('Managed IT | sam\nPayroll | nobody@x.com', team)).toEqual({
      ok: false,
      error: 'Rule 2: write "service | email of a team member".',
    });
    expect(parseRules('Managed IT', team)).toEqual({ ok: false, error: 'Rule 1: write "service | email of a team member".' });
  });
  it('writes saved rules back as text, by email', () => {
    expect(rulesToText([{ service: 'Managed IT', ownerId: 'u1' }, { service: 'Old', ownerId: 'gone' }], team)).toBe(
      'Managed IT | sam@remassistance.com\nOld | ',
    );
  });
});
