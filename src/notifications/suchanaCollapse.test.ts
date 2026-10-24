/**
 * suchanaCollapse.test.ts — WORLD-READINESS Batch 2 pins (Exhibit 5).
 *
 * The owner's real Suchana held 4+ identical "Seva Wallet almost empty"
 * rows. Two defects made the pile:
 *   1. GENERATION — notifyLowBalance keyed each day's re-fire as a NEW
 *      logical event (`lowbalance:<day>`), violating the pipeline's own
 *      "dedupeKey is stable per logical event" law. The emitter now uses
 *      the stable family key; episode discipline (one bell per episode,
 *      ≤1 re-fire/24h) stays in lib/walletLowBalance.
 *   2. DISPLAY — the read-time collapse (QUEUED #43) keyed groups by the
 *      dedupeKey verbatim, so legacy per-day rows already stored on
 *      accounts could never fold. collapseKeyFor now folds the
 *      lowbalance family across its day suffixes — and ONLY that family:
 *      for tithi buckets / order statuses the day IS the event identity.
 */
import * as fs from 'fs';
import * as path from 'path';
import { collapseDuplicateItems, collapseKeyFor, collapseSiblingIds } from './uiTypes';
import type { NotificationItem } from './types';

const item = (partial: Partial<NotificationItem>): NotificationItem =>
  ({
    id: 'n1',
    uid: 'u1',
    kind: 'wallet',
    priority: 'important',
    title: { en: 'Seva Wallet almost empty', bn: 'সেবা ওয়ালেট প্রায় শেষ', hi: 'सेवा वॉलेट लगभग खाली' },
    body: { en: '', bn: '', hi: '' },
    dedupeKey: 'lowbalance',
    createdAt: 1_000,
    updatedAt: 1_000,
    read: true,
    acknowledged: true,
    groupedCount: 1,
    quietHold: false,
    holdUntil: null,
    routes: ['inapp'],
    decision: undefined,
    ...partial,
  }) as unknown as NotificationItem;

describe('Exhibit 5 — the wallet-low family folds to ONE row', () => {
  it('legacy per-day keys and the stable key share one collapse key', () => {
    const a = item({ dedupeKey: 'lowbalance:2026-10-20' });
    const b = item({ dedupeKey: 'lowbalance:2026-10-21' });
    const c = item({ dedupeKey: 'lowbalance' });
    expect(collapseKeyFor(a)).toBe('dk:lowbalance');
    expect(collapseKeyFor(b)).toBe(collapseKeyFor(a));
    expect(collapseKeyFor(c)).toBe(collapseKeyFor(a));
  });

  it('four stored copies collapse to one row with the honest total', () => {
    const rows = [
      item({ id: 'd1', dedupeKey: 'lowbalance:2026-10-20', createdAt: 1_000, groupedCount: 2 }),
      item({ id: 'd2', dedupeKey: 'lowbalance:2026-10-21', createdAt: 2_000, groupedCount: 1 }),
      item({ id: 'd3', dedupeKey: 'lowbalance:2026-10-22', createdAt: 3_000, groupedCount: 1, read: false }),
      item({ id: 'd4', dedupeKey: 'lowbalance', createdAt: 4_000, groupedCount: 1 }),
    ];
    const out = collapseDuplicateItems(rows);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('d4'); // newest is the representative
    expect(out[0].groupedCount).toBe(5); // 2+1+1+1 — nothing hidden
    expect(out[0].read).toBe(false); // one unread copy ⇒ the row is unread
  });

  it('marking the folded row read reaches every folded copy', () => {
    const rows = [
      item({ id: 'd1', dedupeKey: 'lowbalance:2026-10-20', createdAt: 1_000 }),
      item({ id: 'd2', dedupeKey: 'lowbalance:2026-10-21', createdAt: 2_000 }),
    ];
    expect(collapseSiblingIds(rows, 'd2').sort()).toEqual(['d1', 'd2']);
  });
});

describe('the fold is family-scoped — other notices keep their identity', () => {
  it('tithi lead-time buckets stay distinct (different notices, by design #43)', () => {
    const d2 = item({ kind: 'suchana', dedupeKey: 'nudge-tithi-ekadashi-d2' });
    const d1 = item({ kind: 'suchana', dedupeKey: 'nudge-tithi-ekadashi-d1' });
    expect(collapseKeyFor(d2)).not.toBe(collapseKeyFor(d1));
    expect(collapseDuplicateItems([d2, d1])).toHaveLength(2);
  });

  it('order status keys stay distinct', () => {
    const a = item({ kind: 'seva_order', dedupeKey: 'order:o1:paid' });
    const b = item({ kind: 'seva_order', dedupeKey: 'order:o1:completed' });
    expect(collapseKeyFor(a)).not.toBe(collapseKeyFor(b));
  });
});

describe('generation layer — the emitter key is stable', () => {
  it('notifyHelpers emits the family key, never a per-day key', () => {
    const src = fs.readFileSync(path.resolve(__dirname, 'notifyHelpers.ts'), 'utf-8');
    expect(src).toContain("'lowBalance', { amount }, 'lowbalance'");
    expect(src).not.toContain('lowbalance:${');
  });
});
