/**
 * shubhMuhurat.ts — Traditional shubh-muhurat finder for samskaras.
 * =====================================================================
 * Rule-based scanner over the Vedic panchang engine
 * (src/utils/panchang.ts), using Bengali months (src/lib/bengaliCalendar.ts).
 *
 * Encodes widely-followed Bengali panjika traditions for samskara timing.
 * Scores are Uttam / Madhyam guidance — NEVER deterministic prediction.
 * The underlying tithi engine is a mean-longitude approximation (±1 day
 * possible); the UI must carry the "consult your purohit" disclaimer.
 */

import { calculateDailyPanchang, calculateSunriseSunset } from '../utils/panchang';
import { gregorianToBengali, BENGALI_MONTHS, type BengaliVariant } from './bengaliCalendar';
import { drikTithiAt, drikNakshatraAt } from './drikPanchang';

export type SamskaraKind =
  | 'bibaha'
  | 'annaprason'
  | 'namkaran'
  | 'grihaPravesh'
  | 'grihaArambha'
  | 'upanayan';

/** 'bengali' = Bengali panjika rules; 'north_indian' = North Indian (Vikram) rules.
 *  Other traditions fall back to north_indian with a note. */
export type MuhuratTradition = 'bengali' | 'north_indian';

export interface SamskaraDef {
  id: SamskaraKind;
  en: string;
  bn: string;
  hi: string;
  note: { en: string; bn: string };
}

export const SAMSKARA_KINDS: SamskaraDef[] = [
  {
    id: 'bibaha', en: 'Bibaha (Marriage)', bn: 'বিবাহ', hi: 'विवाह',
    note: { en: 'Traditionally in Magh, Falgun, Boishakh, Joishtho. Avoid Chaturmasya months.', bn: 'ঐতিহ্যগতভাবে মাঘ, ফাল্গুন, বৈশাখ, জ্যৈষ্ঠে। চাতুর্মাস্য এড়িয়ে চলুন।' },
  },
  {
    id: 'annaprason', en: 'Annaprason (First Rice)', bn: 'অন্নপ্রাশন', hi: 'अन्नप्राशन',
    note: { en: 'Traditionally even months for boys, odd months for girls.', bn: 'ঐতিহ্যগতভাবে ছেলেদের জোড় মাসে, মেয়েদের বিজোড় মাসে।' },
  },
  {
    id: 'namkaran', en: 'Namkaran (Naming)', bn: 'নামকরণ', hi: 'नामकरण',
    note: { en: 'Traditionally on the 12th day after birth, under a favorable nakshatra.', bn: 'ঐতিহ্যগতভাবে জন্মের ১২তম দিনে, শুভ নক্ষত্রে।' },
  },
  {
    id: 'grihaPravesh', en: 'Griha Pravesh (Housewarming)', bn: 'গৃহ প্রবেশ', hi: 'गृह प्रवेश',
    note: { en: 'Avoid Dakshinayana/Chaturmasya period. New home, new light.', bn: 'দক্ষিণায়ন/চাতুর্মাস্য এড়িয়ে চলুন। নতুন ঘর, নতুন আলো।' },
  },
  {
    id: 'grihaArambha', en: 'Griha Arambha (Construction Start)', bn: 'গৃহ আরম্ভ', hi: 'गृह आरम्भ',
    note: { en: 'Foundation laid on Mon/Wed/Thu/Fri under a fixed (sthira) nakshatra.', bn: 'সোম/বুধ/বৃহস্পতি/শুক্রবারে স্থির নক্ষত্রে ভিত্তিপ্রস্তর।' },
  },
  {
    id: 'upanayan', en: 'Upanayan (Sacred Thread)', bn: 'উপনয়ন', hi: 'उपनयन',
    note: { en: 'Vasant ritu (Falgun–Choitro) preferred; northern course of the sun.', bn: 'বসন্ত ঋতু (ফাল্গুন–চৈত্র) শ্রেয়; সূর্যের উত্তরায়ণ।' },
  },
];

