import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { isUploadKind, uploadDir } from '@/lib/uploads/images';

/**
 * Serves an uploaded image from disk — team headshots, blog covers.
 *
 * The URL is content-addressed (`/uploads/<kind>/<uuid>.<ext>`) and the files
 * are written by saveUploadedImage with exactly that shape, so checking the
 * kind against the closed set and the filename against the pattern is the only
 * traversal guard needed — anything else is a 404, never a read attempt.
 */

const NAME_RE = /^[a-f0-9-]{36}\.(jpg|jpeg|png|webp)$/;

const MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ kind: string; file: string }> },
) {
  const { kind, file } = await params;
  if (!isUploadKind(kind) || !NAME_RE.test(file)) {
    return new NextResponse('Not found', { status: 404 });
  }

  /* A uuid filename never changes once written, so the response may be cached
     until the file itself is replaced (which gets a new name). next/image sits
     in front when a page renders the image, so browsers mostly hit the
     optimiser anyway; this route is also reachable directly. */
  const [ext] = file.split('.').slice(-1);
  try {
    const buf = await readFile(path.join(uploadDir(kind), file));
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': MIME[ext] ?? 'application/octet-stream',
        'Content-Length': String(buf.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
