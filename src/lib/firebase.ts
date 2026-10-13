import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, initializeFirestore , enableMultiTabIndexedDbPersistence, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import config from "../../firebase-applet-config.json";

const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId
};

// Initialize Firebase
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Initialize Firestore with specific database ID if provided and not (default).
// Long-polling is forced for production (restrictive networks) but disabled
// for the local emulator, which handles the standard WebChannel transport.
const useEmulator = import.meta.env.VITE_FIREBASE_EMULATOR === '1';
const fsSettings = useEmulator ? {} : { experimentalForceLongPolling: true };
const dbId = config.firestoreDatabaseId;
export const db = (dbId && dbId !== "(default)") 
  ? initializeFirestore(app, fsSettings as any, dbId) 
  : initializeFirestore(app, fsSettings as any);

// Local E2E / dev testing: point Auth + Firestore at the Firebase emulators.
// Build-time flag only (`VITE_FIREBASE_EMULATOR=1 npm run build`); unset in
// production builds, so this is a no-op for real deployments.
if (import.meta.env.VITE_FIREBASE_EMULATOR === '1') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8081);
  console.info('[firebase] using local emulators (auth :9099, firestore :8081)');
}
// Enable offline persistence
enableMultiTabIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a a time.');
  } else if (err.code === 'unimplemented') {
    console.warn('The current browser does not support all of the features required to enable persistence');
  }
});


export const storage = getStorage(app);
