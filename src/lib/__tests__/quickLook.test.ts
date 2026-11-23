/**
 * quickLook.test.ts — TWO-MODE M1: the Quick Look shaping laws.
 * =====================================================================
 * The strip may only surface enrolments the SHARED console-door
 * verdict (lib/orgConsoleAccess) opens, judged per workspace:
 * staff edges in (scoped or not — scope fences desks, not the
 * door), Devotee-floor and expired edges out, creators in,
 * SuperAdmin in everywhere the registry reaches, demo sandboxes
 * never (previews, not enrolments), and nothing at all while the
 * membership evidence is still loading. The peek's festival line
 * follows the public discovery rules exactly: published, not
 * cancelled, not over — earliest next, ongoing counts from today.
 */

// The resolver's module graph pulls the auth/membership contexts
// (and Firebase ESM) — stubbed at the boundary, as rtFix.test.ts does.
jest.mock('../../context/AuthWorkspaceContext', () => ({
  useAuthWorkspace: () => ({
    activeWorkspace: null,
    currentRole: 'Devotee',
    firebaseUser: null,
  }),
}));

jest.mock('../../context/MembershipContext', () => ({
  useMembership: () => ({ myMemberships: [], membershipsLoaded: true }),
}));

import {
  buildQuickLookCards,
  pickNextFestival,
  shapeOrgEnrolments,
  type QuickLookMembership,
  type QuickLookWorkspaceInfo,
} from '../quickLook';
import type { FestivalEventDoc, Lang3 } from '../festival';

const NOW = Date.UTC(2026, 10, 23, 6, 0, 0); // 2026-11-23

const ws = (
  id: string,
  name: string,
  over: Partial<QuickLookWorkspaceInfo> = {},
): QuickLookWorkspaceInfo => ({ id, name, type: 'Mandir', ...over });

const edge = (
  workspaceId: string,
  role: string,
  over: Partial<QuickLookMembership> = {},
): QuickLookMembership => ({
  workspaceId,
  uid: 'u1',
  role,
  deskScope: null,
  roleExpiresAt: null,
  ...over,
});

const base = {
  workspaces: [] as QuickLookWorkspaceInfo[],
  memberships: [] as QuickLookMembership[],
  membershipsLoaded: true,
  uid: 'u1' as string | null,
  globalRole: 'Devotee',
  activeWorkspaceId: null as string | null,
  now: NOW,
};

describe('shapeOrgEnrolments — the strip surfaces only open doors', () => {
  it('a staff edge surfaces a card carrying the verdict role', () => {
    const cards = shapeOrgEnrolments({
      ...base,
      workspaces: [ws('WS-1', 'Kashi Mandir')],
      memberships: [edge('WS-1', 'Trustee')],
    });
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      kind: 'org',
      workspaceId: 'WS-1',
      name: 'Kashi Mandir',
      role: 'Trustee',
      isActive: false,
    });
  });

  it('a Devotee-floor membership surfaces nothing', () => {
    const cards = shapeOrgEnrolments({
      ...base,
      workspaces: [ws('WS-1', 'Kashi Mandir')],
      memberships: [edge('WS-1', 'Devotee')],
    });
    expect(cards).toEqual([]);
  });

  it('an expired staff edge degrades to the floor — no card', () => {
    const cards = shapeOrgEnrolments({
      ...base,
      workspaces: [ws('WS-1', 'Kashi Mandir')],
      memberships: [edge('WS-1', 'Trustee', { roleExpiresAt: NOW - 1000 })],
    });
    expect(cards).toEqual([]);
  });

  it('a desk-scoped staff edge still opens the door (scope fences desks, not the door)', () => {
    const cards = shapeOrgEnrolments({
      ...base,
      workspaces: [ws('WS-1', 'Kashi Mandir')],
      memberships: [edge('WS-1', 'Sevadar', { deskScope: ['gate-scanner'] })],
    });
    expect(cards).toHaveLength(1);
    expect(cards[0].role).toBe('Sevadar');
  });

  it('the recorded creator surfaces as Trustee with no edge at all', () => {
    const cards = shapeOrgEnrolments({
      ...base,
      workspaces: [ws('WS-1', 'My Trust', { createdBy: 'u1' })],
      memberships: [],
    });
    expect(cards).toHaveLength(1);
    expect(cards[0].role).toBe('Trustee');
  });

  it('SuperAdmin clearance surfaces every registry workspace', () => {
    const cards = shapeOrgEnrolments({
      ...base,
      workspaces: [ws('WS-1', 'A Mandir'), ws('WS-2', 'B Ashram')],
      memberships: [],
      globalRole: 'SuperAdmin',
    });
    expect(cards.map((c) => c.workspaceId)).toEqual(['WS-1', 'WS-2']);
    expect(cards.every((c) => c.role === 'SuperAdmin')).toBe(true);
  });

  it('a staff role earned ELSEWHERE never bleeds into this org (RT-03)', () => {
    const cards = shapeOrgEnrolments({
      ...base,
      workspaces: [ws('WS-1', 'Other Org')],
      memberships: [],
      globalRole: 'Trustee', // global fallback must NOT unlock WS-1
    });
    expect(cards).toEqual([]);
  });

  it('a membership whose workspace is not in the registry is dropped', () => {
    const cards = shapeOrgEnrolments({
      ...base,
      workspaces: [],
      memberships: [edge('WS-GHOST', 'Trustee')],
    });
    expect(cards).toEqual([]);
  });

  it('demo sandboxes never surface, even for a staff persona', () => {
    const cards = shapeOrgEnrolments({
      ...base,
      workspaces: [ws('DEMO_ws-mandir', 'Demo Mandir')],
      memberships: [],
      globalRole: 'Trustee',
    });
    expect(cards).toEqual([]);
  });

  it('while memberships are loading, an edgeless non-creator sees nothing yet', () => {
    const cards = shapeOrgEnrolments({
      ...base,
      workspaces: [ws('WS-1', 'Kashi Mandir')],
      memberships: [],
      membershipsLoaded: false,
    });
    expect(cards).toEqual([]);
  });

  it('sorts the active workspace first, then by name', () => {
    const cards = shapeOrgEnrolments({
      ...base,
      workspaces: [ws('WS-1', 'Zeta Trust'), ws('WS-2', 'Alpha Mandir')],
      memberships: [edge('WS-1', 'Trustee'), edge('WS-2', 'Accountant')],
      activeWorkspaceId: 'WS-1',
    });
    expect(cards.map((c) => c.workspaceId)).toEqual(['WS-1', 'WS-2']);
    expect(cards[0].isActive).toBe(true);
    expect(cards[1].isActive).toBe(false);
  });
});

