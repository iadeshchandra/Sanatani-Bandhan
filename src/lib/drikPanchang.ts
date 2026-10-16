/**
 * drikPanchang.ts — Drik Siddhanta astronomical engine (Lahiri ayanamsa).
 * =====================================================================
 * The panjika module's DEFAULT astronomical engine. Uses low-precision
 * planetary theory (Schlyter) with the principal lunar perturbation terms:
 *   - Sun longitude accurate to ~0.01°
 *   - Moon longitude accurate to ~0.1° (≈ ±2–3 hours on tithi boundaries)
 * This is the Drik *method* (observable/sidereal, Lahiri ayanamsa), as
 * opposed to mean-longitude approximations. Where traditional schools
 * (e.g. Surya Siddhanta / Gupta Press) diverge, the UI labels both.
 *
 * All longitudes returned are SIDEREAL (nirayana) degrees in [0, 360).
 */

const RAD = Math.PI / 180;
const norm360 = (x: number): number => ((x % 360) + 360) % 360;
const sinD = (x: number): number => Math.sin(x * RAD);
const cosD = (x: number): number => Math.cos(x * RAD);

function julianDay(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

/** Lahiri ayanamsa in degrees. J2000 value 23°51'11.9", rate ~50.29"/yr. */
export function lahiriAyanamsa(date: Date): number {
  const d = julianDay(date) - 2451545.0; // days since J2000.0
  const fracYear = 2000 + d / 365.25;
  return 23.8533 + 0.013969 * (fracYear - 2000);
}

/** Sidereal (nirayana) Sun longitude, degrees [0,360). */
export function drikSunLongitude(date: Date): number {
  const d = julianDay(date) - 2451543.5;
  const w = 282.9404 + 4.70935e-5 * d;
  const e = 0.016709 - 1.151e-9 * d;
  const M = norm360(356.0470 + 0.9856002585 * d);
  // Solve Kepler's equation (two Newton iterations)
  let E = M + (180 / Math.PI) * e * sinD(M) * (1 + e * cosD(M));
  for (let k = 0; k < 2; k++) {
    E = E - (E - (180 / Math.PI) * e * sinD(E) - M) / (1 - e * cosD(E));
  }
  const x = cosD(E) - e;
  const y = sinD(E) * Math.sqrt(1 - e * e);
  const v = Math.atan2(y, x) / RAD;
  return norm360(norm360(v + w) - lahiriAyanamsa(date));
}

/** Sidereal (nirayana) Moon longitude, degrees [0,360). */
export function drikMoonLongitude(date: Date): number {
  const d = julianDay(date) - 2451543.5;
  const N = norm360(125.1228 - 0.0529538083 * d);
  const i = 5.1454;
  const w = norm360(318.0634 + 0.1643573223 * d);
  const a = 60.2666;
  const e = 0.054900;
  const M = norm360(115.3654 + 13.0649929509 * d);

  let E = M + (180 / Math.PI) * e * sinD(M) * (1 + e * cosD(M));
  for (let k = 0; k < 3; k++) {
    E = E - (E - (180 / Math.PI) * e * sinD(E) - M) / (1 - e * cosD(E));
  }
  const x = a * (cosD(E) - e);
  const y = a * Math.sqrt(1 - e * e) * sinD(E);
  const r = Math.sqrt(x * x + y * y);
  const v = Math.atan2(y, x) / RAD;
  const vw = v + w;
  const xh = r * (cosD(N) * cosD(vw) - sinD(N) * sinD(vw) * cosD(i));
  const yh = r * (sinD(N) * cosD(vw) + cosD(N) * sinD(vw) * cosD(i));
  let lon = Math.atan2(yh, xh) / RAD;

  // Principal perturbation terms (Schlyter)
  const Ms = norm360(356.0470 + 0.9856002585 * d);
  const Mm = M;
  const ws = 282.9404 + 4.70935e-5 * d;
  const Lm = norm360(N + w + Mm);
  const Dm = norm360(Lm - norm360(ws + Ms));
  const F = norm360(Lm - N);
  lon += -1.274 * sinD(Mm - 2 * Dm); // Evection (sign per Meeus/Brown: -1.274)
  lon += 0.658 * sinD(2 * Dm); // Variation
  lon -= 0.186 * sinD(Ms); // Yearly equation
  lon -= 0.059 * sinD(2 * Mm - 2 * Dm);
  lon -= 0.057 * sinD(Mm - 2 * Dm + Ms);
  lon += 0.053 * sinD(Mm + 2 * Dm);
  lon += 0.046 * sinD(2 * Dm - Ms);
  lon += 0.041 * sinD(Mm - Ms);
  lon -= 0.035 * sinD(Dm);
  lon -= 0.031 * sinD(Mm + Ms);
  lon -= 0.015 * sinD(2 * F - 2 * Dm);

  return norm360(lon - lahiriAyanamsa(date));
}

/* ------------------------------------------------------------------ */

export interface DrikTithi {
  /** 0–29 elongation index (0 = Amavasya moment, 14 = Purnima) */
  index: number;
  /** 1–15 within paksha */
  tithiNumber: number;
  paksha: 'Shukla' | 'Krishna';
  name: string;
}

const TITHI_NAMES = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima',
];

