/**
 * darshan/yatra/YatraButton.tsx — "🛕 Darshan Yatra" entry button.
 * ============================================================================
 * Renders only when ≥2 temples are live. Opens the lazy-loaded YatraViewer.
 */
import React, { Suspense, lazy, useEffect, useState } from 'react';
import { dt, type Lang } from '../i18n';
import { shouldSuggestYatra } from './types';
import { subscribeLiveTemples } from './yatraService';
import type { LiveStreamItem } from '../../sangam/watch/types';

const YatraViewer = lazy(() =>
  import('./YatraViewer').then((m) => ({ default: m.YatraViewer })),
);

interface Props {
  lang?: Lang;
  /** Live streams, when the parent already subscribes (avoids a second listener). */
  liveItems?: LiveStreamItem[];
}

export const YatraButton: React.FC<Props> = ({ lang = 'en', liveItems }) => {
  const [liveSub, setLiveSub] = useState<LiveStreamItem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (liveItems) return;
    return subscribeLiveTemples(setLiveSub);
  }, [liveItems]);

  const live = liveItems ?? liveSub;

  if (!shouldSuggestYatra(live.length)) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full min-h-[52px] rounded-2xl bg-gradient-to-r from-amber-700 via-orange-700 to-amber-700 text-white font-extrabold text-sm px-4 flex items-center justify-center gap-2 active:scale-[0.99] transition-transform shadow-lg shadow-orange-900/30"
      >
        <span className="text-lg" aria-hidden>🛕</span>
        {dt('yatra.cta', lang)}
        <span className="text-xs font-bold bg-white/20 rounded-full px-2 py-0.5">
          {live.length}
        </span>
      </button>
      <div className="h-3" aria-hidden />
      {open && (
        <Suspense fallback={null}>
          <YatraViewer live={live} lang={lang} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
};
