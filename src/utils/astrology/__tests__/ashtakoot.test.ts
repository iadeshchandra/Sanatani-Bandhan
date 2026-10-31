/**
 * ashtakoot.test.ts — JY-FIX-B pins for JY-12 (the real Guna Milan).
 * =====================================================================
 * The old desk logic was a fixed-score simulation: constants summing
 * to 33 for nearly every pair, with three candidate nakshatras
 * hardcoded (Rohini → a fabricated perfect 36, Pushya → 33, Shravana
 * → 24.5), the user's own nakshatra/rashi ignored entirely. The pairs
 * below are computed BY HAND from the classical tables (the workings
 * are in the staging NOTES.md) and pinned here — if the engine ever
 * drifts from the tables, these go red.
 *
 * The desk's own seed profiles are the fixtures: the karta is
 * Krittika / Mesha; the candidates are the desk's viv-1…viv-4.
 */
import {
  computeAshtakoot,
  birthNakshatra,
  nakshatraIndexFromName,
  rashiIndexFromName,
} from '../ashtakoot';
import { calculateDailyPanchang } from '../../panchang';

const KARTA = { nakshatraIndex: 2, rashiIndex: 0 }; // Krittika / Mesha

describe('JY-12 — hand-computed pairs (karta Krittika/Mesha)', () => {
  test('× Rohini / Vrishabha (viv-1) = 12 — not the fabricated 36', () => {
    // Nadi: Krittika AND Rohini are both Antya nadi → 0 (Nadi dosha).
    // (An early hand-sum misread Rohini as Madhya; the sourced list —
    // Antya: Krittika, Rohini, Ashlesha, Magha, Swati, Vishakha,
    // Uttara Ashadha, Shravana, Revati — arbitrates, and the engine
    // agrees with it. The cross-check doing its job.)
    const r = computeAshtakoot(KARTA, { nakshatraIndex: 3, rashiIndex: 1 });
    expect(r).toMatchObject({
      varna: 1, vashya: 2, tara: 3, yoni: 2,
      grahaMaitri: 3, gana: 1, bhakoot: 0, nadi: 0, total: 12,
    });
  });

  test('× Pushya / Karka (viv-2) = 24.5 — not the fabricated 33', () => {
    const r = computeAshtakoot(KARTA, { nakshatraIndex: 7, rashiIndex: 3 });
    expect(r).toMatchObject({
      varna: 0, vashya: 0, tara: 1.5, yoni: 4,
      grahaMaitri: 4, gana: 0, bhakoot: 7, nadi: 8, total: 24.5,
    });
  });

  test('× Hasta / Kanya (viv-3) = 16', () => {
    const r = computeAshtakoot(KARTA, { nakshatraIndex: 12, rashiIndex: 5 });
    expect(r).toMatchObject({
      varna: 1, vashya: 0, tara: 3, yoni: 3,
      grahaMaitri: 1, gana: 0, bhakoot: 0, nadi: 8, total: 16,
    });
  });

  test('× Shravana / Makara (viv-4) = 14 — not the fabricated 24.5', () => {
    const r = computeAshtakoot(KARTA, { nakshatraIndex: 21, rashiIndex: 9 });
    expect(r).toMatchObject({
      varna: 1, vashya: 2, tara: 3, yoni: 0,
      grahaMaitri: 1, gana: 0, bhakoot: 7, nadi: 0, total: 14,
    });
  });

  test('identical stars are NOT a perfect 36 — same nadi scores 0', () => {
    const r = computeAshtakoot(
      { nakshatraIndex: 3, rashiIndex: 1 },
      { nakshatraIndex: 3, rashiIndex: 1 }
    );
    expect(r.nadi).toBe(0);
    expect(r.total).toBe(28);
  });

  test('the engine is deterministic and symmetric-safe on totals', () => {
    const a = computeAshtakoot(KARTA, { nakshatraIndex: 12, rashiIndex: 5 });
    const b = computeAshtakoot(KARTA, { nakshatraIndex: 12, rashiIndex: 5 });
    expect(a).toEqual(b);
  });
});

