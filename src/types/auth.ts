export interface AppUser {
  id: string;
  username: string;
  email?: string;
  provider: 'guest' | 'local' | 'google' | 'firebase';
  avatarUrl?: string;
  createdAt: string;
}

export interface SessionState {
  user: AppUser | null;
}

export interface AuthAdapter {
  id: string;
  getSession(): Promise<SessionState>;
  register(input: { username: string; email: string; password: string }): Promise<AppUser>;
  login(input: { email: string; password: string }): Promise<AppUser>;
  loginWithGoogle?(): Promise<AppUser>;
  logout(): Promise<void>;
}
