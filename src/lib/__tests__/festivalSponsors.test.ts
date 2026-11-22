/**
 * festivalSponsors.test.ts — EVENTS E6: sponsors & stalls register
 * + seva departments (pure logic pins).
 * =====================================================================
 * The laws under test:
 *  1. Money rollups count ONLY money — a 'kind' or 'seva' sponsor
 *     never enters a total, however their fields are filled.
 *  2. Public gratitude is consent-shaped: a sponsor without
 *     publicAck NEVER appears in publicAckNames; the list is names
 *     only (strings), and stall holders are never in it.
 *  3. The budget hint reads the budget — it is a sum over the
 *     festival's own income lines under one head, nothing else.
 *  4. Department coverage counts a person once (duplicate names
 *     never inflate), gaps never go negative, and the preset seed
 *     carries the brief's taxonomy with empty volunteer lists.
 */
import {
  budgetHeadTotals,
  departmentCoverage,
  outstandingOf,
  publicAckNames,
  seedDepartments,
  sponsorTotals,
  stallTotals,
} from '../festivalSponsors';
import type {
  BudgetLine, FestivalSponsor, FestivalStall, SevaDepartment,
} from '../../utsav/types';
import { DEPARTMENT_PRESETS } from '../../utsav/types';

const sponsor = (p: Partial<FestivalSponsor>): FestivalSponsor => ({
  id: 's1', name: 'Sponsor', kind: 'cash', pledged: 0, received: 0,
  publicAck: false, ...p,
});
const stall = (p: Partial<FestivalStall>): FestivalStall => ({
  id: 'st1', holder: 'Holder', kind: 'food', fee: 0, received: 0, ...p,
});

describe('sponsorTotals — money counts only money', () => {
  it('sums pledged / received / pending over cash sponsors only', () => {
    const t = sponsorTotals([
      sponsor({ id: 'a', pledged: 50000, received: 20000 }),
      sponsor({ id: 'b', pledged: 30000, received: 30000, linkedTxId: 'tx-1' }),
      // kind + seva rows carry junk figures — they must not count.
      sponsor({ id: 'c', kind: 'kind', pledged: 999999, received: 999999 }),
      sponsor({ id: 'd', kind: 'seva', pledged: 888888, received: 888888 }),
    ]);
    expect(t).toEqual({ moneyRows: 2, pledged: 80000, received: 50000, pending: 30000, postedRows: 1 });
  });

  it('is all-zero for an absent or empty register', () => {
    expect(sponsorTotals(undefined).pledged).toBe(0);
    expect(sponsorTotals([])).toEqual({ moneyRows: 0, pledged: 0, received: 0, pending: 0, postedRows: 0 });
  });

  it('never reports a negative pending when received exceeds pledged', () => {
    expect(sponsorTotals([sponsor({ pledged: 100, received: 250 })]).pending).toBe(0);
  });
});

describe('stallTotals + outstandingOf', () => {
  it('rolls fees up as pledged and collections as received', () => {
    const t = stallTotals([
      stall({ id: 'a', fee: 5000, received: 5000, linkedTxId: 'tx-9' }),
      stall({ id: 'b', fee: 3000, received: 1000 }),
    ]);
    expect(t).toEqual({ moneyRows: 2, pledged: 8000, received: 6000, pending: 2000, postedRows: 1 });
  });

  it('outstanding is pledged − received, floored at 0', () => {
    expect(outstandingOf(1000, 400)).toBe(600);
    expect(outstandingOf(1000, 1000)).toBe(0);
    expect(outstandingOf(1000, 1400)).toBe(0);
  });
});

