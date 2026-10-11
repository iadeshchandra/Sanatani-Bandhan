import { SubscriptionTier as GlobalSubscriptionTier } from '../types';

export type SubscriptionTier = 'LITE' | 'STANDARD' | 'ENTERPRISE';

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

export interface TierPricingConfig {
  tier: SubscriptionTier;
  name: string;
  badge?: string;
  tagline: string;
  description: string;
  targetAudience: string;
  price: {
    monthly: number;
    annual: number;
    currency: string;
    currencySymbol: string;
  };
  limits: TierLimits;
  features: TierFeatures;
  includedDesks: readonly string[];
  highlightedPerks: string[];
}

export const PLAN_PRICING: Record<SubscriptionTier, TierPricingConfig> = {
  LITE: {
    tier: 'LITE',
    name: 'Lite - Shrines & Small Temples',
    badge: 'STARTER',
    tagline: 'Digital essentials and ritual reservations for local shrines',
    description: 'Perfect for local shrines, village temples, and independent purohits focusing on day-to-day rituals and community connectivity.',
    targetAudience: 'Small Temples/Shrines',
    price: {
      monthly: 0,
      annual: 0,
      currency: 'INR',
      currencySymbol: '₹'
    },
    limits: {
      devotees: 100,
      transactions: 250,
      events: 10,
      storageMB: 250,
      adminSeats: 2,
      branches: 1,
      pdfsPerMonth: 10
    },
    features: {
      poojaBooking: true,
      panchangMuhurat: true,
      quickChanda: true,
      whatsappBroadcasting: true,
      annadanamKitchen: false,
      dharamshala: false,
      gauSeva: false,
      mandirCampaigns: false,
      sevadarRoster: false,
      karmaLedger: false,
      inventory: false,
      taxReceipts: false,
      multiBranch: false,
      treasuryLedger: false,
      auditLogs: false,
      crisisCommand: false,
      userRolesManagement: false,
      doubleEntryAccounting: false,
      customDomain: false,
      apiAccess: false,
      prioritySupport: false
    },
    includedDesks: [
      'PoojaBookingDesk',
      'PanchangMuhuratDesk',
      'QuickChandaModal',
      'WhatsAppBroadcasterDesk'
    ],
    highlightedPerks: [
      'Pooja Booking Desk for ritual scheduling',
      'Panchang & Muhurat calculation desk',
      'Quick Chanda & Seva modal donation portal',
      'WhatsApp Broadcaster for devotee announcements',
      'Up to 100 Devotee profiles & 1 Branch'
    ]
  },
  STANDARD: {
    tier: 'STANDARD',
    name: 'Standard - Ashrams & Medium Trusts',
    badge: 'POPULAR',
    tagline: 'Operational logistics, seva rosters, and charity management',
    description: 'Comprehensive operational suite for growing temples, ashrams, goshalas, and charitable community trusts.',
    targetAudience: 'Ashrams/Medium Trusts',
    price: {
      monthly: 1499,
      annual: 14990,
      currency: 'INR',
      currencySymbol: '₹'
    },
    limits: {
      devotees: 2500,
      transactions: 10000,
      events: 100,
      storageMB: 2500,
      adminSeats: 8,
      branches: 3,
      pdfsPerMonth: 100
    },
    features: {
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
      multiBranch: false,
      treasuryLedger: false,
      auditLogs: false,
      crisisCommand: false,
      userRolesManagement: false,
      doubleEntryAccounting: false,
      customDomain: false,
      apiAccess: false,
      prioritySupport: true
    },
    includedDesks: [
      // Includes all LITE features
      'PoojaBookingDesk',
      'PanchangMuhuratDesk',
      'QuickChandaModal',
      'WhatsAppBroadcasterDesk',
      // Plus STANDARD logistics desks
      'AnnadanamKitchenDesk',
      'DharamshalaDesk',
      'GauSevaDesk',
      'MandirCampaignsDesk',
      'SevadarRosterDesk',
      'KarmaLedgerDesk',
      'InventoryDesk',
      'TaxReceiptDesk'
    ],
    highlightedPerks: [
      'All Lite features included',
      'Annadanam Kitchen & Prasadam management',
      'Dharamshala & Kutir guest room reservations',
      'Gau Seva cattle care & feed monitoring',
      'Mandir Campaigns & fundraising goals',
      'Sevadar Roster & volunteer duty shifts',
      'Karma Ledger micro-seva registry',
      'Inventory & temple store stock ledger',
      '80G Tax Receipt Desk with instant PDF generation',
      'Up to 2,500 Devotees & 3 Branches'
    ]
  },
  ENTERPRISE: {
    tier: 'ENTERPRISE',
    name: 'Enterprise - Mega Temples & Federations',
    badge: 'ERP & GOVERNANCE',
    tagline: 'Multi-branch ERP, double-entry accounting, and high-trust audit security',
    description: 'Mission-critical enterprise control center for mega temples, national federations, pilgrim tirths, and multi-branch trust councils.',
    targetAudience: 'Mega Temples/Federations',
    price: {
      monthly: 4999,
      annual: 49990,
      currency: 'INR',
      currencySymbol: '₹'
    },
    limits: {
      devotees: -1, // Unlimited
      transactions: -1, // Unlimited
      events: -1, // Unlimited
      storageMB: 50000,
      adminSeats: -1, // Unlimited
      branches: -1, // Unlimited
      pdfsPerMonth: -1 // Unlimited
    },
    features: {
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
      customDomain: true,
      apiAccess: true,
      prioritySupport: true
    },
    includedDesks: [
      // Includes all LITE features
      'PoojaBookingDesk',
      'PanchangMuhuratDesk',
      'QuickChandaModal',
      'WhatsAppBroadcasterDesk',
      // Includes all STANDARD features
      'AnnadanamKitchenDesk',
      'DharamshalaDesk',
      'GauSevaDesk',
      'MandirCampaignsDesk',
      'SevadarRosterDesk',
      'KarmaLedgerDesk',
      'InventoryDesk',
      'TaxReceiptDesk',
      // Plus ENTERPRISE governance & ERP
      'WorkspaceSelectorDesk',
      'TreasuryLedgerDesk',
      'AuditLogDesk',
      'CrisisCommandCenter',
      'UserRolesDesk'
    ],
    highlightedPerks: [
      'All Lite and Standard features included',
      'WorkspaceSelectorDesk for multi-branch mandir federations',
      'TreasuryLedgerDesk for double-entry GAAP accounting',
      'AuditLogDesk for immutable cryptographically verifiable logs',
      'CrisisCommandCenter for crowd management and emergency SOS',
      'UserRolesDesk for fine-grained RBAC matrix governance',
      'Unlimited devotees, transactions, admin seats, and branches',
      'Dedicated SLA and priority engineering support'
    ]
  }
};