describe('JY-12 — table spot checks', () => {
  test('mahavaira yoni pairs score 0 (Cat–Rat)', () => {
    // Punarvasu (Cat) × Magha (Rat), same rashi family aside.
    const r = computeAshtakoot({ nakshatraIndex: 6, rashiIndex: 2 }, { nakshatraIndex: 9, rashiIndex: 4 });
    expect(r.yoni).toBe(0);
  });

  test('same yoni scores 4 (Horse–Horse via different nakshatras)', () => {
    const r = computeAshtakoot({ nakshatraIndex: 0, rashiIndex: 0 }, { nakshatraIndex: 23, rashiIndex: 10 });
    expect(r.yoni).toBe(4);
  });

  test('Bhakoot dosha pairs (6-8, 5-9, 2-12) score 0; others 7', () => {
    const base = { nakshatraIndex: 0 };
    expect(computeAshtakoot({ ...base, rashiIndex: 0 }, { ...base, rashiIndex: 5 }).bhakoot).toBe(0); // 6-8
    expect(computeAshtakoot({ ...base, rashiIndex: 0 }, { ...base, rashiIndex: 4 }).bhakoot).toBe(0); // 5-9
    expect(computeAshtakoot({ ...base, rashiIndex: 0 }, { ...base, rashiIndex: 1 }).bhakoot).toBe(0); // 2-12
    expect(computeAshtakoot({ ...base, rashiIndex: 0 }, { ...base, rashiIndex: 3 }).bhakoot).toBe(7);
    expect(computeAshtakoot({ ...base, rashiIndex: 0 }, { ...base, rashiIndex: 0 }).bhakoot).toBe(7); // same sign
  });

  test('Vashya split signs resolve by Moon degree when known', () => {
    // Dhanu 1st half = Manava, 2nd half = Chatushpada; vs Mesha (Chatushpada):
    // Manava→Chatushpada = 1, Chatushpada→Chatushpada = 2.
    const first = computeAshtakoot(
      { nakshatraIndex: 19, rashiIndex: 8, moonDegreeInSign: 5 },
      { nakshatraIndex: 0, rashiIndex: 0 }
    );
    const second = computeAshtakoot(
      { nakshatraIndex: 19, rashiIndex: 8, moonDegreeInSign: 20 },
      { nakshatraIndex: 0, rashiIndex: 0 }
    );
    expect(first.vashya).toBe(1);
    expect(second.vashya).toBe(2);
  });

  test('an auspicious Tara in both directions scores the full 3', () => {
    // Krittika → Rohini is tara 2; Rohini → Krittika is tara 9.
    const r = computeAshtakoot(KARTA, { nakshatraIndex: 3, rashiIndex: 1 });
    expect(r.tara).toBe(3);
  });
});

describe('JY-12 — name resolution (the desk stores strings)', () => {
  test('nakshatra names resolve against the canonical list', () => {
    expect(nakshatraIndexFromName('Krittika')).toBe(2);
    expect(nakshatraIndexFromName(' hasta ')).toBe(12);
    expect(nakshatraIndexFromName('Uttara Phalguni')).toBe(11);
    expect(nakshatraIndexFromName('NotAStar')).toBeNull();
    expect(nakshatraIndexFromName('')).toBeNull();
  });

  test("rashi strings like 'Kanya (Virgo)' resolve by Sanskrit, then English", () => {
    expect(rashiIndexFromName('Mesha (Aries)')).toBe(0);
    expect(rashiIndexFromName('Kanya (Virgo)')).toBe(5);
    expect(rashiIndexFromName('Makara (Capricorn)')).toBe(9);
    expect(rashiIndexFromName('Virgo')).toBe(5);
    expect(rashiIndexFromName('Nowhere')).toBeNull();
  });
});

describe('JY-12 — birth nakshatra from the canonical drik engine', () => {
  test('agrees with the app panchang for the same day', () => {
    const b = birthNakshatra('2026-10-31', '10:00');
    expect(b).not.toBeNull();
    const panchang = calculateDailyPanchang(new Date(2026, 9, 31)) as any;
    expect(b!.nakshatraName).toBe(panchang.nakshatra);
    expect(b!.nakshatraName).toBe('Punarvasu');
    expect(b!.rashiIndex).toBe(2); // Mithuna
  });

  test('a second known moment: 2000-01-01 noon IST → Swati / Tula', () => {
    const b = birthNakshatra('2000-01-01', '12:00');
    expect(b!.nakshatraName).toBe('Swati');
    expect(b!.rashiIndex).toBe(6);
  });

  test('malformed input yields null, never a fabricated star', () => {
    expect(birthNakshatra('', '')).toBeNull();
    expect(birthNakshatra('31-10-2026', '10:00')).toBeNull();
  });
});
