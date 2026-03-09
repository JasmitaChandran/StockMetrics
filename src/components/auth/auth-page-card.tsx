'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BarChart3, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { getAuthAdapter } from '@/lib/auth';
import { useAuthStore } from '@/stores/auth-store';

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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const adapter = getAuthAdapter();

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
          ? await adapter.register({ username: username.trim(), email: email.trim(), password })
          : await adapter.login({ email: email.trim(), password });
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
          ? await adapter.registerWithGoogle!()
          : await adapter.loginWithGoogle!();
      setUser(nextUser);
      router.replace('/dashboard');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingSession) {
    return <div className="h-[440px] animate-pulse rounded-2xl border border-border bg-card/70" />;
  }

  if (user) {
    return (
      <div className="ui-panel glass mx-auto w-full max-w-md rounded-2xl p-6 shadow-panel">
        <div className="mb-3 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-positive" />
          <h1 className="text-xl font-semibold">Already Signed In</h1>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          You are logged in as <span className="font-medium">{user.username}</span>.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            Go to Dashboard
          </Link>
          <Link href="/account" className="inline-flex items-center rounded-xl border border-border px-4 py-2 text-sm font-medium">
            Manage Account
          </Link>
        </div>
        {error ? <p className="mt-3 text-xs text-negative">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="ui-panel glass mx-auto w-full max-w-md rounded-2xl p-6 shadow-panel">
      <div className="mb-5 flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-blue-500 text-white shadow-violet">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">{mode === 'login' ? 'Login' : 'Register'}</h1>
          <p className="text-sm text-slate-500">
            {mode === 'login'
              ? 'Login with email/password or continue with Google.'
              : 'Create an account with username, email, password, or continue with Google.'}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {mode === 'register' ? (
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-slate-500">Username</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-3 py-2"
            />
          </label>
        ) : null}

        <label className="block text-sm">
          <span className="mb-1 block text-xs text-slate-500">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-xs text-slate-500">Password</span>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-3 py-2 pr-10"
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

        {error ? <p className="text-xs text-negative">{error}</p> : null}

        <button
          onClick={submitForm}
          disabled={submitting}
          className="w-full rounded-xl bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {submitting ? 'Please wait...' : mode === 'login' ? 'Login' : 'Register'}
        </button>

        <button
          onClick={continueWithGoogle}
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
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
