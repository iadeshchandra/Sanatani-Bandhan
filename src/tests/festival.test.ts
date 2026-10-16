/**
 * Festival war-room — core logic unit tests.
 * Covers: festival picker, countdown, footfall honesty (coarse rounding +
 * planning band), prasad unit conversion, roster gap severity, readiness,
 * RSVP validation, slot capacity.
 */
import {
  pickWarFestival,
  pickWarFestivals,
  projectFootfall,
  distributeFootfall,
  round50,
  prasadTotals,
  formatPrasadQty,
  rosterGaps,
  rosterFillPct,
  readinessScore,
  validateRsvp,
  slotRemaining,
  blankPlan,
  checklistDonePct,
  overdueChecklistItems,
  ROSTER_ROLES,
  ROSTER_SHIFTS,
  type WarFestival,
  type PrasadItem,
} from '../lib/festival';

describe('war-festival picker', () => {
  it('leads with the live festival, then up-next (Navratri live on 2026-10-17)', () => {
    const list = pickWarFestivals('2026-10-17');
    expect(list.length).toBeGreaterThanOrEqual(3);
    // Navratri (began 10-11, 9-day span) is live on 10-17 → first
    expect(list[0].matcherKey).toBe('navratri');
    expect(list[0].phase).toBe('live');
    expect(list[0].daysUntil).toBe(-6);
    // Then Dussehra (10-20) and Diwali (11-08), each family once
    expect(list[1].matcherKey).toBe('durga_puja');
    expect(list[1].dateISO).toBe('2026-10-20');
    expect(list[1].phase).toBe('countdown');
    expect(list[2].matcherKey).toBe('diwali');
    expect(list[2].dateISO).toBe('2026-11-08');
    const keys = list.map((w) => w.matcherKey);
    expect(new Set(keys).size).toBe(keys.length); // deduped families
  });

  it('pickWarFestival returns the primary (live-first) festival', () => {
    const wf = pickWarFestival('2026-10-17');
    expect(wf!.matcherKey).toBe('navratri');
    expect(wf!.phase).toBe('live');
  });

  it('picks Diwali 2026 once the Durga Puja span is over', () => {
    const wf = pickWarFestival('2026-10-25');
    expect(wf).not.toBeNull();
    expect(wf!.matcherKey).toBe('diwali');
    expect(wf!.dateISO).toBe('2026-11-08');
    expect(wf!.daysUntil).toBe(14);
    expect(wf!.phase).toBe('countdown');
    expect(wf!.key).toBe('diwali_2026-11-08');
    expect(wf!.days).toBe(5);
  });

  it('stays on a festival during its span instead of jumping ahead', () => {
    // Dussehra day itself → live
    expect(pickWarFestival('2026-10-20')!.phase).toBe('live');
    // Mid-Diwali (day 3 of 5) → still Diwali, live — never abandons mid-celebration
    const mid = pickWarFestival('2026-11-10');
    expect(mid!.matcherKey).toBe('diwali');
    expect(mid!.phase).toBe('live');
    expect(mid!.daysUntil).toBe(-2);
  });

  it('moves on after the span ends', () => {
    const after = pickWarFestival('2026-11-13');
    expect(after!.matcherKey).not.toBe('diwali');
  });

  it('carries a tithi-aware line (Diwali ≈ Amavasya, Dussehra ≈ Dashami)', () => {
    const diwali = pickWarFestival('2026-10-25')!;
    expect(diwali.tithiLine).toMatch(/Amavasya/);
    expect(diwali.tithiLine).toMatch(/Krishna/);
    const dussehra = pickWarFestivals('2026-10-17')[1]!;
    expect(dussehra.matcherKey).toBe('durga_puja');
    expect(dussehra.tithiLine).toMatch(/Dashami/);
    expect(dussehra.tithiLine).toMatch(/Shukla/);
  });

  it('prefers the canonical family name on a date tie (Diwali over Kali Puja)', () => {
    const list = pickWarFestivals('2026-10-17');
    const diwali = list.find((w) => w.matcherKey === 'diwali')!;
    expect(diwali.festival.nameEn).toBe('Diwali / Deepavali');
    expect(diwali.dateISO).toBe('2026-11-08');
  });

  it('returns null when the DB has no future major festival', () => {
    expect(pickWarFestival('2029-06-01')).toBeNull();
  });
});

describe('footfall planner — honest estimates', () => {
  it('projects last-year × growth, rounded to the nearest 50', () => {
    const p = projectFootfall({ lastYear: 4823, growthPct: 10 });
    expect(p.base).toBe(5300); // 5305.3 → 5300
    expect(p.assumptionsSet).toBe(true);
  });

  it('shows a ±20% planning band', () => {
    const p = projectFootfall({ lastYear: 5000, growthPct: 0 });
    expect(p.base).toBe(5000);
    expect(p.low).toBe(4000);
    expect(p.high).toBe(6000);
  });

  it('flags unset assumptions instead of inventing numbers', () => {
    const p = projectFootfall({ lastYear: 0, growthPct: 10 });
    expect(p.assumptionsSet).toBe(false);
    expect(p.base).toBe(0);
  });

  it('distributes across days with a heavier main day, parts summing to total', () => {
    const parts = distributeFootfall(5000, 5, 2);
    expect(parts.length).toBe(5);
    expect(parts.reduce((s, v) => s + v, 0)).toBe(5000);
    expect(parts[2]).toBeGreaterThan(parts[0]);
  });
});

