import { WorkspaceType } from '../../types';
import { requiredTierForModule } from '../../lib/workspaceRegistry';
import { PLAN_PRICING } from '../../config/planPricing';

/**
 * wizardDeskMap.ts — the Setup Wizard's brain.
 *
 * Maps (orgType, pains, size) → ~8 essential desk ids from the REAL sidebar
 * catalog. Every id here is verified to mount in App.tsx's renderActiveDesk
 * switch (see verification notes). No invented ids.
 */

/** The 12 organisation types offered in the wizard (mirrors DemoSelectionModal). */
export const WIZARD_ORG_TYPES: WorkspaceType[] = [
  'Mandir', 'Goshala', 'Sangha', 'Ashram', 'Gurukul',
  'AkshayaPatra', 'MahotsavSamiti', 'PurohitSabha', 'KashiKshetra', 'Trust',
  'Tirth', 'Vidyalaya',
];

export interface OrgTypeMeta {
  type: WorkspaceType;
  label: string;
  hook: string;
  icon: string; // emoji — warm, instant, zero-bundle-cost
}

export const ORG_TYPE_META: OrgTypeMeta[] = [
  { type: 'Mandir', label: 'Mandir', hook: 'Darshan queues, hundi audits & 80G receipts — handled.', icon: '🛕' },
  { type: 'Goshala', label: 'Goshala', hook: 'Gomata records, milk yield & fodder planning — handled.', icon: '🐄' },
  { type: 'Ashram', label: 'Ashram', hook: 'Rooms, guests & sadhana stays — handled.', icon: '🏡' },
  { type: 'Gurukul', label: 'Gurukul', hook: 'Students, shastra syllabus & Vidya Danam — handled.', icon: '🎓' },
  { type: 'Sangha', label: 'Sangha', hook: 'Shakha mobilisation & member seva — handled.', icon: '🚩' },
  { type: 'Trust', label: 'Trust', hook: 'Funds, campaigns & audit-ready books — handled.', icon: '🤝' },
  { type: 'MahotsavSamiti', label: 'Mahotsav Samiti', hook: 'Festivals, gate passes & crowds — handled.', icon: '🎉' },
  { type: 'Tirth', label: 'Tirth / Yatra', hook: 'Yatri flow, stays & GIS crowd safety — handled.', icon: '🚶' },
  { type: 'Vidyalaya', label: 'Vidyalaya / Pathshala', hook: 'Classes, students & heritage learning — handled.', icon: '📚' },
  { type: 'AkshayaPatra', label: 'Akshaya Patra', hook: 'Annadanam scale, kitchens & inventory — handled.', icon: '🍲' },
  { type: 'PurohitSabha', label: 'Purohit Sabha', hook: 'Pujas, dakshina & scholar network — handled.', icon: '📿' },
  { type: 'KashiKshetra', label: 'Kashi Kshetra', hook: 'Tirth operations at Kashi scale — handled.', icon: '🏛️' },
];

/** Pain cards shown in step 3 (max 3 selectable). */
export interface PainMeta {
  id: string;
  label: string;
  line: string;
  icon: string;
}

export const PAINS: PainMeta[] = [
  { id: 'donations', label: 'Donation tracking', line: 'Every rupee accounted, instantly.', icon: '💰' },
  { id: 'compliance', label: '80G / tax compliance', line: 'Receipts your CA will love.', icon: '🧾' },
  { id: 'records', label: 'Devotee & member records', line: 'Your parivar, beautifully organised.', icon: '👪' },
  { id: 'bookings', label: 'Puja / service bookings', line: 'No more paper diaries.', icon: '🪔' },
  { id: 'crowd', label: 'Crowd & darshan management', line: 'Safe, smooth darshan days.', icon: '👥' },
  { id: 'festivals', label: 'Festivals & events', line: 'Utsavs without the chaos.', icon: '🎊' },
  { id: 'cattle', label: 'Goshala / cattle care', line: 'Healthy gomata, happy seva.', icon: '🐂' },
  { id: 'staff', label: 'Staff & volunteers', line: 'Sevadars in the right place.', icon: '🙋' },
  { id: 'audit', label: 'Accounts & audit readiness', line: 'March without the panic.', icon: '📊' },
];

/** Size buckets (one tap). */
export const SIZES = [
  { id: 's', label: '< 100', sub: 'members' },
  { id: 'm', label: '100–500', sub: 'members' },
  { id: 'l', label: '500–2,000', sub: 'members' },
  { id: 'xl', label: '2,000+', sub: 'members' },
] as const;

export const STAFF_SIZES = [
  { id: 'solo', label: 'Just me' },
  { id: 'small', label: '2–10' },
  { id: 'mid', label: '10–50' },
  { id: 'large', label: '50+' },
] as const;

