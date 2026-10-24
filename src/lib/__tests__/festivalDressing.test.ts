/**
 * festivalDressing.test.ts — VIBE B1 dressing resolver pins.
 * =====================================================================
 * REAL-DATE assertions against the shipped festival DB (the house
 * lesson: date features get real-date tests, never relative ones).
 * Every date below was read out of src/lib/panjikaFestivalData.ts:
 *   Saraswati Puja 2026-01-23 · Janmashtami 2026-09-04 ·
 *   Dhanteras 2026-11-06 · Diwali + Kali Puja 2026-11-08 ·
 *   Kojagari Lakshmi Puja 2026-10-25 · Holi 2026-03-04 ·
 *   Gandhi Jayanti (holiday) 2026-10-02 · plain day 2026-10-24.
 */
import {
  festivalDressingOn,
  localISO,
  type FestivalDressing,
} from '../festivalDressing';
import type { PanjikaFestival } from '../panjikaFestivals';

describe('festivalDressingOn — real DB dates', () => {
  it('dresses gold-deepened on Diwali day itself (2026-11-08)', () => {
    const d: FestivalDressing = festivalDressingOn('2026-11-08');
    expect(d.key).toBe('diwali');
    expect(d.festival?.nameEn).toMatch(/diwali|deepavali|kali puja/i);
  });

  it('opens the Diwali dressing at Dhanteras (2026-11-06)', () => {
    expect(festivalDressingOn('2026-11-06').key).toBe('diwali');
  });

  it('dresses peacock on Janmashtami (2026-09-04)', () => {
    const d = festivalDressingOn('2026-09-04');
    expect(d.key).toBe('janmashtami');
    expect(d.festival?.nameEn).toBe('Janmashtami');
  });

  it('dresses white-and-gold on Saraswati Puja (2026-01-23)', () => {
    const d = festivalDressingOn('2026-01-23');
    expect(d.key).toBe('saraswati');
    expect(d.festival?.nameEn).toBe('Saraswati Puja');
  });

  it('Kojagari Lakshmi Puja (2026-10-25) leads the greeting but does NOT wear Diwali dressing', () => {
    const d = festivalDressingOn('2026-10-25');
    expect(d.key).toBe('courtyard');
    expect(d.festival?.nameEn).toBe('Kojagari Lakshmi Puja');
  });

  it('an undressed festival (Holi, 2026-03-04) still leads the greeting in courtyard dress', () => {
    const d = festivalDressingOn('2026-03-04');
    expect(d.key).toBe('courtyard');
    expect(d.festival?.nameEn).toBe('Holi');
  });

  it('a civic holiday alone (Gandhi Jayanti, 2026-10-02) never leads and never dresses', () => {
    const d = festivalDressingOn('2026-10-02');
    expect(d.key).toBe('courtyard');
    expect(d.festival).toBeNull();
  });

  it('a plain day (2026-10-24) is courtyard with no lead festival', () => {
    const d = festivalDressingOn('2026-10-24');
    expect(d.key).toBe('courtyard');
    expect(d.festival).toBeNull();
  });

  it('a date outside the DB range degrades honestly (courtyard, no festival)', () => {
    const d = festivalDressingOn('2031-05-01');
    expect(d.key).toBe('courtyard');
    expect(d.festival).toBeNull();
  });
});

describe('festivalDressingOn — rule priority with a supplied list', () => {
  const mk = (nameEn: string, category: PanjikaFestival['category'] = 'puja'): PanjikaFestival => ({
    date: '2027-01-01',
    nameEn,
    nameBn: nameEn,
    significanceEn: '',
    significanceBn: '',
    category,
    variant: 'both',
    regions: [],
    confidence: 'single',
  });

  it('diwali outranks janmashtami when the DB lists both on one day', () => {
    const d = festivalDressingOn('2027-01-01', [mk('Janmashtami'), mk('Diwali / Deepavali', 'festival')]);
    expect(d.key).toBe('diwali');
  });

  it('a holiday entry never dresses even if its name matches a rule', () => {
    const d = festivalDressingOn('2027-01-01', [mk('Diwali', 'holiday')]);
    expect(d.key).toBe('courtyard');
    expect(d.festival).toBeNull();
  });
});

describe('localISO', () => {
  it('formats the local civil date with zero padding', () => {
    expect(localISO(new Date(2026, 10, 8, 23, 59))).toBe('2026-11-08');
    expect(localISO(new Date(2026, 0, 3, 0, 1))).toBe('2026-01-03');
  });
});
