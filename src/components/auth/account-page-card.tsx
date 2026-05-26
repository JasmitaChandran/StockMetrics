'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  LogOut,
  Mail,
  MessageCircle,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  UserCircle2,
} from 'lucide-react';
import { buildWelcomeWhatsAppMessage, notifyByWhatsApp } from '@/lib/alerts/whatsapp';
import { getAuthAdapter } from '@/lib/auth';
import {
  getAlertContactSettings,
  setAlertContactSettings,
} from '@/lib/storage/repositories';
import { useAuthStore } from '@/stores/auth-store';
import {
  isValidWhatsAppPhone,
  maskPhoneNumber,
  toE164Phone,
} from '@/lib/utils/whatsapp';

const OTP_EXPIRY_MS = 10 * 60 * 1000;

function generateSixDigitOtp() {
  return String(Math.floor(100_000 + Math.random() * 900_000));
}

export function AccountPageCard() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const loadingSession = useAuthStore((s) => s.loading);
  const setUser = useAuthStore((s) => s.setUser);

  const [submitting, setSubmitting] = useState(false);
  const [contactLoading, setContactLoading] = useState(true);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [whatsAppPhone, setWhatsAppPhone] = useState('');
  const [verifiedWhatsAppPhone, setVerifiedWhatsAppPhone] = useState('');
  const [verifiedAt, setVerifiedAt] = useState<string | undefined>();
  const [otpInput, setOtpInput] = useState('');
  const [pendingOtp, setPendingOtp] = useState('');
  const [pendingOtpPhone, setPendingOtpPhone] = useState('');
  const [pendingOtpExpiry, setPendingOtpExpiry] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    if (!userId) {
      setContactLoading(false);
      return;
    }

    setContactLoading(true);
    void (async () => {
      const settings = await getAlertContactSettings({ userId });
      if (!active) return;
      const normalizedPhone = toE164Phone(settings.whatsappPhone ?? '');
      const verified =
        Boolean(settings.whatsappVerified) && Boolean(normalizedPhone);

      setWhatsAppPhone(normalizedPhone);
      setVerifiedWhatsAppPhone(verified ? normalizedPhone : '');
      setVerifiedAt(verified ? settings.whatsappVerifiedAt : undefined);
      setContactLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [userId]);

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

  async function sendOtpToWhatsApp() {
    if (!user) return;
    const normalizedPhone = toE164Phone(whatsAppPhone);
    if (!isValidWhatsAppPhone(normalizedPhone)) {
      setError(
        'Please enter a valid WhatsApp number in international format (example: +14155552671).',
      );
      return;
    }

    setOtpSending(true);
    setError(null);
    setSuccess(null);

    try {
      const otpCode = generateSixDigitOtp();
      const expiry = Date.now() + OTP_EXPIRY_MS;
      const otpMessage = `Your Stock Metrics OTP is ${otpCode}. It expires in 10 minutes.`;
      const delivery = await notifyByWhatsApp(normalizedPhone, otpMessage);
      if (delivery.status === 'failed') {
        throw new Error(delivery.error ?? 'Unable to send OTP to WhatsApp.');
      }

      setPendingOtp(otpCode);
      setPendingOtpPhone(normalizedPhone);
      setPendingOtpExpiry(expiry);
      setOtpInput('');
      setVerifiedWhatsAppPhone('');
      setVerifiedAt(undefined);

      await setAlertContactSettings(
        {
          whatsappPhone: normalizedPhone,
          whatsappVerified: false,
        },
        { userId: user.id },
      );

      setSuccess(`OTP sent to ${normalizedPhone}.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOtpSending(false);
    }
  }

  async function verifyOtpAndSavePhone() {
    if (!user) return;
    if (!pendingOtp || !pendingOtpPhone || !pendingOtpExpiry) {
      setError('Please request an OTP first.');
      return;
    }

    if (Date.now() > pendingOtpExpiry) {
      setError('OTP expired. Please request a new code.');
      return;
    }

    if (otpInput.trim() !== pendingOtp) {
      setError('Incorrect OTP. Please try again.');
      return;
    }

    setOtpVerifying(true);
    setError(null);
    setSuccess(null);

    try {
      const nowIso = new Date().toISOString();
      await setAlertContactSettings(
        {
          whatsappPhone: pendingOtpPhone,
          whatsappVerified: true,
          whatsappVerifiedAt: nowIso,
        },
        { userId: user.id },
      );

      setVerifiedWhatsAppPhone(pendingOtpPhone);
      setVerifiedAt(nowIso);
      setWhatsAppPhone(pendingOtpPhone);
      setPendingOtp('');
      setPendingOtpPhone('');
      setPendingOtpExpiry(null);
      setOtpInput('');

      const welcomeMessage = buildWelcomeWhatsAppMessage(
        user.username || user.email || 'there',
      );
      const welcomeDelivery = await notifyByWhatsApp(
        pendingOtpPhone,
        welcomeMessage,
      );
      if (welcomeDelivery.status === 'failed') {
        setSuccess(
          'Phone verified successfully. Whatsapp message could not be delivered right now.',
        );
        return;
      }

      setSuccess(
        'Phone verified successfully.',
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOtpVerifying(false);
    }
  }

  if (loadingSession) {
    return (
      <div className="h-[460px] animate-pulse rounded-2xl border border-border bg-card/70" />
    );
  }

  if (!user) {
    return (
      <div className="ui-panel glass mx-auto w-full max-w-xl rounded-2xl p-6 shadow-panel">
        <div className="mb-3 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-400" />
          <h1 className="text-xl font-semibold">No Account Signed In</h1>
        </div>
        <p className="text-sm text-slate-500">
          Please login first to manage logout or permanent account deletion.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-flex items-center rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  const isOtpActive =
    Boolean(pendingOtpPhone) &&
    Boolean(pendingOtpExpiry) &&
    Date.now() <= (pendingOtpExpiry ?? 0);

  return (
    <div className="ui-panel glass mx-auto w-full max-w-xl rounded-2xl p-6 shadow-panel">
      <div className="mb-4 flex items-center gap-2">
        <UserCircle2 className="h-5 w-5 text-slate-300" />
        <h1 className="text-xl font-semibold">Account</h1>
      </div>

      <div className="relative mb-4 overflow-hidden rounded-2xl border border-border/70">
        <Image
          src="/images/stocks-blur-bg.svg"
          alt=""
          width={1200}
          height={600}
          className="h-32 w-full object-cover opacity-60 dark:opacity-100"
        />
        <div className="absolute inset-0 bg-white/58 dark:bg-slate-950/55" />
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-100/35 via-sky-100/20 to-indigo-100/35 dark:from-indigo-950/70 dark:via-slate-900/50 dark:to-blue-950/70" />
        <div className="absolute inset-0 flex flex-col justify-end p-3">
          <div className="inline-flex w-fit items-center gap-1 rounded-full border border-slate-300/85 bg-white/75 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:border-white/25 dark:bg-white/10 dark:text-white">
            <ShieldCheck className="h-3.5 w-3.5" />
            Account Protected
          </div>
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-border bg-card/40 p-4 text-sm">
        <p className="flex items-center gap-2">
          <UserCircle2 className="h-4 w-4 text-indigo-400" />
          Signed in as: <span className="font-medium">{user.username}</span>
        </p>
        <p className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-sky-400" />
          Email: <span className="font-medium">{user.email || 'Not available'}</span>
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-card/30 p-4">
        <div className="mb-2 flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-emerald-500" />
          <h2 className="text-sm font-semibold">WhatsApp Notifications</h2>
        </div>
        <p className="text-xs text-slate-500">
          Add your phone number and verify it using OTP to receive alerts on WhatsApp.
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input
            type="tel"
            value={whatsAppPhone}
            onChange={(event) => setWhatsAppPhone(event.target.value)}
            placeholder="+14155552671"
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void sendOtpToWhatsApp()}
            disabled={contactLoading || otpSending || otpVerifying}
            className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-200"
          >
            {otpSending ? 'Sending...' : isOtpActive ? 'Resend OTP' : 'Send OTP'}
          </button>
        </div>

        {verifiedWhatsAppPhone ? (
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Verified number: {maskPhoneNumber(verifiedWhatsAppPhone)}
            {verifiedAt ? ` (${new Date(verifiedAt).toLocaleString()})` : ''}
          </p>
        ) : null}

        {isOtpActive ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input
              type="text"
              inputMode="numeric"
              value={otpInput}
              onChange={(event) => setOtpInput(event.target.value.replace(/[^\d]/g, '').slice(0, 6))}
              placeholder="Enter 6-digit OTP"
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => void verifyOtpAndSavePhone()}
              disabled={otpVerifying}
              className="rounded-xl bg-accent px-3 py-2 text-xs font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {otpVerifying ? 'Verifying...' : 'Verify OTP'}
            </button>
          </div>
        ) : null}
      </div>

      <p className="mt-3 inline-flex items-center gap-1 text-xs text-slate-500">
        <Info className="h-3.5 w-3.5" />
        All actions below apply only to this currently signed-in account.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={logout}
          disabled={submitting}
          className="surface-hover inline-flex items-center gap-1 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>

        <button
          type="button"
          onClick={deleteAccount}
          disabled={submitting}
          className="surface-hover inline-flex items-center gap-1 rounded-xl border border-red-400/70 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-500/20 dark:border-red-500/40 dark:text-red-300 disabled:opacity-50"
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

      {contactLoading ? (
        <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500">
          <Smartphone className="h-3.5 w-3.5" />
          Loading contact settings...
        </p>
      ) : null}
    </div>
  );
}
