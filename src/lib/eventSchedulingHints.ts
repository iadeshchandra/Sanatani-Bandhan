/**
 * eventSchedulingHints.ts — Panchang-smart scheduling (EVENTS P2).
 * =====================================================================
 * When an organiser picks a date for an event, the app already knows
 * a great deal about that day: the canonical Panchang engine gives
 * the tithi and the Abhijit muhurat window, and the Panjika knows
 * whether a major festival falls on it. This module surfaces those
 * facts as SUGGESTIONS beside the date field.
 *
 * The law: the organiser always decides. Nothing here sets, moves or
 * blocks a time — it only informs ("this day is Ekadashi — expect a
 * fasting crowd"; "Abhijit muhurat 11:19 AM – 12:04 PM"). The engine
 * is the same one the home header and Panjika use (Varanasi/IST
 * canonical place), so the suggestion can never contradict them.
 */
import { calculatePanchang } from '../utils/panchang';
import { festivalsOn, type PanjikaFestival } from './panjikaFestivals';

export interface SchedulingHints {
  dateISO: string;
  /** Engine tithi line, e.g. "Shukla Paksha Ekadashi". */
  tithi: string;
  paksha: 'Shukla' | 'Krishna' | '';
  /** Abhijit muhurat window as the engine prints it, e.g. "11:19 AM – 12:04 PM". */
  abhijit: string;
  /** Panjika festivals on this date (may be empty). */
  festivals: { name: string; category: string }[];
  isFestivalDay: boolean;
  /** True when the tithi is Ekadashi — the classic fasting-crowd note. */
  isEkadashi: boolean;
}

/** Hints for one civil date; null when the date string is unusable. */
export function schedulingHintsFor(dateISO: string): SchedulingHints | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((dateISO || '').trim());
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  let tithi = '';
  let paksha: SchedulingHints['paksha'] = '';
  let abhijit = '';
  try {
    const p = calculatePanchang(new Date(y, mo - 1, d, 12, 0, 0, 0));
    tithi = p.tithi || '';
    paksha = (p.paksha as SchedulingHints['paksha']) || '';
    abhijit = p.abhijitMuhurat || '';
  } catch {
    /* engine unavailable for this date — the festival facts still stand */
  }
  const fests: PanjikaFestival[] = festivalsOn(dateISO);
  return {
    dateISO,
    tithi,
    paksha,
    abhijit,
    festivals: fests.map((f) => ({ name: f.nameEn, category: f.category })),
    isFestivalDay: fests.length > 0,
    isEkadashi: /ekadashi/i.test(tithi),
  };
}
