/**
 * publishedAccountsStore.ts — Firestore adapter for published
 * monthly accounts (pure snapshot math in src/lib/publishedAccounts.ts).
 *
 * Rules contract (prepared with this batch, owner-approved flow):
 * publishedAccounts — read PUBLIC (a document exists only because a
 * trustee published it; unpublished months have no document at all);
 * create/update/delete by finance roles of the workspace with the
 * wsImmutable-style guard on update. Unpublish IS delete: the public
 * board must stop showing the month the moment a trustee withdraws
 * it, and the audit stream retains the publish/unpublish events.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { PublishedAccountsDoc } from '../../lib/publishedAccounts';
import { stripUndefinedDeep } from './firestoreDoc';

const COLLECTION = 'publishedAccounts';

/** Create or replace the month's snapshot (republish = fresh
 *  computation, new publishedAt; the doc id is workspaceId_month). */
export async function publishSnapshot(snapshot: PublishedAccountsDoc): Promise<void> {
  await setDoc(
    doc(db, COLLECTION, snapshot.id),
    stripUndefinedDeep({ ...snapshot })
  );
}

/** Withdraw a month's snapshot from the public board. */
export async function unpublishSnapshot(workspaceId: string, month: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, `${workspaceId}_${month}`));
}

/** All published snapshots of one workspace, newest month first.
 *  Equality-only query (no composite index needed); sorted
 *  client-side. Used by the public board and the publish panel. */
export async function fetchPublishedAccounts(
  workspaceId: string
): Promise<PublishedAccountsDoc[]> {
  const snap = await getDocs(
    query(collection(db, COLLECTION), where('workspaceId', '==', workspaceId))
  );
  const docs: PublishedAccountsDoc[] = [];
  snap.forEach((d) => docs.push({ ...(d.data() as PublishedAccountsDoc), id: d.id }));
  docs.sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : 0));
  return docs;
}