/** Display names for desks the wizard can recommend (from the sidebar catalog). */
export const DESK_NAMES: Record<string, string> = {
  dashboard: 'Command Center',
  devotees: 'Devotee & Member Directory',
  treasury: 'Treasury & Expense Ledger',
  'hundi-audit': 'Hundi & Golak Dual Audit',
  poojaBooking: 'Rituals & Sankalp Hub',
  taxReceipts: 'Tax Certificates (80G/12A)',
  form10bd: 'Form 10BD & CBDT Filing',
  utsavPanjika: 'Festival Calendar & Gate Passes',
  donorCare: 'Donor Care & Win-Back',
  goshala: 'Goshala Sanctuary & Gomata Records',
  inventory: 'Store & Consumables (Bhandara)',
  'sevadar-roster': 'Sevadar HR & Volunteer Roster',
  gurukulAcademy: 'Shastric Academy & Grading',
  gurukul: 'Gurukul Residential Monitoring',
  granthLibrary: 'Sacred Granth & Manuscript Library',
  vidyalaya: 'Weekend Heritage School',
  dharamshala: 'Dharamshala Yatri Bhavan',
  guests: 'Guest & Visitor CRM',
  annadanam: 'Annadanam & Prasad Seva',
  'annakshetra-one': 'Annakshetra One — Kitchen & Bhandara Management',
  'nyas-one': 'Nyas One — Compliance & Governance',
  'utsav-one': 'Utsav One — Festival & Mahotsav Management',
  'tirth-one': 'Tirth One — Darshan Queue & Tokens',
  'yoga-one': 'Yoga One — Shala Management',
  'matha-one': 'Matha One — Monastic Management',
  'satsang-one': 'Satsang One — Mandali Management',
  'sabha-one': 'Sabha One — Purohit Sabha Management',
  'samskara-one': 'Samskara One — Family Lifecycle',
  panchang: 'Vedic Panchang & Muhurat',
  checkin: 'Gate Command & Check-In',
  campaigns: 'Crowdfunding & Mandir Nirman',
  masterSettings: 'Organization Settings & Logos',
  sanghaDrills: 'Sangha & Shakha Mobilization',
  sandeshBroadcast: 'Sandesh WhatsApp/SMS Broadcast',
  'recurring-seva': 'Recurring Seva Mandates',
  'quick-chanda-pos': 'Quick Chanda Counter POS',
  'yatranet-gis': 'YatraNet GIS Crowd & SOS',
  satsang: 'Satsang, Kirtan & Discourse',
};

export function deskName(id: string): string {
  return DESK_NAMES[id] ?? id;
}

/** Sensible ~8-desk defaults per org type. dashboard always leads. */
const ORG_DEFAULTS: Record<string, string[]> = {
  Mandir: ['dashboard', 'devotees', 'quick-chanda-pos', 'treasury', 'hundi-audit', 'poojaBooking', 'taxReceipts', 'donorCare'],
  Goshala: ['dashboard', 'goshala', 'devotees', 'treasury', 'inventory', 'donorCare', 'taxReceipts', 'sevadar-roster'],
  Ashram: ['dashboard', 'dharamshala', 'guests', 'devotees', 'treasury', 'annadanam', 'donorCare', 'sevadar-roster'],
  Gurukul: ['dashboard', 'gurukulAcademy', 'gurukul', 'devotees', 'treasury', 'granthLibrary', 'donorCare', 'vidyalaya'],
  Sangha: ['dashboard', 'devotees', 'sanghaDrills', 'treasury', 'campaigns', 'sandeshBroadcast', 'donorCare', 'sevadar-roster'],
  Trust: ['dashboard', 'devotees', 'treasury', 'campaigns', 'taxReceipts', 'donorCare', 'recurring-seva', 'masterSettings'],
  MahotsavSamiti: ['dashboard', 'utsavPanjika', 'devotees', 'treasury', 'campaigns', 'sandeshBroadcast', 'donorCare', 'sevadar-roster'],
  Tirth: ['dashboard', 'yatranet-gis', 'dharamshala', 'guests', 'treasury', 'quick-chanda-pos', 'donorCare', 'sandeshBroadcast'],
  Vidyalaya: ['dashboard', 'vidyalaya', 'gurukulAcademy', 'devotees', 'treasury', 'granthLibrary', 'donorCare', 'sandeshBroadcast'],
  AkshayaPatra: ['dashboard', 'annadanam', 'annakshetra-one', 'inventory', 'treasury', 'donorCare', 'sevadar-roster', 'campaigns'],
  PurohitSabha: ['dashboard', 'poojaBooking', 'devotees', 'panchang', 'treasury', 'donorCare', 'sandeshBroadcast', 'granthLibrary'],
  KashiKshetra: ['dashboard', 'devotees', 'treasury', 'yatranet-gis', 'utsavPanjika', 'poojaBooking', 'donorCare', 'dharamshala'],
};

