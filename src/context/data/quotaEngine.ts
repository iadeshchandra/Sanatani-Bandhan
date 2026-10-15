// ---------------------------------------------------------------------------
// Demo Playground Conversion Engine — Quota v2
// ---------------------------------------------------------------------------
// Demo workspaces get exactly DEMO_CREATES_PER_MODULE free creates per
// module. Seed records never count. Quota applies ONLY to demo workspaces
// (id starts with DEMO_); registered workspaces are unlimited.
// Record convention: seed sets `isDemoSeed: true`; user-created records
// leave it absent/false, which is how reset/convert distinguish them.
export const DEMO_QUOTA_KEY_PREFIX = 'sb_demo_count_';
export const DEMO_CREATES_PER_MODULE = 5;
export const PENDING_DEMO_CONVERSION_KEY = 'sb_pending_demo_conversion';
const AUTO_PURGE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours auto-delete retention window

/**
 * SECURITY (C-4): the 24h auto-purge TTL is a DEMO-sandbox mechanism only.
 * Real workspaces must NEVER receive an `_expiresAt` stamp — the sweeper
 * would otherwise delete a temple's real records with no recovery.
 * Spread the result into a new record literal: `...demoTtlFields(wsId)`.
 */
export const demoTtlFields = (workspaceId: string | undefined | null): { _expiresAt?: number } => {
  if (typeof workspaceId === 'string' && workspaceId.startsWith('DEMO_')) {
    return { _expiresAt: Date.now() + AUTO_PURGE_TTL_MS };
  }
  return {};
};

export interface QuotaResult {
  allowed: boolean;
  /** Creates remaining in this module (0 when at limit). */
  remaining: number;
  /** True only on the call that transitions the module to the limit. */
  justHitLimit: boolean;
}

export interface DemoUpsell {
  module: string;
  displayName: string;
  entityLabel: string;
}

/** Display metadata for quota-tracked modules. */
const DEMO_MODULE_META: Record<string, { display: string; entityPlural: string }> = {
  devotees: { display: 'Devotees', entityPlural: 'devotees' },
  families: { display: 'Families', entityPlural: 'families' },
  guests: { display: 'Guests', entityPlural: 'guests' },
  treasury: { display: 'Treasury', entityPlural: 'donations' },
  assets: { display: 'Assets', entityPlural: 'assets' },
  inventory: { display: 'Inventory', entityPlural: 'items' },
  pooja: { display: 'Pooja Bookings', entityPlural: 'bookings' },
  goshala: { display: 'Goshala', entityPlural: 'cow records' },
  bhoomi: { display: 'Bhoomi', entityPlural: 'properties' },
  vahan: { display: 'Vahan Fleet', entityPlural: 'fleet records' },
  'seva-subscriptions': { display: 'Recurring Seva', entityPlural: 'subscriptions' },
  annadanam: { display: 'Annadanam', entityPlural: 'sponsorships' },
  resolutions: { display: 'Resolutions', entityPlural: 'resolutions' },
  residentPujas: { display: 'Resident Pujas', entityPlural: 'schedules' },
  pitruRecords: { display: 'Pitru Records', entityPlural: 'records' },
  gurukulStudents: { display: 'Gurukul', entityPlural: 'students' },
  shifts: { display: 'Sevadar Shifts', entityPlural: 'shifts' },
};

export const DEMO_QUOTA_MODULES = Object.keys(DEMO_MODULE_META);

export const demoModuleMeta = (moduleName: string) =>
  DEMO_MODULE_META[moduleName] || { display: moduleName, entityPlural: 'records' };
