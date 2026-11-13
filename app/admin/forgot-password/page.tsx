import AuthCard from '../AuthCard';
import ForgotForm from './ForgotForm';

export const metadata = { title: 'Forgot password' };

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="Reset your password">
      <ForgotForm />
    </AuthCard>
  );
}
