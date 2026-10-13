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
  'donor-care': 'devotees',
  donorCare: 'devotees',
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
  // R-1 AUDIT (2026-10-13) — relevance review per org type.
  // Rule: a desk is native to an org type only when that org would use it in
  // normal operations. The setup wizard (wizardDeskMap.ts ORG_DEFAULTS) and
  // the role-home quick actions are treated as product promises — desks they
  // recommend for an org type are native to it. The App Store's
  // enabledModules opt-in remains the escape hatch for everything else.
  Mandir: [
    'dashboard', 'devotees', 'family', 'treasury', 'taxReceipts',
    'poojaBooking', 'mandirPuja', 'panchang', 'utsavPanjika',
    'sandeshBroadcast', 'socialWall', 'dharmicAssistant',
    'masterSettings', 'spiritualSettings',
    'bhoomi', 'vahan', 'recurring-seva', 'sanatani-vivah',
    // R-1: added — the setup wizard recommends these as Mandir defaults and
    // the Trustee/Accountant/Sevadar home screens link straight to them.
    'checkin', 'donorCare', 'hundi-audit', 'quick-chanda-pos',
  ],
  Goshala: [
    'dashboard', 'devotees', 'guests', 'bulkImport', 'treasury', 'taxReceipts',
    'campaigns', 'assets', 'inventory', 'goshala',
    'sandeshBroadcast', 'dharmicAssistant', 'masterSettings',
    // R-1: 'guests' kept — atithi/donor visitors to the goshala are a real
    // CRM surface (adoptions, visits). 'bulkImport' kept — CSV ingestion of
    // legacy donor/cattle registers is operational, not decorative.
    // R-1: added 'donorCare' — wizard default for Goshala.
    'donorCare',
    // Goshala One: complete goshala-operations suite (Goshala only).
    'goshala-one',
  ],
  Sangha: [
    'dashboard', 'devotees', 'family', 'treasury', 'campaigns',
    'sanghaDrills', 'panchayatPolls', 'sanatani-vivah',
    'sandeshBroadcast', 'socialWall', 'dharmicAssistant', 'masterSettings',
    'bhoomi', 'vahan', 'recurring-seva',
    // R-1: added 'donorCare' — wizard default for Sangha.
    'donorCare',
  ],
  Samaj: [
    'dashboard', 'devotees', 'family', 'treasury', 'campaigns',
    'sanghaDrills', 'panchayatPolls', 'sanatani-vivah',
    'sandeshBroadcast', 'socialWall', 'dharmicAssistant', 'masterSettings',
    'bhoomi', 'vahan', 'recurring-seva',
    // R-1: added 'donorCare' — mirrors Sangha (community org parity).
    'donorCare',
  ],
  Ashram: [
    'dashboard', 'devotees', 'guests', 'treasury',
    'ashramKutir', 'satsang', 'granthLibrary', 'shlokaFeed',
    'sandeshBroadcast', 'dharmicAssistant', 'masterSettings', 'spiritualSettings',
    'bhoomi', 'vahan', 'recurring-seva',
    // R-1: added — the setup wizard recommends these as Ashram defaults.
    'dharamshala', 'annadanam', 'donorCare',
  ],
  Yoga: [
    // R-1: verified minimal — retreat/sadhana orgs need nothing more.
    'dashboard', 'devotees', 'guests', 'treasury',
    'ashramKutir', 'satsang',
    'sandeshBroadcast', 'dharmicAssistant', 'masterSettings'
  ],
  Satsang: [
    // R-1: verified minimal — kirtan/discourse circles need nothing more.
    'dashboard', 'devotees', 'family', 'treasury',
    'satsang', 'granthLibrary', 'shlokaFeed',
    'sandeshBroadcast', 'socialWall', 'dharmicAssistant', 'masterSettings'
  ],
  Gurukul: [
    'dashboard', 'devotees', 'treasury', 'inventory',
    'gurukul', 'gurukulAcademy', 'vidyalaya', 'granthLibrary', 'goshala',
    'sandeshBroadcast', 'dharmicAssistant', 'masterSettings',
    'bhoomi', 'recurring-seva',
    // Pathshala One: complete school-management suite (Gurukul + Vidyalaya only).
    'pathshala',
    // R-1 REMOVED 'vahan' (fleet): gurukuls do not operate transport fleets;
    // campus assets live under 'bhoomi'. A fleet need can be App-Store-enabled.
    // R-1 REMOVED 'family' (Household & Kul Parivar): the shishya-guardian
    // link lives inside each student record; the generic household census is
    // a community-org tool and does not belong in a school workspace.
    // R-1: 'goshala' kept — gau-seva by brahmacharis is part of gurukul life.
    // R-1: added 'donorCare' — wizard default for Gurukul (Vidya Danam patrons).
    'donorCare',
  ],
  Vidyalaya: [
    // R-1: verified minimal — 'vidyalaya' desk + core ops; nothing irrelevant.
    'dashboard', 'devotees', 'treasury', 'inventory',
    'vidyalaya', 'sandeshBroadcast', 'dharmicAssistant', 'masterSettings',
    // R-1: added 'donorCare' — wizard default for Vidyalaya.
    'donorCare',
    // Pathshala One: complete school-management suite (Gurukul + Vidyalaya only).
    'pathshala',
  ],
  PurohitSabha: [
    'dashboard', 'devotees', 'family', 'treasury',
    'poojaBooking', 'purohitDesk', 'purohitMarket', 'pitruShradh', 'panchang',
    'panchayatPolls', 'sandeshBroadcast', 'masterSettings', 'trusteeGovernance',
    // R-1: added 'donorCare' — wizard default for PurohitSabha.
    'donorCare',
  ],
  Trust: [
    'dashboard', 'devotees', 'guests', 'bulkImport', 'treasury', 'taxReceipts',
    'campaigns', 'karmaLedger', 'assets', 'sevaTrust', 'rakthaSeva', 'annadanam',
    'sandeshBroadcast', 'dharmaMarketing', 'trusteeGovernance', 'legalVault', 'masterSettings',
    'bhoomi', 'vahan', 'recurring-seva', 'sanatani-vivah',
    // R-1: added 'donorCare' — wizard default for Trust.
    'donorCare',
  ],
  AkshayaPatra: [
    'dashboard', 'devotees', 'guests', 'bulkImport', 'treasury', 'taxReceipts',
    'campaigns', 'assets', 'sevaTrust', 'annadanam', 'rakthaSeva', 'inventory',
    'sandeshBroadcast', 'trusteeGovernance', 'legalVault', 'masterSettings', 'crisis-command',
    'bhoomi', 'vahan', 'recurring-seva',
    // R-1: added — the setup wizard recommends these as AkshayaPatra defaults
    // ('smartBhandar' for kitchen recipe/BOM scale; 'donorCare' for patrons).
    'smartBhandar', 'donorCare',
  ],
  KashiKshetra: [
    'dashboard', 'devotees', 'guests', 'treasury', 'taxReceipts', 'campaigns',
    'poojaBooking', 'mandirPuja', 'purohitDesk', 'panchang',
    'dharamshala', 'annadanam', 'satsang', 'utsavPanjika',
    'sandeshBroadcast', 'socialWall', 'dharmicAssistant',
    'trusteeGovernance', 'sevadarRoster', 'crisis-command', 'masterSettings',
    'bhoomi', 'vahan', 'recurring-seva',
    // R-1: added — wizard defaults / crowd-safety pairing for a tirth complex.
    'checkin', 'donorCare', 'yatranet-gis',
  ],
  Tirth: [
    'dashboard', 'devotees', 'guests', 'treasury', 'taxReceipts', 'campaigns',
    'poojaBooking', 'mandirPuja', 'purohitDesk', 'panchang',
    'dharamshala', 'annadanam', 'utsavPanjika',
    'sandeshBroadcast', 'socialWall', 'dharmicAssistant',
    'trusteeGovernance', 'sevadarRoster', 'crisis-command', 'masterSettings',
    'bhoomi', 'vahan', 'recurring-seva',
    // R-1: added — wizard defaults for Tirth (yatri flow, stays, GIS safety).
    'checkin', 'donorCare', 'yatranet-gis', 'quick-chanda-pos',
  ],
  MahotsavSamiti: [
    'dashboard', 'devotees', 'family', 'treasury', 'campaigns',
    'sanghaDrills', 'panchayatPolls', 'utsavPanjika',
    'sandeshBroadcast', 'socialWall', 'trusteeGovernance', 'crisis-command', 'masterSettings',
    // R-1: added — crowd pain in the wizard routes to gate check-in & GIS.
    'checkin', 'donorCare', 'yatranet-gis',
  ],
  Purohit: [
    // R-1: verified minimal — personal purohit workspace, no org surface.
    'dashboard', 'devotees', 'poojaBooking', 'purohitDesk', 'panchang',
    'masterSettings'
  ],
  DharmadaTrust: [
    // R-1: verified minimal — grant/compliance trust, no program desks.
    'dashboard', 'devotees', 'treasury', 'taxReceipts', 'campaigns',
    'masterSettings', 'legalVault'
  ]
};

