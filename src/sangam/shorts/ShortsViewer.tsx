/**
 * sangam/shorts/ShortsViewer.tsx — full-screen vertical Shorts feed.
 * ============================================================================
 * Swipe up/down (scroll-snap) between sacred moments. The active short
 * auto-plays MUTED; tap for sound. Double-tap sends an Ashirvad with a
 * warm glow (never hearts). Action rail: 🪔 Ashirvad, 💬 Comments,
 * 🔗 Share, ⋯ More. Progress bar under each short.
 *
 * Lazy-loaded. Only the active short mounts an iframe; neighbours render
 * thumbnails (preloaded one ahead).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { nocookieShortEmbed, type Short } from './types';
import { st, type ShortsLang } from './i18n';
import { withReferrer } from '../referrals';
import {
  ashirvadShort,
  countShortView,
  deleteShort,
  reportShort,
} from './shortsService';
import { ShortComments } from './ShortComments';

interface Props {
  shorts: Short[];
  lang: ShortsLang;
  viewerUid: string;
  viewerName: string;
  viewerSanId?: string;
  isAdmin: boolean;
  /** Optional deep-link target: scroll to this short on mount. */
  initialShortId?: string;
  onClose: () => void;
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

const ShortItem: React.FC<{
  short: Short;
  active: boolean;
  preload: boolean;
  lang: ShortsLang;
  viewerUid: string;
  viewerName: string;
  viewerSanId?: string;
  isAdmin: boolean;
}> = ({ short, active, preload, lang, viewerUid, viewerName, viewerSanId, isAdmin }) => {
  const [muted, setMuted] = useState(true);
  const [ashirvaded, setAshirvaded] = useState(false);
  const [ashirvadCount, setAshirvadCount] = useState(short.ashirvadCount);
  const [glow, setGlow] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reported, setReported] = useState(false);
  const [shared, setShared] = useState(false);
  const lastTap = useRef(0);
  const viewed = useRef(false);

  // Count a view once per activation.
  useEffect(() => {
    if (active && !viewed.current) {
      viewed.current = true;
      countShortView(short.id);
    }
    if (!active) {
      setMuted(true);
      setMenuOpen(false);
      setCommentsOpen(false);
    }
  }, [active, short.id]);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      // Double-tap → Ashirvad with warm glow.
      if (!ashirvaded) {
        setAshirvaded(true);
        setAshirvadCount((c) => c + 1);
        setGlow(true);
        window.setTimeout(() => setGlow(false), 900);
        ashirvadShort(short.id, true).catch(() => {
          setAshirvaded(false);
          setAshirvadCount((c) => c - 1);
        });
      }
      lastTap.current = 0;
    } else {
      lastTap.current = now;
      // Single tap (delayed to distinguish from double-tap) → toggle sound.
      window.setTimeout(() => {
        if (lastTap.current !== 0) {
          setMuted((m) => !m);
          lastTap.current = 0;
        }
      }, 320);
    }
  }, [ashirvaded, short.id]);

  const toggleAshirvad = useCallback(() => {
    const next = !ashirvaded;
    setAshirvaded(next);
    setAshirvadCount((c) => c + (next ? 1 : -1));
    ashirvadShort(short.id, next).catch(() => {
      setAshirvaded(!next);
      setAshirvadCount((c) => c + (next ? -1 : 1));
    });
  }, [ashirvaded, short.id]);

  const doReport = async () => {
    if (reported) return;
    try {
      await reportShort(short.id);
      setReported(true);
    } catch {
      /* best-effort */
    }
    setMenuOpen(false);
  };

  const doDelete = async () => {
    try {
      await deleteShort(short.id);
    } catch {
      /* rules-gated */
    }
    setMenuOpen(false);
  };

  const doShare = async () => {
    const url = `${window.location.origin}${withReferrer(`/shorts/${short.id}`, viewerSanId)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: short.title, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setShared(true);
      window.setTimeout(() => setShared(false), 2000);
    } catch {
      /* user dismissed — quiet */
    }
  };

  const canDelete = isAdmin || short.authorUid === viewerUid;
  const embedUrl = `${nocookieShortEmbed(short.youtubeId)}${active ? '&autoplay=1' : ''}&mute=${muted ? 1 : 0}`;

  return (
    <div className="relative w-full h-full snap-start snap-always shrink-0 bg-black overflow-hidden">
      {/* Video or thumbnail */}
      {active ? (
        <button
          type="button"
          onClick={handleTap}
          className="absolute inset-0 w-full h-full"
          aria-label={short.title}
        >
          <iframe
            key={`${short.id}-${muted}`}
            src={embedUrl}
            title={short.title}
            className="w-full h-full pointer-events-none"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </button>
      ) : preload ? (
        <img
          src={short.thumbnailUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 bg-stone-900" />
      )}

      {/* Double-tap glow */}
      {glow && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
          <span className="text-7xl animate-ping">🪔</span>
        </div>
      )}

      {/* Muted hint */}
      {active && muted && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs font-bold px-3 py-1.5 rounded-full pointer-events-none">
          🔊 {st('shorts.tapForSound', lang)}
        </div>
      )}

      {/* Bottom-left: author + caption */}
      <div className="absolute bottom-0 left-0 right-16 p-4 pb-6 bg-gradient-to-t from-black/70 to-transparent pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={() => navigate(`/u/${short.authorUid}`)}
            className="font-extrabold text-white text-sm drop-shadow min-h-[44px] flex items-center"
          >
            @{short.authorName}
          </button>
          {short.authorSanId && (
            <span className="font-mono text-[10px] text-white/70">{short.authorSanId}</span>
          )}
        </div>
        <p className="text-white text-sm font-bold mt-1 drop-shadow line-clamp-2">{short.title}</p>
        {short.caption && (
          <p className="text-white/85 text-xs mt-1 drop-shadow line-clamp-2">{short.caption}</p>
        )}
      </div>

      {/* Right rail */}
      <div className="absolute bottom-20 right-2 flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={toggleAshirvad}
          className="flex flex-col items-center gap-1 min-w-[44px] min-h-[44px] justify-center"
          aria-label={st('shorts.ashirvad', lang)}
        >
          <span className={`text-3xl transition-transform ${ashirvaded ? 'scale-125' : ''}`}>
            {ashirvaded ? '🪔' : '🙏'}
          </span>
          <span className="text-white text-[11px] font-bold drop-shadow">{formatCount(ashirvadCount)}</span>
        </button>
        <button
          type="button"
          onClick={() => setCommentsOpen(true)}
          className="flex flex-col items-center gap-1 min-w-[44px] min-h-[44px] justify-center"
          aria-label={st('shorts.comments', lang)}
        >
          <span className="text-3xl">💬</span>
          <span className="text-white text-[11px] font-bold drop-shadow">{formatCount(short.commentCount)}</span>
        </button>
        <button
          type="button"
          onClick={doShare}
          className="flex flex-col items-center gap-1 min-w-[44px] min-h-[44px] justify-center"
          aria-label={st('shorts.shareAction', lang)}
        >
          <span className="text-3xl">{shared ? '✓' : '🔗'}</span>
          <span className="text-white text-[11px] font-bold drop-shadow">{st('shorts.shareAction', lang)}</span>
        </button>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-white text-2xl font-extrabold drop-shadow"
          aria-label="⋯"
        >
          ⋯
        </button>
      </div>

      {/* ⋯ menu */}
      {menuOpen && (
        <div className="absolute bottom-36 right-2 bg-white rounded-2xl shadow-xl p-2 w-40 z-10">
          {!reported ? (
            <button
              type="button"
              onClick={doReport}
              className="w-full text-left px-3 py-2.5 text-sm font-bold text-stone-700 rounded-xl hover:bg-stone-100 min-h-[44px]"
            >
              🚩 {st('shorts.report', lang)}
            </button>
          ) : (
            <p className="px-3 py-2.5 text-xs text-stone-500">{st('shorts.reported', lang)}</p>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={doDelete}
              className="w-full text-left px-3 py-2.5 text-sm font-bold text-red-600 rounded-xl hover:bg-red-50 min-h-[44px]"
            >
              🗑 {st('shorts.delete', lang)}
            </button>
          )}
        </div>
      )}

      {/* Comments sheet */}
      {commentsOpen && (
        <ShortComments
          short={short}
          lang={lang}
          viewerUid={viewerUid}
          viewerName={viewerName}
          onClose={() => setCommentsOpen(false)}
        />
      )}

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
        <div className={`h-full bg-amber-400 ${active ? 'animate-[shortsprogress_60s_linear]' : 'w-0'}`} />
      </div>
    </div>
  );
};

export const ShortsViewer: React.FC<Props> = ({
  shorts,
  lang,
  viewerUid,
  viewerName,
  viewerSanId,
  isAdmin,
  initialShortId,
  onClose,
}) => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Deep-link: scroll to the requested short on mount.
  useEffect(() => {
    if (initialShortId && containerRef.current) {
      const idx = shorts.findIndex((s) => s.id === initialShortId);
      if (idx > 0) {
        const el = containerRef.current;
        el.scrollTop = idx * el.clientHeight;
        setActiveIndex(idx);
      }
    }
  }, [initialShortId, shorts]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el || el.clientHeight === 0) return;
    const idx = Math.round(el.scrollTop / el.clientHeight);
    setActiveIndex(Math.max(0, Math.min(idx, shorts.length - 1)));
  }, [shorts.length]);

  // Lock body scroll while viewing.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9995] bg-black flex flex-col">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pt-4 pb-2 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
        <span className="text-white font-extrabold text-sm drop-shadow pointer-events-auto">
          {st('shorts.title', lang)}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="pointer-events-auto min-w-[44px] min-h-[44px] flex items-center justify-center text-white text-2xl drop-shadow"
          aria-label="✕"
        >
          ✕
        </button>
      </div>

      {/* Vertical feed */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto snap-y snap-mandatory scrollbar-none"
        style={{ scrollbarWidth: 'none' }}
      >
        {shorts.map((s, i) => (
          <ShortItem
            key={s.id}
            short={s}
            active={i === activeIndex}
            preload={i === activeIndex + 1}
            lang={lang}
            viewerUid={viewerUid}
            viewerName={viewerName}
            viewerSanId={viewerSanId}
            isAdmin={isAdmin}
          />
        ))}
      </div>

      <style>{`
        @keyframes shortsprogress { from { width: 0 } to { width: 100% } }
        .scrollbar-none::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};
