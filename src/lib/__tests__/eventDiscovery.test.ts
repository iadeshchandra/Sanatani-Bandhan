/**
 * eventDiscovery.test.ts — EVENTS E7 pure shaping + source guard.
 *
 * The shaping laws under test:
 *  - only UPCOMING events are listed (past excluded by each event's
 *    own dates; an ongoing festival counts from today);
 *  - groups are Today / This week (next 7 days) / Coming up;
 *  - a recurring series appears once, at its NEXT occurrence;
 *  - org-page items with free-text dates and no rule are excluded
 *    (no guessed dates) — ISO and recurrence items are in;
 *  - cancelled / unpublished festivals never appear;
 *  - cards link only to canonical public routes; a community Sangam
 *    event (no org) carries no link rather than an invented URL;
 *  - org/kind filters are derived from the data itself.
 *
 * The guard: the discovery page may read ONLY the three collections
 * the rules investigation proved world-readable (PUBLIC_EVENT_SOURCES).
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  PUBLIC_EVENT_SOURCES,
  buildDiscoveryCards,
  cardsCoveringDate,
  festivalCard,
  filterCards,
  followedCards,
  groupCards,
  isFollowedCard,
  kindOptions,
  observanceStrip,
  orgOptions,
  orgPageCards,
  sangamCard,
  type DiscoveryCard,
  type DiscoveryOrgPage,
  type FollowSets,
} from '../eventDiscovery';
import type { FestivalEventDoc } from '../festival';
import type { SangamEvent } from '../../sangam/types';
import type { PanjikaFestival } from '../panjikaFestivals';

const NO_FOLLOWS: FollowSets = { orgIds: [], festivalIds: [] };

const TODAY = '2026-11-22'; // a Sunday
const pickEn = (n: { en: string }) => n.en;

function festival(over: Partial<FestivalEventDoc>): FestivalEventDoc {
  return {
    id: 'WS1__durga-2026',
    workspaceId: 'WS1',
    festivalKey: 'durga-2026',
    orgName: 'Demo Mandir',
    name: { en: 'Durga Puja', bn: 'দুর্গা পূজা', hi: 'दुर्गा पूजा' },
    significance: { en: '', bn: '', hi: '' },
    dateISO: '2026-11-25',
    endDateISO: '2026-11-27',
    tithiLine: '',
    timings: [],
    story: { en: '', bn: '', hi: '' },
    rsvpEnabled: true,
    darshanSlots: [],
    published: true,
    publishedHeadcount: 0,
    slotBooked: {},
    rsvpHeadcount: 0,
    updatedAt: '2026-11-01T00:00:00.000Z',
    ...over,
  };
}

function sangam(over: Partial<SangamEvent>): SangamEvent {
  return {
    id: 'ev1',
    title: 'Sunday Satsang',
    kind: 'satsang',
    description: '',
    venue: 'Main Hall',
    startsAt: new Date(2026, 10, 22, 10, 0).getTime(),
    isOfficial: false,
    creatorUid: 'u1',
    creatorName: 'A Devotee',
    rsvpCount: 3,
    createdAt: 0,
    ...over,
  };
}

describe('festivalCard', () => {
  it('builds a card linking to the canonical festival page', () => {
    const c = festivalCard(festival({}), TODAY, pickEn);
    expect(c).not.toBeNull();
    expect(c!.href).toBe('/festival/WS1/WS1__durga-2026');
    expect(c!.title).toBe('Durga Puja');
    expect(c!.orgName).toBe('Demo Mandir');
    expect(c!.startISO).toBe('2026-11-25');
    expect(c!.endISO).toBe('2026-11-27');
    // No venue stamped on this doc — no place is invented.
    expect(c!.place).toBeUndefined();
  });

  it('uses the venue stamped at publish time as the place line (REAL-WORLD PACK)', () => {
    const c = festivalCard(festival({ venue: 'Community Hall, Temple Road' }), TODAY, pickEn);
    expect(c!.place).toBe('Community Hall, Temple Road');
    // A blank or whitespace-only stamp is no venue at all.
    expect(festivalCard(festival({ venue: '   ' }), TODAY, pickEn)!.place).toBeUndefined();
    expect(festivalCard(festival({ venue: '' }), TODAY, pickEn)!.place).toBeUndefined();
  });

  it('marks passes and debrief from the published doc itself', () => {
    const c = festivalCard(
      festival({
        ticketTiers: [
          { id: 't1', name: { en: 'Seva Pass', bn: '', hi: '' }, kind: 'paid', price: 100 },
        ] as FestivalEventDoc['ticketTiers'],
        debriefSummary: {
          publishedAt: '2026-11-20T00:00:00.000Z',
          days: 3,
          expectedHeads: 10,
          arrivedHeads: 9,
          families: 4,
          passCollected: 0,
          donationsReceived: null,
          totalUtilised: null,
          currency: 'INR',
        },
      }),
      TODAY,
      pickEn
    );
    expect(c!.hasPasses).toBe(true);
    expect(c!.hasDebrief).toBe(true);
  });

  it('excludes unpublished, cancelled and finished festivals', () => {
    expect(festivalCard(festival({ published: false }), TODAY, pickEn)).toBeNull();
    expect(festivalCard(festival({ festivalCancelled: true }), TODAY, pickEn)).toBeNull();
    expect(
      festivalCard(festival({ dateISO: '2026-11-10', endDateISO: '2026-11-12' }), TODAY, pickEn)
    ).toBeNull();
  });

  it('keeps an ongoing festival (started, not yet ended)', () => {
    const c = festivalCard(
      festival({ dateISO: '2026-11-20', endDateISO: '2026-11-24' }),
      TODAY,
      pickEn
    );
    expect(c).not.toBeNull();
    expect(c!.startISO).toBe('2026-11-20');
  });

  it('counts only the OPEN notes of the live board (NEXT-LEVEL A4)', () => {
    // No board at all — no chip.
    expect(festivalCard(festival({}), TODAY, pickEn)!.liveCount).toBe(0);
    const c = festivalCard(
      festival({
        liveBoard: [
          { id: 'a', kind: 'lost', text: 'Umbrella lost at Gate 1', at: 1000 },
          { id: 'b', kind: 'gate', text: 'Gate 2 opens at 5 pm', at: 2000 },
          { id: 'c', kind: 'found', text: 'Keys found', at: 3000, resolved: true },
        ],
      }),
      TODAY,
      pickEn
    );
    // The resolved reunion no longer counts as an open note.
    expect(c!.liveCount).toBe(2);
  });
});

describe('sangamCard', () => {
  it('builds a card with venue; org events link to the org page', () => {
    const c = sangamCard(sangam({ orgId: 'WS9', orgName: 'River Ashram' }), TODAY);
    expect(c).not.toBeNull();
    expect(c!.place).toBe('Main Hall');
    expect(c!.orgName).toBe('River Ashram');
    expect(c!.href).toBe('/org/WS9');
    expect(c!.startISO).toBe(TODAY);
  });

  it('community events fall back to the creator name and carry NO link', () => {
    const c = sangamCard(sangam({}), TODAY);
    expect(c!.orgName).toBe('A Devotee');
    expect(c!.href).toBeUndefined();
  });

  it('excludes events that have ended', () => {
    const past = new Date(2026, 10, 20, 10, 0).getTime();
    expect(sangamCard(sangam({ startsAt: past, endsAt: past + 3600000 }), TODAY)).toBeNull();
  });

  it('a recurring series is represented by its NEXT occurrence', () => {
    // Weekly from Sunday 2026-10-25 → next after TODAY is 2026-11-22 itself,
    // then 2026-11-29. startsAt is in the past; the series is alive.
    const start = new Date(2026, 9, 25, 10, 0).getTime();
    const c = sangamCard(
      sangam({ startsAt: start, endsAt: undefined, recurrence: { freq: 'weekly' } }),
      '2026-11-23'
    );
    expect(c).not.toBeNull();
    expect(c!.startISO).toBe('2026-11-29');
  });
});

describe('orgPageCards', () => {
  const page: DiscoveryOrgPage = {
    orgId: 'WS7',
    name: 'Hill Goshala',
    city: 'Vrindavan',
    upcomingEvents: [
      { title: 'Gopashtami', date: '2026-11-28' },
      { title: 'Monthly Kirtan', date: 'Every Purnima' },
      { title: 'Old Fair', date: '2026-10-01' },
      { title: 'Weekly Seva', date: '2026-10-04', recurrence: { freq: 'weekly' } },
    ],
  };

  it('keeps ISO + recurring items, drops free-text and past one-offs', () => {
    const cards = orgPageCards(page, TODAY);
    expect(cards.map((c) => c.title)).toEqual(['Gopashtami', 'Weekly Seva']);
    const seva = cards.find((c) => c.title === 'Weekly Seva')!;
    expect(seva.startISO).toBe('2026-11-22'); // 2026-10-04 was a Sunday; TODAY is one too
    expect(seva.href).toBe('/org/WS7');
    expect(seva.place).toBe('Vrindavan');
    expect(seva.orgName).toBe('Hill Goshala');
  });
});

describe('assembly, grouping, filtering', () => {
  const cards = buildDiscoveryCards(
    {
      festivals: [
        festival({}),
        festival({
          id: 'WS2__today',
          workspaceId: 'WS2',
          orgName: 'City Sangha',
          name: { en: 'Today Utsav', bn: '', hi: '' },
          dateISO: TODAY,
          endDateISO: TODAY,
        }),
        festival({
          id: 'WS2__far',
          workspaceId: 'WS2',
          orgName: 'City Sangha',
          name: { en: 'Far Festival', bn: '', hi: '' },
          dateISO: '2027-01-15',
          endDateISO: '2027-01-16',
        }),
      ],
      sangamEvents: [sangam({ orgId: 'WS9', orgName: 'River Ashram' })],
      orgPages: [
        { orgId: 'WS7', name: 'Hill Goshala', upcomingEvents: [{ title: 'Gopashtami', date: '2026-11-28' }] },
      ],
    },
    TODAY,
    pickEn
  );

  it('sorts soonest first across sources', () => {
    expect(cards[0].startISO).toBe(TODAY);
    expect(cards[cards.length - 1].startISO).toBe('2027-01-15');
  });

  it('groups into Today / This week / Coming up', () => {
    const g = groupCards(cards, TODAY);
    expect(g.today.map((c) => c.title)).toEqual(
      expect.arrayContaining(['Today Utsav', 'Sunday Satsang'])
    );
    expect(g.thisWeek.map((c) => c.title)).toEqual(
      expect.arrayContaining(['Durga Puja', 'Gopashtami'])
    );
    expect(g.comingUp.map((c) => c.title)).toEqual(['Far Festival']);
  });

  it('derives org + kind options from the data itself', () => {
    expect(orgOptions(cards)).toEqual(['City Sangha', 'Demo Mandir', 'Hill Goshala', 'River Ashram']);
    expect(kindOptions(cards)).toEqual(['festival', 'sangam', 'org']);
  });

  it('filters by org and by kind', () => {
    expect(filterCards(cards, { orgName: 'City Sangha' }).map((c) => c.title)).toEqual([
      'Today Utsav',
      'Far Festival',
    ]);
    expect(filterCards(cards, { kind: 'org' }).map((c) => c.title)).toEqual(['Gopashtami']);
    expect(filterCards(cards, {})).toHaveLength(cards.length);
  });
});

describe('NEXT-LEVEL A1 — follows matching', () => {
  const cards: DiscoveryCard[] = buildDiscoveryCards(
    {
      festivals: [
        festival({}),
        festival({
          id: 'WS2__kali-2026',
          workspaceId: 'WS2',
          festivalKey: 'kali-2026',
          orgName: 'River Ashram',
          name: { en: 'Kali Puja', bn: '', hi: '' },
          dateISO: '2026-11-26',
          endDateISO: '2026-11-26',
        }),
      ],
      sangamEvents: [sangam({ orgId: 'WS2', orgName: 'River Ashram' })],
      orgPages: [],
    },
    TODAY,
    pickEn
  );

  it('a festival card matches its followed series by plan id', () => {
    const follows: FollowSets = { orgIds: [], festivalIds: ['WS1__durga-2026'] };
    const durga = cards.find((c) => c.title === 'Durga Puja')!;
    const kali = cards.find((c) => c.title === 'Kali Puja')!;
    expect(isFollowedCard(durga, follows)).toBe(true);
    expect(isFollowedCard(kali, follows)).toBe(false);
  });

  it('any card matches a followed organisation; org-less cards never match', () => {
    const follows: FollowSets = { orgIds: ['WS2'], festivalIds: [] };
    // Soonest first: the Sangam is today, the Kali Puja on the 26th.
    expect(followedCards(cards, follows).map((c) => c.title)).toEqual([
      'Sunday Satsang',
      'Kali Puja',
    ]);
    const community = sangamCard(sangam({}), TODAY)!;
    expect(community.orgId).toBeUndefined();
    expect(isFollowedCard(community, follows)).toBe(false);
  });

  it('empty follows → an empty rail (never an empty shelf)', () => {
    expect(followedCards(cards, NO_FOLLOWS)).toEqual([]);
  });
});

describe('NEXT-LEVEL A1 — panchang strip', () => {
  const cards: DiscoveryCard[] = buildDiscoveryCards(
    { festivals: [festival({})], sangamEvents: [], orgPages: [] },
    TODAY,
    pickEn
  ); // Durga Puja runs 2026-11-25 → 2026-11-27.

  it('cardsCoveringDate counts a multi-day festival on every day it runs', () => {
    expect(cardsCoveringDate(cards, '2026-11-24')).toHaveLength(0);
    expect(cardsCoveringDate(cards, '2026-11-25')).toHaveLength(1);
    expect(cardsCoveringDate(cards, '2026-11-26')).toHaveLength(1);
    expect(cardsCoveringDate(cards, '2026-11-27')).toHaveLength(1);
    expect(cardsCoveringDate(cards, '2026-11-28')).toHaveLength(0);
  });

  it('engine observances appear with their canonical tithi names (engine-verified dates)', () => {
    const strip = observanceStrip([], TODAY, 30, []);
    const byDate = new Map(strip.map((d) => [d.date, d]));
    expect(byDate.get('2026-11-24')?.tithiName).toBe('Purnima');
    expect(byDate.get('2026-12-04')?.tithiName).toBe('Krishna Ekadashi');
    expect(byDate.get('2026-12-08')?.tithiName).toBe('Amavasya');
    expect(byDate.get('2026-11-28')?.tithiName).toBe('Krishna Chaturthi');
    // A plain day (no preset tithi, no DB entry) is not an observance.
    expect(byDate.has('2026-11-23')).toBe(false);
    // Engine-only days carry no DB names — nothing is invented.
    expect(byDate.get('2026-11-24')?.names).toEqual([]);
  });

  it('DB festivals join by date, civic holidays are excluded, counts are honest', () => {
    const db: PanjikaFestival[] = [
      {
        date: '2026-11-26',
        nameEn: 'Test Puja',
        nameBn: 'টেস্ট পূজা',
        significanceEn: '',
        significanceBn: '',
        category: 'puja',
        variant: 'both',
        regions: [],
        confidence: 'verified',
      },
      {
        date: '2026-11-26',
        nameEn: 'Second Same-Day',
        nameBn: 'দ্বিতীয়',
        significanceEn: '',
        significanceBn: '',
        category: 'festival',
        variant: 'both',
        regions: [],
        confidence: 'single',
      },
      {
        date: '2026-11-27',
        nameEn: 'Civic Day',
        nameBn: 'নাগরিক দিবস',
        significanceEn: '',
        significanceBn: '',
        category: 'holiday',
        variant: 'both',
        regions: [],
        confidence: 'verified',
      },
      {
        date: '2027-03-01',
        nameEn: 'Outside Window',
        nameBn: 'বাইরে',
        significanceEn: '',
        significanceBn: '',
        category: 'puja',
        variant: 'both',
        regions: [],
        confidence: 'verified',
      },
    ];
    const strip = observanceStrip(cards, TODAY, 30, db);
    const puja = strip.find((d) => d.date === '2026-11-26')!;
    expect(puja.names.map((n) => n.en)).toEqual(['Test Puja', 'Second Same-Day']);
    // Durga Puja (25–27 Nov) covers the 26th — the count is real.
    expect(puja.eventCount).toBe(1);
    // The civic holiday never becomes an observance.
    expect(strip.some((d) => d.names.some((n) => n.en === 'Civic Day'))).toBe(false);
    // Outside the 30-day window: absent.
    expect(strip.some((d) => d.date === '2027-03-01')).toBe(false);
    // Sorted by date.
    const dates = strip.map((d) => d.date);
    expect(dates).toEqual([...dates].sort());
  });
});

describe('source guard — only proven-public collections', () => {
  it('the page reads exactly the PUBLIC_EVENT_SOURCES collections', () => {
    const pageSrc = fs.readFileSync(
      path.resolve(__dirname, '../../pages/PublicEventsPage.tsx'),
      'utf8'
    );
    const used = [...pageSrc.matchAll(/collection\(db,\s*'([^']+)'\)/g)].map((m) => m[1]);
    expect([...new Set(used)].sort()).toEqual([...PUBLIC_EVENT_SOURCES].sort());
    // And never the private neighbours.
    for (const banned of ['festival_rsvps', 'event_tickets', 'event_feedback', 'utsav_stores', 'festival_plans']) {
      expect(pageSrc).not.toContain(`'${banned}'`);
    }
  });

  it('the /events route and the landing door exist', () => {
    const appSrc = fs.readFileSync(path.resolve(__dirname, '../../App.tsx'), 'utf8');
    expect(appSrc).toContain('path="/events"');
    const landingSrc = fs.readFileSync(
      path.resolve(__dirname, '../../pages/LandingPage.tsx'),
      'utf8'
    );
    expect(landingSrc).toContain("navigate('/events')");
  });
});
