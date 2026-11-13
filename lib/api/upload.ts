import { api } from './client';
import { ApiError } from './errors';

/** What an upload is for — the backend's Cloudinary sub-folder. */
export type UploadKind = 'team' | 'posts' | 'authors' | 'popups' | 'misc';

interface Signature {
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  allowed_formats: string;
  signature: string;
}

/** Same limit the old on-disk uploads enforced. */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/avif';

/**
 * Browser → Cloudinary direct upload, signed by the backend
 * (POST /v1/admin/uploads/signature). Returns the https URL to save on the
 * record. The file never passes through our servers.
 *
 * Throws ApiError: 503 when the backend has no Cloudinary credentials.
 */
export async function uploadImage(file: File, kind: UploadKind): Promise<string> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new ApiError(400, { message: 'That image is over 4 MB. Please use a smaller one.' });
  }
  const sig = await api.post<Signature>('/admin/uploads/signature', { kind });

  const form = new FormData();
  form.append('file', file);
  form.append('api_key', sig.apiKey);
  form.append('timestamp', String(sig.timestamp));
  form.append('folder', sig.folder);
  form.append('allowed_formats', sig.allowed_formats);
  form.append('signature', sig.signature);

  let res: Response;
  try {
    res = await fetch(sig.uploadUrl, { method: 'POST', body: form });
  } catch {
    throw new ApiError(0, { message: 'The upload failed. Check your connection and try again.' });
  }
  const body = (await res.json().catch(() => null)) as
    | { secure_url?: string; error?: { message?: string } }
    | null;
  if (!res.ok || !body?.secure_url) {
    throw new ApiError(res.status, {
      message: body?.error?.message ?? 'The image host refused that file.',
    });
  }
  return body.secure_url;
}
