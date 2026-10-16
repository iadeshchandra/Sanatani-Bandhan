/**
 * auditTrail.test.ts — Pillar 4 (Audit Trail) correctness + RBAC proofs.
 * ============================================================================
 * The two things that must be PROVEN, not assumed:
 *  1. The hash chain verification genuinely works — tampering is detected
 *     at the exact broken link (uses the REAL sha256 chain from the store).
 *  2. The donor transparency snapshot is provably unable to leak the raw
 *     ledger — no donor names, no actor names, no PAN, no references,
 *     no individual entries. Ever.
 *
 * Pure-logic tests (no Firestore, no emulators) — same pattern as
 * glanceRbac.test.ts.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  buildAuditEntries,
  applyTrailFilters,
  findProvenance,
  provenanceHash,
  buildPurposeSummary,
  buildTransparencySnapshot,
  formatLakhCrore,
  formatINRFull,
  trailToCSV,
  fingerprintEntries,
  transparencyCardText,
  type AuditEntry,
} from '../lib/auditTrail';
import type { TreasuryTransaction } from '../types';
import {
  chainEvent,
  verifyChain,
} from '../cashcustody/cashCustodyStore';
import type { CashCustodyState, CustodyEvent } from '../cashcustody/types';

/* ------------------------------ fixtures ------------------------------ */

const tx = (over: Partial<TreasuryTransaction>): TreasuryTransaction =>
  ({
    id: 'tx_' + Math.random().toString(36).slice(2),
    workspaceId: 'ws1',
    date: '2026-10-01',
    type: 'Income',
    category: 'Donation',
    amount: 1000,
    handledBy: 'Trustee A',
    paymentMode: 'UPI / QR',
    purpose: 'Goshala expansion',
    auditVerified: false,
    createdAt: 0,
    updatedAt: 0,
    ...over,
  } as TreasuryTransaction);

/* --------------------------- 1. money trail --------------------------- */

describe('buildAuditEntries', () => {
  it('sorts chronologically and computes a running balance', () => {
    const entries = buildAuditEntries([
      tx({ id: 'c', date: '2026-10-03', type: 'Expense', amount: 4000, category: 'Seva' }),
      tx({ id: 'a', date: '2026-10-01', type: 'Income', amount: 10000, category: 'Donation' }),
      tx({ id: 'b', date: '2026-10-02', type: 'Income', amount: 5000, category: 'Donation' }),
    ]);
    expect(entries.map((e) => e.id)).toEqual(['a', 'b', 'c']);
    expect(entries.map((e) => e.balance)).toEqual([10000, 15000, 11000]);
  });

  it('flags hundi deposit slips as chain-linked, nothing else', () => {
    const entries = buildAuditEntries([
      tx({ id: 'h', category: 'Hundi Collection', referenceNo: 'SB-DPST-2026-0001', amount: 25000 }),
      tx({ id: 'm', category: 'Donation', referenceNo: 'UPI-REF-999', amount: 5000 }),
      tx({ id: 'n', category: 'Donation', amount: 100 }),
    ]);
    const byId = Object.fromEntries(entries.map((e) => [e.id, e]));
    expect(byId.h.chained).toBe(true);
    expect(byId.h.slipNo).toBe('SB-DPST-2026-0001');
    expect(byId.m.chained).toBe(false);
    expect(byId.n.chained).toBe(false);
  });

  it('handles an empty ledger without crashing', () => {
    expect(buildAuditEntries([])).toEqual([]);
  });
});

