import { AuthBackdropShell } from '@/components/auth/auth-backdrop-shell';
import { AuthPageCard } from '@/components/auth/auth-page-card';

export default function RegisterPage() {
  return (
    <AuthBackdropShell
      mode="register"
      title="Create Your Stock Metrics Account"
      subtitle="Create your account and start tracking market opportunities."
    >
      <AuthPageCard mode="register" />
    </AuthBackdropShell>
  );
}
