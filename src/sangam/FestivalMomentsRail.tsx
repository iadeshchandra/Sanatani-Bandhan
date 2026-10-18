/**
 * sangam/FestivalMomentsRail.tsx — Festival Moments rail (Phase 4).
 * ============================================================================
 * Time-bound river of shared joy during festivals. Photo + one-line
 * blessing per moment. No like counts, no "top posts" — just flowing
 * gratitude. The parent renders this only inside an active window
 * (see festivalMoments.activeMomentWindows).
 */
import React from 'react';
import { T } from '../solo/ui';
import { momentsRailTitle } from './festivalMoments';
import type { SangamPost } from './types';

export const FestivalMomentsRail: React.FC<{
  festivalName: string;
  moments: SangamPost[];
  lang?: 'en' | 'hi' | 'bn';
  onShare?: () => void;
}> = ({ festivalName, moments, lang = 'en', onShare }) => {
  return (
    <section aria-label="Festival moments" className="rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-1 mb-2">
        <h3 className="font-extrabold text-stone-800 text-base">
          {momentsRailTitle(festivalName, lang)}
        </h3>
        {onShare && (
          <button
            type="button"
            onClick={onShare}
            className="text-sm font-bold text-amber-700 underline underline-offset-2 min-h-[44px] px-2"
          >
            <T en="+ Share yours" bn="+ আপনারটি দিন" hi="+ अपना साझा करें" />
          </button>
        )}
      </div>
      {moments.length === 0 ? (
        <p className="text-sm text-stone-500 px-1 leading-relaxed">
          <T
            en="Be the first to share a moment of joy. 🪔"
            bn="আনন্দের মুহূর্ত ভাগ করে নিন প্রথম। 🪔"
            hi="खुशी का पल सबसे पहले साझा करें। 🪔"
          />
        </p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
          {moments.map((m) => (
            <article
              key={m.id}
              className="snap-start shrink-0 w-44 rounded-2xl overflow-hidden bg-white border border-amber-100 shadow-sm"
            >
              {m.imageUrl ? (
                <img
                  src={m.imageUrl}
                  alt=""
                  className="w-44 h-28 object-cover"
                  loading="lazy"
                />
              ) : (
                <div
                  className="w-44 h-28 flex items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100 text-4xl"
                  aria-hidden
                >
                  🪔
                </div>
              )}
              <div className="p-2.5">
                <p className="text-xs text-stone-700 leading-snug line-clamp-3">{m.text}</p>
                <p className="text-[10px] text-stone-400 mt-1 truncate">{m.authorName}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
