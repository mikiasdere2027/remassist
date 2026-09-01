import { redirect } from 'next/navigation';

/** Leads is the only admin surface today, so /admin goes straight there. */
export default function AdminIndex() {
  redirect('/admin/leads');
}
