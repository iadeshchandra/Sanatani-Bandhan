/**
 * assistedAudit.test.ts — Blueprint D, deliverable 4: assisted mode's
 * audit honesty. Pinned:
 *   - BACK-COMPAT: an event without assistedBy canonicalizes with
 *     NO assistedBy in its digest — pre-D chains verify unchanged
 *     (the stamp is hash-bound only when present);
 *   - a stamped event hashes DIFFERENTLY (the helper is inside the
 *     tamper-evident chain, not a side note);
 *   - the recorder stamps at its one seam when the provider offers
 *     a helper ≠ the actor with a real name — and never otherwise
 *     (same person, empty name, throwing provider: the stream
 *     flows on, unstamped);
 *   - a mixed chain (unstamped + stamped events) still verifies;
 *   - the session store: start refuses an empty helper name and a
 *     helper who IS the owner; end clears; a stored session loads
 *     only for its owner.
 */
import { AuditRecorder, type AuditStore } from '../../context/data/auditWriter';
import {
  auditCanonical,
  buildAuditEvent,
  verifyAuditChain,
  type AuditEvent,
  type AuditEventInput,
} from '../auditChain';
import {
  __resetAssistedSession,
  assistedByForEvent,
  endAssistedSession,
  getAssistedSession,
  loadAssistedSession,
  startAssistedSession,
} from '../assistedSession';

const WS = 'WS-2002';
const NOW = 1_700_000_100_000;

class FakeStore implements AuditStore {
  events: AuditEvent[] = [];
  async readChainHead(workspaceId: string) {
    const rows = this.events
      .filter((e) => e.workspaceId === workspaceId)
      .sort((a, b) => b.seq - a.seq);
    return rows.length ? { seq: rows[0].seq, hash: rows[0].hash } : null;
  }
  async appendEvent(event: AuditEvent) {
    this.events.push(event);
  }
}

const input = (over: Partial<AuditEventInput> = {}): AuditEventInput => ({
  workspaceId: WS,
  actorUid: 'uid-mother',
  actorName: 'Mother',
  actorRole: 'Trustee',
  action: 'treasury.created',
  entityType: 'treasury',
  entityId: 'tx-1',
  summaryKey: 'org.audit.history.treasuryIncome',
  summaryParams: { category: 'Chanda' },
  amount: 500,
  ...over,
});

describe('the hash law', () => {
  it('an unstamped event carries no assistedBy in its canonical digest', () => {
    const canonical = auditCanonical({
      prevHash: 'GENESIS',
      seq: 0,
      createdAt: NOW,
      ...input(),
    });
    expect(canonical).not.toContain('assistedBy');
  });

  it('a stamped event hashes differently and the mixed chain verifies', () => {
    const plain = buildAuditEvent(input(), null, 'e-1', NOW);
    const stamped = buildAuditEvent(
      input({ assistedBy: { uid: 'uid-son', name: 'Ratan' } }),
      { seq: plain.seq, hash: plain.hash },
      'e-2',
      NOW + 1
    );
    expect(stamped.hash).not.toBe(plain.hash);
    expect(verifyAuditChain([plain, stamped]).ok).toBe(true);
    // tamper with the helper name and the chain must break
    const forged = { ...stamped, assistedBy: { uid: 'uid-son', name: 'Someone Else' } };
    expect(verifyAuditChain([plain, forged]).ok).toBe(false);
  });
});

describe('the recorder seam', () => {

  it('stamps when the provider offers a distinct, named helper', async () => {
    const store = new FakeStore();
    const recorder = new AuditRecorder(store, { now: () => NOW, makeId: () => 'a-1', log: () => undefined });
    recorder.setAssistedByProvider(() => ({ uid: 'uid-son', name: 'Ratan' }));
    recorder.record(input());
    await recorder.flush(WS);
    expect(store.events).toHaveLength(1);
    expect(store.events[0].assistedBy).toEqual({ uid: 'uid-son', name: 'Ratan' });
    expect(store.events[0].actorUid).toBe('uid-mother');
  });

  it('never stamps the actor as their own helper, nor an unnamed helper', async () => {
    const store = new FakeStore();
    const recorder = new AuditRecorder(store, { now: () => NOW, makeId: () => 'a-2', log: () => undefined });
    recorder.setAssistedByProvider(() => ({ uid: 'uid-mother', name: 'Mother' }));
    recorder.record(input());
    recorder.setAssistedByProvider(() => ({ uid: 'uid-son', name: '  ' }));
    recorder.record(input({ entityId: 'tx-2' }));
    await recorder.flush(WS);
    expect(store.events).toHaveLength(2);
    expect(store.events[0].assistedBy).toBeUndefined();
    expect(store.events[1].assistedBy).toBeUndefined();
  });

  it('a name-only helper (no account) still stamps, with an empty uid', async () => {
    const store = new FakeStore();
    const recorder = new AuditRecorder(store, { now: () => NOW, makeId: () => 'a-3', log: () => undefined });
    recorder.setAssistedByProvider(() => ({ uid: '', name: 'Neighbour Sevadar' }));
    recorder.record(input());
    await recorder.flush(WS);
    expect(store.events[0].assistedBy).toEqual({ uid: '', name: 'Neighbour Sevadar' });
  });

  it('a throwing provider never breaks the stream', async () => {
    const store = new FakeStore();
    const recorder = new AuditRecorder(store, { now: () => NOW, makeId: () => 'a-4', log: () => undefined });
    recorder.setAssistedByProvider(() => {
      throw new Error('boom');
    });
    recorder.record(input());
    await recorder.flush(WS);
    expect(store.events).toHaveLength(1);
    expect(store.events[0].assistedBy).toBeUndefined();
  });
});

describe('the session store', () => {
  beforeEach(() => {
    __resetAssistedSession();
    try {
      localStorage.clear();
    } catch {
      /* jsdom storage */
    }
  });

  it('start refuses an empty name and the owner as their own helper', () => {
    expect(startAssistedSession({ ownerUid: 'o-1', helperUid: 'h-1', helperName: '  ' })).toBeNull();
    expect(startAssistedSession({ ownerUid: 'o-1', helperUid: 'o-1', helperName: 'Self' })).toBeNull();
    expect(getAssistedSession()).toBeNull();
  });

  it('a started session persists for its owner only, and ends cleanly', () => {
    const s = startAssistedSession({ ownerUid: 'o-1', helperUid: 'h-1', helperName: 'Ratan' });
    expect(s?.helperName).toBe('Ratan');
    expect(loadAssistedSession('o-1')?.helperUid).toBe('h-1');
    expect(loadAssistedSession('someone-else')).toBeNull();
    endAssistedSession('o-1');
    expect(getAssistedSession()).toBeNull();
    expect(loadAssistedSession('o-1')).toBeNull();
  });

  it('the provider stamps only the owner’s own events', () => {
    startAssistedSession({ ownerUid: 'o-1', helperUid: 'h-1', helperName: 'Ratan' });
    expect(assistedByForEvent({ actorUid: 'o-1' })).toEqual({ uid: 'h-1', name: 'Ratan' });
    // the helper's own later actions, from their own account, are
    // theirs alone — the stamp follows the ACCOUNT, not the person
    expect(assistedByForEvent({ actorUid: 'h-1' })).toBeNull();
    expect(assistedByForEvent({ actorUid: 'nobody' })).toBeNull();
  });
});