describe('applyTrailFilters', () => {
  const entries: AuditEntry[] = buildAuditEntries([
    tx({ id: 'a', date: '2026-09-01', type: 'Income', amount: 10000, category: 'Donation', handledBy: 'Trustee A', purpose: 'Goshala expansion' }),
    tx({ id: 'b', date: '2026-10-05', type: 'Expense', amount: 3000, category: 'Seva', handledBy: 'Accountant B', purpose: 'Annadanam' }),
    tx({ id: 'c', date: '2026-10-10', type: 'Income', amount: 25000, category: 'Hundi Collection', handledBy: 'Trustee A', referenceNo: 'SB-DPST-2026-0007', purpose: 'Hundi collection deposit' }),
  ]);

  it('filters by date range (inclusive)', () => {
    const f = applyTrailFilters(entries, { from: '2026-10-01', to: '2026-10-31' });
    expect(f.map((e) => e.id).sort()).toEqual(['b', 'c']);
  });

  it('filters by category and actor', () => {
    expect(applyTrailFilters(entries, { category: 'Seva' }).map((e) => e.id)).toEqual(['b']);
    expect(applyTrailFilters(entries, { actor: 'Trustee A' }).map((e) => e.id).sort()).toEqual(['a', 'c']);
  });

  it('searches across action/purpose/actor/reference', () => {
    expect(applyTrailFilters(entries, { query: 'annadanam' }).map((e) => e.id)).toEqual(['b']);
    expect(applyTrailFilters(entries, { query: 'SB-DPST-2026-0007' }).map((e) => e.id)).toEqual(['c']);
    expect(applyTrailFilters(entries, { query: 'accountant' }).map((e) => e.id)).toEqual(['b']);
  });

  it('chainedOnly keeps only provenance-linked entries', () => {
    expect(applyTrailFilters(entries, { chainedOnly: true }).map((e) => e.id)).toEqual(['c']);
  });
});

/* --------------------- 2. genuine chain verification --------------------- */

function buildChain(n: number): CustodyEvent[] {
  const events: CustodyEvent[] = [];
  let prev: CustodyEvent | undefined;
  for (let i = 0; i < n; i++) {
    prev = chainEvent(prev, 'box_opened', `Actor ${i}`, `event ${i} details`, 1_700_000_000_000 + i * 1000, i);
    events.push(prev);
  }
  return events;
}

describe('hash chain verification (real SHA-256 chain)', () => {
  it('verifies an intact chain', () => {
    expect(verifyChain(buildChain(12))).toBe(-1);
  });

  it('detects tampering with event details at the exact link', () => {
    const events = buildChain(8);
    events[4] = { ...events[4], details: 'event 4 details — EDITED BY ATTACKER' };
    expect(verifyChain(events)).toBe(4);
  });

  it('detects a forged hash', () => {
    const events = buildChain(6);
    events[2] = { ...events[2], hash: '0'.repeat(64) };
    expect(verifyChain(events)).toBe(2);
  });

  it('detects reordering (seq bound into the hash)', () => {
    // verifyChain sorts by seq, so shuffling array positions is harmless by
    // design. The real attack is swapping two events' seq values — the hash
    // covers seq, so the forgery is caught.
    const events = buildChain(5);
    const tampered = events.map((e) => ({ ...e }));
    const s = tampered[1].seq;
    tampered[1].seq = tampered[3].seq;
    tampered[3].seq = s;
    expect(verifyChain(tampered)).not.toBe(-1);
  });

  it('detects a removed event (prevHash link breaks)', () => {
    const events = buildChain(5);
    events.splice(2, 1);
    expect(verifyChain(events)).not.toBe(-1);
  });

  it('an empty chain is trivially intact', () => {
    expect(verifyChain([])).toBe(-1);
  });
});

/* --------------------------- 3. provenance --------------------------- */

function custodyWithSlip(): CashCustodyState {
  const box = {
    id: 'bx_1', boxCode: 'HND-001', name: 'Garbhagriha Hundi', location: 'sanctum',
    sealNumber: 'SL-1', custodian1: 'A', custodian2: 'B', status: 'sealed' as const, createdAt: 1,
  };
  const slip = {
    id: 'dp_1', slipNo: 'SB-DPST-2026-0001', sessionId: 's_1', boxId: 'bx_1',
    amount: 25000, denominationMix: {} as any, countedBy: 'A', verifiedBy: 'B',
    createdAt: 2, depositDate: '2026-10-10', status: 'deposited' as const,
  };
  let prev: CustodyEvent | undefined;
  const events: CustodyEvent[] = [];
  const log = (kind: any, actor: string, details: string) => {
    prev = chainEvent(prev, kind, actor, details, 1_700_000_000_000 + events.length, events.length);
    events.push(prev);
  };
  log('box_opened', 'A + B', 'HND-001 opened — seal SL-1 verified');
  log('count_verified', 'B', 'HND-001 counted — ₹25,000');
  log('deposit_created', 'B', 'Slip SB-DPST-2026-0001 — HND-001 ₹25,000 → bank');
  log('deposit_confirmed', 'A', 'Slip SB-DPST-2026-0001 posted to treasury — ₹25,000');
  log('box_opened', 'A + B', 'HND-002 opened — seal SL-9 verified'); // different box — must NOT match
  return {
    boxes: [box], sessions: [], events, deposits: [slip], staff: [], attendance: [],
    settings: { slipSeq: {}, defaultBankName: '', defaultBankBranch: '' },
  };
}

