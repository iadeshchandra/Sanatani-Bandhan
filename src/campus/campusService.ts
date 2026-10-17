/**
 * campus/campusService.ts — Firestore CRUD for temple campus maps.
 * =================================================================
 * Collection: campusMaps/{orgId}
 *   read:  public (a temple map is public information)
 *   write: org admin only — trustee / superadmin of that workspace
 *          (rules-gated; client also checks via useAuthWorkspace role)
 *
 * Phase 1: builder + visitor view only. The data model already carries
 * stable zone ids for Phase 2 (QR check-ins) and Phase 3 (Tirtha Diary).
 */
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { CampusMap } from './types';

const COL = 'campusMaps';

export async function getCampusMap(orgId: string): Promise<CampusMap | null> {
  const snap = await getDoc(doc(db, COL, orgId));
  if (!snap.exists()) return null;
  return snap.data() as CampusMap;
}

export function subscribeToCampusMap(orgId: string, onMap: (m: CampusMap | null) => void): Unsubscribe {
  return onSnapshot(
    doc(db, COL, orgId),
    (snap) => onMap(snap.exists() ? (snap.data() as CampusMap) : null),
    () => onMap(null),
  );
}

export async function saveCampusMap(map: CampusMap, uid: string): Promise<void> {
  await setDoc(
    doc(db, COL, map.orgId),
    { ...map, updatedAt: Date.now(), updatedBy: uid, serverAt: serverTimestamp() },
    { merge: false },
  );
}
