/**
 * receiptNumbers.ts — M-18 receipt-number integrity.
 *
 * Receipt numbers are sequential per workspace, per series, per year:
 *   SB-80G-2026-0042  (80G-eligible donations)
 *   SB-CHANDA-2026-0117 (general chanda / POS)
 *   SB-RENT-2026-0008  (rent receipts)
 *
 * Rules enforced by callers (via nextReceiptSeq):
 *   - NEVER derive from array length (reuses numbers after deletion).
 *   - NEVER use timestamp fragments (not sequential, can collide).
 *   - Always max(existing seqs) + 1 for the series+year.
 *
 * Gap detection: because this is an offline-first client (and two devices
 * can race), gaps are possible. findReceiptGaps() surfaces them so the
 * TaxReceiptDesk can show them honestly instead of pretending the series
 * is clean. A gap is a flag for review, not proof of fraud.
 */

export interface ParsedReceipt {
  prefix: string;
  year: number;
  seq: number;
}

const RECEIPT_RE = /^(SB-(?:80G|CHANDA|RENT))-(\d{4})-(\d+)$/;

export function parseReceiptNumber(no: string | undefined | null): ParsedReceipt | null {
  if (!no) return null;
  const m = RECEIPT_RE.exec(no.trim().toUpperCase());
  if (!m) return null;
  return { prefix: m[1], year: parseInt(m[2], 10), seq: parseInt(m[3], 10) };
}

export function formatReceiptNumber(prefix: string, year: number, seq: number): string {
  return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
}

/* =====================================================================
 * SECURITY P1 (Finding 5) — server-anchored sequences + provisional
 * numbers. Receipt numbers used to be minted from whatever the local
 * device happened to have loaded, so two devices could issue the same
 * official number. The anchor now lives in `receiptCounters` docs
 * (context/data/receiptCounterSync.ts claims from them transactionally;
 * firestore.rules lets the counter only ever move FORWARD, finance
 * roles only). When a claim is impossible (offline), the receipt is
 * issued with a PROVISIONAL number in the format below — visibly not
 * part of the official series, unique via its suffix, and never parsed
 * as an official number by parseReceiptNumber / the gap & duplicate
 * checks above.
 * =================================================================== */

/** Firestore doc id of the shared counter for one workspace+series+year. */
export function receiptCounterDocId(workspaceId: string, prefix: string, year: number): string {
  return `${workspaceId}_${prefix}_${year}`;
}

const PROVISIONAL_RE = /^(SB-(?:80G|CHANDA|RENT))-(\d{4})-P-([A-Z0-9]+)$/;

/** A clearly-marked provisional (offline-issued) receipt number. */
export function formatProvisionalReceiptNumber(prefix: string, year: number, suffix: string): string {
  const clean = (suffix || '').replace(/[^A-Za-z0-9]/g, '').slice(-8).toUpperCase() || 'LOCAL';
  return `${prefix}-${year}-P-${clean}`;
}

export interface ParsedProvisionalReceipt {
  prefix: string;
  year: number;
  suffix: string;
}

export function parseProvisionalReceiptNumber(
  no: string | undefined | null
): ParsedProvisionalReceipt | null {
  if (!no) return null;
  const m = PROVISIONAL_RE.exec(no.trim().toUpperCase());
  if (!m) return null;
  return { prefix: m[1], year: parseInt(m[2], 10), suffix: m[3] };
}

export function isProvisionalReceiptNumber(no: string | undefined | null): boolean {
  return parseProvisionalReceiptNumber(no) != null;
}

/**
 * Next sequence for a series: max(existing seqs for prefix+year) + 1.
 * `existing` are raw receipt-number strings (unparseable ones are ignored).
 */
export function nextReceiptSeq(
  existing: Array<string | undefined | null>,
  prefix: string,
  year: number
): number {
  let max = 0;
  for (const raw of existing) {
    const p = parseReceiptNumber(raw);
    if (p && p.prefix === prefix && p.year === year && p.seq > max) {
      max = p.seq;
    }
  }
  return max + 1;
}

/** Missing sequence numbers in (min..max) for a series+year, ascending. */
export function findReceiptGaps(
  numbers: Array<string | undefined | null>,
  prefix: string,
  year: number
): number[] {
  const seqs = new Set<number>();
  for (const raw of numbers) {
    const p = parseReceiptNumber(raw);
    if (p && p.prefix === prefix && p.year === year) seqs.add(p.seq);
  }
  if (seqs.size === 0) return [];
  const min = Math.min(...seqs);
  const max = Math.max(...seqs);
  const gaps: number[] = [];
  for (let s = min; s <= max; s++) {
    if (!seqs.has(s)) gaps.push(s);
  }
  return gaps;
}

/** Duplicate receipt numbers (case-insensitive), for integrity warnings. */
export function findDuplicateReceipts(numbers: Array<string | undefined | null>): string[] {
  const seen = new Map<string, string>(); // upper-key → first-seen original
  const dupes = new Set<string>();
  for (const raw of numbers) {
    if (!raw) continue;
    const key = raw.trim().toUpperCase();
    if (seen.has(key)) {
      dupes.add(seen.get(key)!);
    } else {
      seen.set(key, raw.trim());
    }
  }
  return [...dupes];
}
