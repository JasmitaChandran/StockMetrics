import type { AppUser, AuthAdapter, SessionState } from '@/types';
import { getDb, type LocalUserRecord } from '@/lib/storage/idb';

const SESSION_KEY = 'local-session';

function hashPassword(input: string) {
  // Demo-only auth for local mode. Do not use this in production internet-facing deployments.
  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    return window.btoa(`stock-metrics:${input}`);
  }
  return `stock-metrics:${input}`;
}

function toAppUser(user: LocalUserRecord): AppUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    provider: 'local',
    createdAt: user.createdAt,
  };
}

export const localAuthAdapter: AuthAdapter = {
  id: 'local',
  async getSession(): Promise<SessionState> {
    if (typeof window === 'undefined') return { user: null };
    const db = await getDb();
    const session = await db.get('session', SESSION_KEY);
    return { user: session?.user ?? null };
  },
  async register({ username, email, password }) {
    const db = await getDb();
    const users = (await db.getAll('users')) as LocalUserRecord[];
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('Email already registered');
    }
    const record: LocalUserRecord = {
      id: crypto.randomUUID(),
      username,
      email,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };
    await db.put('users', record);
    const appUser = toAppUser(record);
    await db.put('session', { id: SESSION_KEY, user: appUser });
    return appUser;
  },
  async login({ email, password }) {
    const db = await getDb();
    const users = (await db.getAll('users')) as LocalUserRecord[];
    const match = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!match || match.passwordHash !== hashPassword(password)) throw new Error('Invalid credentials');
    const appUser = toAppUser(match);
    await db.put('session', { id: SESSION_KEY, user: appUser });
    return appUser;
  },
  async loginWithGoogle() {
    throw new Error(
      'Google sign-in requires Firebase Authentication. Configure Firebase env vars and set NEXT_PUBLIC_ENABLE_FIREBASE_AUTH=true.',
    );
  },
  async logout() {
    const db = await getDb();
    await db.delete('session', SESSION_KEY);
  },
};
