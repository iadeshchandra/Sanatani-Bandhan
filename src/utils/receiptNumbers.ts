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