describe('findProvenance', () => {
  it('links a hundi entry to its box + slip custody events, in chain order', () => {
    const custody = custodyWithSlip();
    const [entry] = buildAuditEntries([
      tx({ category: 'Hundi Collection', referenceNo: 'SB-DPST-2026-0001', amount: 25000 }),
    ]);
    const prov = findProvenance(custody, entry);
    expect(prov.length).toBe(4);
    expect(prov.map((e) => e.seq)).toEqual([0, 1, 2, 3]);
    expect(verifyChain(prov)).toBe(-1); // the linked slice is itself verifiable
    expect(provenanceHash(custody, entry)).toBe(prov[3].hash);
  });

  it('returns nothing for non-hundi entries', () => {
    const custody = custodyWithSlip();
    const [entry] = buildAuditEntries([tx({ category: 'Donation', amount: 500 })]);
    expect(findProvenance(custody, entry)).toEqual([]);
    expect(provenanceHash(custody, entry)).toBeNull();
  });
});

/* ----------------- 4. RBAC: the leak-proofness proof ----------------- */

describe('transparency snapshot — provably unable to leak the raw ledger', () => {
  const sensitive = buildAuditEntries([
    tx({
      id: 's1', type: 'Income', amount: 51000, category: 'Donation',
      purpose: 'Goshala expansion', handledBy: 'Trustee Ramesh Sharma',
      devoteeName: 'Smt. Lakshmi Devi', devoteePan: 'ABCDE1234F',
      referenceNo: 'UPI-SECRET-REF-001', paymentMode: 'UPI / QR',
    }),
    tx({
      id: 's2', type: 'Expense', amount: 18000, category: 'Seva',
      purpose: 'Goshala expansion', handledBy: 'Accountant Mohan Gupta',
      vendorName: 'Sharma Fodder Suppliers', referenceNo: 'NEFT-SECRET-002',
    }),
    tx({
      id: 's3', type: 'Income', amount: 25000, category: 'Hundi Collection',
      purpose: 'Hundi collection deposit', handledBy: 'Priest Anil',
      devoteeName: 'Hundi collection (anonymous)', referenceNo: 'SB-DPST-2026-0003',
    }),
  ]);
  const snap = buildTransparencySnapshot(sensitive, 'Test Mandir', { intact: true, events: 42 });
  const dumped = JSON.stringify(snap);

  it('contains zero donor / actor / PAN / reference identifiers', () => {
    for (const secret of [
      'Lakshmi Devi', 'Ramesh Sharma', 'Mohan Gupta', 'Anil',
      'ABCDE1234F', 'UPI-SECRET-REF-001', 'NEFT-SECRET-002',
      'SB-DPST-2026-0003', 'Sharma Fodder Suppliers', 's1', 's2', 's3',
    ]) {
      expect(dumped).not.toContain(secret);
    }
  });

  it('carries ONLY aggregate keys — exact allowlist', () => {
    expect(Object.keys(snap).sort()).toEqual(
      ['chainEvents', 'chainIntact', 'generatedAt', 'orgName', 'purposes', 'totalRaised', 'totalUtilized'].sort()
    );
    for (const p of snap.purposes) {
      expect(Object.keys(p).sort()).toEqual(['net', 'purpose', 'raised', 'txCount', 'utilized'].sort());
    }
  });

  it('aggregates correctly (raised vs utilized per purpose)', () => {
    const goshala = snap.purposes.find((p) => p.purpose === 'Goshala expansion')!;
    expect(goshala.raised).toBe(51000);
    expect(goshala.utilized).toBe(18000);
    expect(goshala.net).toBe(33000);
    expect(snap.totalRaised).toBe(76000);
    expect(snap.totalUtilized).toBe(18000);
  });

  it('strips slip numbers embedded inside purpose strings', () => {
    const withSlipInPurpose = buildAuditEntries([
      tx({
        type: 'Income', amount: 184500, category: 'Hundi Collection',
        purpose: 'Hundi collection deposit — slip SB-DPST-2026-0041 (HND-001)',
        handledBy: 'M. Gupta', referenceNo: 'SB-DPST-2026-0041',
      }),
    ]);
    const s2 = buildTransparencySnapshot(withSlipInPurpose, 'Test Mandir', { intact: true, events: 6 });
    expect(JSON.stringify(s2)).not.toContain('SB-DPST');
    expect(JSON.stringify(s2)).not.toContain('HND-001');
    expect(s2.purposes[0].purpose).toBe('Hundi collection');
  });

  it('rolls detail purposes up under their base purpose', () => {
    const rolled = buildAuditEntries([
      tx({ purpose: 'Goshala expansion', type: 'Income', amount: 320000 }),
      tx({ purpose: 'Goshala expansion — fodder & shed work', type: 'Expense', amount: 96000 }),
      tx({ purpose: 'Goshala expansion — veterinary care contract', type: 'Expense', amount: 84000 }),
    ]);
    const sums = buildPurposeSummary(rolled);
    expect(sums).toHaveLength(1);
    expect(sums[0]).toMatchObject({ purpose: 'Goshala expansion', raised: 320000, utilized: 180000, net: 140000 });
  });

  it('the shareable card text is also PII-free', () => {
    const card = transparencyCardText(snap);
    expect(card).not.toContain('Lakshmi');
    expect(card).not.toContain('SECRET');
    expect(card).toContain('₹76K');
  });

  it('TransparencyView cannot import raw-ledger sources (static guard)', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'components', 'treasury', 'TransparencyView.tsx'),
      'utf-8'
    );
    const forbidden = ['useData', 'DataContext', 'TreasuryTransaction', 'cashCustodyStore', 'CustodyEvent'];
    for (const f of forbidden) {
      expect(src).not.toContain(f);
    }
    // The ONLY data type it may touch is the aggregate snapshot.
    expect(src).toContain('TransparencySnapshot');
  });
});

