import { WorkspaceType } from '../types';
import { SubscriptionTier, TIER_LEVELS } from '../config/planPricing';
import { isShikshaFamilyMountAllowed } from './deskSurfaceGuard';

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
 *   2. TIERS (what the workspace pays for): SEVA (display "Lite") <
 *      STANDARD < PREMIUM (display "Enterprise"), plus DEMO (full
 *      surface, quota-bound instead). Display names renamed by owner
 *      decision 2026-10-23 — canonical ids unchanged; the names live in
 *      config/planPricing only. Enforced
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
 *   - 'DEMO' | 'SEVA' | 'STANDARD' | 'PREMIUM' | 'PUROHIT_PRO' honored verbatim.
 *     Legacy 'LITE' → 'SEVA', 'ENTERPRISE' → 'PREMIUM'.
 *   - A missing/unknown planId defaults to 'SEVA' (display "Lite") — NEVER 'DEMO'.
 *
 * DEMO workspaces see the full desk surface (access level 3): the binding
 * constraint for demos is the separate 5-creates-per-module demo quota, not
 * plan limits — the demo funnel must stay fully explorable.
 */
export type WorkspacePlanId = 'DEMO' | SubscriptionTier;

const PLAN_ACCESS_LEVEL: Record<WorkspacePlanId, number> = {
  DEMO: 3,
  SEVA: TIER_LEVELS.SEVA,
  STANDARD: TIER_LEVELS.STANDARD,
  PREMIUM: TIER_LEVELS.PREMIUM,
  PUROHIT_PRO: TIER_LEVELS.PUROHIT_PRO,
};

export function resolvePlanId(planId?: string | null): WorkspacePlanId {
  const p = (planId || '').toUpperCase();
  if (p === 'LITE') return 'SEVA'; // legacy alias
  if (p === 'ENTERPRISE') return 'PREMIUM'; // legacy alias
  if (p === 'DEMO' || p === 'SEVA' || p === 'STANDARD' || p === 'PREMIUM' || p === 'PUROHIT_PRO') {
    return p as WorkspacePlanId;
  }
  return 'SEVA';
}

/**
 * Sidebar MODULE_CATALOG nav id → minimum required tier.
 *
 * AUDIT FIX #7 (2026-10-19) — TIER LOCKS REMOVED. This map is now EMPTY by
 * design. The canonical freemium model (planPricing.ts, locked 2026-10-14)
 * is: EVERY plan includes ALL features; only usage caps differ. The locks
 * contradicted that story in three ways:
 *   1. planPricing.ts header + SEVA marketing ("Every feature included —
 *      no gated desks") promise all features on every plan.
 *   2. planLimits.ts header: "every workspace gets ALL features; paid plans
 *      raise the usage caps."
 *   3. The map even contradicted PLAN_PRICING's own includedDesks (SEVA's
 *      list includes AnnadanamKitchenDesk, but the map gated `annadanam`
 *      to STANDARD).
 * The usage caps (100 devotees / 500 txns-mo / 2 seats / 1 branch on SEVA)
 * are the monetization lever — a temple doing real hundi volume outgrows
 * the free caps and upgrades. That is the designed funnel, not desk locks.
 *
 * Kept as an export (empty) so isModuleAllowedForPlan/requiredTierForModule
 * keep their signatures — every caller now resolves permissive.
 */
export const MODULE_PLAN_TIER: Record<string, SubscriptionTier> = {};

/** Is a sidebar module (by MODULE_CATALOG nav id) allowed on the plan?
 * AUDIT FIX #7: always true now — MODULE_PLAN_TIER is empty by design
 * (freemium = all features, caps differ). Role visibility
 * (lib/deskVisibility) is the remaining per-desk gate. */
export function isModuleAllowedForPlan(moduleId: string, planId?: string | null): boolean {
  const required = MODULE_PLAN_TIER[moduleId];
  if (!required) return true;
  const planLevel = PLAN_ACCESS_LEVEL[resolvePlanId(planId)] ?? 1;
  return planLevel >= (TIER_LEVELS[required] ?? 1);
}

