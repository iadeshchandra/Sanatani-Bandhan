/**
 * crisis/SOSConfirm.tsx — step 2 of the SOS flow.
 * =================================================
 * Shows exactly what will be sent (who / where / what), the privacy notice
 * ("Your location is shared ONLY for this SOS. We never track you."), a big
 * Confirm button and Cancel. On confirm → triggerSOS → active SOS view.
 *
 * If the sender is inside a soft abuse cooldown, a calm nudge is shown —
 * the SOS can ALWAYS still be sent.
 */
import React, { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { MapPin, Users, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';
import type { SituationKind } from './types';
import { getAbuseRecord, isInCooldown } from './sosService';
import { triggerSOSWithNotify } from './crisisNotify';
import { crisisCopy, useCrisisT } from './crisisStrings';
import type { SituationSelection } from './SituationPicker';

const SITUATION_ICON: Record<SituationKind, string> = {
  medical: '🩸',
  fire: '🔥',
  robbery: '🚨',
  crowd: '👥',
  disaster: '🌊',
  other: '🎙️',
};

const SITUATION_LABEL: Record<SituationKind, keyof typeof crisisCopy> = {
  medical: 'sitMedical',
  fire: 'sitFire',
  robbery: 'sitRobbery',
  crowd: 'sitCrowd',
  disaster: 'sitDisaster',
  other: 'sitOther',
};

export const SOSConfirm: React.FC<{
  selection: SituationSelection;
  onSent: (eventId: string) => void;
  onCancel: () => void;
}> = ({ selection, onSent, onCancel }) => {
  const t = useCrisisT();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inCooldown, setInCooldown] = useState(false);

  useEffect(() => {
    const uid = getAuth().currentUser?.uid;
    if (!uid) return;
    getAbuseRecord(uid)
      .then((rec) => setInCooldown(isInCooldown(rec)))
      .catch(() => setInCooldown(false));
  }, []);

  const confirm = async () => {
    setSending(true);
    setError(null);
    try {
      const eventId = await triggerSOSWithNotify({
        situation: selection.situation,
        details: selection.details,
        voiceNoteBlob: selection.voiceNoteBlob,
      });
      try {
        if ('vibrate' in navigator) navigator.vibrate(120);
      } catch {
        /* haptics unavailable */
      }
      onSent(eventId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'send-failed');
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9995] flex items-end sm:items-center justify-center bg-stone-950/60 backdrop-blur-sm p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={t(crisisCopy.confirmTitle)}
    >
      <div className="w-full sm:max-w-md bg-gradient-to-b from-amber-50 to-stone-100 rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-6">
        <h2 className="text-xl font-extrabold text-stone-900 text-center">{t(crisisCopy.confirmTitle)}</h2>
        <p className="text-sm text-stone-600 text-center mt-1">{t(crisisCopy.confirmSubtitle)}</p>

        <div className="mt-5 space-y-3">
          <div className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm">
            <span className="text-3xl" aria-hidden>
              {SITUATION_ICON[selection.situation]}
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-stone-500">
                {t(crisisCopy.confirmSituation)}
              </p>
              <p className="font-bold text-stone-900">{t(crisisCopy[SITUATION_LABEL[selection.situation]])}</p>
              {selection.details && <p className="text-sm text-stone-600 mt-0.5">“{selection.details}”</p>}
              {selection.voiceNoteBlob && (
                <p className="text-xs font-semibold text-amber-800 mt-0.5">🎙️ {t(crisisCopy.voiceRecorded)}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm">
            <MapPin className="w-7 h-7 text-amber-800 shrink-0" aria-hidden />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-stone-500">
                {t(crisisCopy.confirmLocation)}
              </p>
              <p className="text-sm font-semibold text-stone-800">
                {t(crisisCopy.privacyNotice).split('.')[0]}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm">
            <Users className="w-7 h-7 text-amber-800 shrink-0" aria-hidden />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-stone-500">
                {t(crisisCopy.confirmWho)}
              </p>
              <p className="text-sm font-semibold text-stone-800">{t(crisisCopy.confirmWhoValue)}</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 bg-amber-100/80 border border-amber-300/60 rounded-2xl p-4">
            <ShieldCheck className="w-5 h-5 text-amber-900 shrink-0 mt-0.5" aria-hidden />
            <p className="text-[13px] font-medium text-amber-950 leading-snug">{t(crisisCopy.privacyNotice)}</p>
          </div>

          {inCooldown && (
            <div className="flex items-start gap-2.5 bg-stone-200/70 border border-stone-300 rounded-2xl p-4">
              <AlertTriangle className="w-5 h-5 text-stone-700 shrink-0 mt-0.5" aria-hidden />
              <p className="text-[13px] font-medium text-stone-800 leading-snug">{t(crisisCopy.cooldownNudge)}</p>
            </div>
          )}

          {error && (
            <p className="text-sm font-semibold text-red-800 bg-red-100 rounded-xl px-4 py-3" role="alert">
              {error === 'auth-required'
                ? 'Please sign in first — then your SOS will go out.'
                : 'Could not send. Please try again — your safety comes first.'}
            </p>
          )}
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={sending}
            className="flex-1 min-h-[56px] rounded-2xl bg-stone-200 text-stone-800 font-bold hover:bg-stone-300 disabled:opacity-50"
          >
            {t(crisisCopy.cancel)}
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={sending}
            className="flex-[2] min-h-[56px] rounded-2xl bg-gradient-to-br from-amber-700 to-amber-900 text-amber-50 font-extrabold text-lg shadow-xl hover:brightness-110 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {sending && <Loader2 className="w-5 h-5 animate-spin" aria-hidden />}
            {sending ? t(crisisCopy.sending) : t(crisisCopy.confirmSend)}
          </button>
        </div>
      </div>
    </div>
  );
};