/** Tithi prevailing at the given moment (Drik). */
export function drikTithiAt(date: Date): DrikTithi {
  const elong = norm360(drikMoonLongitude(date) - drikSunLongitude(date));
  const index = Math.floor(elong / 12) % 30;
  const paksha: 'Shukla' | 'Krishna' = index < 15 ? 'Shukla' : 'Krishna';
  const tithiNumber = (index % 15) + 1;
  const name =
    tithiNumber === 15 ? (paksha === 'Shukla' ? 'Purnima' : 'Amavasya') : TITHI_NAMES[tithiNumber - 1];
  return { index, tithiNumber, paksha, name };
}

const NAKSHATRA_NAMES = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashirsha', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni',
  'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha',
  'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana',
  'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
];

/** Nakshatra prevailing at the given moment (Drik). */
export function drikNakshatraAt(date: Date): { index: number; name: string } {
  const index = Math.floor(drikMoonLongitude(date) / (360 / 27)) % 27;
  return { index, name: NAKSHATRA_NAMES[index] };
}

/**
 * The day's headline nakshatra: the one prevailing for the MAJORITY of the
 * daylight span (sunrise→sunset), with transition times.
 *
 * Why not sunrise-only: the Moon changes nakshatra roughly daily, and the
 * transition often falls mid-morning (e.g. Jyeshtha→Mula at 07:00 IST on
 * 2026-10-16). Consumer panjikas headline the dominant nakshatra of the
 * working day; moment-exact values remain available via drikNakshatraAt.
 */
export function drikDayNakshatra(
  sunrise: Date,
  sunset: Date
): { name: string; index: number; transitions: Array<{ name: string; at: Date }> } {
  const stepMs = 15 * 60000;
  const startMs = sunrise.getTime();
  const endMs = Math.max(sunset.getTime(), startMs + stepMs);
  const counts = new Map<number, number>();
  const transitions: Array<{ name: string; at: Date }> = [];
  let prevIdx = -1;
  for (let t = startMs; t <= endMs; t += stepMs) {
    const { index, name } = drikNakshatraAt(new Date(t));
    counts.set(index, (counts.get(index) || 0) + 1);
    if (index !== prevIdx) {
      transitions.push({ name, at: new Date(t) });
      prevIdx = index;
    }
  }
  let best = transitions[0];
  let bestCount = -1;
  for (const tr of transitions) {
    const idx = NAKSHATRA_NAMES.indexOf(tr.name);
    const c = counts.get(idx) || 0;
    if (c > bestCount) { bestCount = c; best = tr; }
  }
  return { name: best.name, index: NAKSHATRA_NAMES.indexOf(best.name), transitions };
}

