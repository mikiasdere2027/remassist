/**
 * JSON for a <script> tag. JSON.stringify leaves "<" alone, so a post title
 * containing "</script>" would close the tag and let the rest run as HTML.
 * Escaping <, > and & (plus the two JS line separators) as \uXXXX keeps the
 * JSON identical to a parser and inert to the HTML tokenizer.
 */
export function safeJsonForScript(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
