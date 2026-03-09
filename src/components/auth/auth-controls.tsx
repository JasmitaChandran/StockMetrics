'use client';

import Link from 'next/link';
import { UserCircle2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

export function AuthControls() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);

  if (loading) {
    return <div className="h-9 w-24 animate-pulse rounded-xl border border-border/70 bg-card/70" />;
  }

  return (
    user ? (
      <div className="ui-panel glass flex items-center gap-2 rounded-xl px-3 py-2 text-sm shadow-panel">
        <Link href="/account" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-fg">
          <UserCircle2 className="h-4 w-4" />
          Account Info
        </Link>
      </div>
    ) : (
      <Link href="/login" className="ui-panel glass surface-hover rounded-xl px-3 py-2 text-sm font-medium shadow-panel">
        Login / Register
      </Link>
    )
  );
}
