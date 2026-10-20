import {
  buildDonationLineTx, buildMemberRecord, buildNandiRecord, buildOpeningBalanceTx, executeCommit,
  type CommitDeps,
} from '../commit';
import type { DevoteeMember } from '../../types';
import type { ImportBatch, ImportRow } from '../types';

const row = (mapped: Record<string, any>, over: Partial<ImportRow> = {}): ImportRow => ({
  rowId: 'r1', pageNo: 1, raw: {}, mapped, state: 'ok', issues: [], defaultedFields: [], approved: true,
  ...over,
});

const batch = (over: Partial<ImportBatch> = {}): ImportBatch => ({
  id: 'b1', workspaceId: 'ws1', target: 'donors', source: 'register', label: 'Dan khata',
  state: 'approved', enteredBy: { uid: 'u1', name: 'Sevadar', role: 'Sevadar' },
  createdAt: 1, updatedAt: 1, currentPage: 1, pagePhotoRefs: [], rows: [],
  ...over,
});

describe('buildMemberRecord — no live PIN from a paper name', () => {
  it('creates a credential-revoked record with no pin material at all', () => {
    const rec = buildMemberRecord(row({ fullName: 'A Das', phone: '9876543210', gotra: 'Vatsa' }), 'ws1', 1000);
    expect(rec.pinRevoked).toBe(true);
    expect((rec as any).pin).toBeUndefined();
    expect((rec as any).pinHash).toBeUndefined();
    expect((rec as any).pinSalt).toBeUndefined();
    expect(rec.role).toBe('DEVOTEE');
    expect(rec.sevaIndex).toBe(300);
  });
});

describe('buildOpeningBalanceTx — one honest line, only when verified', () => {
  it('is null when the approver has not verified against the paper book', () => {
    const b = batch({ openingBalance: { amount: 25000, fundLabel: 'General', asOfDate: '2026-04-01', verified: false } });
    expect(buildOpeningBalanceTx(b, 'ws1')).toBeNull();
  });
  it('is null when no opening balance was entered', () => {
    expect(buildOpeningBalanceTx(batch(), 'ws1')).toBeNull();
  });
  it('builds the line with the doctrine wording and no 80G eligibility', () => {
    const b = batch({ openingBalance: { amount: 25000, fundLabel: 'General Fund', asOfDate: '2026-04-01', verified: true } });
    const tx = buildOpeningBalanceTx(b, 'ws1')!;
    expect(tx.category).toBe('Opening Balance');
    expect(tx.type).toBe('Income');
    expect(tx.amount).toBe(25000);
    expect(tx.is80GEligible).toBe(false);
    expect(tx.purpose).toMatch(/carried from paper register/);
  });
});

describe('buildDonationLineTx — paper receipt number, never a minted one', () => {
  it('carries the register’s own receipt no. and stays 80G-ineligible', () => {
    const tx = buildDonationLineTx(
      row({ fullName: 'P Sen', donationAmount: 501, donationDate: '2026-01-15', receiptNo: 'DK-118', purpose: "Father's shraddha" }),
      'dev1', 'ws1'
    );
    expect(tx.referenceNo).toBe('DK-118');
    expect(tx.is80GEligible).toBe(false);
    expect((tx as any).taxReceiptNumber).toBeUndefined();
    expect(tx.handledBy).toMatch(/Bahi-Khata/);
    expect(tx.devoteeId).toBe('dev1');
  });
});

describe('buildNandiRecord — the age-unknown flag survives into the record', () => {
  it('keeps arrival year as addedDate and explains the unknown age in notes', () => {
    const n = buildNandiRecord(
      row({ name: 'Old Gai', tagId: 'GM-0043', breed: 'Desi', sex: 'cow', ageYears: null, ageUnknown: true, arrivalYear: 2019, source: 'rescued', status: 'milking' }),
      5, '2026-10-20'
    );
    expect(n.ageYears).toBe(0);
    expect(n.addedDate).toBe('2019-01-01');
    expect(n.notes).toMatch(/Age unknown/);
    expect(n.notes).toMatch(/Opening record/);
  });
});

