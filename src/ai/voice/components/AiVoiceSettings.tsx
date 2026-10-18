/**
 * Sanatani Bandhan — AI Assistant Phase 1 · on-device voice settings card
 * =====================================================================
 * "🙏 On-device AI voice" — the PERMANENT home of the warmer voice.
 * Mounted in Profile near Language & region (always present where the
 * device supports it) and inside the assistant sheet (gear). This is how
 * a devotee who dismissed the one-time nudge gets the voice back — no
 * re-nudge is ever needed.
 *
 * Full state machine (persisted in device-local storage):
 *   not-downloaded → downloading ⇄ paused → downloaded → update-available
 *   downloading → error → downloading (retry)
 *   downloaded → removed → not-downloaded
 * Cancel mid-download = clean paused state, resumable. An app restart
 * during 'downloading' reconciles to 'paused' with last progress.
 *
 * Sanatani tone throughout; ≥44px targets; EN/HI/BN via tr().
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocaleText } from '../../../solo/ui';
import {
  resolveVoiceState,
  type ResolvedVoiceState,
} from '../capabilities';
import type { VoiceCapability } from '../types';
import {
  cancelDownload,
  confirmDownload,
  downloadGate,
  pauseDownload,
  removeVoice,
  resumeDownload,
  updateVoice,
} from '../downloader';
import { modelSizeLabel, VOICE_MODEL } from '../models';
import { setDlPersist } from '../storage';
import type { DownloadProgress } from '../types';

type Card =
  | { kind: 'checking' }
  | { kind: 'confirm'; reason: string; after: 'download' | 'resume' | 'update' }
  | { kind: 'unavailable'; cap: VoiceCapability }
  | { kind: Exclude<ResolvedVoiceState['state'], 'unavailable'>; dl: ResolvedVoiceState['dl'] };

function pct(p: number): number {
  return Math.round(Math.min(1, Math.max(0, p)) * 100);
}

export const AiVoiceSettings: React.FC<{
  onChanged?: () => void;
  /** In Profile: render nothing on unsupported devices (the card is "where supported"). */
  hideWhenUnsupported?: boolean;
}> = ({ onChanged, hideWhenUnsupported }) => {
  const { tr } = useLocaleText();
  const [ui, setUi] = useState<Card>({ kind: 'checking' });
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const mounted = useRef(true);
  const opId = useRef(0);

  const refresh = useCallback(async () => {
    const id = ++opId.current;
    const resolved = await resolveVoiceState();
    if (!mounted.current || id !== opId.current) return;
    if (resolved.state === 'unavailable') {
      setUi({ kind: 'unavailable', cap: resolved.cap });
    } else {
      setUi({ kind: resolved.state, dl: resolved.dl });
    }
    onChanged?.();
  }, [onChanged]);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => {
      mounted.current = false;
    };
  }, [refresh]);

  /** Shared download runner: gate → run → refresh. Never throws to UI. */
  const runOp = useCallback(
    (after: 'download' | 'resume' | 'update', op: (p: (x: DownloadProgress) => void) => Promise<void>) => {
      const id = ++opId.current;
      const gate = downloadGate();
      if (gate.ok === false) {
        setUi({ kind: 'confirm', reason: gate.reason, after });
        return;
      }
      setProgress({ progress: 0, phase: 'fetch', text: '…' });
      void op((p) => {
        if (mounted.current && id === opId.current) setProgress(p);
      })
        .then(() => refresh())
        .catch(() => refresh()); // state machine already recorded error/paused
    },
    [refresh]
  );

  const startDownload = useCallback(() => runOp('download', confirmDownload), [runOp]);
  const resume = useCallback(() => runOp('resume', resumeDownload), [runOp]);
  const update = useCallback(() => runOp('update', updateVoice), [runOp]);

  const confirmAnyway = useCallback(() => {
    setUi((prev) => {
      if (prev.kind !== 'confirm') return prev;
      const after = prev.after;
      const op = after === 'update' ? updateVoice : after === 'resume' ? resumeDownload : confirmDownload;
      const id = ++opId.current;
      setProgress({ progress: 0, phase: 'fetch', text: '…' });
      void op((p) => {
        if (mounted.current && id === opId.current) setProgress(p);
      })
        .then(() => refresh())
        .catch(() => refresh());
      return prev;
    });
  }, [refresh]);

  const backToState = useCallback(() => {
    void refresh();
  }, [refresh]);

  const pause = useCallback(() => {
    pauseDownload();
    void refresh();
  }, [refresh]);

  const cancel = useCallback(() => {
    cancelDownload();
    void refresh();
  }, [refresh]);

  const startOver = useCallback(() => {
    // 'paused' with swept cache → clean slate, same recoverable state.
    cancelDownload();
    void refresh();
  }, [refresh]);

  const remove = useCallback(() => {
    const id = ++opId.current;
    void removeVoice().then(() => {
      if (mounted.current && id === opId.current) void refresh();
    });
  }, [refresh]);

  const keepCurrent = useCallback(() => {
    setDlPersist({ state: 'downloaded', ignoredVersion: VOICE_MODEL.version });
    void refresh();
  }, [refresh]);

  const unavailableReason = (cap: VoiceCapability): string => {
    if (cap.reason === 'no-webgpu')
      return tr(
        'ai.voice.noWebgpu',
        'Your phone keeps the full assistant — the warmer voice needs a newer device with a graphics chip it can borrow. Nothing is lost; every answer stays just as true.',
        'আপনার ফোনে সম্পূর্ণ সহকারীই থাকে — উষ্ণতর কণ্ঠের জন্য নতুন ডিভাইস দরকার। কিছুই হারায় না; প্রতিটি উত্তর সমান সত্য থাকে।',
        'आपके फ़ोन में पूरा सहायक रहता है — उष्ण वाणी के लिए नया डिवाइस चाहिए। कुछ नहीं खोता; हर उत्तर उतना ही सत्य रहता है।'
      );
    if (cap.reason === 'low-storage')
      return tr(
        'ai.voice.lowStorage',
        'Your phone is a little full right now — the voice needs about 2.5 GB free. Your assistant works fully without it.',
        'আপনার ফোন এখন একটু ভরা — কণ্ঠের জন্য প্রায় 2.5 GB খালি জায়গা দরকার। এটি ছাড়াই সহকারী সম্পূর্ণ কাজ করে।',
        'आपका फ़ोन अभी थोड़ा भरा है — वाणी के लिए लगभग 2.5 GB खाली जगह चाहिए। इसके बिना भी सहायक पूरी तरह काम करता है।'
      );
    return tr(
      'ai.voice.unknown',
      'We could not check your phone for the voice just now. Your assistant works fully regardless.',
      'আমরা এখন আপনার ফোনে কণ্ঠ পরীক্ষা করতে পারিনি। সহকারী তবু সম্পূর্ণ কাজ করে।',
      'हम अभी आपके फ़ोन में वाणी की जाँच नहीं कर सके। सहायक फिर भी पूरी तरह काम करता है।'
    );
  };

  if (ui.kind === 'unavailable' && hideWhenUnsupported) return null;

  const phaseLabel = (p: DownloadProgress): string =>
    p.phase === 'fetch'
      ? tr('ai.voice.fetching', 'Bringing the voice home…', 'কণ্ঠ বাড়ি আনছি…', 'वाणी घर ला रहे हैं…')
      : tr('ai.voice.loading', 'Waking the voice up…', 'কণ্ঠ জাগিয়ে তুলছি…', 'वाणी जगा रहे हैं…');

  const progressBar = (p: DownloadProgress | null) =>
    p && (
      <div className="mt-3">
        <div
          className="h-2.5 rounded-full bg-stone-200 overflow-hidden"
          role="progressbar"
          aria-valuenow={pct(p.progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${pct(p.progress)}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-stone-500">
          {phaseLabel(p)} {pct(p.progress)}%
        </p>
      </div>
    );

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
      <p className="text-[15px] font-extrabold text-stone-900">
        🙏 {tr('ai.voice.title', 'On-device AI voice', 'অন-ডিভাইস AI কণ্ঠ', 'ऑन-डिवाइस AI वाणी')}
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-stone-600">
        {tr(
          'ai.voice.what',
          'A warmer voice for your assistant that lives entirely on your phone — no internet needed after download, nothing ever leaves your device.',
          'আপনার সহকারীর জন্য উষ্ণতর কণ্ঠ, যা সম্পূর্ণ আপনার ফোনেই থাকে — ডাউনলোডের পর ইন্টারনেট দরকার নেই, কিছুই ডিভাইস ছাড়ে না।',
          'आपके सहायक के लिए उष्ण वाणी, जो पूरी तरह आपके फ़ोन में रहती है — डाउनलोड के बाद इंटरनेट की ज़रूरत नहीं, कुछ भी डिवाइस नहीं छोड़ता।'
        )}
      </p>

      {ui.kind === 'checking' && (
        <p className="mt-3 text-sm text-stone-500">
          {tr('ai.voice.checking', 'Checking your phone… 🙏', 'আপনার ফোন পরীক্ষা করছি… 🙏', 'आपके फ़ोन की जाँच हो रही है… 🙏')}
        </p>
      )}

      {(ui.kind === 'not-downloaded' || ui.kind === 'removed') && (
        <div className="mt-3">
          {ui.kind === 'removed' && (
            <p className="mb-2 text-[13px] font-bold text-emerald-800">
              {tr(
                'ai.voice.removedNote',
                `🙏 The voice has left your phone — ${modelSizeLabel()} freed. It is welcome back anytime.`,
                `🙏 কণ্ঠ আপনার ফোন ছেড়েছে — ${modelSizeLabel()} খালি হয়েছে। যেকোনো সময় ফিরে আসতে পারে।`,
                `🙏 वाणी आपके फ़ोन से चली गई — ${modelSizeLabel()} खाली हुआ। कभी भी वापस आ सकती है।`
              )}
            </p>
          )}
          <p className="text-[13px] text-stone-600">
            {tr(
              'ai.voice.size',
              `Download size: ${modelSizeLabel()} — WiFi is kinder. Removable anytime.`,
              `ডাউনলোড সাইজ: ${modelSizeLabel()} — WiFi ভালো। যেকোনো সময় মুছে ফেলা যায়।`,
              `डाउनलोड आकार: ${modelSizeLabel()} — WiFi बेहतर। कभी भी हटाया जा सकता है।`
            )}
          </p>
          <button
            type="button"
            onClick={startDownload}
            className="mt-2.5 min-h-[48px] w-full rounded-2xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-sm font-extrabold px-4 transition-colors shadow-sm"
          >
            {tr(
              'ai.voice.download',
              `Download the warmer voice (${modelSizeLabel()}) 🙏`,
              `উষ্ণতর কণ্ঠ ডাউনলোড করুন (${modelSizeLabel()}) 🙏`,
              `उष्ण वाणी डाउनलोड करें (${modelSizeLabel()}) 🙏`
            )}
          </button>
        </div>
      )}

      {ui.kind === 'confirm' && (
        <div className="mt-3 rounded-xl border border-orange-300 bg-orange-50 p-3">
          <p className="text-[13px] font-bold text-stone-800">{ui.reason}</p>
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={confirmAnyway}
              className="flex-1 min-h-[48px] rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-extrabold px-4 transition-colors"
            >
              {tr('ai.voice.confirmYes', 'Download anyway', 'তবু ডাউনলোড করুন', 'फिर भी डाउनलोड करें')}
            </button>
            <button
              type="button"
              onClick={backToState}
              className="flex-1 min-h-[48px] rounded-2xl border border-stone-300 bg-white text-stone-700 text-sm font-extrabold px-4"
            >
              {tr('ai.voice.confirmNo', 'Wait for WiFi', 'WiFi-এর অপেক্ষা করুন', 'WiFi की प्रतीक्षा करें')}
            </button>
          </div>
        </div>
      )}

      {ui.kind === 'downloading' && (
        <div className="mt-3">
          {progressBar(progress ?? { progress: ui.dl.progress, phase: 'fetch', text: '' })}
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={pause}
              className="flex-1 min-h-[48px] rounded-2xl border border-stone-300 bg-white text-stone-700 text-sm font-extrabold px-4"
            >
              {tr('ai.voice.pause', '⏸ Pause', '⏸ থামান', '⏸ रोकें')}
            </button>
            <button
              type="button"
              onClick={cancel}
              className="flex-1 min-h-[48px] rounded-2xl border border-stone-300 bg-white text-stone-700 text-sm font-extrabold px-4"
            >
              {tr('ai.voice.cancel', '✕ Cancel', '✕ বাতিল', '✕ रद्द करें')}
            </button>
          </div>
          <p className="mt-2 text-xs text-stone-500">
            {tr(
              'ai.voice.pauseNote',
              'Pause or cancel anytime — your progress stays safe and resumable.',
              'যেকোনো সময় থামান বা বাতিল করুন — অগ্রগতি নিরাপদে থাকবে, আবার শুরু করা যাবে।',
              'कभी भी रोकें या रद्द करें — प्रगति सुरक्षित रहेगी, फिर से शुरू किया जा सकेगा।'
            )}
          </p>
        </div>
      )}

      {ui.kind === 'paused' && (
        <div className="mt-3">
          <p className="text-[13px] font-bold text-stone-800">
            {ui.dl.progress > 0
              ? tr(
                  'ai.voice.pausedAt',
                  `⏸ Paused at ${pct(ui.dl.progress)}% — your progress is safe. 🙏`,
                  `⏸ ${pct(ui.dl.progress)}%-এ থেমেছে — অগ্রগতি নিরাপদ। 🙏`,
                  `⏸ ${pct(ui.dl.progress)}% पर रुका — प्रगति सुरक्षित। 🙏`
                )
              : tr(
                  'ai.voice.pausedFresh',
                  '⏸ Paused — tap Resume to begin the download.',
                  '⏸ থেমে আছে — ডাউনলোড শুরু করতে Resume চাপুন।',
                  '⏸ रुका हुआ — डाउनलोड शुरू करने के लिए Resume दबाएँ।'
                )}
          </p>
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={resume}
              className="flex-1 min-h-[48px] rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-extrabold px-4 transition-colors"
            >
              {tr('ai.voice.resume', '▶ Resume', '▶ আবার শুরু', '▶ फिर से शुरू करें')}
            </button>
            <button
              type="button"
              onClick={startOver}
              className="flex-1 min-h-[48px] rounded-2xl border border-stone-300 bg-white text-stone-700 text-sm font-extrabold px-4"
            >
              {tr('ai.voice.startOver', 'Start over', 'নতুন করে শুরু', 'नए सिरे से शुरू करें')}
            </button>
          </div>
        </div>
      )}

      {ui.kind === 'downloaded' && (
        <div className="mt-3">
          <p className="text-[13px] font-bold text-emerald-800">
            {tr(
              'ai.voice.ready',
              `🙏 The warmer voice lives on your phone now — ${modelSizeLabel()} of your storage, working with no internet.`,
              `🙏 উষ্ণতর কণ্ঠ এখন আপনার ফোনেই থাকে — আপনার স্টোরেজের ${modelSizeLabel()}, ইন্টারনেট ছাড়াই কাজ করে।`,
              `🙏 उष्ण वाणी अब आपके फ़ोन में रहती है — आपके स्टोरेज का ${modelSizeLabel()}, बिना इंटरनेट काम करती है।`
            )}
          </p>
          <button
            type="button"
            onClick={remove}
            className="mt-2.5 min-h-[44px] w-full rounded-2xl border border-stone-300 bg-white text-stone-700 text-sm font-bold px-4"
          >
            {tr(
              'ai.voice.remove',
              `Remove the voice (frees ${modelSizeLabel()})`,
              `কণ্ঠ মুছুন (${modelSizeLabel()} খালি হবে)`,
              `वाणी हटाएँ (${modelSizeLabel()} खाली होगा)`
            )}
          </button>
        </div>
      )}

      {ui.kind === 'update-available' && (
        <div className="mt-3 rounded-xl border border-sky-300 bg-sky-50 p-3">
          <p className="text-[13px] font-extrabold text-stone-900">
            {tr(
              'ai.voice.updateTitle',
              '🙏 A newer voice is ready for your phone.',
              '🙏 আপনার ফোনের জন্য নতুন কণ্ঠ প্রস্তুত।',
              '🙏 आपके फ़ोन के लिए नई वाणी तैयार है।'
            )}
          </p>
          <p className="mt-0.5 text-xs text-stone-600">
            {tr(
              'ai.voice.updateBody',
              `Warmer and wiser — ${modelSizeLabel()} to refresh. Your current voice keeps working until then.`,
              `আরও উষ্ণ, আরও জ্ঞানী — রিফ্রেশ করতে ${modelSizeLabel()}। ততক্ষণ বর্তমান কণ্ঠ কাজ করবে।`,
              `और उष्ण, और ज्ञानी — रिफ्रेश के लिए ${modelSizeLabel()}। तब तक वर्तमान वाणी काम करती रहेगी।`
            )}
          </p>
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={update}
              className="flex-1 min-h-[48px] rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-extrabold px-4 transition-colors"
            >
              {tr('ai.voice.updateNow', 'Update now', 'এখনই আপডেট', 'अभी अपडेट करें')}
            </button>
            <button
              type="button"
              onClick={keepCurrent}
              className="flex-1 min-h-[48px] rounded-2xl border border-stone-300 bg-white text-stone-700 text-sm font-extrabold px-4"
            >
              {tr('ai.voice.keepCurrent', 'Keep current', 'বর্তমান রাখুন', 'वर्तमान रखें')}
            </button>
          </div>
        </div>
      )}

      {ui.kind === 'error' && (
        <div className="mt-3 rounded-xl border border-red-300 bg-red-50 p-3">
          <p className="text-[13px] font-bold text-stone-800">
            {tr(
              'ai.voice.errorTitle',
              '🙏 The download stumbled — nothing is broken.',
              '🙏 ডাউনলোড হোঁচট খেয়েছে — কিছুই ভাঙেনি।',
              '🙏 डाउनलोड लड़खड़ा गया — कुछ नहीं टूटा।'
            )}
          </p>
          {ui.dl.error && <p className="mt-0.5 text-xs text-stone-500">{ui.dl.error}</p>}
          <button
            type="button"
            onClick={resume}
            className="mt-2.5 min-h-[48px] w-full rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-extrabold px-4 transition-colors"
          >
            {tr('ai.voice.retry', '↻ Try again', '↻ আবার চেষ্টা', '↻ पुनः प्रयास करें')}
          </button>
        </div>
      )}

      {ui.kind === 'unavailable' && (
        <p className="mt-3 text-[13px] leading-relaxed text-stone-600">
          {ui.cap.reason === 'no-webgpu'
            ? tr(
                'ai.voice.noWebgpu',
                'Your phone keeps the full assistant — the warmer voice needs a newer device with a graphics chip it can borrow. Nothing is lost; every answer stays just as true.',
                'আপনার ফোনে সম্পূর্ণ সহকারীই থাকে — উষ্ণতর কণ্ঠের জন্য নতুন ডিভাইস দরকার। কিছুই হারায় না; প্রতিটি উত্তর সমান সত্য থাকে।',
                'आपके फ़ोन में पूरा सहायक रहता है — उष्ण वाणी के लिए नया डिवाइस चाहिए। कुछ नहीं खोता; हर उत्तर उतना ही सत्य रहता है।'
              )
            : ui.cap.reason === 'low-storage'
              ? tr(
                  'ai.voice.lowStorage',
                  'Your phone is a little full right now — the voice needs about 2.5 GB free. Your assistant works fully without it.',
                  'আপনার ফোন এখন একটু ভরা — কণ্ঠের জন্য প্রায় 2.5 GB খালি জায়গা দরকার। এটি ছাড়াই সহকারী সম্পূর্ণ কাজ করে।',
                  'आपका फ़ोन अभी थोड़ा भरा है — वाणी के लिए लगभग 2.5 GB खाली जगह चाहिए। इसके बिना भी सहायक पूरी तरह काम करता है।'
                )
              : tr(
                  'ai.voice.unknown',
                  'We could not check your phone for the voice just now. Your assistant works fully regardless.',
                  'আমরা এখন আপনার ফোনে কণ্ঠ পরীক্ষা করতে পারিনি। সহকারী তবু সম্পূর্ণ কাজ করে।',
                  'हम अभी आपके फ़ोन में वाणी की जाँच नहीं कर सके। सहायक फिर भी पूरी तरह काम करता है।'
                )}
        </p>
      )}
    </div>
  );
};
