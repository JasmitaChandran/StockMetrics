// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

type DbUser = {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

const users = new Map<string, DbUser>();
const sessions = new Map<string, { id: string; user: { id: string } }>();

const dbMock = {
  getAll: vi.fn(async (store: string) => {
    if (store === 'users') return Array.from(users.values());
    if (store === 'session') return Array.from(sessions.values());
    return [];
  }),
  get: vi.fn(async (store: string, key: string) => {
    if (store === 'users') return users.get(key);
    if (store === 'session') return sessions.get(key);
    return undefined;
  }),
  put: vi.fn(async (store: string, value: any) => {
    if (store === 'users') users.set(value.id, value);
    if (store === 'session') sessions.set(value.id, value);
  }),
  delete: vi.fn(async (store: string, key: string) => {
    if (store === 'users') users.delete(key);
    if (store === 'session') sessions.delete(key);
  }),
};

vi.mock('@/lib/storage/idb', () => ({
  getDb: vi.fn(async () => dbMock),
}));

import { localAuthAdapter } from '@/lib/auth/local-auth';

describe('auth abuse protections', () => {
  beforeEach(() => {
    users.clear();
    sessions.clear();
    window.sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('clears malformed temp session payload instead of trusting it', async () => {
    window.sessionStorage.setItem('local-session-temp', '{"id":');

    const session = await localAuthAdapter.getSession();

    expect(session.user).toBeNull();
    expect(window.sessionStorage.getItem('local-session-temp')).toBeNull();
  });

  it('rejects temp-session user IDs that do not exist in user store', async () => {
    window.sessionStorage.setItem(
      'local-session-temp',
      JSON.stringify({ id: 'attacker-id', username: 'Mallory', email: 'mallory@example.com' }),
    );

    const session = await localAuthAdapter.getSession();

    expect(session.user).toBeNull();
    expect(window.sessionStorage.getItem('local-session-temp')).toBeNull();
  });

  it('requires a real signed-in user record before deleteAccount', async () => {
    window.sessionStorage.setItem(
      'local-session-temp',
      JSON.stringify({ id: 'victim-id', username: 'Victim', email: 'victim@example.com' }),
    );

    await expect(localAuthAdapter.deleteAccount()).rejects.toThrow('No signed-in account found.');
  });

  it('still allows valid temp session users tied to an existing account', async () => {
    users.set('u-1', {
      id: 'u-1',
      username: 'Alice',
      email: 'alice@example.com',
      passwordHash: 'hash',
      createdAt: new Date().toISOString(),
    });
    window.sessionStorage.setItem(
      'local-session-temp',
      JSON.stringify({ id: 'u-1', username: 'Alice', email: 'alice@example.com' }),
    );

    const session = await localAuthAdapter.getSession();

    expect(session.user?.id).toBe('u-1');
    expect(session.user?.username).toBe('Alice');
  });
});
