/**
 * glanceRbac.test.ts — RBAC Security Audit for the Glance Feed
 * =============================================================
 * The most important test in Phase 3: proves that a Devotee-role user
 * NEVER receives Trustee-only items in the merged "what needs me" feed,
 * even when the same person holds different roles across orgs.
 *
 * These are pure-logic tests (no Firestore, no emulators needed).
 */
import {
  buildOrgGlanceSummary,
  glanceForRole,
  isStewardRole,
  normalizeRole,
  toGlanceDoc,
  fromGlanceDoc,
  type OrgGlanceSummary,
} from '../lib/orgGlance';
import {
  mergeGlanceFeed,
  orgGlanceToCards,
  personalToGlance,
  type GlanceItem,
} from '../lib/glanceFeed';
import type { ModuleSnapshot } from '../lib/appIntelligence';
import type { SuchanaItem } from '../lib/suchanaFeed';

/** Snapshot with steward-visible problems: overdue pledged donations. */
function stewardHeavySnapshot(): ModuleSnapshot {
  const now = new Date();
  const oldDate = new Date(now.getTime() - 10 * 86400000).toISOString().slice(0, 10);
  return {
    now,
    donations: [
      {
        id: 'don1',
        donorName: 'Test Donor',
        amount: 5000,
        status: 'pledged',
        date: oldDate,
      } as any,
    ],
    treasury: [],
    inventory: [],
  };
}

function personalItem(): SuchanaItem {
  return {
    id: 'panjika:diwali:solo:2026-11-08',
    source: 'panjika',
    severity: 'nudge',
    roles: ['all'],
    title: { en: 'Diwali approaches', bn: 'দীপাবলি আসছে', hi: 'दीवाली आ रही है' },
    message: { en: 'Prepare', bn: 'প্রস্তুতি', hi: 'तैयारी' },
    actionLabel: { en: 'View', bn: 'দেখুন', hi: 'देखें' },
    actionRoute: 'panjika',
    date: '2026-11-08',
    dedupeKey: 'panjika:diwali:solo:2026-11-08',
  };
}

describe('RBAC: role normalization', () => {
  it('treats role strings case-insensitively', () => {
    expect(normalizeRole('Trustee')).toBe('trustee');
    expect(normalizeRole('SUPERADMIN')).toBe('superadmin');
    expect(normalizeRole('  Devotee ')).toBe('devotee');
    expect(normalizeRole(null)).toBe('');
    expect(normalizeRole(undefined)).toBe('');
  });

  it('classifies steward vs member roles correctly', () => {
    expect(isStewardRole('Trustee')).toBe(true);
    expect(isStewardRole('SuperAdmin')).toBe(true);
    expect(isStewardRole('Accountant')).toBe(true);
    expect(isStewardRole('trustee')).toBe(true);
    expect(isStewardRole('Devotee')).toBe(false);
    expect(isStewardRole('Priest')).toBe(false);
    expect(isStewardRole('Sevadar')).toBe(false);
    expect(isStewardRole('')).toBe(false);
    expect(isStewardRole(null)).toBe(false);
  });
});

describe('RBAC: glanceForRole enforcement', () => {
  const summary: OrgGlanceSummary = {
    workspaceId: 'ws1',
    orgName: 'Test Mandir',
    orgType: 'Mandir',
    updatedAt: Date.now(),
    steward: { actionCount: 3, infoCount: 1, headlines: ['a'], soonestDate: null },
    member: { actionCount: 0, infoCount: 2, headlines: ['b'], soonestDate: null },
  };

  it('gives stewards BOTH sections', () => {
    for (const role of ['Trustee', 'SuperAdmin', 'Accountant', 'TRUSTEE']) {
      const v = glanceForRole(summary, role);
      expect(v.steward).not.toBeNull();
      expect(v.steward!.actionCount).toBe(3);
      expect(v.member.infoCount).toBe(2);
    }
  });

  it('gives members ONLY the member section — steward is null', () => {
    for (const role of ['Devotee', 'Priest', 'Sevadar', 'Member', 'devotee']) {
      const v = glanceForRole(summary, role);
      expect(v.steward).toBeNull();
      expect(v.member.infoCount).toBe(2);
    }
  });

  it('fail-closes on unknown/empty roles (member section only)', () => {
    for (const role of ['', null, undefined, 'Hacker' as any]) {
      const v = glanceForRole(summary, role as any);
      expect(v.steward).toBeNull();
    }
  });

  it('fail-closes on null summary', () => {
    const v = glanceForRole(null, 'Trustee');
    expect(v.steward).toBeNull();
    expect(v.member.actionCount).toBe(0);
  });
});

