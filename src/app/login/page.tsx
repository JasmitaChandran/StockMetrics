import { AuthBackdropShell } from '@/components/auth/auth-backdrop-shell';
import { AuthPageCard } from '@/components/auth/auth-page-card';

export default function LoginPage() {
  return (
    <AuthBackdropShell
      mode="login"
      title="Login To Your Trading Workspace"
      subtitle="Secure sign-in with market insights at your fingertips."
    >
      <AuthPageCard mode="login" />
    </AuthBackdropShell>
  );
}