describe('executeCommit — donors attach, members count, herd writes', () => {
  const existing: DevoteeMember[] = [{
    id: 'dev-existing', workspaceId: 'ws1', createdAt: 1, updatedAt: 1,
    fullName: 'Meera Devi', phone: '+91 98111 22334', role: 'DEVOTEE', sevaIndex: 300,
    sevaTier: 'Sadharan', gotra: 'Bharadwaja', address: '', activeStatus: 'Active',
    totalDonated: 1000, volunteerHours: 0, qrCodeRef: 'QR-X', joinedDate: '2025-01-01',
  }];

  function fakeDeps(over: Partial<CommitDeps> = {}): CommitDeps & { calls: any } {
    const calls = { added: [] as any[], updated: [] as any[], tx: [] as any[], nandis: [] as any[] };
    return {
      workspaceId: 'ws1',
      existingDevotees: existing,
      addDevotee: (d: any) => { calls.added.push(d); return `dev-new-${calls.added.length}`; },
      updateDevotee: (id: string, u: any) => { calls.updated.push({ id, u }); },
      addTreasuryTransaction: (tx: any) => { calls.tx.push(tx); return true; },
      addNandi: (n: any) => { calls.nandis.push(n); },
      calls,
      ...over,
    };
  }

  it('attaches lifetime + line to the existing devotee and writes one treasury line', () => {
    const deps = fakeDeps();
    const b = batch({
      rows: [row({ fullName: 'Meera Devi', phone: '9811122334', gotra: 'Bharadwaja', attachToId: 'dev-existing', lifetimeDonated: 4000, donationAmount: 501, donationDate: '2026-01-15', paymentMode: 'Cash' })],
    });
    const s = executeCommit(b, deps);
    expect(deps.calls.added.length).toBe(0); // no twin person created
    expect(deps.calls.updated).toEqual([{ id: 'dev-existing', u: { totalDonated: 1000 + 4000 + 501 } }]);
    expect(deps.calls.tx.length).toBe(1);
    expect(s.added).toBe(1);
    expect(s.treasuryLines).toBe(1);
  });

  it('creates a new donor when there is no match, with lifetime on the person', () => {
    const deps = fakeDeps();
    const b = batch({
      rows: [row({ fullName: 'New Donor', phone: '9000000009', gotra: 'Vatsa', lifetimeDonated: 2100, donationAmount: 0 })],
    });
    const s = executeCommit(b, deps);
    expect(deps.calls.added.length).toBe(1);
    expect(deps.calls.added[0].pinRevoked).toBe(true);
    expect(deps.calls.updated[0].u.totalDonated).toBe(2100);
    expect(s.treasuryLines).toBe(0);
  });

  it('writes the verified opening balance exactly once per batch', () => {
    const deps = fakeDeps();
    const b = batch({
      rows: [],
      openingBalance: { amount: 9000, fundLabel: 'General', asOfDate: '2026-04-01', verified: true },
    });
    const s = executeCommit(b, deps);
    expect(s.openingBalanceWritten).toBe(true);
    expect(deps.calls.tx.filter((t: any) => t.category === 'Opening Balance').length).toBe(1);
  });

  it('members: counts only rows the store actually accepted', () => {
    const deps = fakeDeps({ addDevotee: (() => { let n = 0; return () => (++n === 2 ? false : `dev-${n}`); })() as any });
    const b = batch({
      target: 'members',
      rows: [
        row({ fullName: 'A', phone: '9000000020', gotra: 'Vatsa' }),
        row({ fullName: 'B', phone: '9000000021', gotra: 'Vatsa' }),
        row({ fullName: 'C', phone: '9000000022', gotra: 'Vatsa' }, { rowId: 'r3' }),
      ],
    });
    const s = executeCommit(b, deps);
    expect(s.added).toBe(2);
  });

  it('herd: writes through addNandi and counts duplicates kept out', () => {
    const deps = fakeDeps();
    const b = batch({
      target: 'herd',
      rows: [
        row({ name: 'Gai A', tagId: 'GM-0001', breed: 'Gir', sex: 'cow', ageYears: 5, source: 'donated', status: 'milking', arrivalYear: null, ageUnknown: false }),
        row({ name: 'Gai A copy', tagId: 'GM-0001' }, { rowId: 'r2', state: 'duplicate', approved: false }),
      ],
    });
    const s = executeCommit(b, deps);
    expect(deps.calls.nandis.length).toBe(1);
    expect(s.added).toBe(1);
    expect(s.skippedDuplicates).toBe(1);
  });

  it('unapproved and non-ok rows never reach the writers', () => {
    const deps = fakeDeps();
    const b = batch({
      target: 'members',
      rows: [
        row({ fullName: 'A', phone: '9000000030', gotra: 'Vatsa' }, { approved: false }),
        row({ fullName: 'B', phone: '9000000031', gotra: 'Vatsa' }, { rowId: 'r2', state: 'needs_fix' }),
      ],
    });
    const s = executeCommit(b, deps);
    expect(s.added).toBe(0);
  });
});