describe('prasad planner', () => {
  const items: PrasadItem[] = [
    { id: 'a', name: { en: 'Laddu', bn: '', hi: '' }, perPersonQty: 2, unit: 'pc' },
    { id: 'b', name: { en: 'Khichuri', bn: '', hi: '' }, perPersonQty: 250, unit: 'g' },
    { id: 'c', name: { en: 'Charnamrita', bn: '', hi: '' }, perPersonQty: 50, unit: 'ml' },
  ];
  it('multiplies per-person qty by footfall with unit conversion', () => {
    const totals = prasadTotals(items, 5000);
    expect(totals[0].total).toBe(10000);
    expect(totals[0].display).toBe('10,000 pc');
    expect(totals[1].total).toBe(1250000);
    expect(totals[1].display).toBe('1,250 kg');
    expect(totals[2].total).toBe(250000);
    expect(totals[2].display).toBe('250 L');
  });

  it('keeps small quantities in base units', () => {
    expect(formatPrasadQty(500, 'g')).toBe('500 g');
    expect(formatPrasadQty(999, 'ml')).toBe('999 ml');
  });
});

describe('sevadar roster gaps', () => {
  it('flags ok / amber / red by coverage', () => {
    const assignments = [
      // crowd/morning: 6 needed, 6 assigned → ok
      ...Array.from({ length: 6 }, (_, i) => ({ id: `c${i}`, roleId: 'crowd', shiftId: 'morning', memberName: `V${i}` })),
      // prasad/morning: 4 needed, 2 assigned → amber
      ...Array.from({ length: 2 }, (_, i) => ({ id: `p${i}`, roleId: 'prasad', shiftId: 'morning', memberName: `W${i}` })),
      // cleaning/morning: 3 needed, 1 assigned → red
    ];
    const gaps = rosterGaps(ROSTER_ROLES, ROSTER_SHIFTS, assignments);
    const get = (r: string, s: string) => gaps.find((g) => g.roleId === r && g.shiftId === s)!;
    expect(get('crowd', 'morning').severity).toBe('ok');
    expect(get('prasad', 'morning').severity).toBe('amber');
    expect(get('cleaning', 'morning').severity).toBe('red');
    expect(get('cleaning', 'morning').gap).toBe(3);
  });

  it('fill % counts only up to needed (over-staffing does not inflate)', () => {
    const assignments = Array.from({ length: 100 }, (_, i) => ({
      id: `x${i}`, roleId: 'crowd', shiftId: 'morning', memberName: `V${i}`,
    }));
    const gaps = rosterGaps(ROSTER_ROLES, ROSTER_SHIFTS, assignments);
    expect(rosterFillPct(gaps)).toBeLessThanOrEqual(100);
  });
});

describe('readiness score', () => {
  it('weights checklist highest, sums to 100 when everything is ready', () => {
    expect(
      readinessScore({ checklistDonePct: 100, rosterFillPct: 100, budgetPlanned: true, prasadPlanned: true, footfallSet: true })
    ).toBe(100);
  });
  it('is zero when nothing is planned', () => {
    expect(
      readinessScore({ checklistDonePct: 0, rosterFillPct: 0, budgetPlanned: false, prasadPlanned: false, footfallSet: false })
    ).toBe(0);
  });
});

describe('RSVP + darshan slots', () => {
  it('validates name and headcount bounds', () => {
    expect(validateRsvp({ name: '', headcount: 2 })).toBe('name');
    expect(validateRsvp({ name: 'A', headcount: 2 })).toBe('name');
    expect(validateRsvp({ name: 'Anand', headcount: 0 })).toBe('headcount');
    expect(validateRsvp({ name: 'Anand', headcount: 21 })).toBe('headcount');
    expect(validateRsvp({ name: 'Anand', headcount: 4 })).toBeNull();
  });

  it('computes remaining slot capacity, never negative', () => {
    const slot = { id: 's1', label: { en: 'Morning', bn: '', hi: '' }, capacity: 50 };
    expect(slotRemaining(slot, {})).toBe(50);
    expect(slotRemaining(slot, { s1: 48 })).toBe(2);
    expect(slotRemaining(slot, { s1: 60 })).toBe(0);
  });
});

describe('checklist ops', () => {
  const template = {
    items: [
      { id: 't1', role: 'trustee' },
      { id: 't2', role: 'trustee' },
      { id: 'd1', role: 'devotee' },
    ],
  };
  it('counts only trustee items', () => {
    expect(checklistDonePct(template, { t1: { done: true } })).toBe(50);
  });
  it('surfaces overdue trustee items only', () => {
    const state = {
      t1: { done: false, dueDate: '2026-10-01' },
      t2: { done: false, dueDate: '2026-12-01' },
      d1: { done: false, dueDate: '2026-10-01' },
    };
    expect(overdueChecklistItems(template, state, '2026-10-17')).toEqual(['t1']);
  });
});

describe('blank plan', () => {
  it('seeds prasad from the festival template and empty roster', () => {
    const wf = pickWarFestival('2026-10-25') as WarFestival;
    const plan = blankPlan('ws1', wf);
    expect(plan.id).toBe('ws1__diwali_2026-11-08');
    expect(plan.prasad.length).toBeGreaterThan(0);
    expect(plan.roster).toEqual([]);
    expect(plan.footfall).toEqual({ lastYear: 0, growthPct: 10 });
  });

  it('round50 never goes negative', () => {
    expect(round50(-30)).toBe(0);
  });
});
