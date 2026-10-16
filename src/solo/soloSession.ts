import { doc, getDoc, getDocs, limit, query, collection, setDoc, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../firebase';
import { generateSanataniId, SanataniProfile } from './types';

/* soloSession — standalone (hook-free) Sanatani profile get-or-mint.
 * =====================================================================
 * Used by SoloContext.ensureProfile AND by the org Header's "My Space"
 * entry (where no SoloProvider is mounted). Single implementation of the
 * mint path so the SAN-XXXXXX spine is identical everywhere.
 */

export interface MintDetails {
  phone?: string;
  city?: string;
  gotra?: string;
  languages?: string[];
  homeRegion?: string;
}

export async function fetchSanataniProfile(uid: string): Promise<SanataniProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'sanataniProfiles', uid));
    if (!snap.exists()) return null;
    const profile = { id: snap.id, ...(snap.data() as any) } as SanataniProfile;
    // Gotra lives in the owner-only private subcollection (never public).
    // Merge it client-side so the profile shape is unchanged for callers.
    try {
      const priv = await getDoc(doc(db, 'sanataniProfiles', uid, 'private', 'self'));
      if (priv.exists()) {
        const g = (priv.data() as any).gotra;
        if (g) profile.gotra = g;
      }
    } catch {
      /* private doc unreadable offline — public profile still usable */
    }
    return profile;
  } catch {
    return null; // offline or denied — caller falls back to local mint
  }
}

/**
 * Provisional solo profile for session switching (org / purohit / jyotish
 * → Personal). Mirrors the org Header's "My Space" pattern: the
 * SoloProvider lazy-mints the real SAN-XXXXXX on mount (get-or-create,
 * never duplicates). Works for Firebase users and local demo sessions.
 */
export function provisionalSoloProfile(): SanataniProfile {
  return {
    id: 'SAN-PENDING',
    uid: '__pending__',
    displayName: '',
    languages: [],
    verificationTier: 'REGISTERED',
    roles: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  } as SanataniProfile;
}

/**
 * Get-or-create the Sanatani profile. Never duplicates: an existing profile
 * is returned as-is. Offline → mints locally, marked unsynced.
 */
export async function mintOrFetchSanataniProfile(
  uid: string,
  fallbackName = '',
  email = '',
  details: MintDetails = {}
): Promise<SanataniProfile> {
  const existing = await fetchSanataniProfile(uid);
  if (existing) return existing;

  const minted: SanataniProfile = {
    id: generateSanataniId(),
    uid,
    displayName: fallbackName,
    email: email || undefined,
    phone: details.phone || undefined,
    city: details.city || undefined,
    gotra: details.gotra || undefined,
    languages: details.languages || [],
    homeRegion: details.homeRegion || undefined,
    verificationTier: 'REGISTERED',
    roles: {},
    synced: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // Best-effort cloud mint with uniqueness loop on the SAN id.
  // P0 FIX: The uniqueness query and the Firestore write are now in SEPARATE
  // try blocks. Previously, if the uniqueness query threw (e.g., missing
  // composite index on sanataniProfiles.id), the setDoc was skipped entirely,
  // the profile was never persisted, and every login minted a fresh ID.
  let sanataniId = minted.id;
  try {
    for (let attempt = 0; attempt < 8; attempt++) {
      const candidate = generateSanataniId();
      const probe = await getDocs(
        query(collection(db, 'sanataniProfiles'), where('id', '==', candidate), limit(1))
      );
      if (probe.empty) {
        sanataniId = candidate;
        break;
      }
    }
  } catch {
    /* uniqueness probe unavailable (missing index / offline) — proceed with
       the generated ID; the doc-ID (Firebase UID) is already globally unique */
  }
  minted.id = sanataniId;

  // The write is ESSENTIAL for identity continuity — never skip it because
  // the uniqueness probe failed. Separate try/catch so write errors are
  // logged, not silently swallowed.
  try {
    // Gotra is sensitive: it NEVER goes in the public profile doc (public
    // read). It lives in the owner-only `private/self` subcollection.
    const { gotra, ...publicMint } = minted as any;
    await setDoc(doc(db, 'sanataniProfiles', uid), {
      ...publicMint,
      email: minted.email || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    if (gotra) {
      await setDoc(doc(db, 'sanataniProfiles', uid, 'private', 'self'), {
        gotra,
        updatedAt: serverTimestamp(),
      });
    }
    minted.synced = true;
  } catch (e) {
    console.warn('[soloSession] Failed to persist Sanatani profile to Firestore:', e);
    /* offline or denied — profile lives locally, syncs later */
  }
  return minted;
}