/** Extra desks pulled in by each pain (merged with org defaults). Ordered by importance — first pick wins when slots are tight. */
const PAIN_DESKS: Record<string, string[]> = {
  donations: ['quick-chanda-pos', 'donorCare', 'recurring-seva'],
  compliance: ['taxReceipts', 'form10bd', 'masterSettings'],
  records: ['devotees'],
  bookings: ['poojaBooking', 'panchang'],
  crowd: ['checkin', 'yatranet-gis'],
  festivals: ['utsavPanjika', 'campaigns'],
  cattle: ['goshala', 'inventory'],
  staff: ['sevadar-roster', 'sandeshBroadcast'],
  audit: ['treasury', 'taxReceipts'],
};

/** Size nudges: larger parivars get coordination tooling (low priority). */
function sizeDesk(sizeId: string | null): string | null {
  if (sizeId === 'xl') return 'sandeshBroadcast';
  // 'l' used to suggest 'socialWall' — that desk never existed and was
  // removed from the catalog (2026-10-20). Larger parivars get donor care.
  if (sizeId === 'l') return 'donorCare';
  return null;
}

/**
 * The core mapping: (orgType, pains, size) → ~8 essential desk ids.
 *
 * Priority order (org identity leads, pains adjust, never overwhelm):
 *   1. dashboard (always first)
 *   2. top 4 org defaults (the org's signature desks — never displaced)
 *   3. pain desks (first pick per pain, then second picks if room)
 *   4. remaining org defaults fill any gaps
 *   5. size nudge if still room
 * Every returned id mounts in App.tsx.
 */
export function getEssentialDesks(
  orgType: string,
  pains: string[],
  sizeId: string | null
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  const push = (id: string) => {
    if (!seen.has(id) && result.length < 8) {
      seen.add(id);
      result.push(id);
    }
  };
  push('dashboard');
  const defaults = ORG_DEFAULTS[orgType] ?? ORG_DEFAULTS.Mandir;
  // Org core: first 4 defaults after dashboard — the org's signature desks.
  for (const id of defaults) {
    if (id === 'dashboard') continue;
    if (result.length >= 5) break;
    push(id);
  }
  // Pains: round-robin — every pain's top pick lands before any pain's
  // second pick, so 3 pains each get represented in the 8.
  const painLists = pains.map((p) => PAIN_DESKS[p] ?? []).filter((l) => l.length > 0);
  for (let round = 0; round < 3 && result.length < 8; round++) {
    for (const list of painLists) {
      if (result.length >= 8) break;
      const id = list[round];
      if (id) push(id);
    }
  }
  // Fill leftovers from org defaults, then the size nudge.
  for (const id of defaults) {
    if (result.length >= 8) break;
    push(id);
  }
  const sd = sizeDesk(sizeId);
  if (sd) push(sd);
  return result;
}

/** Tier note for a desk on the given plan: null when included. */
export function tierNoteForDesk(
  deskId: string,
  planId?: string | null
): { tier: string; price: string } | null {
  const required = requiredTierForModule(deskId);
  if (!required) return null;
  const plan = (planId || 'LITE').toUpperCase();
  if (plan === required || plan === 'DEMO') return null;
  const level: Record<string, number> = { LITE: 1, STANDARD: 2, ENTERPRISE: 3 };
  if ((level[plan] ?? 1) >= (level[required] ?? 1)) return null;
  const pricing = PLAN_PRICING[required as keyof typeof PLAN_PRICING];
  const monthly = pricing?.price?.monthly ?? 0;
  const price = monthly > 0 ? `₹${monthly.toLocaleString('en-IN')}/mo` : '₹0';
  return { tier: required, price };
}

/** Pure trigger predicate — exported for testing. */
export function shouldShowWizard(args: {
  workspaceId: string | null | undefined;
  currentRole: string | null | undefined;
  storage: { getItem: (k: string) => string | null };
}): boolean {
  const { workspaceId, currentRole, storage } = args;
  if (!workspaceId) return false;
  if (workspaceId.startsWith('DEMO_')) return false;
  if (currentRole === 'Devotee' || currentRole === 'DEVOTEE') return false;
  // Only fresh signups carry the pending marker (set by PortalLogin).
  if (storage.getItem('sb_setup_pending') !== workspaceId) return false;
  if (storage.getItem(`sb_setup_done_${workspaceId}`)) return false;
  return true;
}

export function markSetupDone(workspaceId: string): void {
  try {
    localStorage.setItem(`sb_setup_done_${workspaceId}`, '1');
    localStorage.removeItem('sb_setup_pending');
  } catch {
    /* storage unavailable — wizard simply may reappear; harmless */
  }
}