describe('buildQuickLookCards — strip order', () => {
  it('org cards first, then professional cards; empty stays empty', () => {
    expect(buildQuickLookCards([], [])).toEqual([]);
    const org = shapeOrgEnrolments({
      ...base,
      workspaces: [ws('WS-1', 'Kashi Mandir')],
      memberships: [edge('WS-1', 'Priest')],
    });
    const cards = buildQuickLookCards(org, [
      { kind: 'purohit', identityId: 'PUR-000001' },
      { kind: 'jyotish', identityId: 'JYO-000001' },
    ]);
    expect(cards.map((c) => c.kind)).toEqual(['org', 'purohit', 'jyotish']);
  });
});

/* ------------------------------------------------------------------ */
/* The peek's next-festival line                                       */
/* ------------------------------------------------------------------ */

const fest = (over: Partial<FestivalEventDoc>): FestivalEventDoc =>
  ({
    id: 'WS-1__fest',
    workspaceId: 'WS-1',
    festivalKey: 'fest',
    orgName: 'Kashi Mandir',
    name: { en: 'Festival', hi: 'उत्सव', bn: 'উৎসব' } as Lang3,
    dateISO: '2026-12-01',
    endDateISO: '2026-12-01',
    published: true,
    festivalCancelled: false,
    ...over,
  }) as FestivalEventDoc;

const pickEn = (name: Lang3) => name.en;
const TODAY = '2026-11-23';

describe('pickNextFestival — the public discovery rules, exactly', () => {
  it('returns null when nothing qualifies', () => {
    expect(pickNextFestival([], TODAY, pickEn)).toBeNull();
    expect(
      pickNextFestival([fest({ published: false })], TODAY, pickEn),
    ).toBeNull();
    expect(
      pickNextFestival(
        [fest({ dateISO: '2026-11-01', endDateISO: '2026-11-02' })],
        TODAY,
        pickEn,
      ),
    ).toBeNull();
  });

  it('a trustee-cancelled festival is never the next festival', () => {
    expect(
      pickNextFestival([fest({ festivalCancelled: true })], TODAY, pickEn),
    ).toBeNull();
  });

  it('picks the earliest upcoming festival', () => {
    const next = pickNextFestival(
      [
        fest({ id: 'WS-1__late', dateISO: '2026-12-25', endDateISO: '2026-12-25' }),
        fest({ id: 'WS-1__soon', dateISO: '2026-11-30', endDateISO: '2026-11-30' }),
      ],
      TODAY,
      pickEn,
    );
    expect(next?.id).toBe('festival:WS-1__soon');
    expect(next?.startISO).toBe('2026-11-30');
  });

  it('an ongoing festival counts from today and wins over a later one', () => {
    const next = pickNextFestival(
      [
        fest({ id: 'WS-1__later', dateISO: '2026-12-10', endDateISO: '2026-12-10' }),
        fest({ id: 'WS-1__now', dateISO: '2026-11-22', endDateISO: '2026-11-24' }),
      ],
      TODAY,
      pickEn,
    );
    expect(next?.id).toBe('festival:WS-1__now');
  });
});
