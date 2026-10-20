import {
  buildReversalTx, checkUndoGuards, executeUndo, findOriginalTxId,
  REVERSAL_CATEGORY,
} from '../undo';
import { createManifestRecorder, manifestHasWrites } from '../commitManifest';
import {
  accuracyStats, buildVerification, freshSpotChecks, pickSpotCheckRows,
} from '../verification';
import type { ImportBatch, ImportRow } from '../types';

/* Phase 2 trust system: undo reverses exactly what the manifest
 * recorded — money by visible counter-entry, never erasure — and the
 * verification report's numbers come from the batch itself. */

const actor = { uid: 'u-trustee', name: 'Trustee Ji', role: 'Trustee' };

const manifest = {
  batchId: 'b1',
  committedAt: 1000,
  committedBy: actor,
  createdNandiIds: [] as string[],
  createdDevoteeIds: ['d-new'],
  devoteeChanges: [{ devoteeId: 'd-old', beforeTotalDonated: 1000, afterTotalDonated: 6000 }],
  donationLines: [
    { amount: 5000, date: '2026-01-05', devoteeId: 'd-old', devoteeName: 'Old Donor', referenceNo: 'R-9' },
  ],
  openingBalance: { amount: 20000, date: '2026-01-01', fundLabel: 'General' },
};

const batch: ImportBatch = {
  id: 'b1', workspaceId: 'ws1', target: 'donors', source: 'photo',
  label: 'Dan khata — 2026-01', state: 'committed', enteredBy: actor,
  createdAt: 1, updatedAt: 2, currentPage: 1, pagePhotoRefs: [], rows: [],
  manifest,
};

describe('manifest recorder', () => {
  it('merges totals first-before / last-after and drops created people from changes', () => {
    const rec = createManifestRecorder('b9', actor, 5);
    rec.record({ kind: 'devotee-created', id: 'd-x' });
    rec.record({ kind: 'devotee-total', devoteeId: 'd-x', before: 0, after: 700 });
    rec.record({ kind: 'devotee-total', devoteeId: 'd-y', before: 100, after: 300 });
    rec.record({ kind: 'devotee-total', devoteeId: 'd-y', before: 100, after: 450 });
    const m = rec.build();
    expect(m.createdDevoteeIds).toEqual(['d-x']);
    expect(m.devoteeChanges).toEqual([
      { devoteeId: 'd-y', beforeTotalDonated: 100, afterTotalDonated: 450 },
    ]);
    expect(manifestHasWrites(m)).toBe(true);
    expect(manifestHasWrites(createManifestRecorder('b0', actor).build())).toBe(false);
  });
});

describe('reversal builders', () => {
  it('a donation reversal is a visible Expense naming batch + paper receipt', () => {
    const tx = buildReversalTx(manifest.donationLines[0], batch, 'ws1', {
      todayISO: '2026-02-01', originalTxId: 'tx-orig',
    });
    expect(tx.type).toBe('Expense');
    expect(tx.category).toBe(REVERSAL_CATEGORY);
    expect(tx.amount).toBe(5000);
    expect(tx.is80GEligible).toBe(false);
    expect(tx.purpose).toContain('Dan khata — 2026-01');
    expect(tx.purpose).toContain('R-9');
    expect(tx.purpose).toContain('tx-orig');
  });

  it('findOriginalTxId matches the commit fingerprints', () => {
    const treasury = [
      { id: 'tx-other', category: 'Donation', handledBy: 'Desk entry', amount: 5000, date: '2026-01-05', devoteeName: 'Old Donor' },
      { id: 'tx-orig', category: 'Donation', handledBy: 'Bahi-Khata (paper register)', amount: 5000, date: '2026-01-05', devoteeName: 'Old Donor', referenceNo: 'R-9' },
    ];
    expect(findOriginalTxId(treasury, manifest.donationLines[0])).toBe('tx-orig');
  });
});

