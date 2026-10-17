/**
 * notifications/festivalAwareness.ts — Panjika-aware notification behaviour.
 * ========================================================================
 * PHASE 4 — Notification intelligence layer.
 *
 * During major festivals the notification system softens and celebrates:
 *   - blessing-kind items get a priority boost: still gentle, but surfaced
 *     FIRST in the Suchana digest (blessings before bills during Diwali).
 *   - transactional batching tightens: the grouping window shrinks from
 *     2 hours to 30 minutes, so festival-time updates stay fresh without
 *     spamming.
 *
 * Dates come from the verified Panjika festival database
 * (src/lib/panjikaFestivals.ts, 2026–2028 research-backed). The ±3-day
 * window honours the festive season, not just the single day.
 *
 * All functions accept an injected `now` and festival list so tests stay
 * deterministic — never call `new Date()` inside the matching logic.
 */

import { PANJIKA_FESTIVALS, type PanjikaFestival } from '../lib/panjikaFestivals';

/** Days before/after a major festival the festive mood applies. */
export const FESTIVAL_WINDOW_DAYS = 3;
/** Normal transactional grouping window, in minutes. */
export const BATCHING_WINDOW_NORMAL_MIN = 120;
/** Tightened grouping window during festivals, in minutes. */
export const BATCHING_WINDOW_FESTIVAL_MIN = 30;

interface MajorFestival {
  /** Stable key, e.g. 'diwali'. */
  key: string;
  /** Display name shown in the digest header. */
  label: string;
  /** Lowercase substrings matched against the festival's nameEn. */
  patterns: string[];
}

/** The festivals big enough to change notification behaviour. */
export const MAJOR_FESTIVALS: MajorFestival[] = [
  { key: 'diwali', label: 'Diwali / Deepavali', patterns: ['diwali', 'deepavali', 'kali puja'] },
  {
    key: 'durga_puja',
    label: 'Durga Puja',
    patterns: [
      'durga puja',
      'maha shashthi',
      'maha saptami',
      'maha ashtami',
      'maha navami',
      'mahalaya',
      'bijoya dashami',
      'vijaya dashami',
      'dussehra',
      'dasara',
      'navratri',
    ],
  },
  { key: 'holi', label: 'Holi', patterns: ['holi', 'dol purnima'] },
  { key: 'janmashtami', label: 'Janmashtami', patterns: ['janmashtami'] },
  { key: 'rath_yatra', label: 'Rath Yatra', patterns: ['rath yatra'] },
  { key: 'chhath', label: 'Chhath', patterns: ['chhath'] },
];

/** Local-date ISO (YYYY-MM-DD) — avoids UTC off-by-one at midnight. */
export function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Whole days between two ISO dates (a − b). Positive when a is later. */
function daysBetween(aISO: string, bISO: string): number {
  const a = Date.parse(`${aISO}T00:00:00Z`);
  const b = Date.parse(`${bISO}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.POSITIVE_INFINITY;
  return Math.round((a - b) / 86_400_000);
}

function matchMajor(festival: PanjikaFestival): MajorFestival | null {
  const name = festival.nameEn.toLowerCase();
  return MAJOR_FESTIVALS.find((m) => m.patterns.some((p) => name.includes(p))) ?? null;
}

export interface FestivalPeriod {
  active: boolean;
  /** Display name of the nearest major festival, e.g. 'Diwali / Deepavali'. */
  festival?: string;
  /** Stable key of the nearest major festival, e.g. 'diwali'. */
  festivalKey?: string;
  /** Whole days until the festival (0 = today, negative = days since). */
  daysUntil?: number;
}

/**
 * Is `now` inside a major festival's ±3-day window?
 * Returns the NEAREST matching festival when several overlap.
 */
export function isFestivalPeriod(
  now: Date = new Date(),
  list: PanjikaFestival[] = PANJIKA_FESTIVALS,
): FestivalPeriod {
  const today = localISO(now);
  let best: FestivalPeriod | null = null;
  for (const f of list) {
    const major = matchMajor(f);
    if (!major) continue;
    const delta = daysBetween(f.date, today);
    if (Math.abs(delta) > FESTIVAL_WINDOW_DAYS) continue;
    if (!best || Math.abs(delta) < Math.abs(best.daysUntil ?? Infinity)) {
      best = {
        active: true,
        festival: major.label,
        festivalKey: major.key,
        daysUntil: delta,
      };
    }
  }
  return best ?? { active: false };
}

/**
 * Transactional grouping window in minutes. Festivals tighten it
 * (120 → 30) so festival-time updates stay fresh without spamming.
 */
export function getBatchingWindow(now: Date = new Date(), list: PanjikaFestival[] = PANJIKA_FESTIVALS): number {
  return isFestivalPeriod(now, list).active ? BATCHING_WINDOW_FESTIVAL_MIN : BATCHING_WINDOW_NORMAL_MIN;
}

/**
 * Should blessing-kind items be surfaced FIRST in the Suchana digest?
 * Blessing-kind stays GENTLE (never interrupts) — it simply leads the
 * digest during festivals. Blessings before bills during Diwali. 🪔
 */
export function blessingDigestBoost(now: Date = new Date(), list: PanjikaFestival[] = PANJIKA_FESTIVALS): boolean {
  return isFestivalPeriod(now, list).active;
}

/**
 * One-call summary for the NotificationCenter / digest builder.
 */
export function festivalAwareness(
  now: Date = new Date(),
  list: PanjikaFestival[] = PANJIKA_FESTIVALS,
): FestivalPeriod & { batchingWindowMinutes: number; blessingBoost: boolean } {
  const period = isFestivalPeriod(now, list);
  return {
    ...period,
    batchingWindowMinutes: getBatchingWindow(now, list),
    blessingBoost: period.active,
  };
}
