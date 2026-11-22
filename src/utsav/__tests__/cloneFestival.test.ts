/**
 * cloneFestival.test.ts — EVENTS E1: "Copy for next year".
 * =====================================================================
 * The clone is a PLAN, not a history: dates move +1 year, budget
 * planned figures carry while actuals reset to 0 (and the treasury
 * link drops), tasks reopen, safety items uncheck — and another
 * festival's rows are never swept into the copy.
 */
import {
  cloneFestivalForNextYear, shiftISODatePlusOneYear, renamedForNextYear,
  type FestivalChildren,
} from '../cloneFestival';
import type { Festival } from '../types';

const festival: Festival = {
  id: 'fv1',
  name: 'Sharadiya Durga Puja 2026',
  deity: 'Maa Durga',
  occasion: 'Sharadiya Navratri',
  startDate: '2026-10-16',
  endDate: '2026-10-20',
  venue: 'Samiti Maidan',
  expectedFootfall: 5000,
  status: 'completed',
  notes: 'Last year went well.',
};

const children: FestivalChildren = {
  budget: [
    { id: 'b1', festivalId: 'fv1', kind: 'income', head: 'Donations', planned: 150000, actual: 142000, treasuryTxId: 'tx-9' },
    { id: 'b2', festivalId: 'fv1', kind: 'expense', head: 'Pandal & decoration', planned: 120000, actual: 118500, notes: 'Same vendor quoted again' },
    { id: 'bX', festivalId: 'fv-other', kind: 'income', head: 'Donations', planned: 10, actual: 10 },
  ],
  members: [
    { id: 'm1', festivalId: 'fv1', name: 'Example Adhyaksh', role: 'Adhyaksh (President)' },
    { id: 'mX', festivalId: 'fv-other', name: 'Not Ours', role: 'Sevadar' },
  ],
  tasks: [
    { id: 't1', festivalId: 'fv1', title: 'Book pandal vendor', status: 'done', dueDate: '2026-10-01' },
    { id: 't2', festivalId: 'fv1', title: 'Print invitations', status: 'doing' },
  ],
  program: [
    { id: 'p1', festivalId: 'fv1', date: '2026-10-17', startTime: '19:00', endTime: '20:00', title: 'Sandhya Aarti', kind: 'Aarti' },
  ],
  safety: [
    { id: 's1', festivalId: 'fv1', item: 'Barricades at main gate', category: 'Crowd control', done: true },
    { id: 's2', festivalId: 'fv1', item: 'First-aid desk', category: 'Medical', done: false },
  ],
};

/** Deterministic id factory: fv1 → fv1-n27 style suffixes. */
const newId = (old: string) => `${old}-n`;

describe('shiftISODatePlusOneYear', () => {
  it('shifts same month/day into the next year', () => {
    expect(shiftISODatePlusOneYear('2026-10-16')).toBe('2027-10-16');
    expect(shiftISODatePlusOneYear('2026-01-31')).toBe('2027-01-31');
  });

  it('clamps Feb 29 to Feb 28 in a non-leap year', () => {
    expect(shiftISODatePlusOneYear('2028-02-29')).toBe('2029-02-28');
  });

  it('passes through a malformed date unchanged', () => {
    expect(shiftISODatePlusOneYear('Every Purnima')).toBe('Every Purnima');
  });
});

describe('renamedForNextYear', () => {
  it('moves a trailing year to the new start year', () => {
    expect(renamedForNextYear('Sharadiya Durga Puja 2026', '2027-10-16')).toBe('Sharadiya Durga Puja 2027');
  });

  it('leaves a year-less name (and mid-name years) unchanged', () => {
    expect(renamedForNextYear('Weekly Satsang', '2027-01-03')).toBe('Weekly Satsang');
    expect(renamedForNextYear('2026 Planning Meet', '2027-01-03')).toBe('2026 Planning Meet');
  });
});