export const isModuleAllowed = (workspace: any, moduleId: string): boolean => {
  if (!workspace) return true;
  if (moduleId === 'dashboard' || moduleId === 'appStore') return true;
  if (['sadhana-karma', 'yatraNet', 'sevadar-roster', 'sevadarRoster'].includes(moduleId)) return true;

  const workspaceType = typeof workspace === 'string' ? workspace : workspace.type;
  const allowedModules = workspaceRegistry[workspaceType as WorkspaceType];

  if (allowedModules && allowedModules.includes(moduleId)) return true;
  if (workspace.enabledModules && workspace.enabledModules.includes(moduleId)) return true;

  return false;
};

/**
 * R-1 — Org-type relevance enforcement at desk mount.
 *
 * App.tsx's renderActiveDesk switch accepts many alias spellings per desk
 * (e.g. 'treasury-ledger', 'hundi', 'matrimony'). The org-type guard must
 * resolve every alias to the canonical registry/module-catalog id first,
 * otherwise a Gurukul could open 'matrimony' (alias of 'sanatani-vivah')
 * while 'sanatani-vivah' itself is blocked — the guard would be decorative.
 */
export const ORG_MODULE_ALIASES: Record<string, string> = {
  // Domain 1 — CRM
  'devotee-grid': 'devotees',
  'membership-desk': 'membership',
  'org-membership': 'membership',
  'donor-care': 'donorCare',
  'darshan-checkin': 'checkin',
  'gate-command': 'checkin',
  'household-census': 'family',
  'vanshavali-tree': 'vanshavali',
  'guest-pipeline': 'guests',
  'blood-registry': 'rakthaSeva',
  'universal-csv': 'bulkImport',
  'federation-multi-branch': 'federation',
  'multi-branch': 'federation',
  'branch-federation': 'federation',
  'sevadar-hr': 'sevadar-roster',
  '/sevadar-roster': 'sevadar-roster',
  // Domain 2 — Financials & Assets
  quickChandaPos: 'quick-chanda-pos',
  'chanda-pos': 'quick-chanda-pos',
  'counter-pos': 'quick-chanda-pos',
  'treasury-audit': 'treasury',
  treasuryAudit: 'treasury',
  'treasury-ledger': 'treasury',
  hundi: 'hundi-audit',
  'hundi-counting': 'hundi-audit',
  golak: 'hundi-audit',
  ratnaBhandar: 'ratna-bhandar',
  'sacred-assets': 'ratna-bhandar',
  'bullion-vault': 'ratna-bhandar',
  toshakhana: 'ratna-bhandar',
  'tax-receipt-80g': 'taxReceipts',
  'tally-export': 'taxReceipts',
  tallyExport: 'taxReceipts',
  'form-10bd': 'form10bd',
  form10bdCompliance: 'form10bd',
  'form-10bd-compliance': 'form10bd',
  'mandir-campaigns': 'campaigns',
  'karma-ledger': 'karmaLedger',
  'store-inventory': 'inventory',
  'property-leases': 'bhoomi',
  'bhoomi-real-estate': 'bhoomi',
  fleet: 'vahan',
  'vahan-fleet': 'vahan',
  recurringSeva: 'recurring-seva',
  'seva-subscriptions': 'recurring-seva',
  // Domain 3 — Rituals
  'sanctum-hud': 'purohitDesk',
  sanctumHud: 'purohitDesk',
  purohitManagement: 'purohitDesk',
  'purohit-management': 'purohitDesk',
  'purohit-desk': 'purohitDesk',
  'pooja-booking': 'poojaBooking',
  'aarti-roster': 'mandirPuja',
  purohitPortal: 'purohitMarket',
  'purohit-portal': 'purohitMarket',
  purohitUnified: 'purohitMarket',
  'purohit-unified': 'purohitMarket',
  purohitMarket: 'purohitMarket',
  'purohit-marketplace': 'purohitMarket',
  'pitru-shradh': 'pitruShradh',
  'panchang-muhurat': 'panchang',
  'panchang-astrology-engine': 'panchang',
  'panchang-engine': 'panchang',
  'yatra-gis': 'yatranet-gis',
  'crowd-control': 'yatranet-gis',
  yatranet: 'yatranet-gis',
  // Domain 4 — Specialized desks
  'gau-seva-goshala': 'goshala',
  'annadanam-kitchen': 'annadanam',
  'dharamshala-yatri-bhavan': 'dharamshala',
  'smart-bhandar': 'smartBhandar',
  bhandar: 'smartBhandar',
  'bhandar-procurement': 'smartBhandar',
  smartBhandarProcurement: 'smartBhandar',
  'ashram-kutir': 'ashramKutir',
  ashramGoshalaGurukul: 'ashramKutir',
  'ashram-goshala-gurukul': 'ashramKutir',
  'gurukul-education': 'gurukul',
  'sanskrit-library': 'granthLibrary',
  shlokaFeed: 'granthLibrary',
  // Domain 5 — Outreach
  'whatsapp-broadcaster': 'sandeshBroadcast',
  'events-utsav': 'utsavPanjika',
  'dharmic-assistant': 'dharmicAssistant',
  dharmaMarketing: 'dharmicAssistant',
  // Domain 7 — Individual life
  'personal-sadhana': 'sadhana-karma',
  matrimony: 'sanatani-vivah',
  familyRootsMatrimony: 'familyRootsMatrimony',
  'family-roots-matrimony': 'familyRootsMatrimony',
  familyRoots: 'familyRootsMatrimony',
  'family-roots': 'familyRootsMatrimony',
  'yatra-net': 'yatraNet',
  // Domain 6 — Governance
  'tactical-perimeter-radar': 'tactical-radar',
  tacticalPerimeterRadar: 'tactical-radar',
  'perimeter-radar': 'tactical-radar',
  'workspace-hub': 'workspace-hub',
  'user-roles-rbac': 'trusteeGovernance',
  'security-audit-log': 'legalVault',
  auditLog: 'legalVault',
  qrScanner: 'qrScanner',
  platformBroadcast: 'spiritualSettings',
};

