import {
  normalizeDigits, phoneKey, isUsablePhoneKey, parseAmount, parseCount,
  parseRegisterDate, parseYear, resolveAgeArrival, displayDigits,
} from '../normalize';

describe('normalizeDigits — the paper-register corruption guard', () => {
  it('converts Bengali digits to ASCII', () => {
    expect(normalizeDigits('০১২৩৪৫৬৭৮৯')).toBe('0123456789');
  });
  it('converts Devanagari digits to ASCII', () => {
    expect(normalizeDigits('०१२३४५६७८९')).toBe('0123456789');
  });
  it('leaves letters and punctuation untouched', () => {
    expect(normalizeDigits('Rahim-৫, Flat २')).toBe('Rahim-5, Flat 2');
  });
  it('displayDigits gives digits back in the reader’s script', () => {
    expect(displayDigits(500, 'bn')).toBe('৫০০');
    expect(displayDigits(500, 'hi')).toBe('५००');
    expect(displayDigits(500, 'en')).toBe('500');
  });
});

describe('phoneKey — country-code-insensitive dedupe key', () => {
  it('normalizes a Bengali-digit Bangladeshi phone', () => {
    expect(phoneKey('০১৭১২-৩৪৫৬৭৮')).toBe('1712345678');
  });
  it('treats +880, 880 and 0-prefixed forms as the same number', () => {
    const a = phoneKey('+880 1712-345678');
    const b = phoneKey('01712345678');
    const c = phoneKey('8801712345678');
    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(isUsablePhoneKey(a)).toBe(true);
  });
  it('treats +91 and bare Indian numbers as the same', () => {
    expect(phoneKey('+91 98765 43210')).toBe(phoneKey('9876543210'));
  });
  it('a short phone is not a usable key', () => {
    expect(isUsablePhoneKey(phoneKey('01712'))).toBe(false);
  });
});

describe('parseAmount', () => {
  it('parses a Bengali-digit amount with taka sign', () => {
    expect(parseAmount('৳ ৫০০')).toBe(500);
  });
  it('parses Indian-grouped commas and Devanagari digits', () => {
    expect(parseAmount('₹१,००,०००')).toBe(100000);
  });
  it('returns null for text with no number', () => {
    expect(parseAmount('—')).toBeNull();
    expect(parseAmount('')).toBeNull();
    expect(parseAmount(undefined)).toBeNull();
  });
  it('parses counts the same way', () => {
    expect(parseCount('৭')).toBe(7);
    expect(parseCount('x')).toBeNull();
  });
});

describe('parseRegisterDate', () => {
  it('parses dd/mm/yyyy', () => {
    expect(parseRegisterDate('05/11/2025')).toBe('2025-11-05');
  });
  it('parses Bengali-digit dates', () => {
    expect(parseRegisterDate('০৫-১১-২০২৫')).toBe('2025-11-05');
  });
  it('keeps ISO dates as-is', () => {
    expect(parseRegisterDate('2025-01-31')).toBe('2025-01-31');
  });
  it('rejects impossible dates instead of guessing', () => {
    expect(parseRegisterDate('31/02/2025')).toBeNull();
    expect(parseRegisterDate('hello')).toBeNull();
  });
  it('parses years out of register phrasing', () => {
    expect(parseYear('came in ২০১৯')).toBe(2019);
    expect(parseYear('no year here')).toBeNull();
  });
});

describe('resolveAgeArrival — honesty: arrival year NEVER becomes an age', () => {
  it('uses a stated age when the paper gives one', () => {
    const r = resolveAgeArrival('7', '2019');
    expect(r.ageYears).toBe(7);
    expect(r.arrivalYear).toBe(2019);
    expect(r.ageUnknown).toBe(false);
  });
  it('keeps age UNKNOWN when only the arrival year is known', () => {
    const r = resolveAgeArrival('', '2019');
    expect(r.ageYears).toBeNull();
    expect(r.arrivalYear).toBe(2019);
    expect(r.ageUnknown).toBe(true);
  });
  it('reads a Bengali-digit age', () => {
    const r = resolveAgeArrival('৫', undefined);
    expect(r.ageYears).toBe(5);
    expect(r.ageUnknown).toBe(false);
  });
  it('both empty → both unknown', () => {
    const r = resolveAgeArrival(undefined, undefined);
    expect(r.ageYears).toBeNull();
    expect(r.arrivalYear).toBeNull();
    expect(r.ageUnknown).toBe(true);
  });
});
