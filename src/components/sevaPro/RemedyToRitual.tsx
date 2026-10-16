/**
 * RemedyToRitual — devotee warm card: a prescribed remedy → one-tap puja booking.
 * ============================================================================
 * Mounted inside ConsultationChat for the devotee. Listens to
 * jyotishConsultations/{id}/remedies and renders each PENDING prescription
 * as a warm, pressure-free card: "Your jyotish lovingly suggests…".
 *
 * One tap posts a gig (PurohitContext.postGig) with remedy details pre-filled
 * and `referredBy` pinned at creation (immutable afterwards — see rules).
 * It also writes referralAttributions/{gigId} and flips the remedy to BOOKED.
 */
import React, { useEffect, useState } from 'react';
import { collection, doc, limit, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { usePurohit } from '../../context/PurohitContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { Consultation } from '../../types/jyotish';
import { GigReferralAttribution } from '../../types/purohit';
import {
  DEFAULT_PLATFORM_COMMISSION_PERCENT,
  recordReferralAttribution,
} from '../../lib/sevaPro/referrals';
import type { RemedyPrescription } from '../../lib/sevaPro/referrals';
import { sp } from '../../lib/sevaPro/sevaProCopy';

export function useRemedies(consultationId: string | null): RemedyPrescription[] {
  const [remedies, setRemedies] = useState<RemedyPrescription[]>([]);
  useEffect(() => {
    if (!consultationId) {
      setRemedies([]);
      return;
    }
    const unsub = onSnapshot(
      query(collection(db, 'jyotishConsultations', consultationId, 'remedies'), orderBy('createdAt', 'desc'), limit(20)),
      (snap) => setRemedies(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as RemedyPrescription)),
      () => setRemedies([])
    );
    return () => unsub();
  }, [consultationId]);
  return remedies;
}

export const RemedyToRitual: React.FC<{ consultation: Consultation }> = ({ consultation }) => {
  const { firebaseUser } = useAuthWorkspace();
  const { postGig } = usePurohit();
  const { showToast } = useToast();
  const { currentLang } = useLanguage();

  const remedies = useRemedies(consultation.id);
  const [bookingId, setBookingId] = useState<string | null>(null);

  const isDevotee = !!firebaseUser?.uid && consultation.devoteeUid === firebaseUser.uid;
  if (!isDevotee) return null;

  const pending = remedies.filter((r) => r.status === 'PENDING');
  if (pending.length === 0) return null;

  const dismiss = async (r: RemedyPrescription) => {
    try {
      await updateDoc(doc(db, 'jyotishConsultations', consultation.id, 'remedies', r.id), {
        status: 'DISMISSED',
      });
    } catch {
      /* best-effort */
    }
  };

  const book = async (r: RemedyPrescription) => {
    setBookingId(r.id);
    try {
      const referredBy: GigReferralAttribution = {
        direction: 'jyotish-to-purohit',
        referrerUid: r.jyotishUid,
        referrerName: r.jyotishName,
        referrerRoleId: '',
        consultationId: consultation.id,
        remedyId: r.id,
        remedyText: r.remedyText,
        ritualName: r.ritualName,
        suggestedMuhurat: r.suggestedMuhurat || undefined,
        createdAt: Date.now(),
      };
      const sevaValue = Math.round(Number(consultation.budgetMax || 0));
      const gigId = await postGig({
        ritualType: r.ritualName,
        preferredDate: r.suggestedMuhurat || '',
        city: consultation.city,
        language: consultation.language,
        budgetMin: Math.round(Number(consultation.budgetMin || 0)),
        budgetMax: sevaValue,
        notes: `🪔 ${r.remedyText}${r.suggestedMuhurat ? `\n${sp(currentLang, 'suggested_muhurat')}: ${r.suggestedMuhurat}` : ''}\n— ${sp(currentLang, 'prescribed_by')} ${r.jyotishName}`,
        referredBy,
      });
      await recordReferralAttribution({
        orderId: gigId,
        orderType: 'gig',
        referredBy,
        devoteeUid: consultation.devoteeUid,
        sevaValue,
        platformCommission: Math.round((sevaValue * DEFAULT_PLATFORM_COMMISSION_PERCENT) / 100),
        platformCommissionPercent: DEFAULT_PLATFORM_COMMISSION_PERCENT,
      });
      await updateDoc(doc(db, 'jyotishConsultations', consultation.id, 'remedies', r.id), {
        status: 'BOOKED',
        bookedGigId: gigId,
      });
      showToast(sp(currentLang, 'remedy_booked_note'), 'success');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Booking failed', 'error');
    } finally {
      setBookingId(null);
    }
  };

  return (
    <div className="space-y-3 mb-3">
      {pending.map((r) => (
        <div
          key={r.id}
          className="rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-4 shadow-sm"
        >
          <p className="text-sm font-black text-amber-900 mb-1">{sp(currentLang, 'remedy_card_title')}</p>
          <p className="text-[13px] text-stone-700 leading-relaxed mb-1">
            <span className="font-bold">{r.ritualName}</span>
          </p>
          <p className="text-[13px] text-stone-600 leading-relaxed mb-2">
            {sp(currentLang, 'remedy_card_body', { ritual: r.ritualName, jyotish: r.jyotishName })}
          </p>
          {r.suggestedMuhurat && (
            <p className="text-xs text-amber-800 mb-3">
              📿 {sp(currentLang, 'suggested_muhurat')}: <span className="font-bold">{r.suggestedMuhurat}</span>
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => book(r)}
              disabled={bookingId === r.id}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-black disabled:opacity-50 min-h-[44px]"
            >
              {bookingId === r.id ? sp(currentLang, 'remedy_booking') : `🪔 ${sp(currentLang, 'remedy_card_cta')}`}
            </button>
            <button
              type="button"
              onClick={() => dismiss(r)}
              disabled={bookingId === r.id}
              className="px-4 py-3 rounded-xl border border-stone-300 text-sm font-bold text-stone-500 min-h-[44px]"
            >
              {sp(currentLang, 'remedy_card_later')}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
