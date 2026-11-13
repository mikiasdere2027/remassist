'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { asc, eq, sql } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/db';
import { teamMembers } from '@/db/schema';
import { assertUser } from '@/lib/auth/require';
import { canEditContent } from '@/lib/auth/roles';
import {
  deleteUploadedImage,
  saveUploadedImage,
  type UploadImageType,
  UPLOAD_IMAGE_MAX,
  UPLOAD_IMAGE_TYPES,
} from '@/lib/uploads/images';

/**
 * Team member editing.
 *
 * Same gate as the rest of the content CMS: assertUser + canEditContent on
 * every action, because a server action is a separately reachable endpoint.
 * There is no delete. Unpublishing takes a member off the homepage and keeps
 * their card — the record of who the company once introduced is worth keeping.
 *
 * Photos are stored on disk (lib/uploads/images.ts) with the URL in
 * team_members.image. A replaced or removed photo deletes the old uploaded
 * file but never a seeded static asset under /public/images. Every write
 * revalidates the homepage, which is what makes a change actually appear.
 */

const MAX_NAME = 120;
const MAX_ROLE = 120;
const MAX_INITIALS = 4;
const MAX_TAG = 40;
const MAX_BLURB = 300;
const MAX_LINKEDIN = 300;

/* initials is the card's monogram fallback; linkedin is a URL an editor pastes.
   Both get checked here so bad data can never reach the homepage. */
const INITIALS_RE = /^[A-Za-z]{1,4}$/;
const LINKEDIN_RE = /^https:\/\/[^\s]+$/;

function back(param: 'ok' | 'error', code: string): never {
  redirect(`/admin/content/team?${param}=${code}`);
}

function backToItem(id: string, param: 'ok' | 'error', code: string): never {
  redirect(`/admin/content/team/${id}?${param}=${code}`);
}

/** The editing gate, in one place so no action can forget half of it. */
async function assertEditor() {
  const user = await assertUser();
  if (!canEditContent(user.role)) throw new Error('forbidden');
  return user;
}

/** The homepage and this screen are both prerendered, so both need clearing. */
function published() {
  revalidatePath('/');
  revalidatePath('/admin/content/team');
}

function clean(formData: FormData, key: string, max: number): string {
  return String(formData.get(key) ?? '').trim().slice(0, max);
}

/**
 * Resolve what image the form wants stored, without writing anything yet.
 *
 * Returns null to clear the photo, the current value to keep it, or a fresh
 * uploaded URL. "Remove photo" wins over a selected file — the checkbox is the
 * explicit instruction, and the preview disables itself when it is checked.
 */
async function resolveImage(
  formData: FormData,
  current: string | null,
): Promise<{ image: string | null; uploaded: string | null }> {
  if (formData.get('removeImage') === '1') return { image: null, uploaded: null };

  const file = formData.get('image');
  if (file instanceof File && file.size > 0) {
    if (!UPLOAD_IMAGE_TYPES.includes(file.type as UploadImageType)) throw new Error('bad-type');
    if (file.size > UPLOAD_IMAGE_MAX) throw new Error('too-big');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const url = await saveUploadedImage('team', bytes, file.type);
    return { image: url, uploaded: url };
  }

  return { image: current, uploaded: null };
}

function validateFields(input: {
  name: string; role: string; initials: string; tag: string;
  blurb: string; linkedin: string;
}): 'empty' | 'too-long' | 'bad-initials' | 'bad-linkedin' | null {
  if (!input.name || !input.role || !input.initials) return 'empty';
  if (
    input.name.length > MAX_NAME || input.role.length > MAX_ROLE ||
    input.initials.length > MAX_INITIALS || input.tag.length > MAX_TAG ||
    input.blurb.length > MAX_BLURB || input.linkedin.length > MAX_LINKEDIN
  ) return 'too-long';
  if (!INITIALS_RE.test(input.initials)) return 'bad-initials';
  if (input.linkedin && !LINKEDIN_RE.test(input.linkedin)) return 'bad-linkedin';
  return null;
}

