import { WorkspaceType } from '../types';
import { SubscriptionTier, TIER_LEVELS } from '../config/planPricing';

/**
 * RBAC VOCABULARY — single canonical reference (H-2 reconciliation).
 *
 * This app has TWO orthogonal access vocabularies; they answer different
 * questions and must not be confused:
 *
 *   1. ROLES (who the user is): SuperAdmin > Trustee > CSO > Accountant >
 *      Priest > Sevadar > Devotee. Enforced per-desk in App.tsx via
 *      checkPermission([...]) and in Firestore security rules. Roles are
 *      about *people*.
 *   2. TIERS (what the workspace pays for): LITE (Seva Free) < STANDARD <
 *      ENTERPRISE, plus DEMO (full surface, quota-bound instead). Enforced
 *      via MODULE_PLAN_TIER below — at nav (Sidebar lock badges + upsell)
 *      AND at desk mount (App.tsx renderActiveDesk guard). Tiers are about
 *      the *workspace's subscription*.
 *
 * A user needs BOTH: the right role AND a workspace tier that includes the
 * desk. Either check failing → no access. The old DESK_REGISTRY /
 * getAvailableDesks / isDeskAllowedForPlan parallel system had zero call
 * sites and is deleted; MODULE_PLAN_TIER is the single enforced source of
 * truth for tier gating.
 */
/**
 * C-6 — Monetization: plan-tier gating for desks.
 *
 * Plan resolution is centralized here:
 *   - 'DEMO' | 'LITE' | 'STANDARD' | 'ENTERPRISE' are honored verbatim.
 *   - A missing/unknown planId defaults to 'LITE' (Seva Free) — NEVER 'DEMO'.
 *
 * DEMO workspaces see the full desk surface (access level 3): the binding
 * constraint for demos is the separate 5-creates-per-module demo quota, not
 * plan limits — the demo funnel must stay fully explorable.
 */
export type WorkspacePlanId = 'DEMO' | SubscriptionTier;

const PLAN_ACCESS_LEVEL: Record<WorkspacePlanId, number> = {
  DEMO: 3,
  LITE: TIER_LEVELS.LITE,
  STANDARD: TIER_LEVELS.STANDARD,
  ENTERPRISE: TIER_LEVELS.ENTERPRISE,
};

export function resolvePlanId(planId?: string | null): WorkspacePlanId {
  const p = (planId || '').toUpperCase();
  if (p === 'DEMO' || p === 'LITE' || p === 'STANDARD' || p === 'ENTERPRISE') {
    return p as WorkspacePlanId;
  }
  return 'LITE';
}

/**
 * Sidebar MODULE_CATALOG nav id → minimum required tier.
 * Derived from PLAN_PRICING's includedDesks. Modules NOT listed here are not
 * plan-gated (permissive default — never lock a desk we haven't mapped).
 */
export const MODULE_PLAN_TIER: Record<string, SubscriptionTier> = {
  // LITE — Seva Free core desks
  poojaBooking: 'LITE',
  panchang: 'LITE',
  'quick-chanda-pos': 'LITE',
  sandeshBroadcast: 'LITE',
  // STANDARD — operations suite
  annadanam: 'STANDARD',
  dharamshala: 'STANDARD',
  goshala: 'STANDARD',
  campaigns: 'STANDARD',
  'sevadar-roster': 'STANDARD',
  karmaLedger: 'STANDARD',
  inventory: 'STANDARD',
  taxReceipts: 'STANDARD',
  // ENTERPRISE — ERP & governance
  federation: 'ENTERPRISE',
  treasury: 'ENTERPRISE',
  'crisis-command': 'ENTERPRISE',
};

/** Is a sidebar module (by MODULE_CATALOG nav id) allowed on the plan? */
export function isModuleAllowedForPlan(moduleId: string, planId?: string | null): boolean {
  const required = MODULE_PLAN_TIER[moduleId];
  if (!required) return true;
  const planLevel = PLAN_ACCESS_LEVEL[resolvePlanId(planId)] ?? 1;
  return planLevel >= (TIER_LEVELS[required] ?? 1);
}

/** Minimum tier required for a sidebar module, or null if not plan-gated. */
export function requiredTierForModule(moduleId: string): SubscriptionTier | null {
  return MODULE_PLAN_TIER[moduleId] ?? null;
}

/**
 * H-2: App.tsx switch-case aliases → canonical MODULE_PLAN_TIER keys.
 * The desk switch in App.tsx accepts many alias spellings per desk
 * (e.g. 'treasury-ledger', 'hundi', 'golak' all mount the treasury desk).
 * Tier enforcement at desk mount must resolve through this map, otherwise
 * a LITE workspace could open an ENTERPRISE desk via an unmapped alias URL.
 * Modules not listed here are not plan-gated (permissive by design).
 */
