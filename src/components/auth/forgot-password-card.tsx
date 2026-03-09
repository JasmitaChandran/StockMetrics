'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, AtSign, CheckCircle2, KeyRound } from 'lucide-react';
import { getAuthAdapter } from '@/lib/auth';

function isValidEmail(input: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
}

export function ForgotPasswordCard() {
  const adapter = getAuthAdapter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const nextEmail = email.trim();
    if (!nextEmail) {
      setError('Email is required.');
      return;
    }
    if (!isValidEmail(nextEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await adapter.forgotPassword({ email: nextEmail });
      if (adapter.id === 'local') {
        setSuccess('Local auth mode is active. Reset emails are not sent in local mode.');
      } else {
        setSuccess('If this email uses password login, you will receive a reset email shortly.');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="ui-panel glass mx-auto w-full max-w-md rounded-2xl p-6 shadow-panel">
      <div className="mb-5 flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-blue-500 text-white shadow-violet">
          <KeyRound className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Forgot Password</h1>
          <p className="text-sm text-slate-500">Enter your account email to reset your password.</p>
        </div>
      </div>

      <div className="space-y-3">
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

        {error ? <p className="text-xs text-negative">{error}</p> : null}
        {success ? (
          <p className="inline-flex items-center gap-1 text-xs text-positive">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {success}
          </p>
        ) : null}

        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-blue-500 px-3 py-2 text-sm font-medium text-white shadow-violet disabled:opacity-60"
        >
          {submitting ? 'Please wait...' : 'Send Reset Link'}
          {submitting ? null : <ArrowRight className="h-4 w-4" />}
        </button>

        <p className="pt-1 text-sm text-slate-500">
          Remembered your password?{' '}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Back to Login
          </Link>
        </p>
        <p className="text-[11px] text-slate-500">
          No email yet? Check Spam/Promotions and ensure the account was created with email/password (not Google-only sign-in).
        </p>
      </div>
    </div>
  );
}