describe('cloneFestivalForNextYear', () => {
  const set = cloneFestivalForNextYear(festival, children, newId);

  it('clones the festival: new id, dates +1 year, status back to planned, name year moved', () => {
    expect(set.festival.id).toBe('fv1-n');
    expect(set.festival.startDate).toBe('2027-10-16');
    expect(set.festival.endDate).toBe('2027-10-20');
    expect(set.festival.status).toBe('planned');
    expect(set.festival.name).toBe('Sharadiya Durga Puja 2027');
    expect(set.festival.deity).toBe('Maa Durga');
    expect(set.festival.notes).toBe('Last year went well.');
  });

  it('EVENTS E4 — carries the debrief lessons into next year, pre-filled', () => {
    const withLessons: Festival = {
      ...festival,
      lessons: 'Book the pandal two months early; the east gate needs a second sevadar after 7 pm.',
    };
    const cloned = cloneFestivalForNextYear(withLessons, children, newId);
    expect(cloned.festival.lessons).toBe(withLessons.lessons);
    // A record that never wrote lessons clones without inventing any.
    expect(set.festival.lessons).toBeUndefined();
  });

  it('copies budget with planned carried, actual reset to 0, treasury link dropped', () => {
    expect(set.budget).toHaveLength(2);
    const income = set.budget.find((b) => b.id === 'b1-n');
    expect(income).toMatchObject({ festivalId: 'fv1-n', kind: 'income', head: 'Donations', planned: 150000, actual: 0 });
    expect(income?.treasuryTxId).toBeUndefined();
    const expense = set.budget.find((b) => b.id === 'b2-n');
    expect(expense).toMatchObject({ planned: 120000, actual: 0, notes: 'Same vendor quoted again' });
  });

  it('reopens tasks and safety items, shifting due dates and program dates', () => {
    expect(set.tasks).toHaveLength(2);
    expect(set.tasks.every((t) => t.status === 'todo')).toBe(true);
    expect(set.tasks.find((t) => t.id === 't1-n')?.dueDate).toBe('2027-10-01');
    expect(set.safety).toHaveLength(2);
    expect(set.safety.every((s) => s.done === false)).toBe(true);
    expect(set.program).toHaveLength(1);
    expect(set.program[0]).toMatchObject({ id: 'p1-n', festivalId: 'fv1-n', date: '2027-10-17' });
  });

  it('carries the committee over, and never another festival\u2019s rows', () => {
    expect(set.members).toHaveLength(1);
    expect(set.members[0]).toMatchObject({ id: 'm1-n', festivalId: 'fv1-n', name: 'Example Adhyaksh' });
    const all = [...set.budget, ...set.members, ...set.tasks, ...set.program, ...set.safety];
    expect(all.every((r) => r.festivalId === 'fv1-n')).toBe(true);
  });

  it('is pure — same inputs, same set; the source rows are untouched', () => {
    const again = cloneFestivalForNextYear(festival, children, newId);
    expect(again).toEqual(set);
    expect(festival.status).toBe('completed');
    expect(children.budget[0].actual).toBe(142000);
    expect(children.safety[0].done).toBe(true);
  });

  it('EVENTS E6 — strips sponsors and stalls entirely (per-year commercial state)', () => {
    const withRegister: Festival = {
      ...festival,
      sponsors: [
        { id: 'sp1', name: 'Example Sponsor', kind: 'cash', pledged: 50000, received: 20000, publicAck: true },
      ],
      stalls: [
        { id: 'st1', holder: 'Example Bookseller', kind: 'books', fee: 3000, received: 3000 },
      ],
    };
    const cloned = cloneFestivalForNextYear(withRegister, children, newId);
    expect(cloned.festival.sponsors).toBeUndefined();
    expect(cloned.festival.stalls).toBeUndefined();
    expect('sponsors' in cloned.festival).toBe(false);
    expect('stalls' in cloned.festival).toBe(false);
    // The source record keeps its register — cloning never edits it.
    expect(withRegister.sponsors).toHaveLength(1);
    expect(withRegister.stalls).toHaveLength(1);
  });

  it('EVENTS E6 — carries departments as structure only: names + targets, no people', () => {
    const withDepts: Festival = {
      ...festival,
      departments: [
        {
          id: 'dp1', name: 'Kitchen & Prasadam', leadName: 'Last Year Lead',
          targetVolunteers: 12, volunteerNames: ['Asha', 'Bimal'], note: 'East gate kitchen',
        },
        { id: 'dp2', name: 'Media', targetVolunteers: 4 },
      ],
    };
    const cloned = cloneFestivalForNextYear(withDepts, children, newId);
    expect(cloned.festival.departments).toEqual([
      { id: 'dp1', name: 'Kitchen & Prasadam', targetVolunteers: 12 },
      { id: 'dp2', name: 'Media', targetVolunteers: 4 },
    ]);
    const carried = cloned.festival.departments![0];
    expect(carried.leadName).toBeUndefined();
    expect(carried.volunteerNames).toBeUndefined();
    // The source record's people are untouched.
    expect(withDepts.departments![0].volunteerNames).toEqual(['Asha', 'Bimal']);
    expect(withDepts.departments![0].leadName).toBe('Last Year Lead');
    // A record with no departments clones without inventing any.
    expect(set.festival.departments).toBeUndefined();
  });

  it('handles a leap-day festival start', () => {
    const leap: Festival = { ...festival, id: 'fvL', startDate: '2028-02-29', endDate: '2028-03-01' };
    const out = cloneFestivalForNextYear(leap, { budget: [], members: [], tasks: [], program: [], safety: [] }, newId);
    expect(out.festival.startDate).toBe('2029-02-28');
    expect(out.festival.endDate).toBe('2029-03-01');
  });
});
