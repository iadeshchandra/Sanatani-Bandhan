/**
 * suchanaControls.spec.ts — Blueprint D, deliverable 6: the Suchana
 * controls, enforced in the ONE routing brain (decideRouting), not
 * per sender. The brief's tests, pinned:
 *   - the daily cap holds (important held to the next day with
 *     holdReason 'cap'; gentle joins no digest past the cap);
 *   - quiet hours hold non-urgent items;
 *   - SOS bypasses BOTH (critical: no cap, no quiet, no toggle —
 *     even an explicit kindToggles.sos = false is not honoured);
 *   - a category switched off is silent (inApp false — the item is
 *     not written at all);
 *   - kindEnabled / dailyCapFor sanitizers behave exactly;
 *   - the "Why am I seeing this?" line names the truth for each
 *     delivery shape.
 */
import { decideRouting, nextLocalMidnight } from '../engine';
import {
  DEFAULT_PREFS,
  dailyCapFor,
  kindEnabled,
  mergePrefs,
  type NotificationPrefs,
} from '../preferences';
import { whyLine } from '../whyLine';
import type { NotificationItem, NotifyEvent } from '../types';

const ev = (over: Partial<NotifyEvent> = {}): NotifyEvent => ({
  kind: 'org',
  priority: 'important',
  title: { en: 'T', bn: 'ট', hi: 'ट' },
  body: { en: 'B', bn: 'ব', hi: 'ब' },
  dedupeKey: 'k-1',
  ...over,
});

const prefs = (over: Partial<NotificationPrefs> = {}): NotificationPrefs => ({
  ...DEFAULT_PREFS,
  quietHours: { start: '22:00', end: '06:00' },
  ...over,
});

// 2026-10-22 11:00 local — safely outside the 22:00–06:00 quiet window
const DAYTIME = new Date(2026, 9, 22, 11, 0, 0).getTime();
// 2026-10-22 23:30 local — inside quiet hours
const NIGHT = new Date(2026, 9, 22, 23, 30, 0).getTime();

describe('the daily cap', () => {
  it('holds an important item to the next local midnight, marked cap', () => {
    const d = decideRouting(ev(), prefs({ dailyCap: 5 }), DAYTIME, { deliveredToday: 5 });
    expect(d.inApp).toBe(true); // held, never dropped
    expect(d.ping).toBe(false);
    expect(d.holdReason).toBe('cap');
    expect(d.suppressed).toBe('cap');
    expect(d.holdUntil).toBe(nextLocalMidnight(DAYTIME));
  });

  it('under the cap the same item flows normally', () => {
    const d = decideRouting(ev(), prefs({ dailyCap: 5 }), DAYTIME, { deliveredToday: 4 });
    expect(d.holdReason).toBeNull();
    expect(d.ping).toBe(true);
  });

  it('a gentle item past the cap joins no digest but still lands in-app', () => {
    const d = decideRouting(ev({ priority: 'gentle' }), prefs({ dailyCap: 3 }), DAYTIME, {
      deliveredToday: 3,
    });
    expect(d.inApp).toBe(true);
    expect(d.digestCandidate).toBe(false);
    expect(d.suppressed).toBe('cap');
  });

  it('cap 0 / absent means no cap at all (and no deliveredToday consults)', () => {
    expect(decideRouting(ev(), prefs({ dailyCap: 0 }), DAYTIME, { deliveredToday: 999 }).holdReason).toBeNull();
    expect(decideRouting(ev(), prefs(), DAYTIME, { deliveredToday: 999 }).holdReason).toBeNull();
    // without a count, the engine never invents one
    expect(decideRouting(ev(), prefs({ dailyCap: 5 }), DAYTIME).holdReason).toBeNull();
  });

  it('silent priority is exempt from the cap (in-app record-keeping is not outreach)', () => {
    const d = decideRouting(ev({ priority: 'silent' }), prefs({ dailyCap: 1 }), DAYTIME, {
      deliveredToday: 50,
    });
    expect(d.inApp).toBe(true);
    expect(d.suppressed ?? null).toBeNull();
  });
});

