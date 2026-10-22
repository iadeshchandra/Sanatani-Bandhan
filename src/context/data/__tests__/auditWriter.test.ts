/**
 * auditWriter.test.ts — Blueprint A: the master audit recorder.
 *
 * Pins the recorder's laws:
 *   - a reported mutation becomes ONE chained event (seq + prevHash
 *     linkage across consecutive reports);
 *   - the chain head primes from the stored stream (a fresh session
 *     continues the existing chain, never restarts it);
 *   - a failed append NEVER throws, NEVER advances the head — the
 *     next event chains onto the last LANDED event, so a dropped
 *     event is an absence, never a corrupted chain;
 *   - a failed head read drops the event loudly rather than forking;
 *   - DEMO_ workspaces and actorless reports are skipped (rules bind
 *     actorUid to the caller; a forged actor is worse than none).
 */
import { AuditRecorder, type AuditStore } from '../auditWriter';
import {
  AUDIT_GENESIS,
  verifyAuditChain,
  type AuditEvent,
  type AuditEventInput,
} from '../../../lib/auditChain';

const WS = 'WS-1001';
const NOW = 1_700_000_000_000;

class FakeStore implements AuditStore {
  events: AuditEvent[] = [];
  failNextAppend = false;
  failHead = false;

  async readChainHead(workspaceId: string) {
    if (this.failHead) throw new Error('head read denied');
    const rows = this.events
      .filter((e) => e.workspaceId === workspaceId)
      .sort((a, b) => b.seq - a.seq);
    return rows.length ? { seq: rows[0].seq, hash: rows[0].hash } : null;
  }

  async appendEvent(event: AuditEvent) {
    if (this.failNextAppend) {
      this.failNextAppend = false;
      throw new Error('append denied');
    }
    this.events.push(event);
  }
}

function makeRecorder(store: FakeStore) {
  let n = 0;
  const logs: string[] = [];
  const recorder = new AuditRecorder(store, {
    now: () => NOW,
    makeId: () => `aud-test-${n++}`,
    log: (msg) => logs.push(msg),
  });
  return { recorder, logs };
}

function report(over: Partial<AuditEventInput> = {}): AuditEventInput {
  return {
    workspaceId: WS,
    actorUid: 'uid-rina',
    actorName: 'Rina Das',
    actorRole: 'Accountant',
    action: 'treasury.created',
    entityType: 'treasury',
    entityId: 'tx-1',
    entityLabel: 'Rina Das',
    summaryKey: 'org.audit.history.treasuryIncome',
    amount: 500,
    ...over,
  };
}