interface RuleSet {
  goodMonths: number[]; // Bengali month numbers 1..12
  avoidMonths: number[];
  goodTithis: number[]; // tithiNumber 1..15 within paksha
  avoidTithis: number[];
  goodNakshatras: string[]; // engine spellings
  avoidWeekdays: number[]; // 0=Sun..6=Sat
  goodWeekdays?: number[];
}

const NAK = {
  rohini: 'Rohini', mrigashirsha: 'Mrigashirsha', magha: 'Magha',
  uttaraPhalguni: 'Uttara Phalguni', hasta: 'Hasta', swati: 'Swati',
  anuradha: 'Anuradha', mula: 'Mula', uttaraAshadha: 'Uttara Ashadha',
  uttaraBhadrapada: 'Uttara Bhadrapada', revati: 'Revati',
  ashwini: 'Ashwini', punarvasu: 'Punarvasu', pushya: 'Pushya',
  chitra: 'Chitra', shravana: 'Shravana', dhanishta: 'Dhanishta',
  shatabhisha: 'Shatabhisha',
};

const RULES: Record<SamskaraKind, RuleSet> = {
  bibaha: {
    goodMonths: [10, 11, 1, 2],
    avoidMonths: [3, 4, 5, 6, 7, 9],
    goodTithis: [2, 3, 5, 7, 10, 11, 12, 13],
    avoidTithis: [4, 8, 9, 14],
    goodNakshatras: [NAK.rohini, NAK.mrigashirsha, NAK.magha, NAK.uttaraPhalguni, NAK.hasta, NAK.swati, NAK.anuradha, NAK.mula, NAK.uttaraAshadha, NAK.uttaraBhadrapada, NAK.revati],
    avoidWeekdays: [2, 6],
  },
  annaprason: {
    goodMonths: [1, 2, 10, 11, 12],
    avoidMonths: [4, 5],
    goodTithis: [2, 3, 5, 7, 10, 13],
    avoidTithis: [4, 8, 9, 14],
    goodNakshatras: [NAK.ashwini, NAK.rohini, NAK.mrigashirsha, NAK.punarvasu, NAK.pushya, NAK.hasta, NAK.chitra, NAK.swati, NAK.anuradha, NAK.shravana, NAK.dhanishta, NAK.shatabhisha, NAK.revati],
    avoidWeekdays: [2, 6],
  },
  namkaran: {
    goodMonths: [1, 2, 10, 11, 12, 3],
    avoidMonths: [4],
    goodTithis: [2, 3, 5, 7, 10, 11, 13],
    avoidTithis: [4, 9, 14],
    goodNakshatras: [NAK.ashwini, NAK.rohini, NAK.mrigashirsha, NAK.punarvasu, NAK.pushya, NAK.hasta, NAK.anuradha, NAK.shravana, NAK.revati],
    avoidWeekdays: [6],
  },
  grihaPravesh: {
    goodMonths: [1, 2, 10, 11],
    avoidMonths: [3, 4, 5, 6, 7, 9],
    goodTithis: [2, 3, 5, 7, 10, 11, 13],
    avoidTithis: [4, 8, 9, 14],
    goodNakshatras: [NAK.rohini, NAK.mrigashirsha, NAK.chitra, NAK.anuradha, NAK.revati, NAK.uttaraPhalguni, NAK.uttaraAshadha, NAK.uttaraBhadrapada],
    avoidWeekdays: [2, 6],
  },
  grihaArambha: {
    goodMonths: [1, 2, 10, 11, 12],
    avoidMonths: [3, 4, 5, 6, 7],
    goodTithis: [2, 3, 5, 7, 10, 11, 13],
    avoidTithis: [4, 8, 9, 14],
    goodNakshatras: [NAK.rohini, NAK.mrigashirsha, NAK.uttaraPhalguni, NAK.hasta, NAK.chitra, NAK.anuradha, NAK.uttaraAshadha, NAK.uttaraBhadrapada, NAK.revati],
    avoidWeekdays: [2, 6],
    goodWeekdays: [1, 3, 4, 5],
  },
  upanayan: {
    goodMonths: [11, 12, 1, 2],
    avoidMonths: [4, 5, 6],
    goodTithis: [2, 3, 5, 7, 10, 11, 12, 13],
    avoidTithis: [4, 8, 9, 14],
    goodNakshatras: [NAK.ashwini, NAK.rohini, NAK.mrigashirsha, NAK.punarvasu, NAK.pushya, NAK.hasta, NAK.shravana, NAK.revati, NAK.anuradha],
    avoidWeekdays: [6],
  },
};

