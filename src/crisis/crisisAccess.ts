/**
 * Crisis Command — fail-closed RBAC.
 * =========================================================================
 * Ladder:
 *   trustee     — checkPermission(['SuperAdmin','Trustee'])            → everything
 *   coordinator — crisisCoordinators/{orgId}_{uid} edge doc exists     → ack, assign,
 *                 escalate, broadcast, resolve (NOT manage coordinators)
 *   sevadar     — checkPermission(['Sevadar'])                         → acknowledge +
 *                 mark arrived (responses subcollection), nothing else
 *   locked      — everyone else sees the locked screen
 *
 * Default state is loading (never locked) so a slow auth/session restore
 * can never flash the locked screen to an authorised user.
 */
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import type { CrisisAccess, CrisisAccessLevel } from './crisisCommandTypes';

function buildAccess(level: CrisisAccessLevel, loading: boolean): CrisisAccess {
  return {
    level,
    loading,
    canView: level !== 'locked',
    canAcknowledge: level === 'trustee' || level === 'coordinator' || level === 'sevadar',
    canRespond: level !== 'locked',
    canAssign: level === 'trustee' || level === 'coordinator',
    canEscalate: level === 'trustee' || level === 'coordinator',
    canBroadcast: level === 'trustee' || level === 'coordinator',
    canResolve: level === 'trustee' || level === 'coordinator',
    canManageCoordinators: level === 'trustee',
  };
}

export function useCrisisAccess(orgId: string | undefined): CrisisAccess {
  const { firebaseUser, currentUser, checkPermission, isAuthenticated } =
    useAuthWorkspace();
  const [coordinator, setCoordinator] = useState<boolean | null>(null);

  const uid = firebaseUser?.uid || currentUser?.id || '';

  useEffect(() => {
    if (!orgId || !uid) {
      setCoordinator(null);
      return;
    }
    let cancelled = false;
    getDoc(doc(db, 'crisisCoordinators', `${orgId}_${uid}`))
      .then((snap) => {
        if (!cancelled) setCoordinator(snap.exists());
      })
      .catch(() => {
        // Fail closed: on read error treat as NOT a coordinator.
        if (!cancelled) setCoordinator(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orgId, uid]);

  if (!isAuthenticated || !orgId || !uid) {
    return buildAccess('locked', true);
  }
  if (coordinator === null) {
    return buildAccess('locked', true);
  }
  if (checkPermission(['SuperAdmin', 'Trustee'])) {
    return buildAccess('trustee', false);
  }
  if (coordinator) {
    return buildAccess('coordinator', false);
  }
  if (checkPermission(['Sevadar'])) {
    return buildAccess('sevadar', false);
  }
  return buildAccess('locked', false);
}

/** Deterministic edge-doc id: crisisCoordinators/{orgId}_{uid} */
export function coordinatorDocId(orgId: string, uid: string): string {
  return `${orgId}_${uid}`;
}
