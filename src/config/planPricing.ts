/**
 * planPricing.ts — Canonical pricing model (final, locked 2026-10-14).
 *
 * Freemium model: EVERY plan includes ALL features; only usage caps differ.
 * Tiers: SEVA (free) / STANDARD / PREMIUM / PUROHIT_PRO (individuals).
 *
 * Per-region prices: INR (India), BDT (Bangladesh), USD (International).
 * The flat `price` field (INR) is kept for backward compatibility with
 * existing UI (UpsellModal, PlanLockedDesk) — new code should prefer
 * `regionalPrices`.
 *
 * Usage caps are the source of truth in src/lib/planLimits.ts — the caps
 * here mirror those values for display purposes.
 */

export type SubscriptionTier = 'SEVA' | 'STANDARD' | 'PREMIUM' | 'PUROHIT_PRO';

export interface TierLimits {
  devotees: number; // -1 means unlimited
  transactions: number; // -1 means unlimited
  events: number; // -1 means unlimited
  storageMB: number; // -1 means unlimited
  adminSeats: number; // -1 means unlimited
  branches: number; // -1 means unlimited
  pdfsPerMonth: number; // -1 means unlimited
}

export interface TierFeatures {
  poojaBooking: boolean;
  panchangMuhurat: boolean;
  quickChanda: boolean;
  whatsappBroadcasting: boolean;
  annadanamKitchen: boolean;
  dharamshala: boolean;
  gauSeva: boolean;
  mandirCampaigns: boolean;
  sevadarRoster: boolean;
  karmaLedger: boolean;
  inventory: boolean;
  taxReceipts: boolean;
  multiBranch: boolean;
  treasuryLedger: boolean;
  auditLogs: boolean;
  crisisCommand: boolean;
  userRolesManagement: boolean;
  doubleEntryAccounting: boolean;
  customDomain: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
}

export interface RegionalPrice {
  monthly: number;
  annual: number;
}

export interface RegionalPrices {
  inr: RegionalPrice;
  bdt: RegionalPrice;
  usd: RegionalPrice;
}

export interface TierPricingConfig {
  tier: SubscriptionTier;
  name: string;
  badge?: string;
  tagline: string;
  description: string;
  targetAudience: string;
  /** Flat INR price — backward compat for existing UI. New code: use regionalPrices. */
  price: {
    monthly: number;
    annual: number;
    currency: string;
    currencySymbol: string;
  };
  /** Per-region pricing (locked 2026-10-14). */
  regionalPrices: RegionalPrices;
  limits: TierLimits;
  features: TierFeatures;
  includedDesks: readonly string[];
  highlightedPerks: string[];
}

/** All features on — the freemium model. Only apiAccess/customDomain are Premium-gated (infra). */
const ALL_FEATURES: TierFeatures = {
  poojaBooking: true,
  panchangMuhurat: true,
  quickChanda: true,
  whatsappBroadcasting: true,
  annadanamKitchen: true,
  dharamshala: true,
  gauSeva: true,
  mandirCampaigns: true,
  sevadarRoster: true,
  karmaLedger: true,
  inventory: true,
  taxReceipts: true,
  multiBranch: true,
  treasuryLedger: true,
  auditLogs: true,
  crisisCommand: true,
  userRolesManagement: true,
  doubleEntryAccounting: true,
  customDomain: false,
  apiAccess: false,
  prioritySupport: true,
};

