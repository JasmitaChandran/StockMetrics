import type { FirebaseApp, FirebaseOptions } from 'firebase/app';
import type { Auth, User } from 'firebase/auth';

const REQUIRED_KEYS = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
] as const;

function getRequiredEnvValues() {
  return {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  } as const;
}

function getFirebaseConfig(): FirebaseOptions {
  const required = getRequiredEnvValues();
  const config = {
    apiKey: required.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: required.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: required.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: required.NEXT_PUBLIC_FIREBASE_APP_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || undefined,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || undefined,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined,
  } satisfies FirebaseOptions;

  const missing = REQUIRED_KEYS.filter((key) => !required[key]);
  if (missing.length) {
    throw new Error(
      `Firebase Auth is not configured. Missing: ${missing.join(', ')}. Set env vars and enable Google provider in Firebase Console.`,
    );
  }

  return config;
}

let cached: Promise<{
  app: FirebaseApp;
  auth: Auth;
  onAuthStateChanged: typeof import('firebase/auth')['onAuthStateChanged'];
  signOut: typeof import('firebase/auth')['signOut'];
  signInWithPopup: typeof import('firebase/auth')['signInWithPopup'];
  signInWithEmailAndPassword: typeof import('firebase/auth')['signInWithEmailAndPassword'];
  createUserWithEmailAndPassword: typeof import('firebase/auth')['createUserWithEmailAndPassword'];
  updateProfile: typeof import('firebase/auth')['updateProfile'];
  GoogleAuthProvider: typeof import('firebase/auth')['GoogleAuthProvider'];
}> | null = null;

export function isFirebaseAuthConfigured() {
  const required = getRequiredEnvValues();
  return REQUIRED_KEYS.every((key) => Boolean(required[key]));
}

export async function getFirebaseAuthClient() {
  if (typeof window === 'undefined') {
    throw new Error('Firebase Auth is only available in the browser.');
  }

  if (!cached) {
    cached = (async () => {
      const [{ initializeApp, getApps, getApp }, authMod] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
      ]);

      const config = getFirebaseConfig();
      const app = getApps().length ? getApp() : initializeApp(config);
      const auth = authMod.getAuth(app);
      await authMod.setPersistence(auth, authMod.browserLocalPersistence);
      auth.useDeviceLanguage();

      return {
        app,
        auth,
        onAuthStateChanged: authMod.onAuthStateChanged,
        signOut: authMod.signOut,
        signInWithPopup: authMod.signInWithPopup,
        signInWithEmailAndPassword: authMod.signInWithEmailAndPassword,
        createUserWithEmailAndPassword: authMod.createUserWithEmailAndPassword,
        updateProfile: authMod.updateProfile,
        GoogleAuthProvider: authMod.GoogleAuthProvider,
      };
    })();
  }

  return cached;
}

export function mapFirebaseUser(user: User) {
  const providerIds = user.providerData.map((p) => p.providerId);
  const provider = providerIds.includes('google.com') ? 'google' : 'firebase';
  return {
    id: user.uid,
    username: user.displayName || (user.email ? user.email.split('@')[0] : 'User'),
    email: user.email || undefined,
    provider: provider as 'google' | 'firebase',
    avatarUrl: user.photoURL || undefined,
    createdAt: user.metadata.creationTime ? new Date(user.metadata.creationTime).toISOString() : new Date().toISOString(),
  };
}
