/**
 * sangam/festivalMoments.ts — Festival Moments rail (Phase 4).
 * ============================================================================
 * During major festivals, the Sangam feed gets a "🪔 Festival Moments"
 * rail: devotees share a photo + one-line blessing. Curated and
 * time-bound — appears 3 days before the festival, disappears 3 days
 * after. No competition: no like counts displayed, no "top posts."
 * Just a flowing river of shared joy.
 *
 * Moments live in sangamPosts (kind 'festival_moment', festival tag).
 * No new collection.
 */

import { PANJIKA_FESTIVALS, type PanjikaFestival } from '../lib/panjikaFestivals';

/** Major festivals that get a Moments rail (curated, not every entry). */
const MOMENTS_FESTIVALS = new Set([
  'diwali',
  'kali-puja',
  'durga-puja',
  'holi',
  'janmashtami',
  'maha-shivaratri',
  'rath-yatra',
  'ganesh-chaturthi',
  'makar-sankranti',
  'raksha-bandhan',
  'ram-navami',
  'navaratri',
]);

/** Stable slug from the English name (PanjikaFestival has no id field). */
export function festivalSlug(f: PanjikaFestival): string {
  return f.nameEn
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const WINDOW_MS = 3 * 24 * 60 * 60 * 1000; // ±3 days

export interface FestivalMomentWindow {
  festival: PanjikaFestival;
  startsAt: number;
  endsAt: number;
}

/**
 * Active festival-moment windows right now. Returns [] outside any window.
 * Pure function of (now, festival list) — fully testable.
 */
export function activeMomentWindows(
  now: number = Date.now(),
  festivals: PanjikaFestival[] = PANJIKA_FESTIVALS,
): FestivalMomentWindow[] {
  const out: FestivalMomentWindow[] = [];
  for (const f of festivals) {
    if (!MOMENTS_FESTIVALS.has(festivalSlug(f))) continue;
    const t = new Date(f.date + 'T00:00:00').getTime();
    if (Number.isNaN(t)) continue;
    if (now >= t - WINDOW_MS && now <= t + WINDOW_MS) {
      out.push({ festival: f, startsAt: t - WINDOW_MS, endsAt: t + WINDOW_MS });
    }
  }
  return out;
}

/** Validate a festival moment draft. */
export function validateMoment(draft: { blessing: string; festival: string }): string[] {
  const out: string[] = [];
  const b = draft.blessing.trim();
  if (b.length < 3) out.push('Share a one-line blessing with your moment.');
  if (b.length > 140) out.push('One line is enough — 140 characters of joy.');
  if (!draft.festival) out.push('Choose the festival for this moment.');
  return out;
}

/** Build the SangamPost fields for a festival moment. */
export function festivalMomentPost(input: {
  blessing: string;
  imageUrl?: string;
  festival: string;
  authorUid: string;
  authorName: string;
  authorSanId: string;
  createdAt: number;
}): Record<string, unknown> {
  return {
    authorUid: input.authorUid,
    authorName: input.authorName,
    authorSanId: input.authorSanId,
    authorKind: 'devotee',
    isOfficialPagePost: false,
    kind: 'festival_moment',
    text: `🪔 ${input.blessing.trim()}`,
    imageUrl: input.imageUrl || '',
    festival: input.festival,
    createdAt: input.createdAt,
    ashirvadCount: 0,
    commentCount: 0,
    shareCount: 0,
    visibility: 'public',
    status: 'active',
  };
}

/** Rail header copy. */
export function momentsRailTitle(festivalName: string, lang: 'en' | 'hi' | 'bn' = 'en'): string {
  if (lang === 'bn') return `🪔 ${festivalName} — উৎসবের মুহূর্ত`;
  if (lang === 'hi') return `🪔 ${festivalName} — उत्सव के पल`;
  return `🪔 ${festivalName} — Festival Moments`;
}
