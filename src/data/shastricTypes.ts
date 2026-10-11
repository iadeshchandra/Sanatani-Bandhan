// ============================================================================
// Shastric & Statutory Terminology Lexicon & Role-Based SOP Knowledge Base
// Languages Supported: English ('en'), Hindi ('hi'), Bengali ('bn'), Sanskrit ('sa')
// ============================================================================

export type TermCategory = 'SHASTRIC' | 'FINANCE' | 'OPERATIONS';

export interface LocalizedString {
  en: string;
  hi: string;
  bn: string;
  sa: string;
}

export interface ShastricTerm {
  termKey: string;
  category: TermCategory;
  label: LocalizedString;
  definition: LocalizedString;
  synonyms?: string[];
  canonicalReference?: string; // e.g. "Manusmriti 3.5", "Income Tax Act Sec 80G(5)(d)"
}

export interface RoleSOPStep {
  stepNumber: number;
  title: LocalizedString;
  description: LocalizedString;
  actionRequired?: LocalizedString;
  highlightedTerms?: string[]; // Keys of ShastricTerm for automatic inline popover
  complianceTag?: string; // e.g. "CBDT Rule 18AB", "Dharmashastra Vivah Niyama"
}

export interface ModuleRoleSOP {
  moduleId: string; // e.g., 'SMART_BHANDAR', 'FORM_10BD', etc.
  moduleName: LocalizedString;
  role: string; // 'TRUSTEE' | 'ACCOUNTANT' | 'SEVADAR' | 'PUROHIT' | 'DEVOTEE' | 'MANAGER'
  roleLabel: LocalizedString;
  roleSummary: LocalizedString;
  steps: RoleSOPStep[];
  checklistItems: LocalizedString[];
}

// ============================================================================
// CORE TERMINOLOGY LEXICON (Quadrilingual: EN, HI, BN, SA)
// ============================================================================

