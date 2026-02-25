import type { AuthAdapter, SessionState } from '@/types';
import { getFirebaseAuthClient, isFirebaseAuthConfigured, mapFirebaseUser } from './firebase-client';

function normalizeFirebaseError(error: unknown): Error {
  const message = (error as { message?: string })?.message ?? 'Authentication request failed.';
  if (/auth\/popup-closed-by-user/i.test(message)) return new Error('Google sign-in was cancelled.');
  if (/auth\/popup-blocked/i.test(message)) return new Error('Popup was blocked by the browser. Please allow popups and try again.');
  if (/auth\/operation-not-allowed/i.test(message)) {
    return new Error('Google sign-in is not enabled in Firebase Authentication. Enable the Google provider in Firebase Console.');
  }
  if (/auth\/unauthorized-domain/i.test(message)) {
    return new Error('This domain is not authorized for Firebase Authentication. Add it in Firebase Console > Authentication > Settings.');
  }
  return new Error(message);
}

async function ensureConfigured() {
  if (!isFirebaseAuthConfigured()) {
    throw new Error(
      'Firebase Auth is not configured. Set NEXT_PUBLIC_FIREBASE_* variables and set NEXT_PUBLIC_ENABLE_FIREBASE_AUTH=true.',
    );
  }
}

export const firebaseAuthAdapter: AuthAdapter = {
  id: 'firebase',
  async getSession(): Promise<SessionState> {
    if (typeof window === 'undefined') return { user: null };
    if (!isFirebaseAuthConfigured()) return { user: null };

    const { auth, onAuthStateChanged } = await getFirebaseAuthClient();

    if (auth.currentUser) {
      return { user: mapFirebaseUser(auth.currentUser) };
    }

    await new Promise<void>((resolve) => {
      const unsub = onAuthStateChanged(
        auth,
        () => {
          unsub();
          resolve();
        },
        () => {
          unsub();
          resolve();
        },
      );
    });

    return { user: auth.currentUser ? mapFirebaseUser(auth.currentUser) : null };
  },

  async register({ username, email, password }) {
    await ensureConfigured();
    const { auth, createUserWithEmailAndPassword, updateProfile } = await getFirebaseAuthClient();
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (username.trim()) {
        await updateProfile(cred.user, { displayName: username.trim() });
      }
      return mapFirebaseUser(auth.currentUser ?? cred.user);
    } catch (error) {
      throw normalizeFirebaseError(error);
    }
  },

  async login({ email, password }) {
    await ensureConfigured();
    const { auth, signInWithEmailAndPassword } = await getFirebaseAuthClient();
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return mapFirebaseUser(cred.user);
    } catch (error) {
      throw normalizeFirebaseError(error);
    }
  },

  async loginWithGoogle() {
    await ensureConfigured();
    const { auth, GoogleAuthProvider, signInWithPopup } = await getFirebaseAuthClient();
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth, provider);
      return mapFirebaseUser(cred.user);
    } catch (error) {
      throw normalizeFirebaseError(error);
    }
  },

  async logout() {
    if (!isFirebaseAuthConfigured()) return;
    const { auth, signOut } = await getFirebaseAuthClient();
    await signOut(auth);
  },
};
