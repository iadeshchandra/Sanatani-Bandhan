import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { bk, type BkLang } from './copy';
import {
  isSpeechRecognitionSupported,
  parseVoiceDonation,
  speechRecognitionCtor,
  voiceLangFor,
  type ParsedVoiceDonation,
} from './voiceEntry';

/**
 * VoiceEntryPanel — Blueprint D, deliverable 5: the Bahi-Khata home
 * "Speak it" card. Where the browser offers speech recognition it
 * renders a live mic card; where it does not, it renders NOTHING —
 * the brief's law: no fake affordance. On a heard line it parses
 * (lib/voiceEntry, Blueprint C's parser family) and hands the batch
 * material to the desk, which opens the ordinary register review —
 * voice never commits; the human checks every word and saves.
 */
export const VoiceEntryPanel: React.FC<{
  lang: BkLang;
  onHeard: (parsed: ParsedVoiceDonation) => void;
  cardClassName: string;
}> = ({ lang, onHeard, cardClassName }) => {
  const [supported] = useState(() => isSpeechRecognitionSupported());
  const [listening, setListening] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const recRef = useRef<{ stop: () => void } | null>(null);

  useEffect(
    () => () => {
      try {
        recRef.current?.stop();
      } catch {
        /* already stopped */
      }
    },
    []
  );

  if (!supported) return null;

  const toggle = () => {
    if (listening) {
      try {
        recRef.current?.stop();
      } catch {
        /* noop */
      }
      setListening(false);
      return;
    }
    const Ctor = speechRecognitionCtor();
    if (!Ctor) return;
    setNote(null);
    const rec = new Ctor();
    recRef.current = rec;
    rec.lang = voiceLangFor(lang);
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (ev) => {
      const transcript = ev.results?.[0]?.[0]?.transcript ?? '';
      setListening(false);
      const parsed = parseVoiceDonation(transcript);
      if (!parsed) {
        setNote(bk(lang, 'voiceNoAmount'));
        return;
      }
      setNote(bk(lang, 'voiceHeard'));
      onHeard(parsed);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        className={`${cardClassName} w-full ${
          listening
            ? 'bg-red-600 border-red-700 text-white animate-pulse'
            : 'bg-white border-stone-300 text-stone-800 hover:border-amber-400'
        }`}
        aria-live="polite"
      >
        {listening ? (
          <Square className="w-6 h-6 shrink-0" />
        ) : (
          <Mic className="w-6 h-6 shrink-0 text-red-500" />
        )}
        {listening ? bk(lang, 'voiceListening') : bk(lang, 'modeVoice')}
      </button>
      <p className="text-xs text-stone-500 mt-2 leading-relaxed">
        {listening ? bk(lang, 'voiceTapStop') : bk(lang, 'voiceHint')}
      </p>
      {note && <p className="text-xs font-bold text-amber-800 mt-2">{note}</p>}
    </div>
  );
};

export default VoiceEntryPanel;
