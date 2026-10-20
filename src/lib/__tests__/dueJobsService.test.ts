/**
 * dueJobsService.test.ts — the reminder-queue drain, end to end at the
 * service boundary (Firestore + NotificationCenter mocked; the samskara
 * engines stubbed empty — they are covered by dueJobs.test.ts).
 *
 * Pins the 2026-10-20 micro-fix: the rules accept reminderQueue items
 * keyed by ownerUid OR targetUid (the server writes ownerUid), so the
 * drain fetches BOTH keys, merges + dedupes by doc id, and marks each
 * delivered item `sent` server-side — fail-open if that update is
 * denied, with the local ledger still guarding this device.
 */

// Firebase modules are ESM and stubbed so the suite runs in this repo's
// CommonJS jest setup (same pattern as p2pLedger.spec.ts).
jest.mock('firebase/firestore', () => ({
  collection: jest.fn((_db: unknown, name: string) => ({ __col: name })),
  query: jest.fn((col: unknown, ...clauses: unknown[]) => ({ col, clauses })),
  where: jest.fn((field: string, op: string, val: unknown) => ({ field, op, val })),
  limit: jest.fn((n: number) => ({ limitN: n })),
  getDocs: jest.fn(),
  doc: jest.fn((_db: unknown, name: string, id: string) => ({ __doc: `${name}/${id}` })),
  updateDoc: jest.fn(() => Promise.resolve()),
}));
jest.mock('../firebase', () => ({ db: {} }));
jest.mock('../../samskara/samskaraStore', () => ({
  samskaraReminders: () => [],
  shraddhaReminders: () => [],
  ceremonyReminders: () => [],
}));
jest.mock('../../notifications/NotificationCenter', () => {
  const center = { emit: jest.fn(() => Promise.resolve({})) };
  return { NotificationCenter: { get: () => center } };
});

import { getDocs, updateDoc } from 'firebase/firestore';
import { NotificationCenter } from '../../notifications/NotificationCenter';
import { runDueJobs } from '../dueJobsService';
import { mergeQueuedReminders, type JobOutcome } from '../dueJobs';

const getDocsMock = getDocs as unknown as jest.Mock;
const updateDocMock = updateDoc as unknown as jest.Mock;
const emitMock = (NotificationCenter.get() as unknown as { emit: jest.Mock }).emit;

const UID = 'user-1';

/* A minimal in-memory localStorage: the node test env has none, and the
 * service's ledger persistence is part of what is being pinned. */
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
  setItem: (k: string, v: string) => {
    store.set(k, String(v));
  },
  removeItem: (k: string) => {
    store.delete(k);
  },
  clear: () => store.clear(),
  key: (i: number) => Array.from(store.keys())[i] ?? null,
  get length() {
    return store.size;
  },
};

type RawDoc = { id: string; data: Record<string, unknown> };

function snapOf(docs: RawDoc[]) {
  return { docs: docs.map((d) => ({ id: d.id, data: () => d.data })), size: docs.length };
}

/** What each recipient-key query returns this test. */
let queueByField: Record<'targetUid' | 'ownerUid', RawDoc[]> = { targetUid: [], ownerUid: [] };

beforeEach(() => {
  jest.clearAllMocks();
  store.clear();
  queueByField = { targetUid: [], ownerUid: [] };
  emitMock.mockResolvedValue({});
  updateDocMock.mockResolvedValue(undefined);
  getDocsMock.mockImplementation((q: { clauses: Array<{ field?: string }> }) => {
    const recipient = (q.clauses ?? []).find((c) => c && (c.field === 'targetUid' || c.field === 'ownerUid'));
    const field = (recipient?.field ?? 'targetUid') as 'targetUid' | 'ownerUid';
    return Promise.resolve(snapOf(queueByField[field]));
  });
});

async function runQueueOutcome(): Promise<JobOutcome> {
  const report = await runDueJobs({ uid: UID, trigger: 'manual' });
  expect(report).not.toBeNull();
  const outcome = report!.outcomes.find((o) => o.job === 'reminder-queue');
  expect(outcome).toBeDefined();
  return outcome!;
}

