/**
 * panjikaMonth.ts — VIBE B2: the pure month-grid builder behind
 * PanjikaMonthGrid (org Panchang desk + Solo PanjikaTab share it).
 * =====================================================================
 * Every sacred fact in a cell comes from the ONE canonical engine —
 * `calculatePanchang` (utils/panchang, Varanasi/IST house place, the
 * same values the home header and every today-line surface show) —
 * and festival marks come from the Panjika festival DB
 * (lib/panjikaFestivals). Nothing is approximated locally: a cell's
 * tithi is the engine's tithi for that civil day (computed at local
 * noon, safely inside the day the header's sunrise-anchored reading
 * describes).
 *
 * Performance law (floor-proof): the builder is a pure function the
 * component memoises per (year, month) — one pass of ≤31 engine calls
 * per month shown, never per render, never per cell. The engine call
 * is the same one the header makes daily; a month pass measured in
 * NOTES stays in the tens of milliseconds on desktop hardware and is
 * paid once per month navigation, not per frame.
 */
import { calculatePanchang } from '../utils/panchang';
import { festivalsOn, type PanjikaFestival } from './panjikaFestivals';

export interface PanjikaMonthDay {
  /** Gregorian ISO date, YYYY-MM-DD. */
  iso: string;
  /** Day of month, 1–31. */
  dayOfMonth: number;
  /** Engine tithi name without paksha, e.g. "Trayodashi", "Purnima". */
  tithiName: string;
  /** Full engine tithi line, e.g. "Shukla Trayodashi". */
  tithiFull: string;
  paksha: 'Shukla' | 'Krishna' | '';
  nakshatra: string;
  /** The engine's Abhijit window for the day ("" when unavailable). */
  abhijit: string;
  /** Festivals the DB lists on this exact date (possibly empty). */
  festivals: PanjikaFestival[];
  isToday: boolean;
}

function isoOf(y: number, m: number, d: number): string {
  const mm = String(m + 1).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

/** Split the engine's "Shukla Trayodashi" into paksha + short name. */
export function splitTithi(tithi: string, paksha?: string): { tithiName: string; paksha: 'Shukla' | 'Krishna' | '' } {
  const words = (tithi || '').trim().split(/\s+/).filter(Boolean);
  const name = words.length > 1 ? words.slice(1).join(' ') : words[0] || '';
  const pk = paksha === 'Shukla' || paksha === 'Krishna'
    ? paksha
    : words[0] === 'Shukla' || words[0] === 'Krishna'
      ? (words[0] as 'Shukla' | 'Krishna')
      : '';
  return { tithiName: name, paksha: pk };
}

/**
 * Build one month: 42 cells (6 Sunday-start weeks), nulls outside the
 * month. `todayIso` is injectable for tests; defaults to the real today.
 */
export function buildPanjikaMonth(
  year: number,
  month: number, // 0-based
  todayIso?: string,
): Array<PanjikaMonthDay | null> {
  const today = todayIso ?? isoOf(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate(),
  );
  const firstWeekday = new Date(year, month, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<PanjikaMonthDay | null> = [];

  for (let i = 0; i < firstWeekday; i++) cells.push(null);

  for (let d = 1; d <= daysInMonth; d++) {
    const iso = isoOf(year, month, d);
    let tithiFull = '';
    let tithiName = '';
    let paksha: 'Shukla' | 'Krishna' | '' = '';
    let nakshatra = '';
    let abhijit = '';
    try {
      const p = calculatePanchang(new Date(year, month, d, 12, 0, 0));
      tithiFull = (p.tithi || '').trim();
      const split = splitTithi(tithiFull, p.paksha);
      tithiName = split.tithiName;
      paksha = split.paksha;
      nakshatra = p.nakshatra || '';
      abhijit = (p.abhijitMuhurat || '').trim();
    } catch {
      /* Engine could not answer for this day — the cell still shows the
       * date and its DB festivals; no tithi is invented to fill it. */
    }
    cells.push({
      iso,
      dayOfMonth: d,
      tithiName,
      tithiFull,
      paksha,
      nakshatra,
      abhijit,
      festivals: festivalsOn(iso),
      isToday: iso === today,
    });
  }

  while (cells.length < 42) cells.push(null);
  return cells;
}
