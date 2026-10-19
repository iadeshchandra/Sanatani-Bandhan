/**
 * sangam/GratitudeWall.tsx — Provider gratitude wall (Phase 4).
 * ============================================================================
 * Sacred social proof: families' thanks rendered as a warm wall on the
 * provider's Seva Pro profile. No star numbers, no scores — just
 * "🙏 47 families shared gratitude" and the heartfelt words.
 */
import React from 'react';
import { T } from '../solo/ui';
import { gratitudeCountCopy } from './kritagyata';
import { ShareButton } from './ShareButton';
import type { SangamPost } from './types';

export const GratitudeWall: React.FC<{
  posts: SangamPost[];
  lang?: 'en' | 'hi' | 'bn';
  onThank?: () => void;
  /** Viewer's Sanatani ID for share-referral attribution. */
  viewerSanId?: string;
}> = ({ posts, lang = 'en', onThank, viewerSanId }) => {
  return (
    <section aria-label="Gratitude wall" className="rounded-2xl bg-amber-50/60 border border-amber-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-extrabold text-stone-800 text-base">
          <T en="🙏 Kritagyata" bn="🙏 কৃতজ্ঞতা" hi="🙏 कृतज्ञता" />
        </h3>
        <span className="text-sm font-bold text-amber-800">
          {gratitudeCountCopy(posts.length, lang)}
        </span>
      </div>
      {posts.length === 0 ? (
        <p className="text-sm text-stone-500 leading-relaxed">
          <T
            en="No gratitude shared yet — be the first family to say dhanyavaad after your seva."
            bn="এখনও কৃতজ্ঞতা ভাগ করা হয়নি — আপনার সেবার পর ধন্যবাদ জানান প্রথম পরিবার হোন।"
            hi="अभी कोई कृतज्ञता साझा नहीं हुई — अपनी सेवा के बाद धन्यवाद कहने वाला पहला परिवार बनें।"
          />
        </p>
      ) : (
        <ul className="space-y-3">
          {posts.slice(0, 10).map((p) => (
            <li
              key={p.id}
              className="rounded-xl bg-white border border-amber-100 px-3 py-2.5 shadow-sm"
            >
              <p className="text-sm text-stone-700 leading-relaxed">{p.text}</p>
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-xs text-stone-400">
                  — {p.authorName} · <span className="font-mono">{p.authorSanId}</span>
                </p>
                {viewerSanId && (
                  <ShareButton path={`/seva/pro/${p.providerUid}`} sharerSanId={viewerSanId} />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {onThank && posts.length > 0 && (
        <button
          type="button"
          onClick={onThank}
          className="mt-3 w-full rounded-xl border border-amber-300 text-amber-800 font-bold py-2.5 min-h-[44px] text-sm"
        >
          <T en="Share your gratitude" bn="আপনার কৃতজ্ঞতা জানান" hi="अपनी कृतज्ञता साझा करें" />
        </button>
      )}
    </section>
  );
};
