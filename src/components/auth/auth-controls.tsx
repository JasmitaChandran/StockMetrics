'use client';

import { LogOut, UserCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { AuthDialog } from './auth-dialog';
import { getAuthAdapter } from '@/lib/auth';

export function AuthControls() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const setUser = useAuthStore((s) => s.setUser);
  const [open, setOpen] = useState(false);

  async function logout() {
    await getAuthAdapter().logout();
    setUser(null);
  }

  if (loading) {
    return <div className="h-9 w-24 animate-pulse rounded-xl bg-muted" />;
  }

  return (
    <>
      {user ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm">
          <UserCircle2 className="h-4 w-4" />
          <span className="max-w-[120px] truncate">{user.username}</span>
          <button onClick={logout} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-fg">
            <LogOut className="h-3.5 w-3.5" /> Logout
          </button>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted">
          Login / Register
        </button>
      )}
      <AuthDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
