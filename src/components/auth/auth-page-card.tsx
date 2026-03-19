'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight, AtSign, Eye, EyeOff, KeyRound, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { getAuthAdapter } from '@/lib/auth';
import { useAuthStore } from '@/stores/auth-store';
import { StockMetricsLogo } from '@/components/common/stock-metrics-logo';

function isValidEmail(input: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
}

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

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const adapter = getAuthAdapter();

  useEffect(() => {
    if (!user) return;
    setRedirecting(true);
    router.replace('/dashboard');
  }, [user, router]);

  function validateForm() {
    if (mode === 'register' && username.trim().length < 2) {
      return 'Username must be at least 2 characters.';
    }
    if (!email.trim()) {
      return 'Email is required.';
    }
    if (!isValidEmail(email.trim())) {
      return 'Please enter a valid email address.';
    }
    if (!password) {
      return 'Password is required.';
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters.';
    }
    return null;
  }

  async function submitForm() {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const nextUser =
        mode === 'register'
          ? await adapter.register({ username: username.trim(), email: email.trim(), password, remember: rememberMe })
          : await adapter.login({ email: email.trim(), password, remember: rememberMe });
      setUser(nextUser);
      router.replace('/dashboard');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

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
              ? 'Login with email/password or continue with Google.'
              : 'Create an account with username, email, password, or continue with Google.'}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {mode === 'register' ? (
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-slate-500">Username</span>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="w-full rounded-xl border border-border bg-card px-3 py-2 pl-10"
              />
            </div>
          </label>
        ) : null}

        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-slate-500">Email</span>
          <div className="relative">
            <AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full rounded-xl border border-border bg-card px-3 py-2 pl-10"
            />
          </div>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-slate-500">Password</span>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full rounded-xl border border-border bg-card px-3 py-2 pl-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-slate-500 hover:text-slate-200"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>

        {mode === 'login' ? (
          <div className="flex items-center justify-between text-xs">
            <label className="inline-flex cursor-pointer items-center gap-2 text-slate-500">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border text-accent focus:ring-accent"
              />
              Keep me logged in
            </label>
            <Link href="/forgot-password" className="font-medium text-accent hover:underline">
              Forgot password?
            </Link>
          </div>
        ) : null}

        {error ? <p className="text-xs text-negative">{error}</p> : null}

        <button
          onClick={submitForm}
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-blue-500 px-3 py-2 text-sm font-medium text-white shadow-violet disabled:opacity-60"
        >
          {submitting ? 'Please wait...' : mode === 'login' ? 'Login' : 'Register'}
          {submitting ? null : <ArrowRight className="h-4 w-4" />}
        </button>

        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">OR</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <button
          onClick={continueWithGoogle}
          disabled={submitting}
          className="surface-hover flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card/70 px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
        >
          <GoogleLogo />
          {mode === 'login' ? 'Login with Google' : 'Register with Google'}
        </button>

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
