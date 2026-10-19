/**
 * qrIntel/qrIntel.ts — QR Intelligence Phase 1: aggregate scan analytics.
 * ============================================================================
 * PRIVACY LAW (aggregate-first, always):
 * - The raw user uid is NEVER stored. Only SHA-256(uid + salt) — consistent
 *   for unique counting, not reversible to an identity from the dashboard.
 * - Phase 1 shows AGGREGATES only. No per-user browsing. The per-user
 *   Integrity Radar (Phase 2) is threshold-gated, never browsable.
 * - The salt is a fixed app constant: the hash is for de-identification in
 *   analytics, not a security boundary. Documented, not hidden.
 *
 * SCOPE (honest):
 * - Phase 1 instruments IN-APP payment-QR scans only. Today that is exactly
 *   one scan point: P2PScanSheet (SB-P2P codes). Provider UPI/QRs and donation
 *   QRs are scanned by EXTERNAL banking apps — we cannot see those scans and
 *   we do not pretend to.
 * - qrType is extensible ('p2p' today) so future in-app scan points plug in
 *   without a schema change.
 *
 * This module is pure and jest-safe (no firebase imports). All Firestore
 * writes live in qrIntelService.ts. Follows the repo's established pattern
 * (providerAnalytics.ts, revenueMetrics.ts, moderationPure.ts).
 */

/** QR families we track. 'p2p' = SB-P2P payment request codes. */
export const QR_TYPES = ['p2p'] as const;
export type QrType = (typeof QR_TYPES)[number];

/**
 * Scan outcomes. Logged at scan time: parsed | invalid | expired.
 * Logged at payment time (via p2pService hooks): payment_completed | payment_failed.
 * Together they form the funnel: scans -> payments.
 */
export const SCAN_OUTCOMES = [
  'parsed',
  'invalid',
  'expired',
  'payment_completed',
  'payment_failed',
] as const;
export type ScanOutcome = (typeof SCAN_OUTCOMES)[number];

/** Fixed salt for scanner hashing. De-identification, not a security boundary. */
export const QR_INTEL_SALT = 'sanatani-bandhan-qr-intel-v1';

/** Cap on stored scanner hashes per QR — bounds document growth. */
export const MAX_SCANNER_HASHES = 1000;

/** Special qrId for scans that failed format parsing (no requestId to key on). */
export const UNKNOWN_QR_ID = 'unknown';

/** Exact field set for qrScanEvents docs (mirrors the firestore.rules whitelist). */
export const SCAN_EVENT_KEYS = [
  'qrId',
  'qrType',
  'scannerHash',
  'outcome',
  'scannedAt',
  'amount',
  'currency',
] as const;

/** Exact field set for qrScanStats docs (mirrors the firestore.rules whitelist). */
export const SCAN_STATS_KEYS = [
  'qrId',
  'qrType',
  'totalScans',
  'uniqueScanners',
  'scannerHashes',
  'parsed',
  'invalid',
  'expired',
  'completions',
  'failures',
  'lastScannedAt',
  'firstSeenAt',
  'receiverId',
] as const;

export interface QrScanEvent {
  qrId: string;
  qrType: QrType;
  /** SHA-256 hex (64 chars). NEVER the raw uid. */
  scannerHash: string;
  outcome: ScanOutcome;
  /** Epoch ms of the scan. */
  scannedAt: number;
  /** Optional context from the QR payload. */
  amount?: number;
  currency?: string;
}

export interface QrScanStats {
  qrId: string;
  qrType: QrType;
  totalScans: number;
  uniqueScanners: number;
  /** Capped at MAX_SCANNER_HASHES. uniqueScanners is approximate beyond the cap. */
  scannerHashes: string[];
  parsed: number;
  invalid: number;
  expired: number;
  completions: number;
  failures: number;
  lastScannedAt: number;
  firstSeenAt: number;
  /** Who owns this QR (for the owner dashboard display). */
  receiverId?: string;
}

/**
 * SHA-256 hex of (salt + ':' + uid). Consistent for unique counting,
 * not reversible to the uid from the dashboard.
 */
