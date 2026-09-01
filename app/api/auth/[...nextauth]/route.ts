import { handlers } from '@/auth';

/** Auth.js endpoints — sign-in, callback, session, sign-out. */
export const { GET, POST } = handlers;

/* Never prerendered: every response depends on a session cookie. */
export const dynamic = 'force-dynamic';