describe('quiet hours + SOS', () => {
  it('quiet hours hold an important item with holdReason quiet', () => {
    const d = decideRouting(ev(), prefs(), NIGHT);
    expect(d.ping).toBe(false);
    expect(d.holdReason).toBe('quiet');
    expect(d.inApp).toBe(true);
  });

  it('SOS-critical bypasses quiet hours AND the cap AND an off toggle', () => {
    const hardPrefs = prefs({ dailyCap: 1, kindToggles: { sos: false } });
    const d = decideRouting(ev({ kind: 'sos', priority: 'critical' }), hardPrefs, NIGHT, {
      deliveredToday: 99,
    });
    expect(d.ping).toBe(true);
    expect(d.inApp).toBe(true);
    expect(d.persistent).toBe(true);
    expect(d.holdUntil).toBeNull();
    expect(d.suppressed ?? null).toBeNull();
  });
});

describe('category toggles', () => {
  it('a switched-off kind is silent — not written at all', () => {
    const d = decideRouting(ev({ kind: 'wallet' }), prefs({ kindToggles: { wallet: false } }), DAYTIME);
    expect(d.inApp).toBe(false);
    expect(d.ping).toBe(false);
    expect(d.suppressed).toBe('category');
  });

  it('kindEnabled: sos is always enabled; legacy categories combine policy + toggle', () => {
    expect(kindEnabled('sos', prefs({ kindToggles: { sos: false } }))).toBe(true);
    expect(kindEnabled('wallet', prefs({ kindToggles: { wallet: false } }))).toBe(false);
    expect(kindEnabled('wallet', prefs())).toBe(true);
    expect(kindEnabled('chat', prefs({ chat: 'off' }))).toBe(false);
    expect(kindEnabled('chat', prefs({ chat: 'off', kindToggles: { chat: true } }))).toBe(false);
    expect(kindEnabled('money_request', prefs({ moneyRequests: 'digest' }))).toBe(true);
    expect(kindEnabled('blessing', prefs({ blessings: false }))).toBe(false);
  });

  it('dailyCapFor sanitizes: only a positive integer survives', () => {
    expect(dailyCapFor(prefs({ dailyCap: 10 }))).toBe(10);
    expect(dailyCapFor(prefs({ dailyCap: 0 }))).toBe(0);
    expect(dailyCapFor(prefs({ dailyCap: -3 }))).toBe(0);
    expect(dailyCapFor(prefs({ dailyCap: 2.5 }))).toBe(2); // sanitized by flooring
    expect(dailyCapFor(prefs())).toBe(0);
    // mergePrefs keeps kindToggles through a save round-trip
    const merged = mergePrefs({ kindToggles: { wallet: false }, dailyCap: 7 });
    expect(merged.kindToggles).toEqual({ wallet: false });
    expect(merged.dailyCap).toBe(7);
  });
});

describe('whyLine', () => {
  const item = (over: Partial<NotificationItem> = {}): NotificationItem => ({
    id: 'i-1',
    uid: 'u-1',
    createdAt: DAYTIME,
    updatedAt: DAYTIME,
    read: false,
    acknowledged: false,
    groupedCount: 1,
    quietHold: false,
    holdUntil: null,
    routes: ['inapp'],
    decision: {
      ping: true,
      inApp: true,
      persistent: false,
      holdUntil: null,
      holdReason: null,
      digestCandidate: false,
      digestWindow: null,
    },
    ...ev(),
    ...over,
  });

  it('an SOS card explains itself by safety, never by a setting', () => {
    const line = whyLine(item({ kind: 'sos', priority: 'critical' }));
    expect(line.en).toContain('SOS always reaches you');
  });

  it('a cap-held card names the daily limit', () => {
    const line = whyLine(
      item({ decision: { ...item().decision, holdReason: 'cap', suppressed: 'cap' } })
    );
    expect(line.en).toContain('daily Suchana limit');
  });

  it('a quiet-held card names the quiet hours', () => {
    const line = whyLine(item({ quietHold: true }));
    expect(line.en).toContain('quiet hours');
  });

  it('an ordinary delivered card names its category as on', () => {
    const line = whyLine(item({ kind: 'wallet' }));
    expect(line.en).toContain('Wallet updates');
    expect(line.en).toContain('on');
  });
});
