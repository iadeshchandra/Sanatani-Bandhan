/**
 * bengaliCalendar.ts — Bengali (Bongabdo) calendar engine.
 * =====================================================================
 * Supports BOTH Bengali calendar variants with a user toggle:
 *
 *  - 'bd' — Bangladesh revised calendar (Bangla Academy, effective 2019):
 *    Pohela Boishakh = April 14. Fixed month lengths; Falgun gets 31 days
 *    in Gregorian leap years. Fully deterministic.
 *
 *  - 'wb' — West Bengal traditional sidereal-solar calendar: each month
 *    begins on the day of sankranti (sun's entry into the next sidereal
 *    rashi), computed with a Lahiri-ayanamsa solar-longitude model.
 *    Accurate to ±1 day vs printed panjikas (which use full ephemerides).
 *
 * Offline-first: pure computation, no network. Bengali numerals supported.
 */

export type BengaliVariant = 'bd' | 'wb';

export interface BengaliMonthDef {
  en: string;
  bn: string;
  hi: string;
}

export const BENGALI_MONTHS: BengaliMonthDef[] = [
  { en: 'Boishakh', bn: 'বৈশাখ', hi: 'बैशाख' },
  { en: 'Joishtho', bn: 'জ্যৈষ্ঠ', hi: 'ज्येष्ठ' },
  { en: 'Asharh', bn: 'আষাঢ়', hi: 'आषाढ़' },
  { en: 'Shrabon', bn: 'শ্রাবণ', hi: 'श्रावण' },
  { en: 'Bhadro', bn: 'ভাদ্র', hi: 'भाद्र' },
  { en: 'Ashwin', bn: 'আশ্বিন', hi: 'आश्विन' },
  { en: 'Kartik', bn: 'কার্তিক', hi: 'कार्तिक' },
  { en: 'Ogrohayon', bn: 'অগ্রহায়ণ', hi: 'अग्रहायण' },
  { en: 'Poush', bn: 'পৌষ', hi: 'पौष' },
  { en: 'Magh', bn: 'মাঘ', hi: 'माघ' },
  { en: 'Falgun', bn: 'ফাল্গুন', hi: 'फाल्गुन' },
  { en: 'Choitro', bn: 'চৈত্র', hi: 'चैत्र' },
];

export interface BengaliDate {
  year: number; // Bongabdo, e.g. 1433
  month: number; // 1..12 (1 = Boishakh)
  day: number; // 1..31
  monthEn: string;
  monthBn: string;
  monthHi: string;
  variant: BengaliVariant;
}

const BENGALI_DIGITS = '০১২৩৪৫৬৭৮৯';

/** Convert 0-9 digits in a string/number to Bengali numerals. */
export function toBengaliNumerals(n: number | string): string {
  return String(n).replace(/[0-9]/g, (d) => BENGALI_DIGITS[Number(d)]);
}

/** Format a Bengali date, e.g. "২৫ আশ্বিন ১৪৩৩" or "25 Ashwin 1433". */
export function formatBengaliDate(bd: BengaliDate, script: 'bn' | 'en' | 'hi' = 'bn'): string {
  if (script === 'bn') {
    return `${toBengaliNumerals(bd.day)} ${bd.monthBn} ${toBengaliNumerals(bd.year)}`;
  }
  if (script === 'hi') {
    return `${bd.day} ${bd.monthHi} ${bd.year}`;
  }
  return `${bd.day} ${bd.monthEn} ${bd.year}`;
}

/** Default variant from a geo/payment region: BD → Bangladesh, else West Bengal. */
export function variantForRegion(region: 'BD' | 'IN' | 'INTL'): BengaliVariant {
  return region === 'BD' ? 'bd' : 'wb';
}

/* ------------------------------------------------------------------ */
/* Bangladesh revised calendar (Bangla Academy, effective 2019)        */
/* ------------------------------------------------------------------ */
/* CORRECTED 2019 table (the brief initially carried pre-2019 values):
 * Boishakh 31, Joishtho 31, Asharh 31, Shrabon 31, Bhadro 31, Ashwin 31,
 * Kartik 30, Ogrohayon 30, Poush 30, Magh 30, Falgun 29 (30 in leap),
 * Choitro 30.
 * Driven by the fixed Gregorian START dates below — month lengths (incl.
 * Falgun's leap rule) fall out automatically. Verified: consecutive starts
 * are exactly the stated lengths apart. */

