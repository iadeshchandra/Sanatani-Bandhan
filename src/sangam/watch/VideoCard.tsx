/**
 * sangam/watch/VideoCard.tsx — video cards for Shared Videos + Seva Demos.
 * ============================================================================
 * Tap-to-play thumbnails (never auto-play with sound). Report on every card.
 * Seva demo cards carry the provider's verification tier + a Book CTA.
 */
import React, { useState } from 'react';
import { Card, Btn, VerificationBadge } from '../ui';
import { nocookieWatchEmbed, type WatchVideo } from './types';
import { reportVideo, deleteVideo } from './watchService';
import { wt, type WatchLang } from './i18n';

interface Props {
  video: WatchVideo;
  lang: WatchLang;
  /** uid of the viewer — for author/admin delete affordance. */
  viewerUid: string;
  isAdmin: boolean;
  onBook?: (providerUid: string) => void;
}

export const VideoCard: React.FC<Props> = ({ video, lang, viewerUid, isAdmin, onBook }) => {
  const [playing, setPlaying] = useState(false);
  const [reported, setReported] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canDelete = isAdmin || video.sharedBy === viewerUid;
  const isDemo = video.category === 'seva_demo';

  const doReport = async () => {
    if (reported) return;
    try {
      await reportVideo(video.id);
      setReported(true);
    } catch {
      /* best-effort */
    }
  };

  const doDelete = async () => {
    try {
      await deleteVideo(video.id);
    } catch {
      /* rules-gated */
    }
    setConfirmDelete(false);
  };

  return (
    <Card className="overflow-hidden !p-0">
      {/* Thumbnail / player */}
      {playing ? (
        <div className="aspect-video bg-black">
          <iframe
            src={nocookieWatchEmbed(video.youtubeId)}
            title={video.title}
            className="w-full h-full"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="relative block w-full aspect-video bg-stone-900 group min-h-[120px]"
          aria-label={`${wt('watch.title', lang)}: ${video.title}`}
        >
          <img
            src={video.thumbnailUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-90 group-active:opacity-70"
            loading="lazy"
          />
          <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
            <span className="w-14 h-14 rounded-full bg-black/60 text-white text-2xl flex items-center justify-center group-active:scale-95 transition-transform">
              ▶
            </span>
          </span>
          {isDemo && (
            <span className="absolute top-2 left-2 bg-amber-600 text-white text-[10px] font-extrabold px-2 py-1 rounded-full">
              🪔 {wt('watch.sevaDemos', lang).replace('🪔 ', '')}
            </span>
          )}
        </button>
      )}

      {/* Meta */}
      <div className="p-4">
        <h3 className="font-extrabold text-stone-800 leading-snug">{video.title}</h3>
        <div className="mt-1.5 flex items-center gap-2 flex-wrap text-xs text-stone-500">
          <span className="font-bold text-stone-700">{video.sharedByName}</span>
          {video.sharedBySanId && (
            <span className="font-mono text-[10px] text-stone-400">{video.sharedBySanId}</span>
          )}
          {isDemo && video.providerTier && (
            <VerificationBadge tier={video.providerTier as import('../types').VerificationTier} kind="purohit" size="sm" />
          )}
        </div>
        {video.caption && (
          <p className="mt-2 text-sm text-stone-600 leading-relaxed">{video.caption}</p>
        )}

        {/* Actions */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {isDemo && video.providerUid && onBook && (
            <Btn variant="primary" onClick={() => onBook(video.providerUid!)} className="!px-4">
              {wt('watch.book', lang)}
            </Btn>
          )}
          <button
            type="button"
            onClick={doReport}
            disabled={reported}
            className="text-[11px] font-bold text-stone-400 hover:text-stone-600 disabled:text-stone-300 min-h-[44px] px-2"
          >
            {reported ? `✓ ${wt('watch.reported', lang)}` : `⚑ ${wt('watch.report', lang)}`}
          </button>
          {canDelete && !confirmDelete && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="text-[11px] font-bold text-red-400 hover:text-red-600 min-h-[44px] px-2"
            >
              {wt('watch.delete', lang)}
            </button>
          )}
          {confirmDelete && (
            <span className="flex items-center gap-1.5">
              <Btn variant="danger" onClick={doDelete} className="!px-3 !py-1.5 !text-xs !min-h-[44px]">
                {wt('watch.delete', lang)}?
              </Btn>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="text-[11px] font-bold text-stone-500 min-h-[44px] px-2"
              >
                ✕
              </button>
            </span>
          )}
        </div>
      </div>
    </Card>
  );
};
