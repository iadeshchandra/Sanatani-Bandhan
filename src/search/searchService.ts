/**
 * search/searchService.ts — Universal Search data layer.
 * ============================================================================
 * $0, client-side, offline-tolerant: fetches bounded windows (≤50 docs per
 * category) and filters/ranks in memory. No Algolia, no new indexes, no
 * new Firestore fields — works against existing collections as they are.
 *
 * Privacy note: `users/` docs are self-read-only by rules, so people search
 * uses denormalized author data from public sangamPosts (only people who
 * chose to post publicly are discoverable). No privilege escalation.
 */

import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  bestMatchScore,
  rankResults,
  type GroupedResults,
  type SearchResult,
} from './types';

const WINDOW = 50;

/* ------------------------------------------------------------------ */
/* Lightweight doc coercion — only the fields search needs.            */
/* ------------------------------------------------------------------ */

const str = (v: unknown, fb = ''): string =>
  typeof v === 'string' ? v : fb;
const num = (v: unknown, fb = 0): number =>
  typeof v === 'number' ? v : fb;
const bool = (v: unknown): boolean => v === true;

interface RawDoc {
  id: string;
  d: Record<string, unknown>;
}

async function fetchWindow(
  col: string,
  orderField = 'createdAt',
  max = WINDOW,
): Promise<RawDoc[]> {
  try {
    const q = query(collection(db, col), orderBy(orderField, 'desc'), limit(max));
    const snap = await getDocs(q);
    return snap.docs.map((doc) => ({ id: doc.id, d: doc.data() as Record<string, unknown> }));
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* Category builders — each returns ranked SearchResults.               */
/* ------------------------------------------------------------------ */

function buildTempleResults(docs: RawDoc[], q: string): SearchResult[] {
  const out: SearchResult[] = [];
  for (const { id, d } of docs) {
    const name = str(d.name);
    if (!name) continue;
    const score = bestMatchScore(q, [name, str(d.city), str(d.type), str(d.tagline)]);
    if (score < 0) continue;
    const verified = bool(d.verified);
    out.push({
      id,
      category: 'temples',
      title: name,
      subtitle: [str(d.city), str(d.type)].filter(Boolean).join(' · ') || undefined,
      imageUrl: str(d.logoUrl) || undefined,
      // Verified orgs get a relevance boost — trust first.
      score: score + (verified ? 150 : 0),
      path: `/org/${str(d.orgId) || id}`,
      verified,
    });
  }
  return rankResults(out);
}

function buildPeopleResults(docs: RawDoc[], q: string): SearchResult[] {
  // Dedupe authors across posts — one entry per person.
  const seen = new Map<string, RawDoc>();
  for (const doc of docs) {
    const uid = str(doc.d.authorUid);
    if (uid && !seen.has(uid)) seen.set(uid, doc);
  }
  const out: SearchResult[] = [];
  for (const { d } of seen.values()) {
    const name = str(d.authorName);
    if (!name) continue;
    const score = bestMatchScore(q, [name, str(d.authorSanId)]);
    if (score < 0) continue;
    out.push({
      id: str(d.authorUid),
      category: 'people',
      title: name,
      subtitle: str(d.authorSanId) || undefined,
      score,
      // People open in chat — the natural destination for a person result.
      path: `/app/chat?with=${encodeURIComponent(str(d.authorUid))}`,
    });
  }
  return rankResults(out);
}

function buildPostResults(docs: RawDoc[], q: string): SearchResult[] {
  const out: SearchResult[] = [];
  for (const { id, d } of docs) {
    if (d.kind === 'service_card') continue; // services have their own group
    const text = str(d.text);
    if (!text) continue;
    const score = bestMatchScore(q, [text, str(d.authorName)]);
    if (score < 0) continue;
    out.push({
      id,
      category: 'posts',
      title: text.length > 90 ? text.slice(0, 90) + '…' : text,
      subtitle: str(d.authorName) || undefined,
      imageUrl: str(d.imageUrl).startsWith('http') ? str(d.imageUrl) : undefined,
      score,
      path: `/app/sangam?post=${encodeURIComponent(id)}`,
    });
  }
  return rankResults(out);
}

function buildVideoResults(docs: RawDoc[], q: string): SearchResult[] {
  const out: SearchResult[] = [];
  for (const { id, d } of docs) {
    const title = str(d.title);
    if (!title) continue;
    const score = bestMatchScore(q, [title, str(d.caption), str(d.sharedByName)]);
    if (score < 0) continue;
    out.push({
      id,
      category: 'videos',
      title,
      subtitle: str(d.sharedByName) || undefined,
      imageUrl: str(d.thumbnailUrl) || undefined,
      score,
      path: `/app/sangam/watch?video=${encodeURIComponent(id)}`,
    });
  }
  return rankResults(out);
}

function buildShortResults(docs: RawDoc[], q: string): SearchResult[] {
  const out: SearchResult[] = [];
  for (const { id, d } of docs) {
    const title = str(d.title);
    if (!title) continue;
    const score = bestMatchScore(q, [title, str(d.caption), str(d.authorName)]);
    if (score < 0) continue;
    out.push({
      id,
      category: 'shorts',
      title,
      subtitle: str(d.authorName) || undefined,
      imageUrl: str(d.thumbnailUrl) || undefined,
      score,
      path: `/shorts/${encodeURIComponent(id)}`,
    });
  }
  return rankResults(out);
}

function buildServiceResults(docs: RawDoc[], q: string): SearchResult[] {
  const out: SearchResult[] = [];
  for (const { id, d } of docs) {
    if (d.kind !== 'service_card') continue;
    const card = (d.serviceCard || {}) as Record<string, unknown>;
    const serviceLine = str(card.serviceLine);
    if (!serviceLine && !str(d.text)) continue;
    const score = bestMatchScore(q, [
      serviceLine,
      str(card.devotionalText),
      str(card.providerName),
      str(d.text),
    ]);
    if (score < 0) continue;
    const tier = str(card.providerTier);
    const verified = tier === 'TRUSTED' || tier === 'VERIFIED';
    out.push({
      id,
      category: 'services',
      title: serviceLine || str(d.text).slice(0, 90),
      subtitle: [str(card.providerName), tier].filter(Boolean).join(' · ') || undefined,
      score: score + (verified ? 100 : 0),
      path: `/app/sangam?post=${encodeURIComponent(id)}`,
      verified,
    });
  }
  return rankResults(out);
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Run a full universal search. Returns grouped results (only non-empty
 * groups). All queries are bounded; failures degrade to empty groups —
 * search never crashes the app.
 */
export async function universalSearch(query: string): Promise<GroupedResults> {
  const q = (query || '').trim();
  if (q.length < 2) return {};

  const [orgPages, posts, videos, shorts] = await Promise.all([
    fetchWindow('orgPages'),
    fetchWindow('sangamPosts'),
    fetchWindow('sangamVideos'),
    fetchWindow('sangamShorts'),
  ]);

  const grouped: GroupedResults = {};
  const temples = buildTempleResults(orgPages, q);
  const people = buildPeopleResults(posts, q);
  const postList = buildPostResults(posts, q);
  const videoList = buildVideoResults(videos, q);
  const shortList = buildShortResults(shorts, q);
  const serviceList = buildServiceResults(posts, q);

  if (temples.length) grouped.temples = temples;
  if (people.length) grouped.people = people;
  if (postList.length) grouped.posts = postList;
  if (videoList.length) grouped.videos = videoList;
  if (shortList.length) grouped.shorts = shortList;
  if (serviceList.length) grouped.services = serviceList;
  return grouped;
}

/**
 * Trending: top-Ashirvad posts from the recent window — for the empty state.
 */
export async function trendingPosts(max = 5): Promise<SearchResult[]> {
  const posts = await fetchWindow('sangamPosts');
  return posts
    .filter(({ d }) => d.kind !== 'service_card' && str(d.text))
    .map(({ id, d }) => ({
      id,
      category: 'posts' as const,
      title: (str(d.text).length > 90 ? str(d.text).slice(0, 90) + '…' : str(d.text)),
      subtitle: str(d.authorName) || undefined,
      score: num(d.ashirvadCount),
      path: `/app/sangam?post=${encodeURIComponent(id)}`,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, max);
}