import { calculateSunriseSunset } from '../utils/panchang';
import { drikSunLongitude } from './drikPanchang';

/** Gregorian start [month 1-12, day] of each Bengali month (2019 revision). */
const BD_STARTS: Array<[number, number]> = [
  [4, 14], [5, 15], [6, 15], [7, 16], [8, 16], [9, 16],
  [10, 17], [11, 16], [12, 16], [1, 15], [2, 14], [3, 15],
];

/** Gregorian start of Bengali month `mi` (0-based) in Bongabdo year `by`. */
function bdMonthStart(by: number, mi: number): Date {
  const [m, d] = BD_STARTS[mi];
  const gy = mi <= 8 ? by + 593 : by + 594; // Poush and earlier: same Gy; Magh+: next
  return new Date(gy, m - 1, d);
}

const startOfDayLocal = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());

function bdGregorianToBengali(date: Date): BengaliDate {
  const dayOnly = startOfDayLocal(date);
  // Bongabdo year: the Apr-14 (Pohela Boishakh) on/before this date
  let pbGy = dayOnly.getFullYear();
  if (dayOnly < new Date(pbGy, 3, 14)) pbGy--;
  const by = pbGy - 593;
  for (let mi = 0; mi < 12; mi++) {
    const s = bdMonthStart(by, mi);
    const e = mi < 11 ? bdMonthStart(by, mi + 1) : new Date(pbGy + 1, 3, 14);
    if (dayOnly >= s && dayOnly < e) {
      const day = Math.round((dayOnly.getTime() - s.getTime()) / 86400000) + 1;
      const m = BENGALI_MONTHS[mi];
      return { year: by, month: mi + 1, day, monthEn: m.en, monthBn: m.bn, monthHi: m.hi, variant: 'bd' };
    }
  }
  const m = BENGALI_MONTHS[0];
  return { year: by, month: 1, day: 1, monthEn: m.en, monthBn: m.bn, monthHi: m.hi, variant: 'bd' };
}

function bdMonthLength(by: number, mi: number): number {
  const s = bdMonthStart(by, mi);
  const e = mi < 11 ? bdMonthStart(by, mi + 1) : new Date(by + 594, 3, 14);
  return Math.round((e.getTime() - s.getTime()) / 86400000);
}

function bdBengaliToGregorian(by: number, month: number, day: number): Date | null {
  const mi = month - 1;
  if (mi < 0 || mi > 11 || day < 1) return null;
  if (day > bdMonthLength(by, mi)) return null;
  const s = bdMonthStart(by, mi);
  return new Date(s.getTime() + (day - 1) * 86400000);
}

/**
 * Sunrise-aware "today": the Bengali day begins at SUNRISE, not midnight.
 * Before local sunrise, the current Bengali date is still yesterday's.
 */
export function bengaliToday(
  variant: BengaliVariant, lat: number, lon: number, tzOffsetHours: number
): BengaliDate {
  const now = new Date();
  try {
    const { sunriseDate } = calculateSunriseSunset(now, lat, lon, tzOffsetHours);
    const effective = now.getTime() < sunriseDate.getTime()
      ? new Date(now.getTime() - 86400000)
      : now;
    return gregorianToBengali(effective, variant);
  } catch {
    return gregorianToBengali(now, variant);
  }
}

/* ------------------------------------------------------------------ */
/* West Bengal traditional sidereal-solar calendar                     */
/* ------------------------------------------------------------------ */

/** Sun's apparent sidereal longitude (degrees 0..360) — Lahiri ayanamsa (Drik).
 *  Delegates to the Drik engine (Schlyter); kept here for API stability. */
export function sunSiderealLongitude(date: Date): number {
  return drikSunLongitude(date);
}

const atNoon = (d: Date): Date => {
  const c = new Date(d);
  c.setHours(12, 0, 0, 0);
  return c;
};

/** Find the calendar day on which the sun's sidereal longitude crosses `targetDeg` (0..360),
 * searching near `approxDate`. Exported for the regional calendar framework. */
export function sankrantiNear(targetDeg: number, approxDate: Date): Date {
  return findSankranti(targetDeg, approxDate);
}

