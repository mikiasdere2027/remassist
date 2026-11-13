import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth/require';
import { safeAdminPath } from '@/lib/auth/safe-next';
import AuthCard from '../AuthCard';
import SignInForm from './SignInForm';

export const metadata = { title: 'Sign in' };
export const dynamic = 'force-dynamic';

/**
 * Admin sign-in: username + password against the backend
 * (POST /v1/admin/auth/login, which sets the session cookie). Accounts come
 * from invitations; there is no self-registration.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  // Already signed in: skip the form. If the backend is down, still show the
  // form (its submit will report the problem) rather than an error page.
  let signedIn = false;
  try {
    signedIn = Boolean(await currentUser());
  } catch {
    signedIn = false;
  }
  if (signedIn) redirect(safeAdminPath(next));

  return (
    <AuthCard title="Admin sign-in">
      <SignInForm next={next} />
    </AuthCard>
  );
}
