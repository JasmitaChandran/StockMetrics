'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { getAuthAdapter } from '@/lib/auth';
import { useAuthStore } from '@/stores/auth-store';

export function AuthDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const setUser = useAuthStore((s) => s.setUser);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('Jasmita');
  const [email, setEmail] = useState('jasmita@example.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const adapter = getAuthAdapter();

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const user =
        mode === 'register'
          ? await adapter.register({ username, email, password })
          : await adapter.login({ email, password });
      setUser(user);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function continueWithGoogle() {
    setLoading(true);
    setError(null);
    try {
      const user = adapter.loginWithGoogle ? await adapter.loginWithGoogle() : await adapter.login({ email, password });
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
          {mode === 'register' ? (
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-slate-500">Username</span>
              <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full rounded-xl border border-border bg-card px-3 py-2" />
            </label>
          ) : null}
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-slate-500">Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-border bg-card px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-slate-500">Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-border bg-card px-3 py-2" />
          </label>
          {error ? <p className="text-xs text-negative">{error}</p> : null}
          <div className="grid gap-2 sm:grid-cols-2">
            <button onClick={submit} disabled={loading} className="rounded-xl bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-60">
              {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Register'}
            </button>
            <button onClick={continueWithGoogle} disabled={loading} className="rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60">
              Continue with Google
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            The default setup uses a local session for sign-in. Firebase authentication can be configured for full production deployments.
          </p>
        </div>
      </div>
    </div>
  );
}
