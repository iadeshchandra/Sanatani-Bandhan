/**
 * utils/astrology/ashtakoot.ts — the REAL Ashtakoota Guna Milan engine.
 * ============================================================================
 * JY-FIX-B (JY-12). Replaces two fabrications the Jyotishi audit found:
 * the matrimony desk's fixed-score simulation (base 33/36 for nearly
 * every pair, three candidate names hardcoded) and the dead djb2-hash
 * "calculator" that used to live at utils/astrology/gunaMilan.ts
 * (deleted — it invented scores from a string hash).
 *
 * What this engine does, honestly:
 *  - Each partner's Moon nakshatra + rashi come either from names the
 *    desk already holds (its profile model stores nakshatra/rashi as
 *    strings), resolved against the canonical lists — or, for a true
 *    birth moment, from `birthNakshatra()`, which reads the Moon's
 *    sidereal longitude from the app's canonical astronomy
 *    (lib/drikPanchang — Lahiri ayanamsa; the same engine the panjika
 *    runs on). No second astronomy exists here.
 *  - The eight kootas are then scored from the classical tables:
 *    Varna 1 · Vashya 2 · Tara 3 · Yoni 4 · Graha Maitri 5 · Gana 6 ·
 *    Bhakoot 7 · Nadi 8 = 36. Every table below names its source
 *    tradition in a comment; where published digests disagree, the
 *    choice taken is stated, not hidden.
 *
 * Conventions:
 *  - Partner A is the groom/var side for the directional kootas
 *    (Varna, Vashya) — the classical tables are written groom-first.
 *    The matrimony desk compares the user (A) against a candidate (B).
 *  - Vashya's split signs (Dhanu, Makara) are resolved by the Moon's
 *    degree within the sign when a birth moment is used; the
 *    name-based path uses the first-half group (documented below).
 *  - Yoni's intermediate gradations (friendly 3 / neutral 2 / hostile
 *    1) vary between commentaries — Muhurta Chintamani's anchors are
 *    exact (same yoni 4, the seven mahavaira pairs 0); the friendly /
 *    hostile pairs encoded here are only those attested in published
 *    digests, and every other pair takes the neutral middle value 2.
 *    A documented conservative table — not an invented full matrix.
 *
 * This module is pure and jest-safe (drikPanchang is dependency-free).
 */
import {
  drikMoonLongitude,
  drikNakshatraAt,
  NAKSHATRA_NAMES,
} from '../../lib/drikPanchang';

export { NAKSHATRA_NAMES };

/** The 12 rashis, Sanskrit names in canonical order (index 0 = Mesha). */
export const RASHI_NAMES = [
  'Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya',
  'Tula', 'Vrischika', 'Dhanu', 'Makara', 'Kumbha', 'Meena',
] as const;

const RASHI_NAMES_EN = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

/** Resolve a nakshatra name ('Hasta', 'hasta ', 'Uttara Phalguni') → 0..26, or null. */
export function nakshatraIndexFromName(name: string | null | undefined): number | null {
  if (!name) return null;
  const norm = name.trim().toLowerCase();
  const i = NAKSHATRA_NAMES.findIndex((n) => n.toLowerCase() === norm);
  return i >= 0 ? i : null;
}

/**
 * Resolve a rashi as stored by the desk — 'Kanya (Virgo)', 'Mesha',
 * 'Virgo' — → 0..11, or null. The Sanskrit name before any parenthesis
 * is tried first, then the English sign name.
 */
export function rashiIndexFromName(name: string | null | undefined): number | null {
  if (!name) return null;
  const raw = name.trim();
  const sanskrit = raw.split('(')[0].trim().toLowerCase();
  let i = RASHI_NAMES.findIndex((n) => n.toLowerCase() === sanskrit);
  if (i >= 0) return i;
  const english = (raw.match(/\(([^)]+)\)/)?.[1] || raw).trim().toLowerCase();
  i = RASHI_NAMES_EN.findIndex((n) => n.toLowerCase() === english);
  return i >= 0 ? i : null;
}

/* ------------------------------------------------------------------ */
/* Birth moment → Moon nakshatra (canonical drik engine)               */
/* ------------------------------------------------------------------ */

export interface BirthNakshatra {
  nakshatraIndex: number;
  nakshatraName: string;
  /** 0..11 (Mesha = 0). */
  rashiIndex: number;
  /** Moon's degree within its sign, 0..30 — resolves Vashya halves. */
  moonDegreeInSign: number;
  /** Sidereal Moon longitude, 0..360. */
  moonLongitude: number;
}

