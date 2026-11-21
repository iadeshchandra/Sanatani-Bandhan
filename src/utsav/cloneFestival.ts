/* EVENTS E1 — "Copy for next year": clone a festival and its plan
 * into the following year, so the samiti starts from last year's
 * shape instead of a blank page.
 *
 * PURE helper: the caller supplies the id factory (the store's uid
 * in the app, a counter in tests), so the same inputs always return
 * the same new set — no store, no clock, no randomness in here.
 *
 * What carries over (the PLAN):
 *   · the festival itself — dates +1 year, status back to 'planned'
 *     (the earliest FestivalStatus), trailing year in the name moved;
 *     the record's own words ride along too — `notes`, and EVENTS
 *     E4's `lessons` ("Lessons for next year" from the debrief), so
 *     the new record opens with last year's lessons pre-filled for
 *     the committee to edit, not buried in a closed record;
 *   · budget lines — planned carried, actual reset to 0, and the
 *     treasury link dropped (last year's posting is last year's);
 *   · committee members — the samiti is usually the same people;
 *   · tasks — status back to 'todo', due dates +1 year;
 *   · program slots — dates +1 year;
 *   · safety items — done reset to false.
 * What deliberately does NOT carry over:
 *   · vendors — quotes, advances and payments are per-year
 *     commercial state; copying them would fabricate commitments;
 *   · check-in counts — they are the historical record of what
 *     actually happened, not a plan.
 */
import type {
  BudgetLine, CommitteeMember, Festival, ProgramSlot, SafetyItem, Task,
} from './types';

/** The festivalId-keyed child collections a clone reads. */
export interface FestivalChildren {
  budget: BudgetLine[];
  members: CommitteeMember[];
  tasks: Task[];
  program: ProgramSlot[];
  safety: SafetyItem[];
}

export interface ClonedFestivalSet extends FestivalChildren {
  festival: Festival;
}

/** Shift a yyyy-mm-dd date +1 year (same month/day; Feb 29 → Feb 28). */
export function shiftISODatePlusOneYear(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return iso;
  const y = parseInt(m[1], 10) + 1;
  const mo = parseInt(m[2], 10);
  const dim = new Date(y, mo, 0).getDate();
  const d = Math.min(parseInt(m[3], 10), dim);
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(y, 4)}-${p(mo)}-${p(d)}`;
}

/**
 * The festival's name with its trailing 4-digit year moved to the
 * new start year ("Sharadiya Durga Puja 2026" → "Sharadiya Durga
 * Puja 2027"); a name without a trailing year is carried unchanged.
 */
export function renamedForNextYear(name: string, newStartISO: string): string {
  if (!/\d{4}\s*$/.test(name)) return name;
  return name.replace(/\d{4}(\s*)$/, `${newStartISO.slice(0, 4)}$1`);
}

/**
 * Clone `festival` + its children (pass the store's whole child
 * arrays — rows belonging to other festivals are ignored) into the
 * next year. Every returned row carries a fresh id from `newId`
 * and the cloned festival's id as its festivalId.
 */
export function cloneFestivalForNextYear(
  festival: Festival,
  children: FestivalChildren,
  newId: (oldId: string) => string,
): ClonedFestivalSet {
  const startDate = shiftISODatePlusOneYear(festival.startDate);
  const cloned: Festival = {
    ...festival,
    id: newId(festival.id),
    name: renamedForNextYear(festival.name, startDate),
    startDate,
    endDate: shiftISODatePlusOneYear(festival.endDate),
    status: 'planned',
  };
  const fid = cloned.id;
  const own = <T extends { festivalId: string }>(rows: readonly T[]): T[] =>
    rows.filter((r) => r.festivalId === festival.id);
  return {
    festival: cloned,
    budget: own(children.budget).map((b) => ({
      id: newId(b.id),
      festivalId: fid,
      kind: b.kind,
      head: b.head,
      planned: b.planned,
      actual: 0,
      ...(b.notes ? { notes: b.notes } : {}),
    })),
    members: own(children.members).map((mm) => ({ ...mm, id: newId(mm.id), festivalId: fid })),
    tasks: own(children.tasks).map((tk) => ({
      ...tk,
      id: newId(tk.id),
      festivalId: fid,
      status: 'todo' as Task['status'],
      ...(tk.dueDate ? { dueDate: shiftISODatePlusOneYear(tk.dueDate) } : {}),
    })),
    program: own(children.program).map((p) => ({
      ...p,
      id: newId(p.id),
      festivalId: fid,
      date: shiftISODatePlusOneYear(p.date),
    })),
    safety: own(children.safety).map((s) => ({ ...s, id: newId(s.id), festivalId: fid, done: false })),
  };
}
