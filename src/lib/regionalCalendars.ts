/**
 * regionalCalendars.ts — The Sanatani Panjika: one almanac, every tradition.
 * =====================================================================
 * Pluggable RegionalCalendar framework. Bengali (BD + WB) is the reference
 * implementation; the framework adds Vikram Samvat, Tamil, Shalivahana
 * Shaka (Telugu/Kannada), Malayalam (Kollam), Odia, Assamese (Bhaskarabda),
 * Nepali (Bikram Sambat), and Punjabi (Nanakshahi).
 *
 * Accuracy notes:
 *  - Sidereal-solar calendars use a Lahiri-ayanamsa solar-longitude model
 *    (±1 day vs printed panjikas that use full ephemerides).
 *  - Lunar calendars (Vikram/Shaka) reuse the app's tithi engine.
 *  - Nepali: Nepal's official calendar is government-published; the
 *    astronomical approximation here may differ by ±1–2 days.
 */

import {
  gregorianToBengali as bengaliConvert,
  bengaliToGregorian as bengaliReverse,
  bengaliMonthRange as bengaliRange,
  formatBengaliDate,
  toBengaliNumerals,
  sankrantiNear,
  BENGALI_MONTHS,
  type BengaliVariant,
} from './bengaliCalendar';
import { drikLunarMonth, drikTithiAt, type LunarSchool } from './drikPanchang';

export type CalendarKind = 'solar' | 'lunar';

export interface RegionalDate {
  year: number;
  month: number; // 1..12
  monthEn: string;
  monthNative: string;
  day: number; // solar day-of-month, or tithi number for lunar
  kind: CalendarKind;
  paksha?: 'Shukla' | 'Krishna';
  tithiName?: string;
  era: string;
  eraNative: string;
}

export interface MonthDef {
  en: string;
  native: string;
}

export interface RegionalCalendar {
  id: string;
  nameEn: string;
  nameNative: string;
  regionEn: string;
  kind: CalendarKind;
  months: MonthDef[]; // 12, in calendar order
  era: string;
  eraNative: string;
  newYearNoteEn: string;
  newYearNoteNative: string;
  toRegional(date: Date): RegionalDate;
  fromRegional(year: number, month: number, day: number): Date | null;
  monthRange(year: number, month: number): { start: Date; end: Date };
  toNumerals(n: number | string): string;
  disclaimerEn?: string;
  /** Lunar calendars only: which school names Krishna-paksha months. Mutable — UI toggle. */
  lunarSchool?: LunarSchool;
}

/* ------------------------------------------------------------------ */
/* Numeral systems                                                     */
/* ------------------------------------------------------------------ */

const NUMERALS: Record<string, string> = {
  bengali: '০১২৩৪৫৬৭৮৯',
  tamil: '௦௧௨௩௪௫௬௭௮௯',
  devanagari: '०१२३४५६७८९',
  gurmukhi: '੦੧੨੩੪੫੬੭੮੯',
  telugu: '౦౧౨౩౪౫౬౭౮౯',
  kannada: '೦೧೨೩೪೫೬೭೮೯',
  malayalam: '൦൧൨൩൪൫൬൭൮൯',
  odia: '୦୧୨୩୪୫୬୭୮୯',
};

const makeNumerals = (digits: string) => (n: number | string): string =>
  String(n).replace(/[0-9]/g, (d) => digits[Number(d)]);

/* ------------------------------------------------------------------ */
/* Generic fixed-month solar calendar (Nanakshahi-style)               */
/* ------------------------------------------------------------------ */

interface FixedMonthConfig {
  /** [gregorianMonth 1-12, gregorianDay] start of each month, in order */
  starts: Array<[number, number]>;
  lengths: number[]; // 12; last may gain +1 in leap years
  leapExtraMonthIdx: number; // month index that gains a day in leap years
  yearForDate: (d: Date) => number;
}

const isLeap = (y: number): boolean => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());

