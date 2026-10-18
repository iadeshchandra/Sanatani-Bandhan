/**
 * sangam/watch/WatchTab.tsx — Sangam Watch: the unified video surface.
 * ============================================================================
 * Three sections, one calm feed:
 *   🔴 Live Now     — temple live streams (from orgLiveStatus, darshan reuse)
 *   🎬 Shared Videos — devotee-shared YouTube (bhajan, discourse, yatra)
 *   🪔 Seva Demos    — verified provider introductions, with Book CTA
 *
 * YouTube-nocookie embeds only. Tap-to-play, never auto-play with sound.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Card, Btn, EmptyState, useLocaleText } from '../ui';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { LiveBadge, DarshanViewer } from '../../darshan';
import { subscribeVideos, subscribeLiveStreams } from './watchService';
import { VideoCard } from './VideoCard';
import { ShareVideoSheet } from './ShareVideoSheet';
import { wt, type WatchLang } from './i18n';
import type { WatchVideo, LiveStreamItem } from './types';
import type { AuthorInfo } from '../sangamStore';

interface Props {
  author: AuthorInfo;
}

function toWatchLang(lang: string): WatchLang {
  return lang === 'bn' ? 'bn' : lang === 'hi' ? 'hi' : 'en';
}

export const WatchTab: React.FC<Props> = ({ author }) => {
  const { lang } = useLocaleText();
  const wl = toWatchLang(lang);
  const { currentRole } = useAuthWorkspace();
  const isAdmin = String(currentRole || '').toLowerCase() === 'superadmin';

  const [live, setLive] = useState<LiveStreamItem[]>([]);
  const [shared, setShared] = useState<WatchVideo[]>([]);
  const [demos, setDemos] = useState<WatchVideo[]>([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [watching, setWatching] = useState<LiveStreamItem | null>(null);

  useEffect(() => subscribeLiveStreams(setLive), []);
  useEffect(() => subscribeVideos('shared', setShared), []);
  useEffect(() => subscribeVideos('seva_demo', setDemos), []);

  const handleBook = useCallback((providerUid: string) => {
    // Deep-link to the provider's Seva Pro profile for booking.
    window.location.href = `/seva/pro/${providerUid}`;
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold text-stone-800">📺 {wt('watch.title', wl)}</h2>
        <Btn onClick={() => setShareOpen(true)} className="!px-3">
          ＋ {wt('watch.share', wl)}
        </Btn>
      </div>

      {/* 🔴 Live Now */}
      <section aria-label={wt('watch.liveNow', wl)}>
        <h3 className="text-sm font-extrabold text-stone-700 mb-2">{wt('watch.liveNow', wl)}</h3>
        {live.length === 0 ? (
          <Card>
            <EmptyState
              icon="🪔"
              title={<span className="text-sm font-bold text-stone-600">{wt('watch.liveNow', wl)}</span>}
              body={<span className="text-xs">{wt('watch.noLive', wl)}</span>}
            />
          </Card>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {live.map((s) => (
              <button
                key={s.orgId || s.videoId}
                type="button"
                onClick={() => s.videoId && setWatching(s)}
                className="shrink-0 w-44 text-left rounded-2xl border border-stone-200 bg-white overflow-hidden active:scale-[0.98] transition-transform min-h-[120px]"
              >
                <div className="h-24 bg-gradient-to-br from-red-900 to-stone-900 flex items-center justify-center relative">
                  <span className="text-3xl" aria-hidden>🛕</span>
                  <span className="absolute top-2 left-2">
                    <LiveBadge lang={wl} size="sm" />
                  </span>
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-extrabold text-stone-800 truncate">
                    {wt('watch.liveFrom', wl)} {s.templeName}
                  </p>
                  {s.title && (
                    <p className="text-[10px] text-stone-500 truncate mt-0.5">{s.title}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 🪔 Seva Demos */}
      <section aria-label={wt('watch.sevaDemos', wl)}>
        <h3 className="text-sm font-extrabold text-stone-700 mb-2">{wt('watch.sevaDemos', wl)}</h3>
        {demos.length === 0 ? (
          <Card>
            <EmptyState
              icon="🪔"
              title={<span className="text-sm font-bold text-stone-600">{wt('watch.sevaDemos', wl)}</span>}
              body={<span className="text-xs">{wt('watch.noDemos', wl)}</span>}
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {demos.map((v) => (
              <VideoCard key={v.id} video={v} lang={wl} viewerUid={author.uid} isAdmin={isAdmin} onBook={handleBook} />
            ))}
          </div>
        )}
      </section>

      {/* 🎬 Shared Videos */}
      <section aria-label={wt('watch.shared', wl)}>
        <h3 className="text-sm font-extrabold text-stone-700 mb-2">{wt('watch.shared', wl)}</h3>
        {shared.length === 0 ? (
          <Card>
            <EmptyState
              icon="🎬"
              title={<span className="text-sm font-bold text-stone-600">{wt('watch.shared', wl)}</span>}
              body={<span className="text-xs">{wt('watch.noShared', wl)}</span>}
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {shared.map((v) => (
              <VideoCard key={v.id} video={v} lang={wl} viewerUid={author.uid} isAdmin={isAdmin} />
            ))}
          </div>
        )}
      </section>

      {/* Share sheet */}
      {shareOpen && (
        <ShareVideoSheet
          author={author}
          lang={wl}
          onClose={() => setShareOpen(false)}
          onShared={() => {}}
        />
      )}

      {/* Live viewer (darshan reuse) */}
      {watching && watching.videoId && (
        <DarshanViewer
          templeName={watching.templeName}
          videoId={watching.videoId}
          streamTitle={watching.title}
          lang={wl}
          onClose={() => setWatching(null)}
        />
      )}
    </div>
  );
};