export const PLAN_PRICING: Record<SubscriptionTier, TierPricingConfig> = {
  SEVA: {
    tier: 'SEVA',
    name: 'Seva Free',
    badge: 'FREE FOREVER',
    tagline: 'Every feature, generous free limits — dharma technology for every institution',
    description: 'The complete Sanatani Bandhan suite, free forever. All features included; usage caps keep it sustainable.',
    targetAudience: 'All institutions getting started',
    price: { monthly: 0, annual: 0, currency: 'INR', currencySymbol: '₹' },
    regionalPrices: {
      inr: { monthly: 0, annual: 0 },
      bdt: { monthly: 0, annual: 0 },
      usd: { monthly: 0, annual: 0 },
    },
    limits: {
      devotees: 100,
      transactions: 500,
      events: 10,
      storageMB: 250,
      adminSeats: 2,
      branches: 1,
      pdfsPerMonth: 10,
    },
    features: { ...ALL_FEATURES },
    includedDesks: [
      'PoojaBookingDesk',
      'PanchangMuhuratDesk',
      'QuickChandaModal',
      'WhatsAppBroadcasterDesk',
      'AnnadanamKitchenDesk',
      'DharamshalaDesk',
      'GauSevaDesk',
      'MandirCampaignsDesk',
      'SevadarRosterDesk',
      'KarmaLedgerDesk',
      'InventoryDesk',
      'TaxReceiptDesk',
    ],
    highlightedPerks: [
      'Every feature included — no gated desks',
      'Pooja Booking, Panchang & Muhurat, Quick Chanda',
      'Annadanam Kitchen, Dharamshala, Gau Seva',
      '80G Tax Receipts with instant PDF',
      'Up to 100 devotees · 500 transactions/mo · 2 seats · 1 branch',
    ],
  },
  STANDARD: {
    tier: 'STANDARD',
    name: 'Standard',
    badge: 'POPULAR',
    tagline: 'Room to grow — higher caps for thriving institutions',
    description: 'Everything in Seva Free, with raised limits for growing temples, ashrams, goshalas and trusts.',
    targetAudience: 'Growing institutions',
    price: { monthly: 499, annual: 4999, currency: 'INR', currencySymbol: '₹' },
    regionalPrices: {
      inr: { monthly: 499, annual: 4999 },
      bdt: { monthly: 700, annual: 7000 },
      usd: { monthly: 6, annual: 60 },
    },
    limits: {
      devotees: 1000,
      transactions: -1,
      events: 100,
      storageMB: 2500,
      adminSeats: 10,
      branches: 3,
      pdfsPerMonth: 100,
    },
    features: { ...ALL_FEATURES },
    includedDesks: [
      'PoojaBookingDesk',
      'PanchangMuhuratDesk',
      'QuickChandaModal',
      'WhatsAppBroadcasterDesk',
      'AnnadanamKitchenDesk',
      'DharamshalaDesk',
      'GauSevaDesk',
      'MandirCampaignsDesk',
      'SevadarRosterDesk',
      'KarmaLedgerDesk',
      'InventoryDesk',
      'TaxReceiptDesk',
    ],
    highlightedPerks: [
      'Everything in Seva Free',
      'Up to 1,000 devotees · unlimited transactions',
      '10 staff seats · 3 branches',
      'Priority support',
    ],
  },
  PREMIUM: {
    tier: 'PREMIUM',
    name: 'Premium',
    badge: 'UNLIMITED',
    tagline: 'Unlimited everything, plus API access and custom domain',
    description: 'For large institutions, federations and tirths — unlimited caps, API access, and white-label domain.',
    targetAudience: 'Large institutions & federations',
    price: { monthly: 1999, annual: 19999, currency: 'INR', currencySymbol: '₹' },
    regionalPrices: {
      inr: { monthly: 1999, annual: 19999 },
      bdt: { monthly: 2800, annual: 28000 },
      usd: { monthly: 24, annual: 240 },
    },
    limits: {
      devotees: -1,
      transactions: -1,
      events: -1,
      storageMB: 50000,
      adminSeats: -1,
      branches: -1,
      pdfsPerMonth: -1,
    },
    features: { ...ALL_FEATURES, customDomain: true, apiAccess: true },
    includedDesks: [
      'PoojaBookingDesk',
      'PanchangMuhuratDesk',
      'QuickChandaModal',
      'WhatsAppBroadcasterDesk',
      'AnnadanamKitchenDesk',
      'DharamshalaDesk',
      'GauSevaDesk',
      'MandirCampaignsDesk',
      'SevadarRosterDesk',
      'KarmaLedgerDesk',
      'InventoryDesk',
      'TaxReceiptDesk',
      'WorkspaceSelectorDesk',
      'TreasuryLedgerDesk',
      'AuditLogDesk',
      'CrisisCommandCenter',
      'UserRolesDesk',
    ],
    highlightedPerks: [
      'Everything in Standard',
      'Unlimited devotees, transactions, seats & branches',
      'API access & custom domain',
      'Dedicated SLA and priority engineering support',
    ],
  },
  PUROHIT_PRO: {
    tier: 'PUROHIT_PRO',
    name: 'Purohit / Jyotishi Pro',
    badge: 'PROFESSIONALS',
    tagline: 'Verified badge, better ranking, dispute protection — plus 12% per booking',
    description: 'For individual purohits and jyotishis on the marketplace. Verified badge, ranking boost, and dispute protection.',
    targetAudience: 'Purohits & Jyotishis',
    price: { monthly: 199, annual: 1990, currency: 'INR', currencySymbol: '₹' },
    regionalPrices: {
      inr: { monthly: 199, annual: 1990 },
      bdt: { monthly: 280, annual: 2800 },
      usd: { monthly: 2.5, annual: 25 },
    },
    limits: {
      devotees: -1,
      transactions: -1,
      events: -1,
      storageMB: 1000,
      adminSeats: 1,
      branches: 1,
      pdfsPerMonth: 50,
    },
    features: { ...ALL_FEATURES },
    includedDesks: [
      'PoojaBookingDesk',
      'PanchangMuhuratDesk',
      'QuickChandaModal',
      'WhatsAppBroadcasterDesk',
    ],
    highlightedPerks: [
      'Verified Pro badge on your profile',
      'Higher ranking in marketplace search',
      'Dispute protection & priority review',
      '12% commission per completed booking',
    ],
  },
};

