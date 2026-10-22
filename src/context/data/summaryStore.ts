/**
 * summaryStore.ts — Firestore adapter for the workspaceSummaries
 * writer (policy lives in ./summaryWriter.ts, doc shape in
 * src/lib/treasuryAggregates.ts).
 *
 * Writes use the data layer's own mechanism: a direct `setDoc` on the
 * persistence-enabled Firestore client (multi-tab IndexedDB
 * persistence queues it offline, exactly like every other DataContext
 * write), payload funnelled through stripUndefinedDeep (QUEUED #45
 * law), failures caught by the maintainer — never thrown into a
 * treasury mutation.
 *
 * Rules contract (firestore.rules, landed 3e813297): the doc lives at
 * workspaceSummaries/{workspaceId}, carries `workspaceId` equal to the
 * path id, is written only by finance roles of that workspace, and is
 * NEVER deleted. This adapter therefore does a full-doc setDoc (no
 * merge — the aggregates are replaced wholesale, so a stale key from
 * an older computation can never survive) and exposes no delete.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { AggregatableTx } from '../../lib/treasuryAggregates';
import { stripUndefinedDeep } from './firestoreDoc';
import {
  WorkspaceSummaryMaintainer,
  lifetimeGivingFromSummary,
  type SummaryStore,
  type WorkspaceSummaryDoc,
} from './summaryWriter';

export const firestoreSummaryStore: SummaryStore = {
  async readSummary(workspaceId: string): Promise<WorkspaceSummaryDoc | null> {
    const snap = await getDoc(doc(db, 'workspaceSummaries', workspaceId));
    if (!snap.exists()) return null;
    return snap.data() as WorkspaceSummaryDoc;
  },

  async writeSummary(summary: WorkspaceSummaryDoc): Promise<void> {
    await setDoc(
      doc(db, 'workspaceSummaries', summary.workspaceId),
      stripUndefinedDeep({ ...summary })
    );
  },
};

/**
 * The session-wide maintainer singleton. DataContext reports treasury
 * commits and workspace opens to it; it owns the delta-base cache and
 * the write coalescing.
 */
export const workspaceSummaryMaintainer = new WorkspaceSummaryMaintainer(
  firestoreSummaryStore
);

/**
 * One-time FULL treasury read for a workspace — used only by the
 * first-open backfill of a WINDOWED workspace (whose in-memory set is
 * just a page) and by dirty recomputes. Never called per mutation.
 */
export async function fetchFullTreasurySet(
  workspaceId: string
): Promise<AggregatableTx[]> {
  const snap = await getDocs(
    query(collection(db, 'treasury'), where('workspaceId', '==', workspaceId))
  );
  const rows: AggregatableTx[] = [];
  snap.forEach((d) => rows.push(d.data() as AggregatableTx));
  return rows;
}

/**
 * Per-devotee lifetime giving, read from the maintained summary
 * (treasury.byDevoteeIncome). Returns 0 when no summary exists yet,
 * when the read is not permitted for this caller, or when the devotee
 * has no recorded giving — never an invented figure. (The consumer
 * this serves, PersonalizedReminderService, previously summed the
 * treasury collection by `devoteeId` — a field the desk write paths
 * overwhelmingly never stamp, so lifetime giving read ~0 forever.)
 */
export async function readDevoteeLifetimeGiving(
  workspaceId: string,
  devoteeId: string,
  devoteeName?: string | null
): Promise<number> {
  if (!workspaceId || !devoteeId) return 0;
  try {
    const summary = await firestoreSummaryStore.readSummary(workspaceId);
    return lifetimeGivingFromSummary(summary, devoteeId, devoteeName);
  } catch (err) {
    console.warn(
      '[workspaceSummaries] lifetime giving read failed; reporting 0:',
      (err as any)?.message || err
    );
    return 0;
  }
}
