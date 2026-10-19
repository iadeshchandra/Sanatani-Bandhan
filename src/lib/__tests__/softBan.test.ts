import {
  validateSuspendReason,
  buildSuspendUpdate,
  buildUnsuspendUpdate,
  isSuspended,
  readSuspension,
  SUSPENSION_FIELDS,
} from '../softBan';

describe('validateSuspendReason', () => {
  it('rejects empty reasons (no silent bans)', () => {
    expect(validateSuspendReason('')).not.toBeNull();
    expect(validateSuspendReason('   ')).not.toBeNull();
  });
  it('rejects too-short reasons', () => {
    expect(validateSuspendReason('spam')).not.toBeNull();
  });
  it('accepts a clear reason', () => {
    expect(validateSuspendReason('Repeated spam links in community posts after two warnings.')).toBeNull();
  });
  it('rejects overly long reasons', () => {
    expect(validateSuspendReason('x'.repeat(501))).not.toBeNull();
  });
  it('trims before validating', () => {
    expect(validateSuspendReason('   Repeated harassment of devotees in DMs.   ')).toBeNull();
  });
});

describe('buildSuspendUpdate', () => {
  it('sets all suspension fields', () => {
    const u = buildSuspendUpdate('Posting scams in Seva Bazar.', 'owner_uid_1');
    expect(u.suspended).toBe(true);
    expect(u.suspendReason).toBe('Posting scams in Seva Bazar.');
    expect(u.suspendedBy).toBe('owner_uid_1');
    expect(typeof u.suspendedAt).toBe('number');
  });
  it('trims the reason', () => {
    const u = buildSuspendUpdate('  spam  ', 'owner');
    expect(u.suspendReason).toBe('spam');
  });
  it('only touches suspension fields', () => {
    const u = buildSuspendUpdate('Valid reason here.', 'owner');
    for (const k of Object.keys(u)) {
      expect(SUSPENSION_FIELDS).toContain(k);
    }
  });
});

describe('buildUnsuspendUpdate', () => {
  it('clears the suspension', () => {
    const u = buildUnsuspendUpdate();
    expect(u.suspended).toBe(false);
    expect(u.suspendReason).toBeNull();
    expect(u.suspendedAt).toBeNull();
    expect(u.suspendedBy).toBeNull();
  });
});

describe('isSuspended / readSuspension', () => {
  it('detects an active suspension', () => {
    expect(isSuspended({ suspended: true })).toBe(true);
  });
  it('ignores falsy or missing flags', () => {
    expect(isSuspended({})).toBe(false);
    expect(isSuspended({ suspended: false })).toBe(false);
    expect(isSuspended(null)).toBe(false);
    expect(isSuspended(undefined)).toBe(false);
  });
  it('reads the full suspension info', () => {
    const info = readSuspension({
      suspended: true,
      suspendReason: 'Policy violation.',
      suspendedAt: 1729000000000,
      suspendedBy: 'owner_1',
    });
    expect(info?.reason).toBe('Policy violation.');
    expect(info?.suspendedAt).toBe(1729000000000);
  });
  it('returns null when not suspended', () => {
    expect(readSuspension({ suspended: false })).toBeNull();
    expect(readSuspension(null)).toBeNull();
  });
});
