import { describe, expect, it } from 'vitest';
import { escapeLike } from './query';

/**
 * Not a security boundary — Drizzle parameterises the pattern, so nothing here
 * prevents injection. It prevents a search box that quietly lies: LIKE
 * metacharacters inside the search *term* are still wildcards.
 */
describe('escapeLike', () => {
  it('leaves an ordinary term alone', () => {
    expect(escapeLike('navsys')).toBe('navsys');
    expect(escapeLike('ada@example.com')).toBe('ada@example.com');
  });

  it('escapes the percent wildcard, which otherwise matches every row', () => {
    expect(escapeLike('%')).toBe('\\%');
    expect(escapeLike('50%off')).toBe('50\\%off');
  });

  it('escapes the underscore, which is common in real email addresses', () => {
    // Unescaped, first_last@x.com also matches firstXlast@x.com.
    expect(escapeLike('first_last')).toBe('first\\_last');
  });

  it('escapes the escape character itself', () => {
    expect(escapeLike('a\\b')).toBe('a\\\\b');
  });

  it('handles an empty string', () => {
    expect(escapeLike('')).toBe('');
  });
});
