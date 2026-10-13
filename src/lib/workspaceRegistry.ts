import { UserRole, WorkspaceType, ROLE_MIGRATION_MAP } from '../types';
import { SubscriptionTier, TIER_LEVELS } from '../config/planPricing';

export interface DeskMetadata {
  id: string;
  name: string;
  iconName: string;
  requiredRole: UserRole | UserRole[];
  requiredTier: SubscriptionTier;
  category?: 'Rituals' | 'Operations' | 'Finance' | 'Community' | 'Governance' | 'Devotee';
  description?: string;
}

const ROLE_RANK: Record<UserRole, number> = {
  SuperAdmin: 100,
  Trustee: 80,
  CSO: 70,
  Accountant: 60,
  Priest: 50,
  Sevadar: 30,
  Devotee: 10
};

const isRolePrivileged = (userRole: UserRole, requiredRole: UserRole): boolean => {
  if (userRole === 'SuperAdmin') return true;
  if (requiredRole === 'Devotee') return true;
  return (ROLE_RANK[userRole] ?? 0) >= (ROLE_RANK[requiredRole] ?? 0);
};

export const DESK_REGISTRY: DeskMetadata[] = [
  // ==========================================
  // LITE TIER (Small Temples / Shrines)
  // ==========================================
  {
    id: 'PoojaBookingDesk',
    name: 'Pooja Booking Desk',
    iconName: 'Calendar',
    requiredRole: ['SuperAdmin', 'Trustee', 'Priest', 'Sevadar', 'Devotee'],
    requiredTier: 'LITE',
    category: 'Rituals',
    description: 'Schedule sankalpas, archana slots, and personal seva rituals.'
  },
  {
    id: 'PanchangMuhuratDesk',
    name: 'Panchang & Muhurat Desk',
    iconName: 'Compass',
    requiredRole: ['SuperAdmin', 'Trustee', 'Priest', 'Sevadar', 'Devotee'],
    requiredTier: 'LITE',
    category: 'Rituals',
    description: 'Astronomical thithi, nakshatra, rahukaal, and auspicious muhurat finder.'
  },
  {
    id: 'QuickChandaModal',
    name: 'Quick Chanda & Seva',
    iconName: 'HeartHandshake',
    requiredRole: ['SuperAdmin', 'Trustee', 'Priest', 'Accountant', 'Sevadar', 'Devotee'],
    requiredTier: 'LITE',
    category: 'Finance',
    description: 'Instant micro-donation collections, UPI intents, and digital receipts.'
  },
  {
    id: 'WhatsAppBroadcasterDesk',
    name: 'WhatsApp Broadcaster Desk',
    iconName: 'MessageSquare',
    requiredRole: ['SuperAdmin', 'Trustee', 'Priest', 'Sevadar'],
    requiredTier: 'LITE',
    category: 'Community',
    description: 'Broadcast utsav reminders, daily darshan, and emergency updates to devotees.'
  },

  // Supporting Lite Modules
  {
    id: 'DevoteeGrid',
    name: 'Devotee Directory Desk',
    iconName: 'Users',
    requiredRole: ['SuperAdmin', 'Trustee', 'Priest', 'Accountant', 'Sevadar'],
    requiredTier: 'LITE',
    category: 'Community',
    description: 'Member directory, gotra indexes, and digital identity passes.'
  },
  {
    id: 'FamilyHouseholdDesk',
    name: 'Family & Household Desk',
    iconName: 'Home',
    requiredRole: ['SuperAdmin', 'Trustee', 'Sevadar'],
    requiredTier: 'LITE',
    category: 'Community',
    description: 'Household grouping, gotra lineage links, and parivar profiles.'
  },
  {
    id: 'MandirPujaDesk',
    name: 'Mandir Daily Puja Desk',
    iconName: 'Flame',
    requiredRole: ['SuperAdmin', 'Trustee', 'Priest'],
    requiredTier: 'LITE',
    category: 'Rituals',
    description: 'Daily mandir nitya-seva routines, aarti schedules, and priest logs.'
  },
  {
    id: 'PurohitDesk',
    name: 'Purohit Desk',
    iconName: 'Flame',
    requiredRole: ['SuperAdmin', 'Trustee', 'Priest'],
    requiredTier: 'LITE',
    category: 'Rituals',
    description: 'Purohit ritual ledger, dakshina records, and samagri requirements.'
  },
  {
    id: 'VedicCalendarEventsDesk',
    name: 'Utsav & Festival Calendar',
    iconName: 'Calendar',
    requiredRole: ['SuperAdmin', 'Trustee', 'Priest', 'Sevadar', 'Devotee'],
    requiredTier: 'LITE',
    category: 'Rituals',
    description: 'Universal festival calendar, tithi observances, and panjika events.'
  },
  {
    id: 'SanskritLibraryDesk',
    name: 'Granth & Scripture Library',
    iconName: 'Book',
    requiredRole: ['SuperAdmin', 'Trustee', 'Priest', 'Sevadar', 'Devotee'],
    requiredTier: 'LITE',
    category: 'Devotee',
    description: 'Vedic scriptures, audio stotrams, and authentic sanskrit verses.'
  },
  {
    id: 'PersonalSadhanaDesk',
    name: 'Personal Sadhana Desk',
    iconName: 'Smile',
    requiredRole: ['SuperAdmin', 'Trustee', 'Priest', 'Sevadar', 'Devotee'],
    requiredTier: 'LITE',
    category: 'Devotee',
    description: 'Daily mantra japa counter, meditation logs, and dharmic progress.'
  },

  // ==========================================
  // STANDARD TIER (Ashrams / Medium Trusts)
  // ==========================================
  {
    id: 'AnnadanamKitchenDesk',
    name: 'Annadanam Kitchen Desk',
    iconName: 'Utensils',
    requiredRole: ['SuperAdmin', 'Trustee', 'Sevadar'],
    requiredTier: 'STANDARD',
    category: 'Operations',
    description: 'Prasadam meal estimations, grain provisions, and mass community feeding logs.'
  },
  {
    id: 'DharamshalaDesk',
    name: 'Dharamshala & Kutir Desk',
    iconName: 'Home',
    requiredRole: ['SuperAdmin', 'Trustee', 'Sevadar'],
    requiredTier: 'STANDARD',
    category: 'Operations',
    description: 'Guest room check-in/out, ashram kutir bookings, and pilgrim bedding logs.'
  },
  {
    id: 'GauSevaDesk',
    name: 'Gau Seva & Dairy Desk',
    iconName: 'Sparkles',
    requiredRole: ['SuperAdmin', 'Trustee', 'Sevadar'],
    requiredTier: 'STANDARD',
    category: 'Operations',
    description: 'Cattle registry, medical care, fodder procurement, and milk seva ledger.'
  },
  {
    id: 'MandirCampaignsDesk',
    name: 'Mandir Campaigns Desk',
    iconName: 'Megaphone',
    requiredRole: ['SuperAdmin', 'Trustee', 'Accountant', 'Sevadar', 'Devotee'],
    requiredTier: 'STANDARD',
    category: 'Finance',
    description: 'Targeted fundraising drives, temple renovations, and donor milestones.'
  },
  {
    id: 'SevadarRosterDesk',
    name: 'Sevadar Roster Desk',
    iconName: 'UserCheck',
    requiredRole: ['SuperAdmin', 'Trustee', 'Sevadar'],
    requiredTier: 'STANDARD',
    category: 'Operations',
    description: 'Volunteer shift assignments, duty sign-ups, and seva attendance tracking.'
  },
  {
    id: 'KarmaLedgerDesk',
    name: 'Karma Ledger Desk',
    iconName: 'BookOpen',
    requiredRole: ['SuperAdmin', 'Trustee', 'Accountant', 'Sevadar'],
    requiredTier: 'STANDARD',
    category: 'Operations',
    description: 'Micro-seva recognition points, merit certificates, and punya logs.'
  },
  {
    id: 'InventoryDesk',
    name: 'Inventory & Store Desk',
    iconName: 'Package',
    requiredRole: ['SuperAdmin', 'Trustee', 'Accountant', 'Sevadar'],
    requiredTier: 'STANDARD',
    category: 'Operations',
    description: 'Temple store stock ledger, oil, camphor, grains, and puja item reordering.'
  },
  {
    id: 'TaxReceiptDesk',
    name: '80G Tax Receipt Desk',
    iconName: 'FileText',
    requiredRole: ['SuperAdmin', 'Trustee', 'Accountant'],
    requiredTier: 'STANDARD',
    category: 'Finance',
    description: 'Statutory 80G and Section 12A tax exemption certificates with PDF generation.'
  },

  // Supporting Standard Modules
  {
    id: 'VanshavaliDesk',
    name: 'Vanshavali Lineage Desk',
    iconName: 'GitBranch',
    requiredRole: ['SuperAdmin', 'Trustee', 'Priest', 'Sevadar', 'Devotee'],
    requiredTier: 'STANDARD',
    category: 'Community',
    description: 'Interactive family genealogical tree and gotra lineage builder.'
  },
  {
    id: 'PitruShradhDesk',
    name: 'Pitru Paksha & Shradh Desk',
    iconName: 'Feather',
    requiredRole: ['SuperAdmin', 'Trustee', 'Priest'],
    requiredTier: 'STANDARD',
    category: 'Rituals',
    description: 'Ancestor commemoration registry and annual tithi remembrance rituals.'
  },
  {
    id: 'AssetInventoryDesk',
    name: 'Asset Inventory Desk',
    iconName: 'Box',
    requiredRole: ['SuperAdmin', 'Trustee', 'Accountant'],
    requiredTier: 'STANDARD',
    category: 'Finance',
    description: 'Valuable deity ornaments, gold/silver idols, and land trust register.'
  },
  {
    id: 'BulkImportDesk',
    name: 'Bulk Devotee Import Desk',
    iconName: 'UploadCloud',
    requiredRole: ['SuperAdmin', 'Trustee'],
    requiredTier: 'STANDARD',
    category: 'Community',
    description: 'High-speed CSV/Excel devotee migration with auto-cleaning and gotra match.'
  },
  {
    id: 'RakthaSevaDesk',
    name: 'Raktha Seva Blood Network',
    iconName: 'Heart',
    requiredRole: ['SuperAdmin', 'Trustee', 'Sevadar', 'Devotee'],
    requiredTier: 'STANDARD',
    category: 'Community',
    description: 'Voluntary emergency blood donor network across local temples.'
  },
  {
    id: 'SanataniVivahDesk',
    name: 'Sanatani Vivah Desk',
    iconName: 'Heart',
    requiredRole: ['SuperAdmin', 'Trustee', 'Devotee'],
    requiredTier: 'STANDARD',
    category: 'Community',
    description: 'Community matrimonial registry with kundali gun-milan metrics.'
  },
  {
    id: 'AppStoreDesk',
    name: 'Modular App Store Desk',
    iconName: 'Grid',
    requiredRole: ['SuperAdmin', 'Trustee'],
    requiredTier: 'STANDARD',
    category: 'Governance',
    description: 'Activate add-on functional modules tailored to mandir requirements.'
  },

  // ==========================================
  // ENTERPRISE TIER (Mega Temples / Federations)
  // ==========================================
  {
    id: 'WorkspaceSelectorDesk',
    name: 'Multi-Branch Workspace Selector',
    iconName: 'Layers',
    requiredRole: ['SuperAdmin', 'Trustee'],
    requiredTier: 'ENTERPRISE',
    category: 'Governance',
    description: 'Federated branch switching, multi-mandir trusts, and global chapters.'
  },
  {
    id: 'TreasuryLedgerDesk',
    name: 'Treasury & Double-Entry Ledger',
    iconName: 'DollarSign',
    requiredRole: ['SuperAdmin', 'Trustee', 'Accountant'],
    requiredTier: 'ENTERPRISE',
    category: 'Finance',
    description: 'Double-entry accounting, balance sheet, trial balance, and audit trails.'
  },
  {
    id: 'AuditLogDesk',
    name: 'Audit Log Desk',
    iconName: 'ShieldCheck',
    requiredRole: ['SuperAdmin', 'Trustee'],
    requiredTier: 'ENTERPRISE',
    category: 'Governance',
    description: 'Cryptographically hashed, tamper-evident audit trail of all actions.'
  },
  {
    id: 'CrisisCommandCenter',
    name: 'Crisis Command Center',
    iconName: 'AlertTriangle',
    requiredRole: ['SuperAdmin', 'Trustee', 'Sevadar'],
    requiredTier: 'ENTERPRISE',
    category: 'Governance',
    description: 'Mass crowd density alerts, lost child broadcasts, and emergency dispatch.'
  },
  {
    id: 'UserRolesDesk',
    name: 'RBAC User Roles Desk',
    iconName: 'Users',
    requiredRole: ['SuperAdmin', 'Trustee'],
    requiredTier: 'ENTERPRISE',
    category: 'Governance',
    description: 'Granular permissions matrix, trustee designations, and staff security levels.'
  },

  // Supporting Enterprise Modules
  {
    id: 'YatraNetDesk',
    name: 'Yatra Net Pilgrimage Desk',
    iconName: 'MapPin',
    requiredRole: ['SuperAdmin', 'Trustee', 'Devotee'],
    requiredTier: 'ENTERPRISE',
    category: 'Community',
    description: 'Pilgrim group tracking, yatra shelter routes, and emergency geotagging.'
  },
  {
    id: 'MasterSettingsDesk',
    name: 'Master Settings Desk',
    iconName: 'Settings',
    requiredRole: ['SuperAdmin', 'Trustee'],
    requiredTier: 'ENTERPRISE',
    category: 'Governance',
    description: 'High-level temple configurations, API webhooks, and backup protocols.'
  },
  {
    id: 'GodModeBackend',
    name: 'Sovereign Emergency Console',
    iconName: 'Zap',
    requiredRole: ['SuperAdmin'],
    requiredTier: 'ENTERPRISE',
    category: 'Governance',
    description: 'Sovereign emergency state inspector and diagnostic console.'
  }
];

