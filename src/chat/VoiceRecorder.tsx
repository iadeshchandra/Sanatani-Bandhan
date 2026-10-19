/**
 * chat/VoiceRecorder.tsx — record → preview → send flow for voice notes.
 * ======================================================================
 * Tap to start, tap to stop (the most forgiving model — no hold timing to
 * get wrong on a shaky bus ride). Max 2 minutes, auto-stops. Every finished
 * recording is saved to IndexedDB immediately, so a crash never loses it;
 * a surviving draft is offered back on the next visit.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  putPrivateFile,
  getPrivateFile,
  deletePrivateFile,
} from '../lib/fileVaultIdb';
import {
  VOICE_MAX_MS,
  VOICE_MIN_MS,
  pickVoiceMimeType,
  formatVoiceDuration,
  nextVoiceRecState,
  voiceDraftKey,
  VOICE_COPY,
  toVoiceLang,
  type VoiceRecState,
} from './voice';

export const VoiceRecorder: React.FC<{
  chatId: string;
  uid: string;
  lang?: string;
  /** Called with the finished blob; parent uploads + sends. */
  onSend: (blob: Blob, durationMs: number) => Promise<void>;
  onClose: () => void;
}> = ({ chatId, uid, lang = 'en', onSend, onClose }) => {
  const [state, setState] = useState<VoiceRecState>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [micBlocked, setMicBlocked] = useState(false);
  const [tooShort, setTooShort] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startAtRef = useRef<number>(0);
  const mimeRef = useRef<string>('');
  const blobRef = useRef<Blob | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const draftKey = voiceDraftKey(chatId);

  const vl = toVoiceLang(lang);
  const t = (k: keyof typeof VOICE_COPY) => VOICE_COPY[k][vl];

  /* ---- crash-surviving draft -------------------------------------- */
  const saveDraft = useCallback(
    async (blob: Blob, durationMs: number) => {
      try {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        await putPrivateFile({
          fileId: draftKey,
          bytes,
          contentType: blob.type || 'audio/webm',
          size: bytes.length,
          category: 'voice',
          createdAt: Date.now(),
        });
        // Stash duration alongside (private file record carries no extras).
        try {
          localStorage.setItem(`${draftKey}:ms`, String(Math.round(durationMs)));
        } catch {
          /* storage full — the blob itself is what matters */
        }
      } catch {
        /* draft save is best-effort; the live blob still works */
      }
    },
    [draftKey],
  );

  const clearDraft = useCallback(async () => {
    try {
      await deletePrivateFile(draftKey);
      localStorage.removeItem(`${draftKey}:ms`);
    } catch {
      /* already gone */
    }
    setHasDraft(false);
  }, [draftKey]);

  useEffect(() => {
    let alive = true;
    getPrivateFile(draftKey)
      .then((rec) => {
        if (alive && rec && rec.bytes.length > 0) setHasDraft(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const restoreDraft = useCallback(async () => {
    const rec = await getPrivateFile(draftKey).catch(() => null);
    if (!rec || rec.bytes.length === 0) {
      setHasDraft(false);
      return;
    }
    const blob = new Blob([rec.bytes.buffer as ArrayBuffer], {
      type: rec.contentType || 'audio/webm',
    });
    blobRef.current = blob;
    setPreviewUrl(URL.createObjectURL(blob));
    try {
      const ms = Number(localStorage.getItem(`${draftKey}:ms`) || '0');
      setElapsedMs(ms > 0 ? ms : 0);
    } catch {
      setElapsedMs(0);
    }
    setState('preview');
    setHasDraft(false);
  }, [draftKey]);

  /* ---- recording -------------------------------------------------- */
  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  };

  const stopTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const finishRecording = useCallback(
    (autoStopped: boolean) => {
      const mr = mediaRecorderRef.current;
      if (!mr || mr.state === 'inactive') return;
      stopTimer();
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mimeRef.current || 'audio/webm',
        });
        const durationMs = Date.now() - startAtRef.current;
        stopTracks();
        if (blob.size === 0 || durationMs < VOICE_MIN_MS) {
          setTooShort(true);
          setState((s) => nextVoiceRecState(s, 'cancel'));
          setElapsedMs(0);
          window.setTimeout(() => setTooShort(false), 2500);
          return;
        }
        blobRef.current = blob;
        setPreviewUrl(URL.createObjectURL(blob));
        setElapsedMs(durationMs);
        setState((s) => nextVoiceRecState(s, 'stop'));
        // Crash survival: the draft lands in IndexedDB the moment we stop.
        void saveDraft(blob, durationMs);
        void autoStopped; // auto-stop is silent; the preview speaks for itself
      };
      mr.stop();
    },
    [saveDraft],
  );

  const startRecording = useCallback(async () => {
    setMicBlocked(false);
    setTooShort(false);
    const mime = pickVoiceMimeType();
    if (!mime) {
      setMicBlocked(true);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      mimeRef.current = mime;
      chunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: mime });
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorderRef.current = mr;
      startAtRef.current = Date.now();
      mr.start(1000); // 1s timeslices keep memory flat on low-end devices
      setElapsedMs(0);
      setState((s) => nextVoiceRecState(s, 'start'));
      timerRef.current = window.setInterval(() => {
        const el = Date.now() - startAtRef.current;
        setElapsedMs(el);
        if (el >= VOICE_MAX_MS) finishRecording(true);
      }, 250);
    } catch {
      setMicBlocked(true);
    }
  }, [finishRecording]);

  const cancelRecording = () => {
    const mr = mediaRecorderRef.current;
    stopTimer();
    if (mr && mr.state !== 'inactive') {
      mr.onstop = () => stopTracks();
      try {
        mr.stop();
      } catch {
        stopTracks();
      }
    } else {
      stopTracks();
    }
    chunksRef.current = [];
    setElapsedMs(0);
    setState((s) => nextVoiceRecState(s, 'cancel'));
  };

  /* ---- preview ---------------------------------------------------- */
  const togglePreview = () => {
    const audio = previewAudioRef.current;
    if (!audio || !previewUrl) return;
    if (previewPlaying) {
      audio.pause();
      setPreviewPlaying(false);
    } else {
      audio.play().catch(() => {});
      setPreviewPlaying(true);
    }
  };

  const rerecord = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    blobRef.current = null;
    setPreviewPlaying(false);
    setElapsedMs(0);
    void clearDraft();
    setState((s) => nextVoiceRecState(s, 'rerecord'));
  };

  const send = async () => {
    const blob = blobRef.current;
    if (!blob || state !== 'preview') return;
    setState((s) => nextVoiceRecState(s, 'send'));
    try {
      await onSend(blob, elapsedMs);
      void clearDraft();
      setState((s) => nextVoiceRecState(s, 'sent'));
      onClose();
    } catch {
      setState((s) => nextVoiceRecState(s, 'fail'));
    }
  };

  /* ---- unmount safety --------------------------------------------- */
  useEffect(() => {
    return () => {
      stopTimer();
      const mr = mediaRecorderRef.current;
      if (mr && mr.state !== 'inactive') {
        try {
          mr.stop();
        } catch {
          /* already stopped */
        }
      }
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  void uid; // owner binding happens at upload time in the parent

  return (
    <div
      className="fixed inset-0 z-[9990] flex items-end sm:items-center justify-center bg-stone-950/60 backdrop-blur-sm p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={t('recordVoice')}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-gradient-to-b from-amber-50 to-stone-100 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {hasDraft && state === 'idle' ? (
          /* ---- surviving draft ----------------------------------- */
          <div className="text-center">
            <div className="text-4xl mb-3" aria-hidden>
              🎙️
            </div>
            <h3 className="text-lg font-extrabold text-stone-900">
              {vl === 'bn'
                ? 'একটি অসমাপ্ত ভয়েস নোট পাওয়া গেছে'
                : vl === 'hi'
                  ? 'एक अधूरा वॉइस नोट मिला'
                  : 'Found an unfinished voice note'}
            </h3>
            <p className="text-sm text-stone-600 mt-1">
              {vl === 'bn'
                ? 'এটি হারিয়ে যায়নি — পাঠাতে চান?'
                : vl === 'hi'
                  ? 'यह खोया नहीं — भेजना चाहेंगे?'
                  : 'It was never lost — want to send it?'}
            </p>
            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={restoreDraft}
                className="flex-1 min-h-[48px] rounded-2xl bg-amber-700 text-amber-50 font-bold hover:bg-amber-800"
              >
                {vl === 'bn' ? 'ফিরিয়ে আনুন' : vl === 'hi' ? 'वापस लाएं' : 'Recover it'}
              </button>
              <button
                type="button"
                onClick={() => {
                  void clearDraft();
                }}
                className="flex-1 min-h-[48px] rounded-2xl bg-stone-200 text-stone-700 font-bold hover:bg-stone-300"
              >
                {t('discard')}
              </button>
            </div>
          </div>
        ) : state === 'idle' ? (
          /* ---- start --------------------------------------------- */
          <div className="text-center">
            <button
              type="button"
              onClick={startRecording}
              aria-label={t('recordVoice')}
              className="w-24 h-24 min-w-[96px] min-h-[96px] rounded-full bg-gradient-to-br from-amber-600 to-orange-700 text-amber-50 text-4xl shadow-xl active:scale-95 transition-transform mx-auto flex items-center justify-center"
            >
              🎙️
            </button>
            <p className="text-sm text-stone-600 mt-4 font-medium">{t('recordVoice')}</p>
            {micBlocked && (
              <p className="text-sm text-red-700 bg-red-50 rounded-xl p-3 mt-3">
                {t('micBlocked')}
              </p>
            )}
            {tooShort && (
              <p className="text-sm text-amber-800 bg-amber-100 rounded-xl p-3 mt-3">
                {t('tooShort')}
              </p>
            )}
          </div>
        ) : state === 'recording' ? (
          /* ---- recording ----------------------------------------- */
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <span
                className="w-3 h-3 rounded-full bg-red-600 animate-pulse"
                aria-hidden
              />
              <span className="text-2xl font-extrabold tabular-nums text-stone-900">
                {formatVoiceDuration(elapsedMs)}
              </span>
            </div>
            <p className="text-sm text-stone-600 mt-1">{t('recording')}</p>
            {/* progress toward the 2-min cap */}
            <div
              className="h-1.5 bg-stone-200 rounded-full overflow-hidden mt-4"
              role="progressbar"
              aria-valuenow={Math.round((elapsedMs / VOICE_MAX_MS) * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full bg-red-500 rounded-full"
                style={{
                  width: `${Math.min(100, (elapsedMs / VOICE_MAX_MS) * 100)}%`,
                }}
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={cancelRecording}
                className="flex-1 min-h-[48px] rounded-2xl bg-stone-200 text-stone-700 font-bold hover:bg-stone-300"
              >
                {t('discard')}
              </button>
              <button
                type="button"
                onClick={() => finishRecording(false)}
                className="flex-1 min-h-[48px] rounded-2xl bg-red-700 text-red-50 font-bold hover:bg-red-800"
              >
                ⏹️ {t('stopRecording')}
              </button>
            </div>
          </div>
        ) : (
          /* ---- preview / sending ---------------------------------- */
          <div className="text-center">
            {previewUrl && (
              <audio
                ref={previewAudioRef}
                src={previewUrl}
                onEnded={() => setPreviewPlaying(false)}
              />
            )}
            <button
              type="button"
              onClick={togglePreview}
              aria-label={previewPlaying ? 'Pause preview' : 'Play preview'}
              className="w-20 h-20 min-w-[80px] min-h-[80px] rounded-full bg-amber-100 hover:bg-amber-200 text-3xl mx-auto flex items-center justify-center"
            >
              {previewPlaying ? '⏸️' : '▶️'}
            </button>
            <p className="text-lg font-extrabold tabular-nums text-stone-900 mt-3">
              {formatVoiceDuration(elapsedMs)}
            </p>
            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={rerecord}
                disabled={state === 'sending'}
                className="flex-1 min-h-[48px] rounded-2xl bg-stone-200 text-stone-700 font-bold hover:bg-stone-300 disabled:opacity-40"
              >
                {t('rerecord')}
              </button>
              <button
                type="button"
                onClick={send}
                disabled={state === 'sending'}
                className="flex-1 min-h-[48px] rounded-2xl bg-amber-700 text-amber-50 font-bold hover:bg-amber-800 disabled:opacity-40"
              >
                {state === 'sending' ? '…' : `📨 ${t('sendVoice')}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
