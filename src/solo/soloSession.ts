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

/* ------------------------------------------------------------------ */
/* P0 FIX: Identity continuity hardening (2026-10-16)                  */
/* ------------------------------------------------------------------ */
/* Three layers prevent SAN-XXXXXX churn:                              */
/* 1. Concurrency guard: in-flight mints are shared, never duplicated. */
/* 2. localStorage cache: a minted-but-unsynced profile is reused      */
/*    across reloads instead of minting fresh.                         */
/* 3. Never mint for 'anon': anonymous sessions get a provisional      */
/*    profile with no SAN ID (Firestore rules would deny the write).   */

// In-flight mint promises by uid — StrictMode double-effects and rapid
// remounts share the same promise instead of minting twice.
const inflightMints = new Map<string, Promise<SanataniProfile>>();

const cacheKey = (uid: string) => `sanatani_profile_${uid}`;

function readCachedProfile(uid: string): SanataniProfile | null {
  try {
    const raw = localStorage.getItem(cacheKey(uid));
    if (!raw) return null;
    const p = JSON.parse(raw) as SanataniProfile;
    if (p?.uid === uid && typeof p?.id === 'string' && p.id.startsWith('SAN-')) {
      return p;
    }
    return null;
  } catch {
    return null;
  }
}

function writeCachedProfile(uid: string, profile: SanataniProfile): void {
  try {
    localStorage.setItem(cacheKey(uid), JSON.stringify(profile));
  } catch {
    /* storage unavailable — non-fatal */
  }
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
 *
 * P0 hardening: concurrent calls for the same uid share one promise;
 * a locally-cached profile is reused if Firestore is unreachable;
 * 'anon' uids never mint (they would fail Firestore rules).
 */
export async function mintOrFetchSanataniProfile(
  uid: string,
  fallbackName = '',
  email = '',
  details: MintDetails = {}
): Promise<SanataniProfile> {
  // Anonymous sessions never get a real SAN ID.
  if (!uid || uid === 'anon') {
    return provisionalSoloProfile();
  }

  // Concurrency guard: share in-flight mint.
  const inflight = inflightMints.get(uid);
  if (inflight) return inflight;

  const promise = (async (): Promise<SanataniProfile> => {
    // 1. Firestore is the source of truth.
    const existing = await fetchSanataniProfile(uid);
    if (existing) {
      // FIX (2026-10-17): Backfill display name. SoloContext.refresh() mints
      // the profile on mount with no name; the signup form then calls
      // ensureProfile with the user's name, but the existing profile was
      // returned as-is, leaving the name permanently empty. If we have a
      // name now and the stored profile doesn't, update it.
      const trimmedFallback = (fallbackName || '').trim();
      if (trimmedFallback && !existing.displayName?.trim()) {
        const updated = { ...existing, displayName: trimmedFallback, updatedAt: Date.now() };
        writeCachedProfile(uid, updated);
        try {
          await setDoc(
            doc(db, 'sanataniProfiles', uid),
            { displayName: trimmedFallback, updatedAt: serverTimestamp() },
            { merge: true }
          );
          updated.synced = true;
          writeCachedProfile(uid, updated);
        } catch {
          /* offline — cached copy carries the name for this session */
        }
        return updated;
      }
      writeCachedProfile(uid, existing);
      return existing;
    }

    // 2. No Firestore doc — reuse a locally cached profile if we minted
    //    one before (e.g. the earlier write failed). This prevents ID
    //    churn across reloads when Firestore is unreachable.
    const cached = readCachedProfile(uid);
    if (cached) {
      // FIX (2026-10-17): Backfill display name on the cached copy too.
      const trimmedFallback = (fallbackName || '').trim();
      if (trimmedFallback && !cached.displayName?.trim()) {
        cached.displayName = trimmedFallback;
        cached.updatedAt = Date.now();
      }
      // Best-effort: try to persist the cached profile now.
      try {
        const { gotra: _g, ...publicCached } = cached as any;
        await setDoc(doc(db, 'sanataniProfiles', uid), {
          ...publicCached,
          updatedAt: serverTimestamp(),
        });
        cached.synced = true;
        writeCachedProfile(uid, cached);
      } catch {
        /* still offline — keep using the cached ID */
      }
      return cached;
    }

    // 3. Truly new — mint fresh.
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
      /* uniqueness probe unavailable — the doc-ID (Firebase UID) is already globally unique */
    }
    minted.id = sanataniId;

    // Cache locally FIRST so even if the Firestore write fails, reloads
    // reuse this ID instead of minting fresh.
    writeCachedProfile(uid, minted);

    // The write is ESSENTIAL for identity continuity.
    try {
      // Gotra is sensitive: it NEVER goes in the public profile doc.
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
      writeCachedProfile(uid, minted);
    } catch (e: any) {
      // Visible error logging with Firestore error code — not just warn.
      console.error('[soloSession] Firestore setDoc FAILED:', {
        code: e?.code || 'unknown',
        message: e?.message || String(e),
        uid,
        docPath: `sanataniProfiles/${uid}`,
      });
      /* offline or denied — localStorage cache keeps the ID stable */
    }
    return minted;
  })();

  inflightMints.set(uid, promise);
  try {
    return await promise;
  } finally {
    inflightMints.delete(uid);
  }
}
