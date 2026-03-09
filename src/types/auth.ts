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
  register(input: { username: string; email: string; password: string; remember?: boolean }): Promise<AppUser>;
  login(input: { email: string; password: string; remember?: boolean }): Promise<AppUser>;
  loginWithGoogle?(options?: { remember?: boolean }): Promise<AppUser>;
  registerWithGoogle?(options?: { remember?: boolean }): Promise<AppUser>;
  forgotPassword(input: { email: string }): Promise<void>;
  deleteAccount(): Promise<void>;
  logout(): Promise<void>;
}
