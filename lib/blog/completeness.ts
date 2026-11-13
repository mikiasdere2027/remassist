/**
 * What a post needs before it may go on the blog.
 *
 * One shared fact with two readers: the publish action must refuse an incomplete post, and the editor must be
 * able to say which fields are missing before anybody presses the button. Two
 * copies of this list would drift, and the version that drifts is always the
 * one the editor sees — so it would promise a publish the server then refuses.
 *
 * "Required" here means required *to publish*, not to save. A draft is allowed
 * to be half-written; that is what a draft is for.
 */

export type PostForPublish = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  image: string;
  authorName: string;
  authorAvatar: string;
  body: string | null;
};

/** Field order matches the editor, so the list reads top to bottom. */
const FIELDS: ReadonlyArray<{ label: string; of: (p: PostForPublish) => string }> = [
  { label: 'Title', of: (p) => p.title },
  { label: 'Slug', of: (p) => p.slug },
  { label: 'Category', of: (p) => p.category },
  { label: 'Date', of: (p) => p.date },
  { label: 'Read time', of: (p) => p.readTime },
  { label: 'Cover image', of: (p) => p.image },
  { label: 'Author', of: (p) => p.authorName },
  { label: 'Author avatar', of: (p) => p.authorAvatar },
  { label: 'Excerpt', of: (p) => p.excerpt },
];

/**
 * The labels of everything still missing, in editor order. Empty means ready.
 */
export function missingForPublish(post: PostForPublish): string[] {
  const missing = FIELDS.filter((f) => !f.of(post).trim()).map((f) => f.label);
  if (!hasBody(post.body)) missing.push('Body');
  return missing;
}

/** Whether a post has any article text. */
export function hasBody(body: string | null): boolean {
  return Boolean(body && body.trim().length > 0);
}

/** Sentence-ready: "Title, Cover image and Body". */
export function listFields(labels: string[]): string {
  if (labels.length <= 1) return labels.join('');
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}
