'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BarChart3, CheckCircle2 } from 'lucide-react';
import { getAuthAdapter } from '@/lib/auth';
import { useAuthStore } from '@/stores/auth-store';

export function AuthPageCard({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const loadingSession = useAuthStore((s) => s.loading);
  const setUser = useAuthStore((s) => s.setUser);

  const [username, setUsername] = useState('Jasmita');
  const [email, setEmail] = useState('jasmita@example.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const adapter = getAuthAdapter();

  async function submitForm() {
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
      const nextUser = adapter.loginWithGoogle
        ? await adapter.loginWithGoogle()
        : await adapter.login({ email: email.trim(), password });
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
        <Link
          href="/dashboard"
          className="mt-4 inline-flex items-center rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white"
        >
          Go to Dashboard
        </Link>
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
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-3 py-2"
          />
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
          className="w-full rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
        >
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
