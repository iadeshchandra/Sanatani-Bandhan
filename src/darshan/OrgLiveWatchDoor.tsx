/**
 * darshan/OrgLiveWatchDoor.tsx — the org page's live watch door.
 * =====================================================================
 * Discoverability fix (audit 2026-10-20, offense #7): OrgPublicPage ran
 * the live-detection poller — devotees even got "temple is live"
 * notifications — but the page itself offered NO way to watch. The
 * notification deep-linked to a page with no door.
 *
 * This component REPLACES the null-rendering <OrgLivePoller/> mount on
 * the org page: it runs the exact same useLivePoller loop (leader
 * election + gentle go-live notification preserved — never mount both)
 * and, when the org is definitively live with a playable video, renders
 * a warm banner at the top of the page. Tap → DarshanViewer in-app
 * (youtube-nocookie). Never a new browser tab, never an external link.
 */
import React, { useState } from 'react';
import { useLivePoller } from './useLivePoller';
import { watchDoorTarget } from './pure';
import { DarshanViewer } from './DarshanViewer';
import { dt, type Lang } from './i18n';
import type { AartiSchedule } from './types';

interface Props {
  orgId: string;
  /** 24-char YouTube channel ID. Absent → renders nothing, polls nothing. */
  channelId?: string | null;
  templeName: string;
  /** The org's published aarti schedules, shown in the viewer footer. */
  schedules?: AartiSchedule[];
  lang?: Lang;
}

export const OrgLiveWatchDoor: React.FC<Props> = ({
  orgId,
  channelId,
  templeName,
  schedules = [],
  lang = 'en',
}) => {
  const status = useLivePoller({ orgId, channelId, templeName, lang });
  const [watching, setWatching] = useState(false);
  const target = watchDoorTarget(status);

  if (!target) return null;

  return (
    <>
      <div className="sticky top-0 z-40 px-4 pt-3 max-w-5xl mx-auto w-full">
        <button
          type="button"
          onClick={() => setWatching(true)}
          className="w-full text-left rounded-2xl overflow-hidden border-2 border-red-500 bg-gradient-to-br from-red-950 to-stone-900 shadow-lg min-h-[72px]"
          aria-label={`${dt('darshan.watchNow', lang)} — ${templeName}`}
        >
          <span className="flex items-center gap-3 px-4 py-3">
            <span className="relative flex h-3 w-3 shrink-0" aria-hidden>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-red-100 font-extrabold text-sm leading-snug">
                {dt('darshan.live', lang)} — {templeName}
              </span>
              {target.title && (
                <span className="block text-red-200/80 text-xs truncate mt-0.5">{target.title}</span>
              )}
              <span className="block text-red-200/70 text-xs mt-1">
                {dt('darshan.watchNow', lang)}
              </span>
            </span>
            <span className="text-2xl shrink-0" aria-hidden>
              🪔
            </span>
          </span>
        </button>
      </div>
      {watching && (
        <DarshanViewer
          templeName={templeName}
          videoId={target.videoId}
          streamTitle={target.title}
          schedules={schedules}
          lang={lang}
          onClose={() => setWatching(false)}
        />
      )}
    </>
  );
};
