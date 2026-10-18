/**
 * darshan/DarshanViewer.tsx — sacred live-stream viewer.
 * ============================================================================
 * youtube-nocookie embed (no tracking). Sacred framing: temple name,
 * "Live from" header, aarti schedule. Graceful offline message.
 */
import React from 'react';
import { nocookieEmbedUrl } from './channel';
import { nextAartiText } from './pure';
import { dt, type Lang } from './i18n';
import type { AartiSchedule } from './types';

interface Props {
  templeName: string;
  videoId: string | null;
  streamTitle?: string;
  schedules?: AartiSchedule[];
  lang?: Lang;
  online?: boolean;
  onClose: () => void;
}

export const DarshanViewer: React.FC<Props> = ({
  templeName,
  videoId,
  streamTitle,
  schedules = [],
  lang = 'en',
  online = true,
  onClose,
}) => {
  const next = nextAartiText(schedules);

  return (
    <div
      className="fixed inset-0 z-[100] bg-stone-950 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={`${dt('darshan.liveFrom', lang)} ${templeName}`}
    >
      {/* Sacred header */}
      <div className="shrink-0 px-4 pt-4 pb-3 bg-gradient-to-b from-amber-900 to-stone-950">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-amber-200 text-sm font-bold truncate">
              {dt('darshan.liveFrom', lang)} {templeName} 🙏
            </p>
            {streamTitle && (
              <p className="text-stone-400 text-xs truncate mt-0.5">{streamTitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-11 h-11 rounded-full bg-white/10 text-amber-100 text-lg flex items-center justify-center active:bg-white/20"
            aria-label={dt('darshan.cancel', lang)}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Video */}
      <div className="flex-1 min-h-0 flex items-center justify-center bg-black">
        {!online || !videoId ? (
          <div className="text-center px-8">
            <div className="text-5xl mb-4" aria-hidden>
              🪔
            </div>
            <p className="text-amber-100 font-bold">{dt('darshan.offline', lang)}</p>
          </div>
        ) : (
          <iframe
            src={nocookieEmbedUrl(videoId)}
            title={`${templeName} live darshan`}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
      </div>

      {/* Aarti schedule footer */}
      <div className="shrink-0 px-4 py-3 bg-stone-950 border-t border-amber-900/30">
        {next ? (
          <p className="text-amber-200/90 text-sm text-center">
            🪔 {dt('darshan.nextAarti', lang)} <strong>{next.name}</strong> {next.text}
          </p>
        ) : (
          <p className="text-stone-500 text-xs text-center">{dt('darshan.noSchedule', lang)}</p>
        )}
      </div>
    </div>
  );
};