export const MODULE_ID_ALIASES: Record<string, string> = {
  // ENTERPRISE
  'federation-multi-branch': 'federation',
  'multi-branch': 'federation',
  'branch-federation': 'federation',
  'treasury-audit': 'treasury',
  treasuryAudit: 'treasury',
  'treasury-ledger': 'treasury',
  hundi: 'treasury',
  'hundi-audit': 'treasury',
  'hundi-counting': 'treasury',
  golak: 'treasury',
  // STANDARD
  'mandir-campaigns': 'campaigns',
  'karma-ledger': 'karmaLedger',
  'store-inventory': 'inventory',
  'tax-receipt-80g': 'taxReceipts',
  'tally-export': 'taxReceipts',
  tallyExport: 'taxReceipts',
  form10bd: 'taxReceipts',
  'form-10bd': 'taxReceipts',
  form10bdCompliance: 'taxReceipts',
  'form-10bd-compliance': 'taxReceipts',
  '/sevadar-roster': 'sevadar-roster',
  sevadarRoster: 'sevadar-roster',
  'sevadar-hr': 'sevadar-roster',
  'annadanam-kitchen': 'annadanam',
  'dharamshala-yatri-bhavan': 'dharamshala',
  'gau-seva-goshala': 'goshala',
  'whatsapp-broadcaster': 'sandeshBroadcast',
  'panchang-muhurat': 'panchang',
  'panchang-astrology-engine': 'panchang',
  'panchang-engine': 'panchang',
  // LITE
  'pooja-booking': 'poojaBooking',
  quickChandaPos: 'quick-chanda-pos',
  'chanda-pos': 'quick-chanda-pos',
  'counter-pos': 'quick-chanda-pos',
};

/** Resolve an App.tsx module id (alias or canonical) to its canonical MODULE_PLAN_TIER key. */
export function resolvePlanModuleId(moduleId: string): string {
  return MODULE_ID_ALIASES[moduleId] ?? moduleId;
}

/**
 * H-2 central tier gate: is this module mountable on the workspace's plan?
 * Used at nav (Sidebar) AND at desk mount (App.tsx renderActiveDesk).
 * DEMO workspaces resolve to full access (level 3); the demo quota is the
 * binding constraint there, not plan limits.
 */
export function isModuleMountAllowed(moduleId: string, planId?: string | null): boolean {
  return isModuleAllowedForPlan(resolvePlanModuleId(moduleId), planId);
}

