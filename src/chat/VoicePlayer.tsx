/**
 * chat/VoicePlayer.tsx — inline voice-note player for chat bubbles.
 * ================================================================
 * Warm, forgiving, big touch targets. Resolves the vault:// pointer to a
 * playable URL; the audio element does the heavy lifting.
 */
import React, { useEffect, useRef, useState } from 'react';
import { resolveVaultUrl } from '../lib/fileVault';
import { formatVoiceDuration, type VoiceMeta, toVoiceLang } from './voice';

export const VoicePlayer: React.FC<{
  meta: VoiceMeta;
  mine: boolean;
  lang?: string;
}> = ({ meta, mine, lang = 'en' }) => {
  const vl = toVoiceLang(lang);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    let alive = true;
    resolveVaultUrl(meta.vaultUrl)
      .then((url) => {
        if (alive) setSrc(url);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [meta.vaultUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setElapsedMs(audio.currentTime * 1000);
    const onEnd = () => {
      setPlaying(false);
      setElapsedMs(0);
    };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
    };
  }, [src]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().catch(() => setFailed(true));
      setPlaying(true);
    }
  };

  const progress =
    meta.durationMs > 0
      ? Math.min(100, (elapsedMs / meta.durationMs) * 100)
      : 0;

  if (failed || !src) {
    return (
      <div className="flex items-center gap-2 min-w-[180px]">
        <span className="text-xl" aria-hidden>
          🎙️
        </span>
        <span
          className={`text-[13px] ${mine ? 'text-amber-100/80' : 'text-stone-500'}`}
        >
          {failed
            ? vl === 'bn'
              ? 'ভয়েস নোট লোড হয়নি'
              : vl === 'hi'
                ? 'वॉइस नोट लोड नहीं हुआ'
                : 'Voice note could not load'
            : '…'}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5 min-w-[200px] max-w-[240px]">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pause voice note' : 'Play voice note'}
        className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center shrink-0 text-lg ${
          mine
            ? 'bg-amber-50/20 text-amber-50 hover:bg-amber-50/30'
            : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
        }`}
      >
        {playing ? '⏸️' : '▶️'}
      </button>
      <div className="flex-1 min-w-0">
        <div
          className={`h-1.5 rounded-full overflow-hidden ${
            mine ? 'bg-amber-50/25' : 'bg-stone-200'
          }`}
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`h-full rounded-full transition-[width] duration-200 ${
              mine ? 'bg-amber-50' : 'bg-amber-600'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div
          className={`text-[11px] mt-1 tabular-nums ${
            mine ? 'text-amber-100/80' : 'text-stone-500'
          }`}
        >
          {formatVoiceDuration(elapsedMs)} / {formatVoiceDuration(meta.durationMs)}
        </div>
      </div>
      <span className="text-xl shrink-0" aria-hidden>
        🎙️
      </span>
    </div>
  );
};
