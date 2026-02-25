import { firebaseAuthAdapter } from './firebase-auth';
import { isFirebaseAuthConfigured } from './firebase-client';
import { localAuthAdapter } from './local-auth';

export function getAuthAdapter() {
  const enabled =
    process.env.NEXT_PUBLIC_ENABLE_FIREBASE_AUTH === 'true' ||
    (process.env.NEXT_PUBLIC_ENABLE_FIREBASE_AUTH !== 'false' && isFirebaseAuthConfigured());
  return enabled ? firebaseAuthAdapter : localAuthAdapter;
}