/* North Indian rule set — same Mesha-start solar month numbering (1=Vaishakha).
 * Key differences from Bengali: Chaitra (12) avoided for bibaha/griha-pravesh;
 * Chaturmasya (4–7) avoided; Vasant/Shishira emphasis for upanayan. */
const NORTH_INDIAN_RULES: Record<SamskaraKind, RuleSet> = {
  bibaha: {
    goodMonths: [1, 2, 10, 11],
    avoidMonths: [4, 5, 6, 7, 9, 12],
    goodTithis: [2, 3, 5, 7, 10, 11, 12, 13],
    avoidTithis: [4, 8, 9, 14],
    goodNakshatras: [NAK.rohini, NAK.mrigashirsha, NAK.magha, NAK.uttaraPhalguni, NAK.hasta, NAK.swati, NAK.anuradha, NAK.mula, NAK.uttaraAshadha, NAK.uttaraBhadrapada, NAK.revati],
    avoidWeekdays: [2, 6],
  },
  annaprason: {
    goodMonths: [1, 2, 10, 11, 12],
    avoidMonths: [6],
    goodTithis: [2, 3, 5, 7, 10, 13],
    avoidTithis: [4, 8, 9, 14],
    goodNakshatras: [NAK.ashwini, NAK.rohini, NAK.mrigashirsha, NAK.punarvasu, NAK.pushya, NAK.hasta, NAK.chitra, NAK.swati, NAK.anuradha, NAK.shravana, NAK.dhanishta, NAK.shatabhisha, NAK.revati],
    avoidWeekdays: [2, 6],
  },
  namkaran: {
    goodMonths: [1, 2, 3, 10, 11],
    avoidMonths: [6],
    goodTithis: [2, 3, 5, 7, 10, 11, 13],
    avoidTithis: [4, 9, 14],
    goodNakshatras: [NAK.ashwini, NAK.rohini, NAK.mrigashirsha, NAK.punarvasu, NAK.pushya, NAK.hasta, NAK.anuradha, NAK.shravana, NAK.revati],
    avoidWeekdays: [6],
  },
  grihaPravesh: {
    goodMonths: [1, 2, 10, 11],
    avoidMonths: [4, 5, 6, 7, 9, 12],
    goodTithis: [2, 3, 5, 7, 10, 11, 13],
    avoidTithis: [4, 8, 9, 14],
    goodNakshatras: [NAK.rohini, NAK.mrigashirsha, NAK.chitra, NAK.anuradha, NAK.revati, NAK.uttaraPhalguni, NAK.uttaraAshadha, NAK.uttaraBhadrapada],
    avoidWeekdays: [2, 6],
  },
  grihaArambha: {
    goodMonths: [1, 2, 10, 11, 12],
    avoidMonths: [4, 5, 6, 7],
    goodTithis: [2, 3, 5, 7, 10, 11, 13],
    avoidTithis: [4, 8, 9, 14],
    goodNakshatras: [NAK.rohini, NAK.mrigashirsha, NAK.uttaraPhalguni, NAK.hasta, NAK.chitra, NAK.anuradha, NAK.uttaraAshadha, NAK.uttaraBhadrapada, NAK.revati],
    avoidWeekdays: [2, 6],
    goodWeekdays: [1, 3, 4, 5],
  },
  upanayan: {
    goodMonths: [11, 12, 1, 2],
    avoidMonths: [4, 5, 6],
    goodTithis: [2, 3, 5, 7, 10, 11, 12, 13],
    avoidTithis: [4, 8, 9, 14],
    goodNakshatras: [NAK.ashwini, NAK.rohini, NAK.mrigashirsha, NAK.punarvasu, NAK.pushya, NAK.hasta, NAK.shravana, NAK.revati, NAK.anuradha],
    avoidWeekdays: [6],
  },
};

