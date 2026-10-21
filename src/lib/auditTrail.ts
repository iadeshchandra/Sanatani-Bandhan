/**
 * Pillar 4 — Audit Trail engine (pure logic, no React).
 * ============================================================================
 * The 10-second test: a donor asks "where did my money go?" → the trustee
 * pulls up a shareable, beautiful trail in 10 seconds.
 *
 * HONEST CRYPTO DESIGN (read before "improving"):
 * - The hash-chained store is the cash-custody event log (CustodyEvent:
 *   SHA-256, prevHash-linked, seq-ordered). `verifyChain` there is genuine.
 * - Treasury transactions themselves are NOT hash-chained — this module
 *   deliberately does NOT invent per-entry hashes for them at read time
 *   (that would be crypto-theater: a read-time hash can't detect an
 *   earlier edit). Instead, hundi-sourced entries link to their real
 *   custody-chain provenance (deposit slip → box → chained events).
 * - `fingerprintEntries` produces a SHA-256 digest of an exported report so
 *   anyone holding the PDF/CSV can confirm the document matches the data
 *   it claims to represent. That is document integrity, not a chain.
 *
 * RBAC BOUNDARY (the part that must stay true):
 * - `TransparencySnapshot` / `PurposeSummary` carry ONLY purpose-level
 *   aggregates: no ids, no actor names, no donor names, no PAN, no
 *   reference numbers, no individual amounts. The TransparencyView
 *   component's props type physically cannot receive raw entries, so the
 *   donor summary is provably unable to leak the raw ledger.
 * - Raw entries (`AuditEntry`) are trustee/accountant-only: the desk
 *   enforces `checkPermission(['ACCOUNTANT','MANAGER','TRUSTEE'])`
 *   (SuperAdmin passes), on top of the sidebar gating of the whole
 *   treasury module.
 */

import type { TreasuryTransaction } from '../types';
import type { CashCustodyState, CustodyEvent } from '../cashcustody/types';
import { sha256Hex } from '../cashcustody/cashCustodyStore';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/** One stamped money-movement record in the trail. */
export interface AuditEntry {
  id: string;
  /** ISO date string from the ledger. */
  date: string;
  ts: number;
  actor: string;
  /** What happened — category / event name. */
  action: string;
  purpose: string;
  type: 'Income' | 'Expense';
  amount: number;
  /** Running balance AFTER this entry (chronological order). */
  balance: number;
  paymentMode: string;
  referenceNo?: string;
  /** True when this entry links to hash-chained custody provenance. */
  chained: boolean;
  /** Hundi deposit slip number (e.g. SB-DPST-2026-0001), when applicable. */
  slipNo?: string;
  boxCode?: string;
  auditVerified: boolean;
}

export interface TrailFilters {
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  category?: string;
  actor?: string;
  query?: string;
  chainedOnly?: boolean;
}

/** Purpose-level aggregate — the ONLY shape the donor summary may carry. */
export interface PurposeSummary {
  purpose: string;
  raised: number;
  utilized: number;
  net: number;
  txCount: number;
}

/** Shareable, leak-proof snapshot for the transparency view. */
export interface TransparencySnapshot {
  orgName: string;
  generatedAt: number;
  purposes: PurposeSummary[];
  totalRaised: number;
  totalUtilized: number;
  chainIntact: boolean | null;
  chainEvents: number;
}

/* ------------------------------------------------------------------ */
/* Money trail                                                         */
/* ------------------------------------------------------------------ */

/** Hundi deposits post with referenceNo = slip number — the provenance link. */
const isHundiLinked = (tx: TreasuryTransaction): boolean =>
  !!tx.referenceNo && /^SB-DPST-\d{4}-\d+$/i.test(tx.referenceNo.trim());

const toTs = (date: string): number => {
  const t = new Date(date).getTime();
  return Number.isNaN(t) ? 0 : t;
};

/** Chronological trail with running balance. Oldest first. */
export function buildAuditEntries(treasury: TreasuryTransaction[]): AuditEntry[] {
  const sorted = [...treasury].sort((a, b) => {
    const d = toTs(a.date) - toTs(b.date);
    if (d !== 0) return d;
    return String(a.id).localeCompare(String(b.id));
  });
  let balance = 0;
  return sorted.map((tx) => {
    const signed = tx.type === 'Income' ? tx.amount : -tx.amount;
    balance += signed;
    const slipNo = isHundiLinked(tx) ? tx.referenceNo!.trim().toUpperCase() : undefined;
    return {
      id: tx.id,
      date: tx.date,
      ts: toTs(tx.date),
      actor: tx.handledBy || '—',
      action: tx.eventName || tx.category || '—',
      purpose: tx.purpose || tx.subcategory || tx.category || '—',
      type: tx.type,
      amount: tx.amount,
      balance,
      paymentMode: tx.paymentMode || '—',
      referenceNo: tx.referenceNo,
      chained: !!slipNo,
      slipNo,
      auditVerified: !!tx.auditVerified,
    };
  });
}

