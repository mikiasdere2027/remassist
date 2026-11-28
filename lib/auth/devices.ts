/** One of your signed-in sessions, as GET /v1/admin/auth/sessions returns it. */
export interface DeviceSession {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  remember: boolean;
  ip: string | null;
  userAgent: string | null;
  /** The device you are using right now. */
  current: boolean;
}

/**
 * "Firefox on Linux" from a browser's user-agent text, for the signed-in
 * devices list. Deliberately small: enough to recognise your own devices, not
 * a full parser. Order matters: Edge and Opera also say "Chrome", and Chrome
 * also says "Safari".
 */
export function describeDevice(userAgent: string | null | undefined): string {
  const ua = (userAgent ?? '').trim();
  if (!ua) return 'Unknown device';
  const browser = /Edg\//.test(ua) ? 'Edge'
    : /OPR\/|Opera/.test(ua) ? 'Opera'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\/|CriOS\//.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) && /Version\//.test(ua) ? 'Safari'
    : null;
  const os = /iPhone|iPad|iPod/.test(ua) ? 'iOS'
    : /Android/.test(ua) ? 'Android'
    : /Windows/.test(ua) ? 'Windows'
    : /Macintosh|Mac OS X/.test(ua) ? 'macOS'
    : /Linux|X11/.test(ua) ? 'Linux'
    : null;
  return `${browser ?? 'Unknown browser'}${os ? ` on ${os}` : ''}`;
}
