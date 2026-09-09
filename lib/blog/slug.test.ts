import { describe, expect, it } from 'vitest';
import { slugify } from './slug';

/** The shape savePost enforces. Every slugify output must satisfy it. */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

describe('slugify', () => {
  it('lowercases and hyphenates a title', () => {
    expect(slugify('How to Hire a Remote Team')).toBe('how-to-hire-a-remote-team');
  });

  it('folds accents to their base letters', () => {
    expect(slugify('Café culture in Bogotá')).toBe('cafe-culture-in-bogota');
  });

  it('drops apostrophes rather than splitting the word', () => {
    expect(slugify("A team's first 90 days")).toBe('a-teams-first-90-days');
    expect(slugify('A team\u2019s first 90 days')).toBe('a-teams-first-90-days');
  });

  it('collapses punctuation and runs of separators into one hyphen', () => {
    expect(slugify('Offshore hiring: what works — and what does not!')).toBe(
      'offshore-hiring-what-works-and-what-does-not',
    );
  });

  it('keeps digits', () => {
    expect(slugify('The 2026 guide to 4 KPIs')).toBe('the-2026-guide-to-4-kpis');
  });

  it('has no leading or trailing hyphen', () => {
    expect(slugify('  ...Hello!  ')).toBe('hello');
  });

  it('returns empty for a title with nothing usable in it', () => {
    expect(slugify('!!!')).toBe('');
    expect(slugify('   ')).toBe('');
    expect(slugify('')).toBe('');
  });

  it('truncates without leaving a trailing hyphen', () => {
    const slug = slugify(`${'word '.repeat(60)}tail`);
    expect(slug.length).toBeLessThanOrEqual(120);
    expect(slug.endsWith('-')).toBe(false);
  });

  it('produces a slug the save action would accept', () => {
    for (const title of [
      'How to Hire a Remote Team',
      'Café culture in Bogotá',
      "A team's first 90 days",
      'Offshore hiring: what works — and what does not!',
      'The 2026 guide to 4 KPIs',
    ]) {
      expect(slugify(title)).toMatch(SLUG_RE);
    }
  });
});