export async function addTeamMember(formData: FormData): Promise<void> {
  await assertEditor();
  if (!isDatabaseConfigured()) back('error', 'no-database');

  const fields = {
    name: clean(formData, 'name', MAX_NAME),
    role: clean(formData, 'role', MAX_ROLE),
    initials: clean(formData, 'initials', MAX_INITIALS).toUpperCase(),
    tag: clean(formData, 'tag', MAX_TAG),
    blurb: clean(formData, 'blurb', MAX_BLURB),
    linkedin: clean(formData, 'linkedin', MAX_LINKEDIN),
  };
  const invalid = validateFields(fields);
  if (invalid) back('error', invalid);

  let next: { image: string | null; uploaded: string | null };
  try {
    next = await resolveImage(formData, null);
  } catch (e) {
    back('error', e instanceof Error ? e.message : 'photo-failed');
  }

  const db = getDb();
  const siblings = await db
    .select({ id: teamMembers.id, sortOrder: teamMembers.sortOrder })
    .from(teamMembers)
    .orderBy(asc(teamMembers.sortOrder));

  const [max] = await db
    .select({ m: sql<number>`coalesce(max(${teamMembers.sortOrder}), -1)` })
    .from(teamMembers);
  const tail = Number(max?.m ?? -1) + 1;

  /* The Add screen offers a position, defaulted to the end. Anything outside
     the list is clamped rather than refused: the intent of "0" or "99" is
     unambiguous, and a form that rejects a number it could obviously have
     understood is just an extra round trip. */
  const raw = formData.get('position');
  const wanted = raw === null || raw === '' ? siblings.length + 1 : Number(raw);
  const target = Number.isFinite(wanted)
    ? Math.min(Math.max(Math.round(wanted), 1), siblings.length + 1) - 1
    : siblings.length;

  const [inserted] = await db.insert(teamMembers).values({
    ...fields,
    blurb: fields.blurb || null,
    linkedin: fields.linkedin || null,
    image: next?.image ?? null,
    /* Appended first and moved below if it belongs elsewhere. Landing at the
       end is the only slot guaranteed not to collide with a sibling. */
    sortOrder: tail,
    /* A draft: nothing reaches the homepage without somebody choosing to
       publish, the same rule every other content table follows. */
    published: false,
  }).returning({ id: teamMembers.id });

  if (target < siblings.length && inserted) {
    /* Same shape as setTeamMemberPosition: the run keeps the sortOrder values
       it already had (now with `tail` on the end), and only which row holds
       which value changes. */
    const order = [...siblings.map((s) => s.sortOrder), tail];
    const reordered = [...siblings];
    reordered.splice(target, 0, { id: inserted.id, sortOrder: tail });

    await db.transaction(async (tx) => {
      for (let i = 0; i < reordered.length; i += 1) {
        if (reordered[i].sortOrder === order[i]) continue;
        await tx
          .update(teamMembers)
          .set({ sortOrder: order[i] })
          .where(eq(teamMembers.id, reordered[i].id));
      }
    });
  }

  published();
  back('ok', 'added');
}

