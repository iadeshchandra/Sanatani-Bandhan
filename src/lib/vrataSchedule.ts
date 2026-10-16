/**
 * vrataSchedule.ts — Ekadashi & fasting schedules (Drik Siddhanta).
 * =====================================================================
 * Ekadashi = the 11th tithi prevailing AT SUNRISE (Bengali day begins at
 * sunrise). Tithi computed with the Drik engine (Lahiri ayanamsa).
 *
 * Smarta vs Vaishnava (Goswami/Nimbark): when the Ekadashi tithi spans two
 * sunrises, Vaishnava observance moves to the next day. Both are shown.
 *
 * Parana respects Hari Vasara (first quarter of Dwadashi): the window opens
 * after Hari Vasara ends and closes when Dwadashi ends.
 */

import { calculateSunriseSunset } from '../utils/panchang';
import { drikTithiAt, drikLunarMonth } from './drikPanchang';

export interface EkadashiDay {
  /** The vrata (fasting) date — Smarta */
  date: Date;
  iso: string;
  paksha: 'Shukla' | 'Krishna';
  smartaDate: Date;
  smartaIso: string;
  vaishnavaDate: Date;
  vaishnavaIso: string;
  differ: boolean;
  /** Parana window respecting Hari Vasara */
  parana: string;
  paranaBn: string;
  name: string;
  nameBn: string;
}

const DHAKA = { lat: 23.8103, lon: 90.4125, tz: 6 };
const KOLKATA = { lat: 22.5726, lon: 88.3639, tz: 5.5 };

// Traditional Ekadashi names by Amanta lunar month (Chaitra-start index)
const EKADASHI_NAMES: Array<{ en: string; bn: string }> = [
  { en: 'Papmochani Ekadashi', bn: 'পাপমোচনী একাদশী' },
  { en: 'Kamada Ekadashi', bn: 'কামদা একাদশী' },
  { en: 'Varuthini Ekadashi', bn: 'বরূথিনী একাদশী' },
  { en: 'Mohini Ekadashi', bn: 'মোহিনী একাদশী' },
  { en: 'Apara Ekadashi', bn: 'অপরা একাদশী' },
  { en: 'Nirjala Ekadashi', bn: 'নির্জলা একাদশী' },
  { en: 'Yogini Ekadashi', bn: 'যোগিনী একাদশী' },
  { en: 'Devshayani Ekadashi', bn: 'দেবশয়নী একাদশী' },
  { en: 'Kamika Ekadashi', bn: 'কামিকা একাদশী' },
  { en: 'Putrada Ekadashi', bn: 'পুত্রদা একাদশী' },
  { en: 'Aja Ekadashi', bn: 'অজা একাদশী' },
  { en: 'Parivartini Ekadashi', bn: 'পরিবর্তিনী একাদশী' },
  { en: 'Indira Ekadashi', bn: 'ইন্দিরা একাদশী' },
  { en: 'Papankusha Ekadashi', bn: 'পাপাঙ্কুশা একাদশী' },
  { en: 'Rama Ekadashi', bn: 'রমা একাদশী' },
  { en: 'Devutthana Ekadashi', bn: 'দেবুত্থান একাদশী' },
  { en: 'Utpanna Ekadashi', bn: 'উৎপন্না একাদশী' },
  { en: 'Mokshada Ekadashi', bn: 'মোক্ষদা একাদশী' },
  { en: 'Saphala Ekadashi', bn: 'সফলা একাদশী' },
  { en: 'Putrada Ekadashi', bn: 'পুত্রদা একাদশী' },
  { en: 'Shattila Ekadashi', bn: 'ষটতিলা একাদশী' },
  { en: 'Jaya Ekadashi', bn: 'জয়া একাদশী' },
  { en: 'Vijaya Ekadashi', bn: 'বিজয়া একাদশী' },
  { en: 'Amalaki Ekadashi', bn: 'আমলকী একাদশী' },
];