describe('undo guards + executor', () => {
  const live = {
    devotees: [
      { id: 'd-new', totalDonated: 0 },
      { id: 'd-old', totalDonated: 6000 },
    ],
    herdIds: [] as string[],
    donationRefs: [] as { devoteeId?: string; donorId?: string }[],
  };

  it('a clean batch undoes fully: delete, restore, two counter-entries', () => {
    const guard = checkUndoGuards({ manifest, ...live });
    expect(guard.blockers).toEqual([]);
    const deleted: string[] = [];
    const updates: [string, any][] = [];
    const txs: any[] = [];
    const res = executeUndo(batch, guard, {
      workspaceId: 'ws1',
      deleteDevotee: (id) => { deleted.push(id); },
      updateDevotee: (id, u) => { updates.push([id, u]); },
      addTreasuryTransaction: (tx) => { txs.push(tx); return true; },
      todayISO: '2026-02-01',
    });
    expect(deleted).toEqual(['d-new']);
    expect(updates).toEqual([['d-old', { totalDonated: 1000 }]]);
    expect(res.reversalsWritten).toBe(2); // donation line + opening balance
    expect(txs.every((t) => t.category === REVERSAL_CATEGORY)).toBe(true);
    expect(res.blocked).toEqual([]);
  });

  it('a created person with post-import donations BLOCKS their deletion', () => {
    const guard = checkUndoGuards({
      manifest, ...live, donationRefs: [{ devoteeId: 'd-new' }],
    });
    expect(guard.blockers.length).toBe(1);
    expect(guard.deletableDevoteeIds).toEqual([]);
  });

  it('drifted lifetime totals BLOCK the restore (never erase real gifts)', () => {
    const guard = checkUndoGuards({
      manifest,
      ...live,
      devotees: [
        { id: 'd-new', totalDonated: 0 },
        { id: 'd-old', totalDonated: 7500 }, // grew since import
      ],
    });
    expect(guard.blockers.length).toBe(1);
    expect(guard.restorableChanges).toEqual([]);
  });

  it('when the person side is blocked, donation reversals wait — the opening line still reverses', () => {
    const guard = checkUndoGuards({
      manifest, ...live, donationRefs: [{ devoteeId: 'd-new' }],
    });
    const txs: any[] = [];
    const res = executeUndo(batch, guard, {
      workspaceId: 'ws1',
      deleteDevotee: () => {},
      updateDevotee: () => {},
      addTreasuryTransaction: (tx) => { txs.push(tx); return true; },
      todayISO: '2026-02-01',
    });
    expect(res.blocked.length).toBe(1);
    expect(txs.length).toBe(1); // opening balance only
    expect(txs[0].purpose).toContain('opening balance');
  });

  it('a missing created person is a warning, not a blocker', () => {
    const guard = checkUndoGuards({
      manifest, ...live, devotees: [{ id: 'd-old', totalDonated: 6000 }],
    });
    expect(guard.blockers).toEqual([]);
    expect(guard.warnings.length).toBeGreaterThan(0);
  });
});

describe('verification report', () => {
  const mkRow = (rowId: string, pageNo: number, amount: number, cells?: ImportRow['cells']): ImportRow => ({
    rowId, pageNo, raw: {}, mapped: { fullName: 'X', donationAmount: amount },
    state: 'ok', issues: [], defaultedFields: [], approved: true, cells,
  });
  const box = { x0: 0, y0: 0, x1: 0.5, y1: 0.1 };

  const vbatch: ImportBatch = {
    ...batch,
    pageTotals: { 1: 1500, 2: 900 },
    pagePhotoRefs: [{ pageNo: 1, ref: 'vault://a' }, { pageNo: 2, ref: 'vault://b' }],
    rows: [
      mkRow('r1', 1, 1000), mkRow('r2', 1, 500), mkRow('r3', 2, 800),
      { ...mkRow('r4', 2, 300), state: 'excluded', approved: false },
    ],
  };

  it('double-key check: keyed page totals vs approved row sums', () => {
    const v = buildVerification(vbatch);
    expect(v.keyedTotal).toBe(2400);
    expect(v.approvedLineTotal).toBe(2300);
    expect(v.totalsMatch).toBe(false);
    expect(v.mismatchedPages).toEqual([2]);
    expect(v.rowsCommitted).toBe(3);
    expect(v.rowsExcluded).toBe(1);
    expect(v.pagesPhotographed).toBe(2);
  });

  it('accuracy: green-untouched counts clean; confirmed or non-green counts touched', () => {
    const row = mkRow('rx', 3, 0, {
      a: { text: 'x', confidence: 95, cls: 'green', reasons: [], bbox: box },
      b: { text: 'y', confidence: 95, cls: 'green', reasons: [], bbox: box, confirmed: true, touched: true },
      c: { text: '500', confidence: 60, cls: 'red', reasons: [], bbox: box },
    });
    const stats = accuracyStats([row]);
    expect(stats.totalCells).toBe(3);
    expect(stats.autoGreen).toBe(1);
    expect(stats.touched).toBe(2);
    expect(stats.perPage).toEqual([{ pageNo: 3, total: 3, autoGreen: 1, touched: 2 }]);
  });

  it('spot checks are deterministic and capped at three', () => {
    const a = pickSpotCheckRows(vbatch).map((r) => r.rowId);
    const b = pickSpotCheckRows(vbatch).map((r) => r.rowId);
    expect(a).toEqual(b);
    expect(a.length).toBe(3);
    expect(freshSpotChecks(vbatch).every((c) => c.ok === false)).toBe(true);
  });
});