function fixedToRegionalInner(date: Date, cfg: FixedMonthConfig, cal: RegionalCalendar): RegionalDate {
  const gy = date.getFullYear();
  const gm = date.getMonth() + 1;
  const gd = date.getDate();
  const year = cfg.yearForDate(date);
  // Find the Gregorian year of the regional year's first month
  const firstStart = cfg.starts[0];
  const startGy = gm > firstStart[0] || (gm === firstStart[0] && gd >= firstStart[1]) ? gy : gy - 1;
  // Leap if the February overlapped by the leap month is a leap February.
  const febGy = leapFebGregorianYear(cfg, year, startGy);
  const lens = cfg.lengths.map((l, i) => (i === cfg.leapExtraMonthIdx && isLeap(febGy) ? l + 1 : l));
  // day-of-regional-year
  const yearStart = new Date(startGy, firstStart[0] - 1, firstStart[1]);
  const dayIdx = Math.floor((startOfDay(date).getTime() - startOfDay(yearStart).getTime()) / 86400000);
  let mi = 0;
  let rest = dayIdx;
  while (mi < 11 && rest >= lens[mi]) {
    rest -= lens[mi];
    mi++;
  }
  const m = cal.months[mi];
  return {
    year, month: mi + 1, monthEn: m.en, monthNative: m.native,
    day: rest + 1, kind: 'solar', era: cal.era, eraNative: cal.eraNative,
  };
}

function leapFebGregorianYear(cfg: FixedMonthConfig, _year: number, startGy: number): number {
  // The leap month's February: for Chet-start calendars it's Feb of startGy+1
  void cfg;
  return startGy + 1;
}

function fixedFromRegional(
  year: number, month: number, day: number, cfg: FixedMonthConfig, cal: RegionalCalendar
): Date | null {
  const mi = month - 1;
  if (mi < 0 || mi > 11 || day < 1) return null;
  const anchor = fixedYearStart(year, cfg, cal);
  if (!anchor) return null;
  const febGy = leapFebGregorianYear(cfg, year, anchor.getFullYear());
  const lens = cfg.lengths.map((l, i) => (i === cfg.leapExtraMonthIdx && isLeap(febGy) ? l + 1 : l));
  if (day > lens[mi]) return null;
  let offset = 0;
  for (let i = 0; i < mi; i++) offset += lens[i];
  return new Date(anchor.getTime() + (offset + day - 1) * 86400000);
}

function fixedYearStart(year: number, cfg: FixedMonthConfig, cal: RegionalCalendar): Date | null {
  void cal;
  // The regional year `year` begins on cfg.starts[0] of some Gregorian year.
  // yearForDate is monotonic; binary search the Gregorian year.
  let lo = year - 2000;
  let hi = year - 1000;
  for (let i = 0; i < 40; i++) {
    const mid = Math.floor((lo + hi) / 2);
    const probe = new Date(mid, cfg.starts[0][0] - 1, cfg.starts[0][1]);
    const y = cfg.yearForDate(probe);
    if (y < year) lo = mid + 1;
    else if (y > year) hi = mid - 1;
    else return probe;
  }
  return null;
}

function fixedMonthRange(
  year: number, month: number, cfg: FixedMonthConfig, cal: RegionalCalendar
): { start: Date; end: Date } {
  const start = fixedFromRegional(year, month, 1, cfg, cal)!;
  const anchor = fixedYearStart(year, cfg, cal)!;
  const febGy = leapFebGregorianYear(cfg, year, anchor.getFullYear());
  const lens = cfg.lengths.map((l, i) => (i === cfg.leapExtraMonthIdx && isLeap(febGy) ? l + 1 : l));
  return { start, end: new Date(start.getTime() + (lens[month - 1] - 1) * 86400000) };
}

/* ------------------------------------------------------------------ */
/* Generic sankranti-based sidereal solar calendar                     */
/* ------------------------------------------------------------------ */

interface SankrantiConfig {
  /** boundary degree (0=Mesha …) at which the calendar year starts */
  startDegree: number;
  /** Gregorian [month, day] near which the new-year sankranti falls */
  anchor: [number, number];
  /** calendarYear = gregorianYear + offset (evaluated just after the new-year sankranti) */
  offset: number;
}

function sankrantiBoundaries(calYear: number, cfg: SankrantiConfig): Date[] {
  // Gregorian year containing the new-year sankranti
  const gy = calYear - cfg.offset;
  const anchor = new Date(gy, cfg.anchor[0] - 1, cfg.anchor[1], 12, 0, 0);
  const out: Date[] = [];
  for (let k = 0; k <= 12; k++) {
    const deg = cfg.startDegree + k * 30;
    const approx = new Date(anchor.getTime() + k * 30.4375 * 86400000);
    out.push(sankrantiNear(deg, approx));
  }
  return out;
}

