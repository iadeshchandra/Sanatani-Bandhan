/**
 * sangam/stories/StoryViewer.tsx — full-screen story viewer.
 * ============================================================================
 * Lazy-loaded. Photo/text fills the screen with a warm vignette (never
 * black bars). Progress bar per story, 5s auto-advance, pause on
 * touch-hold. Tap right = next, tap left = previous, swipe down / X =
 * close. Author sees view count; viewer identities stay private.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { backgroundCss, isStoryLive, storyAge, type Story } from './types';
import { deleteStory, getViewCount, markViewed, reportStory } from './storyService';
import { resolveVaultUrl } from '../../lib/fileVault';
import { st, type StoryLang } from './i18n';

interface Props {
  groups: Array<{ authorUid: string; authorName: string; authorAvatar?: string; stories: Story[] }>;
  startAuthorUid: string;
  startIndex: number;
  uid: string;
  lang: StoryLang;
  onClose: () => void;
  onViewed: (storyId: string) => void;
}

const DURATION_MS = 5000;

const StoryImage: React.FC<{ url?: string }> = ({ url }) => {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    if (!url) { setSrc(null); return; }
    resolveVaultUrl(url).then((r) => { if (live) setSrc(r); }).catch(() => { if (live) setSrc(null); });
    return () => { live = false; };
  }, [url]);
  if (!src) return <div className="absolute inset-0 bg-stone-200 animate-pulse" aria-hidden="true" />;
  // eslint-disable-next-line jsx-a11y/alt-text
  return <img src={src} className="absolute inset-0 w-full h-full object-cover" />;
};

export const StoryViewer: React.FC<Props> = ({
  groups, startAuthorUid, startIndex, uid, lang, onClose, onViewed,
}) => {
  const navigate = useNavigate();
  const [gi, setGi] = useState(() => Math.max(0, groups.findIndex((g) => g.authorUid === startAuthorUid)));
  const [si, setSi] = useState(startIndex);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [viewCount, setViewCount] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<number>(Date.now());

  const group = groups[gi];
  const story: Story | undefined = group?.stories[si];
  const isAuthor = story ? story.authorUid === uid : false;

  const goNext = useCallback(() => {
    const g = groups[gi];
    if (!g) { onClose(); return; }
    if (si + 1 < g.stories.length) {
      setSi(si + 1);
    } else if (gi + 1 < groups.length) {
      setGi(gi + 1); setSi(0);
    } else {
      onClose();
    }
  }, [gi, si, groups, onClose]);

  const goPrev = useCallback(() => {
    if (si > 0) setSi(si - 1);
    else if (gi > 0) {
      const pg = groups[gi - 1];
      setGi(gi - 1); setSi(Math.max(0, pg.stories.length - 1));
    }
  }, [gi, si, groups]);

  // Auto-advance.
  useEffect(() => {
    setProgress(0);
    startRef.current = Date.now();
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      if (paused) { startRef.current += 100; return; }
      const elapsed = Date.now() - startRef.current;
      const p = Math.min(1, elapsed / DURATION_MS);
      setProgress(p);
      if (p >= 1) goNext();
    }, 100);
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [gi, si, paused, goNext]);

  // Mark viewed + load view count for authors.
  useEffect(() => {
    if (!story || !isStoryLive(story)) return;
    markViewed(story.id, uid);
    onViewed(story.id);
    if (isAuthor) getViewCount(story.id).then(setViewCount).catch(() => setViewCount(null));
    else setViewCount(null);
  }, [story?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Escape closes.
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // Touch: swipe down to close, tap zones to navigate, hold to pause.
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setPaused(true);
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    setPaused(false);
    const s = touchStart.current;
    touchStart.current = null;
    if (!s) return;
    const dx = e.changedTouches[0].clientX - s.x;
    const dy = e.changedTouches[0].clientY - s.y;
    if (dy > 80 && Math.abs(dy) > Math.abs(dx) * 1.5) { onClose(); return; }
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
      const w = window.innerWidth;
      const x = e.changedTouches[0].clientX;
      if (x > w * 0.7) goNext();
      else if (x < w * 0.3) goPrev();
    }
  };

  if (!group || !story) {
    return (
      <div className="fixed inset-0 z-[200] bg-stone-900/95 flex items-center justify-center">
        <p className="text-stone-300 text-sm">{st('stories.expired', lang)}</p>
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-white text-2xl min-w-[44px] min-h-[44px]" aria-label="Close">×</button>
      </div>
    );
  }

  const expired = !isStoryLive(story);

  return (
    <div
      className="fixed inset-0 z-[200] select-none"
      style={{ background: '#1c1917' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      role="dialog"
      aria-label={`${group.authorName} — story ${si + 1} of ${group.stories.length}`}
    >
      {/* Media */}
      {story.mediaType === 'photo' ? (
        <StoryImage url={story.mediaUrl} />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center p-8" style={{ background: backgroundCss(story.backgroundId) }}>
          <p className="text-white text-2xl font-bold text-center leading-snug drop-shadow-lg">{story.text}</p>
        </div>
      )}
      {/* Warm vignette — never black bars */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(28,25,23,0.55) 0%, transparent 22%, transparent 78%, rgba(28,25,23,0.6) 100%)' }}
        aria-hidden="true"
      />

      {/* Progress bars */}
      <div className="absolute top-3 left-3 right-3 flex gap-1.5" aria-hidden="true">
        {group.stories.map((s, i) => (
          <div key={s.id} className="flex-1 h-1 rounded-full bg-white/30 overflow-hidden">
            <div
              className="h-full bg-white rounded-full"
              style={{ width: i < si ? '100%' : i === si ? `${progress * 100}%` : '0%' }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-6 left-3 right-3 flex items-center gap-2.5">
        <span className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-white font-extrabold flex items-center justify-center overflow-hidden shrink-0">
          {group.authorAvatar ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <img src={group.authorAvatar} className="w-full h-full object-cover" />
          ) : group.authorName.slice(0, 1).toUpperCase()}
        </span>
        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={() => navigate(`/u/${group.authorUid}`)}
            className="text-white font-bold text-sm truncate min-h-[44px] flex items-center"
          >
            {group.authorName}
          </button>
          <p className="text-white/70 text-xs">{storyAge(story.createdAt)}</p>
        </div>
        {isAuthor && viewCount !== null && (
          <span className="text-white/80 text-xs font-bold bg-white/10 rounded-full px-2.5 py-1">
            👁 {viewCount} {st('stories.viewCount', lang)}
          </span>
        )}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="text-white text-xl min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="More"
        >
          ⋯
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-white text-2xl min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Menu: delete (author) / report */}
      {menuOpen && (
        <div className="absolute top-20 right-3 bg-white rounded-2xl shadow-xl p-2 min-w-[180px]">
          {isAuthor ? (
            <button
              type="button"
              onClick={async () => { await deleteStory(story.id); setMenuOpen(false); onClose(); }}
              className="w-full text-left px-4 py-3 text-sm font-bold text-red-600 min-h-[44px]"
            >
              🗑 {st('stories.delete', lang)}
            </button>
          ) : (
            <button
              type="button"
              onClick={async () => { await reportStory(story.id); setMenuOpen(false); }}
              className="w-full text-left px-4 py-3 text-sm font-bold text-stone-700 min-h-[44px]"
            >
              🚩 {st('stories.report', lang)}
            </button>
          )}
        </div>
      )}

      {/* Caption */}
      {story.caption && (
        <p className="absolute bottom-8 left-4 right-4 text-white text-sm font-medium text-center drop-shadow-lg">
          {story.caption}
        </p>
      )}
      {expired && (
        <p className="absolute bottom-8 left-4 right-4 text-white/80 text-sm text-center">
          {st('stories.expired', lang)}
        </p>
      )}
    </div>
  );
};
