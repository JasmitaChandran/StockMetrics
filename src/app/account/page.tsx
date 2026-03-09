import { AuthBackdropShell } from '@/components/auth/auth-backdrop-shell';
import { AccountPageCard } from '@/components/auth/account-page-card';

export default function AccountPage() {
  return (
    <AuthBackdropShell
      mode="account"
      title="Manage Your Account Settings"
      subtitle="Review your profile and manage security actions in one place."
      contentClassName="lg:max-w-xl"
    >
      <AccountPageCard />
    </AuthBackdropShell>
  );
}
