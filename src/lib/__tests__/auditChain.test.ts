/**
 * auditChain.test.ts — Blueprint A: the master audit stream's chain.
 *
 * Pins the laws the stream's credibility rests on:
 *   - events chain: each event's prevHash is the previous event's
 *     hash, the first hangs off the GENESIS sentinel (the cash-custody
 *     chain's exact algorithm — same sha256Hex, same canonical form);
 *   - verification recomputes every hash and reports the FIRST break;
 *   - tampering with any hashed field (amount, actor, action, time)
 *     or re-linking a prevHash is detected at the tampered event;
 *   - summaries render plain-language from the event's own template
 *     key, and an unresolvable key degrades to "Actor — action",
 *     never a raw i18n key.
 */
import {
  AUDIT_GENESIS,
  buildAuditEvent,
  computeAuditHash,
  renderAuditSummary,
  verifyAuditChain,
  type AuditEvent,
  type AuditEventInput,
} from '../auditChain';

const WS = 'WS-9001';

function input(over: Partial<AuditEventInput> = {}): AuditEventInput {
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

function chainOf(n: number): AuditEvent[] {
  const events: AuditEvent[] = [];
  let head: { seq: number; hash: string } | null = null;
  for (let i = 0; i < n; i++) {
    const ev = buildAuditEvent(
      input({ entityId: `tx-${i + 1}`, amount: 100 * (i + 1) }),
      head,
      `aud-${i}`,
      1_700_000_000_000 + i * 60_000
    );
    events.push(ev);
    head = { seq: ev.seq, hash: ev.hash };
  }
  return events;
}

describe('chain construction', () => {
  it('starts at GENESIS with seq 0', () => {
    const [first] = chainOf(1);
    expect(first.seq).toBe(0);
    expect(first.prevHash).toBe(AUDIT_GENESIS);
    expect(first.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('links every event to the previous hash, seq monotonic', () => {
    const events = chainOf(5);
    for (let i = 1; i < events.length; i++) {
      expect(events[i].seq).toBe(events[i - 1].seq + 1);
      expect(events[i].prevHash).toBe(events[i - 1].hash);
    }
  });

  it('hash is deterministic over the same fields (stable stringify)', () => {
    const a = buildAuditEvent(input(), null, 'aud-x', 1_700_000_000_000);
    const b = buildAuditEvent(input(), null, 'aud-y', 1_700_000_000_000);
    // id is not a hashed field; everything else equal -> same hash.
    expect(a.hash).toBe(b.hash);
    expect(computeAuditHash(a)).toBe(a.hash);
  });

  it('summaryParams key order does not change the hash', () => {
    const e1 = buildAuditEvent(
      input({ summaryParams: { a: '1', b: '2' } }),
      null,
      'aud-1',
      1_700_000_000_000
    );
    const e2 = buildAuditEvent(
      input({ summaryParams: { b: '2', a: '1' } }),
      null,
      'aud-2',
      1_700_000_000_000
    );
    expect(e1.hash).toBe(e2.hash);
  });
});

describe('verification', () => {
  it('an intact chain verifies, genesis-anchored', () => {
    const result = verifyAuditChain(chainOf(6));
    expect(result.ok).toBe(true);
    expect(result.firstBreak).toBe(-1);
    expect(result.checked).toBe(6);
    expect(result.anchoredAtGenesis).toBe(true);
  });

  it('an empty chain verifies trivially', () => {
    const result = verifyAuditChain([]);
    expect(result.ok).toBe(true);
    expect(result.checked).toBe(0);
  });

  it('detects a tampered amount at the tampered event', () => {
    const events = chainOf(5);
    const tampered = events.map((e, i) =>
      i === 2 ? { ...e, amount: 999999 } : e
    );
    const result = verifyAuditChain(tampered);
    expect(result.ok).toBe(false);
    expect(result.firstBreak).toBe(2);
    expect(result.firstBreakId).toBe(events[2].id);
  });

  it('detects a tampered actor (impersonation rewrite)', () => {
    const events = chainOf(4);
    const tampered = events.map((e, i) =>
      i === 1 ? { ...e, actorName: 'Someone Else', actorUid: 'uid-x' } : e
    );
    const result = verifyAuditChain(tampered);
    expect(result.ok).toBe(false);
    expect(result.firstBreak).toBe(1);
  });

  it('detects a re-linked prevHash (inserted/reordered history)', () => {
    const events = chainOf(4);
    const tampered = events.map((e, i) =>
      i === 3 ? { ...e, prevHash: AUDIT_GENESIS } : e
    );
    const result = verifyAuditChain(tampered);
    expect(result.ok).toBe(false);
    expect(result.firstBreak).toBe(3);
  });

  it('detects a forged hash field', () => {
    const events = chainOf(3);
    const tampered = events.map((e, i) =>
      i === 0 ? { ...e, hash: 'f'.repeat(64) } : e
    );
    const result = verifyAuditChain(tampered);
    expect(result.ok).toBe(false);
    expect(result.firstBreak).toBe(0);
  });

  it('verifies a later segment for internal linkage (not genesis-anchored)', () => {
    const events = chainOf(6).slice(3);
    const result = verifyAuditChain(events);
    expect(result.ok).toBe(true);
    expect(result.anchoredAtGenesis).toBe(false);
    expect(result.checked).toBe(3);
  });
});

describe('plain-language rendering', () => {
  const dict: Record<string, string> = {
    'org.audit.history.treasuryIncome':
      '{actor} recorded a donation of {amount} — {entity}',
    'org.audit.history.bookingStatus': '{actor} marked {entity} as {to}',
  };
  const translate = (k: string) => dict[k] ?? k;
  const fmt = (n: number) => `৳${n.toLocaleString('en-IN')}`;

  it('fills actor, amount and entity from the event', () => {
    const [ev] = chainOf(1); // chainOf sets amount = 100 for the first event
    expect(renderAuditSummary(ev, translate, fmt)).toBe(
      'Rina Das recorded a donation of ৳100 — Rina Das'
    );
  });

  it('fills summaryParams placeholders (booking status)', () => {
    const ev = buildAuditEvent(
      input({
        action: 'booking.statusChanged',
        entityType: 'booking',
        entityId: 'pb-1',
        entityLabel: 'Satyanarayan Katha',
        summaryKey: 'org.audit.history.bookingStatus',
        summaryParams: { to: 'Completed' },
        amount: undefined,
      }),
      null,
      'aud-b',
      1_700_000_000_000
    );
    expect(renderAuditSummary(ev, translate, fmt)).toBe(
      'Rina Das marked Satyanarayan Katha as Completed'
    );
  });

  it('an unresolvable key degrades to Actor — action, never the raw key', () => {
    const [ev] = chainOf(1);
    const out = renderAuditSummary({ ...ev, summaryKey: 'org.audit.missing' }, translate, fmt);
    expect(out).toBe('Rina Das — treasury.created');
    expect(out).not.toContain('org.audit');
  });
});
