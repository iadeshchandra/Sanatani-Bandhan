import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { db } from '../lib/firebase';
import config from '../../firebase-applet-config.json';

// Initialize Firebase configuration with standard Vite environment variables and fallback
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || (config as Record<string, string>).apiKey || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || (config as Record<string, string>).authDomain || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || (config as Record<string, string>).projectId || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || (config as Record<string, string>).storageBucket || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || (config as Record<string, string>).messagingSenderId || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || (config as Record<string, string>).appId || '',
};

// Initialize or retrieve Firebase App instance
export const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize and export the auth (FirebaseAuth) and db (Firestore) instances
export const auth: Auth = getAuth(app);
export { db };

// Proactively ensure anonymous authentication session for sandboxed & demo access
if (typeof window !== 'undefined') {
  auth.onAuthStateChanged((user) => {
    if (!user) {
      import('firebase/auth').then(({ signInAnonymously }) => {
        signInAnonymously(auth).catch(() => {
          // Graceful fallback in offline or sandboxed mode
        });
      });
    }
  });
}

export default app;
