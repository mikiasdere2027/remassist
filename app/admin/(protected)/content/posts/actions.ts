'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { and, eq, sql } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { posts } from '@/db/schema';
import { assertUser } from '@/lib/auth/require';
import { canDeletePost, canEditContent } from '@/lib/auth/roles';
import { missingForPublish } from '@/lib/blog/completeness';
import { parseArticleLayout, serializeArticleLayout } from '@/lib/blog/article-layout';
import { cleanHtml, isMeaningfulHtml } from '@/lib/content/sanitize';
import {
  deleteUploadedImage,
  isUploadedImage,
  saveUploadedImage,
  type UploadImageType,
  UPLOAD_IMAGE_MAX,
  UPLOAD_IMAGE_TYPES,
} from '@/lib/uploads/images';

/**
 * Blog post editing.
 *
 * Same gate as the other content actions, checked here rather than only on the
 * page, because a server action is separately reachable.
 *
 * Bodies are stored as sanitized HTML, produced by the TipTap editor on the
 * New Post page. Every write goes through cleanHtml here — the editor alone
 * must never be the whole defence, because a hand-rolled POST can carry
 * anything. What the public route renders is only ever what survived that
 * allowlist, so the site never negotiates with author-controlled markup.
 *
 * The cover image and the author avatar can each arrive two ways: as a path an
 * editor typed, or as a file picked off their own machine. An uploaded file is
 * written to disk by lib/uploads/images.ts and the row stores the resulting
 * /uploads/blog/ URL, so both cases end up as the same kind of value. Uploads
 * are staged (checked) before any other validation runs and written only once
 * the save is certain to go through — a refused save must not leave a file
 * nothing points at.
 */

const MAX_TITLE = 300;
const MAX_EXCERPT = 600;
const MAX_BODY = 120_000;

function back(param: 'ok' | 'error', code: string): never {
  redirect(`/admin/content/posts?${param}=${code}`);
}

/**
 * A refused save lands back on the post's own editor, not on the list.
 *
 * The list has no form on it any more, so sending a rejected edit there would
 * show the reason next to a row and throw away the draft that caused it. The
 * fields are on the edit page; so is the complaint about them.
 */
function backToPost(id: string, param: 'ok' | 'error', code: string): never {
  redirect(`/admin/content/posts/${id}?${param}=${code}`);
}

async function assertEditor() {
  const user = await assertUser();
  if (!canEditContent(user.role)) throw new Error('forbidden');
  return user;
}

/**
 * The blog index and the article are both prerendered, so both need clearing.
 * Revalidating only the index is the subtle version of this bug: the list shows
 * a new title that links to a stale page.
 */
function publishedPaths(slug?: string) {
  revalidatePath('/blog');
  if (slug) revalidatePath(`/blog/${slug}`);
  revalidatePath('/admin/content/posts');
}

/** Lowercase letters, numbers and hyphens: this value is the URL. */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** The cover shown when a post has no art of its own. */
const PLACEHOLDER_IMAGE = '/images/blog/placeholder.jpg';

/** One image field's intent: a file to write, or a path to store as-is. */
type StagedImage = { file: File } | { path: string };

type ImageProblem = 'bad-image' | 'image-too-big';

/**
 * Read one image field without writing anything yet.
 *
 * `<name>File` is the file input, `<name>` the path box. A chosen file wins:
 * the field disables the path box while a file is staged, so its absence from
 * the payload is expected rather than a lost value. Type and size are checked
 * here — twice over, since the input's `accept` is a hint a hand-rolled POST
 * ignores — but nothing reaches the disk until the save is certain.
 */
function stageImage(formData: FormData, name: string): StagedImage | ImageProblem {
  const file = formData.get(`${name}File`);
  if (file instanceof File && file.size > 0) {
    if (!UPLOAD_IMAGE_TYPES.includes(file.type as UploadImageType)) return 'bad-image';
    if (file.size > UPLOAD_IMAGE_MAX) return 'image-too-big';
    return { file };
  }
  return { path: String(formData.get(name) ?? '').trim().slice(0, 300) };
}

function isImageProblem(staged: StagedImage | ImageProblem): staged is ImageProblem {
  return typeof staged === 'string';
}

/** Write a staged upload, if it is one, and return the value to store. */
async function commitImage(staged: StagedImage): Promise<string> {
  if ('path' in staged) return staged.path;
  const bytes = new Uint8Array(await staged.file.arrayBuffer());
  return saveUploadedImage('blog', bytes, staged.file.type);
}

/**
 * Delete the file an image field used to point at, once it no longer does.
 *
 * Only URLs this app wrote are eligible — a seeded path under /public/images
 * is shared by other posts and is not ours to remove.
 */
