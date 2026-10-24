/**
 * festivalDressing.ts — the panchang-aware living skin resolver (VIBE B1).
 * =====================================================================
 * Design law: Design North-Star — "A temple that opens for you." The app
 * dresses for the calendar: gold-deepened through Diwali, peacock at
 * Janmashtami, white-and-gold calm at Saraswati Puja, and the plain warm
 * 'courtyard' on every other day.
 *
 * SINGLE SOURCE: the festival database (lib/panjikaFestivals.ts). The
 * dressing for a date is decided ONLY by the festivals the DB itself
 * lists on that exact date — no invented dates, no hand-kept calendar
 * of "dressing windows" that could drift from the Panjika. Multi-day
 * festivals appear in the DB as one entry per day (e.g. Dhanteras,
 * Choti Diwali, Diwali across Nov 6–8 2026), so the dressing naturally
 * spans exactly the days the DB spans.
 *
 * Pure + deterministic: same input, same dressing, on every device.
 */
import { festivalsOn, type PanjikaFestival } from './panjikaFestivals';

export type FestivalDressingKey = 'courtyard' | 'diwali' | 'janmashtami' | 'saraswati';

export interface FestivalDressing {
  /** The dressing the home header wears today. */
  key: FestivalDressingKey;
  /**
   * The festival the greeting leads with, or null. National 'holiday'
   * entries (Independence Day, Gandhi Jayanti…) are real DB entries but
   * are NOT sacred lead festivals, so they never lead the greeting and
   * never dress the skin.
   */
  festival: PanjikaFestival | null;
}

/**
 * Dressing rules, in priority order (first match wins). Matched against
 * the DB's own English festival names. The Diwali family is the Diwali
 * cluster of the DB itself: Dhanteras opens it, Kali Puja shares its
 * night (Kartik Amavasya), Govardhan + Bhai Dooj/Phonta close it.
 * Kojagari Lakshmi Puja is deliberately NOT in this family — it is its
 * own night (Ashwin Purnima), a fortnight earlier.
 */
const DRESSING_RULES: ReadonlyArray<{
  key: Exclude<FestivalDressingKey, 'courtyard'>;
  pattern: RegExp;
}> = [
  {
    key: 'diwali',
    pattern: /(diwali|deepavali|dhanteras|kali puja|govardhan|bhai\s+(dooj|phonta))/i,
  },
  { key: 'janmashtami', pattern: /janmashtami/i },
  { key: 'saraswati', pattern: /saraswati/i },
];

/** Local-timezone YYYY-MM-DD (matches the ISO strings the DB stores). */
export function localISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Is this entry fit to lead a sacred greeting? (Not a civic holiday.) */
function isLeadFestival(f: PanjikaFestival): boolean {
  return f.category !== 'holiday';
}

/**
 * Resolve the dressing for an ISO date (YYYY-MM-DD).
 * Pass a custom list only in tests; production always reads the DB.
 */
export function festivalDressingOn(
  iso: string,
  list?: PanjikaFestival[]
): FestivalDressing {
  const todays = festivalsOn(iso, list).filter(isLeadFestival);
  for (const rule of DRESSING_RULES) {
    const hit = todays.find((f) => rule.pattern.test(f.nameEn));
    if (hit) return { key: rule.key, festival: hit };
  }
  return { key: 'courtyard', festival: todays[0] ?? null };
}

/** Convenience for "right now" callers (the home headers). */
export function festivalDressingToday(now: Date = new Date()): FestivalDressing {
  return festivalDressingOn(localISO(now));
}