export type MuhuratGrade = 'uttam' | 'madhyam' | 'avoid';

export interface MuhuratDay {
  date: Date;
  iso: string;
  grade: MuhuratGrade;
  score: number;
  bengaliMonth: string;
  bengaliMonthBn: string;
  tithi: string;
  tithiNumber: number;
  paksha: 'Shukla' | 'Krishna';
  nakshatra: string;
  weekday: string;
  reasons: Array<{ en: string; bn: string }>;
}

const DHAKA = { lat: 23.8103, lon: 90.4125 };
const KOLKATA = { lat: 22.5726, lon: 88.3639 };

export interface MuhuratOptions {
  tradition?: MuhuratTradition;
  coords?: { lat: number; lon: number };
  /** solar month name resolver for reasons (defaults to Bengali) */
  monthName?: (meshaStartMonth: number) => string;
}

export function findShubhMuhurat(
  kind: SamskaraKind,
  fromDate: Date,
  toDate: Date,
  variant: BengaliVariant,
  coordsOrOpts?: { lat: number; lon: number } | MuhuratOptions
): MuhuratDay[] {
  const opts: MuhuratOptions =
    coordsOrOpts && ('tradition' in coordsOrOpts || 'monthName' in coordsOrOpts)
      ? (coordsOrOpts as MuhuratOptions)
      : { coords: coordsOrOpts as { lat: number; lon: number } | undefined };
  const tradition: MuhuratTradition = opts.tradition || 'bengali';
  const rules = (tradition === 'north_indian' ? NORTH_INDIAN_RULES : RULES)[kind];
  const monthName = opts.monthName || ((m: number) => BENGALI_MONTHS[m - 1].en);
  const { lat, lon } = opts.coords || (variant === 'bd' ? DHAKA : KOLKATA);
  const out: MuhuratDay[] = [];
  const dayMs = 86400000;
  const start = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const end = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());

  const tz = variant === 'bd' ? 6 : 5.5;
  for (let t = start.getTime(); t <= end.getTime(); t += dayMs) {
    const date = new Date(t);
    let p: ReturnType<typeof calculateDailyPanchang>;
    let tithiNumber: number;
    let paksha: 'Shukla' | 'Krishna';
    let tithiFull: string;
    let nakshatra: string;
    try {
      p = calculateDailyPanchang(date, lat, lon);
      // Drik tithi/nakshatra prevailing AT SUNRISE (Bengali day begins at sunrise)
      const { sunriseDate } = calculateSunriseSunset(date, lat, lon, tz);
      const dt = drikTithiAt(sunriseDate);
      const dn = drikNakshatraAt(sunriseDate);
      tithiNumber = dt.tithiNumber;
      paksha = dt.paksha;
      tithiFull = `${dt.paksha} ${dt.name}`;
      nakshatra = dn.name;
    } catch {
      continue;
    }
    const b = gregorianToBengali(date, variant);
    const wd = date.getDay();
    const reasons: Array<{ en: string; bn: string }> = [];
    let score = 0;
    let hardAvoid = false;

    // Month (Bengali month number aligns with Mesha-start solar index for rule purposes)
    const mLabel = monthName(b.month);
    if (rules.avoidMonths.includes(b.month)) {
      score -= 3;
      hardAvoid = true;
      reasons.push({ en: `${mLabel} is traditionally avoided`, bn: `${mLabel} ঐতিহ্যগতভাবে পরিহার্য` });
    } else if (rules.goodMonths.includes(b.month)) {
      score += 2;
      reasons.push({ en: `${mLabel} — favorable month`, bn: `${mLabel} — শুভ মাস` });
    }

    // Tithi (Drik, at sunrise)
    const isAmavasya = tithiNumber === 15 && paksha === 'Krishna';
    if (rules.avoidTithis.includes(tithiNumber) || isAmavasya) {
      score -= 3;
      hardAvoid = true;
      reasons.push({ en: `${tithiFull} — traditionally avoided`, bn: `${tithiFull} — ঐতিহ্যগতভাবে পরিহার্য` });
    } else if (rules.goodTithis.includes(tithiNumber)) {
      score += 2;
      reasons.push({ en: `${tithiFull} — shubh tithi`, bn: `${tithiFull} — শুভ তিথি` });
    }

    // Nakshatra (Drik, at sunrise)
    if (rules.goodNakshatras.includes(nakshatra)) {
      score += 2;
      reasons.push({ en: `${nakshatra} nakshatra — favorable`, bn: `${nakshatra} নক্ষত্র — শুভ` });
    }

    // Weekday
    if (rules.avoidWeekdays.includes(wd)) {
      score -= 2;
      reasons.push({ en: `${p.vaara} — traditionally avoided for this samskara`, bn: `${p.vaara} — এই সংস্কারের জন্য ঐতিহ্যগতভাবে পরিহার্য` });
    } else if (rules.goodWeekdays?.includes(wd)) {
      score += 1;
    }

    // Shukla paksha gentle bonus for most samskaras
    if (paksha === 'Shukla' && !isAmavasya) score += 0.5;

    const grade: MuhuratGrade = hardAvoid ? 'avoid' : score >= 5 ? 'uttam' : score >= 3 ? 'madhyam' : 'avoid';
    if (grade === 'avoid') continue;

    out.push({
      date,
      iso: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
      grade,
      score,
      bengaliMonth: b.monthEn,
      bengaliMonthBn: b.monthBn,
      tithi: tithiFull,
      tithiNumber,
      paksha,
      nakshatra,
      weekday: p.vaara,
      reasons,
    });
  }

  // Uttam first, then by date
  return out.sort((a, b) =>
    a.grade === b.grade ? a.date.getTime() - b.date.getTime() : a.grade === 'uttam' ? -1 : 1
  );
}

