/**
 * Sanatani Bandhan — VoiceStatusNote: the assistant sheet's voice panel.
 * =====================================================================
 * WORLD-READY (Exhibit 1, research report §6): the assistant sheet must
 * NEVER contain model-download states, progress, raw errors, retries or
 * offers — "no download, upgrade or permission prompt inside the sheet,
 * ever." The full download manager (size, Wi-Fi consent, pause/resume,
 * removal) lives in ONE settings home: AiVoiceSettings in the personal
 * Profile — a home every account has, whichever door they came through.
 *
 * What the sheet shows instead is a calm STATUS: one or two plain lines
 * in the user's language saying how the voice stands on this phone and
 * where it lives. No buttons that download, nothing that can fail
 * loudly, no technical text. Typing always works — the note says so.
 */
import React, { useEffect, useState } from 'react';
import { useLocaleText } from '../../../solo/ui';
import { resolveVoiceState } from '../capabilities';

type NoteState = 'checking' | 'downloaded' | 'unavailable' | 'offered';

export const VoiceStatusNote: React.FC = () => {
  const { tr } = useLocaleText();
  const [state, setState] = useState<NoteState>('checking');

  useEffect(() => {
    let alive = true;
    void resolveVoiceState()
      .then((resolved) => {
        if (!alive) return;
        setState(
          resolved.state === 'unavailable'
            ? 'unavailable'
            : resolved.state === 'downloaded' || resolved.state === 'update-available'
              ? 'downloaded'
              : 'offered'
        );
      })
      .catch(() => {
        if (alive) setState('offered');
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
      <p className="text-[15px] font-extrabold text-stone-900">
        🙏 {tr('ai.voice.title', 'On-device AI voice', 'অন-ডিভাইস AI কণ্ঠ', 'ऑन-डिवाइस AI वाणी')}
      </p>
      {state === 'checking' && (
        <p className="mt-1 text-[13px] leading-relaxed text-stone-600">
          {tr('ai.voice.checking', 'Checking your phone… 🙏', 'আপনার ফোন পরীক্ষা করছি… 🙏', 'आपके फ़ोन की जाँच हो रही है… 🙏')}
        </p>
      )}
      {state === 'downloaded' && (
        <p className="mt-1 text-[13px] leading-relaxed text-stone-600">
          {tr(
            'ai.voice.noteReady',
            'The warmer voice lives on this phone and answers even without internet. Its download and removal live in Profile → On-device AI voice.',
            'উষ্ণতর কণ্ঠ এই ফোনেই থাকে, ইন্টারনেট ছাড়াও উত্তর দেয়। এর ডাউনলোড ও মোছা থাকে প্রোফাইল → অন-ডিভাইস AI কণ্ঠে।',
            'उष्ण वाणी इस फ़ोन में रहती है और बिना इंटरनेट भी उत्तर देती है। इसका डाउनलोड और हटाना प्रोफ़ाइल → ऑन-डिवाइस AI वाणी में रहता है।'
          )}
        </p>
      )}
      {state === 'unavailable' && (
        <p className="mt-1 text-[13px] leading-relaxed text-stone-600">
          {tr(
            'ai.voice.noteUnavailable',
            'The warmer voice cannot run on this device — nothing is lost. You can type here and every answer works just the same.',
            'উষ্ণতর কণ্ঠ এই ডিভাইসে চলতে পারে না — কিছুই হারায় না। এখানে লিখলেই হবে, প্রতিটি উত্তর একইভাবে কাজ করে।',
            'उष्ण वाणी इस डिवाइस पर नहीं चल सकती — कुछ नहीं खोता। यहाँ लिखिए, हर उत्तर उसी तरह काम करता है।'
          )}
        </p>
      )}
      {state === 'offered' && (
        <p className="mt-1 text-[13px] leading-relaxed text-stone-600">
          {tr(
            'ai.voice.noteOffered',
            'A warmer voice that lives on your phone is offered in Profile → On-device AI voice — its size and Wi-Fi choices live there too, so this sheet stays about your questions. Typing here always works.',
            'আপনার ফোনে থাকা উষ্ণতর কণ্ঠ প্রোফাইল → অন-ডিভাইস AI কণ্ঠে পাওয়া যায় — এর সাইজ ও Wi-Fi পছন্দও সেখানেই, যাতে এই শিট শুধু আপনার প্রশ্ন নিয়েই থাকে। এখানে লেখা সবসময় কাজ করে।',
            'आपके फ़ोन में रहने वाली उष्ण वाणी प्रोफ़ाइल → ऑन-डिवाइस AI वाणी में मिलती है — उसका आकार और Wi-Fi विकल्प भी वहीं हैं, ताकि यह शीट केवल आपके प्रश्नों के लिए रहे। यहाँ लिखना हमेशा काम करता है।'
          )}
        </p>
      )}
    </div>
  );
};