/** Resolve an App.tsx desk id (alias or canonical) to its canonical registry id. */
export function resolveOrgModuleId(moduleId: string): string {
  return ORG_MODULE_ALIASES[moduleId] ?? moduleId;
}

/**
 * Modules that are personal / org-agnostic and must never be org-type-gated:
 * the personal devotee portal paths and the devotee-facing surfaces.
 * (dashboard/appStore/sadhana-karma/yatraNet/sevadar-roster are already
 * bypassed inside isModuleAllowed; listed here for explicitness.)
 */
const ORG_AGNOSTIC_MODULES = new Set([
  'dashboard',
  'appStore',
  'devoteePortal',
  'devotee-super-app',
  'devotee-portal',
  'personal-portal',
  'devotee-account',
  'sadhana-karma',
  'personal-sadhana',
  'yatraNet',
  'yatra-net',
  'sevadar-roster',
  'sevadarRoster',
]);

/**
 * R-1 central org-type gate: may this desk mount for this workspace?
 * Resolves App.tsx aliases → canonical id, skips org-agnostic personal
 * surfaces, then defers to isModuleAllowed (registry natives + the App
 * Store's enabledModules opt-in). Composes with checkPermission (role) and
 * isModuleMountAllowed (plan tier): org-type AND role AND tier must pass.
 */
