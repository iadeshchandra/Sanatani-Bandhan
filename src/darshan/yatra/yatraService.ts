/**
 * darshan/yatra/yatraService.ts — live-temple subscription for yatra.
 * ============================================================================
 * Reads orgLiveStatus where isLive == true. Same query as the Watch tab's
 * Live Now rail (kept local so darshan/ never imports from sangam/).
 * Never throws into UI — errors yield an empty list.
 */
import { collection, getDocs, limit, onSnapshot, query, where, type Unsubscribe } from 'firebase/firestore';
import { db } from '../../firebase';
import type { LiveStreamItem } from '../../sangam/watch/types';

function toItem(id: string, data: Record<string, unknown>): LiveStreamItem {
  return {
    kind: 'temple' as const,
    orgId: id,
    templeName: (data.templeName as string) || id,
    videoId: (data.videoId as string) || null,
    title: data.title as string | undefined,
    startedAt: data.startedAt as number | undefined,
  };
}

/** One-shot fetch of currently-live temples. */
export async function getLiveTemples(max = 30): Promise<LiveStreamItem[]> {
  try {
    const q = query(collection(db, 'orgLiveStatus'), where('isLive', '==', true), limit(max));
    const snap = await getDocs(q);
    return snap.docs.map((d) => toItem(d.id, d.data() as Record<string, unknown>));
  } catch {
    return [];
  }
}

/** Realtime subscription to live temples. */
export function subscribeLiveTemples(cb: (items: LiveStreamItem[]) => void): Unsubscribe {
  try {
    const q = query(collection(db, 'orgLiveStatus'), where('isLive', '==', true), limit(30));
    return onSnapshot(
      q,
      (snap) => cb(snap.docs.map((d) => toItem(d.id, d.data() as Record<string, unknown>))),
      () => cb([]),
    );
  } catch {
    cb([]);
    return () => undefined;
  }
}