/** Sun's sidereal rashi index at the moment (0 = Mesha). */
export function drikSunRashiAt(date: Date): number {
  return Math.floor(drikSunLongitude(date) / 30) % 12;
}

/* ------------------------------------------------------------------ */
/* Yoga & Karana — Drik                                               */
/* ------------------------------------------------------------------ */

const YOGA_NAMES = [
  'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Atiganda',
  'Sukarma', 'Dhriti', 'Shula', 'Ganda', 'Vriddhi', 'Dhruva', 'Vyaghata',
  'Harshana', 'Vajra', 'Siddhi', 'Vyatipata', 'Variyana', 'Parigha', 'Shiva',
  'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma', 'Indra', 'Vaidhriti',
];

/** Yoga prevailing at the given moment (Drik): (sun + moon) longitude / 13°20′. */
export function drikYogaAt(date: Date): { index: number; name: string } {
  const sum = norm360(drikSunLongitude(date) + drikMoonLongitude(date));
  const index = Math.floor(sum / (360 / 27)) % 27;
  return { index, name: YOGA_NAMES[index] };
}

const KARANA_REPEAT = ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Gara', 'Vanija', 'Vishti'];

/**
 * Karana prevailing at the given moment (Drik): half-tithi = 6° elongation.
 * Fixed karanas: Kimstughna (1st half of Shukla Pratipada), Shakuni (2nd half
 * of Krishna Chaturdashi), Chatushpada (1st half of Amavasya), Naga (2nd half
 * of Amavasya); the 7 repeating karanas cycle 8× in between.
 */
export function drikKaranaAt(date: Date): { index: number; name: string } {
  const elong = norm360(drikMoonLongitude(date) - drikSunLongitude(date));
  const idx = Math.floor(elong / 6) % 60;
  let name: string;
  if (idx === 0) name = 'Kimstughna';
  else if (idx === 57) name = 'Shakuni';
  else if (idx === 58) name = 'Chatushpada';
  else if (idx === 59) name = 'Naga';
  else name = KARANA_REPEAT[(idx - 1) % 7];
  return { index: idx, name };
}

/* ------------------------------------------------------------------ */
/* Lunar month — Amanta AND Purnimanta                                 */
/* ------------------------------------------------------------------ */

export type LunarSchool = 'amanta' | 'purnimanta';

function elongation(date: Date): number {
  return norm360(drikMoonLongitude(date) - drikSunLongitude(date));
}

/**
 * New-moon (Amavasya) *moment* nearest `from` in `direction`.
 * Coarse 24h scan + bisection. (~50 drik evaluations.)
 */
function findNewMoonMoment(from: Date, direction: 1 | -1): Date {
  const step = 24 * 3600000;
  let t = from.getTime();
  let ePrev = elongation(new Date(t));
  for (let k = 0; k < 32; k++) {
    const tNext = t + direction * step;
    const eNext = elongation(new Date(tNext));
    const crossed =
      direction === 1 ? ePrev > 300 && eNext < 60 : ePrev < 60 && eNext > 300;
    if (crossed) {
      let a = t;
      let b = tNext;
      for (let i = 0; i < 24; i++) {
        const m = (a + b) / 2;
        const eM = elongation(new Date(m));
        if (direction === 1) {
          if (eM > 300) a = m; else b = m;
        } else {
          if (eM < 60) a = m; else b = m;
        }
      }
      return new Date((a + b) / 2);
    }
    t = tNext;
    ePrev = eNext;
  }
  return from;
}

/** Rashi indices (0=Mesha) the Sun enters in (start, end]. */
function sankrantisBetween(start: Date, end: Date): number[] {
  const out: number[] = [];
  const step = 12 * 3600000;
  let t = start.getTime();
  const endT = end.getTime();
  let prevRashi = Math.floor(drikSunLongitude(new Date(t)) / 30) % 12;
  while (t < endT) {
    const tNext = Math.min(t + step, endT);
    const r = Math.floor(drikSunLongitude(new Date(tNext)) / 30) % 12;
    if (r !== prevRashi) {
      out.push(r);
      prevRashi = r;
    }
    t = tNext;
  }
  return out;
}

