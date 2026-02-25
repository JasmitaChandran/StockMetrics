import type { AuthAdapter } from '@/types';

// Placeholder adapter that keeps Firebase optional and non-blocking.
// For a fully featured Firebase flow (including Google popup), install the Firebase SDK
// and swap this adapter implementation using the same interface.
export const firebaseAuthAdapter: AuthAdapter = {
  id: 'firebase',
  async getSession() {
    return { user: null };
  },
  async register() {
    throw new Error('Firebase auth adapter is not installed. Use local auth or configure Firebase SDK.');
  },
  async login() {
    throw new Error('Firebase auth adapter is not installed. Use local auth or configure Firebase SDK.');
  },
  async loginWithGoogle() {
    throw new Error('Firebase auth adapter is not installed. Use local auth Google demo or configure Firebase SDK.');
  },
  async logout() {},
};
