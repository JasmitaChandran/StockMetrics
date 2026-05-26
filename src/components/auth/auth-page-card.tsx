'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAuthAdapter } from '@/lib/auth';
import { useAuthStore } from '@/stores/auth-store';
import { StockMetricsLogo } from '@/components/common/stock-metrics-logo';

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.8 3.3 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12Z"
      />
      <path fill="#34A853" d="M2.4 7.6 5.6 10c.9-2.6 3.4-4.4 6.4-4.4 1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.8 3.3 14.6 2.4 12 2.4c-3.7 0-6.9 2.1-8.6 5.2Z" />
      <path fill="#FBBC05" d="M12 21.6c2.5 0 4.6-.8 6.1-2.3l-2.8-2.3c-.8.6-1.9 1.1-3.3 1.1-3.8 0-5.2-2.6-5.5-3.9L3.2 16.7c1.7 3 4.9 4.9 8.8 4.9Z" />
      <path fill="#4285F4" d="M21.2 12.2c0-.6-.1-1.1-.2-1.6H12v3.9h5.5c-.3 1.5-1.2 2.5-2.2 3.2l2.8 2.3c1.7-1.6 3.1-4.4 3.1-7.8Z" />
    </svg>
  );
}

export function AuthPageCard({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const loadingSession = useAuthStore((s) => s.loading);
  const setUser = useAuthStore((s) => s.setUser);

  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const adapter = getAuthAdapter();

  useEffect(() => {
    if (!user) return;
    setRedirecting(true);
    router.replace('/dashboard');
  }, [user, router]);

  async function continueWithGoogle() {
    setSubmitting(true);
    setError(null);
    try {
      if (mode === 'register') {
        if (!adapter.registerWithGoogle) {
          throw new Error('Google registration is not available in this auth mode.');
        }
      } else if (!adapter.loginWithGoogle) {
        throw new Error('Google login is not available in this auth mode.');
      }
      const nextUser =
        mode === 'register'
          ? await adapter.registerWithGoogle!({ remember: rememberMe })
          : await adapter.loginWithGoogle!({ remember: rememberMe });
      setUser(nextUser);
      router.replace('/dashboard');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingSession || redirecting) {
    return <div className="h-[440px] animate-pulse rounded-2xl border border-border bg-card/70" />;
  }

  return (
    <div className="ui-panel glass mx-auto w-full max-w-md rounded-2xl p-6 shadow-panel">
      <div className="mb-5 flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/95 p-1 ring-1 ring-indigo-300/30 shadow-violet dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800 dark:ring-slate-500/55">
          <StockMetricsLogo className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">{mode === 'login' ? 'Login' : 'Register'}</h1>
          <p className="text-sm text-slate-500">
            {mode === 'login'
              ? 'Login with your Google account.'
              : <span className="whitespace-nowrap">Create your account using Google sign-up.</span>}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-500">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-border text-accent focus:ring-accent"
          />
          Keep me logged in on this device
        </label>

        {error ? <p className="text-xs text-negative">{error}</p> : null}

        <button
          onClick={continueWithGoogle}
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-blue-500 px-3 py-2 text-sm font-medium text-white shadow-violet disabled:opacity-60"
        >
          <GoogleLogo />
          {submitting
            ? 'Please wait...'
            : mode === 'login'
              ? 'Continue with Google'
              : 'Register with Google'}
        </button>

        <p className="text-xs text-slate-500">
          Use the same Google account each time so your alerts and watchlists stay linked to one profile.
        </p>

        {mode === 'login' ? (
          <p className="pt-1 text-sm text-slate-500">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-medium text-accent hover:underline">
              Register
            </Link>
          </p>
        ) : (
          <p className="pt-1 text-sm text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-accent hover:underline">
              Login
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
