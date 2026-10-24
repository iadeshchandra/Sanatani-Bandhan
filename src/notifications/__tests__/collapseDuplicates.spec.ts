/**
 * collapseDuplicates.spec.ts — QUEUED #43.
 * ============================================================================
 * Read-time collapse of stored duplicate notifications + the badge law:
 * the unread count derived from the collapsed list must equal the
 * unread the devotee sees in that list. Before #43 the store could
 * hold ~21 copies of one "wallet running low" bell (watcher re-fires),
 * every surface rendered all of them, and the three read paths
 * (limit-80 live hook, unlimited center hook, attention-only summary)
 * each produced a different number.
 *
 * AMENDMENT — WORLD-READINESS B2 / Exhibit 5 (2026-10-24): #43 treated
 * each DAY's wallet-low bell as a separate notice ("the key carries the
 * day"). The owner's own Suchana then showed 4+ identical "wallet almost
 * empty" rows — one per day his wallet sat low — and he flagged the pile
 * itself as the defect. For a CONTINUING CONDITION the day is a re-fire
 * epoch, not a new event: the wallet-low family now folds across days
 * (collapseKeyFor DEDUPE_FAMILY_FOLDS) and the emitter keys it stably.
 * The day-carries-identity principle SURVIVES where it is true — tithi
 * lead buckets ("in 4 days" ≠ "in 2 days") and the no-dedupeKey fallback
 * still key by day, and their pins below are unchanged.
 */
import {
  collapseDuplicateItems,
  collapseKeyFor,
  collapseSiblingIds,
  groupCenterItems,
  summarizeForHeader,
} from '../uiTypes';
import type { NotificationItem } from '../types';

let seq = 0;
function item(over: Partial<NotificationItem> & { id?: string }): NotificationItem {
  seq += 1;
  return {
    id: over.id ?? `n-${seq}`,
    uid: 'u1',
    kind: 'wallet',
    priority: 'important',
    title: { en: 'Seva Wallet is running low', bn: 'সেবা ওয়ালেটে অর্থ কম', hi: 'सेवा वॉलेट में धन कम' },
    body: { en: 'Balance is ৳0. Top up when you can.', bn: 'ব্যালেন্স ৳০।', hi: 'शेष ৳0।' },
    dedupeKey: 'lowbalance:2026-10-20',
    createdAt: 1_000_000 + seq * 1000,
    updatedAt: 1_000_000 + seq * 1000,
    read: false,
    acknowledged: false,
    groupedCount: 1,
    quietHold: false,
    holdUntil: null,
    routes: ['inapp'],
    decision: {
      ping: false,
      inApp: true,
      persistent: false,
      holdUntil: null,
      holdReason: null,
      digestCandidate: false,
      digestWindow: null,
    },
    ...over,
  } as NotificationItem;
}

/** The audit inbox: 21 copies of one wallet-low bell + friends. */
function auditInbox(): NotificationItem[] {
  const rows: NotificationItem[] = [];
  for (let i = 0; i < 21; i++) {
    rows.push(
      item({
        id: `low-${i}`,
        createdAt: 2_000_000 + i * 60_000,
        updatedAt: 2_000_000 + i * 60_000,
        read: i < 20, // 20 read copies, 1 unread — the row is still unread news
      }),
    );
  }
  // Same observance, same lead-time bucket, three stored copies.
  for (let i = 0; i < 3; i++) {
    rows.push(
      item({
        id: `tithi-${i}`,
        kind: 'suchana',
        priority: 'gentle',
        title: { en: '🪔 A gentle tithi reminder', bn: '🪔 তিথি-স্মরণ', hi: '🪔 तिथि-स्मरण' },
        body: { en: 'Ekadashi is in 2 days', bn: '২ দিন পর একাদশী', hi: 'एकादशी 2 दिन बाद' },
        dedupeKey: 'nudge-tithi-ekadashi-2026-10-22-d2',
        createdAt: 3_000_000 + i * 60_000,
        updatedAt: 3_000_000 + i * 60_000,
      }),
    );
  }
  // Yesterday's low bell — a different DAY key, but (post Exhibit-5
  // amendment) the SAME continuing condition: it folds into the family.
  rows.push(item({ id: 'low-yesterday', dedupeKey: 'lowbalance:2026-10-19', createdAt: 500_000, updatedAt: 500_000 }));
  // An unrelated order bell.
  rows.push(
    item({
      id: 'order-1',
      kind: 'seva_order',
      dedupeKey: 'order:ord-9:completed',
      title: { en: 'Seva complete', bn: 'সেবা সম্পূর্ণ', hi: 'सेवा पूर्ण' },
      createdAt: 4_000_000,
      updatedAt: 4_000_000,
    }),
  );
  return rows.sort((a, b) => b.createdAt - a.createdAt);
}

