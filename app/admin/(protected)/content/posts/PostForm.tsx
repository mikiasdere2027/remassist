'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';
import { api } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import {
  publishMissing,
  type AdminPost,
  type AuthorOption,
  type FaqOption,
  type PostInput,
} from '@/lib/api/posts';
import { listFields, missingForPublish } from '@/lib/blog/completeness';
import { slugify } from '@/lib/blog/slug';
import ImageUploadField from '@/components/admin/ImageUploadField';
import PreviewModal from './PreviewModal';
import RichEditor from './RichEditor';
import DatePicker from './DatePicker';
import ConfirmDialog from '../../ConfirmDialog';
import Req from '../../RequiredMark';
import CategoryDropdown from './CategoryDropdown';
import { AuthorDropdown } from './AuthorDropdown';
import ArticleLayoutEditor from './ArticleLayoutEditor';
import styles from '../../../admin.module.css';

/**
 * The post editor — one component behind both New post and Edit post.
 *
 * It is a client component because five of the things asked of this screen are
 * relationships between fields rather than fields: the slug follows the title,
 * the author sets the avatar, every text box counts its own characters,
 * Publish knows what is still missing, and Preview renders the article from
 * what is on the form rather than from what is stored. Each of those needs the
 * values while they are being typed. Saving, publishing and sanitising happen
 * in the backend API (POST/PATCH /v1/admin/posts); this form sends the values
 * and shows what the API answers, then refreshes the server-rendered page.
 *
 * Two tabs, not two columns. The body is the part of a post that wants room:
 * side by side, the editor had half a screen for an article and the metadata
 * had half a screen for nine short fields, which was the wrong split in both
 * directions. Details and Body now each get the full width, and both panels
 * stay mounted — hidden with `display`, never unmounted — because TipTap owns
 * its document and remounting it mid-edit would throw the article away.
 *
 * Publish is gated on lib/blog/completeness.ts, a copy of the backend's
 * publish gate, kept for the live checklist while typing. The backend's own
 * `missing` list is shown if it refuses anyway. The
 * gate reads form state rather than the saved row: an editor who has just
 * filled in the last missing field should see Publish come alive, not be told
 * to save first and look again.
 */

export type PostFormValues = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  image: string;
  authorName: string;
  authorAvatar: string;
  body: string;
  articleLayout: string;
  published: boolean;
};

const MAX = {
  title: 300,
  slug: 300,
  category: 80,
  excerpt: 600,
} as const;


/** A sane range for an article, and what the stepper's arrows walk through. */
const MIN_MINUTES = 1;
const MAX_MINUTES = 120;

/**
 * The minute count inside a stored read time, or null if it is not one.
 *
 * `read_time` is a text column holding strings like "7 min read", written only
 * ever by this form. The field is a number now, so the string is composed on
 * the way out and read apart on the way in. Anything that does not match — a
 * hand-written "Quick read", say — comes back null rather than being guessed
 * at, and the field says what the old value was instead of silently keeping
 * some digit it found in it.
 */
export function readMinutes(readTime: string): number | null {
  const match = /^(\d{1,3})\s*min read$/i.exec(readTime.trim());
  if (!match) return null;
  const n = Number(match[1]);
  return n >= MIN_MINUTES && n <= MAX_MINUTES ? n : null;
}

/** The stored form of a minute count. Empty when there is no usable number. */
export function toReadTime(minutes: string): string {
  const n = Number(minutes);
  if (!Number.isInteger(n) || n < MIN_MINUTES || n > MAX_MINUTES) return '';
  return `${n} min read`;
}

