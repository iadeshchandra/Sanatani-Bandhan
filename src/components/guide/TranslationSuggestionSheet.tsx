/**
 * guide/TranslationSuggestionSheet.tsx — "🙏 Help us say this better".
 * =====================================================================
 * Bottom sheet opened from a guide bubble when the shown step's wording is
 * an unreviewed draft in the devotee's language. Shows the current text
 * and invites a better wording — warm tone, never "submit correction".
 *
 * Copy is inline EN/HI/BN (the established pattern for new components);
 * other languages fall back to English here — this is suggestion chrome,
 * not guide content.
 */

import React, { useState } from 'react';
import { X, HeartHandshake } from 'lucide-react';
import { submitTranslationSuggestion } from '../../i18n/translationSuggestions';
import { useToast } from '../../context/ToastContext';

export interface SuggestionLine {
  /** Dot-delimited i18n key, e.g. 'guide.vda.s1t'. */
  key: string;
  /** 'title' | 'body' — which line of the guide step this is. */
  kind: 'title' | 'body';
  /** The text the devotee saw. */
  currentText: string;
}

interface Props {
  lang: string;
  lines: SuggestionLine[];
  onClose: () => void;
}

type CopyKey =
  | 'sheetTitle' | 'explainer' | 'titleLabel' | 'bodyLabel'
  | 'placeholder' | 'send' | 'sending' | 'thanks' | 'failed' | 'signin';

const COPY: Record<string, Record<CopyKey, string>> = {
  hi: {
    sheetTitle: 'इसे और बेहतर कहने में मदद करें 🙏',
    explainer:
      'यदि यह शब्दावली आपकी भाषा में अटपटी लगे, तो बेहतर सुझाव दें। कोई भक्त इसकी समीक्षा करेगा।',
    titleLabel: 'शीर्षक',
    bodyLabel: 'संदेश',
    placeholder: 'अपना सुझाव यहाँ लिखें…',
    send: 'सुझाव भेजें 🙏',
    sending: 'भेजा जा रहा है…',
    thanks: 'धन्यवाद! आपका सुझाव समीक्षकों के पास पहुँच गया है। 🙏',
    failed:
      'अभी नहीं भेज पाए — कृपया ऑनलाइन आने पर पुनः प्रयास करें। 🙏',
    signin: 'सुझाव भेजने के लिए कृपया साइन इन करें। 🙏',
  },
  bn: {
    sheetTitle: 'এটিকে আরও সুন্দর করে বলতে সাহায্য করুন 🙏',
    explainer:
      'এই ভাষা আপনার মাতৃভাষায় অস্বস্তিকর মনে হলে, আরও ভালো প্রস্তাব দিন। একজন ভক্ত এটি পর্যালোচনা করবেন।',
    titleLabel: 'শিরোনাম',
    bodyLabel: 'বার্তা',
    placeholder: 'আপনার প্রস্তাব এখানে লিখুন…',
    send: 'প্রস্তাব পাঠান 🙏',
    sending: 'পাঠানো হচ্ছে…',
    thanks: 'ধন্যবাদ! আপনার প্রস্তাব পর্যালোচকদের কাছে পৌঁছেছে। 🙏',
    failed: 'এখন পাঠানো যায়নি — অনলাইনে এলে আবার চেষ্টা করুন। 🙏',
    signin: 'প্রস্তাব পাঠাতে অনুগ্রহ করে সাইন ইন করুন। 🙏',
  },
  en: {
    sheetTitle: 'Help us say this better 🙏',
    explainer:
      "If this wording feels awkward in your language, suggest a better one. A fellow devotee will review it with love.",
    titleLabel: 'Title',
    bodyLabel: 'Message',
    placeholder: 'Write your suggestion here…',
    send: 'Send suggestion 🙏',
    sending: 'Sending…',
    thanks: "Dhanyavaad! Your suggestion is with our reviewers. 🙏",
    failed: "Could not send right now — please try again when you're online. 🙏",
    signin: 'Please sign in to send a suggestion. 🙏',
  },
};