export function isModuleAllowedForOrgMount(workspace: any, moduleId: string): boolean {
  if (!workspace) return true;
  const canonical = resolveOrgModuleId(moduleId);
  if (ORG_AGNOSTIC_MODULES.has(canonical) || ORG_AGNOSTIC_MODULES.has(moduleId)) return true;
  return isModuleAllowed(workspace, canonical);
}

/**
 * Friendly per-module guidance shown on the "not available" empty state.
 * Maps canonical module id → where the user can find it instead.
 */
export const ORG_RESTRICTED_GUIDANCE: Record<string, string> = {
  'sanatani-vivah':
    'Vivah services live in the personal devotee view and in community organisation workspaces (Mandir, Sangha, Samaj, Trust).',
  gurukul:
    'Gurukul desks belong to Gurukul / Vidyalaya workspaces — the residential shiksha surface.',
  gurukulAcademy:
    'The Shastric Academy desk belongs to Gurukul / Vidyalaya workspaces.',
  vidyalaya:
    'The Pathshala desk belongs to Vidyalaya / Gurukul workspaces.',
  goshala:
    'Goshala desks belong to Goshala workspaces — the Gau Seva surface.',
  'goshala-one':
    'Goshala One (cattle, milk, fodder, sponsorships) belongs to Goshala workspaces — the Gau Seva surface.',
  mandirPuja:
    'Daily Aarti & Puja desks belong to Mandir / Tirth workspaces.',
  purohitDesk:
    'The Purohit desk belongs to ritual-performing workspaces (Mandir, Tirth, Purohit Sabha).',
  purohitMarket:
    'The scholar marketplace belongs to ritual-performing workspaces (Mandir, Tirth, Purohit Sabha).',
  pitruShradh:
    'Pitru Shradh desks belong to ritual-performing workspaces.',
  annadanam:
    'Annadanam desks belong to Annakshetra-running workspaces (Ashram, Tirth, Akshaya Patra, Trust).',
  dharamshala:
    'Yatri-stay desks belong to hospitality-running workspaces (Ashram, Tirth, Kashi Kshetra).',
  ashramKutir:
    'Kutir & stay desks belong to Ashram / Yoga retreat workspaces.',
  satsang:
    'Satsang desks belong to Satsang / Ashram / Yoga workspaces.',
  sanghaDrills:
    'Shakha mobilisation desks belong to Sangha / Samaj / Mahotsav Samiti workspaces.',
  rakthaSeva:
    'Raktha Seva desks belong to humanitarian Trust workspaces.',
  sevaTrust:
    'Humanitarian Seva desks belong to Trust workspaces.',
  'hundi-audit':
    'Hundi & Golak audit desks belong to donation-receiving Mandir / Tirth workspaces.',
  vahan:
    'Fleet desks belong to transport-running workspaces (Mandir, Tirth, Trust, Akshaya Patra).',
  family:
    'Household & Kul Parivar census belongs to community organisation workspaces.',
  'crisis-command':
    'Crisis Command belongs to large-gathering workspaces (Tirth, Kashi Kshetra, Mahotsav Samiti, Akshaya Patra).',
  'yatranet-gis':
    'GIS crowd-safety desks belong to large-gathering workspaces (Tirth, Kashi Kshetra, Mahotsav Samiti).',
};

