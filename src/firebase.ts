/**
 * firebase.ts — P2 consolidation.
 *
 * This module is now a thin barrel over src/lib/firebase.ts, which owns the
 * single Firebase app/auth/firestore/storage initialization. Both modules
 * previously called initializeApp/initializeFirestore with identical settings
 * (guarded by getApps(), default database), producing the same instances —
 * this merge removes the duplicate init while keeping every existing
 * importer working unchanged.
 */
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updatePassword,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';

// Single source of truth — same instances as before (identical init settings).
export { app, auth, db, storage } from './lib/firebase';

export const googleProvider = new GoogleAuthProvider();

export {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  onAuthStateChanged,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
};

export type { FirebaseUser };

import { app } from './lib/firebase';
export default app;