export const MUHURAT_DISCLAIMER = {
  en: 'Traditional guidance per Bengali panjika — consult your purohit for final selection.',
  bn: 'বাংলা পঞ্জিকা অনুযায়ী ঐতিহ্যগত নির্দেশনা — চূড়ান্ত নির্বাচনের জন্য আপনার পুরোহিতের পরামর্শ নিন।',
  hi: 'बंगाली पंजिका के अनुसार पारंपरिक मार्गदर्शन — अंतिम चयन हेतु अपने पुरोहित से परामर्श करें।',
};

/** Tradition-aware disclaimer — the footer must match the section header. */
export const MUHURAT_DISCLAIMER_BY_TRADITION: Record<MuhuratTradition, { en: string; bn: string; hi: string }> = {
  bengali: MUHURAT_DISCLAIMER,
  north_indian: {
    en: 'Traditional guidance per North Indian (Vikram) panjika — consult your purohit for final selection.',
    bn: 'উত্তর ভারতীয় (বিক্রম) পঞ্জিকা অনুযায়ী ঐতিহ্যগত নির্দেশনা — চূড়ান্ত নির্বাচনের জন্য আপনার পুরোহিতের পরামর্শ নিন।',
    hi: 'उत्तर भारतीय (विक्रम) पंचांग के अनुसार पारंपरिक मार्गदर्शन — अंतिम चयन हेतु अपने पुरोहित से परामर्श करें।',
  },
};

export function bengaliMonthName(month: number, script: 'en' | 'bn' = 'en'): string {
  const m = BENGALI_MONTHS[month - 1];
  return script === 'bn' ? m.bn : m.en;
}