describe('publicAckNames — the consent law', () => {
  const sponsors = [
    sponsor({ id: 'a', name: 'Consented Donor', publicAck: true }),
    sponsor({ id: 'b', name: 'Quiet Donor', publicAck: false }),
    sponsor({ id: 'c', name: '  Padded Name  ', publicAck: true }),
    sponsor({ id: 'd', name: '', publicAck: true }),
    sponsor({ id: 'e', name: 'Seva Sponsor', kind: 'seva', publicAck: true }),
  ];

  it('returns ONLY consented sponsors, trimmed, in register order', () => {
    expect(publicAckNames(sponsors)).toEqual(['Consented Donor', 'Padded Name', 'Seva Sponsor']);
  });

  it('a sponsor without consent NEVER renders — flipping one flag is the only door', () => {
    const names = publicAckNames(sponsors);
    expect(names).not.toContain('Quiet Donor');
    // Every returned entry is one of the consented names — the
    // shape is names only: no amounts, contacts or notes can ride.
    for (const n of names) expect(typeof n).toBe('string');
    expect(publicAckNames([sponsor({ name: 'X', publicAck: false })])).toEqual([]);
    expect(publicAckNames(undefined)).toEqual([]);
  });

  it('stall holders are never part of the gratitude list', () => {
    // publicAckNames takes sponsors only — a stall holder's name
    // cannot enter through any argument of this function.
    const names = publicAckNames(sponsors);
    expect(names).not.toContain('Holder');
  });
});

describe('budgetHeadTotals — the read-only reconciliation hint', () => {
  const lines: BudgetLine[] = [
    { id: 'b1', festivalId: 'f1', kind: 'income', head: 'Sponsorships', planned: 200000, actual: 50000 },
    { id: 'b2', festivalId: 'f1', kind: 'income', head: 'Sponsorships', planned: 0, actual: 10000 },
    { id: 'b3', festivalId: 'f1', kind: 'income', head: 'Stall fees', planned: 40000, actual: 0 },
    { id: 'b4', festivalId: 'f1', kind: 'expense', head: 'Sponsorships', planned: 1, actual: 1 },
    { id: 'b5', festivalId: 'f2', kind: 'income', head: 'Sponsorships', planned: 7, actual: 7 },
  ];

  it('sums only this festival’s income lines under the head', () => {
    expect(budgetHeadTotals(lines, 'f1', 'Sponsorships')).toEqual({ planned: 200000, actual: 60000 });
    expect(budgetHeadTotals(lines, 'f1', 'Stall fees')).toEqual({ planned: 40000, actual: 0 });
    expect(budgetHeadTotals(lines, 'f1', 'Donations')).toEqual({ planned: 0, actual: 0 });
    expect(budgetHeadTotals(undefined, 'f1', 'Sponsorships')).toEqual({ planned: 0, actual: 0 });
  });
});

describe('departmentCoverage', () => {
  const depts: SevaDepartment[] = [
    { id: 'd1', name: 'Kitchen & Prasadam', leadName: 'Lead A', targetVolunteers: 3, volunteerNames: ['Asha', 'Bimal', 'Asha', '  '] },
    { id: 'd2', name: 'Media', targetVolunteers: 2, volunteerNames: ['Chitra', 'Dev'] },
    { id: 'd3', name: 'Transport', targetVolunteers: 4 },
  ];

  it('counts each person once and never lets a gap go negative', () => {
    const cov = departmentCoverage(depts);
    expect(cov.rows[0]).toMatchObject({ assigned: 2, target: 3, gap: 1, covered: false });
    expect(cov.rows[1]).toMatchObject({ assigned: 2, gap: 0, covered: true });
    expect(cov.rows[2]).toMatchObject({ assigned: 0, gap: 4, covered: false });
    expect(cov).toMatchObject({ totalTarget: 9, totalAssigned: 4, totalGap: 5, openDepartments: 2 });
  });

  it('is empty-shaped for an absent board', () => {
    expect(departmentCoverage(undefined)).toEqual({
      rows: [], totalTarget: 0, totalAssigned: 0, totalGap: 0, openDepartments: 0,
    });
  });
});

describe('seedDepartments — the preset taxonomy', () => {
  it('seeds the brief’s ten departments with targets and empty lists', () => {
    let n = 0;
    const seeded = seedDepartments((name) => `dept-${++n}-${name.length}`);
    expect(seeded.map((d) => d.name)).toEqual(DEPARTMENT_PRESETS.map((p) => p.name));
    expect(seeded.map((d) => d.targetVolunteers)).toEqual(DEPARTMENT_PRESETS.map((p) => p.targetVolunteers));
    expect(seeded.every((d) => Array.isArray(d.volunteerNames) && d.volunteerNames.length === 0)).toBe(true);
    expect(seeded.every((d) => d.leadName === undefined)).toBe(true);
    expect(new Set(seeded.map((d) => d.id)).size).toBe(seeded.length);
  });
});