function sankrantiYearForDate(date: Date, cfg: SankrantiConfig): number {
  const gy = date.getFullYear();
  for (const cand of [gy + cfg.offset, gy + cfg.offset - 1, gy + cfg.offset + 1]) {
    const b = sankrantiBoundaries(cand, cfg);
    const d = startOfDay(date);
    if (d >= b[0] && d < b[12]) return cand;
  }
  return gy + cfg.offset;
}

function makeSankrantiCalendar(
  def: Omit<RegionalCalendar, 'toRegional' | 'fromRegional' | 'monthRange' | 'toNumerals'> & {
    toNumerals: RegionalCalendar['toNumerals'];
  },
  cfg: SankrantiConfig
): RegionalCalendar {
  return {
    ...def,
    toRegional(date: Date): RegionalDate {
      const year = sankrantiYearForDate(date, cfg);
      const b = sankrantiBoundaries(year, cfg);
      const d = startOfDay(date);
      for (let mi = 0; mi < 12; mi++) {
        if (d >= b[mi] && d < b[mi + 1]) {
          const day = Math.round((d.getTime() - b[mi].getTime()) / 86400000) + 1;
          const m = def.months[mi];
          return {
            year, month: mi + 1, monthEn: m.en, monthNative: m.native,
            day, kind: 'solar', era: def.era, eraNative: def.eraNative,
          };
        }
      }
      const m = def.months[0];
      return { year, month: 1, monthEn: m.en, monthNative: m.native, day: 1, kind: 'solar', era: def.era, eraNative: def.eraNative };
    },
    fromRegional(year: number, month: number, day: number): Date | null {
      const mi = month - 1;
      if (mi < 0 || mi > 11 || day < 1) return null;
      const b = sankrantiBoundaries(year, cfg);
      const len = Math.round((b[mi + 1].getTime() - b[mi].getTime()) / 86400000);
      if (day > len) return null;
      return new Date(b[mi].getTime() + (day - 1) * 86400000);
    },
    monthRange(year: number, month: number) {
      const b = sankrantiBoundaries(year, cfg);
      const mi = month - 1;
      return { start: new Date(b[mi]), end: new Date(b[mi + 1].getTime() - 86400000) };
    },
  };
}

/* ------------------------------------------------------------------ */
/* Lunar calendars (Vikram Samvat, Shalivahana Shaka)                  */
/* ------------------------------------------------------------------ */

const LUNAR_MONTH_ORDER = [
  'Chaitra', 'Vaishakha', 'Jyeshtha', 'Ashadha', 'Shravana', 'Bhadrapada',
  'Ashwin', 'Kartika', 'Margashirsha', 'Pausha', 'Magha', 'Phalguna',
];

interface LunarInfo {
  lunarMonthIdx: number; // 0=Chaitra
  paksha: 'Shukla' | 'Krishna';
  tithiNumber: number;
  tithiFull: string;
}

/**
 * Lunar info — Drik Siddhanta ONLY. The legacy mean-motion engine drifted
 * ~2 tithis and caused self-contradictory displays; it must never be used
 * for tithi/paksha here.
 */
function lunarInfo(date: Date, school: LunarSchool): LunarInfo {
  const t = drikTithiAt(date);
  const lm = drikLunarMonth(date, school);
  return {
    lunarMonthIdx: lm.index,
    paksha: t.paksha,
    tithiNumber: t.tithiNumber,
    tithiFull: `${t.paksha} ${t.name}`,
  };
}

