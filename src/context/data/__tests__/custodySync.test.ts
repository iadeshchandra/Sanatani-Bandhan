/**
 * custodySync.test.ts — the cashCustodyStates cloud sync policy
 * (owner-approved 2026-10-23): doc build/parse, the fresher-wins +
 * chain-verified adoption choice, and the fail-open pull/push
 * behaviour against a fake store. No Firestore, no timers leak.
 */
import {
  buildCustodyCloudDoc,
  chainHeadOf,
  chooseCustodyAdoption,
  createCustodySync,
  parseCustodyCloudDoc,
  type CustodyCloudDoc,
  type CustodySyncStore,
} from '../custodySync';
import { stampCustodyState, type StampedCustodyState } from '../../../cashcustody/custodyIdb';
import { chainEvent, verifyChain } from '../../../cashcustody/cashCustodyStore';
import type { CashCustodyState, CustodyEvent } from '../../../cashcustody/types';

const emptyState = (): CashCustodyState => ({
  boxes: [], sessions: [], events: [], deposits: [], staff: [], attendance: [],
  settings: { slipSeq: {}, defaultBankName: '', defaultBankBranch: '' },
});

function chainedState(eventCount: number): CashCustodyState {
  const s = emptyState();
  let prev: CustodyEvent | undefined;
  for (let i = 0; i < eventCount; i++) {
    prev = chainEvent(prev, 'box_registered', 'Trustee', `box ${i}`, 1000 + i, i);
    s.events.push(prev);
  }
  return s;
}

const intact = (events: CustodyEvent[]) => verifyChain(events) === -1;
const ACTOR = { uid: 'uid-trustee-1', name: 'Head Trustee' };

describe('chainHeadOf', () => {
  it('an empty chain heads at GENESIS with length 0', () => {
    expect(chainHeadOf(emptyState())).toEqual({ chainHeadHash: 'GENESIS', chainLength: 0 });
  });

  it('heads at the highest-seq event hash', () => {
    const s = chainedState(3);
    const head = chainHeadOf(s);
    expect(head.chainLength).toBe(3);
    expect(head.chainHeadHash).toBe(s.events[2].hash);
  });
});

describe('buildCustodyCloudDoc / parseCustodyCloudDoc', () => {
  it('builds the proposal-shaped doc with the writer pinned', () => {
    const stamped = stampCustodyState(chainedState(2), 5000);
    const doc = buildCustodyCloudDoc('WS-1', stamped, ACTOR);
    expect(doc.workspaceId).toBe('WS-1');
    expect(doc.savedAt).toBe(5000);
    expect(doc.savedByUid).toBe('uid-trustee-1');
    expect(doc.savedByName).toBe('Head Trustee');
    expect(doc.chainLength).toBe(2);
    expect(doc.chainHeadHash).toBe(stamped.state.events[1].hash);
  });

  it('round-trips through parse', () => {
    const stamped = stampCustodyState(chainedState(1), 42);
    const parsed = parseCustodyCloudDoc(buildCustodyCloudDoc('WS-1', stamped, ACTOR), 'WS-1');
    expect(parsed).not.toBeNull();
    expect(parsed!.savedAt).toBe(42);
    expect(parsed!.state.events).toHaveLength(1);
  });

  it('refuses foreign, malformed, or uid-less payloads', () => {
    const doc = buildCustodyCloudDoc('WS-1', stampCustodyState(emptyState(), 1), ACTOR);
    expect(parseCustodyCloudDoc(doc, 'WS-OTHER')).toBeNull();
    expect(parseCustodyCloudDoc(null, 'WS-1')).toBeNull();
    expect(parseCustodyCloudDoc('nope', 'WS-1')).toBeNull();
    expect(parseCustodyCloudDoc({ ...doc, savedByUid: 7 }, 'WS-1')).toBeNull();
    expect(parseCustodyCloudDoc({ ...doc, state: { boxes: 'x' } }, 'WS-1')).toBeNull();
    expect(parseCustodyCloudDoc({ ...doc, savedAt: 'soon' }, 'WS-1')).toBeNull();
  });
});