/* --------------------------- 5. exports --------------------------- */

describe('exports', () => {
  const entries = buildAuditEntries([
    tx({ id: 'e1', date: '2026-10-01', type: 'Income', amount: 10500.7, category: 'Donation', purpose: 'Goshala', handledBy: 'T', auditVerified: true }),
    tx({ id: 'e2', date: '2026-10-02', type: 'Expense', amount: 2000, category: 'Seva', purpose: 'Annadanam', handledBy: 'A' }),
  ]);

  it('CSV has a header and rounded amounts', () => {
    const csv = trailToCSV(entries);
    const lines = csv.split('\n');
    expect(lines[0]).toContain('Date,Actor,Action');
    expect(lines[1]).toContain('10501'); // rounded
    expect(lines[1]).toContain('10501'); // running balance too
    expect(lines[2]).toContain('8501');
  });

  it('fingerprint is deterministic and sensitive to tampering', () => {
    const a = fingerprintEntries(entries);
    const b = fingerprintEntries(buildAuditEntries([
      tx({ id: 'e1', date: '2026-10-01', type: 'Income', amount: 10500.7, category: 'Donation', purpose: 'Goshala', handledBy: 'T', auditVerified: true }),
      tx({ id: 'e2', date: '2026-10-02', type: 'Expense', amount: 2000, category: 'Seva', purpose: 'Annadanam', handledBy: 'A' }),
    ]));
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
    const tampered = entries.map((e) => (e.id === 'e2' ? { ...e, amount: 2001 } : e));
    expect(fingerprintEntries(tampered)).not.toBe(a);
  });
});

describe('formatLakhCrore', () => {
  it('formats Indian compact money', () => {
    expect(formatLakhCrore(240000)).toBe('₹2.4L');
    expect(formatLakhCrore(18000000)).toBe('₹1.8Cr');
    expect(formatLakhCrore(850)).toBe('₹850');
    expect(formatLakhCrore(100000)).toBe('₹1L');
    expect(formatLakhCrore(0)).toBe('₹0');
    expect(formatLakhCrore(-50000)).toBe('−₹50K');
    expect(formatINRFull(1234567)).toBe('₹12,34,567');
  });
});

describe('buildPurposeSummary', () => {
  it('groups by purpose with raised/utilized split', () => {
    const entries = buildAuditEntries([
      tx({ purpose: 'Goshala expansion', type: 'Income', amount: 240000 }),
      tx({ purpose: 'Goshala expansion', type: 'Expense', amount: 180000 }),
      tx({ purpose: 'Annadanam', type: 'Income', amount: 50000 }),
    ]);
    const sums = buildPurposeSummary(entries);
    expect(sums.find((s) => s.purpose === 'Goshala expansion')).toMatchObject({
      raised: 240000, utilized: 180000, net: 60000,
    });
  });
});
