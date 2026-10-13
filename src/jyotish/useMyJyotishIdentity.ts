/**
 * useMyJyotishIdentity — lightweight jyotishi-identity lookup for ORG context.
 * =====================================================================
 * The JyotishProvider only mounts inside the jyotishi workspace. Components
 * in the org/devotee/solo context (JoinUpgrade, social feed) use this hook
 * instead: it queries the publicly-readable `jyotishProfiles` collection by
 * the current Firebase uid. Returns null when the user has no jyotishi
 * identity.
 */
import { useCallback, useEffect, useState } from 'react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { JyotishIdentity } from '../types/jyotish';

export const useMyJyotishIdentity = () => {
  const { firebaseUser } = useAuthWorkspace();
  const [identity, setIdentity] = useState<JyotishIdentity | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const uid = firebaseUser?.uid;
    if (!uid) {
      setIdentity(null);
      setLoading(false);
      return null;
    }
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, 'jyotishProfiles'), where('uid', '==', uid), limit(1))
      );
      const found = snap.empty
        ? null
        : ({ id: snap.docs[0].id, ...(snap.docs[0].data() as any) } as JyotishIdentity);
      setIdentity(found);
      return found;
    } catch {
      setIdentity(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [firebaseUser?.uid]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { identity, loading, refresh };
};
