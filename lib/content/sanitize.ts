import sanitizeHtml from 'sanitize-html';

/**
 * Editor-authored HTML sanitation, for every surface that stores it.
 *
 * Blog bodies and FAQ answers are both produced by the TipTap rich-text editor
 * in the admin and both rendered with `dangerouslySetInnerHTML` on a public
 * page. Storing HTML is only safe if every write is cleaned against an
 * allowlist here, on the server, so the public page never has to negotiate with
 * author-controlled markup. This is the boundary that makes those renders a
 * decision we own rather than a hole: nothing an editor types can reach a page
 * unless it survived one of the allowlists below.
 *
 * This file used to be lib/blog/sanitize.ts. It moved when the FAQ started
 * storing HTML too — a module every content type imports should not be filed
 * under one of them, and the alternative was a second copy of the allowlist,
 * which is how two sanitizers drift apart until one of them is wrong.
 */

/** Tags and attributes the blog editor is allowed to emit. */
const ALLOWED: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'br', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's',
    'strike', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'a', 'hr',
    'img', 'span', 'div', 'input',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'title'],
    span: ['style'],
    p: ['style'],
    h2: ['style'],
    h3: ['style'],
    h4: ['style'],
    div: ['style'],
    ul: ['data-type'],
    li: ['data-type'],
    input: ['type', 'checked', 'disabled'],
  },
  /* The only styles the editor writes are alignment, text colour and the
     highlight background. Everything else is dropped. */
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: {},
  allowedSchemesAppliedToAttributes: ['href', 'src'],
  allowedStyles: {
    span: {
      'text-align': [/^(left|center|right|justify)$/],
      color: [/^#[0-9a-fA-F]{3,6}$/],
      'background-color': [/^#[0-9a-fA-F]{3,6}$/],
    },
    p: { 'text-align': [/^(left|center|right|justify)$/] },
    h2: { 'text-align': [/^(left|center|right|justify)$/] },
    h3: { 'text-align': [/^(left|center|right|justify)$/] },
    h4: { 'text-align': [/^(left|center|right|justify)$/] },
    div: { 'text-align': [/^(left|center|right|justify)$/] },
  },
  transformTags: {
    b: 'strong',
    i: 'em',
    s: 'strike',
  },
};

/**
 * The FAQ's allowlist — deliberately narrower than the blog's.
 *
 * An answer is a paragraph or two, sometimes a list, occasionally a link. It is
 * not an article: headings, images, code blocks, colour and alignment are all
 * dropped, because the homepage card and the /faq accordion both size
 * themselves around running text and a heading inside an accordion panel
 * outranks the question it is answering.
 *
 * Dropping a tag is silent by design. An editor who pastes a heading in gets
 * the words without the markup rather than a rejected save.
 */
const ALLOWED_ANSWER: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'em', 'u', 's', 'strike', 'ul', 'ol', 'li', 'a'],
  allowedAttributes: { a: ['href', 'target', 'rel'] },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: {},
  allowedSchemesAppliedToAttributes: ['href'],
  transformTags: {
    b: 'strong',
    i: 'em',
    s: 'strike',
    /* A heading pasted into an answer keeps its words and loses its rank. */
    h1: 'p', h2: 'p', h3: 'p', h4: 'p', h5: 'p', h6: 'p',
  },
};

/**
 * Clean a raw editor payload into what may be stored and later rendered.
 *
 * `''` stays `''`, so a cleared article stores null upstream rather than a
 * `<p></p>` unless the user actually typed markup.
 */
export function cleanHtml(html: string): string {
  const cleaned = sanitizeHtml(html, ALLOWED).trim();
  return cleaned === '<p></p>' ? '' : cleaned;
}

/** Whether cleaned HTML has any readable content — the publish gate. */
export function isMeaningfulHtml(html: string): boolean {
  const cleaned = cleanHtml(html);
  return cleaned.replace(/<[^>]+>/g, '').trim().length > 0;
}

/** cleanHtml's counterpart for FAQ answers. */
export function cleanAnswerHtml(html: string): string {
  const cleaned = sanitizeHtml(html, ALLOWED_ANSWER).trim();
  return cleaned === '<p></p>' ? '' : cleaned;
}

/** Whether a cleaned answer says anything — the save gate for a question. */
export function isMeaningfulAnswer(html: string): boolean {
  return cleanAnswerHtml(html).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0;
}

/**
 * What a public page renders for one stored answer.
 *
 * Cleaned a second time on the way out — the same belt-and-braces the article
 * route uses — and wrapped in a paragraph if the row holds no block element.
 * That wrap is for the answers imported before the editor existed: they are
 * plain sentences, and without it they render as a bare text node that inherits
 * whatever the surrounding card happens to set. Wrapped at render rather than
 * migrated in place, so a row nobody has edited still looks right and the
 * database keeps exactly what was imported.
 */
export function answerHtml(stored: string | null | undefined): string {
  const cleaned = cleanAnswerHtml(stored ?? '');
  if (!cleaned) return '';
  return /<(p|ul|ol)[\s>]/i.test(cleaned) ? cleaned : `<p>${cleaned}</p>`;
}
