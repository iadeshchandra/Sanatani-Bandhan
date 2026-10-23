/**
 * hundiChecker.test.ts — maker-checker gate for the legacy Hundi desk.
 * The bank deposit is made of the denomination MIX, so equality is
 * checked per denomination — two counts with the same total but a
 * different mix must NOT pass as a match.
 */
import {
  checkerPostingGate,
  compareDenominationCounts,
} from '../hundiChecker';

const VALUES: Record<string, number> = {
  '500': 500, '200': 200, '100': 100, '50': 50, '20': 20, '10': 10,
  '20_COIN': 20, '10_COIN': 10, '5_COIN': 5, '2_COIN': 2, '1_COIN': 1,
};

const MAKER = { '500': 10, '100': 5, '5_COIN': 40 };

describe('compareDenominationCounts', () => {
  it('matches identical counts and totals both sides independently', () => {
    const cmp = compareDenominationCounts(MAKER, { ...MAKER }, VALUES);
    expect(cmp.matches).toBe(true);
    expect(cmp.mismatches).toEqual([]);
    expect(cmp.makerTotal).toBe(5700);
    expect(cmp.checkerTotal).toBe(5700);
    expect(cmp.checkerStarted).toBe(true);
  });

  it('flags a same-total / different-mix count as a mismatch', () => {
    // 1×₹500 swapped for 5×₹100: totals coincide, mix differs.
    const cmp = compareDenominationCounts(MAKER, { '500': 9, '100': 10, '5_COIN': 40 }, VALUES);
    expect(cmp.makerTotal).toBe(cmp.checkerTotal);
    expect(cmp.matches).toBe(false);
    // Mismatch order is deterministic: denomination keys are
    // integer-like strings, so they iterate in ascending numeric order.
    expect(cmp.mismatches).toEqual([
      { key: '100', maker: 5, checker: 10 },
      { key: '500', maker: 10, checker: 9 },
    ]);
  });

  it('reports an untouched checker grid as not started', () => {
    const cmp = compareDenominationCounts(MAKER, {}, VALUES);
    expect(cmp.checkerStarted).toBe(false);
    expect(cmp.checkerTotal).toBe(0);
  });

  it('sanitises negative and fractional entries instead of trusting them', () => {
    const cmp = compareDenominationCounts({ '500': -3, '100': 2.9 }, { '100': 2 }, VALUES);
    expect(cmp.makerTotal).toBe(200);
    expect(cmp.matches).toBe(true);
  });
});

describe('checkerPostingGate', () => {
  const match = compareDenominationCounts(MAKER, { ...MAKER }, VALUES);
  const mismatch = compareDenominationCounts(MAKER, { '500': 9, '100': 5, '5_COIN': 40 }, VALUES);
  const notCounted = compareDenominationCounts(MAKER, {}, VALUES);

  it('blocks posting before the checker has counted', () => {
    expect(checkerPostingGate(notCounted, '')).toEqual({ allowed: false, reason: 'not-counted' });
  });

  it('allows posting on an exact match without any note', () => {
    expect(checkerPostingGate(match, '')).toEqual({ allowed: true, via: 'match' });
  });

  it('blocks a mismatch with no (or too short) resolution note', () => {
    expect(checkerPostingGate(mismatch, '')).toEqual({ allowed: false, reason: 'unresolved' });
    expect(checkerPostingGate(mismatch, 'recounted once')).toEqual({ allowed: false, reason: 'unresolved' });
  });

  it('allows a mismatch documented by a signed-length note', () => {
    const note = 'Recounted jointly; one ₹500 note was torn and set aside.';
    expect(checkerPostingGate(mismatch, note)).toEqual({ allowed: true, via: 'note' });
  });
});
