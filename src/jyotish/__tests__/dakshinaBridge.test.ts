/**
 * dakshinaBridge.test.ts — consultation → order bridge (pure layer).
 * =====================================================================
 * The Firestore write path (createConsultationDakshinaOrder) is impure
 * and covered by integration; everything else is pure and pinned here.
 */
import {
  canSendDakshina,
  defaultDakshinaAmount,
  validateDakshinaAmount,
  buildDakshinaOrderPayload,
  dakshinaSummary,
  toDakshinaLang,
  DAKSHINA_COPY,
  CONSULTATION_DAKSHINA_GIG_ID,
} from '../dakshinaBridge';
import type { Consultation } from '../../types/jyotish';

function baseConsultation(overrides: Partial<Consultation> = {}): Consultation {
  return {
    id: 'c_123',
    consultationType: 'Kundli Vishleshan',
    preferredDate: '2026-10-20',
    mode: 'chat',
    city: 'Rangpur',
    language: 'bn',
    budgetMin: 100,
    budgetMax: 500,
    notes: '',
    devoteeUid: 'devotee_1',
    devoteeName: 'Meera',
    status: 'COMPLETED',
    assignedJyotishUid: 'jyotish_9',
    assignedJyotishName: 'Pandit Sharma',
    createdAt: 1,
    updatedAt: 2,
    ...overrides,
  } as Consultation;
}

describe('canSendDakshina', () => {
  test('devotee on COMPLETED consultation with assigned jyotish is eligible', () => {
    expect(canSendDakshina(baseConsultation(), 'devotee_1')).toEqual({ ok: true });
  });

  test('non-devotee is rejected', () => {
    expect(canSendDakshina(baseConsultation(), 'stranger')).toEqual({
      ok: false, reason: 'not_devotee',
    });
  });

  test('null uid is rejected', () => {
    expect(canSendDakshina(baseConsultation(), null)).toEqual({
      ok: false, reason: 'not_devotee',
    });
  });

  test('IN_PROGRESS consultation is rejected', () => {
    expect(canSendDakshina(baseConsultation({ status: 'IN_PROGRESS' }), 'devotee_1')).toEqual({
      ok: false, reason: 'not_completed',
    });
  });

  test('OPEN consultation is rejected', () => {
    expect(canSendDakshina(baseConsultation({ status: 'OPEN' }), 'devotee_1')).toEqual({
      ok: false, reason: 'not_completed',
    });
  });

  test('DAKSHINA_RELEASED without an order is still eligible', () => {
    expect(
      canSendDakshina(baseConsultation({ status: 'DAKSHINA_RELEASED' }), 'devotee_1'),
    ).toEqual({ ok: true });
  });

  test('missing assigned jyotish is rejected', () => {
    expect(
      canSendDakshina(
        baseConsultation({ assignedJyotishUid: undefined }),
        'devotee_1',
      ),
    ).toEqual({ ok: false, reason: 'no_jyotish' });
  });

  test('consultation with existing dakshinaOrderId is rejected (dedupe)', () => {
    const c = baseConsultation() as Consultation & { dakshinaOrderId?: string };
    c.dakshinaOrderId = 'order_abc';
    expect(canSendDakshina(c, 'devotee_1')).toEqual({
      ok: false, reason: 'already_sent',
    });
  });
});

describe('defaultDakshinaAmount', () => {
  // JY-FIX-B (JY-06) CORRECTION: this block previously pinned a prefill
  // preference for the consultation's dakshinaAgreed field — a field no
  // jyotish code path ever writes. The prefill is the posted budget max.
  test('prefills from the posted budget max', () => {
    expect(defaultDakshinaAmount(baseConsultation({}))).toBe('500');
  });

  test('a legacy dakshinaAgreed value on the doc is ignored', () => {
    expect(
      defaultDakshinaAmount(baseConsultation({ dakshinaAgreed: 1001 } as Partial<Consultation>)),
    ).toBe('500');
  });

  test('empty when no budget is set', () => {
    expect(defaultDakshinaAmount(baseConsultation({ budgetMax: 0 }))).toBe('');
  });
});

describe('validateDakshinaAmount', () => {
  test('accepts a positive whole number', () => {
    expect(validateDakshinaAmount('501')).toEqual({ ok: true, amount: 501 });
  });

  test('rejects empty', () => {
    expect(validateDakshinaAmount('').ok).toBe(false);
  });

  test('rejects zero and negatives', () => {
    expect(validateDakshinaAmount('0').ok).toBe(false);
    expect(validateDakshinaAmount('-50').ok).toBe(false);
  });

  test('rejects absurdly large amounts', () => {
    expect(validateDakshinaAmount('99999999').ok).toBe(false);
  });

  test('rejects non-numeric input', () => {
    expect(validateDakshinaAmount('abc').ok).toBe(false);
  });
});

describe('buildDakshinaOrderPayload', () => {
  const c = baseConsultation();
  const payload = buildDakshinaOrderPayload({ consultation: c, amount: 501, currency: 'BDT' });

  test('carries the consultation link and marker gig id', () => {
    expect(payload.consultationId).toBe('c_123');
    expect(payload.gigId).toBe(CONSULTATION_DAKSHINA_GIG_ID);
  });

  test('names the consultation type in the title', () => {
    expect(payload.gigTitle).toContain('Kundli Vishleshan');
  });

  test('pins the money fields', () => {
    expect(payload.amountGross).toBe(501);
    expect(payload.currency).toBe('BDT');
  });

  test('is rail-1 pending_payment from the devotee to the jyotishi', () => {
    expect(payload.rail).toBe('rail1');
    expect(payload.status).toBe('pending_payment');
    expect(payload.clientUid).toBe('devotee_1');
    expect(payload.providerUid).toBe('jyotish_9');
    expect(payload.providerType).toBe('jyotishi');
  });

  test('does not set commission fields (filled by the async creator)', () => {
    expect(payload.commissionPercent).toBeUndefined();
    expect(payload.commissionAmount).toBeUndefined();
    expect(payload.providerNet).toBeUndefined();
  });

  test('rules-create compliance: clientUid present, status pending_payment', () => {
    // Mirrors firestore.rules marketplaceOrders allow create.
    expect(payload.clientUid).toBeTruthy();
    expect(payload.status).toBe('pending_payment');
  });
});

describe('copy + formatting', () => {
  test('dakshinaSummary formats with the real currency', () => {
    expect(dakshinaSummary(1500, 'BDT')).toContain('৳');
    expect(dakshinaSummary(1500, 'INR')).toContain('₹');
  });

  test('toDakshinaLang normalizes', () => {
    expect(toDakshinaLang('hi')).toBe('hi');
    expect(toDakshinaLang('bn')).toBe('bn');
    expect(toDakshinaLang('ta')).toBe('en');
    expect(toDakshinaLang('')).toBe('en');
  });

  test('all three languages carry dakshina (never paywall) language', () => {
    for (const lang of ['en', 'hi', 'bn'] as const) {
      const copy = DAKSHINA_COPY[lang];
      expect(copy.sendDakshina).toBeTruthy();
      expect(copy.confirm).toBeTruthy();
      // Gratitude framing, never transactional coercion.
      expect(JSON.stringify(copy).toLowerCase()).not.toContain('paywall');
    }
  });
});
