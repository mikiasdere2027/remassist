import { describe, expect, it } from 'vitest';
import { answerHtml, cleanAnswerHtml, isMeaningfulAnswer } from './sanitize';

/**
 * The FAQ allowlist.
 *
 * Answers are editor-authored HTML rendered with dangerouslySetInnerHTML on the
 * homepage and on /faq, so this module is the only thing standing between the
 * admin and those pages. Covered here rather than by inspection because the
 * failure is silent: a tag that slips through renders perfectly well until the
 * day somebody puts a script in one.
 */
describe('cleanAnswerHtml', () => {
  it('keeps the formatting an answer is allowed to have', () => {
    const html = '<p>Most roles fill in <strong>7 to 21 days</strong>.</p><ul><li>Support</li></ul>';
    expect(cleanAnswerHtml(html)).toBe(html);
  });

  it('drops a script and everything in it', () => {
    expect(cleanAnswerHtml('<p>Hi</p><script>alert(1)</script>')).toBe('<p>Hi</p>');
  });

  it('drops event handlers while keeping the element', () => {
    expect(cleanAnswerHtml('<p onclick="steal()">Hi</p>')).toBe('<p>Hi</p>');
  });

  it('refuses a javascript: link', () => {
    // The href goes, the words stay — the reader loses nothing they should have had.
    expect(cleanAnswerHtml('<a href="javascript:alert(1)">click</a>')).toBe('<a>click</a>');
  });

  it('keeps a real link', () => {
    expect(cleanAnswerHtml('<a href="/pricing">rates</a>')).toBe('<a href="/pricing">rates</a>');
  });

  it('demotes a heading to a paragraph instead of losing the words', () => {
    expect(cleanAnswerHtml('<h2>Pricing</h2>')).toBe('<p>Pricing</p>');
  });

  it('drops what the blog allows and the FAQ does not', () => {
    // An answer is not an article: no images, no code blocks, no colour.
    expect(cleanAnswerHtml('<img src="https://x/y.png">')).toBe('');
    expect(cleanAnswerHtml('<pre><code>x</code></pre>')).toBe('x');
    expect(cleanAnswerHtml('<p style="color:#f00">Red</p>')).toBe('<p>Red</p>');
  });

  it('treats an empty editor as empty', () => {
    // TipTap's empty document is <p></p>, not ''.
    expect(cleanAnswerHtml('<p></p>')).toBe('');
    expect(isMeaningfulAnswer('<p></p>')).toBe(false);
    expect(isMeaningfulAnswer('<p><strong> </strong></p>')).toBe(false);
    expect(isMeaningfulAnswer('<p>a</p>')).toBe(true);
  });
});

describe('answerHtml', () => {
  it('wraps a plain-text answer in a paragraph', () => {
    // The 29 rows imported before the editor existed are bare sentences.
    expect(answerHtml('Because the alternative wastes both our time.')).toBe(
      '<p>Because the alternative wastes both our time.</p>',
    );
  });

  it('leaves an answer that already has blocks alone', () => {
    expect(answerHtml('<p>One</p><p>Two</p>')).toBe('<p>One</p><p>Two</p>');
    expect(answerHtml('<ul><li>One</li></ul>')).toBe('<ul><li>One</li></ul>');
  });

  it('wraps inline-only markup rather than leaving a bare text node', () => {
    expect(answerHtml('You <strong>only</strong> pay if you hire.')).toBe(
      '<p>You <strong>only</strong> pay if you hire.</p>',
    );
  });

  it('escapes a plain-text answer that happens to contain markup characters', () => {
    expect(answerHtml('Rates < $10/hr & no upfront fee')).toBe(
      '<p>Rates &lt; $10/hr &amp; no upfront fee</p>',
    );
  });

  it('renders nothing for an empty or missing answer', () => {
    expect(answerHtml('')).toBe('');
    expect(answerHtml(null)).toBe('');
    expect(answerHtml(undefined)).toBe('');
  });
});
