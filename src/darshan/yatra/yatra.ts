/**
 * darshan/yatra/yatra.ts — build an ordered yatra from live streams.
 * ============================================================================
 * Pure functions. Given live temples (from orgLiveStatus) and optional
 * collection focus, produce ordered YatraStops.
 */
import type { LiveStreamItem } from '../../sangam/watch/types';
import { matchTirtha, type YatraLang, type YatraStop } from './types';
import {
  TIRTHA_MATCH_TOKENS,
  YATRA_COLLECTIONS,
  collectionsForTirtha,
  stopDisplayName,
} from './collections';

/**
 * Build ordered yatra stops from live streams.
 * - When collectionId is given, matching stops come first in canonical
 *   order; non-matching stops follow (newest stream first).
 * - Otherwise, order by stream start (newest first), fallback orgId.
 */
export function buildYatra(
  live: LiveStreamItem[],
  collectionId?: string,
): YatraStop[] {
  const stops: YatraStop[] = live.map((s) => {
    const tirthaId = matchTirtha(s.templeName, TIRTHA_MATCH_TOKENS) ?? undefined;
    return {
      orgId: s.orgId || s.videoId || s.templeName,
      templeName: s.templeName,
      videoId: s.videoId,
      title: s.title,
      startedAt: s.startedAt,
      tirthaId,
      collectionIds: tirthaId ? collectionsForTirtha(tirthaId) : [],
      displayName: stopDisplayName(s.templeName, tirthaId),
    };
  });

  const collection = collectionId
    ? YATRA_COLLECTIONS.find((c) => c.id === collectionId)
    : undefined;

  if (!collection) {
    return [...stops].sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0) || a.orgId.localeCompare(b.orgId));
  }

  const rank = new Map(collection.order.map((id, i) => [id, i]));
  const inCircuit = stops.filter((s) => s.tirthaId && rank.has(s.tirthaId));
  const rest = stops.filter((s) => !s.tirthaId || !rank.has(s.tirthaId));
  inCircuit.sort((a, b) => (rank.get(a.tirthaId!) ?? 999) - (rank.get(b.tirthaId!) ?? 999));
  rest.sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0) || a.orgId.localeCompare(b.orgId));
  return [...inCircuit, ...rest];
}

/**
 * Which curated collections have ≥1 live stop? (for the collection picker)
 * Returns collection ids ordered by live-stop count desc.
 */
export function liveCollections(stops: YatraStop[]): string[] {
  const counts = new Map<string, number>();
  for (const s of stops) {
    for (const c of s.collectionIds) counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
}

/** Human stop counter: "Stop 3 of 7". */
export function stopCounterText(index: number, total: number, lang: YatraLang): string {
  const n = index + 1;
  if (lang === 'hi') return `पड़ाव ${n} / ${total}`;
  if (lang === 'bn') return `থামা ${n} / ${total}`;
  return `Stop ${n} of ${total}`;
}