function makeLunarCalendar(
  def: Omit<RegionalCalendar, 'toRegional' | 'fromRegional' | 'monthRange' | 'toNumerals'> & {
    toNumerals: RegionalCalendar['toNumerals'];
    months: MonthDef[];
    lunarSchool?: LunarSchool;
  },
  yearRule: (gy: number, li: LunarInfo) => number
): RegionalCalendar {
  const cal = {
    ...def,
    toRegional(date: Date): RegionalDate {
      const school: LunarSchool = cal.lunarSchool || 'purnimanta';
      const li = lunarInfo(date, school);
      const lm = drikLunarMonth(date, school);
      const year = yearRule(date.getFullYear(), li);
      const m = def.months[lm.index];
      return {
        year, month: lm.index + 1, monthEn: m.en, monthNative: m.native,
        day: li.tithiNumber, kind: 'lunar', paksha: li.paksha, tithiName: li.tithiFull,
        era: def.era, eraNative: def.eraNative,
      };
    },
    fromRegional(): Date | null {
      // Lunar reverse lookup is approximate; calendar grid uses monthRange scan.
      return null;
    },
    monthRange(year: number, month: number) {
      // Scan for the contiguous run of this lunar month near the expected time.
      const mi = month - 1;
      const targetName = LUNAR_MONTH_ORDER[mi];
      const school: LunarSchool = cal.lunarSchool || 'purnimanta';
      // Seed: lunar month M of `year` falls ~ (M)*29.5 days after Chaitra Shukla Pratipada (~late Mar)
      const approxNewYear = new Date(yearAnchorGy(year, def.id), 2, 25); // ~Mar 25
      let start: Date | null = null;
      let end: Date | null = null;
      for (let off = -40; off <= 400; off++) {
        const d = new Date(approxNewYear.getTime() + off * 86400000);
        const li = lunarInfo(d, school);
        const y = yearRule(d.getFullYear(), li);
        if (y === year && LUNAR_MONTH_ORDER[li.lunarMonthIdx] === targetName) {
          if (!start) start = startOfDay(d);
          end = startOfDay(d);
        } else if (start && end) {
          break;
        }
      }
      if (start && end) return { start, end };
      const s = new Date(approxNewYear);
      return { start: s, end: new Date(s.getTime() + 29 * 86400000) };
    },
  };
  return cal;
}

function yearAnchorGy(year: number, id: string): number {
  // Gregorian year in which the lunar new year of `year` falls (approx)
  if (id === 'vikram') return year - 57;
  return year + 78; // shaka
}

/* ------------------------------------------------------------------ */
/* Calendar definitions                                                */
/* ------------------------------------------------------------------ */

const bnMonths = (variant: BengaliVariant): MonthDef[] =>
  BENGALI_MONTHS.map((m) => ({ en: m.en, native: m.bn }));

const bengaliBd: RegionalCalendar = {
  id: 'bengali_bd',
  nameEn: 'Bengali (Bangladesh)',
  nameNative: 'বাংলা (বাংলাদেশ)',
  regionEn: 'Bengal — Bangladesh',
  kind: 'solar',
  months: bnMonths('bd'),
  era: 'Bongabdo',
  eraNative: 'বঙ্গাব্দ',
  newYearNoteEn: 'Pohela Boishakh — 14 April (fixed)',
  newYearNoteNative: 'পহেলা বৈশাখ — ১৪ এপ্রিল',
  toNumerals: makeNumerals(NUMERALS.bengali),
  toRegional(date) {
    const b = bengaliConvert(date, 'bd');
    return {
      year: b.year, month: b.month, monthEn: b.monthEn, monthNative: b.monthBn,
      day: b.day, kind: 'solar', era: 'Bongabdo', eraNative: 'বঙ্গাব্দ',
    };
  },
  fromRegional: (y, m, d) => bengaliReverse(y, m, d, 'bd'),
  monthRange: (y, m) => bengaliRange(y, m, 'bd'),
};

const bengaliWb: RegionalCalendar = {
  id: 'bengali_wb',
  nameEn: 'Bengali (West Bengal)',
  nameNative: 'বাংলা (পশ্চিমবঙ্গ)',
  regionEn: 'Bengal — West Bengal, Tripura, Assam (Barak)',
  kind: 'solar',
  months: bnMonths('wb'),
  era: 'Bongabdo',
  eraNative: 'বঙ্গাব্দ',
  newYearNoteEn: 'Pohela Boishakh — Mesha Sankranti (~14 April)',
  newYearNoteNative: 'পহেলা বৈশাখ — মেষ সংক্রান্তি',
  toNumerals: makeNumerals(NUMERALS.bengali),
  disclaimerEn: 'Traditional sidereal-solar calendar; dates may differ ±1 day from printed panjikas.',
  toRegional(date) {
    const b = bengaliConvert(date, 'wb');
    return {
      year: b.year, month: b.month, monthEn: b.monthEn, monthNative: b.monthBn,
      day: b.day, kind: 'solar', era: 'Bongabdo', eraNative: 'বঙ্গাব্দ',
    };
  },
  fromRegional: (y, m, d) => bengaliReverse(y, m, d, 'wb'),
  monthRange: (y, m) => bengaliRange(y, m, 'wb'),
};

