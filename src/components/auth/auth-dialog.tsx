'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { buildWelcomeWhatsAppMessage, notifyByWhatsApp } from '@/lib/alerts/whatsapp';
import { getAuthAdapter } from '@/lib/auth';
import { getAlertContactSettings } from '@/lib/storage/repositories';
import { useAuthStore } from '@/stores/auth-store';

export function AuthDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const setUser = useAuthStore((s) => s.setUser);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const adapter = getAuthAdapter();

  async function sendLoginWelcomeMessage(userId: string, displayName: string) {
    const settings = await getAlertContactSettings({ userId });
    if (!settings.whatsappVerified || !settings.whatsappPhone) return;
    await notifyByWhatsApp(settings.whatsappPhone, buildWelcomeWhatsAppMessage(displayName));
  }

  async function continueWithGoogle() {
    setLoading(true);
    setError(null);
    try {
      if (mode === 'register') {
        if (!adapter.registerWithGoogle) {
          throw new Error('Google registration is not available in this auth mode.');
        }
      } else if (!adapter.loginWithGoogle) {
        throw new Error('Google login is not available in this auth mode.');
      }
      const user =
        mode === 'register'
          ? await adapter.registerWithGoogle!()
          : await adapter.loginWithGoogle!();
      void sendLoginWelcomeMessage(user.id, user.username || user.email || 'there');
      setUser(user);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="glass w-full max-w-md rounded-2xl border border-border p-4 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{mode === 'login' ? 'Login' : 'Register'}</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-muted" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mb-3 flex rounded-xl border border-border p-1 text-sm">
          <button className={`flex-1 rounded-lg px-3 py-2 ${mode === 'login' ? 'bg-accent text-white' : ''}`} onClick={() => setMode('login')}>Login</button>
          <button className={`flex-1 rounded-lg px-3 py-2 ${mode === 'register' ? 'bg-accent text-white' : ''}`} onClick={() => setMode('register')}>Register</button>
        </div>
        <div className="space-y-3">
          {error ? <p className="text-xs text-negative">{error}</p> : null}
          <button onClick={continueWithGoogle} disabled={loading} className="w-full rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60">
            {loading
              ? 'Please wait...'
              : mode === 'login'
                ? 'Continue with Google'
                : 'Register with Google'}
          </button>
          <p className="text-[11px] text-slate-500">
            This app now uses Google authentication for login and registration.
          </p>
        </div>
      </div>
    </div>
  );
}
