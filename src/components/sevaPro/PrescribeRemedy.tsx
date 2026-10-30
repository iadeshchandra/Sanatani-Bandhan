/**
 * PrescribeRemedy — jyotish composes a sacred remedy (upaya/parihara).
 * =====================================================================
 * Mounted inside ConsultationChat for the assigned jyotishi. Writes a
 * structured prescription to jyotishConsultations/{id}/remedies (which the
 * devotee sees as a warm RemedyToRitual card) plus a gentle chat message
 * so the conversation stays the human record.
 *
 * Tone: offered as loving guidance. The devotee may accept or simply
 * receive ashirvad — the copy says so explicitly.
 */
import React, { useState } from 'react';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useJyotish } from '../../context/JyotishContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { Consultation } from '../../types/jyotish';
import { sp } from '../../lib/sevaPro/sevaProCopy';
import { friendlyErrorText } from '../../lib/friendlyError';

export const PrescribeRemedy: React.FC<{ consultation: Consultation }> = ({ consultation }) => {
  const { firebaseUser } = useAuthWorkspace();
  const { sendMessage } = useJyotish();
  const { showToast } = useToast();
  const { currentLang } = useLanguage();

  const [open, setOpen] = useState(false);
  const [ritualName, setRitualName] = useState('');
  const [remedyText, setRemedyText] = useState('');
  const [muhurat, setMuhurat] = useState('');
  const [sending, setSending] = useState(false);

  const isJyotish = !!firebaseUser?.uid && consultation.assignedJyotishUid === firebaseUser.uid;
  if (!isJyotish) return null;

  const offer = async () => {
    if (!firebaseUser?.uid) return;
    if (!ritualName.trim() || !remedyText.trim()) {
      showToast(sp(currentLang, 'ritual_name_label') + ' / ' + sp(currentLang, 'remedy_text_label') + ' — required', 'error');
      return;
    }
    setSending(true);
    try {
      const ref = doc(collection(db, 'jyotishConsultations', consultation.id, 'remedies'));
      await setDoc(ref, {
        id: ref.id,
        consultationId: consultation.id,
        devoteeUid: consultation.devoteeUid,
        jyotishUid: firebaseUser.uid,
        jyotishName: consultation.assignedJyotishName || 'Jyotishi',
        ritualName: ritualName.trim().slice(0, 120),
        remedyText: remedyText.trim().slice(0, 1000),
        suggestedMuhurat: muhurat.trim().slice(0, 200),
        status: 'PENDING',
        createdAt: Date.now(),
      });
      // Gentle chat echo so the conversation stays the human record.
      try {
        await sendMessage(
          consultation,
          `🪔 ${sp(currentLang, 'remedy_card_title').replace('🪔 ', '')}: ${ritualName.trim()} — ${remedyText.trim().slice(0, 300)}`
        );
      } catch {
        /* chat echo is best-effort */
      }
      setOpen(false);
      setRitualName('');
      setRemedyText('');
      setMuhurat('');
      showToast(sp(currentLang, 'prescribe_sent'), 'success');
    } catch (err: unknown) {
      console.error(err);
      showToast(friendlyErrorText(err, currentLang, 'save'), 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2.5 rounded-xl text-sm font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 min-h-[44px]"
        title={sp(currentLang, 'prescribe_title')}
      >
        🪔 {sp(currentLang, 'prescribe_title').replace('🪔 ', '')}
      </button>
      {open && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-black text-stone-900">{sp(currentLang, 'prescribe_title')}</h3>
            <p className="text-xs text-stone-500">{sp(currentLang, 'prescribe_hint')}</p>
            <div>
              <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5">
                {sp(currentLang, 'ritual_name_label')}
              </label>
              <input
                value={ritualName}
                onChange={(e) => setRitualName(e.target.value)}
                placeholder={sp(currentLang, 'ritual_name_ph')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5">
                {sp(currentLang, 'remedy_text_label')}
              </label>
              <textarea
                value={remedyText}
                onChange={(e) => setRemedyText(e.target.value)}
                rows={3}
                placeholder={sp(currentLang, 'remedy_text_ph')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5">
                {sp(currentLang, 'suggested_muhurat')} <span className="normal-case font-medium">(optional)</span>
              </label>
              <input
                value={muhurat}
                onChange={(e) => setMuhurat(e.target.value)}
                placeholder={sp(currentLang, 'muhurat_ph')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[44px]"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={offer}
                disabled={sending || !ritualName.trim() || !remedyText.trim()}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-black disabled:opacity-50 min-h-[44px]"
              >
                {sending ? '…' : sp(currentLang, 'prescribe_send')}
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