describe('AuditRecorder', () => {
  it('mutation → one chained event with the reported fields', async () => {
    const store = new FakeStore();
    const { recorder } = makeRecorder(store);
    recorder.record(report());
    await recorder.flush(WS);
    expect(store.events).toHaveLength(1);
    const ev = store.events[0];
    expect(ev.workspaceId).toBe(WS);
    expect(ev.actorUid).toBe('uid-rina');
    expect(ev.actorName).toBe('Rina Das');
    expect(ev.actorRole).toBe('Accountant');
    expect(ev.action).toBe('treasury.created');
    expect(ev.entityId).toBe('tx-1');
    expect(ev.amount).toBe(500);
    expect(ev.seq).toBe(0);
    expect(ev.prevHash).toBe(AUDIT_GENESIS);
    expect(verifyAuditChain(store.events).ok).toBe(true);
  });

  it('consecutive reports chain in commit order', async () => {
    const store = new FakeStore();
    const { recorder } = makeRecorder(store);
    recorder.record(report({ entityId: 'tx-1' }));
    recorder.record(report({ entityId: 'tx-2', action: 'treasury.updated' }));
    recorder.record(report({ entityId: 'tx-3', action: 'treasury.reversed' }));
    await recorder.flush(WS);
    expect(store.events.map((e) => e.entityId)).toEqual(['tx-1', 'tx-2', 'tx-3']);
    expect(store.events.map((e) => e.seq)).toEqual([0, 1, 2]);
    expect(store.events[1].prevHash).toBe(store.events[0].hash);
    expect(store.events[2].prevHash).toBe(store.events[1].hash);
    expect(verifyAuditChain(store.events).ok).toBe(true);
  });

  it('primes the head from the stored stream (session continuity)', async () => {
    const store = new FakeStore();
    const first = makeRecorder(store);
    first.recorder.record(report({ entityId: 'tx-1' }));
    await first.recorder.flush(WS);

    // A NEW recorder (fresh session) must continue the same chain.
    const second = makeRecorder(store);
    second.recorder.record(report({ entityId: 'tx-2' }));
    await second.recorder.flush(WS);
    expect(store.events).toHaveLength(2);
    expect(store.events[1].seq).toBe(1);
    expect(store.events[1].prevHash).toBe(store.events[0].hash);
    expect(verifyAuditChain(store.events).ok).toBe(true);
  });

  it('a failed append drops the event and the head does NOT advance', async () => {
    const store = new FakeStore();
    const { recorder, logs } = makeRecorder(store);
    recorder.record(report({ entityId: 'tx-1' }));
    await recorder.flush(WS);
    expect(store.events).toHaveLength(1);

    store.failNextAppend = true;
    recorder.record(report({ entityId: 'tx-2' }));
    await recorder.flush(WS);
    expect(store.events).toHaveLength(1); // tx-2 dropped, loudly
    expect(logs.some((l) => l.includes('append failed'))).toBe(true);

    // The next event chains onto tx-1 — the chain still verifies.
    recorder.record(report({ entityId: 'tx-3' }));
    await recorder.flush(WS);
    expect(store.events).toHaveLength(2);
    expect(store.events[1].entityId).toBe('tx-3');
    expect(store.events[1].seq).toBe(1);
    expect(store.events[1].prevHash).toBe(store.events[0].hash);
    expect(verifyAuditChain(store.events).ok).toBe(true);
  });

  it('a failed head read drops the event rather than forking the chain', async () => {
    const store = new FakeStore();
    store.failHead = true;
    const { recorder, logs } = makeRecorder(store);
    recorder.record(report());
    await recorder.flush(WS);
    expect(store.events).toHaveLength(0);
    expect(logs.some((l) => l.includes('chain head unavailable'))).toBe(true);

    store.failHead = false;
    recorder.record(report({ entityId: 'tx-2' }));
    await recorder.flush(WS);
    expect(store.events).toHaveLength(1);
    expect(store.events[0].seq).toBe(0);
  });

  it('record() never throws, even when the store explodes synchronously', async () => {
    const store = new FakeStore();
    store.readChainHead = () => {
      throw new Error('sync boom');
    };
    const { recorder } = makeRecorder(store);
    expect(() => recorder.record(report())).not.toThrow();
    await expect(recorder.flush(WS)).resolves.toBeUndefined();
    expect(store.events).toHaveLength(0);
  });

  it('skips DEMO_ workspaces entirely', async () => {
    const store = new FakeStore();
    const { recorder } = makeRecorder(store);
    recorder.record(report({ workspaceId: 'DEMO_ws-1' }));
    await recorder.flush();
    expect(store.events).toHaveLength(0);
  });

  it('skips actorless reports (actorUid is rules-bound to the caller)', async () => {
    const store = new FakeStore();
    const { recorder, logs } = makeRecorder(store);
    recorder.record(report({ actorUid: '' }));
    await recorder.flush(WS);
    expect(store.events).toHaveLength(0);
    expect(logs.some((l) => l.includes('no actor uid'))).toBe(true);
  });

  it('workspaces chain independently', async () => {
    const store = new FakeStore();
    const { recorder } = makeRecorder(store);
    recorder.record(report({ workspaceId: 'WS-A', entityId: 'a1' }));
    recorder.record(report({ workspaceId: 'WS-B', entityId: 'b1' }));
    recorder.record(report({ workspaceId: 'WS-A', entityId: 'a2' }));
    await recorder.flush();
    const a = store.events.filter((e) => e.workspaceId === 'WS-A');
    const b = store.events.filter((e) => e.workspaceId === 'WS-B');
    expect(a.map((e) => e.seq)).toEqual([0, 1]);
    expect(b.map((e) => e.seq)).toEqual([0]);
    expect(verifyAuditChain(a).ok).toBe(true);
    expect(verifyAuditChain(b).ok).toBe(true);
  });
});
