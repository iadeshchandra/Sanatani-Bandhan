/**
 * subscriptionAdmin.test.ts — QUEUED #24.
 * Pure tests for the owner expiry sweep + extension math:
 * dueness (grace respected, idempotent), Pro/org classification,
 * and the Fix #4-style endDate extension.
 */
import {
  isDueForExpiry,
  findDueSubscriptions,
  extendedEndDateIso,
  buildExpireUpdate,
  buildExtendUpdate,
  storedStatusOf,
  type SubscriptionAdminDoc,
} from '../subscriptionAdmin';

const DAY = 86400000;
const NOW = Date.parse('2026-10-20T12:00:00Z');
const iso = (ms: number) => new Date(ms).toISOString();

const org = (over: Partial<SubscriptionAdminDoc> = {}): SubscriptionAdminDoc => ({
  id: 'ws_1',
  workspaceId: 'ws_1',
  planId: 'STANDARD',
  status: 'active',
  endDate: iso(NOW - 30 * DAY),
  ...over,
});
const pro = (over: Partial<SubscriptionAdminDoc> = {}): SubscriptionAdminDoc => ({
  id: 'uid_pro_1',
  workspaceId: 'uid_pro_1',
  providerUid: 'uid_pro_1',
  kind: 'pro',
  planId: 'purohit_pro',
  status: 'active',
  endDate: iso(NOW - 30 * DAY),
  ...over,
});

describe('isDueForExpiry', () => {
  it('is due: org plan past endDate AND past the 7-day grace, still stored active', () => {
    expect(isDueForExpiry(org(), NOW)).toBe(true);
    expect(isDueForExpiry(org({ endDate: iso(NOW - 8 * DAY) }), NOW)).toBe(true);
  });

  it('is due: Pro subscription past grace, classified from a personal doc', () => {
    expect(isDueForExpiry(pro(), NOW)).toBe(true);
  });

  it('is NOT due inside the grace window — grace is a promise, never swept early', () => {
    expect(isDueForExpiry(org({ endDate: iso(NOW - 1 * DAY) }), NOW)).toBe(false);
    expect(isDueForExpiry(org({ endDate: iso(NOW - 6 * DAY) }), NOW)).toBe(false);
    expect(isDueForExpiry(pro({ endDate: iso(NOW - 3 * DAY) }), NOW)).toBe(false);
  });

  it('is NOT due while the paid period is still running', () => {
    expect(isDueForExpiry(org({ endDate: iso(NOW + 20 * DAY) }), NOW)).toBe(false);
  });

  it('is NOT due when already expired — the sweep is idempotent', () => {
    expect(isDueForExpiry(org({ status: 'expired' }), NOW)).toBe(false);
    expect(isDueForExpiry(pro({ status: 'expired' }), NOW)).toBe(false);
  });

  it('is NOT due when cancelled, whatever the dates say', () => {
    expect(isDueForExpiry(org({ status: 'cancelled' }), NOW)).toBe(false);
  });

  it('is NOT due without an endDate (lifetime doc)', () => {
    expect(isDueForExpiry(org({ endDate: null }), NOW)).toBe(false);
    expect(isDueForExpiry(org({ endDate: undefined }), NOW)).toBe(false);
  });

  it('treats a missing stored status as active (legacy doc) and can be due', () => {
    const legacy = org();
    delete legacy.status;
    expect(storedStatusOf(legacy)).toBe('active');
    expect(isDueForExpiry(legacy, NOW)).toBe(true);
  });

  it('accepts epoch-ms endDates', () => {
    expect(isDueForExpiry(org({ endDate: NOW - 30 * DAY }), NOW)).toBe(true);
    expect(isDueForExpiry(org({ endDate: NOW + DAY }), NOW)).toBe(false);
  });

  it('handles null/undefined docs', () => {
    expect(isDueForExpiry(null, NOW)).toBe(false);
    expect(isDueForExpiry(undefined, NOW)).toBe(false);
  });
});

