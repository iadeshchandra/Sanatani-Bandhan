/**
 * darshan/yatra/YatraViewer.tsx — full-screen multi-temple darshan yatra.
 * ============================================================================
 * Swipe left/right (touch) or arrows (desktop) between live temples.
 * youtube-nocookie embeds — we never host streams. Lazy-loaded.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { nocookieEmbedUrl } from '../channel';
import { dt, type Lang } from '../i18n';
import { YATRA_COLLECTIONS } from './collections';
import { activeYatraFestivals, festivalYatraHeader } from './festival';
import { clampStopIndex, nextStopIndex, prevStopIndex } from './types';
import { buildYatra, stopCounterText } from './yatra';
import type { LiveStreamItem } from '../../sangam/watch/types';

interface Props {
  live: LiveStreamItem[];
  lang?: Lang;
  onClose: () => void;
}

const SWIPE_PX = 60;

export const YatraViewer: React.FC<Props> = ({ live, lang = 'en', onClose }) => {
  const [collectionId, setCollectionId] = useState<string | undefined>(undefined);
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);

  const stops = buildYatra(live, collectionId);
  const festivals = activeYatraFestivals();
  const festival = festivals[0];

  // Reset index when the stop list changes shape.
  useEffect(() => {
    setIndex((i) => clampStopIndex(i, stops.length));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionId, live.length]);

  const go = useCallback(
    (i: number) => setIndex(clampStopIndex(i, stops.length)),
    [stops.length],
  );
  const next = useCallback(() => setIndex((i) => nextStopIndex(i, stops.length)), [stops.length]);
  const prev = useCallback(() => setIndex((i) => prevStopIndex(i, stops.length)), [stops.length]);

  // Keyboard navigation (desktop).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, onClose]);

  if (stops.length === 0) {
    return (
      <div className="fixed inset-0 z-[100] bg-stone-950 flex items-center justify-center" role="dialog" aria-modal="true">
        <div className="text-center px-8">
          <div className="text-5xl mb-4" aria-hidden>🪔</div>
          <p className="text-amber-100 font-bold">{dt('yatra.noLive', lang)}</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-6 min-h-[44px] px-6 rounded-full bg-amber-600 text-white font-bold active:bg-amber-700"
          >
            {dt('yatra.close', lang)}
          </button>
        </div>
      </div>
    );
  }

  const stop = stops[index];
  const collectionName = collectionId
    ? YATRA_COLLECTIONS.find((c) => c.id === collectionId)?.name[lang]
    : undefined;

  return (
    <div
      className="fixed inset-0 z-[100] bg-stone-950 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={dt('yatra.title', lang)}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (dx < -SWIPE_PX) next();
        else if (dx > SWIPE_PX) prev();
      }}
    >
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-3 bg-gradient-to-b from-amber-900 to-stone-950">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-amber-200 text-sm font-bold truncate">
              {festival ? festivalYatraHeader(festival, stops.length, lang) : `🛕 ${dt('yatra.title', lang)}`}
            </p>
            <p className="text-stone-400 text-xs mt-0.5">
              {stopCounterText(index, stops.length, lang)}
              {collectionName ? ` · ${collectionName}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-11 h-11 rounded-full bg-white/10 text-amber-100 text-lg flex items-center justify-center active:bg-white/20"
            aria-label={dt('yatra.close', lang)}
          >
            ✕
          </button>
        </div>
        {/* Collection picker */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          <YatraChip active={!collectionId} label={dt('yatra.all', lang)} onClick={() => setCollectionId(undefined)} />
          {YATRA_COLLECTIONS.map((c) => (
            <YatraChip
              key={c.id}
              active={collectionId === c.id}
              label={c.name[lang]}
              onClick={() => setCollectionId(collectionId === c.id ? undefined : c.id)}
            />
          ))}
        </div>
      </div>

      {/* Current stop */}
      <div className="flex-1 min-h-0 flex flex-col bg-black relative">
        <div className="shrink-0 px-4 py-2.5 bg-stone-950/90">
          <p className="text-amber-100 font-extrabold text-base truncate">
            🔴 {stop.displayName[lang]} 🙏
          </p>
          {stop.title && <p className="text-stone-400 text-xs truncate mt-0.5">{stop.title}</p>}
        </div>
        <div className="flex-1 min-h-0">
          {stop.videoId ? (
            <iframe
              key={`${stop.orgId}:${stop.videoId}`}
              src={nocookieEmbedUrl(stop.videoId)}
              title={`${stop.displayName[lang]} live darshan`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-amber-100/70 text-sm">{dt('yatra.streamStarting', lang)}</p>
            </div>
          )}
        </div>

        {/* Desktop arrows */}
        <button
          type="button"
          onClick={prev}
          aria-label={dt('yatra.prev', lang)}
          className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 text-amber-100 text-xl items-center justify-center active:bg-black/70"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={next}
          aria-label={dt('yatra.next', lang)}
          className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 text-amber-100 text-xl items-center justify-center active:bg-black/70"
        >
          ›
        </button>
      </div>

      {/* Temple strip */}
      <div className="shrink-0 px-3 py-2.5 bg-stone-950 border-t border-amber-900/30">
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={dt('yatra.title', lang)}>
          {stops.map((s, i) => (
            <button
              key={s.orgId}
              type="button"
              role="tab"
              aria-selected={i === index}
              onClick={() => go(i)}
              className={`shrink-0 min-h-[44px] px-3 rounded-full text-xs font-bold border transition-colors ${
                i === index
                  ? 'bg-amber-600 border-amber-500 text-white'
                  : 'bg-white/5 border-white/10 text-amber-100/70 active:bg-white/10'
              }`}
            >
              {i === index ? '🔴 ' : ''}{s.displayName[lang]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const YatraChip: React.FC<{ active: boolean; label: string; onClick: () => void }> = ({
  active,
  label,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`shrink-0 min-h-[44px] px-4 rounded-full text-xs font-bold border transition-colors ${
      active
        ? 'bg-amber-600 border-amber-500 text-white'
        : 'bg-white/5 border-white/10 text-amber-100/70 active:bg-white/10'
    }`}
  >
    {label}
  </button>
);
