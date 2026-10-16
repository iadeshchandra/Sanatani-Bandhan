/**
 * JyotishReferralCard — devotee warm card for purohit → jyotish referrals.
 * =========================================================================
 * Mounted in the devotee's bookings area (e.g. above "My consultations" in
 * JyotishMarketplace). Listens to jyotishReferrals where devoteeUid == me and
 * toKind == 'jyotish', rendering each as a warm, pressure-free card.
 *
 * One tap posts a consultation (JyotishContext.postConsultation) with
 * `referredBy` pinned at creation, then writes referralAttributions/{id}.
 * Dismissing simply hides the card (the referral doc remains as a record).
 */
import React, { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useJyotish } from '../../context/JyotishContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { ConsultationReferralAttribution, RemedyReferral } from '../../types/jyotish';
import {
  DEFAULT_PLATFORM_COMMISSION_PERCENT,
  recordReferralAttribution,
} from '../../lib/sevaPro/referrals';
import { sp } from '../../lib/sevaPro/sevaProCopy';

export function useMyJyotishReferrals(): RemedyReferral[] {
  const { firebaseUser } = useAuthWorkspace();
  const [rows, setRows] = useState<RemedyReferral[]>([]);
  useEffect(() => {
    const uid = firebaseUser?.uid;
    if (!uid) {
      setRows([]);
      return;
    }
    // Equality-only query (no orderBy): served by automatic indexes, no
    // composite index needed. Sorted client-side below.
    const unsub = onSnapshot(
      query(
        collection(db, 'jyotishReferrals'),
        where('devoteeUid', '==', uid),
        where('toKind', '==', 'jyotish'),
        limit(20)
      ),
      (snap) =>
        setRows(
          snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as object) }) as RemedyReferral)
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        ),
      () => setRows([])
    );
    return () => unsub();
  }, [firebaseUser?.uid]);
  return rows;
}

export const JyotishReferralCard: React.FC = () => {
  const { firebaseUser } = useAuthWorkspace();
  const { postConsultation } = useJyotish();
  const { showToast } = useToast();
  const { currentLang } = useLanguage();

  const referrals = useMyJyotishReferrals();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [bookingId, setBookingId] = useState<string | null>(null);

  const visible = referrals.filter((r) => !dismissed.has(r.id));
  if (visible.length === 0) return null;

  const book = async (r: RemedyReferral) => {
    setBookingId(r.id);
    try {
      const referredBy: ConsultationReferralAttribution = {
        direction: 'purohit-to-jyotish',
        referrerUid: r.fromUid,
        referrerName: r.fromName,
        referrerRoleId: r.fromRoleId,
        gigId: (r as { gigId?: string }).gigId,
        referralId: r.id,
        reason: r.reason,
        createdAt: Date.now(),
      };
      const consultationId = await postConsultation({
        consultationType: 'Kundli Vishleshan',
        preferredDate: '',
        mode: 'chat',
        city: '',
        language: currentLang,
        budgetMin: 0,
        budgetMax: 0,
        notes: `🔮 ${r.reason}\n— ${sp(currentLang, 'jyotish_referral_by')} ${r.fromName}`,
        referredBy,
      });
      await recordReferralAttribution({
        orderId: consultationId,
        orderType: 'consultation',
        referredBy,
        devoteeUid: firebaseUser?.uid || '',
        sevaValue: 0,
        platformCommission: 0,
        platformCommissionPercent: DEFAULT_PLATFORM_COMMISSION_PERCENT,
      });
      setDismissed((s) => new Set(s).add(r.id));
      showToast(sp(currentLang, 'prescribe_sent'), 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Booking failed', 'error');
    } finally {
      setBookingId(null);
    }
  };

  return (
    <div className="space-y-3 mb-4">
      {visible.map((r) => (
        <div
          key={r.id}
          className="rounded-2xl border border-indigo-300 bg-gradient-to-br from-indigo-50 to-violet-50 p-4 shadow-sm"
        >
          <p className="text-sm font-black text-indigo-900 mb-1">{sp(currentLang, 'jyotish_referral_title')}</p>
          <p className="text-[13px] text-stone-600 leading-relaxed mb-3">
            {sp(currentLang, 'jyotish_referral_body', { purohit: r.fromName, reason: r.reason })}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => book(r)}
              disabled={bookingId === r.id}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-black disabled:opacity-50 min-h-[44px]"
            >
              {bookingId === r.id ? sp(currentLang, 'remedy_booking') : `🔮 ${sp(currentLang, 'jyotish_referral_cta')}`}
            </button>
            <button
              type="button"
              onClick={() => setDismissed((s) => new Set(s).add(r.id))}
              disabled={bookingId === r.id}
              className="px-4 py-3 rounded-xl border border-stone-300 text-sm font-bold text-stone-500 min-h-[44px]"
            >
              {sp(currentLang, 'remedy_card_later')}
            </button>
          </div>
          <p className="text-[11px] text-stone-400 mt-2">{sp(currentLang, 'credit_explainer')}</p>
        </div>
      ))}
    </div>
  );
};
