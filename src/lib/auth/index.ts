import { firebaseAuthAdapter } from './firebase-auth';
import { localAuthAdapter } from './local-auth';

export function getAuthAdapter() {
  const enabled = process.env.NEXT_PUBLIC_ENABLE_FIREBASE_AUTH === 'true';
  return enabled ? firebaseAuthAdapter : localAuthAdapter;
}