/** Minimum tier required for a sidebar module — always null now (no plan-gated desks). Kept for API compat. */
export function requiredTierForModule(moduleId: string): SubscriptionTier | null {
  return MODULE_PLAN_TIER[moduleId] ?? null;
}

/**
 * H-2: App.tsx switch-case aliases → canonical MODULE_PLAN_TIER keys.
 * The desk switch in App.tsx accepts many alias spellings per desk
 * (e.g. 'treasury-ledger', 'hundi', 'golak' all mount the treasury desk).
 * Tier enforcement at desk mount must resolve through this map, otherwise
 * a SEVA workspace could open a PREMIUM desk via an unmapped alias URL.
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
  // recommend for an org type are native to it. Since the 2026-10-23
  // module-system redesign, nativeness no longer GATES visibility (every
  // desk is present — see isModuleAllowed); the registry now drives the
  // workspace's starting adoption record, Role Home's core desks, the
  // directory's "Core" marking, and recommendation affinity.
  Mandir: [
    'dashboard', 'devotees', 'family', 'treasury', 'taxReceipts',
    'poojaBooking', 'mandirPuja', 'panchang', 'utsavPanjika',
    'sandeshBroadcast', 'dharmicAssistant',
    'masterSettings', 'spiritualSettings',
    // QUEUED #57 (owner decision, org-view audit): Samskara One is the
    // flagship family-lifecycle suite — it is native here (and in
    // Ashram), not an App Store discovery exercise.
    'samskara-one',
    'bhoomi', 'vahan', 'recurring-seva', 'sanatani-vivah',
    // R-1: added — the setup wizard recommends these as Mandir defaults and
    // the Trustee/Accountant/Sevadar home screens link straight to them.
    'checkin', 'donorCare', 'hundi-audit', 'quick-chanda-pos',
    // Cash Custody: hundi-to-bank chain of custody (Mandir-native).
    'cash-custody',
    // Annakshetra One: kitchen & bhandara management (Mandir-native).
    'annakshetra-one',
    // Utsav One: festival management — budgets, committees, vendors, crowds (Mandir-native).
    'utsav-one',
    // Tirth One: darshan queue & token management (Mandir-native).
    'tirth-one',
    // Satsang One: mandali organizer tool (Mandir-native — mandirs host satsangs).
    'satsang-one',
    // Sabha One: purohit sabha association management (Mandir hosts sabha chapters).
    'sabha-one',
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
    'sandeshBroadcast', 'dharmicAssistant', 'masterSettings',
    'bhoomi', 'vahan', 'recurring-seva',
    // R-1: added 'donorCare' — wizard default for Sangha.
    'donorCare',
    // Matha One: monastic management (Sangha-native — mathas are sanghas).
    'matha-one',
  ],
  Samaj: [
    'dashboard', 'devotees', 'family', 'treasury', 'campaigns',
    'sanghaDrills', 'panchayatPolls', 'sanatani-vivah',
    'sandeshBroadcast', 'dharmicAssistant', 'masterSettings',
    'bhoomi', 'vahan', 'recurring-seva',
    // R-1: added 'donorCare' — mirrors Sangha (community org parity).
    'donorCare',
  ],
  Ashram: [
    'dashboard', 'devotees', 'guests', 'treasury',
    // QUEUED #57: 'shlokaFeed' removed — it is an alias door to
    // 'granthLibrary' (already native here); the registry speaks
    // canonical ids only.
    'ashramKutir', 'satsang', 'granthLibrary',
    'sandeshBroadcast', 'dharmicAssistant', 'masterSettings', 'spiritualSettings',
    // QUEUED #57 (owner decision): Samskara One native (see Mandir).
    'samskara-one',
    'bhoomi', 'vahan', 'recurring-seva',
    // R-1: added — the setup wizard recommends these as Ashram defaults.
    // Ashram One replaces the mock 'dharamshala' desk with the real suite.
    // Annakshetra One: kitchen & bhandara management (Ashram-native).
    // Yoga One: yoga shala management (Ashram-native — yoga is taught at ashrams).
    // Matha One: monastic management (Ashram-native — ashrams keep parampara records).
    // Satsang One: mandali organizer tool (Ashram-native — ashrams host satsangs).
    'ashram-one', 'annadanam', 'donorCare', 'annakshetra-one', 'yoga-one', 'matha-one', 'satsang-one',
  ],
  Yoga: [
    // R-1: verified minimal — retreat/sadhana orgs need nothing more.
    // Yoga One: yoga shala management (Yoga-native).
    'dashboard', 'devotees', 'guests', 'treasury',
    'ashramKutir', 'satsang',
    'sandeshBroadcast', 'dharmicAssistant', 'masterSettings',
    'yoga-one',
  ],
  Satsang: [
    // R-1: verified minimal — kirtan/discourse circles need nothing more.
    // QUEUED #57: 'shlokaFeed' alias door removed ('granthLibrary' is
    // the canonical native here, as in Ashram).
    'dashboard', 'devotees', 'family', 'treasury',
    'satsang', 'granthLibrary',
    'sandeshBroadcast', 'dharmicAssistant', 'masterSettings',
    // Satsang One: mandali organizer tool (Satsang-native).
    'satsang-one',
  ],
  Gurukul: [
    'dashboard', 'devotees', 'treasury', 'inventory',
    // QUEUED #57 (audit A1-D10): 'gurukulAcademy' and 'vidyalaya' are
    // no longer separate natives here. All three ids mount the ONE
    // shiksha surface for this org type (deskSurfaceGuard), so three
    // native rows were three menu entries opening the identical desk
    // (live-confirmed). 'gurukul' is the family's door for Gurukul
    // orgs; the other two stay App-Store enableable, and 'vidyalaya'
    // stays native where it is the primary surface (Vidyalaya).
    'gurukul', 'granthLibrary', 'goshala',
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
    // Sabha One: the sabha's own association management suite.
    'sabha-one',
  ],
  Trust: [
    'dashboard', 'devotees', 'guests', 'bulkImport', 'treasury', 'taxReceipts',
    // QUEUED #58 (audit A1-D04): 'sevaTrust' removed from natives — no
    // desk component exists and the #48 guard denies its mount; a native
    // nav promise the app cannot keep. Returns when a real desk is built.
    'campaigns', 'karmaLedger', 'assets', 'rakthaSeva', 'annadanam',
    // QUEUED #57 (audit A1-D01): was 'dharmaMarketing' — the raw alias.
    // The mount guard resolves it to 'dharmicAssistant', which was
    // absent here, so Trust's own AI desk was permanently mount-blocked
    // in the ONLY org type whose registry listed it. Canonical id now.
    'sandeshBroadcast', 'dharmicAssistant', 'trusteeGovernance', 'legalVault', 'masterSettings',
    'bhoomi', 'vahan', 'recurring-seva', 'sanatani-vivah',
    // R-1: added 'donorCare' — wizard default for Trust.
    'donorCare',
    // Cash Custody: hundi-to-bank chain of custody (Trust/NGO-native).
    'cash-custody',
    // Annakshetra One: kitchen & bhandara management (Trust/NGO-native).
    'annakshetra-one',
    // Nyas One: compliance & governance — registrations, filings, 85% rule (Trust-native).
    'nyas-one',
  ],
  AkshayaPatra: [
    'dashboard', 'devotees', 'guests', 'bulkImport', 'treasury', 'taxReceipts',
    // QUEUED #58 (audit A1-D04): 'sevaTrust' removed — see Trust above.
    'campaigns', 'assets', 'annadanam', 'rakthaSeva', 'inventory',
    'sandeshBroadcast', 'trusteeGovernance', 'legalVault', 'masterSettings', 'crisis-command',
    'bhoomi', 'vahan', 'recurring-seva',
    // R-1: added — the setup wizard recommends these as AkshayaPatra defaults
    // ('donorCare' for patrons). Annakshetra One replaces the mock
    // 'smartBhandar' desk with the real kitchen & bhandara suite.
    'annakshetra-one', 'donorCare',
  ],
  KashiKshetra: [
    'dashboard', 'devotees', 'guests', 'treasury', 'taxReceipts', 'campaigns',
    'poojaBooking', 'mandirPuja', 'purohitDesk', 'panchang',
    // Ashram One replaces the mock 'dharamshala' desk with the real suite.
    'ashram-one', 'annadanam', 'satsang', 'utsavPanjika',
    // Tirth One: darshan queue & token management (KashiKshetra-native).
    'tirth-one',
    'sandeshBroadcast', 'dharmicAssistant',
    'trusteeGovernance', 'sevadar-roster', 'crisis-command', 'masterSettings',
    'bhoomi', 'vahan', 'recurring-seva',
    // R-1: added — wizard defaults / crowd-safety pairing for a tirth complex.
    'checkin', 'donorCare', 'yatranet-gis',
  ],
  Tirth: [
    'dashboard', 'devotees', 'guests', 'treasury', 'taxReceipts', 'campaigns',
    'poojaBooking', 'mandirPuja', 'purohitDesk', 'panchang',
    // Ashram One replaces the mock 'dharamshala' desk with the real suite.
    // Annakshetra One: kitchen & bhandara management (Tirth-native).
    'ashram-one', 'annadanam', 'utsavPanjika', 'annakshetra-one',
    // Tirth One: darshan queue & token management (Tirth-native).
    'tirth-one',
    'sandeshBroadcast', 'dharmicAssistant',
    'trusteeGovernance', 'sevadar-roster', 'crisis-command', 'masterSettings',
    'bhoomi', 'vahan', 'recurring-seva',
    // R-1: added — wizard defaults for Tirth (yatri flow, stays, GIS safety).
    'checkin', 'donorCare', 'yatranet-gis', 'quick-chanda-pos',
  ],
  MahotsavSamiti: [
    'dashboard', 'devotees', 'family', 'treasury', 'campaigns',
    'sanghaDrills', 'panchayatPolls', 'utsavPanjika',
    'sandeshBroadcast', 'trusteeGovernance', 'crisis-command', 'masterSettings',
    // R-1: added — crowd pain in the wizard routes to gate check-in & GIS.
    'checkin', 'donorCare', 'yatranet-gis',
    // Utsav One: festival management — budgets, committees, vendors, crowds (Mahotsav Samiti-native).
    'utsav-one',
  ],
  Purohit: [
    // R-1: verified minimal — personal purohit workspace, no org surface.
    'dashboard', 'devotees', 'poojaBooking', 'purohitDesk', 'panchang',
    'masterSettings'
  ],
  DharmadaTrust: [
    // R-1: verified minimal — grant/compliance trust, no program desks.
    'dashboard', 'devotees', 'treasury', 'taxReceipts', 'campaigns',
    'masterSettings', 'legalVault',
    // Cash Custody: donation-box chain of custody for trusts that receive cash.
    // Annakshetra One: kitchen & bhandara management (Trust/NGO-native).
    // Nyas One: compliance & governance (Trust-native).
    'cash-custody', 'annakshetra-one', 'nyas-one',
  ]
};

/**
 * MODULE-SYSTEM REDESIGN (2026-10-23, owner-delegated decision) — the
 * install gate is RETIRED. This helper used to answer "is this desk
 * part of this workspace?" with `registry natives OR enabledModules`,
 * which made ~40 desks per org type invisible until somebody found
 * them in the App Store and "installed" them — the discovery failure
 * the redesign exists to fix. Presence is now unconditional: every
 * real desk is available to every workspace, and the questions that
 * remain are answered by their own layers —
 *   · WHO may open it: role visibility (lib/deskVisibility) + the
 *     desk-scope / Auditor mount gates in App.tsx — unchanged.
 *   · Whether the shared shiksha component would serve the WRONG
 *     family's desk: the family guard in isModuleAllowedForOrgMount
 *     — unchanged.
 *   · Plan: MODULE_PLAN_TIER is empty by design (caps differ, desks
 *     don't) — unchanged.
 *
 * What `enabledModules` is now: an ADOPTION RECORD. Nothing reads it
 * as a gate. It still seeds at workspace creation (SMART_DEFAULT_
 * MODULES) and grows when a suggestion is actioned (enableModule),
 * and its only remaining readers are recommendation bookkeeping —
 * the suggestions engine's exclusion set and the trigger callbacks'
 * "already in the org's working set" test. Existing values on
 * workspace documents are untouched: installs migrated silently
 * because presence no longer depends on them.
 *
 * The one denial kept here: 'sevaTrust' — the #58 law. No desk
 * component exists for it (its catalog row was removed for exactly
 * that reason), so no surface may promise it, installed or not. Its
 * mount is independently denied by the family guard (no surface
 * renders it), and ORG_RESTRICTED_GUIDANCE carries the honest answer
 * for deep links.
 */