function copyFor(lang: string): Record<CopyKey, string> {
  return COPY[(lang || 'en').toLowerCase()] || COPY.en;
}

export const TranslationSuggestionSheet: React.FC<Props> = ({ lang, lines, onClose }) => {
  const copy = copyFor(lang);
  const { showToast } = useToast();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const changed = lines.filter(
    (l) => (drafts[l.key] || '').trim() && (drafts[l.key] || '').trim() !== l.currentText.trim()
  );

  const submit = async () => {
    if (changed.length === 0 || sending) return;
    setSending(true);
    let okCount = 0;
    for (const line of changed) {
      const r = await submitTranslationSuggestion({
        lang,
        key: line.key,
        currentText: line.currentText,
        suggestedText: (drafts[line.key] || '').trim(),
      });
      if (r === 'ok') okCount++;
    }
    setSending(false);
    if (okCount > 0) {
      setDone(true);
      showToast(copy.thanks, 'success');
      // Let the warmth land, then close.
      setTimeout(onClose, 1400);
    } else {
      showToast(copy.failed, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-[220]" role="dialog" aria-modal="true" aria-label={copy.sheetTitle}>
      <div className="absolute inset-0 bg-black/45" onClick={onClose} aria-hidden />
      <div className="absolute inset-x-0 bottom-0 sm:mx-auto sm:max-w-lg max-h-[92dvh] overflow-y-auto bg-[#faf7f2] rounded-t-3xl shadow-2xl border-t border-amber-200/60">
        <div className="sticky top-0 bg-[#faf7f2]/95 backdrop-blur rounded-t-3xl border-b border-amber-100 px-5 pt-4 pb-3 flex items-start justify-between z-10">
          <div className="flex items-center gap-2.5 pr-8">
            <span className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-2xl bg-amber-100 flex items-center justify-center">
              <HeartHandshake className="w-5 h-5 text-amber-700" aria-hidden />
            </span>
            <h2 className="font-serif text-[18px] font-bold text-stone-900 leading-snug">
              {copy.sheetTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 shrink-0"
          >
            <X className="w-5 h-5" aria-hidden />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-[14px] text-stone-600 leading-relaxed">{copy.explainer}</p>

          {lines.map((line) => (
            <div key={line.key} className="mt-4">
              <p className="text-[12px] font-bold uppercase tracking-widest text-amber-700">
                {line.kind === 'title' ? copy.titleLabel : copy.bodyLabel}
              </p>
              <div className="mt-1.5 rounded-2xl bg-white border border-stone-200 px-4 py-3">
                <p className="text-[13px] text-stone-500 leading-relaxed">{line.currentText}</p>
              </div>
              <label className="sr-only" htmlFor={`tsg-${line.key}`}>
                {copy.placeholder}
              </label>
              <textarea
                id={`tsg-${line.key}`}
                rows={3}
                value={drafts[line.key] || ''}
                onChange={(e) => setDrafts((d) => ({ ...d, [line.key]: e.target.value }))}
                placeholder={copy.placeholder}
                className="mt-2 w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-[15px] text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[88px]"
              />
            </div>
          ))}

          <button
            type="button"
            onClick={submit}
            disabled={changed.length === 0 || sending || done}
            className="mt-5 w-full min-h-[52px] rounded-2xl bg-amber-700 hover:bg-amber-800 disabled:opacity-40 disabled:hover:bg-amber-700 text-amber-50 text-[15px] font-bold shadow-sm"
          >
            {sending ? copy.sending : copy.send}
          </button>
          <p className="mt-3 text-center text-[12px] text-stone-400">
            {changed.length === 0
              ? '—'
              : `✍️ ${changed.length} suggestion${changed.length > 1 ? 's' : ''} ready`}
          </p>
        </div>
      </div>
    </div>
  );
};