export default function PostForm({
  mode,
  values,
  authors,
  categories,
  canEdit,
  faqOptions = [],
  notice,
}: {
  mode: 'new' | 'edit';
  values: PostFormValues;
  /** Team members, recently-used authors first. See the page that builds it. */
  authors: AuthorOption[];
  /** Categories posts already use, most recent first — GET /v1/admin/posts/categories. */
  categories: string[];
  canEdit: boolean;
  /** Published central FAQ entries an article may reuse. */
  faqOptions?: FaqOption[];
  /** A message to open with, e.g. after creating the draft. */
  notice?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'err'; text: string } | null>(
    notice ? { tone: 'ok', text: notice } : null,
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<'details' | 'body' | 'layout'>('details');
  const [previewOpen, setPreviewOpen] = useState(false);

  const [title, setTitle] = useState(values.title);
  const [slug, setSlug] = useState(values.slug);
  const [category, setCategory] = useState(values.category);
  const [date, setDate] = useState(values.date);
  const [minutes, setMinutes] = useState(() => {
    const parsed = readMinutes(values.readTime);
    return parsed === null ? '' : String(parsed);
  });
  const [excerpt, setExcerpt] = useState(values.excerpt);
  const [image, setImage] = useState(values.image);
  const [body, setBody] = useState(values.body);
  const [articleLayout, setArticleLayout] = useState(values.articleLayout);

  /* What the row will hold. The visible field is a number; `readTime` is the
     string that goes to the action, and the one the publish gate judges. */
  const readTime = toReadTime(minutes);
  /* Shown only when the stored value was not a minute count we could read. */
  const unreadableReadTime =
    readMinutes(values.readTime) === null && values.readTime.trim() ? values.readTime : null;

  /**
   * The slug follows the title only while it is still being derived from it.
   *
   * On a new post that is until somebody edits the slug themselves. On an
   * existing post it never is: the slug is the article's live URL, and
   * silently rewriting it because a headline gained a comma would move a
   * published page. The button beside the field regenerates it on request,
   * which is the same convenience without the surprise.
   */
  const [slugFollowsTitle, setSlugFollowsTitle] = useState(mode === 'new');

  /**
   * A published article's slug is its live address, so the field starts shut.
   *
   * Not a permission — an editor may absolutely rename a post — but a URL that
   * is already out in the world, in somebody's bookmarks and in search
   * results, should not change because a cursor landed in the wrong box. The
   * lock is what makes changing it an answer to a question rather than a side
   * effect of typing. Drafts have no address to protect, so they never lock.
   *
   * The confirmation is asked here, at the moment of unlocking, rather than at
   * save: at save the new slug is already typed, and "cancel" would then mean
   * either throwing that away or leaving the form disagreeing with itself.
   */
  const slugLocked = mode === 'edit' && values.published;
  const [slugUnlocked, setSlugUnlocked] = useState(false);
  const [askSlug, setAskSlug] = useState(false);
  const slugReadOnly = !canEdit || (slugLocked && !slugUnlocked);
  /* The address it will move away from, once saved. */
  const slugMoving = slugLocked && slugUnlocked && slug.trim() !== values.slug;

  /**
   * Which team member this post's stored byline refers to.
   *
   * Exactly by name where that works. Failing that, by headshot: the four
   * imported posts carry a short byline against the full team name —
   * "Johnathan M." for Johnathan Zemene — but they carry his headshot path
   * too, and `/images/teams/Johnathan.jpg` is the same string on both records.
   * That is a match, not a guess; no first names are compared and no
   * similarity is measured.
   */
  const matched = useMemo(() => {
    const byName = authors.find((a) => a.name === values.authorName.trim());
    if (byName) return byName;
    const avatar = values.authorAvatar.trim();
    return avatar
      ? authors.find((a) => a.avatar && a.avatar === avatar)
      : undefined;
  }, [authors, values.authorName, values.authorAvatar]);

  const [authorName, setAuthorName] = useState(matched?.name ?? '');

  const author = authors.find((a) => a.name === authorName);
  /* Derived, never typed: the byline's headshot is whichever one the Team
     screen holds for the person selected. */
  const authorAvatar = author?.avatar ?? '';

  const missing = missingForPublish({
    slug,
    title,
    excerpt,
    category,
    date,
    readTime,
    image,
    authorName,
    authorAvatar,
    body: body || null,
  });
  const ready = missing.length === 0;

  const previewPost = {
    title,
    excerpt,
    category,
    date,
    readTime,
    image,
    authorName,
    authorAvatar,
  };

  /** What the API is sent on create and save — the form as it stands. */
  const input = (): PostInput => ({
    title: title.trim(),
    slug: slug.trim(),
    excerpt: excerpt.trim(),
    body,
    articleLayout: articleLayout || null,
    date,
    readTime,
    category: category.trim(),
    image: image.trim(),
    authorName,
    authorAvatar,
  });

  /** One API call: show its outcome, then refresh the server-rendered data. */
  async function run(action: () => Promise<string | void>) {
    setBusy(true);
    setMessage(null);
    setFieldErrors({});
    try {
      const ok = await action();
      if (ok) setMessage({ tone: 'ok', text: ok });
      router.refresh();
    } catch (err) {
      const gaps = publishMissing(err);
      const text = err instanceof Error ? err.message : 'Something went wrong.';
      setMessage({
        tone: 'err',
        text: gaps?.length ? `${text} Still needed: ${listFields(gaps)}.` : text,
      });
      if (err instanceof ApiError) {
        const fe = err.fieldErrors();
        setFieldErrors(fe);
        /* A refused field on the hidden tab is no use to anybody. */
        if (fe.body) setTab('body');
        else if (Object.keys(fe).length > 0) setTab('details');
      }
    } finally {
      setBusy(false);
    }
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canEdit || busy) return;
    if (mode === 'new') {
      setBusy(true);
      setMessage(null);
      setFieldErrors({});
      try {
        const created = await api.post<AdminPost>('/admin/posts', input());
        router.push(`/admin/content/posts/${created.id}?created=1`);
        /* Stays busy: the page is about to change. */
      } catch (err) {
        setBusy(false);
        setMessage({ tone: 'err', text: err instanceof Error ? err.message : 'Something went wrong.' });
        if (err instanceof ApiError) setFieldErrors(err.fieldErrors());
      }
      return;
    }
    await run(async () => {
      await api.patch<AdminPost>(`/admin/posts/${values.id}`, input());
      return 'Saved.';
    });
  }

  /**
   * Publishing sends the form as it stands along with the switch, so what goes
   * live is what is on screen (and what the checklist above judged), not the
   * last save. Unpublishing sends only the switch and is never gated.
   */
  const togglePublished = () =>
    run(async () => {
      if (values.published) {
        await api.patch<AdminPost>(`/admin/posts/${values.id}`, { published: false });
        return 'That post is off the blog. Nothing was deleted — the draft is kept.';
      }
      await api.patch<AdminPost>(`/admin/posts/${values.id}`, { ...input(), published: true });
      return 'Saved and published — that post is live on the blog.';
    });

  const err = (field: string) =>
    fieldErrors[field] ? <span className={styles.fieldErr}>{fieldErrors[field]}</span> : null;

  return (
    <>
      {message && (
        <p
          className={`${styles.signinMsg} ${message.tone === 'ok' ? styles.msgOk : styles.msgErr}`}
          role={message.tone === 'ok' ? 'status' : 'alert'}
        >
          {message.text}
        </p>
      )}

      <div className={styles.memberTopRow}>
        <Link className={styles.memberBackBtn} href="/admin/content/posts">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          All posts
        </Link>

        <div className={styles.filterPills} role="tablist" aria-label="Post editor">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'details'}
            className={`${styles.fbtn} ${tab === 'details' ? styles.fbtnOn : ''}`}
            onClick={() => setTab('details')}
          >
            Details
            {!ready && <span className={styles.fbtnCount}>{missing.length}</span>}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'body'}
            className={`${styles.fbtn} ${tab === 'body' ? styles.fbtnOn : ''}`}
            onClick={() => setTab('body')}
          >
            Body
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'layout'}
            className={`${styles.fbtn} ${tab === 'layout' ? styles.fbtnOn : ''}`}
            onClick={() => setTab('layout')}
          >
            Article blocks
          </button>
        </div>

        {canEdit && (
          <div className={styles.memberTopActions}>
            {/* Shown for a legacy post too. Hiding it was carried over from
                the old page, where the body was the only thing this screen
                edited — so "no editable body" and "nothing to save" were the
                same statement. They are not any more: the title, category,
                author, date, read time, excerpt and cover on a legacy post are
                all ordinary fields, and with no Save there was no way to keep
                a change to any of them. The Body tab still says why the
                article text is not here. */}
            <button
              className={`${styles.btn} ${styles.btnGhost}`}
              type="submit"
              form="post-form"
              disabled={busy}
            >
              {busy ? 'Saving…' : mode === 'new' ? 'Create draft' : 'Save changes'}
            </button>

            <button
              className={`${styles.btn} ${styles.btnGhost}`}
              type="button"
              onClick={() => setPreviewOpen(true)}
            >
              Preview
            </button>

            {mode === 'edit' && (
                <button
                  className={`${styles.btn} ${values.published ? styles.btnGhost : styles.btnPrimary}`}
                  type="button"
                  onClick={togglePublished}
                  disabled={busy || (!values.published && !ready)}
                  title={
                    !values.published && !ready
                      ? `Still missing: ${listFields(missing)}`
                      : undefined
                  }
                >
                  {values.published ? 'Unpublish' : 'Publish'}
                </button>
            )}
          </div>
        )}
      </div>

      {/* Said once, here, rather than as nine red fields: the list is what an
          editor needs in order to finish, and the Details tab carries the same
          count so it stays findable from the Body tab. */}
      {canEdit && !ready && !values.published && (
        <p className={styles.publishGate} role="status">
          <strong>Not ready to publish.</strong> Still needed: {listFields(missing)}.
          {mode === 'new' && ' The draft can be created now and finished later.'}
        </p>
      )}

      <form id="post-form" onSubmit={save}>
        <section
          className={styles.panel}
          style={{
            display: tab === 'details' ? undefined : 'none',
            overflow: 'visible',
          }}
        >
          <div className={styles.panelHead}>
            <div>
              <h2 className={styles.panelTitle}>Post details</h2>
              <p className={styles.panelSub}>
                {mode === 'new'
                  ? 'Created as a draft — publish it once every field is filled in'
                  : 'Every field here is required before the post can be published'}
              </p>
            </div>
            {mode === 'edit' && values.published && (
              <Link className={styles.rowLink} href={`/blog/${values.slug}`} target="_blank">
                View on blog ↗
              </Link>
            )}
          </div>

          <div className={styles.blogEditLeftBody}>
            <div className={styles.blogFieldRow}>
              <div className={styles.field}>
                <label className={`${styles.fieldLabel} ${styles.fieldLabelRow}`} htmlFor="pf-title">
                  <span>
                    Title <Req />
                  </span>
                  <Count n={title.length} max={MAX.title} />
                </label>
                <input
                  className={styles.control}
                  id="pf-title"
                  name="title"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (slugFollowsTitle) setSlug(slugify(e.target.value));
                  }}
                  placeholder="How to hire a remote team"
                  maxLength={MAX.title}
                  required
                  readOnly={!canEdit}
                />
                {err('title')}
              </div>

              <div className={styles.field}>
                <label className={`${styles.fieldLabel} ${styles.fieldLabelRow}`} htmlFor="pf-slug">
                  <span>
                    Slug — this is the URL <Req />
                  </span>
                  <Count n={slug.length} max={MAX.slug} />
                </label>
                <div className={styles.slugRow}>
                  <input
                    className={styles.control}
                    id="pf-slug"
                    name="slug"
                    value={slug}
                    onChange={(e) => {
                      /* Typing here ends the link to the title for good: the
                         editor has said what the URL should be. */
                      setSlugFollowsTitle(false);
                      setSlug(e.target.value.toLowerCase());
                    }}
                    /* Clicking the shut field asks the same question the button
                       does, so the lock is not a dead end for anyone who goes
                       for the box first. */
                    onClick={() => {
                      if (canEdit && slugLocked && !slugUnlocked) setAskSlug(true);
                    }}
                    pattern="[a-z0-9]+(-[a-z0-9]+)*"
                    placeholder="how-to-hire-a-remote-team"
                    maxLength={MAX.slug}
                    required
                    readOnly={slugReadOnly}
                  />
                  {canEdit && slugLocked && !slugUnlocked ? (
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnGhost}`}
                      onClick={() => setAskSlug(true)}
                    >
                      Change address
                    </button>
                  ) : (
                    canEdit && (
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        onClick={() => {
                          setSlug(slugify(title));
                          setSlugFollowsTitle(mode === 'new');
                        }}
                        disabled={!title.trim()}
                      >
                        From title
                      </button>
                    )
                  )}
                </div>
                {slugMoving ? (
                  <span className={styles.publishGate}>
                    Saving moves this article from <code>/blog/{values.slug}</code> to{' '}
                    <code>/blog/{slug.trim() || '…'}</code>. The old address stops working.
                  </span>
                ) : (
                  <span className={styles.panelNote}>
                    {slugFollowsTitle
                      ? 'Following the title. Edit it to set it yourself.'
                      : slugLocked && !slugUnlocked
                        ? 'This is the live address of a published article.'
                        : mode === 'edit'
                          ? 'Changing this changes the article’s address.'
                          : 'Lowercase letters, numbers and hyphens.'}
                  </span>
                )}
                {err('slug')}
              </div>
            </div>

            {/* Four short fields, one row: they are read together, and the
                width follows the information — category widest, read time
                narrowest. */}
            <div className={styles.blogFieldRow4}>
              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="pf-cat">
                  Category <Req />
                </label>
                <CategoryDropdown
                  id="pf-cat"
                  name="category"
                  value={category}
                  onChange={setCategory}
                  categories={categories}
                  canEdit={canEdit}
                />
                {err('category')}
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="pf-author">
                  Author <Req />
                </label>
                <AuthorDropdown
                  id="pf-author"
                  authors={authors}
                  value={authorName}
                  onChange={setAuthorName}
                  disabled={!canEdit}
                />
                {/* The headshot is the team's, not the post's: it is sent with
                    the post, and there is nothing to edit. Changing a byline
                    photo is a change to that person, on the Team screen,
                    where it also fixes every other place they appear. */}
                {err('authorName') ?? err('authorAvatar')}
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="pf-date">
                  Date <Req />
                </label>
                <DatePicker
                  id="pf-date"
                  name="date"
                  value={date}
                  onChange={setDate}
                  canEdit={canEdit}
                />
                {err('date')}
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel} htmlFor="pf-rt">
                  Read time <Req />
                </label>
                <div className={styles.stepRow}>
                  <input
                    className={styles.control}
                    id="pf-rt"
                    type="number"
                    inputMode="numeric"
                    min={MIN_MINUTES}
                    max={MAX_MINUTES}
                    step={1}
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    placeholder="5"
                    readOnly={!canEdit}
                    aria-describedby="pf-rt-unit"
                  />
                  <span className={styles.stepUnit} id="pf-rt-unit">
                    min read
                  </span>
                </div>
                {/* The composed string ("7 min read") is what is stored, so
                    the API, the publish gate and the byline all keep reading
                    one value. */}
                {err('readTime')}
                {unreadableReadTime && (
                  <span className={styles.panelNote}>
                    Was <strong>{unreadableReadTime}</strong> — set the minutes to replace it.
                  </span>
                )}
              </div>
            </div>

            <div className={styles.field}>
              <label className={`${styles.fieldLabel} ${styles.fieldLabelRow}`} htmlFor="pf-exc">
                <span>
                  Excerpt — the line on the card and under the headline <Req />
                </span>
                <Count n={excerpt.length} max={MAX.excerpt} />
              </label>
              <textarea
                className={styles.textarea}
                id="pf-exc"
                name="excerpt"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows={3}
                maxLength={MAX.excerpt}
                required
                readOnly={!canEdit}
              />
              {err('excerpt')}
            </div>

            <ImageUploadField
              label="Cover image"
              kind="posts"
              required
              value={image}
              onChange={(url) => setImage(url ?? '')}
              canEdit={canEdit}
            />
            {err('image')}

            {!canEdit && (
              <p className={styles.panelNote}>
                Only an editor may {mode === 'new' ? 'create' : 'change'} a post.
              </p>
            )}
          </div>
        </section>

        <section
          className={styles.panel}
          style={{ display: tab === 'body' ? undefined : 'none' }}
        >
          <div className={styles.panelHead}>
            <div>
              <h2 className={styles.panelTitle}>Body</h2>
              <p className={styles.panelSub}>The article itself — formatted with the toolbar</p>
            </div>
          </div>

          <div className={styles.blogEditRightBody}>
            <RichEditor content={values.body} onChange={setBody} />
            {err('body')}
          </div>
        </section>

        <section className={styles.panel} style={{ display: tab === 'layout' ? undefined : 'none' }}>
          <div className={styles.panelHead}><div><h2 className={styles.panelTitle}>Article blocks</h2><p className={styles.panelSub}>Overview, highlights, KPIs, CTA, FAQs, sources, tags and author card</p></div></div>
          <ArticleLayoutEditor value={articleLayout} onChange={setArticleLayout} canEdit={canEdit} faqOptions={faqOptions} />
        </section>
      </form>

      {askSlug && (
        <ConfirmDialog
          title="Change the address of a published article?"
          confirmLabel="Change the address"
          cancelLabel="Keep it as it is"
          onConfirm={() => {
            setAskSlug(false);
            setSlugUnlocked(true);
          }}
          onCancel={() => setAskSlug(false)}
        >
          {/* Two lines: where it lives, and what breaks. The longer version
              spelled out bookmarks, search results and 404s, which is a
              paragraph of consequence in front of a yes/no question. */}
          <p style={{ margin: 0 }}>
            Live at <code>/blog/{values.slug}</code>.
          </p>
          <p style={{ margin: 0 }}>
            Saving a new slug moves the article. The old address stops working.
          </p>
        </ConfirmDialog>
      )}

      {previewOpen && (
        <PreviewModal post={previewPost} bodyHtml={body} articleLayout={articleLayout} onClose={() => setPreviewOpen(false)} />
      )}
    </>
  );
}

/**
 * "12 / 300" beside a field's label.
 *
 * The limits were already enforced by `maxLength` and by the action, silently:
 * an excerpt simply stopped accepting characters at 600 with nothing to say
 * why. Showing the count turns a dead keyboard into a number.
 */
function Count({ n, max }: { n: number; max: number }) {
  return (
    <span className={`${styles.countHint} ${n >= max ? styles.countHintFull : ''}`}>
      {n} / {max}
    </span>
  );
}