const lunarMonthCache = new Map<string, { index: number; name: string; adhika: boolean }>();
const cacheKey = (d: Date, school: LunarSchool) =>
  `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${school}`;

export const LUNAR_MONTHS_EN = [
  'Chaitra', 'Vaishakha', 'Jyeshtha', 'Ashadha', 'Shravana', 'Bhadrapada',
  'Ashwin', 'Kartika', 'Margashirsha', 'Pausha', 'Magha', 'Phalguna',
];

/**
 * Lunar month for the given moment and school — Drik, sankranti-based.
 *
 * Rule (mukhya-mana): an *amanta* lunar month runs Amavasya→Amavasya and is
 * named by the sankranti (Sun's rashi-ingress) falling within it; with no
 * transit it takes the first *upcoming* transit's name as Adhika. The
 * rashi→month correspondence is the identity (Mesha→Chaitra … Meena→Phalguna).
 *
 * Purnimanta: Shukla paksha keeps the amanta name; Krishna paksha takes the
 * NEXT month's name. E.g. Shivaratri = Magha-Krishna (amanta) =
 * Phalguna-Krishna (purnimanta).
 */
export function drikLunarMonth(
  date: Date,
  school: LunarSchool
): { index: number; name: string; adhika: boolean } {
  const key = cacheKey(date, school);
  const hit = lunarMonthCache.get(key);
  if (hit) return hit;

  const a1 = findNewMoonMoment(date, -1); // amanta month start (Amavasya)
  const a2 = findNewMoonMoment(date, 1); // amanta month end (Amavasya)
  const transits = sankrantisBetween(a1, a2);

  let rashi: number;
  let adhika = false;
  if (transits.length === 1) {
    rashi = transits[0];
  } else if (transits.length === 0) {
    // Adhika masa: named by the first upcoming transit
    const after = sankrantisBetween(a2, new Date(a2.getTime() + 32 * 86400000));
    rashi = after.length > 0 ? after[0] : Math.floor(drikSunLongitude(a2) / 30) % 12;
    adhika = true;
  } else {
    // Kshaya (two transits in one lunar month — very rare): take the first
    rashi = transits[0];
  }

  const t = drikTithiAt(date);
  let idx = rashi; // identity: Mesha→Chaitra … Meena→Phalguna
  if (school === 'purnimanta' && t.paksha === 'Krishna') {
    idx = (idx + 1) % 12;
  }
  const res = { index: idx, name: LUNAR_MONTHS_EN[idx], adhika };
  if (lunarMonthCache.size < 5000) lunarMonthCache.set(key, res);
  return res;
}

/** Convenience: full Drik snapshot for a moment. */
export function drikSnapshot(date: Date, school: LunarSchool = 'purnimanta') {
  const tithi = drikTithiAt(date);
  const nak = drikNakshatraAt(date);
  const lm = drikLunarMonth(date, school);
  const yoga = drikYogaAt(date);
  const karana = drikKaranaAt(date);
  return {
    tithi,
    nakshatra: nak.name,
    lunarMonth: lm.name,
    lunarMonthIndex: lm.index,
    tithiFullName: `${tithi.paksha} ${tithi.name}`,
    yoga: yoga.name,
    karana: karana.name,
  };
}

/**
 * Canonical "today" line for home screens — Drik tithi + lunar month +
 * Vikram Samvat year. The SINGLE source of truth for today's tithi;
 * never render tithi from the legacy mean-motion engine.
 */
export function drikTodayLine(date: Date, vikramYear: number, school: LunarSchool = 'purnimanta'): string {
  const t = drikTithiAt(date);
  const lm = drikLunarMonth(date, school);
  return `${t.paksha} ${t.name} • ${lm.name} • Vikram Samvat ${vikramYear}`;
}
