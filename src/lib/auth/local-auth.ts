import type { AppUser, AuthAdapter, SessionState } from '@/types';
import { getDb, type LocalUserRecord } from '@/lib/storage/idb';

const SESSION_KEY = 'local-session';
const TEMP_SESSION_KEY = 'local-session-temp';

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

function getTempSessionUser() {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(TEMP_SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AppUser;
    if (parsed && parsed.id && parsed.username) return parsed;
  } catch {
    // Ignore malformed session payload and clear it.
  }
  window.sessionStorage.removeItem(TEMP_SESSION_KEY);
  return null;
}

function setTempSessionUser(user: AppUser) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(TEMP_SESSION_KEY, JSON.stringify(user));
}

function clearTempSessionUser() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(TEMP_SESSION_KEY);
}

function isValidEmail(input: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
}

async function saveSession(user: AppUser, remember = true) {
  const db = await getDb();
  if (remember) {
    await db.put('session', { id: SESSION_KEY, user });
    clearTempSessionUser();
    return;
  }
  await db.delete('session', SESSION_KEY);
  setTempSessionUser(user);
}

export const localAuthAdapter: AuthAdapter = {
  id: 'local',
  async getSession(): Promise<SessionState> {
    if (typeof window === 'undefined') return { user: null };
    const tempUser = getTempSessionUser();
    if (tempUser) return { user: tempUser };
    const db = await getDb();
    const session = await db.get('session', SESSION_KEY);
    return { user: session?.user ?? null };
  },
  async register({ username, email, password, remember = true }) {
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
    await saveSession(appUser, remember);
    return appUser;
  },
  async login({ email, password, remember = true }) {
    const db = await getDb();
    const users = (await db.getAll('users')) as LocalUserRecord[];
    const match = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!match || match.passwordHash !== hashPassword(password)) throw new Error('Invalid credentials');
    const appUser = toAppUser(match);
    await saveSession(appUser, remember);
    return appUser;
  },
  async loginWithGoogle(_options?: { remember?: boolean }) {
    throw new Error(
      'Google sign-in requires Firebase Authentication. Configure Firebase env vars and set NEXT_PUBLIC_ENABLE_FIREBASE_AUTH=true.',
    );
  },
  async registerWithGoogle(_options?: { remember?: boolean }) {
    throw new Error(
      'Google registration requires Firebase Authentication. Configure Firebase env vars and set NEXT_PUBLIC_ENABLE_FIREBASE_AUTH=true.',
    );
  },
  async forgotPassword({ email }) {
    if (!email.trim() || !isValidEmail(email.trim())) {
      throw new Error('Please enter a valid email address.');
    }
    const db = await getDb();
    const users = (await db.getAll('users')) as LocalUserRecord[];
    const match = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!match) throw new Error('No account found with this email.');
  },
  async deleteAccount() {
    const db = await getDb();
    const tempUser = getTempSessionUser();
    const session = tempUser ? null : await db.get('session', SESSION_KEY);
    const currentUserId = tempUser?.id || session?.user?.id;
    if (!currentUserId) {
      throw new Error('No signed-in account found.');
    }
    await db.delete('users', currentUserId);
    await db.delete('session', SESSION_KEY);
    clearTempSessionUser();
  },
  async logout() {
    const db = await getDb();
    await db.delete('session', SESSION_KEY);
    clearTempSessionUser();
  },
};