/**
 * The Moon's nakshatra + rashi at a birth moment. `birthDate` is
 * 'YYYY-MM-DD' and `birthTime` 'HH:MM', read as wall-clock time at
 * `tzOffsetMinutes` east of UTC (default 330 = IST, the app's canonical
 * convention; Bangladesh = 360). Computed by the canonical drik engine
 * — the identical code path the panjika uses — so a birth nakshatra
 * can never disagree with the app's own panchang for that moment.
 */
export function birthNakshatra(
  birthDate: string,
  birthTime: string,
  tzOffsetMinutes = 330
): BirthNakshatra | null {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec((birthDate || '').trim());
  const tm = /^(\d{2}):(\d{2})/.exec((birthTime || '').trim());
  if (!dm || !tm) return null;
  const utcMs =
    Date.UTC(+dm[1], +dm[2] - 1, +dm[3], +tm[1], +tm[2]) - tzOffsetMinutes * 60000;
  const instant = new Date(utcMs);
  if (Number.isNaN(instant.getTime())) return null;
  const lon = drikMoonLongitude(instant);
  const nak = drikNakshatraAt(instant);
  return {
    nakshatraIndex: nak.index,
    nakshatraName: nak.name,
    rashiIndex: Math.floor(lon / 30) % 12,
    moonDegreeInSign: lon % 30,
    moonLongitude: lon,
  };
}

/* ------------------------------------------------------------------ */
/* Classical tables                                                    */
/* ------------------------------------------------------------------ */

/** Varna rank by Moon rashi (Brahmin 4 > Kshatriya 3 > Vaishya 2 > Shudra 1).
 *  Brahmin: Karka, Vrischika, Meena · Kshatriya: Mesha, Simha, Dhanu ·
 *  Vaishya: Vrishabha, Kanya, Makara · Shudra: Mithuna, Tula, Kumbha. */
const VARNA_RANK = [3, 2, 1, 4, 3, 2, 1, 4, 3, 2, 1, 4];

type VashyaGroup = 'chatushpada' | 'manava' | 'jalachara' | 'vanachara' | 'keeta';
const VASHYA_GROUPS: VashyaGroup[] = [
  'chatushpada', // Mesha
  'chatushpada', // Vrishabha
  'manava',      // Mithuna
  'jalachara',   // Karka
  'vanachara',   // Simha
  'manava',      // Kanya
  'manava',      // Tula
  'keeta',       // Vrischika
  'manava',      // Dhanu — 1st half Manava, 2nd half Chatushpada
  'chatushpada', // Makara — 1st half Chatushpada, 2nd half Jalachara
  'manava',      // Kumbha
  'jalachara',   // Meena
];

/** Vashya group, honouring the split signs when the Moon's degree is known. */
function vashyaGroup(rashiIndex: number, moonDegreeInSign?: number): VashyaGroup {
  if (moonDegreeInSign !== undefined && moonDegreeInSign >= 15) {
    if (rashiIndex === 8) return 'chatushpada'; // Dhanu 2nd half
    if (rashiIndex === 9) return 'jalachara';   // Makara 2nd half
  }
  return VASHYA_GROUPS[rashiIndex];
}

/** Directional Vashya matrix (rows = groom A, cols = bride B), the
 *  complete published 5×5 (findyourfate's BPHS-based grid). Column/row
 *  order: chatushpada, manava, jalachara, vanachara, keeta. */
const VASHYA_MATRIX: Record<VashyaGroup, Record<VashyaGroup, number>> = {
  chatushpada: { chatushpada: 2, manava: 0, jalachara: 0, vanachara: 0.5, keeta: 0 },
  manava:      { chatushpada: 1, manava: 2, jalachara: 1, vanachara: 0.5, keeta: 1 },
  jalachara:   { chatushpada: 0.5, manava: 1, jalachara: 2, vanachara: 1, keeta: 1 },
  vanachara:   { chatushpada: 0, manava: 0, jalachara: 0, vanachara: 2, keeta: 0 },
  keeta:       { chatushpada: 1, manava: 1, jalachara: 1, vanachara: 0, keeta: 2 },
};

/** Yoni animal per nakshatra (Muhurta Chintamani's verse mapping). */
const YONI_ANIMAL = [
  'Horse', 'Elephant', 'Sheep', 'Serpent', 'Serpent', 'Dog', 'Cat',
  'Sheep', 'Cat', 'Rat', 'Rat', 'Cow', 'Buffalo', 'Tiger', 'Buffalo',
  'Tiger', 'Deer', 'Deer', 'Dog', 'Monkey', 'Mongoose', 'Monkey',
  'Lion', 'Horse', 'Lion', 'Cow', 'Elephant',
];

