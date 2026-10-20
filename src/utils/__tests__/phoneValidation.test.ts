/**
 * phoneValidation.test.ts — QUEUED #49 regression suite.
 * =====================================================================
 * Pins the live-audit defect (build b91aa94): registering a member with
 * the org's OWN Bangladeshi number 01608533529 was rejected with
 * "Please enter a valid 10-digit Indian mobile number". The geo-aware
 * contract pinned here:
 *  - BD mobile (01[3-9] + 8 digits), IN mobile ([6-9] + 9 digits) and
 *    full E.164 numbers are valid EVERYWHERE, in every common format;
 *  - genuinely malformed input is still rejected;
 *  - the comparison key unifies formats across both countries;
 *  - error copy leads with the org country's own example and never
 *    demands an "Indian mobile" from a Bangladeshi org.
 */
import {
  isValidPhone,
  isValidPhoneIN,
  parsePhone,
  phoneErrorMessage,
  phoneGeoForCountry,
  phoneNationalKey,
} from '../validation';

describe('BD mobile numbers (the audited rejection)', () => {
  const formatsOfOrgPhone = [
    '01608533529', // the org's own creation phone — local form
    '8801608533529', // country code, no plus
    '+8801608533529', // E.164
    '+880 1608-533529', // E.164 with spaces/dashes
    '+880 01608-533529', // E.164 typed with trunk 0
    '01608 533529', // local with a space
  ];
  it.each(formatsOfOrgPhone)('accepts %s', (n) => {
    expect(isValidPhone(n)).toBe(true);
    expect(parsePhone(n).geo).toBe('BD');
  });

  it.each(['01712345678', '01912345678', '01312345678', '01812345678'])(
    'accepts other operator prefixes: %s',
    (n) => {
      expect(isValidPhone(n)).toBe(true);
      expect(parsePhone(n).geo).toBe('BD');
    }
  );

  it('normalizes every format of the org phone to the same E.164 + national key', () => {
    for (const n of formatsOfOrgPhone) {
      const p = parsePhone(n);
      expect(p.e164).toBe('+8801608533529');
      expect(p.nationalKey).toBe('1608533529');
      expect(phoneNationalKey(n)).toBe('1608533529');
    }
  });

  it('rejects non-mobile BD shapes', () => {
    expect(isValidPhone('01208533529')).toBe(false); // 012 is not a mobile prefix
    expect(isValidPhone('0160853352')).toBe(false); // one digit short
    expect(isValidPhone('1608533529')).toBe(false); // truncated: no trunk 0, not IN either
  });
});

describe('IN mobile numbers', () => {
  const formatsOf9876501234 = [
    '9876501234',
    '919876501234',
    '+919876501234',
    '+91 98765 01234',
    '09876501234', // trunk-0 form
  ];
  it.each(formatsOf9876501234)('accepts %s as the same number', (n) => {
    expect(isValidPhone(n)).toBe(true);
    expect(parsePhone(n).geo).toBe('IN');
    expect(parsePhone(n).e164).toBe('+919876501234');
    expect(phoneNationalKey(n)).toBe('9876501234');
  });

  it('accepts other numbers in the 6–9 series with their own identity', () => {
    const p = parsePhone('6876501234');
    expect(p.valid).toBe(true);
    expect(p.geo).toBe('IN');
    expect(p.e164).toBe('+916876501234');
    expect(p.nationalKey).toBe('6876501234');
  });

  it('rejects numbers outside the 6–9 mobile series', () => {
    expect(isValidPhone('5876501234')).toBe(false);
    expect(isValidPhone('987650123')).toBe(false);
  });
});

describe('international E.164 numbers', () => {
  it.each(['+14155552671', '+442071838750', '+971501234567'])('accepts %s', (n) => {
    const p = parsePhone(n);
    expect(p.valid).toBe(true);
    expect(p.geo).toBe('INTL');
    expect(p.e164).toBe(n);
    expect(p.nationalKey).toBe(''); // outside BD/IN: valid, just not key-comparable
  });

  it('rejects malformed international input', () => {
    expect(isValidPhone('+0123456')).toBe(false); // leading 0 is not E.164
    expect(isValidPhone('+123')).toBe(false); // too short
    expect(isValidPhone('+1234567890123456')).toBe(false); // 16 digits > E.164 max
  });
});

describe('garbage input is rejected', () => {
  it.each(['', '   ', 'abc', 'phone', '12345', '99999999999999999999', '+'])(
    'rejects %j',
    (n) => {
      expect(isValidPhone(n)).toBe(false);
      expect(parsePhone(n)).toEqual({ valid: false, geo: null, e164: '', nationalKey: '' });
    }
  );
  it('rejects non-strings', () => {
    expect(isValidPhone(null)).toBe(false);
    expect(isValidPhone(undefined)).toBe(false);
    expect(isValidPhone(1608533529)).toBe(false);
    expect(phoneNationalKey(null)).toBe('');
  });
});

describe('BD and IN keys never collide', () => {
  it('a BD national key cannot be mistaken for an IN number', () => {
    // BD keys start with 1; IN nationals start 6–9 — disjoint by construction.
    expect(isValidPhone('1608533529')).toBe(false);
    expect(phoneNationalKey('01608533529')).toBe('1608533529');
    expect(phoneNationalKey('9876501234')).toBe('9876501234');
  });
});

describe('country hints + error messages', () => {
  it('maps free-form country values', () => {
    expect(phoneGeoForCountry('Bangladesh')).toBe('BD');
    expect(phoneGeoForCountry('BD')).toBe('BD');
    expect(phoneGeoForCountry('India')).toBe('IN');
    expect(phoneGeoForCountry('Bharat')).toBe('IN');
    expect(phoneGeoForCountry('Nepal')).toBeNull();
    expect(phoneGeoForCountry(null)).toBeNull();
    expect(phoneGeoForCountry(undefined)).toBeNull();
  });

  it('BD message leads with a Bangladeshi example and never says "Indian mobile"', () => {
    const msg = phoneErrorMessage('Bangladesh');
    expect(msg).toContain('01608533529');
    expect(msg).not.toMatch(/Indian mobile/);
  });

  it('IN message leads with an Indian example', () => {
    const msg = phoneErrorMessage('India');
    expect(msg.indexOf('9876501234')).toBeLessThan(msg.indexOf('01608533529'));
    expect(msg).not.toMatch(/10-digit Indian/);
  });

  it('default message names both home formats plus international', () => {
    const msg = phoneErrorMessage();
    expect(msg).toContain('01608533529');
    expect(msg).toContain('9876501234');
    expect(msg).toMatch(/international/);
  });

  it('no message ever demands a "10-digit Indian mobile number"', () => {
    for (const c of ['Bangladesh', 'India', null, undefined, 'Nepal']) {
      expect(phoneErrorMessage(c)).not.toContain('10-digit Indian mobile');
    }
  });
});

describe('legacy IN helpers are untouched', () => {
  it('isValidPhoneIN keeps its original semantics', () => {
    expect(isValidPhoneIN('9876501234')).toBe(true);
    expect(isValidPhoneIN('01608533529')).toBe(false);
  });
});