/** Find the calendar day on which the sun's sidereal longitude crosses `target` (0..360). */
function findSankranti(target: number, approxDate: Date): Date {
  const T = ((target % 360) + 360) % 360;
  for (let offset = -10; offset <= 10; offset++) {
    const d1 = atNoon(new Date(approxDate.getTime() + offset * 86400000));
    const d2 = new Date(d1.getTime() + 86400000);
    const l1 = sunSiderealLongitude(d1);
    let l2 = sunSiderealLongitude(d2);
    // forward motion across the day (unwrap)
    let dl = l2 - l1;
    if (dl < 0) dl += 360;
    if (dl > 180) continue; // sanity: sun moves ~1°/day
    let dt = T - l1;
    if (dt < 0) dt += 360;
    if (dt <= dl) {
      // crossing happened this day → that calendar day is day 1 of the month
      return new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
    }
  }
  return new Date(approxDate.getFullYear(), approxDate.getMonth(), approxDate.getDate());
}

/** 13 sankranti day-starts bounding the 12 months of Bongabdo year `by` (0°..360°). */
const sankrantiCache = new Map<number, Date[]>();

export function wbSankrantis(by: number): Date[] {
  const hit = sankrantiCache.get(by);
  if (hit) return hit;
  const startGy = by + 593; // Gregorian year of Mesha sankranti
  const meshaApprox = new Date(startGy, 3, 14, 12, 0, 0); // ~Apr 14
  const out: Date[] = [];
  for (let k = 0; k <= 12; k++) {
    const approx = new Date(meshaApprox.getTime() + k * 30.4375 * 86400000);
    out.push(findSankranti(k * 30, approx));
  }
  sankrantiCache.set(by, out);
  return out;
}

function wbGregorianToBengali(date: Date): BengaliDate {
  const dayOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  // Candidate Bongabdo years: the year starting this Apr, and possibly the previous
  const gy = date.getFullYear();
  const gm = date.getMonth() + 1;
  const gd = date.getDate();
  const guessBy = gm > 4 || (gm === 4 && gd >= 13) ? gy - 593 : gy - 594;
  for (const by of [guessBy, guessBy - 1, guessBy + 1]) {
    const s = wbSankrantis(by);
    for (let mi = 0; mi < 12; mi++) {
      if (dayOnly >= s[mi] && dayOnly < s[mi + 1]) {
        const day = Math.round((dayOnly.getTime() - s[mi].getTime()) / 86400000) + 1;
        const m = BENGALI_MONTHS[mi];
        return { year: by, month: mi + 1, day, monthEn: m.en, monthBn: m.bn, monthHi: m.hi, variant: 'wb' };
      }
    }
  }
  // Fallback (should not happen): approximate
  const m = BENGALI_MONTHS[3];
  return { year: guessBy, month: 4, day: 1, monthEn: m.en, monthBn: m.bn, monthHi: m.hi, variant: 'wb' };
}

function wbBengaliToGregorian(by: number, month: number, day: number): Date | null {
  const mi = month - 1;
  if (mi < 0 || mi > 11 || day < 1) return null;
  const s = wbSankrantis(by);
  const monthLen = Math.round((s[mi + 1].getTime() - s[mi].getTime()) / 86400000);
  if (day > monthLen) return null;
  return new Date(s[mi].getTime() + (day - 1) * 86400000);
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export function gregorianToBengali(date: Date, variant: BengaliVariant): BengaliDate {
  return variant === 'bd' ? bdGregorianToBengali(date) : wbGregorianToBengali(date);
}

export function bengaliToGregorian(
  year: number, month: number, day: number, variant: BengaliVariant
): Date | null {
  return variant === 'bd'
    ? bdBengaliToGregorian(year, month, day)
    : wbBengaliToGregorian(year, month, day);
}

/** Gregorian [start, end] (inclusive) of a Bengali month. */
export function bengaliMonthRange(
  by: number, month: number, variant: BengaliVariant
): { start: Date; end: Date } {
  if (variant === 'wb') {
    const s = wbSankrantis(by);
    const mi = month - 1;
    return { start: new Date(s[mi]), end: new Date(s[mi + 1].getTime() - 86400000) };
  }
  const start = bdBengaliToGregorian(by, month, 1)!;
  const len = bdMonthLength(by, month - 1);
  return { start, end: new Date(start.getTime() + (len - 1) * 86400000) };
}

/** Today's Bengali date in both variants — handy for the header. */
export function todayBengali(date: Date = new Date()): { bd: BengaliDate; wb: BengaliDate } {
  return { bd: gregorianToBengali(date, 'bd'), wb: gregorianToBengali(date, 'wb') };
}
