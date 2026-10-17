/**
 * crisis/SituationPicker.tsx — step 1 of the SOS flow.
 * =====================================================
 * Six big tiles (≥72px each), no typing required. Tapping a tile moves to
 * the confirm step. The "Other" tile offers an optional voice note recorded
 * with MediaRecorder — uploaded to Storage at sosVoice/{uid}/{eventId}.webm
 * (rules author: see TESTS.md / report).
 */
import React, { useRef, useState, useEffect } from 'react';
import { X, Mic, Square, Check } from 'lucide-react';
import type { SituationKind } from './types';
import { crisisCopy, useCrisisT } from './crisisStrings';

export interface SituationSelection {
  situation: SituationKind;
  details: string | null;
  voiceNoteBlob: Blob | null;
}

interface Tile {
  kind: SituationKind;
  icon: string;
  labelKey: keyof typeof crisisCopy;
  /** Warm, situation-appropriate gradient (amber/maroon family). */
  gradient: string;
}

const TILES: Tile[] = [
  { kind: 'medical', icon: '🩸', labelKey: 'sitMedical', gradient: 'from-amber-700 to-amber-900' },
  { kind: 'fire', icon: '🔥', labelKey: 'sitFire', gradient: 'from-orange-700 to-red-900' },
  { kind: 'robbery', icon: '🚨', labelKey: 'sitRobbery', gradient: 'from-stone-700 to-stone-900' },
  { kind: 'crowd', icon: '👥', labelKey: 'sitCrowd', gradient: 'from-yellow-700 to-amber-900' },
  { kind: 'disaster', icon: '🌊', labelKey: 'sitDisaster', gradient: 'from-amber-800 to-stone-900' },
  { kind: 'other', icon: '🎙️', labelKey: 'sitOther', gradient: 'from-stone-600 to-amber-900' },
];

export const SituationPicker: React.FC<{
  onSelect: (sel: SituationSelection) => void;
  onClose: () => void;
}> = ({ onSelect, onClose }) => {
  const t = useCrisisT();
  const [voiceMode, setVoiceMode] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [details, setDetails] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          /* already stopped */
        }
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setVoiceBlob(blob);
        stream.getTracks().forEach((tr) => tr.stop());
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
    } catch {
      // Mic denied/unavailable — the SOS still works; voice is optional.
      setVoiceMode(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  const pick = (kind: SituationKind) => {
    if (kind === 'other') {
      setVoiceMode(true);
      return;
    }
    onSelect({ situation: kind, details: details.trim() || null, voiceNoteBlob: null });
  };

  const confirmOther = () => {
    onSelect({ situation: 'other', details: details.trim() || null, voiceNoteBlob: voiceBlob });
  };

  return (
    <div
      className="fixed inset-0 z-[9995] flex items-end sm:items-center justify-center bg-stone-950/60 backdrop-blur-sm p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={t(crisisCopy.pickerTitle)}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-gradient-to-b from-amber-50 to-stone-100 rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-stone-900">{t(crisisCopy.pickerTitle)}</h2>
            <p className="text-sm text-stone-600 mt-1">{t(crisisCopy.pickerSubtitle)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t(crisisCopy.cancel)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-stone-200/70 text-stone-700 hover:bg-stone-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!voiceMode ? (
          <>
            <div className="grid grid-cols-2 gap-3 mt-5">
              {TILES.map((tile) => (
                <button
                  key={tile.kind}
                  type="button"
                  onClick={() => pick(tile.kind)}
                  className={`min-h-[88px] rounded-2xl bg-gradient-to-br ${tile.gradient} text-amber-50 shadow-lg active:scale-[0.97] transition-transform flex flex-col items-center justify-center gap-1.5 p-3 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400`}
                >
                  <span className="text-3xl" aria-hidden>
                    {tile.icon}
                  </span>
                  <span className="text-sm font-bold text-center leading-tight">{t(crisisCopy[tile.labelKey])}</span>
                </button>
              ))}
            </div>
            <div className="mt-4">
              <label htmlFor="crisis-details" className="text-xs font-semibold text-stone-600">
                {t(crisisCopy.detailsOptional)}
              </label>
              <input
                id="crisis-details"
                type="text"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder={t(crisisCopy.detailsPlaceholder)}
                className="mt-1.5 w-full min-h-[48px] rounded-xl border border-stone-300 bg-white px-4 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </>
        ) : (
          <div className="mt-5 flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              className={`min-w-[96px] min-h-[96px] w-24 h-24 rounded-full flex items-center justify-center shadow-xl transition-all ${
                recording ? 'bg-[#7F1D1D] scale-105 animate-pulse' : 'bg-gradient-to-br from-amber-700 to-amber-900'
              } text-amber-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400`}
              aria-label={recording ? t(crisisCopy.voiceRecording) : t(crisisCopy.voiceRecord)}
            >
              {recording ? <Square className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
            </button>
            <p className="text-sm text-stone-600 text-center">
              {recording ? t(crisisCopy.voiceRecording) : voiceBlob ? t(crisisCopy.voiceRecorded) : t(crisisCopy.voiceRecord)}
            </p>
            {voiceBlob && !recording && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-full">
                <Check className="w-4 h-4" /> {t(crisisCopy.voiceRecorded)}
              </span>
            )}
            <div className="w-full">
              <label htmlFor="crisis-details-other" className="text-xs font-semibold text-stone-600">
                {t(crisisCopy.detailsOptional)}
              </label>
              <input
                id="crisis-details-other"
                type="text"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder={t(crisisCopy.detailsPlaceholder)}
                className="mt-1.5 w-full min-h-[48px] rounded-xl border border-stone-300 bg-white px-4 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="w-full flex gap-3">
              <button
                type="button"
                onClick={() => setVoiceMode(false)}
                className="flex-1 min-h-[52px] rounded-2xl bg-stone-200 text-stone-800 font-bold text-sm hover:bg-stone-300"
              >
                {t(crisisCopy.back)}
              </button>
              <button
                type="button"
                onClick={confirmOther}
                className="flex-1 min-h-[52px] rounded-2xl bg-gradient-to-br from-amber-700 to-amber-900 text-amber-50 font-bold text-sm shadow-lg hover:brightness-110"
              >
                {t(crisisCopy.continue)}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