async function dropReplaced(previous: string, next: string): Promise<void> {
  if (previous && previous !== next && isUploadedImage(previous)) {
    await deleteUploadedImage(previous);
  }
}

export async function savePost(formData: FormData): Promise<void> {
  await assertEditor();
  if (!isDatabaseConfigured()) back('error', 'no-database');

  const id = String(formData.get('id') ?? '');
  const title = String(formData.get('title') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim().toLowerCase();
  const excerpt = String(formData.get('excerpt') ?? '').trim();
  /* Cleaned here, not by the editor: a hand-rolled POST can carry anything. */
  const body = cleanHtml(String(formData.get('body') ?? ''));
  const articleLayout = serializeArticleLayout(parseArticleLayout(String(formData.get('articleLayout') ?? '')));
  const date = String(formData.get('date') ?? '').trim();
  const readTime = String(formData.get('readTime') ?? '').trim();
  const category = String(formData.get('category') ?? '').trim();
  const authorName = String(formData.get('authorName') ?? '').trim();
  const stagedImage = stageImage(formData, 'image');
  const stagedAvatar = stageImage(formData, 'authorAvatar');

  if (!title || !slug || !excerpt) backToPost(id, 'error', 'empty');
  if (title.length > MAX_TITLE || excerpt.length > MAX_EXCERPT) backToPost(id, 'error', 'too-long');
  if (body.length > MAX_BODY) backToPost(id, 'error', 'too-long');
  if (!SLUG_RE.test(slug)) backToPost(id, 'error', 'bad-slug');
  if (!DATE_RE.test(date)) backToPost(id, 'error', 'bad-date');
  /* Both files are judged before either is written, so a rejected avatar can
     never leave an orphaned cover behind. */
  if (isImageProblem(stagedImage)) backToPost(id, 'error', stagedImage);
  if (isImageProblem(stagedAvatar)) backToPost(id, 'error', stagedAvatar);

  const db = getDb();

  const [clash] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.slug, slug), sql`${posts.id} <> ${id}`))
    .limit(1);
  if (clash) backToPost(id, 'error', 'slug-taken');

  const [existing] = await db
    .select({
      slug: posts.slug,
      published: posts.published,
      image: posts.image,
      authorAvatar: posts.authorAvatar,
    })
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);
  if (!existing) backToPost(id, 'error', 'not-found');

  /* A published post that would be left incomplete is refused rather than
     silently unpublished — quietly taking a live article off the blog because
     somebody cleared a field is worse than saying no. A draft may be as
     half-written as its author likes; this only guards what is already live.

     The image fields are checked as staged rather than as stored, because the
     files have not been written yet: a save that swaps the cover for an upload
     has a cover, and reading the empty path box would say it does not. */
  if (existing.published) {
    const gaps = missingForPublish({
      slug,
      title,
      excerpt,
      category,
      date,
      readTime,
      image: 'path' in stagedImage ? stagedImage.path : 'file',
      authorName,
      authorAvatar: 'path' in stagedAvatar ? stagedAvatar.path : 'file',
      body: body || null,
    });
    if (gaps.length > 0) {
      backToPost(id, 'error', gaps.length === 1 && gaps[0] === 'Body' ? 'no-body' : 'incomplete-live');
    }
  }

  /* Nothing can refuse the save from here on, so the uploads may be written.
     An empty cover would render as a broken image on /blog, so a cleared field
     falls back to the placeholder rather than to nothing. */
  const image = (await commitImage(stagedImage)) || PLACEHOLDER_IMAGE;
  const authorAvatar = await commitImage(stagedAvatar);

  await db
    .update(posts)
    .set({
      title,
      slug,
      excerpt,
      body: isMeaningfulHtml(body) ? body : null,
      articleLayout,
      date,
      readTime,
      category,
      image,
      authorName,
      authorAvatar,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id));

  /* Only after the row points at the new files: a delete that ran first would
     take the old cover away even if the update then failed. */
  await dropReplaced(existing.image, image);
  await dropReplaced(existing.authorAvatar, authorAvatar);

  /* Both the old and new slug: renaming a post leaves the previous URL cached
     until something clears it. */
  publishedPaths(slug);
  if (existing.slug !== slug) revalidatePath(`/blog/${existing.slug}`);
  back('ok', 'saved');
}

/** Validity failures land back on the new-post page, where the form is. */
function backToNew(param: 'ok' | 'error', code: string): never {
  redirect(`/admin/content/posts/new?${param}=${code}`);
}