/**
 * SEVA SUGGESTIONS — smart archetype defaults.
 * ============================================================================
 * New workspaces start with these modules already in `enabledModules` — the
 * high-confidence 90% case per org type. Listed ids must be MODULE_CATALOG
 * ids (not registry aliases). Natives need not be listed (always available).
 * The App Store remains the escape hatch for everything else.
 */
export const SMART_DEFAULT_MODULES: Record<string, string[]> = {
  Mandir: ['sevadar-roster', 'inventory'],
  Goshala: ['sevadar-roster'],
  Sangha: ['sevadar-roster', 'membership'],
  Samaj: ['sevadar-roster', 'membership'],
  Ashram: ['sevadar-roster', 'membership'],
  Yoga: ['membership'],
  Satsang: ['membership'],
  Gurukul: ['bulkImport'],
  Vidyalaya: ['bulkImport', 'membership'],
  PurohitSabha: ['membership'],
  Trust: ['sevadar-roster', 'bulkImport'],
  DharmadaTrust: [],
  AkshayaPatra: ['sevadar-roster'],
  KashiKshetra: ['qrScanner', 'membership'],
  Tirth: ['qrScanner', 'membership'],
  MahotsavSamiti: ['sevadar-roster', 'sandeshBroadcast'],
  Purohit: [],
};

/** Pre-enabled modules for a brand-new workspace of the given org type. */
export function smartDefaultModulesFor(orgType: string): string[] {
  return [...(SMART_DEFAULT_MODULES[orgType] || [])];
}
