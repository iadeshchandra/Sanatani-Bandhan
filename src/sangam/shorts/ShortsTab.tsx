/**
 * sangam/shorts/ShortsTab.tsx — the ⚡ Shorts tab content.
 * ============================================================================
 * Grid of sacred moments (thumbnail cards). Tap any card → full-screen
 * ShortsViewer. "Share a short" button opens the share sheet.
 * Ranked by the shorts engine (freshness + closeness + velocity).
 */
import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useSolo } from '../../solo/SoloContext';
import { subscribeShorts } from './shortsService';
import { rankShorts } from './shortsRanking';
import { emptyUserSignals, type UserSignals } from '../../ranking/feed';
import { loadUserSignals } from '../../ranking/storage';
import { st, type ShortsLang } from './i18n';
import { ShareShortSheet } from './ShareShortSheet';
import type { Short } from './types';
import type { AuthorInfo } from '../sangamStore';

const ShortsViewer = lazy(() =>
  import('./ShortsViewer').then((m) => ({ default: m.ShortsViewer })),
);

function toShortsLang(lang: string): ShortsLang {
  return lang === 'bn' ? 'bn' : lang === 'hi' ? 'hi' : 'en';
}

interface Props {
  author: AuthorInfo;
}

export const ShortsTab: React.FC<Props> = ({ author }) => {
  const { firebaseUser, currentRole } = useAuthWorkspace();
  const { profile } = useSolo();
  const lang = toShortsLang(
    (profile as unknown as { lang?: string } | null)?.lang || 'en',
  );
  const isAdmin = String(currentRole || '').toLowerCase() === 'superadmin';
  const viewerUid = (firebaseUser as { uid?: string } | null)?.uid || 'anon';
  const viewerName = profile?.displayName || 'Sanatani';
  const viewerSanId = profile?.id;

  const [shorts, setShorts] = useState<Short[]>([]);
  const [signals, setSignals] = useState<UserSignals>(emptyUserSignals());
  const [shareOpen, setShareOpen] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [initialShortId, setInitialShortId] = useState<string | undefined>(undefined);

  useEffect(() => subscribeShorts(setShorts, 60), []);
  useEffect(() => {
    loadUserSignals().then(setSignals).catch(() => {});
  }, []);

  const ranked = useMemo(() => rankShorts(shorts, signals).map((r) => r.short), [shorts, signals]);

  const openViewer = (shortId?: string) => {
    setInitialShortId(shortId);
    setViewing(true);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2 className="text-lg font-extrabold text-stone-800">{st('shorts.title', lang)}</h2>
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-extrabold min-h-[44px]"
        >
          ＋ {st('shorts.share', lang)}
        </button>
      </div>

      {ranked.length === 0 ? (
        <div className="text-center py-12 px-6">
          <div className="text-5xl mb-3" aria-hidden>
            ⚡
          </div>
          <p className="text-stone-500 text-sm max-w-xs mx-auto">{st('shorts.empty', lang)}</p>
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="mt-4 px-5 py-3 rounded-2xl bg-amber-600 text-white text-sm font-extrabold min-h-[44px]"
          >
            {st('shorts.share', lang)}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {ranked.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => openViewer(s.id)}
              className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-stone-900 group min-h-[120px]"
              aria-label={s.title}
            >
              <img
                src={s.thumbnailUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover group-active:opacity-80"
                loading="lazy"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" aria-hidden />
              <span className="absolute bottom-2 left-2 right-2 text-left">
                <span className="block text-white text-[11px] font-bold leading-tight line-clamp-2 drop-shadow">
                  {s.title}
                </span>
                <span className="block text-white/70 text-[10px] mt-0.5">
                  {s.viewCount} {st('shorts.views', lang)}
                </span>
              </span>
              <span
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center text-lg"
                aria-hidden
              >
                ▶
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Share sheet */}
      {shareOpen && (
        <ShareShortSheet
          lang={lang}
          authorUid={viewerUid}
          authorName={viewerName}
          authorSanId={viewerSanId}
          onShared={() => setShareOpen(false)}
          onClose={() => setShareOpen(false)}
        />
      )}

      {/* Full-screen viewer */}
      {viewing && (
        <Suspense fallback={null}>
          <ShortsViewer
            shorts={ranked}
            lang={lang}
            viewerUid={viewerUid}
            viewerName={viewerName}
            viewerSanId={viewerSanId}
            isAdmin={isAdmin}
            initialShortId={initialShortId}
            onClose={() => setViewing(false)}
          />
        </Suspense>
      )}
    </div>
  );
};
