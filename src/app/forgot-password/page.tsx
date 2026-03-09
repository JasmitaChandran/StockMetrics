import { AuthBackdropShell } from '@/components/auth/auth-backdrop-shell';
import { ForgotPasswordCard } from '@/components/auth/forgot-password-card';

export default function ForgotPasswordPage() {
  return (
    <AuthBackdropShell
      mode="login"
      title="Reset Your Password"
      subtitle="Verify your email and receive password reset instructions."
    >
      <ForgotPasswordCard />
    </AuthBackdropShell>
  );
}
