/**
 * panjikaFestivals.ts — Curated Bengali/Hindu festival database.
 * =====================================================================
 * REAL dates verified by web research (2026–2028). Each entry carries its
 * source. Computed entries (Ekadashi) are generated at runtime from the
 * tithi engine, not hardcoded here.
 *
 * Categories: 'puja' | 'festival' | 'fasting' | 'holiday' | 'samskara'
 * Variant: 'bd' | 'wb' | 'both' — which calendar tradition the date follows.
 */
import { FESTIVAL_DATA } from './panjikaFestivalData';

export type FestivalCategory = 'puja' | 'festival' | 'fasting' | 'holiday' | 'samskara';
export type FestivalVariant = 'bd' | 'wb' | 'both';

export interface PanjikaFestival {
  /** Gregorian date ISO (YYYY-MM-DD) */
  date: string;
  nameEn: string;
  nameBn: string;
  nameHi?: string;
  significanceEn: string;
  significanceBn: string;
  category: FestivalCategory;
  variant: FestivalVariant;
  /** Calendar tradition ids this festival belongs to (e.g. ['bengali_bd','bengali_wb','vikram']) */
  regions: string[];
  /** 'verified' = confirmed by ≥2 sources; 'single' = one source; 'computed' = derived */
  confidence: 'verified' | 'single' | 'computed';
  source?: string;
  /** Where traditional schools diverge, show both — never silently pick. */
  altDate?: string;
  altLabel?: string;
  schoolNote?: string;
}

/**
 * FESTIVAL DATABASE — verified research (2026–2028).
 * See panjikaFestivalData.ts for the full curated list with sources.
 */
export const PANJIKA_FESTIVALS: PanjikaFestival[] = FESTIVAL_DATA;

/** Festivals on a given ISO date. */
export function festivalsOn(iso: string, list: PanjikaFestival[] = PANJIKA_FESTIVALS): PanjikaFestival[] {
  return list.filter((f) => f.date === iso);
}

/** Upcoming festivals from a date, sorted. */
export function upcomingFestivals(
  fromIso: string,
  limit = 20,
  list: PanjikaFestival[] = PANJIKA_FESTIVALS
): PanjikaFestival[] {
  return list
    .filter((f) => f.date >= fromIso)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit);
}

/** Festivals within a Gregorian month (for the calendar grid). */
export function festivalsInMonth(
  year: number,
  month: number, // 1..12
  list: PanjikaFestival[] = PANJIKA_FESTIVALS
): Map<string, PanjikaFestival[]> {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const map = new Map<string, PanjikaFestival[]>();
  for (const f of list) {
    if (f.date.startsWith(prefix)) {
      const arr = map.get(f.date) || [];
      arr.push(f);
      map.set(f.date, arr);
    }
  }
  return map;
}

const CATEGORY_META: Record<FestivalCategory, { en: string; bn: string; dot: string }> = {
  puja: { en: 'Puja', bn: 'পূজা', dot: 'bg-red-500' },
  festival: { en: 'Festival', bn: 'উৎসব', dot: 'bg-amber-500' },
  fasting: { en: 'Fasting', bn: 'উপবাস', dot: 'bg-sky-500' },
  holiday: { en: 'Holiday', bn: 'ছুটি', dot: 'bg-stone-400' },
  samskara: { en: 'Samskara', bn: 'সংস্কার', dot: 'bg-emerald-500' },
};

export function categoryMeta(c: FestivalCategory) {
  return CATEGORY_META[c];
}
