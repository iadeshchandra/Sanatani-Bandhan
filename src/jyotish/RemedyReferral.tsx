/**
 * RemedyReferral — cross-link between Jyotish One and Purohit One.
 * =====================================================================
 * A jyotishi recommends a VERIFIED purohit for remedies (upaya/parihara)
 * from a consultation; the referral carries the purohit's verification
 * badge. Unverified names cannot be sent (UI lists only badge-holding
 * purohits; rules pin the toTier field).
 *
 * <ReferProfessional> renders a compact "🤝 Refer" button + picker dialog.
 * Mount it anywhere inside a JyotishProvider (e.g. MyConsultationsTab).
 */
import React, { useEffect, useState } from 'react';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useJyotish } from '../context/JyotishContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { friendlyError } from '../lib/friendlyError';
import { VerificationBadge } from '../components/common/VerificationBadge';
import { PurohitIdentity, PurohitVerificationTier } from '../types/purohit';

interface VerifiedPro {
  id: string;
  name: string;
  tier: PurohitVerificationTier;
  kind: 'purohit';
}

export const ReferProfessional: React.FC<{ consultationId?: string; compact?: boolean }> = ({
  consultationId,
  compact,
}) => {
  const { t } = useLanguage();
  const { referProfessional } = useJyotish();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [pros, setPros] = useState<VerifiedPro[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState('');
  const [reason, setReason] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      try {
        // Only badge-holding (non-REGISTERED) purohits are referable.
        const snap = await getDocs(query(collection(db, 'purohits'), limit(200)));
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) } as PurohitIdentity))
          .filter((p) => p.verificationTier && p.verificationTier !== 'REGISTERED')
          .map((p) => ({ id: p.id, name: p.displayName, tier: p.verificationTier, kind: 'purohit' as const }));
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
      showToast('Pick a verified purohit to refer.', 'error');
      return;
    }
    if (!reason.trim()) {
      showToast(t('jyotish.referral.addReason'), 'error');
      return;
    }
    setSending(true);
    try {
      await referProfessional({
        toRoleId: pro.id,
        toName: pro.name,
        toKind: 'purohit',
        toTier: pro.tier,
        reason: reason.trim(),
        consultationId,
      });
      setOpen(false);
      setSelected('');
      setReason('');
    } catch (err: any) {
      console.error(err);
      showToast(friendlyError(err, t, 'save'), 'error');
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
            : 'px-4 py-2.5 rounded-xl text-sm font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 min-h-[44px]'
        }
        title={t('jyotish.referral.recommendTitle')}
      >
        🤝 Refer purohit
      </button>
      {open && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-black text-stone-900">🤝 Refer a verified Purohit</h3>
            <p className="text-xs text-stone-500">
              For remedies (upaya / parihara) arising from this consultation. Only
              verification-badge holders appear below.
            </p>
            {loading ? (
              <p className="text-sm text-stone-400">{t('jyotish.referral.loading')}</p>
            ) : pros.length === 0 ? (
              <p className="text-sm text-stone-400">
                {t('jyotish.referral.noneFound')}
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
                    <VerificationBadge tier={p.tier} subject="Purohit" size="xs" />
                  </button>
                ))}
              </div>
            )}
            <div>
              <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5">
                {t('jyotish.referral.reasonLabel')}
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder={t('jyotish.referral.reasonExample')}
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
                {sending ? t('jyotish.referral.sending') : t('jyotish.referral.sendReferral')}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-3 rounded-xl border border-stone-300 text-sm font-bold text-stone-600 min-h-[44px]"
              >
                {t('jyotish.referral.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