const tamil = makeSankrantiCalendar(
  {
    id: 'tamil',
    nameEn: 'Tamil',
    nameNative: 'தமிழ்',
    regionEn: 'Tamil Nadu',
    kind: 'solar',
    months: [
      { en: 'Chithirai', native: 'சித்திரை' }, { en: 'Vaikasi', native: 'வைகாசி' },
      { en: 'Aani', native: 'ஆனி' }, { en: 'Aadi', native: 'ஆடி' },
      { en: 'Avani', native: 'ஆவணி' }, { en: 'Purattasi', native: 'புரட்டாசி' },
      { en: 'Aippasi', native: 'ஐப்பசி' }, { en: 'Karthigai', native: 'கார்த்திகை' },
      { en: 'Margazhi', native: 'மார்கழி' }, { en: 'Thai', native: 'தை' },
      { en: 'Masi', native: 'மாசி' }, { en: 'Panguni', native: 'பங்குனி' },
    ],
    era: 'Tiruvalluvar Aandu',
    eraNative: 'திருவள்ளுவர் ஆண்டு',
    newYearNoteEn: 'Puthandu — Chithirai 1, Mesha Sankranti (~14 April)',
    newYearNoteNative: 'புத்தாண்டு — சித்திரை 1',
    // Tamil digits (௦௧௨…) render as tofu where the font lacks glyphs —
    // fall back to Western digits rather than show broken text.
    toNumerals: (n: number | string): string => String(n),
    disclaimerEn: 'Tiruvalluvar era (CE + 31) is the Tamil Nadu official reckoning.',
  },
  { startDegree: 0, anchor: [4, 14], offset: 31 }
);

const malayalam = makeSankrantiCalendar(
  {
    id: 'malayalam',
    nameEn: 'Malayalam (Kollam)',
    nameNative: 'മലയാളം (കൊല്ലവർഷം)',
    regionEn: 'Kerala',
    kind: 'solar',
    months: [
      { en: 'Chingam', native: 'ചിങ്ങം' }, { en: 'Kanni', native: 'കന്നി' },
      { en: 'Thulam', native: 'തുലാം' }, { en: 'Vrishchikam', native: 'വൃശ്ചികം' },
      { en: 'Dhanu', native: 'ധനു' }, { en: 'Makaram', native: 'മകരം' },
      { en: 'Kumbham', native: 'കുംഭം' }, { en: 'Meenam', native: 'മീനം' },
      { en: 'Medam', native: 'മേടം' }, { en: 'Idavam', native: 'ഇടവം' },
      { en: 'Mithunam', native: 'മിഥുനം' }, { en: 'Karkidakam', native: 'കർക്കടകം' },
    ],
    era: 'Kollam Era',
    eraNative: 'കൊല്ലവർഷം',
    newYearNoteEn: 'Chingam 1 — Simha Sankranti (~17 August)',
    newYearNoteNative: 'ചിങ്ങം ൧ — ചിങ്ങ സംക്രാന്തി',
    toNumerals: makeNumerals(NUMERALS.malayalam),
  },
  { startDegree: 120, anchor: [8, 17], offset: -824 }
);

const odia = makeSankrantiCalendar(
  {
    id: 'odia',
    nameEn: 'Odia',
    nameNative: 'ଓଡ଼ିଆ',
    regionEn: 'Odisha',
    kind: 'solar',
    months: [
      { en: 'Baisakha', native: 'ବୈଶାଖ' }, { en: 'Jyestha', native: 'ଜ୍ୟେଷ୍ଠ' },
      { en: 'Asadha', native: 'ଆଷାଢ଼' }, { en: 'Srabana', native: 'ଶ୍ରାବଣ' },
      { en: 'Bhadraba', native: 'ଭାଦ୍ରବ' }, { en: 'Aswina', native: 'ଆଶ୍ୱିନ' },
      { en: 'Kartika', native: 'କାର୍ତ୍ତିକ' }, { en: 'Margasira', native: 'ମାର୍ଗଶିର' },
      { en: 'Pausa', native: 'ପୌଷ' }, { en: 'Magha', native: 'ମାଘ' },
      { en: 'Phalguna', native: 'ଫାଲ୍ଗୁନ' }, { en: 'Chaitra', native: 'ଚୈତ୍ର' },
    ],
    era: 'Common Era',
    eraNative: 'ଖ୍ରୀଷ୍ଟାବ୍ଦ',
    newYearNoteEn: 'Pana Sankranti — Mesha Sankranti (~14 April)',
    newYearNoteNative: 'ପଣା ସଂକ୍ରାନ୍ତି — ମେଷ ସଂକ୍ରାନ୍ତି',
    toNumerals: makeNumerals(NUMERALS.odia),
    disclaimerEn: 'Odia panjika traditionally follows the 60-year cycle; Common Era year shown.',
  },
  { startDegree: 0, anchor: [4, 14], offset: 0 }
);

