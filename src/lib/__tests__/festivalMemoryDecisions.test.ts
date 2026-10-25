/**
 * festivalMemoryDecisions.test.ts — EVENTS P2: the memory card and
 * the Transparency Board decision cards read REAL records only.
 * =====================================================================
 * Memory: nothing before conclusion; waitlisted parties never count
 * as attendance; when the RSVP list is not readable the list-derived
 * figures stay null (omitted), never invented. Decisions: concluded
 * polls/resolutions only, and a committee-only poll stays off the
 * public board for non-committee viewers.
 */
import { buildFestivalMemory, festivalConcluded } from '../festivalMemory';
import { pollDecisionCard, resolutionDecisionCard, sortDecisionCards } from '../decisionCards';
import type { FestivalEventDoc, RsvpEntry } from '../festival';

const NOW = new Date('2026-10-25T08:00:00').getTime();
const PAST = NOW - 24 * 60 * 60 * 1000;

const festival = {
  id: 'ev1',
  name: { en: 'Durga Puja' },
  orgName: 'Audit Mandir',
  dateISO: '2026-10-16',
  endDateISO: '2026-10-20',
  rsvpHeadcount: 6,
} as unknown as FestivalEventDoc;

const rsvp = (over: Partial<RsvpEntry>): RsvpEntry => ({
  id: 'x',
  eventId: 'ev1',
  workspaceId: 'ws',
  uid: 'u',
  name: 'Devotee',
  headcount: 2,
  createdAt: '2026-10-10T00:00:00.000Z',
  ...over,
});

describe('festival memory', () => {
  it('concludes only after the last day has fully passed', () => {
    expect(festivalConcluded(festival, new Date('2026-10-20T12:00:00').getTime())).toBe(false);
    expect(festivalConcluded(festival, NOW)).toBe(true);
    expect(buildFestivalMemory(festival, [], [], new Date('2026-10-18T12:00:00').getTime())).toBeNull();
  });
  it('counts real records: confirmed families, checked-in heads, per-day heads', () => {
    const mem = buildFestivalMemory(
      festival,
      [
        rsvp({ uid: 'a', headcount: 4, checkedIn: true }),
        rsvp({ uid: 'b', headcount: 2, days: ['2026-10-17'] }),
        rsvp({ uid: 'c', headcount: 9, status: 'waitlisted', checkedIn: true }),
      ],
      [
        { text: 'Aarti at dawn', authorName: 'Mira' },
        { text: 'Annakut', authorName: 'Ravi' },
        { text: 'Sindur khela', authorName: 'Mira' },
        { text: 'Visarjan', authorName: 'Kunal' },
      ],
      NOW
    );
    expect(mem).not.toBeNull();
    expect(mem!.expectedHeads).toBe(6);
    expect(mem!.families).toBe(2);
    expect(mem!.arrivedHeads).toBe(4); // the waitlisted 9 never arrived
    expect(mem!.perDay).toEqual([{ date: '2026-10-17', heads: 2 }]);
    expect(mem!.days).toBe(5);
    expect(mem!.moments).toHaveLength(3);
    expect(mem!.momentsCount).toBe(4);
  });
  it('without the RSVP list the figures stay unknown — never invented', () => {
    const mem = buildFestivalMemory(festival, null, [], NOW);
    expect(mem!.families).toBeNull();
    expect(mem!.arrivedHeads).toBeNull();
    expect(mem!.expectedHeads).toBe(6); // the public counter truth remains
    expect(mem!.perDay).toEqual([]);
  });
});

describe('decision cards', () => {
  const concludedPoll = {
    id: 'p1',
    title: 'Gate colour',
    status: 'CONCLUDED',
    expiresAt: PAST,
    totalVotes: 10,
    resultVisibility: 'afterClose',
    options: {
      o1: { text: 'Blue gates', votes: 6 },
      o2: { text: 'Red gates', votes: 3 },
      abstain: { text: 'Abstain', votes: 1, isAbstain: true },
    },
  };
  it('a concluded poll becomes a plain-language card with its abstentions', () => {
    const card = pollDecisionCard(concludedPoll, { isCommittee: false }, NOW);
    expect(card).not.toBeNull();
    expect(card!.outcomeLine).toBe('“Blue gates” — 60% of 10 votes · 1 abstained');
    expect(card!.detailLine).toBe('10 votes counted openly');
  });
  it('an open poll has no card', () => {
    expect(
      pollDecisionCard({ ...concludedPoll, status: 'ACTIVE', expiresAt: NOW + 100000 }, { isCommittee: true }, NOW)
    ).toBeNull();
  });
  it('a committee-only poll stays off the board for everyone else', () => {
    const p = { ...concludedPoll, resultVisibility: 'committee' };
    expect(pollDecisionCard(p, { isCommittee: false }, NOW)).toBeNull();
    expect(pollDecisionCard(p, { isCommittee: true }, NOW)).not.toBeNull();
  });
  it('a text poll reports its response count, never invented content', () => {
    const card = pollDecisionCard(
      { id: 'p2', title: 'Suggestions', status: 'CONCLUDED', expiresAt: PAST, totalVotes: 3, kind: 'text', options: {} },
      { isCommittee: false },
      NOW
    );
    expect(card!.outcomeLine).toBe('3 written responses received');
  });
  it('resolutions: concluded → card; still open → none', () => {
    const res = {
      id: 'r1',
      title: 'Roof repair',
      status: 'Approved',
      votesInFavor: 5,
      votesAgainst: 1,
      boardSize: 7,
      concludedAt: 123,
    };
    const card = resolutionDecisionCard(res, NOW);
    expect(card!.outcomeLine).toBe('Approved — 5 in favour, 1 against');
    expect(card!.detailLine).toContain('6 of 7 board members voted');
    expect(
      resolutionDecisionCard(
        { id: 'r2', title: 'Open', status: 'Pending Review', votesInFavor: 0, votesAgainst: 0, boardSize: 7, expiresAt: NOW + 100000 },
        NOW
      )
    ).toBeNull();
  });
  it('board order is most-recently-concluded first', () => {
    const a = { kind: 'poll' as const, id: 'a', title: 'A', outcomeLine: '', detailLine: '', concludedAt: 100 };
    const b = { kind: 'poll' as const, id: 'b', title: 'B', outcomeLine: '', detailLine: '', concludedAt: 300 };
    expect(sortDecisionCards([a, b]).map((c) => c.id)).toEqual(['b', 'a']);
  });
});
