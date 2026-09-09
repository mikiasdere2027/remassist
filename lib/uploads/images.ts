import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Admin image uploads — written to disk, the public URL stored in the row.
 *
 * One store, several kinds. A file lives under `.uploads/<kind>/` on disk and
 * is served to browsers by the route handler at
 * app/uploads/[kind]/[file]/route.ts, which maps `/uploads/<kind>/<uuid>.<ext>`
 * back to that directory. Persisting media on disk rather than in a bytea
 * column keeps the database small and matches how the rest of this codebase
 * treats images (public/images). Vercel's filesystem is ephemeral, so uploads
 * live as long as the running instance does there; the VPS — the real deploy
 * target — keeps them on disk.
 *
 * The URL is content-addressed (a fresh uuid per upload) so the serving route
 * may cache aggressively and an editor "replacing" an image simply gets a new
 * path; the old file is deleted by the action after the new one is written.
 *
 * `kind` is a closed set rather than any string: it becomes a directory name
 * and a URL segment, so an attacker-supplied value must never reach either.
 */

/** The only image types an upload may be. */
export const UPLOAD_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type UploadImageType = (typeof UPLOAD_IMAGE_TYPES)[number];

/** 4 MB: generous for a cover photo, small enough to keep payloads sane. */
export const UPLOAD_IMAGE_MAX = 4 * 1024 * 1024;

/** What an upload can belong to. Each is one directory and one URL segment. */
export const UPLOAD_KINDS = ['team', 'blog', 'popup'] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];

export function isUploadKind(value: string): value is UploadKind {
  return (UPLOAD_KINDS as readonly string[]).includes(value);
}

const EXT: Record<UploadImageType, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

/** Everything saveUploadedImage can produce, and nothing else. */
const NAME_RE = /^[a-f0-9-]{36}\.(jpg|png|webp)$/;

/** On-disk directory for one kind of upload. Configurable for the VPS. */
export function uploadDir(kind: UploadKind): string {
  const base = process.env.UPLOAD_DIR ?? path.join(process.cwd(), '.uploads');
  return path.join(base, kind);
}

/** The public URL prefix the route handler serves for one kind. */
export function uploadPrefix(kind: UploadKind): string {
  return `/uploads/${kind}/`;
}

/** True for a URL this module produced — i.e. one it is allowed to delete. */
export function isUploadedImage(publicPath: string): boolean {
  return UPLOAD_KINDS.some(
    (kind) =>
      publicPath.startsWith(uploadPrefix(kind)) &&
      NAME_RE.test(publicPath.slice(uploadPrefix(kind).length)),
  );
}

/**
 * Write one uploaded image and return its public URL.
 *
 * The filename is a fresh uuid plus a mime-derived extension, so two uploads
 * can never collide and a returned URL is unique enough to cache forever.
 */
export async function saveUploadedImage(
  kind: UploadKind,
  data: Uint8Array,
  mime: string,
): Promise<string> {
  const ext = EXT[mime as UploadImageType];
  if (!ext) throw new Error('unsupported-type');
  const dir = uploadDir(kind);
  await mkdir(dir, { recursive: true });
  const name = `${randomUUID()}${ext}`;
  await writeFile(path.join(dir, name), data, { flag: 'wx' });
  return `${uploadPrefix(kind)}${name}`;
}

/**
 * Delete an uploaded image. Seeded static assets under /public/images are
 * never touched — only URLs inside an upload prefix can be removed, and only
 * if the filename matches exactly what saveUploadedImage produces. A missing
 * file is not an error: the goal is "that URL no longer resolves".
 */
export async function deleteUploadedImage(publicPath: string): Promise<void> {
  if (!isUploadedImage(publicPath)) return;
  const kind = UPLOAD_KINDS.find((k) => publicPath.startsWith(uploadPrefix(k)))!;
  const name = publicPath.slice(uploadPrefix(kind).length);
  await unlink(path.join(uploadDir(kind), name)).catch(() => {});
}
