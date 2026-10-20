/**
 * platformAdminRoles.test.ts — pins the delegated-admin role model (QUEUED #21).
 *
 * The properties under test are the safety contract of the whole feature:
 *   1. The owner sees everything and NEVER depends on the platformAdmins
 *      collection (a broken/empty registry cannot lock the owner out).
 *   2. Delegated roles never reach the owner-only set: API keys, billing,
 *      commission, finance, database, settings, system, admin management.
 *   3. Every doubt (missing doc, revoked doc, malformed role, failed
 *      lookup) resolves to NO access.
 *
 * platformAdminRoles is a pure module (no Firebase imports) — no mocks.
 */
import {
  GODMODE_TAB_IDS,
  OWNER_ONLY_TABS,
  ADMIN_TABS,
  MODERATOR_TABS,
  tabsForRole,
  canAccessTab,
  sanitizeDelegatedRole,
  resolveEffectiveRole,
} from '../platformAdminRoles';

describe('owner role — everything, always', () => {
  it('owner sees every tab, including the full owner-only set', () => {
    expect(tabsForRole('owner')).toEqual(GODMODE_TAB_IDS);
    for (const tab of GODMODE_TAB_IDS) {
      expect(canAccessTab('owner', tab)).toBe(true);
    }
  });

  it('owner resolution never depends on the registry: no doc at all', () => {
    expect(resolveEffectiveRole({ isOwner: true, grant: null })).toBe('owner');
  });

  it('owner resolution survives a failed registry lookup', () => {
    expect(resolveEffectiveRole({ isOwner: true, lookupFailed: true })).toBe('owner');
  });

  it('owner wins even over a revoked/malformed registry doc in their name', () => {
    expect(resolveEffectiveRole({ isOwner: true, grant: { role: 'bogus', active: false } })).toBe('owner');
  });
});

describe('delegated admin role — operations without the crown jewels', () => {
  it('admin is denied every owner-only tab', () => {
    for (const tab of OWNER_ONLY_TABS) {
      expect(canAccessTab('admin', tab)).toBe(false);
    }
    // The crown jewels by name, so a future edit must break this test loudly:
    expect(canAccessTab('admin', 'apikeys')).toBe(false);
    expect(canAccessTab('admin', 'billing')).toBe(false);
    expect(canAccessTab('admin', 'commission')).toBe(false);
    expect(canAccessTab('admin', 'finance')).toBe(false);
    expect(canAccessTab('admin', 'settings')).toBe(false);
    expect(canAccessTab('admin', 'admins')).toBe(false);
  });

  it('admin keeps the day-to-day operations surface', () => {
    for (const tab of ['overview', 'users', 'workspaces', 'verification', 'moderation',
      'messages', 'content', 'support', 'translations', 'ranking',
      'marketplace', 'professionals', 'growth', 'audit'] as const) {
      expect(canAccessTab('admin', tab)).toBe(true);
    }
    expect(ADMIN_TABS.length).toBe(GODMODE_TAB_IDS.length - OWNER_ONLY_TABS.length);
  });
});

describe('delegated moderator role — trust & safety only', () => {
  it('moderator sees exactly the trust & safety surface', () => {
    expect([...MODERATOR_TABS].sort()).toEqual(['moderation', 'overview', 'support', 'users']);
  });

  it('moderator is denied operations and money tabs alike', () => {
    for (const tab of ['messages', 'content', 'verification', 'workspaces', 'audit',
      'billing', 'apikeys', 'settings', 'admins'] as const) {
      expect(canAccessTab('moderator', tab)).toBe(false);
    }
    expect(canAccessTab('moderator', 'moderation')).toBe(true);
    expect(canAccessTab('moderator', 'support')).toBe(true);
  });
});

describe('no role — no console', () => {
  it('null/undefined role sees no tabs and accesses nothing', () => {
    expect(tabsForRole(null)).toEqual([]);
    expect(tabsForRole(undefined)).toEqual([]);
    expect(canAccessTab(null, 'overview')).toBe(false);
    expect(canAccessTab(undefined, 'moderation')).toBe(false);
  });

  it('unknown tab ids are denied even for the owner set builder', () => {
    expect(canAccessTab('admin', 'not-a-real-tab')).toBe(false);
    expect(canAccessTab('moderator', '')).toBe(false);
  });
});

describe('resolveEffectiveRole — registry decisions fail safe', () => {
  it('active admin grant resolves to admin', () => {
    expect(resolveEffectiveRole({ isOwner: false, grant: { role: 'admin', active: true } })).toBe('admin');
  });

  it('moderator grant with active missing defaults to active', () => {
    expect(resolveEffectiveRole({ isOwner: false, grant: { role: 'moderator' } })).toBe('moderator');
  });

  it('revoked grant (active === false) resolves to null', () => {
    expect(resolveEffectiveRole({ isOwner: false, grant: { role: 'admin', active: false } })).toBeNull();
  });

  it('missing grant resolves to null', () => {
    expect(resolveEffectiveRole({ isOwner: false, grant: null })).toBeNull();
    expect(resolveEffectiveRole({ isOwner: false })).toBeNull();
  });

  it('failed lookup resolves to null — never a guess', () => {
    expect(resolveEffectiveRole({ isOwner: false, lookupFailed: true })).toBeNull();
    expect(resolveEffectiveRole({ isOwner: false, grant: { role: 'admin' }, lookupFailed: true })).toBeNull();
  });

  it('malformed role values in the doc resolve to null', () => {
    expect(resolveEffectiveRole({ isOwner: false, grant: { role: 'owner' } })).toBeNull();
    expect(resolveEffectiveRole({ isOwner: false, grant: { role: 'SuperAdmin' } })).toBeNull();
    expect(resolveEffectiveRole({ isOwner: false, grant: { role: 42 } })).toBeNull();
    expect(resolveEffectiveRole({ isOwner: false, grant: {} })).toBeNull();
  });
});

describe('sanitizeDelegatedRole', () => {
  it('accepts exactly the two grantable roles', () => {
    expect(sanitizeDelegatedRole('admin')).toBe('admin');
    expect(sanitizeDelegatedRole('moderator')).toBe('moderator');
  });

  it('rejects owner and anything else — owner is never grantable', () => {
    expect(sanitizeDelegatedRole('owner')).toBeNull();
    expect(sanitizeDelegatedRole('SuperAdmin')).toBeNull();
    expect(sanitizeDelegatedRole('')).toBeNull();
    expect(sanitizeDelegatedRole(null)).toBeNull();
    expect(sanitizeDelegatedRole(undefined)).toBeNull();
  });
});

describe('tab classification is exhaustive', () => {
  it('every tab is classified: owner-only or delegable, no overlap, no orphans', () => {
    const delegable = GODMODE_TAB_IDS.filter((t) => !OWNER_ONLY_TABS.includes(t));
    expect(delegable).toEqual(ADMIN_TABS);
    for (const tab of MODERATOR_TABS) {
      expect(ADMIN_TABS.includes(tab)).toBe(true);
    }
    expect(GODMODE_TAB_IDS.length).toBe(22); // 21 legacy tabs + admins
  });
});