const assamese = makeSankrantiCalendar(
  {
    id: 'assamese',
    nameEn: 'Assamese (Bhaskarabda)',
    nameNative: 'অসমীয়া (ভাস্কৰাব্দ)',
    regionEn: 'Assam',
    kind: 'solar',
    months: [
      { en: 'Bohag', native: 'বহাগ' }, { en: 'Jeth', native: 'জেঠ' },
      { en: 'Aahar', native: 'আহাৰ' }, { en: 'Xaon', native: 'শাওণ' },
      { en: 'Bhad', native: 'ভাদ' }, { en: 'Aahin', native: 'আহিন' },
      { en: 'Kati', native: 'কাতি' }, { en: 'Aghun', native: 'আঘোণ' },
      { en: 'Puh', native: 'পুহ' }, { en: 'Magh', native: 'মাঘ' },
      { en: 'Phagun', native: 'ফাগুন' }, { en: 'Sot', native: "চ'ত" },
    ],
    era: 'Bhaskarabda',
    eraNative: 'ভাস্কৰাব্দ',
    newYearNoteEn: 'Bohag Bihu — Mesha Sankranti (~14 April)',
    newYearNoteNative: 'বহাগ বিহু — মেষ সংক্রান্তি',
    toNumerals: makeNumerals(NUMERALS.bengali),
  },
  { startDegree: 0, anchor: [4, 14], offset: -593 }
);

const nepali = makeSankrantiCalendar(
  {
    id: 'nepali',
    nameEn: 'Nepali (Bikram Sambat)',
    nameNative: 'नेपाली (विक्रम संवत्)',
    regionEn: 'Nepal',
    kind: 'solar',
    months: [
      { en: 'Baisakh', native: 'बैशाख' }, { en: 'Jestha', native: 'जेठ' },
      { en: 'Ashadh', native: 'असार' }, { en: 'Shrawan', native: 'साउन' },
      { en: 'Bhadra', native: 'भदौ' }, { en: 'Ashwin', native: 'असोज' },
      { en: 'Kartik', native: 'कात्तिक' }, { en: 'Mangsir', native: 'मंसिर' },
      { en: 'Poush', native: 'पुस' }, { en: 'Magh', native: 'माघ' },
      { en: 'Falgun', native: 'फागुन' }, { en: 'Chaitra', native: 'चैत' },
    ],
    era: 'Bikram Sambat',
    eraNative: 'विक्रम संवत्',
    newYearNoteEn: 'Nawa Barsha — Mesha Sankranti (~14 April)',
    newYearNoteNative: 'नववर्ष — मेष सङ्क्रान्ति',
    toNumerals: makeNumerals(NUMERALS.devanagari),
    disclaimerEn: "Nepal's official calendar is government-published; astronomical dates here may differ ±1–2 days.",
  },
  { startDegree: 0, anchor: [4, 14], offset: 57 }
);

/* Nanakshahi (fixed) — verified table (Wikipedia/SGPC):
 * Chet Mar14(31), Vaisakh Apr14(31), Jeth May15(31), Harh Jun15(31),
 * Sawan Jul16(31), Bhadon Aug16(30), Assu Sep15(30), Katak Oct15(30),
 * Maghar Nov14(30), Poh Dec14(30), Magh Jan13(30), Phagun Feb12(30/31 leap) */
