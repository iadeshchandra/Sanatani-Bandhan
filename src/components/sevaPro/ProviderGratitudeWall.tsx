/**
 * sevaPro/ProviderGratitudeWall.tsx — Kritagyata wall on the Seva Pro profile.
 * ============================================================================
 * Fetches a provider's gratitude posts (sangamPosts, kind 'gratitude') and
 * renders them through the shared GratitudeWall component.
 *
 * Query design: single-field `where('providerUid', '==', uid)` — no composite
 * index needed. Kind filtering + newest-first sort happen client-side via
 * selectGratitudePosts() (src/components/sevaPro/gratitudeWall.ts).
 *
 * Fail-open everywhere: a failed fetch shows the wall's warm empty state,
 * never an error. The viewer's Sanatani ID (for share-referral attribution)
 * is best-effort — the wall renders fine without it.
 */
import React, { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { GratitudeWall } from '../../sangam/GratitudeWall';
import type { SangamPost } from '../../sangam/types';
import { selectGratitudePosts, toWallLang, type WallLang } from './gratitudeWall';

interface Props {
  /** The professional's uid (route param of /seva/pro/:uid). */
  providerUid: string;
  /** Raw language code from useLanguage(); mapped to en/hi/bn. */
  lang?: string;
  /** Viewer's uid — used to look up their Sanatani ID for referrals. Optional. */
  viewerUid?: string;
}

export const ProviderGratitudeWall: React.FC<Props> = ({ providerUid, lang, viewerUid }) => {
  const [posts, setPosts] = useState<SangamPost[]>([]);
  const [viewerSanId, setViewerSanId] = useState<string | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!providerUid) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [snap, viewerSnap] = await Promise.all([
          getDocs(query(collection(db, 'sangamPosts'), where('providerUid', '==', providerUid), limit(50))),
          viewerUid
            ? getDoc(doc(db, 'devoteeProfiles', viewerUid)).catch(() => null)
            : Promise.resolve(null),
        ]);
        if (cancelled) return;
        const all = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as SangamPost);
        setPosts(selectGratitudePosts(all, 10));
        const sanId = (viewerSnap?.data() as { sanId?: string } | undefined)?.sanId;
        if (sanId) setViewerSanId(sanId);
      } catch {
        // Fail-open: the wall below shows its warm empty state.
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [providerUid, viewerUid]);

  // Avoid flashing the empty state while the fetch is in flight.
  if (!loaded) return null;

  const wallLang: WallLang = toWallLang(lang);
  return <GratitudeWall posts={posts} lang={wallLang} viewerSanId={viewerSanId} />;
};