export const TIER_LEVELS: Record<SubscriptionTier, number> = {
  LITE: 1,
  STANDARD: 2,
  ENTERPRISE: 3
};

// Legacy compatibility exports for existing components (UpsellModal, usePlanGate)
export type PlanId = 'DEMO' | 'SEVA' | 'MANDIR' | 'SMART_PRO' | 'SAMPRADAYA' | 'LITE' | 'STANDARD' | 'ENTERPRISE';

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

export const SUBSCRIPTION_PLANS: Record<PlanId, PlanDefinition> = {
  DEMO: {
    id: 'DEMO',
    name: 'Public Demo',
    description: 'Temporary sandbox for exploration',
    price: { monthly: 0, annual: 0, currency: 'INR', currencySymbol: '₹' },
    limits: { devotees: 6, transactions: 6, events: 2, storageMB: 10, adminSeats: 1, pdfsPerMonth: 0 },
    features: { devotee_directory: true, treasury_ledger: true, pooja_calendar: true, dharamshala: true, asset_inventory: true, panchayat_polling: true, sanatani_vivah: true, purohit_market: true, vanshavali: true, data_export: false, qr_biometric: true, whatsapp_broadcast: false, offline_emergency: true, yatra_net: true, god_mode_audit: false },
    highlightedFeatures: ['Sandbox access']
  },
  SEVA: {
    id: 'SEVA',
    name: 'Seva Plan (Lite)',
    badge: 'CORE',
    description: 'Perfect for small temples and local trusts getting started.',
    price: { monthly: 0, annual: 0, currency: 'INR', currencySymbol: '₹' },
    limits: { devotees: 100, transactions: 250, events: 10, storageMB: 250, adminSeats: 2, pdfsPerMonth: 10 },
    features: { devotee_directory: true, treasury_ledger: false, pooja_calendar: true, dharamshala: false, asset_inventory: false, panchayat_polling: false, sanatani_vivah: false, purohit_market: false, vanshavali: false, data_export: false, qr_biometric: false, whatsapp_broadcast: true, offline_emergency: false, yatra_net: false, god_mode_audit: false },
    highlightedFeatures: ['Up to 100 Devotees', 'Pooja Booking Desk', 'WhatsApp Broadcasts']
  },
  MANDIR: {
    id: 'MANDIR',
    name: 'Mandir Essentials (Standard)',
    badge: 'POPULAR',
    description: 'The standard suite for growing local temples and mid-sized trusts.',
    price: { monthly: 1499, annual: 14990, currency: 'INR', currencySymbol: '₹' },
    limits: { devotees: 2500, transactions: 10000, events: 100, storageMB: 2500, adminSeats: 8, pdfsPerMonth: 100 },
    features: { devotee_directory: true, treasury_ledger: true, pooja_calendar: true, dharamshala: true, asset_inventory: true, panchayat_polling: false, sanatani_vivah: false, purohit_market: false, vanshavali: false, data_export: true, qr_biometric: true, whatsapp_broadcast: true, offline_emergency: true, yatra_net: false, god_mode_audit: false },
    highlightedFeatures: ['Annadanam & Kitchen', 'Dharamshala Desk', 'Gau Seva & Inventory', '80G Tax Receipts']
  },
  SMART_PRO: {
    id: 'SMART_PRO',
    name: 'Smart Pro (Enterprise)',
    badge: 'RECOMMENDED',
    description: 'Complete enterprise ecosystem for large organizations and global trusts.',
    price: { monthly: 4999, annual: 49990, currency: 'INR', currencySymbol: '₹' },
    limits: { devotees: -1, transactions: -1, events: -1, storageMB: 50000, adminSeats: -1, pdfsPerMonth: -1 },
    features: { devotee_directory: true, treasury_ledger: true, pooja_calendar: true, dharamshala: true, asset_inventory: true, panchayat_polling: true, sanatani_vivah: true, purohit_market: true, vanshavali: true, data_export: true, qr_biometric: true, whatsapp_broadcast: true, offline_emergency: true, yatra_net: true, god_mode_audit: true },
    highlightedFeatures: ['Multi-Branch Selector', 'Double-Entry Accounting', 'Audit Logs & Crisis Command', 'Granular User Roles']
  },
  SAMPRADAYA: {
    id: 'SAMPRADAYA',
    name: 'Sampradaya Enterprise',
    description: 'Custom solutions for massive trusts requiring dedicated servers.',
    price: { monthly: 0, annual: 0, currency: 'INR', currencySymbol: '₹' },
    limits: { devotees: -1, transactions: -1, events: -1, storageMB: -1, adminSeats: -1, pdfsPerMonth: -1 },
    features: { devotee_directory: true, treasury_ledger: true, pooja_calendar: true, dharamshala: true, asset_inventory: true, panchayat_polling: true, sanatani_vivah: true, purohit_market: true, vanshavali: true, data_export: true, qr_biometric: true, whatsapp_broadcast: true, offline_emergency: true, yatra_net: true, god_mode_audit: true },
    highlightedFeatures: ['Custom Deployments', 'Dedicated Infrastructure', 'SLA Guarantees']
  },
  LITE: {
    id: 'LITE',
    name: 'Lite Tier',
    badge: 'STARTER',
    description: 'Essential digital presence and ritual reservations',
    price: { monthly: 0, annual: 0, currency: 'INR', currencySymbol: '₹' },
    limits: { devotees: 100, transactions: 250, events: 10, storageMB: 250, adminSeats: 2, pdfsPerMonth: 10 },
    features: { devotee_directory: true, treasury_ledger: false, pooja_calendar: true, dharamshala: false, asset_inventory: false, panchayat_polling: false, sanatani_vivah: false, purohit_market: false, vanshavali: false, data_export: false, qr_biometric: false, whatsapp_broadcast: true, offline_emergency: false, yatra_net: false, god_mode_audit: false },
    highlightedFeatures: ['Pooja Booking Desk', 'Panchang & Muhurat', 'Quick Chanda Modal', 'WhatsApp Broadcaster']
  },
  STANDARD: {
    id: 'STANDARD',
    name: 'Standard Tier',
    badge: 'POPULAR',
    description: 'Operational logistics, seva management, and inventory',
    price: { monthly: 1499, annual: 14990, currency: 'INR', currencySymbol: '₹' },
    limits: { devotees: 2500, transactions: 10000, events: 100, storageMB: 2500, adminSeats: 8, pdfsPerMonth: 100 },
    features: { devotee_directory: true, treasury_ledger: false, pooja_calendar: true, dharamshala: true, asset_inventory: true, panchayat_polling: false, sanatani_vivah: false, purohit_market: false, vanshavali: false, data_export: true, qr_biometric: true, whatsapp_broadcast: true, offline_emergency: true, yatra_net: false, god_mode_audit: false },
    highlightedFeatures: ['Annadanam Kitchen', 'Dharamshala Desk', 'Gau Seva Desk', 'Mandir Campaigns', 'Sevadar Roster', 'Karma Ledger', 'Inventory Desk', '80G Tax Receipts']
  },
  ENTERPRISE: {
    id: 'ENTERPRISE',
    name: 'Enterprise Tier',
    badge: 'ERP & GOVERNANCE',
    description: 'Multi-branch ERP, double-entry treasury, and audit security',
    price: { monthly: 4999, annual: 49990, currency: 'INR', currencySymbol: '₹' },
    limits: { devotees: -1, transactions: -1, events: -1, storageMB: 50000, adminSeats: -1, pdfsPerMonth: -1 },
    features: { devotee_directory: true, treasury_ledger: true, pooja_calendar: true, dharamshala: true, asset_inventory: true, panchayat_polling: true, sanatani_vivah: true, purohit_market: true, vanshavali: true, data_export: true, qr_biometric: true, whatsapp_broadcast: true, offline_emergency: true, yatra_net: true, god_mode_audit: true },
    highlightedFeatures: ['WorkspaceSelectorDesk', 'TreasuryLedgerDesk', 'AuditLogDesk', 'CrisisCommandCenter', 'UserRolesDesk']
  }
};
