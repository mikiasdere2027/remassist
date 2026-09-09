'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { and, eq, sql } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { popups } from '@/db/schema';
import { assertUser } from '@/lib/auth/require';
import { canEditContent } from '@/lib/auth/roles';
import { missingForPopupPublish } from '@/lib/popups/completeness';
import { isPopupPlacement } from '@/lib/popups/placement';
import { isPopupTemplate } from '@/lib/popups/templates';
import {
  deleteUploadedImage,
  isUploadedImage,
  saveUploadedImage,
  type UploadImageType,
  UPLOAD_IMAGE_MAX,
  UPLOAD_IMAGE_TYPES,
} from '@/lib/uploads/images';

/**
 * Popup ad editing.
 *
 * Same gate as the rest of the content CMS: assertUser + canEditContent on
 * every action, because a server action is a separately reachable endpoint.
 * There is no delete — a popup that was once live is a record of a claim the
 * site made, and unpublishing keeps that record the way it keeps everything
 * else on this admin. Suspending a popup is what "taking it down" means.
 *
 * The tracking key is what phase 2's renderer will report to analytics on
 * view and click, so it is required, unique and URL/GA-shaped — an analytics
 * report has one row per live campaign, and two popups sharing a key would
 * silently share a row.
 *
 * The image can arrive two ways, like a post's cover: a path an editor typed,
 * or a file picked off their own machine. Uploads are staged (checked) before
 * any other validation runs and written only once the save is certain to go
 * through, so a refused save never leaves a file nothing points at.
 *
 * Schedule times are typed as local times in the browser and stored as
 * instants. `new Date('YYYY-MM-DDTHH:MM')` parses as *this* server's local
 * time, and the [id] page renders stored instants back out in that same local
 * time, so a value round-trips stably on one machine. The public renderer in
 * a later phase compares `now()` against the stored instants, which is
 * correct whatever zone either of us runs in.
 */

const MAX_NAME = 120;
const MAX_TITLE = 200;
const MAX_MESSAGE = 500;
const MAX_CTA_LABEL = 40;
const MAX_CTA_HREF = 500;
const MAX_TRACKING = 120;
const MAX_DELAY = 300;
const MAX_DISPLAY = 600;

/** The tracking key is the campaign's identity in every analytics report. */
const TRACKING_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type PopupActionState = { error?: string };

/**
 * A refused save returns a state object instead of redirecting. Redirecting
 * back to the page remounts the form from its stored values — for a new popup
 * that is nothing — so the very error that told you the tracking key was
 * taken also deleted the draft you had typed into it. Returning the code to
 * the already-mounted form keeps every field (and the staged image) exactly
 * where they are and shows the complaint beside them.
 */
function backToList(param: 'ok' | 'error', code: string): never {
  redirect(`/admin/content/popups?${param}=${code}`);
}

/** A successful save on the popup's own editor returns to it. */
function backToPopup(id: string, param: 'ok' | 'error', code: string): never {
  redirect(`/admin/content/popups/${id}?${param}=${code}`);
}

/** The same gate for every action, checked here and not merely on the page. */
async function assertEditor() {
  const user = await assertUser();
  if (!canEditContent(user.role)) throw new Error('forbidden');
  return user;
}

/**
 * Popups are not rendered anywhere public yet — that is the next phase. Until
 * then the list is the only screen whose cache an edit can go stale in.
 */
function published() {
  revalidatePath('/admin/content/popups');
}

type StagedImage = { file: File } | { path: string };
type ImageProblem = 'bad-image' | 'image-too-big';

/**
 * Read the image field without writing anything yet.
 *
 * `imageFile` is the file input, `image` the carried path. A chosen file wins:
 * type and size are checked here — twice over, since the input's `accept` is a
 * hint a hand-rolled POST ignores — but nothing reaches the disk until the
 * save is certain.
 */
function stageImage(formData: FormData): StagedImage | ImageProblem {
  const file = formData.get('imageFile');
  if (file instanceof File && file.size > 0) {
    if (!UPLOAD_IMAGE_TYPES.includes(file.type as UploadImageType)) return 'bad-image';
    if (file.size > UPLOAD_IMAGE_MAX) return 'image-too-big';
    return { file };
  }
  return { path: String(formData.get('image') ?? '').trim().slice(0, 300) };
}

function isImageProblem(staged: StagedImage | ImageProblem): staged is ImageProblem {
  return typeof staged === 'string';
}

/** Write a staged upload, if it is one, and return the value to store. */
async function commitImage(staged: StagedImage): Promise<string> {
  if ('path' in staged) return staged.path;
  const bytes = new Uint8Array(await staged.file.arrayBuffer());
  return saveUploadedImage('popup', bytes, staged.file.type);
}

/**
 * Delete the file a field used to point at, once it no longer does.
 * Only URLs this app wrote are eligible — a static path is shared and not ours.
 */
