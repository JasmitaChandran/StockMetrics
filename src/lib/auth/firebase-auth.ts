import type { AuthAdapter, SessionState } from '@/types';
import { getFirebaseAuthClient, isFirebaseAuthConfigured, mapFirebaseUser } from './firebase-client';

function normalizeFirebaseError(error: unknown): Error {
  const message = (error as { message?: string })?.message ?? '';
  const code = (error as { code?: string })?.code ?? '';
  const token = `${code} ${message}`.toLowerCase();

  if (token.includes('auth/popup-closed-by-user')) return new Error('Google sign-in was cancelled.');
  if (token.includes('auth/popup-blocked')) return new Error('Popup was blocked by the browser. Please allow popups and try again.');
  if (token.includes('auth/operation-not-allowed')) {
    return new Error('Google sign-in is not enabled in Firebase Authentication. Enable the Google provider in Firebase Console.');
  }
  if (token.includes('auth/unauthorized-domain')) {
    return new Error('This domain is not authorized for Firebase Authentication. Add it in Firebase Console > Authentication > Settings.');
  }
  if (token.includes('auth/email-already-in-use')) {
    return new Error('An account with this email already exists. Please login instead.');
  }
  if (token.includes('auth/account-exists-with-different-credential')) {
    return new Error('This email is already linked to a different sign-in method. Please login with that method.');
  }
  if (token.includes('auth/invalid-email')) {
    return new Error('Please enter a valid email address.');
  }
  if (token.includes('auth/weak-password')) {
    return new Error('Password is too weak. Use at least 8 characters.');
  }
  if (token.includes('auth/user-not-found')) {
    return new Error('No account found with this email.');
  }
  if (token.includes('auth/wrong-password') || token.includes('auth/invalid-credential')) {
    return new Error('Incorrect email or password.');
  }
  if (token.includes('auth/too-many-requests')) {
    return new Error('Too many attempts. Please wait and try again.');
  }
  if (token.includes('auth/network-request-failed')) {
    return new Error('Network error while contacting Firebase. Check your connection and try again.');
  }
  if (token.includes('auth/requires-recent-login')) {
    return new Error('For security, please login again before deleting your account.');
  }
  return new Error(message || 'Authentication request failed.');
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

  async register({ username, email, password, remember = true }) {
    await ensureConfigured();
    const {
      auth,
      browserLocalPersistence,
      browserSessionPersistence,
      createUserWithEmailAndPassword,
      setPersistence,
      updateProfile,
    } = await getFirebaseAuthClient();
    try {
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (username.trim()) {
        await updateProfile(cred.user, { displayName: username.trim() });
      }
      return mapFirebaseUser(auth.currentUser ?? cred.user);
    } catch (error) {
      throw normalizeFirebaseError(error);
    }
  },

  async login({ email, password, remember = true }) {
    await ensureConfigured();
    const { auth, browserLocalPersistence, browserSessionPersistence, setPersistence, signInWithEmailAndPassword } =
      await getFirebaseAuthClient();
    try {
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return mapFirebaseUser(cred.user);
    } catch (error) {
      throw normalizeFirebaseError(error);
    }
  },

  async loginWithGoogle(options) {
    await ensureConfigured();
    const { remember = true } = options || {};
    const {
      auth,
      browserLocalPersistence,
      browserSessionPersistence,
      deleteUser,
      getAdditionalUserInfo,
      GoogleAuthProvider,
      setPersistence,
      signInWithPopup,
      signOut,
    } = await getFirebaseAuthClient();
    try {
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth, provider);
      const isNewUser = getAdditionalUserInfo(cred)?.isNewUser ?? false;

      if (isNewUser) {
        try {
          // Prevent implicit account creation on "Login with Google" for unknown users.
          await deleteUser(cred.user);
        } catch {
          await signOut(auth);
        }
        throw new Error('No account exists for this Google email. Please register first.');
      }
      return mapFirebaseUser(cred.user);
    } catch (error) {
      throw normalizeFirebaseError(error);
    }
  },

  async registerWithGoogle(options) {
    await ensureConfigured();
    const { remember = true } = options || {};
    const {
      auth,
      browserLocalPersistence,
      browserSessionPersistence,
      getAdditionalUserInfo,
      GoogleAuthProvider,
      setPersistence,
      signInWithPopup,
      signOut,
    } = await getFirebaseAuthClient();
    try {
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth, provider);
      const isNewUser = getAdditionalUserInfo(cred)?.isNewUser ?? false;

      if (!isNewUser) {
        await signOut(auth);
        throw new Error('Account already exists for this Google email. Please login instead.');
      }
      return mapFirebaseUser(cred.user);
    } catch (error) {
      throw normalizeFirebaseError(error);
    }
  },

  async forgotPassword({ email }) {
    await ensureConfigured();
    const { auth, sendPasswordResetEmail } = await getFirebaseAuthClient();
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw normalizeFirebaseError(error);
    }
  },

  async deleteAccount() {
    await ensureConfigured();
    const { auth, deleteUser, signOut } = await getFirebaseAuthClient();
    if (!auth.currentUser) {
      throw new Error('No signed-in account found.');
    }
    try {
      await deleteUser(auth.currentUser);
      await signOut(auth);
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