/** The seven mahavaira (sworn-enemy) yoni pairs — score 0. */
const MAHAVAIRA_PAIRS = new Set(
  [
    ['Horse', 'Buffalo'], ['Elephant', 'Lion'], ['Sheep', 'Monkey'],
    ['Serpent', 'Mongoose'], ['Dog', 'Deer'], ['Cat', 'Rat'], ['Cow', 'Tiger'],
  ].map(([a, b]) => `${a}|${b}`)
);

/** Attested friendly pairs (score 3) from published digests — see the
 *  header note on Yoni's commentary variance. Symmetric closure. */
const YONI_FRIENDLY = new Set(
  [
    ['Horse', 'Serpent'], ['Cow', 'Buffalo'], ['Elephant', 'Sheep'],
    ['Buffalo', 'Elephant'], ['Buffalo', 'Sheep'], ['Cow', 'Sheep'],
    ['Monkey', 'Mongoose'],
  ].map(([a, b]) => `${a}|${b}`)
);

/** Attested hostile pairs (score 1) from published digests. */
const YONI_HOSTILE = new Set(
  [
    ['Cow', 'Horse'], ['Elephant', 'Tiger'], ['Tiger', 'Lion'],
    ['Buffalo', 'Lion'], ['Buffalo', 'Serpent'],
  ].map(([a, b]) => `${a}|${b}`)
);

function yoniPairKey(a: string, b: string): [string, string] {
  return [`${a}|${b}`, `${b}|${a}`];
}

function yoniScore(animalA: string, animalB: string): number {
  if (animalA === animalB) return 4;
  const [ab, ba] = yoniPairKey(animalA, animalB);
  if (MAHAVAIRA_PAIRS.has(ab) || MAHAVAIRA_PAIRS.has(ba)) return 0;
  if (YONI_FRIENDLY.has(ab) || YONI_FRIENDLY.has(ba)) return 3;
  if (YONI_HOSTILE.has(ab) || YONI_HOSTILE.has(ba)) return 1;
  return 2; // neutral — the commentaries' middle value (documented default)
}

/** Rashi lords in rashi order: Mars, Venus, Mercury, Moon, Sun, … */
const RASHI_LORD = [
  'Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury',
  'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter',
];

/** Natural friendships (naisargika maitri): planet → friends / enemies;
 *  anyone unlisted is neutral. The standard table (BPHS ch. 3). */
const PLANET_FRIENDS: Record<string, string[]> = {
  Sun: ['Moon', 'Mars', 'Jupiter'],
  Moon: ['Sun', 'Mercury'],
  Mars: ['Sun', 'Moon', 'Jupiter'],
  Mercury: ['Sun', 'Venus'],
  Jupiter: ['Sun', 'Moon', 'Mars'],
  Venus: ['Mercury', 'Saturn'],
  Saturn: ['Mercury', 'Venus'],
};
const PLANET_ENEMIES: Record<string, string[]> = {
  Sun: ['Venus', 'Saturn'],
  Moon: [],
  Mars: ['Mercury'],
  Mercury: ['Moon'],
  Jupiter: ['Mercury', 'Venus'],
  Venus: ['Sun', 'Moon'],
  Saturn: ['Sun', 'Moon', 'Mars'],
};

type PlanetRelation = 'friend' | 'neutral' | 'enemy';
function planetRelation(from: string, to: string): PlanetRelation {
  if (from === to) return 'friend';
  if (PLANET_FRIENDS[from]?.includes(to)) return 'friend';
  if (PLANET_ENEMIES[from]?.includes(to)) return 'enemy';
  return 'neutral';
}

/** The published gradation ladder for the two directional relations. */
function grahaMaitriScore(lordA: string, lordB: string): number {
  const ab = planetRelation(lordA, lordB);
  const ba = planetRelation(lordB, lordA);
  const key = [ab, ba].sort().join('+'); // order-insensitive pair key
  switch (key) {
    case 'friend+friend': return 5;
    case 'friend+neutral': return 4;
    case 'neutral+neutral': return 3;
    case 'enemy+friend': return 2;
    case 'enemy+neutral': return 1;
    default: return 0; // enemy+enemy
  }
}

/** Gana per nakshatra (the standard lists). */
const GANA: ('Deva' | 'Manushya' | 'Rakshasa')[] = [
  'Deva', 'Manushya', 'Rakshasa', 'Manushya', 'Deva', 'Manushya', 'Deva',
  'Deva', 'Rakshasa', 'Rakshasa', 'Manushya', 'Manushya', 'Deva',
  'Rakshasa', 'Deva', 'Rakshasa', 'Deva', 'Rakshasa', 'Rakshasa',
  'Manushya', 'Manushya', 'Deva', 'Rakshasa', 'Rakshasa', 'Manushya',
  'Manushya', 'Deva',
];

