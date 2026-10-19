/**
 * qrIntel/qrIntelService.ts — Firestore layer for QR Intelligence Phase 1.
 * ============================================================================
 * DESIGN LAWS:
 * - Fire-and-forget, fail-open: logQrScan NEVER throws. A broken analytics
 *   write must never break the scan flow or the payment flow.
 * - $0: one tiny event write + one stats transaction per scan. The dashboard
 *   reads AGGREGATES (qrScanStats), never the raw event stream.
 * - Privacy: only the scanner HASH leaves the device. The raw uid is hashed
 *   in memory and never written anywhere.
 */
import {
  collection,
  doc,
  addDoc,
  runTransaction,
  getDocs,
  query,
  where,
  limit,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  buildScanEvent,
  hashScanner,
  initialScanStats,
  applyScanToStats,
  isValidQrType,
  type QrType,
  type ScanOutcome,
  type QrScanStats,
  type QrScanEvent,
} from './qrIntel';

export interface LogQrScanInput {
  qrId: string;
  qrType: QrType;
  /** Raw uid — hashed in memory, never stored. */
  uid: string;
  outcome: ScanOutcome;
  amount?: number;
  currency?: string;
  /** Who owns this QR (for the owner dashboard). Only set when known. */
  receiverId?: string;
}

/**
 * Log a QR scan event + update aggregates. NEVER throws — wraps everything
 * in try/catch so the scan/payment flow is unaffected by analytics failures.
 */
export async function logQrScan(input: LogQrScanInput): Promise<void> {
  try {
    await logQrScanInner(input);
  } catch {
    /* fail-open: analytics must never break the user flow */
  }
}

async function logQrScanInner(input: LogQrScanInput): Promise<void> {
  if (!isValidQrType(input.qrType)) return;
  if (!input.uid || !input.qrId) return;
  const scannerHash = await hashScanner(input.uid);
  const event = buildScanEvent({
    qrId: input.qrId,
    qrType: input.qrType,
    scannerHash,
    outcome: input.outcome,
    amount: input.amount,
    currency: input.currency,
  });

  // 1. Append the event (append-only collection).
  const eventRef = await addDoc(collection(db, 'qrScanEvents'), {
    ...event,
  });

  // 2. Fold into aggregates transactionally.
  const statsRef = doc(db, 'qrScanStats', event.qrId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(statsRef);
    const base: QrScanStats = snap.exists()
      ? (snap.data() as QrScanStats)
      : initialScanStats(event.qrId, event.qrType);
    // Backfill receiverId when we learn it (first writer wins).
    const withOwner: QrScanStats =
      !base.receiverId && input.receiverId
        ? { ...base, receiverId: input.receiverId }
        : base;
    const next = applyScanToStats(withOwner, event);
    tx.set(statsRef, next);
  });

  void eventRef;
}

/**
 * Owner dashboard read: all QR stats (bounded). Follows the
 * marketplaceDashboard pattern — bounded query, client-side ranking.
 */
export async function fetchQrScanStats(maxDocs = 500): Promise<QrScanStats[]> {
  const snap = await getDocs(
    query(collection(db, 'qrScanStats'), orderBy('totalScans', 'desc'), limit(maxDocs)),
  );
  return snap.docs.map((d) => ({ ...(d.data() as QrScanStats), qrId: d.id }));
}

/**
 * Owner dashboard read: recent scan events for the time-trend chart.
 * Bounded; the dashboard aggregates client-side into per-day buckets.
 */
export async function fetchRecentScanEvents(maxDocs = 2000): Promise<QrScanEvent[]> {
  const snap = await getDocs(
    query(collection(db, 'qrScanEvents'), orderBy('scannedAt', 'desc'), limit(maxDocs)),
  );
  return snap.docs.map((d) => d.data() as QrScanEvent);
}

/**
 * Owner dashboard read: stats for QRs of one receiver (e.g. "show me all QRs
 * belonging to this provider"). Single-field query — no composite index needed.
 */
export async function fetchQrStatsForReceiver(
  receiverId: string,
  maxDocs = 200,
): Promise<QrScanStats[]> {
  const snap = await getDocs(
    query(
      collection(db, 'qrScanStats'),
      where('receiverId', '==', receiverId),
      limit(maxDocs),
    ),
  );
  return snap.docs.map((d) => ({ ...(d.data() as QrScanStats), qrId: d.id }));
}
