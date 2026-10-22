/**
 * timestamps.test.ts — UI/UX audit U1 pins.
 * =====================================================================
 * Creator membership edges store joinedAt as a Firestore
 * serverTimestamp; the membership reader's raw spread let the
 * Timestamp object pose as the declared `number`, and the directory
 * card printed the literal string "Invalid Date". These tests pin
 * the one coercion point (lib/timestamps): every representation a
 * Firestore read can produce becomes finite epoch millis, and
 * anything unresolvable becomes 0 — the "no known date" sentinel
 * formatters must omit, never print.
 */

import { toMillisSafe, normalizeMembershipDoc } from '../timestamps';

describe('toMillisSafe', () => {
  it('passes finite millis through untouched', () => {
    expect(toMillisSafe(1700000000000)).toBe(1700000000000);
    expect(toMillisSafe(0)).toBe(0);
  });

  it('coerces a Firestore Timestamp (toMillis) to millis', () => {
    const ts = { toMillis: () => 1700000000123 };
    expect(toMillisSafe(ts)).toBe(1700000000123);
  });

  it('coerces a { seconds, nanoseconds } timestamp shape', () => {
    expect(toMillisSafe({ seconds: 1700000000, nanoseconds: 500000000 })).toBe(
      1700000000500
    );
    expect(toMillisSafe({ seconds: 1700000000 })).toBe(1700000000000);
  });

  it('coerces Date objects, and rejects invalid Dates', () => {
    expect(toMillisSafe(new Date(1700000000000))).toBe(1700000000000);
    expect(toMillisSafe(new Date('not a date'))).toBe(0);
  });

  it('treats a pending server timestamp (null) as "no known date"', () => {
    expect(toMillisSafe(null)).toBe(0);
    expect(toMillisSafe(undefined)).toBe(0);
  });

  it('rejects garbage instead of inventing a date', () => {
    expect(toMillisSafe(NaN)).toBe(0);
    expect(toMillisSafe(Infinity)).toBe(0);
    expect(toMillisSafe({})).toBe(0);
    expect(toMillisSafe('garbage')).toBe(0);
    expect(toMillisSafe('')).toBe(0);
    expect(
      toMillisSafe({
        toMillis: () => {
          throw new Error('boom');
        },
      })
    ).toBe(0);
  });

  it('parses numeric and ISO strings', () => {
    expect(toMillisSafe('1700000000000')).toBe(1700000000000);
    expect(toMillisSafe('2023-11-14T22:13:20.000Z')).toBe(1700000000000);
  });
});

describe('normalizeMembershipDoc', () => {
  it('turns a serverTimestamp joinedAt into a finite number', () => {
    const m = normalizeMembershipDoc({
      id: 'WS-1_u1',
      workspaceId: 'WS-1',
      uid: 'u1',
      role: 'Trustee',
      joinedAt: { toMillis: () => 1700000000000 },
    });
    expect(typeof m.joinedAt).toBe('number');
    expect(m.joinedAt).toBe(1700000000000);
    // The card's formatter can never print "Invalid Date" again:
    const rendered = new Date(m.joinedAt).toLocaleDateString(undefined, {
      month: 'short',
      year: 'numeric',
    });
    expect(rendered).not.toBe('Invalid Date');
  });

  it('maps a pending (null) joinedAt to the 0 sentinel', () => {
    const m = normalizeMembershipDoc({ workspaceId: 'WS-1', uid: 'u1', role: 'Devotee', joinedAt: null });
    expect(m.joinedAt).toBe(0);
  });

  it('keeps numeric joinedAt and other fields untouched', () => {
    const m = normalizeMembershipDoc({
      workspaceId: 'WS-1',
      uid: 'u1',
      role: 'Accountant',
      joinedAt: 1690000000000,
      displayName: 'A Sevak',
    });
    expect(m.joinedAt).toBe(1690000000000);
    expect(m.role).toBe('Accountant');
    expect(m.displayName).toBe('A Sevak');
  });

  it('preserves roleExpiresAt null semantics, coerces Timestamp expiries', () => {
    expect(
      normalizeMembershipDoc({ workspaceId: 'W', uid: 'u', role: 'Devotee', joinedAt: 1, roleExpiresAt: null })
        .roleExpiresAt
    ).toBeNull();
    expect(
      normalizeMembershipDoc({
        workspaceId: 'W',
        uid: 'u',
        role: 'Devotee',
        joinedAt: 1,
        roleExpiresAt: { seconds: 1800000000, nanoseconds: 0 },
      }).roleExpiresAt
    ).toBe(1800000000000);
  });

  it('survives a null/garbage doc', () => {
    const m = normalizeMembershipDoc(null);
    expect(m.joinedAt).toBe(0);
  });
});