describe('findDueSubscriptions', () => {
  it('returns only the due rows from a mixed list, org and Pro together', () => {
    const rows = findDueSubscriptions([
      org({ id: 'ws_due', workspaceId: 'ws_due' }),
      pro(),
      org({ id: 'ws_grace', workspaceId: 'ws_grace', endDate: iso(NOW - 2 * DAY) }),
      org({ id: 'ws_live', workspaceId: 'ws_live', endDate: iso(NOW + 90 * DAY) }),
      org({ id: 'ws_done', workspaceId: 'ws_done', status: 'expired' }),
      org({ id: 'ws_life', workspaceId: 'ws_life', endDate: null }),
    ], NOW);
    expect(rows.map((r) => r.id).sort()).toEqual(['uid_pro_1', 'ws_due']);
  });

  it('classifies Pro distinctly (kind + provider subject) and org by workspace', () => {
    const [p] = findDueSubscriptions([pro()], NOW);
    expect(p.kind).toBe('pro');
    expect(p.subject).toBe('uid_pro_1');
    expect(p.planId).toBe('purohit_pro');
    const [o] = findDueSubscriptions([org()], NOW);
    expect(o.kind).toBe('org');
    expect(o.subject).toBe('ws_1');
  });

  it('classifies a Pro doc by planId even without the kind marker', () => {
    const bare = pro({ kind: undefined });
    const [row] = findDueSubscriptions([bare], NOW);
    expect(row.kind).toBe('pro');
  });

  it('sorts most-overdue first and reports days overdue + normalized endDate', () => {
    const rows = findDueSubscriptions([
      org({ id: 'a', workspaceId: 'a', endDate: iso(NOW - 10 * DAY) }),
      org({ id: 'b', workspaceId: 'b', endDate: iso(NOW - 40 * DAY) }),
    ], NOW);
    expect(rows.map((r) => r.id)).toEqual(['b', 'a']);
    expect(rows[0].daysOverdue).toBe(40);
    expect(rows[0].endDate).toBe(iso(NOW - 40 * DAY));
  });

  it('empty in, empty out', () => {
    expect(findDueSubscriptions([], NOW)).toEqual([]);
  });
});

describe('extendedEndDateIso', () => {
  it('adds whole months to the endDate', () => {
    expect(extendedEndDateIso('2026-10-19T00:00:00.000Z', 1)).toBe('2026-11-19T00:00:00.000Z');
    expect(extendedEndDateIso('2026-10-19T00:00:00.000Z', 12)).toBe('2027-10-19T00:00:00.000Z');
  });

  it('serves the Audit Fix #4 correction: a 1-month annual endDate + 11 months = the full year', () => {
    // Pre-fix claimApprove wrote annual plans with a 1-month endDate
    // (approved 2026-10-19 → endDate 2026-11-19). +11 months restores the
    // 12 months the member actually paid for.
    expect(extendedEndDateIso('2026-11-19T00:00:00.000Z', 11)).toBe('2027-10-19T00:00:00.000Z');
  });

  it('rejects missing/unparseable endDates and out-of-range month counts', () => {
    expect(extendedEndDateIso(null, 6)).toBeNull();
    expect(extendedEndDateIso(undefined, 6)).toBeNull();
    expect(extendedEndDateIso('not-a-date', 6)).toBeNull();
    expect(extendedEndDateIso('2026-10-19T00:00:00.000Z', 0)).toBeNull();
    expect(extendedEndDateIso('2026-10-19T00:00:00.000Z', -3)).toBeNull();
    expect(extendedEndDateIso('2026-10-19T00:00:00.000Z', 2.5)).toBeNull();
    expect(extendedEndDateIso('2026-10-19T00:00:00.000Z', 61)).toBeNull();
    expect(extendedEndDateIso('2026-10-19T00:00:00.000Z', Number.NaN)).toBeNull();
  });
});

describe('update builders', () => {
  it('buildExpireUpdate flips status and stamps expiredAt', () => {
    expect(buildExpireUpdate('2026-10-20T12:00:00.000Z')).toEqual({
      status: 'expired',
      expiredAt: '2026-10-20T12:00:00.000Z',
    });
  });

  it('buildExtendUpdate reactivates an expired doc and clears the stamp', () => {
    const upd = buildExtendUpdate(
      { status: 'expired', endDate: iso(NOW - 30 * DAY) },
      6,
    );
    expect(upd).not.toBeNull();
    expect(upd!.status).toBe('active');
    expect(upd!.expiredAt).toBeNull();
    expect(upd!.endDate).toBe(extendedEndDateIso(iso(NOW - 30 * DAY), 6));
  });

  it('buildExtendUpdate is null for lifetime docs (nothing to extend)', () => {
    expect(buildExtendUpdate({ status: 'active', endDate: null }, 6)).toBeNull();
    expect(buildExtendUpdate(null, 6)).toBeNull();
  });
});