export async function saveTeamMember(formData: FormData): Promise<void> {
  await assertEditor();
  if (!isDatabaseConfigured()) back('error', 'no-database');

  const id = String(formData.get('id') ?? '');
  const fields = {
    name: clean(formData, 'name', MAX_NAME),
    role: clean(formData, 'role', MAX_ROLE),
    initials: clean(formData, 'initials', MAX_INITIALS).toUpperCase(),
    tag: clean(formData, 'tag', MAX_TAG),
    blurb: clean(formData, 'blurb', MAX_BLURB),
    linkedin: clean(formData, 'linkedin', MAX_LINKEDIN),
  };
  const invalid = validateFields(fields);
  if (invalid) backToItem(id, 'error', invalid);

  const db = getDb();
  const [row] = await db
    .select({ id: teamMembers.id, image: teamMembers.image })
    .from(teamMembers)
    .where(eq(teamMembers.id, id))
    .limit(1);
  if (!row) back('error', 'not-found');

  let next: { image: string | null; uploaded: string | null };
  try {
    next = await resolveImage(formData, row.image);
  } catch (e) {
    backToItem(id, 'error', e instanceof Error ? e.message : 'photo-failed');
  }

  await db
    .update(teamMembers)
    .set({
      ...fields,
      blurb: fields.blurb || null,
      linkedin: fields.linkedin || null,
      image: next?.image ?? null,
      updatedAt: new Date(),
    })
    .where(eq(teamMembers.id, id));

  /* The DB now points at the new URL, so deleting the old uploaded file cannot
     orphan a live reference. Seeded static assets are never deleted. */
  if (next?.uploaded && row.image && row.image !== next.uploaded) {
    await deleteUploadedImage(row.image);
  }
  if (!next?.uploaded && !next?.image && row.image) {
    await deleteUploadedImage(row.image);
  }

  published();
  backToItem(id, 'ok', 'saved');
}

export async function setTeamMemberPublished(formData: FormData): Promise<void> {
  await assertEditor();
  if (!isDatabaseConfigured()) back('error', 'no-database');

  const id = String(formData.get('id') ?? '');
  const next = formData.get('published') === '1';

  const db = getDb();
  const [row] = await db
    .update(teamMembers)
    .set({ published: next, updatedAt: new Date() })
    .where(eq(teamMembers.id, id))
    .returning({ id: teamMembers.id });

  if (!row) back('error', 'not-found');

  published();
  back('ok', next ? 'published' : 'unpublished');
}

/**
 * Move a member to an absolute position in the homepage order.
 *
 * The edit page offers the position as a number you type or step, and going
 * from ninth to first should not be eight round trips. A swap is not enough here — moving into the
 * middle shifts everything between, so the whole run is renumbered.
 *
 * The sortOrder values themselves are reused rather than recomputed: whatever
 * spacing the column already has is preserved, and only which row holds which
 * value changes. Returns to the member, not the list, because the control that
 * calls this is on the member's own page and you may well nudge it twice.
 */
export async function setTeamMemberPosition(formData: FormData): Promise<void> {
  await assertEditor();
  if (!isDatabaseConfigured()) back('error', 'no-database');

  const id = String(formData.get('id') ?? '');
  const wanted = Number(formData.get('position'));

  const db = getDb();
  const siblings = await db
    .select({ id: teamMembers.id, sortOrder: teamMembers.sortOrder })
    .from(teamMembers)
    .orderBy(asc(teamMembers.sortOrder));

  const at = siblings.findIndex((s) => s.id === id);
  if (at === -1) back('error', 'not-found');

  /* A position outside the list is a stale page or a hand-typed number, not
     something to write. Clamped rather than rejected: the intent of "0" or
     "99" is unambiguous. */
  if (!Number.isFinite(wanted)) backToItem(id, 'error', 'bad-position');
  const target = Math.min(Math.max(Math.round(wanted), 1), siblings.length) - 1;
  if (target === at) backToItem(id, 'ok', 'moved');

  const order = siblings.map((s) => s.sortOrder);
  const reordered = siblings.slice();
  const [moved] = reordered.splice(at, 1);
  reordered.splice(target, 0, moved);

  await db.transaction(async (tx) => {
    for (let i = 0; i < reordered.length; i += 1) {
      /* Only the rows whose value actually changes — everything outside the
         span between the old and new position keeps the value it had. */
      if (reordered[i].sortOrder === order[i]) continue;
      await tx
        .update(teamMembers)
        .set({ sortOrder: order[i] })
        .where(eq(teamMembers.id, reordered[i].id));
    }
  });

  published();
  backToItem(id, 'ok', 'moved');
}
