import { requireRole } from '@/lib/auth/require';
import { apiServer } from '@/lib/api/server';
import type { Invitation, TeamUser } from '@/lib/api/types';
import AdminTopbar from '../../AdminTopbar';
import UsersManager from './UsersManager';

export const metadata = { title: 'Users' };
export const dynamic = 'force-dynamic';

/**
 * Admin accounts: who can sign in, their roles, invitations and password
 * resets. Admins only — the backend enforces the same rule on every call.
 */
export default async function UsersPage() {
  const me = await requireRole('admin');
  const [users, invitations] = await Promise.all([
    apiServer<TeamUser[]>('/admin/users'),
    apiServer<Invitation[]>('/admin/invitations'),
  ]);

  return (
    <>
      <AdminTopbar
        title="Users"
        subtitle="Who can sign in to the admin. Invite people, change roles, reset passwords."
      />
      <UsersManager meId={me.id} users={users} invitations={invitations} />
    </>
  );
}
