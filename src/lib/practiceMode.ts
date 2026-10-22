/**
 * practiceMode.ts — Blueprint D, deliverable 1: practice mode for a
 * REAL organisation workspace (pure logic, no React, no Firebase).
 * ============================================================================
 * The problem it solves: trustees and sevadas need a safe place to
 * LEARN the app and to let a new volunteer try the desks — but a real
 * org's books are sacred. Demo workspaces (DEMO_*) exist, yet they are
 * a DIFFERENT workspace: a trustee practising in a demo never learns
 * HER OWN org's desks, members and festivals. Practice mode is the
 * same idea brought home: a per-workspace flag on the REAL workspace.
 *
 * The mechanism — a tag lane, sibling of the sample-data lane
 * (lib/sampleData), chosen after studying how that machinery behaves:
 *
 *  - WHY NOT the demo lane itself: sample/demo rows are REAL ledger
 *    rows — they sit inside every total until cleared (the summary
 *    reconciles their deletion on purge). Practice must never touch
 *    a total even for a moment, so it cannot ride isDemoSeed.
 *  - WHY NOT session-local only: a practice session spans sittings
 *    (a volunteer practises over days) and devices; state-only rows
 *    would vanish on re-entry and the "clear" promise would be
 *    unverifiable. Tagged rows persist like real rows — and are
 *    excluded like samples never were.
 *
 * THE LAW, in one place:
 *  1. The flag lives on the workspace doc (`practiceMode`, written
 *     through the ONE audited settings choke point,
 *     updateWorkspaceDetails — the toggle itself joins the audit
 *     stream as a settings change).
 *  2. While ON, DataContext's mutators stamp `isPractice: true` on
 *     every record they mint for that workspace (the stamped sets
 *     below — the money ledger plus the principal registers).
 *  3. Exclusion is enforced at the money-truth seam, not per desk:
 *     `computeTreasuryAggregates`' fold skips practice rows, so
 *     desk totals, workspaceSummaries, published Transparency
 *     snapshots and donor lifetime figures NEVER include them, in
 *     any mode, even while the mode is on. Receipt assignment skips
 *     them too (no real sequence number is ever consumed), and a
 *     practice donation never raises a real devotee's totalDonated.
 *  4. Lists show practice rows ONLY while the mode is on (badged);
 *     with the mode off they are hidden from the working lists, and
 *     the Settings card keeps their count + the one-tap clear.
 *  5. `clearPracticeData` (DataContext) mirrors clearSampleData
 *     exactly: a single action removes EXACTLY the `isPractice` rows
 *     of this workspace, and one audit tally event records the clear.
 *     Turning the mode OFF writes nothing and deletes nothing — zero
 *     residue in the real books, because practice rows were never in
 *     them; leftover practice rows simply wait, hidden, for the clear.
 *
 * Honest limits (also in NOTES.md): the suite-local stores (goshala /
 * pathshala localStorage blobs) are not DataContext sets — practice
 * activity there rides the persistent banner, not row tags; and in
 * windowed (very large) workspaces the server-probed headline COUNTS
 * can include practice rows while they exist — the money aggregates
 * never do.
 */

/** The one practice test: the practice stamp, nothing else. */
export function isPracticeRecord(record: unknown): boolean {
  return (
    !!record &&
    typeof record === 'object' &&
    (record as { isPractice?: unknown }).isPractice === true
  );
}

/** Is practice mode on for this workspace-shaped value? */
export function isPracticeModeOn(workspace: unknown): boolean {
  return (
    !!workspace &&
    typeof workspace === 'object' &&
    (workspace as { practiceMode?: unknown }).practiceMode === true
  );
}

/** The stamp a mutator spreads into a new record while the mode is on. */
export function practiceStamp(on: boolean): { isPractice?: boolean } {
  return on ? { isPractice: true } : {};
}

/** Per-set practice counts — the sets DataContext stamps + clears. */
export interface PracticeRecordCounts {
  devotees: number;
  treasury: number;
  poojaBookings: number;
  inventory: number;
  gurukulStudents: number;
  cows: number;
  guests: number;
  campaigns: number;
  shifts: number;
  total: number;
}

export const emptyPracticeRecordCounts = (): PracticeRecordCounts => ({
  devotees: 0,
  treasury: 0,
  poojaBookings: 0,
  inventory: 0,
  gurukulStudents: 0,
  cows: 0,
  guests: 0,
  campaigns: 0,
  shifts: 0,
  total: 0,
});

export function countPracticeRecords(sets: {
  devotees: readonly unknown[];
  treasury: readonly unknown[];
  poojaBookings: readonly unknown[];
  inventory: readonly unknown[];
  gurukulStudents: readonly unknown[];
  cows: readonly unknown[];
  guests: readonly unknown[];
  campaigns: readonly unknown[];
  shifts: readonly unknown[];
}): PracticeRecordCounts {
  const n = (rows: readonly unknown[]) => rows.filter(isPracticeRecord).length;
  const counts: PracticeRecordCounts = {
    devotees: n(sets.devotees),
    treasury: n(sets.treasury),
    poojaBookings: n(sets.poojaBookings),
    inventory: n(sets.inventory),
    gurukulStudents: n(sets.gurukulStudents),
    cows: n(sets.cows),
    guests: n(sets.guests),
    campaigns: n(sets.campaigns),
    shifts: n(sets.shifts),
    total: 0,
  };
  counts.total =
    counts.devotees +
    counts.treasury +
    counts.poojaBookings +
    counts.inventory +
    counts.gurukulStudents +
    counts.cows +
    counts.guests +
    counts.campaigns +
    counts.shifts;
  return counts;
}

/**
 * List visibility law: a practice row is visible in the working lists
 * ONLY while practice mode is on for its workspace. Real rows are
 * always visible. (Money truth does not depend on this — aggregates
 * exclude practice rows in every mode; this law is about not letting
 * pretend rows mingle with real registers once the session ends.)
 */
export function practiceVisible(record: unknown, modeOn: boolean): boolean {
  return modeOn || (record as { isPractice?: unknown } | null)?.isPractice !== true;
}