async function dropReplaced(previous: string | null, next: string | null): Promise<void> {
  if (previous && previous !== next && isUploadedImage(previous)) {
    await deleteUploadedImage(previous);
  }
}

/** The CTA link is where the push ends, so it has to be a real one. */
function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** "2026-09-08T10:30" (the datetime-local value) → an instant, or null when empty. */
function parseLocal(value: string): Date | null {
  const v = value.trim();
  if (!v) return null;
  const parsed = new Date(v);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function readSchedule(
  startsAt: string,
  endsAt: string,
): { problem: 'bad-schedule' } | { startsAt: Date | null; endsAt: Date | null } {
  const start = parseLocal(startsAt);
  const end = parseLocal(endsAt);
  if (start && end && end.getTime() < start.getTime()) return { problem: 'bad-schedule' };
  return { startsAt: start, endsAt: end };
}

/** The required delay value: whole seconds 0..MAX_DELAY, or null when invalid. */
function delayOf(formData: FormData): number | null {
  const n = Number(String(formData.get('delaySeconds') ?? ''));
  if (!Number.isInteger(n) || n < 0 || n > MAX_DELAY) return null;
  return n;
}

/** The optional display length: 'skip' = leave empty (stay until closed). */
function displayOf(formData: FormData): number | 'skip' | null {
  const raw = String(formData.get('displaySeconds') ?? '').trim();
  if (!raw) return 'skip';
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > MAX_DISPLAY) return null;
  return n;
}

function overMax(...pairs: Array<[string, number]>): boolean {
  return pairs.some(([value, max]) => value.length > max);
}

/**
 * Which required fields the submitted popup is still missing.
 *
 * The same list the publish gate and the editor read (lib/popups/completeness),
 * so a save can never be refused over a field the form did not show: a
 * spotlight is not missing the "Message" it does not render, and a corner card
 * is not missing artwork it does not need.
 */
function missingFields(f: ReturnType<typeof fieldsOf>, staged: StagedImage): string[] {
  return missingForPopupPublish({
    ...f,
    /* A picked file counts as an image from the moment it is staged, even
       though it does not reach the disk until the save is certain. */
    image: 'path' in staged ? staged.path : 'pending-upload',
  });
}

/** Everything the two write actions share, read once. */
function fieldsOf(formData: FormData) {
  return {
    name: String(formData.get('name') ?? '').trim(),
    title: String(formData.get('title') ?? '').trim(),
    message: String(formData.get('message') ?? '').trim(),
    ctaLabel: String(formData.get('ctaLabel') ?? '').trim(),
    ctaHref: String(formData.get('ctaHref') ?? '').trim(),
    campaign: String(formData.get('campaign') ?? '').trim(),
    trackingKey: String(formData.get('trackingKey') ?? '').trim().toLowerCase(),
    placement: String(formData.get('placement') ?? 'everywhere').trim(),
    template: String(formData.get('template') ?? 'corner').trim(),
    startsAt: String(formData.get('startsAt') ?? '').trim(),
    endsAt: String(formData.get('endsAt') ?? '').trim(),
  };
}

/** Tell `where` to land on one row, whatever screen posted it. */
function wherePopup(id: string) {
  return eq(popups.id, id);
}

export async function addPopup(
  _prev: PopupActionState,
  formData: FormData,
): Promise<PopupActionState> {
  await assertEditor();
  if (!isDatabaseConfigured()) return { error: 'no-database' };

  const f = fieldsOf(formData);
  const stagedImage = stageImage(formData);
  const schedule = readSchedule(f.startsAt, f.endsAt);
  const delay = delayOf(formData);
  const display = displayOf(formData);

  /* Checked before anything else reads the image: a broken upload is broken
     whatever else the form got right. */
  if (isImageProblem(stagedImage)) return { error: stagedImage };
  if (missingFields(f, stagedImage).length > 0) return { error: 'empty' };
  if (
    overMax(
      [f.name, MAX_NAME], [f.title, MAX_TITLE], [f.message, MAX_MESSAGE],
      [f.ctaLabel, MAX_CTA_LABEL], [f.ctaHref, MAX_CTA_HREF], [f.campaign, MAX_NAME],
      [f.trackingKey, MAX_TRACKING],
    )
  ) {
    return { error: 'too-long' };
  }
  if (!TRACKING_RE.test(f.trackingKey)) return { error: 'bad-tracking-key' };
  if (!isPopupPlacement(f.placement)) return { error: 'bad-placement' };
  if (!isPopupTemplate(f.template)) return { error: 'bad-template' };
  if (!isHttpUrl(f.ctaHref)) return { error: 'bad-url' };
  if ('problem' in schedule) return { error: schedule.problem };
  if (delay === null || display === null) return { error: 'bad-delay' };

  const db = getDb();
  const [clash] = await db
    .select({ id: popups.id })
    .from(popups)
    .where(eq(popups.trackingKey, f.trackingKey))
    .limit(1);
  if (clash) return { error: 'tracking-taken' };

  /* Written only once the draft is certain to be inserted. */
  const image = (await commitImage(stagedImage)).trim() || null;

  await db.insert(popups).values({
    name: f.name,
    title: f.title,
    message: f.message,
    image,
    ctaLabel: f.ctaLabel,
    ctaHref: f.ctaHref,
    campaign: f.campaign,
    trackingKey: f.trackingKey,
    placement: f.placement,
    template: f.template,
    startsAt: schedule.startsAt,
    endsAt: schedule.endsAt,
    delaySeconds: delay,
    displaySeconds: display === 'skip' ? null : display,
    /* A draft. Nothing is shown anywhere without somebody choosing to publish. */
    published: false,
  });

  published();
  backToList('ok', 'added');
}