export async function hashScanner(uid: string): Promise<string> {
  const data = new TextEncoder().encode(`${QR_INTEL_SALT}:${uid}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** True when the value is one of the known scan outcomes. */
export function isValidScanOutcome(o: unknown): o is ScanOutcome {
  return typeof o === 'string' && (SCAN_OUTCOMES as readonly string[]).includes(o);
}

/** True when the value is one of the known QR types. */
export function isValidQrType(t: unknown): t is QrType {
  return typeof t === 'string' && (QR_TYPES as readonly string[]).includes(t);
}

/** True when a scanner hash looks like a 64-char lowercase hex digest. */
export function isValidScannerHash(h: unknown): h is string {
  return typeof h === 'string' && /^[0-9a-f]{64}$/.test(h);
}

export interface BuildScanEventInput {
  qrId: string;
  qrType: QrType;
  scannerHash: string;
  outcome: ScanOutcome;
  scannedAt?: number;
  amount?: number;
  currency?: string;
}

/**
 * Build a whitelist-exact scan event. Strips undefined optionals so the
 * document never carries Firestore-rejected undefined values.
 * Throws on invalid shape (fail-closed at the boundary, not in the UI flow).
 */
export function buildScanEvent(input: BuildScanEventInput): QrScanEvent {
  if (!input.qrId || typeof input.qrId !== 'string') {
    throw new Error('qrIntel: qrId is required');
  }
  if (!isValidQrType(input.qrType)) {
    throw new Error(`qrIntel: unknown qrType "${input.qrType}"`);
  }
  if (!isValidScannerHash(input.scannerHash)) {
    throw new Error('qrIntel: scannerHash must be a 64-char hex digest');
  }
  if (!isValidScanOutcome(input.outcome)) {
    throw new Error(`qrIntel: unknown outcome "${input.outcome}"`);
  }
  const event: QrScanEvent = {
    qrId: input.qrId,
    qrType: input.qrType,
    scannerHash: input.scannerHash,
    outcome: input.outcome,
    scannedAt: input.scannedAt ?? Date.now(),
  };
  if (typeof input.amount === 'number' && Number.isFinite(input.amount)) {
    event.amount = input.amount;
  }
  if (typeof input.currency === 'string' && input.currency.length > 0) {
    event.currency = input.currency;
  }
  return event;
}

/**
 * Build the initial stats document for a QR that has never been scanned.
 */
export function initialScanStats(
  qrId: string,
  qrType: QrType,
  now = Date.now(),
): QrScanStats {
  return {
    qrId,
    qrType,
    totalScans: 0,
    uniqueScanners: 0,
    scannerHashes: [],
    parsed: 0,
    invalid: 0,
    expired: 0,
    completions: 0,
    failures: 0,
    lastScannedAt: now,
    firstSeenAt: now,
  };
}

/**
 * Fold one scan event into stats (pure — the transactional service applies this
 * shape). Returns the updated stats. Honors the hash cap.
 */
export function applyScanToStats(stats: QrScanStats, event: QrScanEvent): QrScanStats {
  const next: QrScanStats = {
    ...stats,
    totalScans: stats.totalScans + 1,
    lastScannedAt: Math.max(stats.lastScannedAt, event.scannedAt),
    scannerHashes: [...stats.scannerHashes],
  };
  // Unique counting (approximate beyond MAX_SCANNER_HASHES).
  if (
    !next.scannerHashes.includes(event.scannerHash) &&
    next.scannerHashes.length < MAX_SCANNER_HASHES
  ) {
    next.scannerHashes.push(event.scannerHash);
    next.uniqueScanners = next.scannerHashes.length;
  }
  switch (event.outcome) {
    case 'parsed':
      next.parsed += 1;
      break;
    case 'invalid':
      next.invalid += 1;
      break;
    case 'expired':
      next.expired += 1;
      break;
    case 'payment_completed':
      next.completions += 1;
      break;
    case 'payment_failed':
      next.failures += 1;
      break;
  }
  return next;
}

export interface Funnel {
  scans: number;
  parsed: number;
  completions: number;
  failures: number;
  /** completions / parsed, 0 when nothing parsed. The killer metric. */
  conversionRate: number;
  /** (completions + failures) / parsed — how many scans reached a payment decision. */
  decisionRate: number;
}

/**
 * The money funnel for one QR (or for an aggregate of QRs).
 * Zero-division safe: no scans -> all rates 0, never NaN.
 */
export function funnelMath(s: {
  parsed: number;
  completions: number;
  failures: number;
  totalScans: number;
}): Funnel {
  const parsed = Math.max(0, s.parsed);
  const completions = Math.max(0, s.completions);
  const failures = Math.max(0, s.failures);
  return {
    scans: Math.max(0, s.totalScans),
    parsed,
    completions,
    failures,
    conversionRate: parsed > 0 ? completions / parsed : 0,
    decisionRate: parsed > 0 ? (completions + failures) / parsed : 0,
  };
}

/**
 * Rank QR stats by total scans, descending. Ties broken by most recent scan.
 */
export function rankQrStats(stats: QrScanStats[]): QrScanStats[] {
  return [...stats].sort(
    (a, b) => b.totalScans - a.totalScans || b.lastScannedAt - a.lastScannedAt,
  );
}

/**
 * Bucket stats into per-day scan counts for the last `days` days.
 * Returns oldest-first [{ dayStart, scans }]. Pure — the dashboard renders it.
 */
export function scansPerDay(
  events: { scannedAt: number }[],
  days: number,
  now = Date.now(),
): { dayStart: number; scans: number }[] {
  const dayMs = 86_400_000;
  const todayStart = Math.floor(now / dayMs) * dayMs;
  const buckets: { dayStart: number; scans: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    buckets.push({ dayStart: todayStart - i * dayMs, scans: 0 });
  }
  for (const e of events) {
    const idx = Math.floor((e.scannedAt - (todayStart - (days - 1) * dayMs)) / dayMs);
    if (idx >= 0 && idx < days) buckets[idx].scans += 1;
  }
  return buckets;
}
