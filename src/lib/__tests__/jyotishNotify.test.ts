/**
 * jyotishNotify.test.ts — JY-FIX-B pins for JY-08 (consultation Suchana).
 * =====================================================================
 * Before FIX-B the consultation lifecycle rang no bell at all. These
 * tests pin the pure picker: the four events, the baseline law, the
 * once-per-transition ledger, and the message dedupe.
 */
import {
  pickJyotishNotifyEvents,
  jyotishDedupeKey,
  type JyotishConsultationLite,
  type JyotishLedger,
} from '../jyotishNotify';

const DEVOTEE = 'uid_devotee';
const JYOTISHI = 'uid_jyotishi';

function consultation(over: Partial<JyotishConsultationLite> = {}): JyotishConsultationLite {
  return {
    id: 'c1',
    status: 'OPEN',
    devoteeUid: DEVOTEE,
    assignedJyotishUid: JYOTISHI,
    devoteeName: 'Devotee Das',
    assignedJyotishName: 'Pt. Sharma',
    consultationType: 'Kundli Vishleshan',
    updatedAtMs: 1000,
    ...over,
  };
}

const EMPTY: JyotishLedger = { s: {}, m: {} };

describe('JY-08 — status bells', () => {
  test('baseline run records everything and rings nothing', () => {
    const { events, nextLedger } = pickJyotishNotifyEvents({
      uid: DEVOTEE,
      consultations: [consultation({ status: 'ASSIGNED' })],
      latestMessages: [],
      ledger: EMPTY,
      baseline: true,
    });
    expect(events).toEqual([]);
    expect(nextLedger.s.c1).toBe('ASSIGNED');
  });

  test('devotee: OPEN → ASSIGNED rings accepted, once', () => {
    const first = pickJyotishNotifyEvents({
      uid: DEVOTEE,
      consultations: [consultation({ status: 'ASSIGNED' })],
      latestMessages: [],
      ledger: { s: { c1: 'OPEN' }, m: {} },
      baseline: false,
    });
    expect(first.events.map((e) => e.kind)).toEqual(['accepted']);
    expect(first.events[0].otherName).toBe('Pt. Sharma');
    // Same state observed again → silence.
    const second = pickJyotishNotifyEvents({
      uid: DEVOTEE,
      consultations: [consultation({ status: 'ASSIGNED' })],
      latestMessages: [],
      ledger: first.nextLedger,
      baseline: false,
    });
    expect(second.events).toEqual([]);
  });

  test('devotee: IN_PROGRESS → COMPLETED rings completed (not accepted again)', () => {
    const { events } = pickJyotishNotifyEvents({
      uid: DEVOTEE,
      consultations: [consultation({ status: 'COMPLETED' })],
      latestMessages: [],
      ledger: { s: { c1: 'IN_PROGRESS' }, m: {} },
      baseline: false,
    });
    expect(events.map((e) => e.kind)).toEqual(['completed']);
  });

  test('devotee: a long-offline jump OPEN → COMPLETED rings accepted + completed', () => {
    const { events } = pickJyotishNotifyEvents({
      uid: DEVOTEE,
      consultations: [consultation({ status: 'COMPLETED' })],
      latestMessages: [],
      ledger: { s: { c1: 'OPEN' }, m: {} },
      baseline: false,
    });
    expect(events.map((e) => e.kind)).toEqual(['accepted', 'completed']);
  });

  test('jyotishi: COMPLETED → DAKSHINA_RELEASED rings dakshina for the jyotishi only', () => {
    const asJyotishi = pickJyotishNotifyEvents({
      uid: JYOTISHI,
      consultations: [consultation({ status: 'DAKSHINA_RELEASED' })],
      latestMessages: [],
      ledger: { s: { c1: 'COMPLETED' }, m: {} },
      baseline: false,
    });
    expect(asJyotishi.events.map((e) => e.kind)).toEqual(['dakshina']);
    expect(asJyotishi.events[0].otherName).toBe('Devotee Das');

    const asDevotee = pickJyotishNotifyEvents({
      uid: DEVOTEE,
      consultations: [consultation({ status: 'DAKSHINA_RELEASED' })],
      latestMessages: [],
      ledger: { s: { c1: 'COMPLETED' }, m: {} },
      baseline: false,
    });
    expect(asDevotee.events).toEqual([]);
  });

  test('cancellations ring nothing (not one of the four bells)', () => {
    const { events } = pickJyotishNotifyEvents({
      uid: DEVOTEE,
      consultations: [consultation({ status: 'CANCELLED' })],
      latestMessages: [],
      ledger: { s: { c1: 'OPEN' }, m: {} },
      baseline: false,
    });
    expect(events).toEqual([]);
  });
});

describe('JY-08 — message bells', () => {
  const active = consultation({ status: 'IN_PROGRESS' });

  test('a new latest message from the other party rings once per message', () => {
    const first = pickJyotishNotifyEvents({
      uid: DEVOTEE,
      consultations: [active],
      latestMessages: [{ consultationId: 'c1', messageId: 'm9', senderUid: JYOTISHI }],
      ledger: { s: { c1: 'IN_PROGRESS' }, m: { c1: 'm7' } },
      baseline: false,
    });
    expect(first.events.map((e) => e.kind)).toEqual(['message']);
    expect(first.events[0].messageId).toBe('m9');
    expect(first.events[0].otherName).toBe('Pt. Sharma');

    const again = pickJyotishNotifyEvents({
      uid: DEVOTEE,
      consultations: [active],
      latestMessages: [{ consultationId: 'c1', messageId: 'm9', senderUid: JYOTISHI }],
      ledger: first.nextLedger,
      baseline: false,
    });
    expect(again.events).toEqual([]);
  });

  test('my own message never rings for me', () => {
    const { events } = pickJyotishNotifyEvents({
      uid: DEVOTEE,
      consultations: [active],
      latestMessages: [{ consultationId: 'c1', messageId: 'm9', senderUid: DEVOTEE }],
      ledger: { s: { c1: 'IN_PROGRESS' }, m: {} },
      baseline: false,
    });
    expect(events).toEqual([]);
  });

  test('baseline swallows message news but records the message id', () => {
    const { events, nextLedger } = pickJyotishNotifyEvents({
      uid: DEVOTEE,
      consultations: [active],
      latestMessages: [{ consultationId: 'c1', messageId: 'm9', senderUid: JYOTISHI }],
      ledger: EMPTY,
      baseline: true,
    });
    expect(events).toEqual([]);
    expect(nextLedger.m.c1).toBe('m9');
  });
});

describe('JY-08 — dedupe keys are stable per logical event', () => {
  test('key shapes', () => {
    expect(jyotishDedupeKey({ kind: 'accepted', consultationId: 'c1', otherName: '', consultationType: '' }))
      .toBe('jyotish:accepted:c1');
    expect(jyotishDedupeKey({ kind: 'message', consultationId: 'c1', otherName: '', consultationType: '', messageId: 'm9' }))
      .toBe('jyotish:msg:c1:m9');
  });
});
