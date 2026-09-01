import NextAuth from 'next-auth';
import Resend from 'next-auth/providers/resend';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { getDb, isDatabaseConfigured } from '@/db';
import { users, accounts, sessions, verificationTokens } from '@/db/schema/auth';
import { isAllowedEmail } from '@/lib/auth/allowlist';

/**
 * Admin authentication — MIGRATION-PLAN §10.
 *
 * Emailed sign-in links for ~9 internal editors. No public accounts, no
 * passwords, no OAuth today.
 *
 * The config is a function rather than an object because it must not touch the
 * database at import time: `next build` prerenders in a process with no
 * DATABASE_URL, and building the adapter eagerly would fail the build for every
 * page that never authenticates. Same reasoning as the lazy pool in db/index.ts.
 */
/**
 * Whether to print sign-in links to the terminal instead of emailing them.
 *
 * Both conditions are required, and neither is overridable by configuration:
 *
 *   NODE_ENV !== 'production'  — Next sets this to 'production' in `next build`
 *                                and in the built server, so a deployed
 *                                instance can never take this branch whatever
 *                                its env file says.
 *   no AUTH_RESEND_KEY         — the moment a real key exists, real mail is
 *                                sent, so this cannot linger once configured.
 *
 * The failure mode if this were ever wrong is that sign-in links for company
 * addresses get written to the application log, so it is deliberately not
 * switchable by an env var someone could set on a server by accident.
 *
 * In production with no key, Auth.js fails the send loudly. That is correct:
 * a misconfigured admin should be unreachable, not quietly open.
 */
const printLinkLocally =
  process.env.NODE_ENV !== 'production' && !process.env.AUTH_RESEND_KEY;

export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  /* Behind Nginx the request host arrives in forwarded headers. Without this
     Auth.js refuses to build callback URLs from them. Requires Nginx to set
     X-Forwarded-Proto — otherwise links come back http:// and fail. */
  trustHost: true,
  adapter: isDatabaseConfigured()
    ? DrizzleAdapter(getDb(), {
        usersTable: users,
        accountsTable: accounts,
        sessionsTable: sessions,
        verificationTokensTable: verificationTokens,
      })
    : undefined,
  providers: [
    Resend({
      /* The provider refuses to initialise without a key. In the local case
         below nothing is ever sent with it, so a placeholder is enough. */
      apiKey: process.env.AUTH_RESEND_KEY ?? 'local-development-no-key',
      from: process.env.AUTH_EMAIL_FROM ?? 'admin@remassistance.com',
      ...(printLinkLocally
        ? {
            /**
             * Local development with no mail provider: print the sign-in link
             * to the terminal instead of emailing it.
             *
             * This is NOT a bypass. The link is a real single-use verification
             * token, the allowlist has already refused any address outside the
             * company by the time this runs, and redeeming it goes through the
             * ordinary callback. The only thing that changes is the transport
             * — which means the flow you test locally is the flow that ships.
             *
             * See printLinkLocally for why this cannot reach production.
             */
            async sendVerificationRequest({ identifier, url }) {
              console.log(
                `\n  ┌─ Admin sign-in link (local only — no email was sent)\n` +
                  `  │  ${identifier}\n` +
                  `  └─ ${url}\n`,
              );
            },
          }
        : {}),
    }),
  ],
  pages: {
    signIn: '/admin/signin',
    error: '/admin/signin',
    verifyRequest: '/admin/signin?sent=1',
  },
  callbacks: {
    /**
     * Enforced here rather than only in the admin layout, and this matters:
     * the callback runs *before* the link is sent, so a stranger's address is
     * refused instead of being emailed. Gating only at the page would leave a
     * public endpoint that makes our server send mail to any address on
     * request — an open relay wearing a sign-in form.
     */
    signIn({ user }) {
      return isAllowedEmail(user?.email);
    },
    session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
}));
