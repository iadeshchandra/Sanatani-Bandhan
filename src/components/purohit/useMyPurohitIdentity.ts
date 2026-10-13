/**
 * useMyPurohitIdentity — lightweight purohit-identity lookup for ORG context.
 * =====================================================================
 * The PurohitProvider only mounts inside the purohit workspace. Components in
 * the org/devotee context (MySpaceModal, social feed) use this hook instead:
 * it queries the publicly-readable `purohits` collection by the current
 * Firebase uid. Returns null when the user has no purohit identity.
 */
import { useCallback, useEffect, useState } from 'react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { PurohitIdentity } from '../../types/purohit';

export const useMyPurohitIdentity = () => {
  const { firebaseUser } = useAuthWorkspace();
  const [identity, setIdentity] = useState<PurohitIdentity | null>(null);
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
        query(collection(db, 'purohits'), where('uid', '==', uid), limit(1))
      );
      const found = snap.empty
        ? null
        : ({ id: snap.docs[0].id, ...(snap.docs[0].data() as any) } as PurohitIdentity);
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
