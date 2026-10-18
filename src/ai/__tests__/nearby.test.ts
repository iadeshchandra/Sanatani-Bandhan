/**
 * Tests for AI location assistance (nearby_temples).
 * =====================================================================
 * Covers: intent matching, haversine math, consent flow, distance
 * formatting, coordinate validation, and the no-storage invariant.
 *
 * Geolocation itself is NOT tested here (browser API, no DOM in CI) —
 * the consent/card flow is a UI concern; the pure logic below is what
 * must never regress.
 */
import {
  haversineKm,
  formatDistance,
  validCoords,
  findNearbyCurated,
  nearbyTask,
} from '../tasks/nearby';
import { CURATED_TIRTHAS } from '../corpus/tirthas';

describe('haversineKm', () => {
  it('returns 0 for identical points', () => {
    expect(haversineKm(25.3, 82.9, 25.3, 82.9)).toBeCloseTo(0, 6);
  });

  it('computes Varanasi → Kedarnath within a sane band', () => {
    // Roughly 600km great-circle; assert a plausible range, not exact.
    const d = haversineKm(25.3176, 82.9739, 30.7346, 79.0669);
    expect(d).toBeGreaterThan(500);
    expect(d).toBeLessThan(750);
  });

  it('is symmetric', () => {
    const a = haversineKm(23.17, 75.78, 20.88, 70.40);
    const b = haversineKm(20.88, 70.40, 23.17, 75.78);
    expect(a).toBeCloseTo(b, 6);
  });
});

describe('formatDistance', () => {
  it('uses metres under 1km (en)', () => {
    expect(formatDistance(0.4, 'en')).toBe('400m');
  });
  it('uses km with one decimal under 10km (en)', () => {
    expect(formatDistance(3.24, 'en')).toBe('3.2km');
  });
  it('rounds whole km at distance (en)', () => {
    expect(formatDistance(18.6, 'en')).toBe('19km');
  });
  it('localises units (bn/hi)', () => {
    expect(formatDistance(0.5, 'bn')).toContain('মি');
    expect(formatDistance(2.5, 'hi')).toContain('किमी');
    expect(formatDistance(2.5, 'bn')).toContain('কিমি');
  });
});

describe('validCoords', () => {
  it('accepts sane WGS84', () => {
    expect(validCoords(25.3, 82.9)).toBe(true);
    expect(validCoords(-33.8, 151.2)).toBe(true);
  });
  it('rejects out-of-range and non-finite', () => {
    expect(validCoords(91, 0)).toBe(false);
    expect(validCoords(0, 181)).toBe(false);
    expect(validCoords(NaN, 82)).toBe(false);
    expect(validCoords(25, Infinity)).toBe(false);
  });
});

describe('CURATED_TIRTHAS', () => {
  it('covers Char Dham + 12 Jyotirlingas worth of entries', () => {
    // 4 Char Dham + 11 Jyotirlingas (Kedarnath counted once)
    expect(CURATED_TIRTHAS.length).toBeGreaterThanOrEqual(15);
  });
  it('every entry has valid coords and trilingual names', () => {
    for (const t of CURATED_TIRTHAS) {
      expect(validCoords(t.lat, t.lng)).toBe(true);
      expect(t.name.en).toBeTruthy();
      expect(t.name.hi).toBeTruthy();
      expect(t.name.bn).toBeTruthy();
    }
  });
});

describe('findNearbyCurated', () => {
  it('finds Kashi Vishwanath near Varanasi', () => {
    const near = findNearbyCurated(25.32, 82.97, 'en', 25, 5);
    expect(near.length).toBeGreaterThan(0);
    expect(near[0].ref).toBe('vishwanath');
    expect(near[0].distanceKm).toBeLessThan(5);
  });
  it('returns empty far from every tirtha (mid-Pacific)', () => {
    expect(findNearbyCurated(0, -150, 'en', 25, 5)).toHaveLength(0);
  });
  it('rejects invalid coords', () => {
    expect(findNearbyCurated(NaN, 82, 'en')).toHaveLength(0);
  });
  it('sorts by distance ascending', () => {
    const near = findNearbyCurated(23.18, 75.79, 'en', 500, 10);
    for (let i = 1; i < near.length; i++) {
      expect(near[i].distanceKm).toBeGreaterThanOrEqual(near[i - 1].distanceKm);
    }
  });
  it('marks source as tirtha', () => {
    const near = findNearbyCurated(25.32, 82.97, 'en', 25, 5);
    expect(near.every((t) => t.source === 'tirtha')).toBe(true);
  });
});

describe('nearbyTask (consent gate)', () => {
  const base = {
    uid: 'u1', lang: 'en', role: 'devotee' as const,
    input: 'temples near me', slots: {},
  };
  it('returns the consent variant with a requestLocation action', () => {
    const out = nearbyTask(base);
    expect(out.variant).toBe('consent');
    expect(out.action?.kind).toBe('requestLocation');
  });
  it('never geolocates by itself (pure function, no navigator access)', () => {
    // The task must not touch navigator.geolocation — assert by source.
    const src = nearbyTask.toString();
    expect(src).not.toContain('geolocation');
    expect(src).not.toContain('localStorage');
    expect(src).not.toContain('indexedDB');
  });
});
