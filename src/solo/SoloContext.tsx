import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { SanataniProfile } from './types';
import { mintOrFetchSanataniProfile, provisionalSoloProfile, MintDetails } from './soloSession';

/* SoloContext — the Universal Sanatani ID spine.
 * =====================================================================
 * Every signup mints ONE permanent person-scoped identity (SAN-XXXXXX),
 * stored at `sanataniProfiles/{uid}`. Organisation memberships,
 * PUR-XXXXXX and JYO-XXXXXX identities attach to it — never a second
 * account. Offline-resilient: mints locally first (marked unsynced) and
 * syncs to Firestore best-effort, mirroring the honest offline labels
 * used across the One suites.
 */

interface MintData {
  uid: string;
  email?: string;
  displayName: string;
  phone?: string;
  city?: string;
  gotra?: string;
  languages?: string[];
  homeRegion?: string;
}

interface SoloContextType {
  profile: SanataniProfile | null;
  loading: boolean;
  /** Get-or-create: returns the existing profile or mints a fresh SAN id. */
  ensureProfile: (
    uid: string,
    fallbackName?: string,
    email?: string,
    details?: MintDetails
  ) => Promise<SanataniProfile>;
  updateProfile: (patch: Partial<SanataniProfile>) => Promise<void>;
  /** Attach a role identity (PUR-XXXXXX / JYO-XXXXXX) to this Sanatani ID. */
  attachRole: (kind: 'purohit' | 'jyotish', roleId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<SoloContextType | null>(null);

const now = () => Date.now();

export const SoloProvider: React.FC<{ uid: string | null; children: React.ReactNode }> = ({ uid, children }) => {
  const [profile, setProfile] = useState<SanataniProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    // P0 FIX: Never mint a SAN ID for anonymous sessions. The 'anon' fallback
    // uid would fail Firestore rules on every write, causing a fresh ID on
    // every render. Anonymous users get a provisional profile with no SAN ID.
    if (!uid || uid === 'anon') {
      setProfile(provisionalSoloProfile());
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Lazy mint: pre-existing accounts get their permanent SAN-XXXXXX the
      // first time they visit My Space. Get-or-create never duplicates.
      const prof = await mintOrFetchSanataniProfile(uid);
      setProfile(prof);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const ensureProfile = useCallback(
    async (forUid: string, fallbackName = '', email = '', details: MintDetails = {}): Promise<SanataniProfile> => {
      const minted = await mintOrFetchSanataniProfile(forUid, fallbackName, email, details);
      setProfile(minted);
      return minted;
    },
    []
  );

  const updateProfile = useCallback(
    async (patch: Partial<SanataniProfile>) => {
      if (!uid || !profile) return;
      // Privilege fields are never client-writable (rules enforce too).
      const { id, verificationTier, roles, synced, createdAt, gotra, ...safe } = patch as any;
      const next = { ...profile, ...safe, ...(gotra !== undefined ? { gotra } : {}), updatedAt: now() };
      setProfile(next);
      try {
        // Public doc: everything except gotra (sensitive → private subcollection).
        await setDoc(
          doc(db, 'sanataniProfiles', uid),
          { ...safe, updatedAt: serverTimestamp() },
          { merge: true }
        );
        // Gotra lives owner-only at sanataniProfiles/{uid}/private/self.
        if (gotra !== undefined) {
          await setDoc(
            doc(db, 'sanataniProfiles', uid, 'private', 'self'),
            { gotra, updatedAt: serverTimestamp() },
            { merge: true }
          );
        }
        setProfile((p) => (p ? { ...p, synced: true } : p));
      } catch {
        /* offline — local copy is authoritative for the session */
      }
    },
    [uid, profile]
  );

  const attachRole = useCallback(
    async (kind: 'purohit' | 'jyotish', roleId: string) => {
      if (!uid || !profile) return;
      const roles = { ...profile.roles, [kind === 'purohit' ? 'purohitId' : 'jyotishId']: roleId };
      const next = { ...profile, roles, updatedAt: now() };
      setProfile(next);
      try {
        await setDoc(doc(db, 'sanataniProfiles', uid), { roles, updatedAt: serverTimestamp() }, { merge: true });
      } catch {
        /* offline — local copy keeps the attachment */
      }
    },
    [uid, profile]
  );

  const value = useMemo(
    () => ({ profile, loading, ensureProfile, updateProfile, attachRole, refresh }),
    [profile, loading, ensureProfile, updateProfile, attachRole, refresh]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSolo = (): SoloContextType => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSolo must be used inside SoloProvider');
  return ctx;
};