function ganaScore(a: string, b: string): number {
  if (a === b) return 6;
  const pair = [a, b].sort().join('+');
  if (pair === 'Deva+Manushya') return 5;
  if (pair === 'Manushya+Rakshasa') return 1;
  return 0; // Deva+Rakshasa
}

/** Nadi per nakshatra: Adi / Madhya / Antya (the standard lists). */
const NADI: ('Adi' | 'Madhya' | 'Antya')[] = [
  'Adi', 'Madhya', 'Antya', 'Antya', 'Madhya', 'Adi', 'Adi',
  'Madhya', 'Antya', 'Antya', 'Madhya', 'Adi', 'Adi',
  'Madhya', 'Antya', 'Antya', 'Madhya', 'Antya', 'Adi',
  'Madhya', 'Antya', 'Antya', 'Madhya', 'Adi', 'Adi', 'Madhya', 'Antya',
];

/** Tara in one direction: count inclusively from one nakshatra to the
 *  other; taras 3 (Vipat), 5 (Pratyari), 7 (Vadha) are inauspicious. */
function taraDirectionScore(fromNak: number, toNak: number): number {
  const count = ((toNak - fromNak) % 27 + 27) % 27 + 1; // 1..27 inclusive count
  const tara = ((count - 1) % 9) + 1;
  return tara === 3 || tara === 5 || tara === 7 ? 0 : 1.5;
}

/* ------------------------------------------------------------------ */
/* The computation                                                     */
/* ------------------------------------------------------------------ */

export interface AshtakootInput {
  nakshatraIndex: number; // 0..26
  rashiIndex: number; // 0..11
  /** Moon's degree within the sign (0..30) when known — Vashya halves. */
  moonDegreeInSign?: number;
}

export interface AshtakootResult {
  varna: number;
  vashya: number;
  tara: number;
  yoni: number;
  grahaMaitri: number;
  gana: number;
  bhakoot: number;
  nadi: number;
  total: number;
  maxTotal: 36;
}

/**
 * Score a pair. A = groom side (directional kootas), B = bride side.
 * Deterministic — same inputs, same score, always; every point traces
 * to a table above.
 */
export function computeAshtakoot(a: AshtakootInput, b: AshtakootInput): AshtakootResult {
  // 1 · Varna (1): groom's varna rank ≥ bride's.
  const varna = VARNA_RANK[a.rashiIndex] >= VARNA_RANK[b.rashiIndex] ? 1 : 0;

  // 2 · Vashya (2): directional group matrix.
  const vashya =
    VASHYA_MATRIX[vashyaGroup(a.rashiIndex, a.moonDegreeInSign)][
      vashyaGroup(b.rashiIndex, b.moonDegreeInSign)
    ];

  // 3 · Tara (3): both directions, 1.5 each when auspicious.
  const tara =
    taraDirectionScore(a.nakshatraIndex, b.nakshatraIndex) +
    taraDirectionScore(b.nakshatraIndex, a.nakshatraIndex);

  // 4 · Yoni (4): animal affinity.
  const yoni = yoniScore(YONI_ANIMAL[a.nakshatraIndex], YONI_ANIMAL[b.nakshatraIndex]);

  // 5 · Graha Maitri (5): friendship between the two Moon-sign lords.
  const grahaMaitri = grahaMaitriScore(RASHI_LORD[a.rashiIndex], RASHI_LORD[b.rashiIndex]);

  // 6 · Gana (6): temperament class grid.
  const gana = ganaScore(GANA[a.nakshatraIndex], GANA[b.nakshatraIndex]);

  // 7 · Bhakoot (7): the 6-8, 5-9 and 2-12 sign relationships score 0.
  const posAB = ((b.rashiIndex - a.rashiIndex) % 12 + 12) % 12 + 1;
  const posBA = ((a.rashiIndex - b.rashiIndex) % 12 + 12) % 12 + 1;
  const pair = [Math.min(posAB, posBA), Math.max(posAB, posBA)].join('-');
  const bhakoot = pair === '6-8' || pair === '5-9' || pair === '2-12' ? 0 : 7;

  // 8 · Nadi (8): same nadi scores 0 (Nadi dosha), different scores 8.
  const nadi = NADI[a.nakshatraIndex] === NADI[b.nakshatraIndex] ? 0 : 8;

  const total = varna + vashya + tara + yoni + grahaMaitri + gana + bhakoot + nadi;
  return { varna, vashya, tara, yoni, grahaMaitri, gana, bhakoot, nadi, total, maxTotal: 36 };
}
