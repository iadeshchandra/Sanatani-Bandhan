/**
 * common/PreviewFrame.tsx — the devotee PREVIEW frame (Moodle recipe).
 * =====================================================================
 * WORLD-READINESS (Exhibits 3–4 / Axis A): the app has exactly TWO views
 * — Personal (Solo) and Organization. Staff may LOOK at the member-facing
 * surface to check what devotees see, but that look must never present
 * as a third view, and it must never be able to change anything (the
 * surface it replaces queued REAL mutations under a fabricated persona).
 *
 * The recipe (research report §4, the Moodle "view as" pattern):
 *   1. A persistent, uniquely-coloured bar — solid amber, dark text —
 *      in the USER's language, saying whose eyes these are.
 *   2. An in-bar Exit ("Return to my view", ≥48px) that leaves the
 *      preview immediately.
 *   3. Read-only BY CONSTRUCTION: every click / change / submit inside
 *      the framed content is captured and stopped, with a one-line
 *      explanation. Scrolling and reading stay free.
 *   4. A deliberate desktop presentation: the member surface is a
 *      phone-width column held in a warm designed backdrop — never a
 *      naked column floating in a void.
 */
import React, { useCallback, useRef, useState } from 'react';
import { Eye, LogOut } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export const PreviewFrame: React.FC<{
  onExit: () => void;
  children: React.ReactNode;
}> = ({ onExit, children }) => {
  const { safeTranslate } = useLanguage();
  const [hint, setHint] = useState(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const block = useCallback((e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setHint(true);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(false), 2600);
  }, []);

  return (
    <div className="min-h-full bg-gradient-to-b from-amber-100 via-orange-50 to-amber-50">
      {/* ── The persistent preview bar ─────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-amber-400 text-stone-950 shadow-md shadow-amber-900/10 border-b-2 border-amber-600">
        <div className="max-w-5xl mx-auto px-3 sm:px-5 py-2.5 flex items-center gap-3">
          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-stone-950 text-amber-400 shrink-0" aria-hidden>
            <Eye className="w-5 h-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm sm:text-[15px] font-black leading-tight">
              {safeTranslate(
                'preview_title',
                'Devotee preview — you are seeing this as a devotee.',
                'ভক্ত প্রিভিউ — আপনি এটি একজন ভক্তের চোখে দেখছেন।',
                'भक्त पूर्वावलोकन — आप इसे एक भक्त की दृष्टि से देख रहे हैं।'
              )}
            </p>
            <p className="text-xs font-semibold text-stone-800 leading-snug" aria-live="polite">
              {hint
                ? safeTranslate(
                    'preview_blocked',
                    'Preview only — taps are paused here, so nothing can change.',
                    'শুধু দেখার জন্য — এখানে ট্যাপ বন্ধ, তাই কিছুই বদলাবে না।',
                    'केवल देखने के लिए — यहाँ टैप रुके हैं, इसलिए कुछ नहीं बदलेगा।'
                  )
                : safeTranslate(
                    'preview_readonly',
                    'Nothing here can be changed — this is only for seeing.',
                    'এখানে কিছুই বদলানো যাবে না — এটি শুধু দেখার জন্য।',
                    'यहाँ कुछ नहीं बदला जा सकता — यह केवल देखने के लिए है।'
                  )}
            </p>
          </div>
          <button
            type="button"
            onClick={onExit}
            className="shrink-0 inline-flex items-center gap-2 min-h-[48px] px-4 rounded-xl bg-stone-950 text-white text-sm font-extrabold hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" aria-hidden />
            {safeTranslate('preview_exit', 'Return to my view', 'আমার ভিউতে ফিরুন', 'मेरे दृश्य पर लौटें')}
          </button>
        </div>
      </div>

      {/* ── The framed member surface: phone-width, held warmly ────── */}
      <div
        className="mx-auto w-full max-w-md px-2 sm:px-0 py-4"
        onClickCapture={block}
        onChangeCapture={block}
        onSubmitCapture={block}
      >
        <div className="rounded-[28px] border-2 border-amber-200 bg-white/60 shadow-xl shadow-amber-900/5 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
};