const NANAKSHAHI_CFG: FixedMonthConfig = {
  starts: [
    [3, 14], [4, 14], [5, 15], [6, 15], [7, 16], [8, 16],
    [9, 15], [10, 15], [11, 14], [12, 14], [1, 13], [2, 12],
  ],
  lengths: [31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 30, 30],
  leapExtraMonthIdx: 11,
  yearForDate: (d: Date): number => {
    const gy = d.getFullYear();
    const gm = d.getMonth() + 1;
    const gd = d.getDate();
    return gm > 3 || (gm === 3 && gd >= 14) ? gy - 1468 : gy - 1469;
  },
};

const punjabiDef = {
  id: 'punjabi',
  nameEn: 'Punjabi (Nanakshahi)',
  nameNative: 'ਪੰਜਾਬੀ (ਨਾਨਕਸ਼ਾਹੀ)',
  regionEn: 'Punjab',
  kind: 'solar' as CalendarKind,
  months: [
    { en: 'Chet', native: 'ਚੇਤ' }, { en: 'Vaisakh', native: 'ਵੈਸਾਖ' },
    { en: 'Jeth', native: 'ਜੇਠ' }, { en: 'Harh', native: 'ਹਾੜ੍ਹ' },
    { en: 'Sawan', native: 'ਸਾਵਣ' }, { en: 'Bhadon', native: 'ਭਾਦੋਂ' },
    { en: 'Assu', native: 'ਅੱਸੂ' }, { en: 'Katak', native: 'ਕੱਤਕ' },
    { en: 'Maghar', native: 'ਮੱਘਰ' }, { en: 'Poh', native: 'ਪੋਹ' },
    { en: 'Magh', native: 'ਮਾਘ' }, { en: 'Phagun', native: 'ਫੱਗਣ' },
  ],
  era: 'Nanakshahi',
  eraNative: 'ਨਾਨਕਸ਼ਾਹੀ',
  newYearNoteEn: 'Chet 1 — 14 March (fixed)',
  newYearNoteNative: 'ਚੇਤ ੧ — ੧੪ ਮਾਰਚ',
  toNumerals: makeNumerals(NUMERALS.gurmukhi),
};

const punjabi: RegionalCalendar = {
  ...punjabiDef,
  toRegional: (date) => fixedToRegionalInner(date, NANAKSHAHI_CFG, punjabiDef as RegionalCalendar),
  fromRegional: (y, m, d) => fixedFromRegional(y, m, d, NANAKSHAHI_CFG, punjabiDef as RegionalCalendar),
  monthRange: (y, m) => fixedMonthRange(y, m, NANAKSHAHI_CFG, punjabiDef as RegionalCalendar),
};

/* Vikram Samvat (lunar, Chaitradi) */
const vikramMonths: MonthDef[] = [
  { en: 'Chaitra', native: 'चैत्र' }, { en: 'Vaishakha', native: 'वैशाख' },
  { en: 'Jyeshtha', native: 'ज्येष्ठ' }, { en: 'Ashadha', native: 'आषाढ़' },
  { en: 'Shravana', native: 'श्रावण' }, { en: 'Bhadrapada', native: 'भाद्रपद' },
  { en: 'Ashwin', native: 'आश्विन' }, { en: 'Kartika', native: 'कार्तिक' },
  { en: 'Margashirsha', native: 'मार्गशीर्ष' }, { en: 'Pausha', native: 'पौष' },
  { en: 'Magha', native: 'माघ' }, { en: 'Phalguna', native: 'फाल्गुन' },
];

const vikram = makeLunarCalendar(
  {
    id: 'vikram',
    nameEn: 'Vikram Samvat',
    nameNative: 'विक्रम संवत्',
    regionEn: 'North & West India',
    kind: 'lunar',
    months: vikramMonths,
    era: 'Vikram Samvat',
    eraNative: 'विक्रम संवत्',
    newYearNoteEn: 'Chaitra Shukla Pratipada — Gudi Padwa / Ugadi',
    newYearNoteNative: 'चैत्र शुक्ल प्रतिपदा — गुड़ी पड़वा',
    toNumerals: makeNumerals(NUMERALS.devanagari),
    disclaimerEn: 'Drik Siddhanta (Lahiri ayanamsa). Purnimanta by default — switch to Amanta in the Panjika tab if your tradition follows it.',
    lunarSchool: 'purnimanta',
  },
  (gy, li) => {
    if (li.lunarMonthIdx >= 1) return gy + 57; // Vaishakha..Phalguna
    return li.paksha === 'Shukla' ? gy + 57 : gy + 56; // Chaitra
  }
);