export function applyTrailFilters(entries: AuditEntry[], f: TrailFilters): AuditEntry[] {
  const q = (f.query || '').trim().toLowerCase();
  return entries.filter((e) => {
    if (f.from && e.date.slice(0, 10) < f.from) return false;
    if (f.to && e.date.slice(0, 10) > f.to) return false;
    if (f.category && e.action !== f.category) return false;
    if (f.actor && e.actor !== f.actor) return false;
    if (f.chainedOnly && !e.chained) return false;
    if (q) {
      const hay = `${e.action} ${e.purpose} ${e.actor} ${e.referenceNo || ''} ${e.paymentMode}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function extractCategories(entries: AuditEntry[]): string[] {
  return [...new Set(entries.map((e) => e.action))].sort((a, b) => a.localeCompare(b));
}

export function extractActors(entries: AuditEntry[]): string[] {
  return [...new Set(entries.map((e) => e.actor))].sort((a, b) => a.localeCompare(b));
}

/* ------------------------------------------------------------------ */
/* Custody-chain provenance                                            */
/* ------------------------------------------------------------------ */

/**
 * Find the hash-chained custody events behind a hundi-sourced entry:
 * the deposit slip's own events (slip number in details) plus the full
 * box lifecycle (box code in details), in chain order.
 */
export function findProvenance(custody: CashCustodyState, entry: AuditEntry): CustodyEvent[] {
  if (!entry.slipNo) return [];
  const slipNo = entry.slipNo;
  const slip = custody.deposits.find((d) => d.slipNo.toUpperCase() === slipNo);
  const boxCode = slip ? custody.boxes.find((b) => b.id === slip.boxId)?.boxCode : undefined;
  const matched = custody.events.filter((ev) => {
    const det = ev.details || '';
    if (det.includes(slipNo)) return true;
    if (boxCode && det.includes(boxCode)) return true;
    return false;
  });
  return matched.sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
}

/** The hash to stamp on the timeline badge: the newest linked event. */
export function provenanceHash(custody: CashCustodyState, entry: AuditEntry): string | null {
  const prov = findProvenance(custody, entry);
  return prov.length ? prov[prov.length - 1].hash : null;
}

/* ------------------------------------------------------------------ */
/* Purpose summaries + leak-proof transparency snapshot                */
/* ------------------------------------------------------------------ */

/**
 * Normalize a purpose for the PUBLIC summary. Two rules:
 *  1. Strip slip/box references (SB-DPST-… / (HND-001)) — these are
 *     internal control numbers and must never reach the donor view.
 *  2. Group by base purpose (text before ' — '): 'Goshala expansion —
 *     fodder & shed work' rolls up under 'Goshala expansion' so the
 *     donor sees "₹X raised for Goshala expansion, ₹Y utilized".
 * The trustee trail keeps the full raw strings — only the summary rolls up.
 */
export function normalizePurpose(raw: string | undefined, action: string): string {
  let p = (raw || '').trim();
  // Hundi deposits always summarize under one clean label.
  if (/hundi/i.test(action)) return 'Hundi collection';
  p = p.replace(/\s*[—–-]\s*slip\s+SB-DPST-\d{4}-\d+/gi, '');
  p = p.replace(/\s*\([A-Z]+-\d+\)\s*/g, ' ').trim();
  const base = p.split(/\s+[—–-]\s+/)[0].trim();
  return base || 'General';
}

export function buildPurposeSummary(entries: AuditEntry[]): PurposeSummary[] {
  const map = new Map<string, PurposeSummary>();
  for (const e of entries) {
    const key = normalizePurpose(e.purpose, e.action);
    let s = map.get(key);
    if (!s) {
      s = { purpose: key, raised: 0, utilized: 0, net: 0, txCount: 0 };
      map.set(key, s);
    }
    if (e.type === 'Income') s.raised += e.amount;
    else s.utilized += e.amount;
    s.net = s.raised - s.utilized;
    s.txCount += 1;
  }
  return [...map.values()].sort((a, b) => b.raised - a.raised);
}

/**
 * Build the donor-safe snapshot. DELIBERATELY lossy: aggregates only.
 * Never add actor/donor/PAN/reference fields here — the transparency
 * component must stay provably unable to leak raw entries.
 */
export function buildTransparencySnapshot(
  entries: AuditEntry[],
  orgName: string,
  chain: { intact: boolean | null; events: number }
): TransparencySnapshot {
  const purposes = buildPurposeSummary(entries);
  return {
    orgName,
    generatedAt: Date.now(),
    purposes,
    totalRaised: purposes.reduce((s, p) => s + p.raised, 0),
    totalUtilized: purposes.reduce((s, p) => s + p.utilized, 0),
    chainIntact: chain.intact,
    chainEvents: chain.events,
  };
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

/** Compact money with lakh/crore grouping: ₹850 · ₹2.4L · ₹1.8Cr.
 * The symbol defaults to ₹ (Indian-statutory callers, unit tests) —
 * workspace surfaces pass their own currency symbol (QUEUED #60). */
export function formatLakhCrore(n: number, symbol = '₹'): string {
  const num = Number(n);
  if (!Number.isFinite(num)) return `${symbol}0`;
  const abs = Math.abs(num);
  const sign = num < 0 ? '−' : '';
  if (abs >= 1e7) {
    const v = abs / 1e7;
    return `${sign}${symbol}${trimNum(v)}Cr`;
  }
  if (abs >= 1e5) {
    const v = abs / 1e5;
    return `${sign}${symbol}${trimNum(v)}L`;
  }
  if (abs >= 1e3) {
    const v = abs / 1e3;
    return `${sign}${symbol}${trimNum(v)}K`;
  }
  return `${sign}${symbol}${Math.round(abs).toLocaleString('en-IN')}`;
}

const trimNum = (v: number): string => {
  const r = Math.round(v * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
};

/** Full grouping: ₹12,34,567. Symbol defaults to ₹ — workspace
 * surfaces pass their own currency symbol (QUEUED #60). */
export function formatINRFull(n: number, symbol = '₹'): string {
  const num = Number(n);
  if (!Number.isFinite(num)) return `${symbol}0`;
  return `${num < 0 ? '−' : ''}${symbol}${Math.abs(Math.round(num)).toLocaleString('en-IN')}`;
}

/** DD MMM YYYY in Asia/Kolkata. */
export function formatTrailDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

export const shortHash = (hash: string, len = 10): string =>
  hash && hash.length > len ? `${hash.slice(0, len)}…` : hash || '—';

/* ------------------------------------------------------------------ */
/* Exports                                                             */
/* ------------------------------------------------------------------ */

/** CSV of the (filtered) trail — UTF-8 BOM so Excel opens it correctly. */
export function trailToCSV(entries: AuditEntry[]): string {
  const esc = (v: string | number): string => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ['Date', 'Actor', 'Action', 'Purpose', 'Type', 'Amount (INR)', 'Running Balance (INR)', 'Payment Mode', 'Reference', 'Chain-linked', 'Audit Verified'];
  const rows = entries.map((e) =>
    [
      formatTrailDate(e.date),
      e.actor,
      e.action,
      e.purpose,
      e.type,
      Math.round(e.amount),
      Math.round(e.balance),
      e.paymentMode,
      e.referenceNo || '',
      e.chained ? 'yes' : 'no',
      e.auditVerified ? 'yes' : 'no',
    ].map(esc).join(',')
  );
  return '﻿' + [header.join(','), ...rows].join('\n');
}

/**
 * SHA-256 fingerprint of an export's canonical content. Printed on the
 * PDF/CSV so a recipient can confirm the document matches its data.
 */
export function fingerprintEntries(entries: AuditEntry[]): string {
  const canonical = entries
    .map((e) => [e.id, e.date, e.actor, e.action, e.purpose, e.type, e.amount, e.balance, e.referenceNo || ''].join('|'))
    .join('\n');
  return sha256Hex(canonical);
}

/** Download helper (browser). */
export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Shareable plain-text transparency card — aggregates only, safe to forward. */
export function transparencyCardText(s: TransparencySnapshot, symbol = '₹'): string {
  const lines = [
    `🪔 ${s.orgName} — Seva Transparency`,
    `Raised ${formatLakhCrore(s.totalRaised, symbol)} · Utilized ${formatLakhCrore(s.totalUtilized, symbol)}`,
    '',
    ...s.purposes.slice(0, 8).map((p) => `• ${p.purpose}: ${formatLakhCrore(p.raised, symbol)} raised, ${formatLakhCrore(p.utilized, symbol)} utilized`),
    '',
    s.chainIntact === true
      ? `⛓ Custody chain verified intact (${s.chainEvents} sealed events)`
      : s.chainIntact === false
        ? '⚠ Custody chain needs review — ask the trust office'
        : 'Custody log maintained on-device',
    '॥ सत्यमेव जयते ॥',
  ];
  return lines.join('\n');
}
