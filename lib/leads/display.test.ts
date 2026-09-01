import { describe, expect, it } from 'vitest';
import {
  answerFor, csvCell, csvRow, formatDate, orderedAnswers, questionFor, unknownRawKeys,
} from './display';

describe('unknownRawKeys', () => {
  it('reports nothing when every key has a named row already', () => {
    expect(unknownRawKeys({ first_name: 'Ada', email: 'a@b.com', consent: 'yes' })).toEqual([]);
  });

  it('surfaces a field a form starts sending that nobody has labelled yet', () => {
    // The entire point of keeping raw_fields: this is what stops the admin
    // from silently swallowing a new field the way `country` was swallowed.
    expect(unknownRawKeys({ email: 'a@b.com', budget_range: '5-10k' })).toEqual(['budget_range']);
  });

  it('handles a row written before raw_fields existed', () => {
    expect(unknownRawKeys(null)).toEqual([]);
    expect(unknownRawKeys(undefined)).toEqual([]);
  });
});

describe('quiz labelling', () => {
  it('resolves the real question text, so the admin reads as prose', () => {
    expect(questionFor('gap')).toBe('Where is the work piling up right now?');
  });

  it('resolves an answer value to the option the prospect actually clicked', () => {
    const a = answerFor('gap', 'back');
    expect(a.label).toBeTruthy();
    expect(a.label).not.toBe('back');
  });

  it('falls back to the raw value rather than dropping an answer it cannot map', () => {
    // Quiz options can change. An old submission must still render something.
    expect(answerFor('gap', 'retired_option').label).toBe('retired_option');
    expect(answerFor('not_a_question', 'x').label).toBe('x');
  });

  it('returns undefined for a question key it does not know', () => {
    expect(questionFor('not_a_question')).toBeUndefined();
  });
});

describe('orderedAnswers', () => {
  it('restores quiz order from a jsonb column that lost it', () => {
    // Postgres normalises jsonb key order, so what comes back is shuffled.
    const shuffled = { timing: 'now', gap: 'back', judgment: 'expert', hours: 'ft', process: 'sop' };
    expect(orderedAnswers(shuffled).map(([k]) => k))
      .toEqual(['gap', 'hours', 'process', 'judgment', 'timing']);
  });

  it('keeps an answer to a question the quiz no longer asks', () => {
    // Dropping it would quietly discard part of what someone submitted.
    const withRetired = { gap: 'back', retired_question: 'some value' };
    expect(orderedAnswers(withRetired)).toEqual([['gap', 'back'], ['retired_question', 'some value']]);
  });

  it('handles a partial quiz and an absent one', () => {
    expect(orderedAnswers({ hours: 'ft' })).toEqual([['hours', 'ft']]);
    expect(orderedAnswers(null)).toEqual([]);
    expect(orderedAnswers(undefined)).toEqual([]);
  });
});

describe('formatDate', () => {
  it('renders an absolute UTC timestamp', () => {
    expect(formatDate(new Date('2026-09-01T10:30:00Z'))).toBe('2026-09-01 10:30 UTC');
  });

  it('returns empty for absent or unparseable input instead of "Invalid Date"', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('not a date')).toBe('');
  });
});

describe('csv escaping', () => {
  it('leaves an ordinary value alone', () => {
    expect(csvCell('Ada')).toBe('Ada');
  });

  it('quotes a value containing a comma, so later columns do not shift', () => {
    expect(csvCell('Bookkeeping, AP / AR')).toBe('"Bookkeeping, AP / AR"');
  });

  it('doubles embedded quotes', () => {
    expect(csvCell('a "quote" here')).toBe('"a ""quote"" here"');
  });

  it('quotes hard newlines, which lead messages contain routinely', () => {
    expect(csvCell('line one\nline two')).toBe('"line one\nline two"');
    expect(csvCell('crlf\r\nhere')).toBe('"crlf\r\nhere"');
  });

  it('renders absent values as empty rather than the string "null"', () => {
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });

  it('serialises jsonb columns instead of emitting [object Object]', () => {
    expect(csvCell({ utm_source: 'li' })).toBe('"{""utm_source"":""li""}"');
  });

  it('round-trips a whole row', () => {
    expect(csvRow(['Ada', 'a, b', null, 'say "hi"'])).toBe('Ada,"a, b",,"say ""hi"""');
  });
});
