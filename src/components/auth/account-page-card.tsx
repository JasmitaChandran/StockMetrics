'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AlertTriangle, CheckCircle2, LogOut, ShieldAlert, UserCircle2 } from 'lucide-react';
import { getAuthAdapter } from '@/lib/auth';
import { useAuthStore } from '@/stores/auth-store';

export function AccountPageCard() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const loadingSession = useAuthStore((s) => s.loading);
  const setUser = useAuthStore((s) => s.setUser);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function logout() {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await getAuthAdapter().logout();
      setUser(null);
      router.replace('/login');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteAccount() {
    const confirmed = window.confirm(
      'This will permanently delete the currently signed-in account. This action cannot be undone.',
    );
    if (!confirmed) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await getAuthAdapter().deleteAccount();
      setUser(null);
      setSuccess('Account deleted permanently.');
      router.replace('/login');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingSession) {
    return <div className="h-[360px] animate-pulse rounded-2xl border border-border bg-card/70" />;
  }

  if (!user) {
    return (
      <div className="ui-panel glass mx-auto w-full max-w-xl rounded-2xl p-6 shadow-panel">
        <div className="mb-3 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-400" />
          <h1 className="text-xl font-semibold">No Account Signed In</h1>
        </div>
        <p className="text-sm text-slate-500">Please login first to manage logout or permanent account deletion.</p>
        <Link
          href="/login"
          className="mt-4 inline-flex items-center rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="ui-panel glass mx-auto w-full max-w-xl rounded-2xl p-6 shadow-panel">
      <div className="mb-4 flex items-center gap-2">
        <UserCircle2 className="h-5 w-5 text-slate-300" />
        <h1 className="text-xl font-semibold">Account</h1>
      </div>

      <div className="space-y-2 rounded-xl border border-border bg-card/40 p-4 text-sm">
        <p>
          Signed in as: <span className="font-medium">{user.username}</span>
        </p>
        <p>
          Email: <span className="font-medium">{user.email || 'Not available'}</span>
        </p>
        <p>
          Provider: <span className="font-medium uppercase">{user.provider}</span>
        </p>
      </div>

      <p className="mt-3 text-xs text-slate-500">All actions below apply only to this currently signed-in account.</p>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={logout}
          disabled={submitting}
          className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>

        <button
          type="button"
          onClick={deleteAccount}
          disabled={submitting}
          className="inline-flex items-center gap-1 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/20 disabled:opacity-50"
        >
          <AlertTriangle className="h-4 w-4" />
          Delete Account Permanently
        </button>
      </div>

      {error ? <p className="mt-3 text-xs text-negative">{error}</p> : null}
      {success ? (
        <p className="mt-3 inline-flex items-center gap-1 text-xs text-positive">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {success}
        </p>
      ) : null}
    </div>
  );
}