export async function addPost(formData: FormData): Promise<void> {
  await assertEditor();
  if (!isDatabaseConfigured()) backToNew('error', 'no-database');

  const title = String(formData.get('title') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim().toLowerCase();
  const excerpt = String(formData.get('excerpt') ?? '').trim();
  /* Cleaned on the server, never trusted from the client. */
  const body = cleanHtml(String(formData.get('body') ?? ''));
  const articleLayout = serializeArticleLayout(parseArticleLayout(String(formData.get('articleLayout') ?? '')));
  const date = String(formData.get('date') ?? '').trim();
  const readTime = String(formData.get('readTime') ?? '').trim();
  const category = String(formData.get('category') ?? '').trim();
  const authorName = String(formData.get('authorName') ?? '').trim();
  const stagedImage = stageImage(formData, 'image');
  const stagedAvatar = stageImage(formData, 'authorAvatar');

  if (!title || !slug || !excerpt) backToNew('error', 'empty');
  if (title.length > MAX_TITLE || excerpt.length > MAX_EXCERPT) backToNew('error', 'too-long');
  if (body.length > MAX_BODY) backToNew('error', 'too-long');
  if (!SLUG_RE.test(slug)) backToNew('error', 'bad-slug');
  if (date && !DATE_RE.test(date)) backToNew('error', 'bad-date');
  /* Judged before either is written — see savePost. */
  if (isImageProblem(stagedImage)) backToNew('error', stagedImage);
  if (isImageProblem(stagedAvatar)) backToNew('error', stagedAvatar);

  const db = getDb();
  const [clash] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(eq(posts.slug, slug))
    .limit(1);
  if (clash) backToNew('error', 'slug-taken');

  /* Written only once the draft is certain to be inserted. */
  const image = await commitImage(stagedImage);
  const authorAvatar = await commitImage(stagedAvatar);

  await db.insert(posts).values({
    title,
    slug,
    excerpt,
    body: isMeaningfulHtml(body) ? body : null,
    articleLayout,
    date: date || new Date().toISOString().slice(0, 10),
    readTime: readTime || '5 min read',
    category: category || 'Uncategorised',
    image: image || PLACEHOLDER_IMAGE,
    authorName,
    authorAvatar,
    /* A draft. Nothing reaches the blog without somebody choosing to publish. */
    published: false,
  });

  publishedPaths();
  back('ok', 'added');
}

export async function setPostPublished(formData: FormData): Promise<void> {
  await assertEditor();
  if (!isDatabaseConfigured()) back('error', 'no-database');

  const id = String(formData.get('id') ?? '');
  const next = formData.get('published') === '1';

  const db = getDb();
  const [row] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  if (!row) back('error', 'not-found');

  /* Everything a post needs before it may go on the blog — the same list the
     editor shows, so the disabled Publish button and this refusal can never
     disagree. It used to be the body alone, which let a post go live with no
     cover, no category and no byline.

     Unpublishing is never gated: taking something off the blog must not depend
     on the post being in good order.

     "Body" on its own keeps its own message, because it is both the likeliest
     gap and the one with something specific to say about it. */
  if (next) {
    const gaps = missingForPublish(row);
    if (gaps.length > 0) {
      back('error', gaps.length === 1 && gaps[0] === 'Body' ? 'no-body' : 'incomplete');
    }
  }

  await db.update(posts).set({ published: next, updatedAt: new Date() }).where(eq(posts.id, id));

  publishedPaths(row.slug);
  back('ok', next ? 'published' : 'unpublished');
}

/**
 * Delete a draft, permanently.
 *
 * The only destructive action in the content admin, and it is fenced on three
 * sides. `canDeletePost` gates it — see the note on that function for why a
 * post is the one thing here that may go. A published post is refused, so
 * removing an article from the blog is always the two deliberate steps
 * "Unpublish", then "Delete", and no single click ever takes a live URL away.
 * The row's menu opens a confirm step rather than submitting this, and the
 * confirmation rides along as a field so a hand-rolled POST that skipped the
 * step is refused here too.
 *
 * The slug is read before the row goes, because revalidating /blog/<slug>
 * after the delete would need a row that no longer exists — and skipping it
 * leaves the article cached at a URL with nothing behind it.
 */
export async function deletePost(formData: FormData): Promise<void> {
  const user = await assertEditor();
  if (!canDeletePost(user.role)) throw new Error('forbidden');
  if (!isDatabaseConfigured()) back('error', 'no-database');

  const id = String(formData.get('id') ?? '');
  if (formData.get('confirm') !== '1') back('error', 'not-confirmed');

  const db = getDb();
  const [row] = await db
    .select({ slug: posts.slug, published: posts.published })
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);
  if (!row) back('error', 'not-found');
  if (row.published) back('error', 'delete-published');

  await db.delete(posts).where(eq(posts.id, id));

  publishedPaths(row.slug);
  back('ok', 'deleted');
}