/** Tithi prevailing at sunrise of a civil day (location-correct). */
function tithiAtSunrise(day: Date, loc: { lat: number; lon: number; tz: number }) {
  const { sunriseDate } = calculateSunriseSunset(day, loc.lat, loc.lon, loc.tz);
  return { tithi: drikTithiAt(sunriseDate), sunrise: sunriseDate };
}

/**
 * Find the [start, end] span of the tithi `index` containing `moment`,
 * scanning in 10-minute steps (max ±40h). Used for Hari Vasara math.
 */
function tithiSpan(moment: Date, index: number): { start: Date; end: Date } | null {
  const step = 10 * 60000;
  let start = moment.getTime();
  for (let k = 0; k < 240; k++) {
    const t = new Date(start - step);
    if (drikTithiAt(t).index !== index) break;
    start -= step;
  }
  let end = moment.getTime();
  for (let k = 0; k < 240; k++) {
    const t = new Date(end + step);
    if (drikTithiAt(t).index !== index) break;
    end += step;
  }
  if (end <= start) return null;
  return { start: new Date(start), end: new Date(end) };
}

/** Wall-clock time in the target timezone (browser tz is unreliable). */
const fmtTz = (d: Date, tz: number): string => {
  const s = new Date(d.getTime() + tz * 3600000);
  const hh = s.getUTCHours();
  const mm = s.getUTCMinutes();
  const ap = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${String(h12).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${ap}`;
};

/** Civil-day ISO (YYYY-MM-DD) in the target timezone. */
const toIsoTz = (d: Date, tz: number): string => {
  const s = new Date(d.getTime() + tz * 3600000);
  return `${s.getUTCFullYear()}-${String(s.getUTCMonth() + 1).padStart(2, '0')}-${String(s.getUTCDate()).padStart(2, '0')}`;
};

/**
 * Find Ekadashi observance days in [fromDate, toDate] (Drik).
 * `region` selects the location for sunrise (affects tithi-at-sunrise).
 */
export type VrataLoc = { lat: number; lon: number; tz: number };

export function findEkadashis(
  fromDate: Date,
  toDate: Date,
  region: 'bd' | 'wb' | VrataLoc = 'bd'
): EkadashiDay[] {
  const loc: VrataLoc =
    typeof region === 'string' ? (region === 'bd' ? DHAKA : KOLKATA) : region;
  const dayMs = 86400000;
  const tzMs = loc.tz * 3600000;
  // Iterate civil days in the LOCATION's timezone (not the browser's).
  // Representative instant: local noon of each civil day.
  const startCi = Math.floor((fromDate.getTime() + tzMs) / dayMs);
  const endCi = Math.floor((toDate.getTime() + tzMs) / dayMs);

  interface DayTithi { date: Date; tithiNumber: number; paksha: 'Shukla' | 'Krishna'; index: number }
  const days: DayTithi[] = [];
  for (let ci = startCi; ci <= endCi + 1; ci++) {
    const date = new Date(ci * dayMs + 12 * 3600000 - tzMs);
    try {
      const { tithi } = tithiAtSunrise(date, loc);
      days.push({ date, tithiNumber: tithi.tithiNumber, paksha: tithi.paksha, index: tithi.index });
    } catch { /* skip */ }
  }

  const out: EkadashiDay[] = [];
  for (let i = 0; i < days.length - 1; i++) {
    const d = days[i];
    if (d.tithiNumber !== 11) continue;
    const prev = days[i - 1];
    if (prev && prev.tithiNumber === 11 && prev.paksha === d.paksha) continue; // not the first sunrise

    const next = days[i + 1];
    const spansTwoDays = !!next && next.tithiNumber === 11 && next.paksha === d.paksha;
    const vaishnavaDate = spansTwoDays && next ? next.date : d.date;

    // Parana: morning after the (Vaishnava) fasting day.
    // Hari Vasara = first quarter of Dwadashi → parana opens after it ends.
    // The window is a MORNING window: opens at max(sunrise, Hari Vasara end),
    // closes at min(Dwadashi end, solar noon) — parana is a morning act.
    // Shown only when Dwadashi actually prevails at parana sunrise; otherwise
    // the tithi arithmetic produces nonsense like "11:10 am – 05:03 am".
    let parana = '';
    let paranaBn = '';
    try {
      const paranaDay = new Date(vaishnavaDate.getTime() + dayMs);
      const { sunrise, tithi: tithiAtSr } = tithiAtSunrise(paranaDay, loc);
      const dwadashiIndex = d.index === 10 ? 11 : 26; // Shukla : Krishna
      const sr = calculateSunriseSunset(paranaDay, loc.lat, loc.lon, loc.tz);
      const solarNoon = new Date(sr.sunriseDate.getTime() + (sr.dayLengthMinutes * 60000) / 2);
      let done = false;
      if (tithiAtSr.index === dwadashiIndex) {
        const span = tithiSpan(sunrise, dwadashiIndex);
        if (span && span.end.getTime() > sunrise.getTime()) {
          const hariVasaraEnd = new Date(span.start.getTime() + (span.end.getTime() - span.start.getTime()) / 4);
          const open = new Date(Math.max(sunrise.getTime(), hariVasaraEnd.getTime()));
          const close = new Date(Math.min(span.end.getTime(), solarNoon.getTime()));
          if (close.getTime() > open.getTime()) {
            parana = `${fmtTz(open, loc.tz)} – ${fmtTz(close, loc.tz)}`;
            paranaBn = parana;
            done = true;
          }
        }
      }
      if (!done) {
        // Dwadashi not prevailing at parana sunrise (kshaya, or Vaishnava
        // fast observed on Dwadashi itself) — break fast after sunrise.
        parana = `after ${fmtTz(sunrise, loc.tz)}`;
        paranaBn = `${fmtTz(sunrise, loc.tz)}-এর পর`;
      }
    } catch {
      parana = 'next morning after sunrise';
      paranaBn = 'পরদিন সূর্যোদয়ের পর';
    }

    // Traditional name from the Amanta lunar month at the fasting sunrise
    let nm = EKADASHI_NAMES[0];
    try {
      const { sunrise } = tithiAtSunrise(d.date, loc);
      const lm = drikLunarMonth(sunrise, 'amanta');
      nm = EKADASHI_NAMES[(lm.index * 2 + (d.paksha === 'Krishna' ? 0 : 1)) % EKADASHI_NAMES.length];
    } catch { /* keep default */ }

    out.push({
      date: d.date,
      iso: toIsoTz(d.date, loc.tz),
      paksha: d.paksha,
      smartaDate: d.date,
      smartaIso: toIsoTz(d.date, loc.tz),
      vaishnavaDate,
      vaishnavaIso: toIsoTz(vaishnavaDate, loc.tz),
      differ: spansTwoDays,
      parana,
      paranaBn,
      name: nm.en,
      nameBn: nm.bn,
    });
  }
  return out;
}

/** Next Ekadashi on/after a date. */
export function nextEkadashi(from: Date = new Date(), region: 'bd' | 'wb' | VrataLoc = 'bd'): EkadashiDay | null {
  const list = findEkadashis(from, new Date(from.getTime() + 40 * 86400000), region);
  return list[0] || null;
}

export const VRATA_DISCLAIMER = {
  en: 'Drik Siddhanta (Lahiri ayanamsa), tithi at local sunrise. Parana window respects Hari Vasara — confirm with your local panjika or purohit.',
  bn: 'দৃক সিদ্ধান্ত (লাহিড়ী অয়নাংশ), স্থানীয় সূর্যোদয়ে তিথি। পারণা হরিবাসর মেনে — স্থানীয় পঞ্জিকা বা পুরোহিতের সঙ্গে মিলিয়ে নিন।',
  hi: 'दृक् सिद्धान्त (लाहिड़ी अयनांश), स्थानीय सूर्योदय पर तिथि। हरिवासर-सम्मत पारण — स्थानीय पंचांग से पुष्टि करें।',
};
