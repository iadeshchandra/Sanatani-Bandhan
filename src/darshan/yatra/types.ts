/**
 * darshan/yatra/types.ts — Darshan Yatra data models + pure logic.
 * ============================================================================
 * "Only we can do this": swipe between ALL live temples in one yatra.
 * YouTube is the free backbone — we never host streams.
 *
 * All ordering/matching/festival logic is pure and fully tested.
 * Firestore reads live in yatraService.ts; never imported here.
 */
import type { LiveStreamItem } from '../../sangam/watch/types';

export type YatraLang = 'en' | 'hi' | 'bn';

/** One stop on the yatra: a live temple. */
export interface YatraStop {
  orgId: string;
  templeName: string;
  videoId: string | null;
  title?: string;
  startedAt?: number;
  /** Matched curated tirtha id (e.g. 'somnath'), if any. */
  tirthaId?: string;
  /** Curated collection ids this stop belongs to. */
  collectionIds: string[];
  /** Display name — curated translation when matched, else templeName. */
  displayName: Record<YatraLang, string>;
}

/** A curated pilgrimage circuit. */
export interface YatraCollection {
  id: string;
  /** Canonical stop order (tirtha ids). */
  order: string[];
  name: Record<YatraLang, string>;
}

/** Minimum live temples before the yatra is suggested. */
export const YATRA_MIN_LIVE = 2;

/** True when a yatra is worth offering. */
export function shouldSuggestYatra(liveCount: number): boolean {
  return liveCount >= YATRA_MIN_LIVE;
}

/** Swipe helpers — wrap around at the ends. Pure. */
export function nextStopIndex(current: number, total: number): number {
  if (total <= 0) return 0;
  return (current + 1) % total;
}
export function prevStopIndex(current: number, total: number): number {
  if (total <= 0) return 0;
  return (current - 1 + total) % total;
}

/** Clamp an index into range (for jump-to-chip). */
export function clampStopIndex(i: number, total: number): number {
  if (total <= 0) return 0;
  if (i < 0) return 0;
  if (i >= total) return total - 1;
  return i;
}

/** Counter text for the yatra stop viewer — numeric, language-neutral. */
export function stopCounterText(index: number, total: number, _lang: string): string {
  if (total <= 0) return '';
  return `${clampStopIndex(index, total) + 1} / ${total}`;
}

/** Normalize a temple name for fuzzy matching. */
export function normalizeTempleName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\u0980-\u09ff\u0900-\u097f]/g, '');
}

/**
 * Match a live temple's free-text name to a curated tirtha id.
 * matchTokens: tirthaId -> tokens (any language, pre-normalized).
 */
export function matchTirtha(
  templeName: string,
  matchTokens: Record<string, string[]>,
): string | null {
  const norm = normalizeTempleName(templeName);
  if (!norm) return null;
  let best: { id: string; len: number } | null = null;
  for (const [id, tokens] of Object.entries(matchTokens)) {
    for (const raw of tokens) {
      const t = normalizeTempleName(raw);
      if (t.length < 4) continue;
      if (norm.includes(t) && (!best || t.length > best.len)) {
        best = { id, len: t.length };
      }
    }
  }
  return best?.id ?? null;
}

export type { LiveStreamItem };
