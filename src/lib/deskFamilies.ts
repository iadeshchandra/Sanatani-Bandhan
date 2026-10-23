/**
 * deskFamilies.ts — the All-Desks Directory's plain-language families.
 * =====================================================================
 * Module-system redesign (2026-10-23, owner-delegated decision): the
 * App Store model of module discovery is retired. Desks are no longer
 * "installed" — every desk is present, and the directory groups the
 * full MODULE_CATALOG into six families named by the KIND OF WORK,
 * the way the competitor evidence says users actually think
 * (Bhakti OS's five families, TempleOS's six plain cards — always
 * grouped, never a flat 70-item list).
 *
 * The catalog's seven technical domains map onto the families like
 * this: Domain 2 (Financials) → Money, whole. Domain 1 (CRM) →
 * People, whole bar the Command Center itself. Domain 3 (Rituals) →
 * Seva & Rituals. Domain 4 (Specialized) splits by purpose — service
 * desks to Seva, festival desks to Festivals, the org-type flagship
 * suites + education + stays to Your Institution, compliance to
 * Records. Domain 5 (Outreach) splits by purpose. Domain 6
 * (Governance) + Domain 7 (Life) fold into Records & Settings and
 * Seva & Rituals respectively.
 *
 * TOTALITY LAW: every MODULE_CATALOG id appears in DESK_FAMILY
 * exactly once, and nothing else appears there. The guard test
 * (moduleRedesign.test.ts) diffs this map against the live catalog —
 * a new desk cannot ship without a family, and a renamed desk cannot
 * silently drop out of the directory.
 */

export type DeskFamilyId =
  | 'money'
  | 'people'
  | 'seva'
  | 'festivals'
  | 'institution'
  | 'records';

export interface DeskFamily {
  id: DeskFamilyId;
  /** Dictionary key under suites.seva.directory.families. */
  dictKey: string;
  /** English fallback label (the dictionary carries the real label). */
  label: string;
  /** Tailwind classes for the family icon chip (light dashboard language). */
  chipClass: string;
  iconClass: string;
}

export const DESK_FAMILIES: DeskFamily[] = [
  {
    id: 'money',
    dictKey: 'suites.seva.directory.families.money',
    label: 'Money',
    chipClass: 'bg-emerald-50 border-emerald-100',
    iconClass: 'text-emerald-600',
  },
  {
    id: 'people',
    dictKey: 'suites.seva.directory.families.people',
    label: 'People',
    chipClass: 'bg-indigo-50 border-indigo-100',
    iconClass: 'text-indigo-600',
  },
  {
    id: 'seva',
    dictKey: 'suites.seva.directory.families.seva',
    label: 'Seva & Rituals',
    chipClass: 'bg-orange-50 border-orange-100',
    iconClass: 'text-orange-600',
  },
  {
    id: 'festivals',
    dictKey: 'suites.seva.directory.families.festivals',
    label: 'Festivals & Gatherings',
    chipClass: 'bg-rose-50 border-rose-100',
    iconClass: 'text-rose-600',
  },
  {
    id: 'institution',
    dictKey: 'suites.seva.directory.families.institution',
    label: 'Your Institution',
    chipClass: 'bg-violet-50 border-violet-100',
    iconClass: 'text-violet-600',
  },
  {
    id: 'records',
    dictKey: 'suites.seva.directory.families.records',
    label: 'Records & Settings',
    chipClass: 'bg-teal-50 border-teal-100',
    iconClass: 'text-teal-600',
  },
];

/** Canonical desk id → its directory family. Total over MODULE_CATALOG. */
export const DESK_FAMILY: Record<string, DeskFamilyId> = {
  // Money — the whole of Domain 2 (Financials & Assets).
  'quick-chanda-pos': 'money',
  treasury: 'money',
  'hundi-audit': 'money',
  'cash-custody': 'money',
  'ratna-bhandar': 'money',
  taxReceipts: 'money',
  form10bd: 'money',
  'tally-export': 'money',
  campaigns: 'money',
  karmaLedger: 'money',
  assets: 'money',
  inventory: 'money',
  bhoomi: 'money',
  vahan: 'money',
  'recurring-seva': 'money',

  // People — Domain 1's community desks + community voting.
  devotees: 'people',
  membership: 'people',
  family: 'people',
  vanshavali: 'people',
  guests: 'people',
  donorCare: 'people',
  bulkImport: 'people',
  federation: 'people',
  'sevadar-roster': 'people',
  panchayatPolls: 'people',

  // Seva & Rituals — Domain 3 + the service desks of Domains 4/5/7.
  checkin: 'seva',
  poojaBooking: 'seva',
  mandirPuja: 'seva',
  purohitDesk: 'seva',
  purohitMarket: 'seva',
  pitruShradh: 'seva',
  'yatranet-gis': 'seva',
  rakthaSeva: 'seva',
  annadanam: 'seva',
  'annakshetra-one': 'seva',
  'tirth-one': 'seva',
  sandeshBroadcast: 'seva',
  'sadhana-karma': 'seva',
  'sanatani-vivah': 'seva',
  yatraNet: 'seva',

  // Festivals & Gatherings — the calendar and the mandali.
  panchang: 'festivals',
  utsavPanjika: 'festivals',
  'utsav-one': 'festivals',
  satsang: 'festivals',
  'satsang-one': 'festivals',

  // Your Institution — the org-type flagship suites, education, stays.
  goshala: 'institution',
  'goshala-one': 'institution',
  ashramKutir: 'institution',
  dharamshala: 'institution',
  'ashram-one': 'institution',
  gurukul: 'institution',
  gurukulAcademy: 'institution',
  vidyalaya: 'institution',
  pathshala: 'institution',
  'yoga-one': 'institution',
  'matha-one': 'institution',
  sanghaDrills: 'institution',
  'samskara-one': 'institution',
  'sabha-one': 'institution',

  // Records & Settings — home, records, governance, safety, plan.
  dashboard: 'records',
  granthLibrary: 'records',
  trusteeGovernance: 'records',
  legalVault: 'records',
  'nyas-one': 'records',
  dharmicAssistant: 'records',
  appStore: 'records',
  'workspace-hub': 'records',
  masterSettings: 'records',
  spiritualSettings: 'records',
  qrScanner: 'records',
  'crisis-command': 'records',
  'tactical-radar': 'records',
};

/** The family a desk belongs to (undefined only for non-catalog ids). */
export function familyOfDesk(deskId: string): DeskFamilyId | undefined {
  return DESK_FAMILY[deskId];
}

/** Family metadata by id. */
export function deskFamily(id: DeskFamilyId): DeskFamily {
  return DESK_FAMILIES.find((f) => f.id === id) ?? DESK_FAMILIES[0];
}

/**
 * Group items (anything carrying a catalog `id`) by family, in the
 * canonical family order, dropping empty families. Item order inside
 * a family is the caller's (catalog order).
 */
export function groupByFamily<T extends { id: string }>(
  items: T[]
): { family: DeskFamily; items: T[] }[] {
  const out: { family: DeskFamily; items: T[] }[] = [];
  for (const family of DESK_FAMILIES) {
    const inFamily = items.filter((i) => DESK_FAMILY[i.id] === family.id);
    if (inFamily.length > 0) out.push({ family, items: inFamily });
  }
  return out;
}
