/**
 * providerAnalytics.test.ts — audit fix #6 (providerId → providerUid).
 * Every test pins the field-name contract: orders carry `providerUid`.
 */
import {
  PROVIDER_UID_KEY,
  orderProviderUid,
  txnProviderUid,
  isProviderOrder,
  isProviderTxn,
  aggregateOrdersByProvider,
  rankProviders,
} from '../providerAnalytics';

describe('PROVIDER_UID_KEY', () => {
  it('is providerUid', () => {
    expect(PROVIDER_UID_KEY).toBe('providerUid');
  });
});

describe('orderProviderUid', () => {
  it('resolves providerUid from a real order doc shape', () => {
    const order = {
      gigId: 'g1', providerUid: 'uid_abc', clientUid: 'uid_xyz',
      amountGross: 1500, status: 'completed',
    };
    expect(orderProviderUid(order)).toBe('uid_abc');
  });

  it('returns empty string when providerUid is missing (never reads providerId)', () => {
    expect(orderProviderUid({ providerId: 'uid_abc' } as any)).toBe('');
    expect(orderProviderUid({})).toBe('');
    expect(orderProviderUid(null)).toBe('');
    expect(orderProviderUid(undefined)).toBe('');
  });

  it('returns empty string for non-string providerUid', () => {
    expect(orderProviderUid({ providerUid: 123 } as any)).toBe('');
  });
});

describe('txnProviderUid', () => {
  it('prefers providerUid', () => {
    expect(txnProviderUid({ providerUid: 'a', providerId: 'b' })).toBe('a');
  });

  it('falls back to legacy providerId for owner-written txns', () => {
    expect(txnProviderUid({ providerId: 'b' })).toBe('b');
  });

  it('returns empty string when neither exists', () => {
    expect(txnProviderUid({})).toBe('');
  });
});

describe('isProviderOrder / isProviderTxn', () => {
  it('matches on providerUid', () => {
    expect(isProviderOrder({ providerUid: 'u1' }, 'u1')).toBe(true);
    expect(isProviderOrder({ providerUid: 'u1' }, 'u2')).toBe(false);
    expect(isProviderOrder({ providerUid: 'u1' }, '')).toBe(false);
  });

  it('txn matcher tolerates both conventions', () => {
    expect(isProviderTxn({ providerUid: 'u1' }, 'u1')).toBe(true);
    expect(isProviderTxn({ providerId: 'u1' }, 'u1')).toBe(true);
    expect(isProviderTxn({ providerId: 'u1' }, 'u2')).toBe(false);
  });
});

describe('aggregateOrdersByProvider', () => {
  const orders = [
    { providerUid: 'u1', amountGross: 1000, commissionAmount: 120, status: 'completed', createdAt: '2026-10-01T00:00:00Z' },
    { providerUid: 'u1', amountGross: 2000, commissionAmount: 240, status: 'paid', createdAt: '2026-10-05T00:00:00Z' },
    { providerUid: 'u1', amountGross: 500, commissionAmount: 60, status: 'pending_payment', createdAt: '2026-10-06T00:00:00Z' },
    { providerUid: 'u2', amountGross: 3000, commissionAmount: 360, status: 'completed', createdAt: '2026-10-03T00:00:00Z' },
  ];

  it('groups by providerUid (the field orders actually carry)', () => {
    const agg = aggregateOrdersByProvider(orders);
    expect(Object.keys(agg).sort()).toEqual(['u1', 'u2']);
    expect(agg['u1'].orders).toBe(3);
    expect(agg['u2'].orders).toBe(1);
  });

  it('counts gmv/commission only for active statuses', () => {
    const agg = aggregateOrdersByProvider(orders);
    // pending_payment excluded from gmv
    expect(agg['u1'].gmv).toBe(3000);
    expect(agg['u1'].commission).toBe(360);
    expect(agg['u2'].gmv).toBe(3000);
  });

  it('REGRESSION: never creates an undefined key (the old providerId bug)', () => {
    const agg = aggregateOrdersByProvider(orders);
    expect('undefined' in agg).toBe(false);
    expect('' in agg).toBe(false);
  });

  it('skips orders with no resolvable provider', () => {
    const agg = aggregateOrdersByProvider([
      { providerUid: 'u1', amountGross: 100, status: 'completed' },
      { amountGross: 9999, status: 'completed' }, // no providerUid
    ]);
    expect(Object.keys(agg)).toEqual(['u1']);
    expect(agg['u1'].gmv).toBe(100);
  });

  it('tracks lastOrder as the max createdAt', () => {
    const agg = aggregateOrdersByProvider(orders);
    expect(agg['u1'].lastOrder).toBe('2026-10-06T00:00:00Z');
  });

  it('handles non-numeric amounts safely', () => {
    const agg = aggregateOrdersByProvider([
      { providerUid: 'u1', amountGross: 'abc', commissionAmount: null, status: 'completed' },
    ]);
    expect(agg['u1'].gmv).toBe(0);
    expect(agg['u1'].commission).toBe(0);
  });
});

describe('rankProviders', () => {
  it('sorts by gmv descending', () => {
    const ranked = rankProviders(aggregateOrdersByProvider([
      { providerUid: 'u1', amountGross: 100, status: 'completed' },
      { providerUid: 'u2', amountGross: 5000, status: 'completed' },
      { providerUid: 'u3', amountGross: 1000, status: 'completed' },
    ]));
    expect(ranked.map((r) => r.providerUid)).toEqual(['u2', 'u3', 'u1']);
  });

  it('exposes providerUid on each ranked entry', () => {
    const ranked = rankProviders(aggregateOrdersByProvider([
      { providerUid: 'u9', amountGross: 100, status: 'completed' },
    ]));
    expect(ranked[0].providerUid).toBe('u9');
  });
});
