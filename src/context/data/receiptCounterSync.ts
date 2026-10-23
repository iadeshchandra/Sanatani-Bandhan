/**
 * receiptCounterSync.ts — SECURITY P1 (Finding 5): the Firestore
 * adapter for server-anchored receipt sequences.
 * ============================================================================
 * Split from the pure number law (utils/receiptNumbers.ts) for the
 * usual reason: this module carries the firebase imports, and it is
 * imported only by surfaces already in the firebase graph (DataContext,
 * the POS desks). Mirrors the custodySyncFirestore adapter pattern.
 *
 * THE MODEL — one counter doc per workspace + series + year:
 *   receiptCounters/{workspaceId}_{series}_{year}  { workspaceId,
 *   series, year, seq, updatedAt }
 * firestore.rules: finance roles of that workspace may create/read;
 * updates may only move `seq` FORWARD; delete never. Because a claim
 * runs inside a Firestore transaction (which re-reads the doc and
 * retries on contention), two devices can never be handed the same
 * official number — the failure the old local-max minting allowed.
 *
 * EVERY function here is fail-open: any error (offline, denied,
 * contention exhaustion) resolves to null / no-op and the caller falls
 * back to its honest degraded path (a marked PROVISIONAL number, or
 * today's local estimate for internal ledger rows). Receipts must
 * never block a donation at the counter.
 */

import { doc, getDoc, runTransaction, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { receiptCounterDocId } from '../../utils/receiptNumbers';

export const RECEIPT_COUNTERS_COLLECTION = 'receiptCounters';

export type ReceiptSeries = 'SB-80G' | 'SB-CHANDA';

function counterRef(workspaceId: string, series: ReceiptSeries, year: number) {
  return doc(db, RECEIPT_COUNTERS_COLLECTION, receiptCounterDocId(workspaceId, series, year));
}

function counterData(workspaceId: string, series: ReceiptSeries, year: number, seq: number) {
  return { workspaceId, series, year, seq, updatedAt: Date.now() };
}

/**
 * Ensure the counter doc exists, seeded at the highest seq the caller
 * already knows was issued (the server prefetch maximum). Returns the
 * counter's current seq, or null on any failure. Create-only seeding:
 * an existing counter is never lowered by this call.
 */
export async function ensureReceiptCounter(
  workspaceId: string,
  series: ReceiptSeries,
  year: number,
  seedFloor: number
): Promise<number | null> {
  try {
    const ref = counterRef(workspaceId, series, year);
    const snap = await getDoc(ref);
    if (snap.exists()) return Number(snap.data().seq || 0);
    const seed = Math.max(0, Math.floor(seedFloor) || 0);
    await setDoc(ref, counterData(workspaceId, series, year, seed));
    return seed;
  } catch {
    return null;
  }
}

/**
 * Claim the next official sequence number, transactionally. The claim
 * never returns a number at or below the counter or the caller's
 * known-issued floor. Returns null when offline / denied / failed —
 * the caller then issues a marked PROVISIONAL number instead of
 * guessing at the official series.
 */
export async function claimNextReceiptSeq(
  workspaceId: string,
  series: ReceiptSeries,
  year: number,
  knownIssuedFloor: number
): Promise<number | null> {
  try {
    const ref = counterRef(workspaceId, series, year);
    return await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const current = snap.exists() ? Number(snap.data().seq || 0) : 0;
      const next = Math.max(current, Math.max(0, Math.floor(knownIssuedFloor) || 0)) + 1;
      if (snap.exists()) tx.update(ref, counterData(workspaceId, series, year, next));
      else tx.set(ref, counterData(workspaceId, series, year, next));
      return next;
    });
  } catch {
    return null;
  }
}

/**
 * Raise the counter to at least `seq` after a locally-derived number
 * was issued (DataContext's auto-assignment path). Fire-and-forget:
 * keeps the shared floor truthful for the next device without ever
 * blocking or failing the ledger write that triggered it.
 */
export async function advanceReceiptCounter(
  workspaceId: string,
  series: ReceiptSeries,
  year: number,
  seq: number
): Promise<void> {
  try {
    const ref = counterRef(workspaceId, series, year);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const current = snap.exists() ? Number(snap.data().seq || 0) : 0;
      if (seq <= current) return;
      if (snap.exists()) tx.update(ref, counterData(workspaceId, series, year, seq));
      else tx.set(ref, counterData(workspaceId, series, year, seq));
    });
  } catch {
    /* fail-open by design */
  }
}