describe('collapseDuplicateItems — stored duplicates fold to one row', () => {
  test('21 copies of the wallet-low bell become ONE row, still unread, count summed', () => {
    const collapsed = collapseDuplicateItems(auditInbox());
    const lows = collapsed.filter((i) => i.dedupeKey === 'lowbalance:2026-10-20');
    expect(lows).toHaveLength(1);
    expect(lows[0].id).toBe('low-20'); // newest copy represents
    expect(lows[0].read).toBe(false); // one unread copy ⇒ the row is unread
    // 21 same-day copies + yesterday's folded copy (Exhibit-5 amendment).
    expect(lows[0].groupedCount).toBe(22);
  });

  test('when every copy is read, the collapsed row is read', () => {
    const rows = [item({ id: 'a', read: true }), item({ id: 'b', read: true })];
    const collapsed = collapseDuplicateItems(rows);
    expect(collapsed).toHaveLength(1);
    expect(collapsed[0].read).toBe(true);
  });

  test('same observance + same bucket folds; different bucket stays a separate notice', () => {
    const collapsed = collapseDuplicateItems(auditInbox());
    const tithis = collapsed.filter((i) => (i.dedupeKey ?? '').startsWith('nudge-tithi-'));
    expect(tithis).toHaveLength(1); // 3 stored copies of d2 → 1 row

    const twoBuckets = collapseDuplicateItems([
      item({ id: 'd4', dedupeKey: 'nudge-tithi-ekadashi-2026-10-22-d4' }),
      item({ id: 'd2', dedupeKey: 'nudge-tithi-ekadashi-2026-10-22-d2' }),
    ]);
    expect(twoBuckets).toHaveLength(2); // "in 4 days" ≠ "in 2 days"
  });

  test('different days of the wallet-low bell FOLD (Exhibit-5 amendment: one continuing condition)', () => {
    const collapsed = collapseDuplicateItems(auditInbox());
    const lows = collapsed.filter((i) => (i.dedupeKey ?? '').startsWith('lowbalance'));
    expect(lows).toHaveLength(1); // today + yesterday are one row now
  });

  test('fallback key (no dedupeKey): kind + subject + title + civil day', () => {
    const day = new Date(2026, 9, 20, 10, 0, 0).getTime();
    const mk = (id: string, at: number) =>
      item({ id, dedupeKey: '', createdAt: at, updatedAt: at, payload: { claimId: 'c1' } });
    const same = collapseDuplicateItems([mk('x1', day), mk('x2', day + 3600_000)]);
    expect(same).toHaveLength(1);
    const otherDay = collapseDuplicateItems([mk('y1', day), mk('y2', day + 24 * 3600_000)]);
    expect(otherDay).toHaveLength(2);
  });

  test('distinct logical notices are never merged', () => {
    const collapsed = collapseDuplicateItems(auditInbox());
    expect(collapsed.find((i) => i.id === 'order-1')).toBeTruthy();
    // 26 stored rows → 3 logical rows (wallet-low family folds to one).
    expect(collapsed).toHaveLength(3);
  });

  test('the grouped center view shows the wallet rows folded — 1, not 22', () => {
    const collapsed = collapseDuplicateItems(auditInbox());
    const groups = groupCenterItems(collapsed);
    const walletRows = groups
      .flatMap((g) => g.items)
      .filter((i) => i.kind === 'wallet');
    expect(walletRows).toHaveLength(1); // the whole family — not 22
  });
});

describe('badge law — counts derive from the collapsed list', () => {
  test('unread over the collapsed list is the number the devotee sees', () => {
    const collapsed = collapseDuplicateItems(auditInbox());
    const unread = collapsed.filter((i) => !i.read).length;
    // wallet-low family (unread), tithi bucket (unread), order bell
    // (unread) — 3, not 26 and not 4.
    expect(unread).toBe(3);
    const summary = summarizeForHeader(collapsed);
    expect(summary.attention + summary.digest).toBe(unread);
    expect(summary.attention).toBe(2); // wallet family + order (important)
    expect(summary.digest).toBe(1); // tithi (gentle)
  });

  test('marking the representative read settles every copy (sibling ids)', () => {
    const raw = auditInbox();
    const ids = collapseSiblingIds(raw, 'low-20');
    expect(ids).toHaveLength(22); // 21 same-day + yesterday's folded copy
    expect(ids).toContain('low-0');
    expect(ids).toContain('low-yesterday');
    // After marking those ids read, the collapse reads as read.
    const marked = raw.map((i) => (ids.includes(i.id) ? { ...i, read: true } : i));
    const collapsed = collapseDuplicateItems(marked);
    const low = collapsed.find((i) => i.dedupeKey === 'lowbalance:2026-10-20');
    expect(low?.read).toBe(true);
  });

  test('collapseKeyFor prefers the stable dedupeKey', () => {
    expect(collapseKeyFor(item({ dedupeKey: 'order:o1:paid' }))).toBe('dk:order:o1:paid');
    expect(collapseKeyFor(item({ dedupeKey: '' }))).toMatch(/^fb:wallet:/);
  });
});