describe('RBAC: end-to-end — devotee never sees trustee items', () => {
  it('a devotee in Org A sees no steward cards even when Org A has steward problems', () => {
    // Org A has real steward-visible issues (overdue dues).
    const summary = buildOrgGlanceSummary(
      'orgA',
      'Shri Mandir',
      'Mandir',
      stewardHeavySnapshot(),
      'Trustee' // written by a steward so both sections exist
    );
    expect(summary.steward).not.toBeNull();

    // Viewer is a DEVOTEE in Org A.
    const visible = glanceForRole(summary, 'Devotee');
    expect(visible.steward).toBeNull(); // <-- the critical assertion

    const cards = orgGlanceToCards({
      orgId: 'orgA',
      orgName: 'Shri Mandir',
      orgType: 'Mandir',
      section: visible.member,
      audience: 'member',
    });
    // Member cards must never carry steward audience or steward headlines.
    for (const c of cards) {
      expect(c.audience).toBe('member');
      expect(c.orgId).toBe('orgA');
    }
    // And crucially: no card derived from the steward section exists.
    const stewardCards = orgGlanceToCards({
      orgId: 'orgA',
      orgName: 'Shri Mandir',
      orgType: 'Mandir',
      section: visible.steward || { actionCount: 0, infoCount: 0, headlines: [], soonestDate: null },
      audience: 'steward',
    });
    // The devotee's pipeline never builds steward cards at all.
    expect(visible.steward).toBeNull();
    expect(stewardCards.length).toBe(0); // empty section → no cards
  });

  it('same person: trustee in Org A sees steward cards, devotee in Org B does not', () => {
    const summaryA = buildOrgGlanceSummary('orgA', 'Shri Mandir', 'Mandir', stewardHeavySnapshot(), 'Trustee');
    const summaryB = buildOrgGlanceSummary('orgB', 'Goshala', 'Goshala', stewardHeavySnapshot(), 'Trustee');

    // As Trustee of Org A:
    const visA = glanceForRole(summaryA, 'Trustee');
    expect(visA.steward).not.toBeNull();

    // As Devotee of Org B (same human, different hat):
    const visB = glanceForRole(summaryB, 'Devotee');
    expect(visB.steward).toBeNull();

    // Merged feed: Org A steward cards present, Org B steward cards absent.
    const cardsA = orgGlanceToCards({
      orgId: 'orgA', orgName: 'Shri Mandir', orgType: 'Mandir',
      section: visA.steward!, audience: 'steward',
    });
    const cardsB = orgGlanceToCards({
      orgId: 'orgB', orgName: 'Goshala', orgType: 'Goshala',
      section: visB.member, audience: 'member',
    });
    const feed = mergeGlanceFeed([personalToGlance(personalItem())], [...cardsA, ...cardsB]);

    const orgASteward = feed.filter((i) => i.orgId === 'orgA' && i.audience === 'steward');
    const orgBSteward = feed.filter((i) => i.orgId === 'orgB' && i.audience === 'steward');
    expect(orgASteward.length).toBeGreaterThan(0);
    expect(orgBSteward.length).toBe(0); // <-- no leakage across roles
  });

  it('merged feed never contains steward-audience items for a pure devotee', () => {
    const summary = buildOrgGlanceSummary('orgA', 'Shri Mandir', 'Mandir', stewardHeavySnapshot(), 'Trustee');
    const visible = glanceForRole(summary, 'Devotee');
    const cards: GlanceItem[] = [];
    if (visible.steward) {
      cards.push(...orgGlanceToCards({
        orgId: 'orgA', orgName: 'Shri Mandir', orgType: 'Mandir',
        section: visible.steward, audience: 'steward',
      }));
    }
    cards.push(...orgGlanceToCards({
      orgId: 'orgA', orgName: 'Shri Mandir', orgType: 'Mandir',
      section: visible.member, audience: 'member',
    }));
    const feed = mergeGlanceFeed([personalToGlance(personalItem())], cards);
    expect(feed.every((i) => i.audience !== 'steward')).toBe(true);
  });
});

describe('RBAC: serialization round-trip preserves sections', () => {
  it('toGlanceDoc/fromGlanceDoc keeps steward and member separate', () => {
    const s = buildOrgGlanceSummary('w1', 'N', 'T', stewardHeavySnapshot(), 'Trustee');
    const doc = toGlanceDoc(s);
    const back = fromGlanceDoc(doc as Record<string, unknown>);
    expect(back).not.toBeNull();
    expect(back!.workspaceId).toBe('w1');
    // Sections survive the round trip intact for role filtering.
    expect(back!.steward !== null).toBe(s.steward !== null);
  });

  it('fromGlanceDoc rejects garbage', () => {
    expect(fromGlanceDoc(null)).toBeNull();
    expect(fromGlanceDoc(undefined)).toBeNull();
    expect(fromGlanceDoc({} as any)).toBeNull();
    expect(fromGlanceDoc({ workspaceId: '' } as any)).toBeNull();
  });
});
