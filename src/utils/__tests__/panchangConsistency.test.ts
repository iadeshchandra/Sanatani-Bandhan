/**
 * QUEUED #52 (audit D12): ONE day, ONE tithi — everywhere.
 *
 * The audit (2026-10-20, same device, same day): the Mandir Rituals
 * desk showed Tithi Shukla Navami / Nakshatra Shravana while the
 * dashboard + home showed Shukla Dashami / Dhanishta. Root cause:
 * calculateDailyPanchang evaluated the lunar fields at whatever
 * instant each caller passed (the booking desk passed local noon,
 * the dashboards passed the current moment), so a mid-day tithi /
 * nakshatra change split the surfaces.
 *
 * The canonical convention (already used by PanjikaTab): the day's
 * lunar fields are those at LOCAL SUNRISE; the headline nakshatra is
 * the daylight-majority one (drikDayNakshatra). These tests pin that
 * every instant of a civil day yields identical lunar fields, and
 * that they equal an independent sunrise-anchored computation.
 */
import {
  calculateDailyPanchang,
  calculateSunriseSunset,
  panchangTodayLine,
} from '../panchang';
import { drikDayNakshatra, drikSnapshot, drikTithiAt } from '../../lib/drikPanchang';

const LAT = 25.3176; // Varanasi — the app's canonical place
const LON = 82.9739;
const TZ = 5.5;

/** Local-constructor instants spread across one civil day. */
const dayAt = (y: number, m: number, d: number, h: number, min = 0) => new Date(y, m, d, h, min);

const DAY_INSTANTS = [
  dayAt(2026, 9, 20, 0, 30),
  dayAt(2026, 9, 20, 6, 0),
  dayAt(2026, 9, 20, 12, 0), // the booking desk's old noon anchor
  dayAt(2026, 9, 20, 18, 45), // the audit's evening dashboard moment
  dayAt(2026, 9, 20, 23, 30),
];

describe('calculateDailyPanchang — single-source day values (QUEUED #52)', () => {
  it('the audited divergence was real: instant tithis DID differ within 2026-10-20 IST', () => {
    const noonIst = new Date('2026-10-20T12:00:00+05:30');
    const eveningIst = new Date('2026-10-20T18:45:00+05:30');
    // Documents the bug's mechanism — raw-instant evaluation disagrees
    // with itself on this day (Navami at noon, Dashami by evening).
    expect(drikTithiAt(noonIst).name).not.toBe(drikTithiAt(eveningIst).name);
  });

  it('returns identical lunar fields for every instant of the audited day', () => {
    const results = DAY_INSTANTS.map((d) => calculateDailyPanchang(d, LAT, LON, TZ));
    const first = results[0];
    // The sunrise-anchored truth for 2026-10-20 (Varanasi): the tithi at
    // sunrise is Shukla Navami (it ends ~13:00 IST) and Shravana holds
    // nearly all the daylight (Dhanishta begins ~19:00 IST) — the values
    // the booking desk showed, now the values EVERY surface shows.
    expect(first.tithi).toBe('Shukla Navami');
    expect(first.nakshatra).toBe('Shravana');
    for (const p of results) {
      expect(p.tithi).toBe(first.tithi);
      expect(p.tithiNumber).toBe(first.tithiNumber);
      expect(p.paksha).toBe(first.paksha);
      expect(p.nakshatra).toBe(first.nakshatra);
      expect(p.yoga).toBe(first.yoga);
      expect(p.karana).toBe(first.karana);
      expect(p.lunarMonth).toBe(first.lunarMonth);
      expect(p.vikramSamvat).toBe(first.vikramSamvat);
    }
  });

  it('anchors the day at sunrise — equals the PanjikaTab convention exactly', () => {
    for (const d of DAY_INSTANTS) {
      const p = calculateDailyPanchang(d, LAT, LON, TZ);
      const { sunriseDate, sunsetDate } = calculateSunriseSunset(d, LAT, LON, TZ);
      const snap = drikSnapshot(sunriseDate, 'purnimanta');
      expect(p.tithi).toBe(snap.tithiFullName);
      expect(p.yoga).toBe(snap.yoga);
      expect(p.karana).toBe(snap.karana);
      expect(p.lunarMonth).toBe(snap.lunarMonth);
      expect(p.nakshatra).toBe(drikDayNakshatra(sunriseDate, sunsetDate).name);
    }
  });

  it('stays consistent on other days too (incl. a boundary-heavy festival week)', () => {
    for (const [y, m, d] of [
      [2026, 9, 19],
      [2026, 9, 21],
      [2026, 0, 1],
      [2025, 11, 31],
    ] as const) {
      const morning = calculateDailyPanchang(dayAt(y, m, d, 7, 15), LAT, LON, TZ);
      const evening = calculateDailyPanchang(dayAt(y, m, d, 19, 15), LAT, LON, TZ);
      expect(evening.tithi).toBe(morning.tithi);
      expect(evening.nakshatra).toBe(morning.nakshatra);
    }
  });

  it('panchangTodayLine agrees at noon and in the evening of the same day', () => {
    const noon = panchangTodayLine(new Date('2026-10-20T12:00:00+05:30'));
    const evening = panchangTodayLine(new Date('2026-10-20T18:45:00+05:30'));
    expect(evening).toBe(noon);
    expect(noon).toContain('Vikram Samvat');
  });
});
