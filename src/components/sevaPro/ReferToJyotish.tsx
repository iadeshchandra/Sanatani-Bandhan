/**
 * ReferToJyotish — purohit refers the devotee to a verified jyotishi.
 * =====================================================================
 * Mirrors the Jyotish One <ReferProfessional> pattern in reverse. Mounted on
 * a gig row (MyGigsTab) so the purohit can tap it during/after a puja —
 * e.g. "I noticed signs of Kaal Sarp dosha; a kundli reading would help."
 *
 * Writes to `jyotishReferrals` via PurohitContext.referJyotish (see patch),
 * carrying gigId + devoteeUid so the devotee sees a warm JyotishReferralCard
 * in their bookings. Only badge-holding (non-REGISTERED) jyotishis are
 * listed; rules pin toTier.
 */
import React, { useEffect, useState } from 'react';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from '../../firebase';
import { usePurohit } from '../../context/PurohitContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { VerificationBadge } from '../../components/common/VerificationBadge';
import { RitualGig } from '../../types/purohit';
import { JyotishIdentity, JyotishVerificationTier } from '../../types/jyotish';
import { sp } from '../../lib/sevaPro/sevaProCopy';

interface VerifiedJyotish {
  id: string;
  name: string;
  tier: JyotishVerificationTier;
}

export const ReferToJyotish: React.FC<{ gig?: RitualGig; compact?: boolean }> = ({ gig, compact }) => {
  const { referJyotish } = usePurohit();
  const { showToast } = useToast();
  const { currentLang } = useLanguage();

  const [open, setOpen] = useState(false);
  const [pros, setPros] = useState<VerifiedJyotish[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState('');
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      try {
        // Only badge-holding (non-REGISTERED) jyotishis are referable.
        const snap = await getDocs(query(collection(db, 'jyotishProfiles'), limit(200)));
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as object) }) as JyotishIdentity)
          .filter((p) => p.verificationTier && p.verificationTier !== 'REGISTERED')
          .map((p) => ({ id: p.id, name: p.displayName, tier: p.verificationTier }));
        setPros(list);
      } catch {
        setPros([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open ]);

  const send = async () => {
    const pro = pros.find((p) => p.id === selected);
    if (!pro) {
      showToast('Pick a verified jyotishi to refer.', 'error');
      return;
    }
    if (!reason.trim()) {
      showToast('Add a short, loving reason for the referral.', 'error');
      return;
    }
    setSending(true);
    try {
      await referJyotish({
        toRoleId: pro.id,
        toName: pro.name,
        toTier: pro.tier,
        reason: reason.trim(),
        gigId: gig?.id,
        devoteeUid: gig?.devoteeUid,
        devoteeName: gig?.devoteeName,
      });
      setOpen(false);
      setSelected('');
      setReason('');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Referral failed', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          compact
            ? 'px-4 py-2.5 rounded-xl text-sm font-bold bg-white text-stone-700 border border-stone-300 hover:bg-stone-50 min-h-[44px]'
            : 'px-4 py-2.5 rounded-xl text-sm font-bold bg-indigo-100 text-indigo-800 hover:bg-indigo-200 min-h-[44px]'
        }
        title={sp(currentLang, 'refer_jyotish_title')}
      >
        {sp(currentLang, 'refer_jyotish_btn')}
      </button>
      {open && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-black text-stone-900">{sp(currentLang, 'refer_jyotish_title')}</h3>
            <p className="text-xs text-stone-500">{sp(currentLang, 'refer_jyotish_hint')}</p>
            {loading ? (
              <p className="text-sm text-stone-400">Loading verified jyotishis…</p>
            ) : pros.length === 0 ? (
              <p className="text-sm text-stone-400">
                No verified jyotishis found yet. Referrals unlock as jyotishis earn badges.
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2">
                {pros.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelected(p.id)}
                    className={`w-full flex items-center justify-between gap-2 rounded-xl border p-3 text-left min-h-[44px] ${
                      selected === p.id ? 'border-indigo-500 bg-indigo-50' : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <span className="text-sm font-bold text-stone-800">{p.name}</span>
                    <VerificationBadge tier={p.tier} subject="Jyotishi" size="xs" />
                  </button>
                ))}
              </div>
            )}
            <div>
              <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5">
                Loving reason (shown to the devotee)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder={sp(currentLang, 'refer_reason_ph')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={send}
                disabled={sending || !selected}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-black disabled:opacity-50 min-h-[44px]"
              >
                {sending ? 'Sending…' : sp(currentLang, 'refer_jyotish_btn')}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-3 rounded-xl border border-stone-300 text-sm font-bold text-stone-600 min-h-[44px]"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