export const TIER_LEVELS: Record<SubscriptionTier, number> = {
  SEVA: 1,
  STANDARD: 2,
  PREMIUM: 3,
  PUROHIT_PRO: 2,
};

// ---------------------------------------------------------------------------
// Legacy compatibility shim — maps old plan ids to the new tiers so existing
// components (usePlanGate, UpsellModal, workspaceRegistry) keep working.
// ---------------------------------------------------------------------------

export type PlanId =
  | 'DEMO'
  | 'SEVA'
  | 'MANDIR'
  | 'SMART_PRO'
  | 'SAMPRADAYA'
  | 'LITE'
  | 'STANDARD'
  | 'ENTERPRISE'
  | 'PREMIUM'
  | 'PUROHIT_PRO';

export interface PlanPrice {
  monthly: number;
  annual: number;
  currency: string;
  currencySymbol: string;
}

export interface PlanLimits {
  devotees: number;
  transactions: number;
  events: number;
  storageMB: number;
  adminSeats: number;
  pdfsPerMonth: number;
}

export interface PlanFeatures {
  devotee_directory: boolean;
  treasury_ledger: boolean;
  pooja_calendar: boolean;
  dharamshala: boolean;
  asset_inventory: boolean;
  panchayat_polling: boolean;
  sanatani_vivah: boolean;
  purohit_market: boolean;
  vanshavali: boolean;
  data_export: boolean;
  qr_biometric: boolean;
  whatsapp_broadcast: boolean;
  offline_emergency: boolean;
  yatra_net: boolean;
  god_mode_audit: boolean;
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  badge?: string;
  description: string;
  price: PlanPrice;
  limits: PlanLimits;
  features: PlanFeatures;
  highlightedFeatures: string[];
}

/** Build a legacy PlanDefinition from a canonical tier config. */
function fromTier(id: PlanId, cfg: TierPricingConfig): PlanDefinition {
  return {
    id,
    name: cfg.name,
    badge: cfg.badge,
    description: cfg.description,
    price: { ...cfg.price },
    limits: {
      devotees: cfg.limits.devotees,
      transactions: cfg.limits.transactions,
      events: cfg.limits.events,
      storageMB: cfg.limits.storageMB,
      adminSeats: cfg.limits.adminSeats,
      pdfsPerMonth: cfg.limits.pdfsPerMonth,
    },
    // Legacy feature map: all true under the freemium model.
    features: {
      devotee_directory: true,
      treasury_ledger: true,
      pooja_calendar: true,
      dharamshala: true,
      asset_inventory: true,
      panchayat_polling: true,
      sanatani_vivah: true,
      purohit_market: true,
      vanshavali: true,
      data_export: true,
      qr_biometric: true,
      whatsapp_broadcast: true,
      offline_emergency: true,
      yatra_net: true,
      god_mode_audit: true,
    },
    highlightedFeatures: [...cfg.highlightedPerks],
  };
}

export const SUBSCRIPTION_PLANS: Record<PlanId, PlanDefinition> = {
  DEMO: {
    ...fromTier('DEMO', PLAN_PRICING.SEVA),
    id: 'DEMO',
    name: 'Public Demo',
    description: 'Temporary sandbox for exploration',
    limits: { devotees: 6, transactions: 6, events: 2, storageMB: 10, adminSeats: 1, pdfsPerMonth: 0 },
    highlightedFeatures: ['Sandbox access'],
  },
  SEVA: fromTier('SEVA', PLAN_PRICING.SEVA),
  // Legacy aliases → new tiers
  LITE: fromTier('LITE', PLAN_PRICING.SEVA),
  MANDIR: fromTier('MANDIR', PLAN_PRICING.STANDARD),
  STANDARD: fromTier('STANDARD', PLAN_PRICING.STANDARD),
  SMART_PRO: fromTier('SMART_PRO', PLAN_PRICING.PREMIUM),
  SAMPRADAYA: fromTier('SAMPRADAYA', PLAN_PRICING.PREMIUM),
  ENTERPRISE: fromTier('ENTERPRISE', PLAN_PRICING.PREMIUM),
  PREMIUM: fromTier('PREMIUM', PLAN_PRICING.PREMIUM),
  PUROHIT_PRO: fromTier('PUROHIT_PRO', PLAN_PRICING.PUROHIT_PRO),
};