describe('mergeQueuedReminders', () => {
  it('merges both recipient-key lists in stable order', () => {
    const merged = mergeQueuedReminders([
      [{ id: 'a' }, { id: 'b' }],
      [{ id: 'c' }],
    ]);
    expect(merged.map((m) => m.id)).toEqual(['a', 'b', 'c']);
  });

  it('dedupes an item that carries both keys — it drains exactly once', () => {
    const merged = mergeQueuedReminders([[{ id: 'x', message: 'm' }], [{ id: 'x' }]]);
    expect(merged).toHaveLength(1);
    expect(merged[0].message).toBe('m');
  });

  it('drops entries without a usable id', () => {
    const merged = mergeQueuedReminders([
      [{ id: '' }, { id: 'ok' }],
      [null as unknown as { id: string }, undefined as unknown as { id: string }],
    ]);
    expect(merged.map((m) => m.id)).toEqual(['ok']);
  });
});

describe('reminder-queue drain (dueJobsService)', () => {
  it('surfaces ownerUid-keyed items — invisible to the old targetUid-only query', async () => {
    queueByField.ownerUid = [{ id: 'srv1', data: { kind: 'shraddha', message: 'Pitri paksha smaran' } }];
    const outcome = await runQueueOutcome();
    expect(outcome.delivered).toBe(1);
    expect(outcome.failed).toBe(0);
    expect(emitMock).toHaveBeenCalledTimes(1);
    expect(emitMock.mock.calls[0][0].dedupeKey).toBe('reminderQueue:srv1');
  });

  it('runs two bounded queries — one per recipient key, each capped at 25', async () => {
    await runQueueOutcome();
    expect(getDocsMock).toHaveBeenCalledTimes(2);
    const fields = getDocsMock.mock.calls.map((call) =>
      (call[0].clauses as Array<{ field?: string }>).find((c) => c.field === 'targetUid' || c.field === 'ownerUid')?.field,
    );
    expect(fields).toEqual(['targetUid', 'ownerUid']);
    for (const call of getDocsMock.mock.calls) {
      expect((call[0].clauses as Array<{ limitN?: number }>).some((c) => c.limitN === 25)).toBe(true);
    }
  });

  it('an item returned by both key queries is delivered exactly once', async () => {
    const both = { id: 'both1', data: { kind: 'samskara', message: 'Upanayana soon' } };
    queueByField.targetUid = [both];
    queueByField.ownerUid = [both];
    const outcome = await runQueueOutcome();
    expect(outcome.scanned).toBe(1);
    expect(outcome.delivered).toBe(1);
    expect(emitMock).toHaveBeenCalledTimes(1);
  });

  it('marks a delivered item sent server-side (status-pinned update)', async () => {
    queueByField.targetUid = [{ id: 'q9', data: { message: 'hello' } }];
    const outcome = await runQueueOutcome();
    expect(outcome.delivered).toBe(1);
    expect(updateDocMock).toHaveBeenCalledTimes(1);
    expect(updateDocMock.mock.calls[0][0]).toEqual({ __doc: 'reminderQueue/q9' });
    expect(updateDocMock.mock.calls[0][1]).toEqual({ status: 'sent' });
  });

  it('mark-sent denial is fail-open: the delivery still counts, nothing fails', async () => {
    updateDocMock.mockRejectedValue(new Error('permission-denied'));
    queueByField.ownerUid = [{ id: 'q10', data: { message: 'hi' } }];
    const outcome = await runQueueOutcome();
    expect(outcome.delivered).toBe(1);
    expect(outcome.failed).toBe(0);
  });

  it('the local ledger still guards this device: a second run skips the item', async () => {
    queueByField.ownerUid = [{ id: 'q11', data: { message: 'once only' } }];
    const first = await runQueueOutcome();
    expect(first.delivered).toBe(1);
    const second = await runQueueOutcome();
    expect(second.skipped).toBe(1);
    expect(second.delivered).toBe(0);
    expect(emitMock).toHaveBeenCalledTimes(1);
  });

  it('an emit failure counts as failed and never marks the item sent', async () => {
    emitMock.mockRejectedValue(new Error('offline'));
    queueByField.targetUid = [{ id: 'q12', data: { message: 'boom' } }];
    const outcome = await runQueueOutcome();
    expect(outcome.failed).toBe(1);
    expect(outcome.delivered).toBe(0);
    expect(updateDocMock).not.toHaveBeenCalled();
  });
});
