/**
 * custodySyncFirestore.ts — the Firestore adapter for custody sync.
 * ============================================================================
 * Split from ./custodySync.ts (the pure policy) for one reason: the
 * custody store (src/cashcustody/cashCustodyStore.tsx) is imported by
 * many node-env test suites, and a static firebase import anywhere in
 * its graph breaks them all. So the policy module stays firebase-free
 * and THIS module — imported only by the Cash Custody desk component —
 * carries the getDoc/setDoc wiring, exactly like ./summaryStore.ts
 * carries it for workspaceSummaries.
 *
 * One document per workspace: `cashCustodyStates/{workspaceId}`.
 * Writes go through stripUndefinedDeep (the #45 funnel: Firestore is
 * initialised without ignoreUndefinedProperties). The sync engine
 * itself never throws — see custodySync.ts's fail-open law.
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { stripUndefinedDeep } from './firestoreDoc';
import {
  CUSTODY_STATES_COLLECTION,
  createCustodySync,
  type CustodyCloudDoc,
  type CustodySync,
  type CustodySyncStore,
} from './custodySync';

export const firestoreCustodySyncStore: CustodySyncStore = {
  async read(workspaceId: string): Promise<unknown | null> {
    const snap = await getDoc(doc(db, CUSTODY_STATES_COLLECTION, workspaceId));
    return snap.exists() ? snap.data() : null;
  },
  async write(workspaceId: string, docData: CustodyCloudDoc): Promise<void> {
    await setDoc(
      doc(db, CUSTODY_STATES_COLLECTION, workspaceId),
      stripUndefinedDeep({ ...docData })
    );
  },
};

/** The app-wide sync instance (Firestore-backed), injected by the desk. */
export const custodyCloudSync: CustodySync = createCustodySync(
  firestoreCustodySyncStore
);