describe('chooseCustodyAdoption', () => {
  const local = stampCustodyState(chainedState(1), 100);

  it('adopts a strictly fresher cloud copy whose chain verifies', () => {
    const cloud = stampCustodyState(chainedState(2), 200);
    expect(chooseCustodyAdoption(local, cloud, intact)).toBe(cloud);
  });

  it('refuses a fresher cloud copy whose chain is broken', () => {
    const cloudState = chainedState(2);
    cloudState.events[1] = { ...cloudState.events[1], details: 'tampered' };
    const cloud = stampCustodyState(cloudState, 200);
    expect(verifyChain(cloudState.events)).not.toBe(-1);
    expect(chooseCustodyAdoption(local, cloud, intact)).toBe(local);
  });

  it('keeps local on older, equal, or absent cloud copies', () => {
    expect(chooseCustodyAdoption(local, stampCustodyState(chainedState(2), 99), intact)).toBe(local);
    expect(chooseCustodyAdoption(local, stampCustodyState(chainedState(2), 100), intact)).toBe(local);
    expect(chooseCustodyAdoption(local, null, intact)).toBe(local);
  });
});

describe('createCustodySync — fail-open pull/push', () => {
  function fakeStore(behavior: Partial<CustodySyncStore> = {}) {
    const written: CustodyCloudDoc[] = [];
    const store: CustodySyncStore = {
      read: behavior.read ?? (async () => null),
      write: behavior.write ?? (async (_ws, d) => { written.push(d); }),
    };
    return { store, written };
  }

  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  it('pull returns the parsed cloud copy', async () => {
    const doc = buildCustodyCloudDoc('WS-1', stampCustodyState(chainedState(1), 7), ACTOR);
    const { store } = fakeStore({ read: async () => doc });
    const sync = createCustodySync(store);
    const got = await sync.pull('WS-1');
    expect(got?.savedAt).toBe(7);
  });

  it('pull NEVER throws — a failing store reads as "no cloud copy"', async () => {
    const { store } = fakeStore({ read: async () => { throw new Error('offline'); } });
    const sync = createCustodySync(store);
    await expect(sync.pull('WS-1')).resolves.toBeNull();
  });

  it('pull and push skip DEMO_ workspaces without touching the store', async () => {
    let reads = 0;
    const { store, written } = fakeStore({ read: async () => { reads++; return null; } });
    const sync = createCustodySync(store);
    await expect(sync.pull('DEMO_X')).resolves.toBeNull();
    sync.push('DEMO_X', stampCustodyState(emptyState(), 1), ACTOR);
    await sync.flush();
    expect(reads).toBe(0);
    expect(written).toHaveLength(0);
  });

  it('push debounces and coalesces to the latest state', async () => {
    const { store, written } = fakeStore();
    const sync = createCustodySync(store, { debounceMs: 1000 });
    sync.push('WS-1', stampCustodyState(chainedState(1), 1), ACTOR);
    sync.push('WS-1', stampCustodyState(chainedState(2), 2), ACTOR);
    jest.advanceTimersByTime(1000);
    await sync.flush();
    expect(written).toHaveLength(1);
    expect(written[0].savedAt).toBe(2);
    expect(written[0].chainLength).toBe(2);
  });

  it('push NEVER throws — a failing write is dropped, flush still resolves', async () => {
    const { store } = fakeStore({ write: async () => { throw new Error('denied'); } });
    const sync = createCustodySync(store, { debounceMs: 10 });
    sync.push('WS-1', stampCustodyState(emptyState(), 1), ACTOR);
    jest.advanceTimersByTime(10);
    await expect(sync.flush()).resolves.toBeUndefined();
  });

  it('push skips uid-less actors (the rules would deny the write anyway)', async () => {
    const { store, written } = fakeStore();
    const sync = createCustodySync(store);
    sync.push('WS-1', stampCustodyState(emptyState(), 1), { uid: '', name: 'Anon' });
    await sync.flush();
    expect(written).toHaveLength(0);
  });
});
