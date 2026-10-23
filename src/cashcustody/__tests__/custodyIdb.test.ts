/**
 * custodyIdb.test.ts — the IndexedDB persistence helpers.
 * The pure core (stamping, freshness choice, shape validation) is what
 * decides which on-device copy of a money log survives; it must be
 * conservative: a copy is displaced only by a strictly fresher one,
 * and unrecognised data is never trusted as custody state.
 */
import type { CashCustodyState } from '../types';
import {
  isStampedCustodyState,
  pickFresherState,
  stampCustodyState,
  type StampedCustodyState,
} from '../custodyIdb';

const state = (boxes: number): CashCustodyState => ({
  boxes: Array.from({ length: boxes }, (_, i) => ({ id: `bx_${i}` })) as CashCustodyState['boxes'],
  sessions: [],
  events: [],
  deposits: [],
  staff: [],
  attendance: [],
  settings: { slipSeq: {}, defaultBankName: '', defaultBankBranch: '' },
});

const stamped = (savedAt: number, boxes = 0): StampedCustodyState =>
  stampCustodyState(state(boxes), savedAt);

describe('stampCustodyState', () => {
  it('wraps state with its write time without mutating it', () => {
    const s = state(2);
    const rec = stampCustodyState(s, 1234);
    expect(rec.savedAt).toBe(1234);
    expect(rec.state).toBe(s);
  });
});

describe('pickFresherState', () => {
  it('returns the only copy when the other is missing', () => {
    expect(pickFresherState(stamped(10), null)?.savedAt).toBe(10);
    expect(pickFresherState(null, stamped(20))?.savedAt).toBe(20);
    expect(pickFresherState(null, null)).toBeNull();
  });

  it('picks the strictly fresher copy', () => {
    expect(pickFresherState(stamped(100, 1), stamped(200, 2))?.state.boxes.length).toBe(2);
    expect(pickFresherState(stamped(300, 3), stamped(200, 2))?.state.boxes.length).toBe(3);
  });

  it('keeps the first copy on a tie (first paint is never displaced)', () => {
    expect(pickFresherState(stamped(100, 1), stamped(100, 2))?.state.boxes.length).toBe(1);
  });

  it('treats a missing stamp as epoch 0', () => {
    const legacy = { savedAt: 0, state: state(1) };
    expect(pickFresherState(legacy, stamped(5, 2))?.state.boxes.length).toBe(2);
  });
});

describe('isStampedCustodyState', () => {
  it('accepts a well-formed stamped record', () => {
    expect(isStampedCustodyState(stamped(42, 1))).toBe(true);
  });

  it('rejects non-objects and missing stamps', () => {
    expect(isStampedCustodyState(null)).toBe(false);
    expect(isStampedCustodyState('state')).toBe(false);
    expect(isStampedCustodyState({ state: state(0) })).toBe(false);
    expect(isStampedCustodyState({ savedAt: 'now', state: state(0) })).toBe(false);
  });

  it('rejects state missing any core collection', () => {
    const broken = { savedAt: 1, state: { boxes: [], sessions: [], events: [] } };
    expect(isStampedCustodyState(broken)).toBe(false);
  });
});
