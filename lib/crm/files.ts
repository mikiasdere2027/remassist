import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Private CRM files (contracts, signed proposals). Unlike lib/uploads, these
 * are NEVER under a public folder: Nginx serves /uploads/ to anyone, and a
 * contract must only reach a signed-in admin. They are written outside the
 * web root and streamed by the authenticated route /admin/files/[id].
 *
 * Where: PRIVATE_FILE_DIR if set; on the VPS the shared folder that survives
 * deploys; locally ./.private-files (git-ignored).
 */
export function privateFileDir(): string {
  if (process.env.PRIVATE_FILE_DIR) return process.env.PRIVATE_FILE_DIR;
  if (process.env.NODE_ENV === 'production' && existsSync('/srv/remassist/shared')) return '/srv/remassist/shared/private-files';
  return path.join(process.cwd(), '.private-files');
}

/** 5 MB: under the 6 MB server-action body limit in next.config, with room for the form. */
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

export const FILE_TYPES: Record<string, { ext: string; label: string }> = {
  'application/pdf': { ext: 'pdf', label: 'PDF' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: 'docx', label: 'Word' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { ext: 'xlsx', label: 'Excel' },
  'image/png': { ext: 'png', label: 'PNG' },
  'image/jpeg': { ext: 'jpg', label: 'JPEG' },
};

/**
 * The real type from the file's first bytes, never from its name or the
 * browser's say-so: a renamed .exe must not pass as a PDF.
 */
export function sniffType(bytes: Uint8Array, claimed: string): string | null {
  const b = (i: number) => bytes[i];
  if (b(0) === 0x25 && b(1) === 0x50 && b(2) === 0x44 && b(3) === 0x46) return 'application/pdf';              // %PDF
  if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47) return 'image/png';
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return 'image/jpeg';
  if (b(0) === 0x50 && b(1) === 0x4b && b(2) === 0x03 && b(3) === 0x04) {                                    // ZIP: docx / xlsx
    return claimed.includes('spreadsheetml') || claimed.includes('wordprocessingml') ? claimed : null;
  }
  return null;
}

export function checkFile(name: string, size: number, bytes: Uint8Array, claimed: string):
  { ok: true; mime: string; ext: string; name: string } | { ok: false; error: string } {
  if (size === 0) return { ok: false, error: 'That file is empty.' };
  if (size > MAX_FILE_BYTES) return { ok: false, error: 'Files can be up to 5 MB.' };
  const mime = sniffType(bytes, claimed);
  if (!mime || !FILE_TYPES[mime]) return { ok: false, error: 'Upload a PDF, Word, Excel, PNG or JPEG file.' };
  return { ok: true, mime, ext: FILE_TYPES[mime].ext, name: safeName(name, FILE_TYPES[mime].ext) };
}

/** A display name with no path parts or control characters, ending in the real extension. */
export function safeName(name: string, ext: string): string {
  const base = path.basename(String(name).replace(/\\/g, '/'))
    .replace(/[\u0000-\u001f\u007f"<>|*?:]/g, '')
    .replace(/\.[^.]*$/, '')
    .trim()
    .slice(0, 120) || 'file';
  return `${base}.${ext}`;
}

/** Writes the bytes under a random name; returns the storage key (relative path). */
export async function savePrivateFile(workspaceId: string, ext: string, bytes: Uint8Array): Promise<string> {
  const key = path.posix.join(workspaceId, `${crypto.randomUUID()}.${ext}`);
  const full = resolveKey(key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, bytes, { flag: 'wx' });
  return key;
}

export async function readPrivateFile(key: string): Promise<Buffer> {
  return readFile(resolveKey(key));
}

/** The absolute path for a key, refusing anything that would escape the directory. */
export function resolveKey(key: string): string {
  const root = path.resolve(privateFileDir());
  const full = path.resolve(root, key);
  if (full !== root && !full.startsWith(root + path.sep)) throw new Error('invalid file key');
  return full;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
