/**
 * sangam/stories/StoriesRail.tsx — "🪔 Today's moments" horizontal rail.
 * ============================================================================
 * Sits at the top of the Sangam feed. Circular avatars: saffron ring for
 * authors with unviewed stories, grey for all-viewed. "Your story" first
 * with a + affordance. Tapping opens the full-screen viewer.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { groupStoriesByAuthor, type Story } from './types';
import { subscribeStories } from './storyService';
import { st, type StoryLang } from './i18n';

interface Props {
  uid: string;
  lang: StoryLang;
  onOpenViewer: (authorUid: string, storyIndex: number) => void;
  onCreate: () => void;
  viewedIds: Set<string>;
  /** Owner-hidden content ids (GodMode → Moderation) — filtered out. */
  hiddenIds?: Set<string>;
}

const AVATAR = 60;

export const StoriesRail: React.FC<Props> = ({ uid, lang, onOpenViewer, onCreate, viewedIds, hiddenIds }) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  // Expiry is lazy: the subscription's expiresAt threshold is fixed at
  // subscribe time, so re-filter every minute — stories that expire
  // mid-session vanish instead of lingering until new data arrives.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setTick((x) => x + 1), 60_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeStories((s) => {
      setStories(s);
      setLoading(false);
    });
    return unsub;
  }, []);

  const groups = useMemo(() => {
    void tick; // re-run as time passes so expired stories vanish mid-session
    const visible = hiddenIds && hiddenIds.size > 0
      ? stories.filter((s) => !hiddenIds.has(s.id))
      : stories;
    return groupStoriesByAuthor(visible, Date.now());
  }, [stories, hiddenIds, tick]);
  const mine = groups.find((g) => g.authorUid === uid);
  const others = groups.filter((g) => g.authorUid !== uid);

  if (loading) {
    return (
      <div className="flex gap-3 px-1 py-2" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="w-[60px] h-[60px] rounded-full bg-stone-100 animate-pulse shrink-0" />
        ))}
      </div>
    );
  }

  const hasAny = groups.length > 0;

  return (
    <section aria-label={st('stories.title', lang)} className="mb-3">
      <h3 className="text-xs font-extrabold text-stone-500 uppercase tracking-wider px-1 mb-2">
        {st('stories.title', lang)}
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2 px-1" style={{ scrollbarWidth: 'none' }}>
        {/* Your story — always first */}
        <button
          type="button"
          onClick={onCreate}
          className="flex flex-col items-center gap-1 shrink-0 min-w-[68px] min-h-[44px]"
          aria-label={st('stories.yourStory', lang)}
        >
          <span className="relative" style={{ width: AVATAR, height: AVATAR }}>
            <span
              className="w-full h-full rounded-full bg-gradient-to-br from-amber-100 to-orange-200 border-2 border-dashed border-orange-300 flex items-center justify-center text-2xl text-orange-500 font-bold"
              aria-hidden="true"
            >
              {mine ? (mine.authorAvatar ? '' : mine.authorName.slice(0, 1).toUpperCase()) : '+'}
            </span>
            {mine?.authorAvatar && (
              // eslint-disable-next-line jsx-a11y/alt-text
              <img src={mine.authorAvatar} className="absolute inset-0 w-full h-full rounded-full object-cover" loading="lazy" />
            )}
            <span
              className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-orange-600 text-white text-sm font-bold flex items-center justify-center border-2 border-white"
              aria-hidden="true"
            >
              +
            </span>
          </span>
          <span className="text-[11px] font-bold text-stone-600 max-w-[68px] truncate">
            {st('stories.yourStory', lang)}
          </span>
        </button>

        {others.map((g) => {
          const unviewed = g.stories.some((s) => !viewedIds.has(s.id));
          const newest = g.stories[0];
          return (
            <button
              key={g.authorUid}
              type="button"
              onClick={() => onOpenViewer(g.authorUid, 0)}
              className="flex flex-col items-center gap-1 shrink-0 min-w-[68px] min-h-[44px]"
              aria-label={`${g.authorName} — ${g.stories.length} stories`}
            >
              <span
                className={`rounded-full p-[3px] ${unviewed ? 'bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-400' : 'bg-stone-200'}`}
                style={{ width: AVATAR + 6, height: AVATAR + 6 }}
              >
                <span className="w-full h-full rounded-full bg-white p-[2px] block">
                  <span
                    className="w-full h-full rounded-full bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center text-lg font-extrabold text-orange-700 overflow-hidden"
                    aria-hidden="true"
                  >
                    {g.authorAvatar ? (
                      // eslint-disable-next-line jsx-a11y/alt-text
                      <img src={g.authorAvatar} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      g.authorName.slice(0, 1).toUpperCase()
                    )}
                  </span>
                </span>
              </span>
              <span className="text-[11px] font-bold text-stone-600 max-w-[68px] truncate">
                {g.authorName.split(' ')[0]}
              </span>
              <span className="sr-only">{newest ? '' : ''}</span>
            </button>
          );
        })}

        {!hasAny && (
          <p className="text-xs text-stone-400 italic self-center px-2 max-w-[240px]">
            {st('stories.noStories', lang)}
          </p>
        )}
      </div>
    </section>
  );
};