export const DESK_MAP: Record<string, DeskMetadata> = DESK_REGISTRY.reduce(
  (acc, desk) => {
    acc[desk.id] = desk;
    return acc;
  },
  {} as Record<string, DeskMetadata>
);

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
 * Is a DESK_REGISTRY desk (by its registry id, e.g. 'TreasuryLedgerDesk')
 * allowed on the given workspace plan? Unknown desk ids are not plan-gated.
 */
export function isDeskAllowedForPlan(deskId: string, planId?: string | null): boolean {
  const desk = DESK_MAP[deskId];
  if (!desk) return true;
  const planLevel = PLAN_ACCESS_LEVEL[resolvePlanId(planId)] ?? 1;
  const deskLevel = TIER_LEVELS[desk.requiredTier] ?? 1;
  return planLevel >= deskLevel;
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
 * Filters DESK_REGISTRY to return only the modules the current user is
 * allowed to access based on their organization's subscription tier and
 * their personal RBAC role.
 */
export function getAvailableDesks(
  tier: SubscriptionTier = 'LITE',
  role: UserRole = 'Devotee'
): DeskMetadata[] {
  const currentTierLevel = TIER_LEVELS[tier] ?? TIER_LEVELS['LITE'];

  // Normalize legacy or raw role strings safely
  const normalizedRole: UserRole = (ROLE_MIGRATION_MAP[role as string] || role) as UserRole;

  return DESK_REGISTRY.filter((desk) => {
    // 1. Subscription Tier Gating
    const deskTierLevel = TIER_LEVELS[desk.requiredTier] ?? 1;
    if (currentTierLevel < deskTierLevel) {
      return false;
    }

    // 2. Personal RBAC Role Gating
    if (normalizedRole === 'SuperAdmin') {
      return true; // SuperAdmin has universal override
    }

    if (Array.isArray(desk.requiredRole)) {
      return (
        desk.requiredRole.includes(normalizedRole) ||
        desk.requiredRole.some((req) => isRolePrivileged(normalizedRole, req))
      );
    }

    return isRolePrivileged(normalizedRole, desk.requiredRole);
  });
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
