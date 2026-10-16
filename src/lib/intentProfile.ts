/**
 * intentProfile.ts — Onboarding intent, stored per user
 * ======================================================
 * After signup the app asks 3 questions ("What brings you here?").
 * Answers land here as `users/{uid}.intentProfile` and steer the
 * Suchana engine's prioritization. Skippable, non-blocking, and the
 * user can change it later from Profile.
 */
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export type IntentKey = 'practice' | 'join' | 'purohit' | 'manage' | 'unknown';

export interface IntentProfile {
  intent: IntentKey;
  answeredAt: number;
  /** True when the user skipped the flow. */
  skipped: boolean;
}

const LOCAL_KEY = (uid: string) => `sb_intent_${uid}`;

export function readLocalIntent(uid: string): IntentProfile | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY(uid));
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || typeof p.intent !== 'string') return null;
    return p as IntentProfile;
  } catch {
    return null;
  }
}

function writeLocalIntent(uid: string, p: IntentProfile): void {
  try {
    localStorage.setItem(LOCAL_KEY(uid), JSON.stringify(p));
  } catch {
    /* storage full/blocked — non-fatal */
  }
}

/** Load intent: local cache first, Firestore as source of truth. */
export async function loadIntentProfile(uid: string): Promise<IntentProfile | null> {
  if (!uid || uid === 'anon') return null;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    const remote = (snap.exists() && (snap.data() as any).intentProfile) || null;
    if (remote && remote.intent) {
      writeLocalIntent(uid, remote);
      return remote as IntentProfile;
    }
  } catch {
    /* offline — fall through to local */
  }
  return readLocalIntent(uid);
}

/** Save intent to Firestore (merge) + local cache. Never throws. */
export async function saveIntentProfile(
  uid: string,
  intent: IntentKey,
  skipped = false
): Promise<IntentProfile | null> {
  if (!uid || uid === 'anon') return null;
  const profile: IntentProfile = { intent, answeredAt: Date.now(), skipped };
  writeLocalIntent(uid, profile);
  try {
    await setDoc(doc(db, 'users', uid), { intentProfile: profile }, { merge: true });
  } catch {
    /* offline — local copy is authoritative for the session */
  }
  return profile;
}

/** True when the user has completed or skipped onboarding. */
export async function hasOnboarded(uid: string): Promise<boolean> {
  const p = await loadIntentProfile(uid);
  return !!p;
}