export const isModuleAllowed = (workspace: any, moduleId: string): boolean => {
  if (!workspace) return true;
  // QUEUED #57 (audit A1-D01 / A2-D8) — ONE canonical key at every
  // gate: resolve aliases first, so an alias spelling can never name
  // a different desk at nav than at mount. (Under the retired gate
  // this resolution decided natives/enabled membership; it is kept
  // because the #58 denial below is stated canonically.)
  const canonical = resolveOrgModuleId(moduleId);
  if (canonical === 'sevaTrust') return false;
  return true;
};

/**
 * The BELONGING predicate — the retired gate's exact semantics,
 * kept for the one question that is still a preference, not a
 * permission: "is this desk part of this workspace's own working
 * set?" (registry native, an always-present shell desk, or in the
 * adoption record). Its only consumer is the persona landing pick
 * (AuthWorkspaceContext loginAsRole → personaHomeModule): a Priest
 * entering a Mandir should land on the desk that BELONGS to a
 * Mandir priest (Pooja Booking), not merely the first desk that
 * could mount — under universal presence everything mounts, so
 * belonging is the only signal left that expresses org fit.
 * NEVER use this as a visibility or mount gate.
 */
export const isDeskInWorkspaceSet = (workspace: any, moduleId: string): boolean => {
  if (!workspace) return true;
  const canonical = resolveOrgModuleId(moduleId);
  if (canonical === 'dashboard' || canonical === 'appStore' || canonical === 'workspace-hub') return true;
  if (['sadhana-karma', 'yatraNet', 'sevadar-roster'].includes(canonical)) return true;

  const workspaceType = typeof workspace === 'string' ? workspace : workspace.type;
  const allowedModules = workspaceRegistry[workspaceType as WorkspaceType];

  if (allowedModules && allowedModules.includes(canonical)) return true;
  if (
    workspace.enabledModules &&
    workspace.enabledModules.some((id: string) => resolveOrgModuleId(id) === canonical)
  ) {
    return true;
  }

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
  // QUEUED #57 (audit A1-D01, sixth door — found by the #57 matrix
  // test, missed by the audit's five): 'tally-export' is a first-class
  // catalog desk (TallyExportDesk), NOT an alias of 'taxReceipts'.
  // Mapping it here made its enable write the wrong key and its mount
  // depend on a different desk's availability. It is canonical now;
  // the camelCase spelling resolves to it.
  tallyExport: 'tally-export',
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
  // Annakshetra One replaces the mock 'smartBhandar' desk — old ids keep
  // resolving to the real kitchen & bhandara suite.
  'smart-bhandar': 'annakshetra-one',
  bhandar: 'annakshetra-one',
  'bhandar-procurement': 'annakshetra-one',
  smartBhandarProcurement: 'annakshetra-one',
  smartBhandar: 'annakshetra-one',
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
 * (Since the 2026-10-23 redesign isModuleAllowed no longer gates any
 * real desk, so this set's remaining job is to keep the mount guard's
 * intent explicit for the personal surfaces.)
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
 * surfaces, applies the shiksha family guard (the component-family
 * half of the org guard), then defers to isModuleAllowed — which,
 * since the 2026-10-23 redesign, denies only desks that do not exist
 * ('sevaTrust'). Composes with checkPermission (role) and
 * isModuleMountAllowed (plan tier): family AND role AND tier must pass.
 */
export function isModuleAllowedForOrgMount(workspace: any, moduleId: string): boolean {
  if (!workspace) return true;
  const canonical = resolveOrgModuleId(moduleId);
  if (ORG_AGNOSTIC_MODULES.has(canonical) || ORG_AGNOSTIC_MODULES.has(moduleId)) return true;
  // QUEUED #48 — shared-component family guard. App.tsx's switch mounts
  // ONE component (VedicSevaShikshaDesk) for a family of module ids
  // across org families ('gurukul', 'satsang', 'sanghaDrills',
  // 'sevaTrust', …). The registry check below validates the ID, but the
  // mounted COMPONENT can still belong to another org family — that is
  // how a Sangha opening 'sanghaDrills' received the Gurukul desk.
  // When the component family excludes this org type (surface resolves
  // to 'restricted' in deskSurfaceGuard), deny the mount so the
  // designed OrgTypeRestrictedDesk shows instead of a wrong desk.
  const workspaceType = typeof workspace === 'string' ? workspace : workspace.type;
  if (!isShikshaFamilyMountAllowed(workspaceType, canonical, moduleId)) return false;
  return isModuleAllowed(workspace, canonical);
}

/**
 * QUEUED #57 (audit A1-D01): would this module actually MOUNT if it
 * were enabled for this workspace? Simulates the enable against the
 * real mount guard. The Command Palette's (now retired) install shelf
 * gated on this: the palette auto-opened whatever it installed, so it
 * could never promise a desk the guard would refuse (cross-family
 * shiksha ids, 'sevaTrust', …). Since the 2026-10-23 redesign the
 * enable is a no-op adoption record, so this simply answers the mount
 * truth — kept as an export for its existing consumers and tests.
 */
export function wouldMountIfEnabled(workspace: any, moduleId: string): boolean {
  if (!workspace || typeof workspace !== 'object') return true;
  const canonical = resolveOrgModuleId(moduleId);
  const enabled: string[] = Array.isArray(workspace.enabledModules) ? workspace.enabledModules : [];
  if (enabled.some((id: string) => resolveOrgModuleId(id) === canonical)) {
    return isModuleAllowedForOrgMount(workspace, moduleId);
  }
  return isModuleAllowedForOrgMount(
    { ...workspace, enabledModules: [...enabled, canonical] },
    moduleId
  );
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
  'ashram-one':
    'Ashram One (yatri stays, bookings, guest register) belongs to hospitality-running workspaces (Ashram, Tirth).',
  'annakshetra-one':
    'Annakshetra One (kitchen inventory, recipes, bhandara, meal counts) belongs to kitchen-running workspaces (Mandir, Ashram, Tirth, Trust/NGO, Akshaya Patra).',
  'nyas-one':
    'Nyas One (registrations, filings, 85% rule, trustee governance) belongs to Trust / Dharmada Trust workspaces.',
  'utsav-one':
    'Utsav One (festival budgets, committees, vendors, crowds) belongs to Mahotsav Samiti / Mandir workspaces.',
  'tirth-one':
    'Tirth One (darshan slots, tokens, live queues, seva-darshan) belongs to Tirth / Mandir / Kashi Kshetra workspaces.',
  'yoga-one':
    'Yoga One (batches, students, attendance, fees) belongs to Yoga / Ashram workspaces.',
  'matha-one':
    'Matha One (sannyasi registry, parampara, dinacharya, gurukul) belongs to Sangha / Ashram workspaces.',
  'satsang-one':
    'Satsang One (mandali members, gatherings, bhajans, prasad rotation) belongs to Satsang / Mandir / Ashram workspaces.',
  'sabha-one':
    'Sabha One (member directory, dues, welfare, training, duty roster) belongs to Purohit Sabha / Mandir workspaces.',
  ashramKutir:
    'Kutir & stay desks belong to Ashram / Yoga retreat workspaces.',
  satsang:
    'Satsang desks belong to Satsang / Ashram / Yoga workspaces.',
  sanghaDrills:
    'Shakha mobilisation desks belong to Sangha / Samaj / Mahotsav Samiti workspaces.',
  rakthaSeva:
    'Raktha Seva desks belong to humanitarian Trust workspaces.',
  sevaTrust:
    'The Humanitarian Seva Trust desk is not available in this build yet. Trust seva work runs through the Treasury, Campaigns and Annadanam desks for now.',
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
 * ids (not registry aliases). Since the 2026-10-23 redesign every desk is
 * present regardless; this list now seeds the ADOPTION RECORD the
 * recommendation engine reads (a desk listed here is never "suggested"
 * to the org — it is treated as already in their working set).
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
