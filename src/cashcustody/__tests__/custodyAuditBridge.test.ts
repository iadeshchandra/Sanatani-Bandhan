/**
 * custodyAuditBridge.test.ts — the Cash Custody → Blueprint A mirror.
 * Every custody event kind must map to exactly one master-stream input
 * carrying the local chain's hash link, so the two chains can be
 * cross-verified; the bridge must never throw into the counting room.
 */
import { chainEvent } from '../cashCustodyStore';
import type { CustodyEvent, CustodyEventKind } from '../types';
import {
  CUSTODY_AUDIT_ACTION,
  CUSTODY_AUDIT_ENTITY_TYPE,
  CUSTODY_AUDIT_SUMMARY_KEY,
  custodyEventToAuditInput,
  recordCustodyEvent,
  truncateDetails,
  type CustodyAuditContext,
} from '../custodyAuditBridge';

const CTX: CustodyAuditContext = {
  workspaceId: 'ws-mandir-1',
  actorUid: 'uid-trustee-1',
  actorName: 'Shri Trustee',
  actorRole: 'TRUSTEE',
};

const KINDS: CustodyEventKind[] = [
  'box_registered', 'box_opened', 'count_started', 'count_verified',
  'session_closed', 'deposit_created', 'deposit_confirmed',
  'seal_changed', 'staff_checkin', 'staff_checkout',
];

function sampleEvent(kind: CustodyEventKind): CustodyEvent {
  return chainEvent(undefined, kind, 'Maker Name', 'HND-001 detail line', 1700000000000, 3);
}

describe('custodyEventToAuditInput', () => {
  it('maps every custody kind to a distinct verb.object action', () => {
    const actions = KINDS.map((k) => CUSTODY_AUDIT_ACTION[k]);
    expect(new Set(actions).size).toBe(KINDS.length);
    for (const a of actions) expect(a).toMatch(/^custody\.[a-zA-Z]+$/);
  });

  it('carries workspace, actor and entity identity from the context + event', () => {
    const ev = sampleEvent('box_opened');
    const input = custodyEventToAuditInput(ev, CTX);
    expect(input.workspaceId).toBe(CTX.workspaceId);
    expect(input.actorUid).toBe(CTX.actorUid);
    expect(input.actorName).toBe(CTX.actorName);
    expect(input.actorRole).toBe(CTX.actorRole);
    expect(input.entityType).toBe(CUSTODY_AUDIT_ENTITY_TYPE);
    expect(input.entityId).toBe(ev.id);
    expect(input.summaryKey).toBe(CUSTODY_AUDIT_SUMMARY_KEY);
  });

  it('binds the local chain link (hash + prevHash + seq) as the digest', () => {
    const ev = sampleEvent('session_closed');
    const input = custodyEventToAuditInput(ev, CTX);
    expect(input.changes?.custodyHash.to).toBe(ev.hash);
    expect(input.changes?.custodyPrevHash.to).toBe(ev.prevHash);
    expect(input.changes?.custodySeq.to).toBe(ev.seq);
  });

  it("preserves the custody event's own timestamp, not mirror time", () => {
    const ev = sampleEvent('deposit_confirmed');
    expect(custodyEventToAuditInput(ev, CTX).createdAt).toBe(ev.ts);
  });

  it('keeps the typed counting-room actor inside summaryParams, never as actor', () => {
    const ev = sampleEvent('count_verified');
    const input = custodyEventToAuditInput(ev, CTX);
    expect(input.actorName).toBe(CTX.actorName);
    expect(input.summaryParams?.custodyActor).toBe('Maker Name');
    expect(input.summaryParams?.details).toBe('HND-001 detail line');
  });
});

describe('truncateDetails', () => {
  it('passes short details through trimmed', () => {
    expect(truncateDetails('  abc  ')).toBe('abc');
  });
  it('caps long details at 240 chars with an ellipsis', () => {
    const out = truncateDetails('x'.repeat(500));
    expect(out.length).toBe(240);
    expect(out.endsWith('…')).toBe(true);
  });
});

describe('recordCustodyEvent', () => {
  it('hands exactly one mapped input to the recorder', () => {
    const seen: unknown[] = [];
    const recorder = { record: (i: unknown) => { seen.push(i); } };
    const ev = sampleEvent('deposit_created');
    recordCustodyEvent(recorder, ev, CTX);
    expect(seen.length).toBe(1);
    expect((seen[0] as { action: string }).action).toBe('custody.depositCreated');
  });

  it('never throws, even when the recorder does', () => {
    const recorder = { record: () => { throw new Error('stream down'); } };
    expect(() => recordCustodyEvent(recorder, sampleEvent('box_opened'), CTX)).not.toThrow();
  });
});