// ==========================================
// Existing Workspace Archetype Registry
// ==========================================
export const workspaceRegistry: Record<WorkspaceType, string[]> = {
  Mandir: [
    'dashboard', 'devotees', 'family', 'treasury', 'taxReceipts',
    'poojaBooking', 'mandirPuja', 'panchang', 'utsavPanjika',
    'sandeshBroadcast', 'socialWall', 'dharmicAssistant',
    'masterSettings', 'spiritualSettings',
    'bhoomi', 'vahan', 'recurring-seva',
  ],
  Goshala: [
    'dashboard', 'devotees', 'guests', 'bulkImport', 'treasury', 'taxReceipts',
    'campaigns', 'assets', 'inventory', 'goshala',
    'sandeshBroadcast', 'dharmicAssistant', 'masterSettings'
  ],
  Sangha: [
    'dashboard', 'devotees', 'family', 'treasury', 'campaigns',
    'sanghaDrills', 'panchayatPolls', 'matrimony',
    'sandeshBroadcast', 'socialWall', 'dharmicAssistant', 'masterSettings',
    'bhoomi', 'vahan', 'recurring-seva',
  ],
  Samaj: [
    'dashboard', 'devotees', 'family', 'treasury', 'campaigns',
    'sanghaDrills', 'panchayatPolls', 'matrimony',
    'sandeshBroadcast', 'socialWall', 'dharmicAssistant', 'masterSettings',
    'bhoomi', 'vahan', 'recurring-seva',
  ],
  Ashram: [
    'dashboard', 'devotees', 'guests', 'treasury',
    'ashramKutir', 'satsang', 'granthLibrary', 'shlokaFeed',
    'sandeshBroadcast', 'dharmicAssistant', 'masterSettings', 'spiritualSettings',
    'bhoomi', 'vahan', 'recurring-seva',
  ],
  Yoga: [
    'dashboard', 'devotees', 'guests', 'treasury',
    'ashramKutir', 'satsang',
    'sandeshBroadcast', 'dharmicAssistant', 'masterSettings'
  ],
  Satsang: [
    'dashboard', 'devotees', 'family', 'treasury',
    'satsang', 'granthLibrary', 'shlokaFeed',
    'sandeshBroadcast', 'socialWall', 'dharmicAssistant', 'masterSettings'
  ],
  Gurukul: [
    'dashboard', 'devotees', 'family', 'treasury', 'inventory',
    'gurukul', 'gurukulAcademy', 'vidyalaya', 'granthLibrary', 'goshala',
    'sandeshBroadcast', 'dharmicAssistant', 'masterSettings',
    'bhoomi', 'vahan', 'recurring-seva',
  ],
  Vidyalaya: [
    'dashboard', 'devotees', 'treasury', 'inventory',
    'vidyalaya', 'sandeshBroadcast', 'dharmicAssistant', 'masterSettings'
  ],
  PurohitSabha: [
    'dashboard', 'devotees', 'family', 'treasury',
    'poojaBooking', 'purohitDesk', 'purohitMarket', 'pitruShradh', 'panchang',
    'panchayatPolls', 'sandeshBroadcast', 'masterSettings', 'trusteeGovernance'
  ],
  Trust: [
    'dashboard', 'devotees', 'guests', 'bulkImport', 'treasury', 'taxReceipts',
    'campaigns', 'karmaLedger', 'assets', 'sevaTrust', 'rakthaSeva', 'annadanam',
    'sandeshBroadcast', 'dharmaMarketing', 'trusteeGovernance', 'legalVault', 'masterSettings',
    'bhoomi', 'vahan', 'recurring-seva',
  ],
  AkshayaPatra: [
    'dashboard', 'devotees', 'guests', 'bulkImport', 'treasury', 'taxReceipts',
    'campaigns', 'assets', 'sevaTrust', 'annadanam', 'rakthaSeva', 'inventory',
    'sandeshBroadcast', 'trusteeGovernance', 'legalVault', 'masterSettings', 'crisis-command',
    'bhoomi', 'vahan', 'recurring-seva',
  ],
  KashiKshetra: [
    'dashboard', 'devotees', 'guests', 'treasury', 'taxReceipts', 'campaigns',
    'poojaBooking', 'mandirPuja', 'purohitDesk', 'panchang',
    'dharamshala', 'annadanam', 'satsang', 'utsavPanjika',
    'sandeshBroadcast', 'socialWall', 'dharmicAssistant',
    'trusteeGovernance', 'sevadarRoster', 'crisis-command', 'masterSettings',
    'bhoomi', 'vahan', 'recurring-seva',
  ],
  Tirth: [
    'dashboard', 'devotees', 'guests', 'treasury', 'taxReceipts', 'campaigns',
    'poojaBooking', 'mandirPuja', 'purohitDesk', 'panchang',
    'dharamshala', 'annadanam', 'utsavPanjika',
    'sandeshBroadcast', 'socialWall', 'dharmicAssistant',
    'trusteeGovernance', 'sevadarRoster', 'crisis-command', 'masterSettings',
    'bhoomi', 'vahan', 'recurring-seva',
  ],
  MahotsavSamiti: [
    'dashboard', 'devotees', 'family', 'treasury', 'campaigns',
    'sanghaDrills', 'panchayatPolls', 'utsavPanjika',
    'sandeshBroadcast', 'socialWall', 'trusteeGovernance', 'crisis-command', 'masterSettings'
  ],
  Purohit: [
    'dashboard', 'devotees', 'poojaBooking', 'purohitDesk', 'panchang',
    'masterSettings'
  ],
  DharmadaTrust: [
    'dashboard', 'devotees', 'treasury', 'taxReceipts', 'campaigns',
    'masterSettings', 'legalVault'
  ]
};

export const isModuleAllowed = (workspace: any, moduleId: string): boolean => {
  if (!workspace) return true;
  if (moduleId === 'dashboard' || moduleId === 'appStore') return true;
  if (['sadhana-karma', 'sanatani-vivah', 'yatraNet', 'sevadar-roster', 'sevadarRoster'].includes(moduleId)) return true;

  const workspaceType = typeof workspace === 'string' ? workspace : workspace.type;
  const allowedModules = workspaceRegistry[workspaceType as WorkspaceType];

  if (allowedModules && allowedModules.includes(moduleId)) return true;
  if (workspace.enabledModules && workspace.enabledModules.includes(moduleId)) return true;

  return false;
};
