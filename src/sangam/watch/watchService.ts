/**
 * sangam/watch/watchService.ts — Firestore CRUD for Sangam Watch.
 * ============================================================================
 * Collection: sangamVideos/{videoId}
 *   read:   public (a shared video is community content)
 *   create: any logged-in user, schema-pinned
 *   delete: author or superadmin (no edits — delete + re-share)
 *
 * Live streams are NOT duplicated here — the Live Now rail reads directly
 * from orgLiveStatus (the darshan module's cache).
 */
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  increment,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { fileModerationReport } from '../moderation';
import {
  sanitizeVideo,
  youtubeThumbnail,
  type WatchVideo,
  type WatchVideoCategory,
  type LiveStreamItem,
} from './types';

const COL = 'sangamVideos';

function toWatchVideo(id: string, data: Record<string, unknown>): WatchVideo {
  return {
    id,
    youtubeId: String(data.youtubeId || ''),
    title: String(data.title || ''),
    thumbnailUrl: String(data.thumbnailUrl || ''),
    duration: (data.duration as string) || undefined,
    sharedBy: String(data.sharedBy || ''),
    sharedByName: String(data.sharedByName || ''),
    sharedBySanId: (data.sharedBySanId as string) || undefined,
    caption: (data.caption as string) || undefined,
    category: (data.category as WatchVideoCategory) || 'shared',
    providerUid: (data.providerUid as string) || undefined,
    providerTier: (data.providerTier as string) || undefined,
    createdAt: Number(data.createdAt || 0),
    reportCount: Number(data.reportCount || 0),
  };
}

/** Share a video. Returns the new document id. */
export async function shareVideo(input: {
  youtubeId: string;
  title: string;
  caption?: string;
  sharedBy: string;
  sharedByName: string;
  sharedBySanId?: string;
  category: WatchVideoCategory;
  providerUid?: string;
  providerTier?: string;
}): Promise<string> {
  const clean = sanitizeVideo(input);
  const id = `vid_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  await setDoc(doc(db, COL, id), {
    ...clean,
    thumbnailUrl: youtubeThumbnail(clean.youtubeId),
    createdAt: Date.now(),
    reportCount: 0,
    serverCreatedAt: serverTimestamp(),
  });
  return id;
}

/** List videos by category, newest first. */
export async function listVideos(
  category: WatchVideoCategory,
  max = 50,
): Promise<WatchVideo[]> {
  const q = query(
    collection(db, COL),
    where('category', '==', category),
    orderBy('createdAt', 'desc'),
    limit(max),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toWatchVideo(d.id, d.data()));
}

/** Realtime subscription to a category feed. */
export function subscribeVideos(
  category: WatchVideoCategory,
  cb: (videos: WatchVideo[]) => void,
  max = 50,
): Unsubscribe {
  const q = query(
    collection(db, COL),
    where('category', '==', category),
    orderBy('createdAt', 'desc'),
    limit(max),
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => toWatchVideo(d.id, d.data()))),
    () => cb([]),
  );
}

/**
 * Report a video for moderator review.
 * AUDIT FIX #9: was a bare `reportCount` counter no one actioned. Now the
 * counter still marks the video, AND a real report lands in the
 * `sangamReports` moderation queue (GodMode → Moderation).
 */
export async function reportVideo(
  videoId: string,
  reporter?: { uid: string; name: string },
  reason: 'spam' | 'impersonation' | 'inappropriate' | 'misinformation' | 'other' = 'inappropriate',
): Promise<void> {
  await updateDoc(doc(db, COL, videoId), { reportCount: increment(1) });
  if (reporter?.uid) {
    await fileModerationReport(reporter, 'video', videoId, reason);
  }
}

/** Delete a video (author or admin — enforced by rules). */
export async function deleteVideo(videoId: string): Promise<void> {
  await deleteDoc(doc(db, COL, videoId));
}

/**
 * Aggregate currently-live temple streams for the Live Now rail.
 * Reads orgLiveStatus docs where isLive == true. Bounded read.
 */
export async function getLiveStreams(max = 20): Promise<LiveStreamItem[]> {
  const q = query(collection(db, 'orgLiveStatus'), where('isLive', '==', true), limit(max));
  const snap = await getDocs(q);
  const items: LiveStreamItem[] = [];
  for (const d of snap.docs) {
    const data = d.data() as { videoId?: string; title?: string; startedAt?: number };
    // Temple name: prefer a stored name, fall back to the org id.
    items.push({
      kind: 'temple',
      orgId: d.id,
      templeName: (data as { templeName?: string }).templeName || d.id,
      videoId: data.videoId || null,
      title: data.title,
      startedAt: data.startedAt,
    });
  }
  return items;
}

/** Realtime subscription to live streams. */
export function subscribeLiveStreams(cb: (items: LiveStreamItem[]) => void): Unsubscribe {
  const q = query(collection(db, 'orgLiveStatus'), where('isLive', '==', true), limit(20));
  return onSnapshot(
    q,
    (snap) => {
      cb(
        snap.docs.map((d) => {
          const data = d.data() as { videoId?: string; title?: string; startedAt?: number; templeName?: string };
          return {
            kind: 'temple' as const,
            orgId: d.id,
            templeName: data.templeName || d.id,
            videoId: data.videoId || null,
            title: data.title,
            startedAt: data.startedAt,
          };
        }),
      );
    },
    () => cb([]),
  );
}
