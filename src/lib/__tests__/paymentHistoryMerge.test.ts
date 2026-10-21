/**
 * paymentHistoryMerge.test.ts — QUEUED #54.
 * Pure tests for the Billing history union: both billing streams
 * (legacy upgrade_requests + canonical paymentClaims) normalize into
 * honestly-labelled rows, merge newest-first, and a single stream's
 * failure surfaces as a partial error — never a fake-empty panel.
 */
import {
  timestampMillis,
  requestToHistoryRow,
  claimToHistoryRow,
  mergeHistoryRows,
  combineHistoryStreams,
  type StreamResult,
} from '../paymentHistoryMerge';

const ts = (ms: number) => ({ toMillis: () => ms });

describe('timestampMillis', () => {
  it('handles Firestore Timestamps, Dates, numbers and {seconds}', () => {
    expect(timestampMillis(ts(5000))).toBe(5000);
    expect(timestampMillis(new Date(7000))).toBe(7000);
    expect(timestampMillis(9000)).toBe(9000);
    expect(timestampMillis({ seconds: 11 })).toBe(11000);
  });
  it('returns 0 for missing or unreadable values', () => {
    expect(timestampMillis(null)).toBe(0);
    expect(timestampMillis(undefined)).toBe(0);
    expect(timestampMillis('tomorrow')).toBe(0);
    expect(timestampMillis(NaN)).toBe(0);
  });
});

describe('row normalizers', () => {
  it('maps a legacy upgrade request with an honest source label', () => {
    const row = requestToHistoryRow('abc', {
      requestedPlan: 'STANDARD',
      status: 'PENDING',
      transactionId: '9A7BC8FXYZ',
      paymentMethod: 'bKash',
      timestamp: ts(2000),
    });
    expect(row).toMatchObject({
      id: 'request:abc',
      source: 'request',
      sourceLabel: 'Upgrade request',
      planLabel: 'STANDARD',
      statusLabel: 'PENDING',
      transactionId: '9A7BC8FXYZ',
      methodLabel: 'bKash',
      amountLabel: null,
      timestampMillis: 2000,
    });
  });

  it('maps a payment claim, uppercasing its lowercase status and showing the amount', () => {
    const row = claimToHistoryRow('xyz', {
      plan: 'PREMIUM',
      status: 'approved',
      transactionId: 'TXN42',
      method: 'bd_bkash',
      amount: 2800,
      currency: 'BDT',
      createdAt: ts(3000),
    });
    expect(row).toMatchObject({
      id: 'claim:xyz',
      source: 'claim',
      sourceLabel: 'Plan claim',
      planLabel: 'PREMIUM',
      statusLabel: 'APPROVED',
      transactionId: 'TXN42',
      methodLabel: 'bd_bkash',
      amountLabel: 'BDT 2800',
      timestampMillis: 3000,
    });
  });

  it('degrades missing fields to placeholders instead of undefined', () => {
    const row = claimToHistoryRow('bare', {});
    expect(row.planLabel).toBe('—');
    expect(row.statusLabel).toBe('PENDING');
    expect(row.amountLabel).toBeNull();
    expect(row.timestampMillis).toBe(0);
  });

  it('keeps the two streams’ ids collision-free', () => {
    expect(requestToHistoryRow('1', {}).id).not.toBe(claimToHistoryRow('1', {}).id);
  });
});

describe('mergeHistoryRows', () => {
  it('merges newest-first across both streams', () => {
    const merged = mergeHistoryRows(
      [requestToHistoryRow('a', { timestamp: ts(1000) }), requestToHistoryRow('b', { timestamp: ts(4000) })],
      [claimToHistoryRow('c', { createdAt: ts(3000) })],
    );
    expect(merged.map((r) => r.id)).toEqual(['request:b', 'claim:c', 'request:a']);
  });
});

describe('combineHistoryStreams', () => {
  const okReq: StreamResult = {
    status: 'ok',
    rows: [requestToHistoryRow('a', { timestamp: ts(1000) })],
  };
  const okClaim: StreamResult = {
    status: 'ok',
    rows: [claimToHistoryRow('b', { createdAt: ts(2000) })],
  };
  const errReq: StreamResult = { status: 'error', error: 'requests denied' };
  const errClaim: StreamResult = { status: 'error', error: 'claims denied' };

  it('both ok → merged rows, no errors', () => {
    const out = combineHistoryStreams(okReq, okClaim);
    expect(out.rows.map((r) => r.id)).toEqual(['claim:b', 'request:a']);
    expect(out.fullError).toBeNull();
    expect(out.partialError).toBeNull();
  });

  it('claims fail → request rows survive WITH a partial error (never fake-empty)', () => {
    const out = combineHistoryStreams(okReq, errClaim);
    expect(out.rows).toHaveLength(1);
    expect(out.fullError).toBeNull();
    expect(out.partialError).toBe('claims denied');
  });

  it('requests fail → claim rows survive WITH a partial error', () => {
    const out = combineHistoryStreams(errReq, okClaim);
    expect(out.rows).toHaveLength(1);
    expect(out.fullError).toBeNull();
    expect(out.partialError).toBe('requests denied');
  });

  it('both fail → full error state, no rows, no partial note', () => {
    const out = combineHistoryStreams(errReq, errClaim);
    expect(out.rows).toEqual([]);
    expect(out.fullError).toBe('requests denied');
    expect(out.partialError).toBeNull();
  });

  it('one ok-but-empty + one error → no rows, but the partial error still shows', () => {
    const out = combineHistoryStreams({ status: 'ok', rows: [] }, errClaim);
    expect(out.rows).toEqual([]);
    expect(out.fullError).toBeNull();
    expect(out.partialError).toBe('claims denied');
  });
});