/* Shalivahana Shaka (lunar, Ugadi) — Telugu & Kannada */
const shaka = makeLunarCalendar(
  {
    id: 'shaka',
    nameEn: 'Shalivahana Shaka',
    nameNative: 'శాలివాహన శకము',
    regionEn: 'Andhra, Telangana, Karnataka',
    kind: 'lunar',
    months: [
      { en: 'Chaitra', native: 'చైత్ర' }, { en: 'Vaishakha', native: 'వైశాఖ' },
      { en: 'Jyeshtha', native: 'జ్యేష్ఠ' }, { en: 'Ashadha', native: 'ఆషాఢ' },
      { en: 'Shravana', native: 'శ్రావణ' }, { en: 'Bhadrapada', native: 'భాద్రపద' },
      { en: 'Ashwayuja', native: 'ఆశ్వయుజ' }, { en: 'Kartika', native: 'కార్తీక' },
      { en: 'Margashira', native: 'మార్గశిర' }, { en: 'Pushya', native: 'పుష్య' },
      { en: 'Magha', native: 'మాఘ' }, { en: 'Phalguna', native: 'ఫాల్గుణ' },
    ],
    era: 'Shalivahana Shaka',
    eraNative: 'శాలివాహన శకము',
    newYearNoteEn: 'Ugadi — Chaitra Shukla Pratipada',
    newYearNoteNative: 'ఉగాది — చైత్ర శుద్ధ పాడ్యమి',
    toNumerals: makeNumerals(NUMERALS.telugu),
    disclaimerEn: 'Drik Siddhanta (Lahiri ayanamsa). Amanta by default — switch to Purnimanta in the Panjika tab if your tradition follows it.',
    lunarSchool: 'amanta',
  },
  (gy, li) => {
    if (li.lunarMonthIdx >= 1) return gy - 78;
    return li.paksha === 'Shukla' ? gy - 78 : gy - 79;
  }
);

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

export const REGIONAL_CALENDARS: RegionalCalendar[] = [
  bengaliBd, bengaliWb, vikram, tamil, shaka, malayalam, odia, assamese, nepali, punjabi,
];

export function getCalendar(id: string): RegionalCalendar {
  return REGIONAL_CALENDARS.find((c) => c.id === id) || vikram;
}

/** Default tradition from geo region + app language. */
export function defaultCalendarId(region: 'BD' | 'IN' | 'INTL', lang: string): string {
  if (region === 'BD') return 'bengali_bd';
  switch (lang) {
    case 'bn': return 'bengali_wb';
    case 'ta': return 'tamil';
    case 'te':
    case 'kn': return 'shaka';
    case 'ml': return 'malayalam';
    default: return 'vikram';
  }
}

/** Pretty regional date line, e.g. "২৫ আশ্বিন ১৪৩৩ বঙ্গাব্দ". */
export function formatRegionalDate(rd: RegionalDate, cal: RegionalCalendar, script: 'native' | 'en' = 'native'): string {
  const day = script === 'native' ? cal.toNumerals(rd.day) : String(rd.day);
  const year = script === 'native' ? cal.toNumerals(rd.year) : String(rd.year);
  const month = script === 'native' ? rd.monthNative : rd.monthEn;
  const era = script === 'native' ? rd.eraNative : rd.era;
  if (rd.kind === 'lunar') {
    return `${rd.tithiName || month} ${year} ${era}`.trim();
  }
  return `${day} ${month} ${year} ${era}`.trim();
}

/** Month offset: calMonth 1 corresponds to which Mesha-start solar month (1-12). */
const MESHA_START_OF_CAL: Record<string, number> = {
  bengali_bd: 1, bengali_wb: 1, tamil: 1, odia: 1, assamese: 1, nepali: 1,
  vikram: 1, shaka: 1, malayalam: 5, punjabi: 12,
};

/** Name of a Mesha-start solar month (1=Mesha) in the given calendar's naming. */
export function meshaMonthName(calId: string, meshaMonth: number): string {
  const cal = getCalendar(calId);
  const start = MESHA_START_OF_CAL[calId] || 1;
  const idx = (meshaMonth - start + 12) % 12;
  return cal.months[idx].en;
}

// Re-export for convenience
export { formatBengaliDate, toBengaliNumerals };
export type { BengaliVariant };