export async function savePopup(
  _prev: PopupActionState,
  formData: FormData,
): Promise<PopupActionState> {
  await assertEditor();
  if (!isDatabaseConfigured()) return { error: 'no-database' };

  const id = String(formData.get('id') ?? '');

  const f = fieldsOf(formData);
  const stagedImage = stageImage(formData);
  const schedule = readSchedule(f.startsAt, f.endsAt);
  const delay = delayOf(formData);
  const display = displayOf(formData);

  /* Checked before anything else reads the image: a broken upload is broken
     whatever else the form got right. */
  if (isImageProblem(stagedImage)) return { error: stagedImage };
  if (missingFields(f, stagedImage).length > 0) return { error: 'empty' };
  if (
    overMax(
      [f.name, MAX_NAME], [f.title, MAX_TITLE], [f.message, MAX_MESSAGE],
      [f.ctaLabel, MAX_CTA_LABEL], [f.ctaHref, MAX_CTA_HREF], [f.campaign, MAX_NAME],
      [f.trackingKey, MAX_TRACKING],
    )
  ) {
    return { error: 'too-long' };
  }
  if (!TRACKING_RE.test(f.trackingKey)) return { error: 'bad-tracking-key' };
  if (!isPopupPlacement(f.placement)) return { error: 'bad-placement' };
  if (!isPopupTemplate(f.template)) return { error: 'bad-template' };
  if (!isHttpUrl(f.ctaHref)) return { error: 'bad-url' };
  if ('problem' in schedule) return { error: schedule.problem };
  if (delay === null || display === null) return { error: 'bad-delay' };

  const db = getDb();
  const [existing] = await db
    .select({ id: popups.id, image: popups.image })
    .from(popups)
    .where(wherePopup(id))
    .limit(1);
  if (!existing) return { error: 'not-found' };

  /* Anyone else may take the key; the row itself may keep it. */
  const [clash] = await db
    .select({ id: popups.id })
    .from(popups)
    .where(and(eq(popups.trackingKey, f.trackingKey), sql`${popups.id} <> ${id}`))
    .limit(1);
  if (clash) return { error: 'tracking-taken' };

  const image = (await commitImage(stagedImage)).trim() || null;

  await db
    .update(popups)
    .set({
      name: f.name,
      title: f.title,
      message: f.message,
      image,
      ctaLabel: f.ctaLabel,
      ctaHref: f.ctaHref,
      campaign: f.campaign,
      trackingKey: f.trackingKey,
      placement: f.placement,
      template: f.template,
      startsAt: schedule.startsAt,
      endsAt: schedule.endsAt,
      delaySeconds: delay,
      displaySeconds: display === 'skip' ? null : display,
      updatedAt: new Date(),
    })
    .where(wherePopup(id));

  /* Only after the row points at the new file: a delete that ran first would
     take the old artwork away even if the update then failed. */
  await dropReplaced(existing.image, image);

  published();
  backToPopup(id, 'ok', 'saved');
}

/**
 * Publish or suspend from the list.
 *
 * Publishing is gated on the same completeness list the form shows, so the
 * enabled button and this refusal can never disagree. The schedule is data,
 * not intent: a popup may be published while its start time is in the future —
 * that is exactly what scheduling is for. Suspending is never gated: taking a
 * popup out of rotation must not depend on the row being in good order.
 */
export async function setPopupPublished(formData: FormData): Promise<void> {
  await assertEditor();
  if (!isDatabaseConfigured()) backToList('error', 'no-database');

  const id = String(formData.get('id') ?? '');
  const next = formData.get('published') === '1';

  const db = getDb();
  const [p] = await db.select().from(popups).where(wherePopup(id)).limit(1);
  if (!p) backToList('error', 'not-found');

  if (next && missingForPopupPublish(p).length > 0) backToList('error', 'incomplete');

  await db.update(popups).set({ published: next, updatedAt: new Date() }).where(wherePopup(id));

  published();
  backToList('ok', next ? 'published' : 'unpublished');
}