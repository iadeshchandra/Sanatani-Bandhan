/* Nyas One — Trust/NGO compliance & governance types.
 *
 * Offline-first: compliance records are device-local (own store, never
 * DataContext). Treasury is READ (income base for the 85% tracker, donor
 * totals for 10BE export) but never written by this suite.
 *
 * HONESTY RULE: this suite tracks and reminds. It does not file with any
 * government authority and does not give legal or tax advice.
 */

export type RegKind =
  | '12A' | '80G' | 'FCRA' | 'CSR-1' | 'Darpan' | 'PAN' | 'TAN' | 'GST' | 'other';

export const REG_KINDS: Array<{ id: RegKind; en: string; bn: string; hi: string }> = [
  { id: '12A', en: '12A — Income-tax exemption', bn: '১২এ — আয়কর ছাড়', hi: '12A — आयकर छूट' },
  { id: '80G', en: '80G — Donor deduction', bn: '৮০জি — দাতার ছাড়', hi: '80G — दाता छूट' },
  { id: 'FCRA', en: 'FCRA — Foreign contributions', bn: 'এফসিআরএ — বিদেশি অনুদান', hi: 'FCRA — विदेशी अनुदान' },
  { id: 'CSR-1', en: 'CSR-1 — CSR funding eligibility', bn: 'সিএসআর-১', hi: 'CSR-1' },
  { id: 'Darpan', en: 'NITI Aayog Darpan', bn: 'নীতি আয়োগ দর্পণ', hi: 'नीति आयोग दर्पण' },
  { id: 'PAN', en: 'PAN of the trust', bn: 'ট্রাস্টের প্যান', hi: 'ट्रस्ट का पैन' },
  { id: 'TAN', en: 'TAN — TDS account', bn: 'ট্যান', hi: 'टैन' },
  { id: 'GST', en: 'GST registration', bn: 'জিএসটি নিবন্ধন', hi: 'जीएसटी पंजीकरण' },
  { id: 'other', en: 'Other registration', bn: 'অন্যান্য নিবন্ধন', hi: 'अन्य पंजीकरण' },
];

export interface Registration {
  id: string;
  kind: RegKind;
  customName?: string;
  /** Registration / certificate number. */
  regNo: string;
  validFrom: string; // yyyy-mm-dd
  /** Empty = perpetual / lifetime validity. */
  validTo?: string; // yyyy-mm-dd
  issuingAuthority?: string;
  docRef?: string;
  notes?: string;
}

export type ComplianceKind =
  | 'ITR-7' | '10BD' | '10BE' | 'Audit' | 'FCRA Return' | 'Board Meeting' | 'other';

export const COMPLIANCE_KINDS: Array<{ id: ComplianceKind; en: string; bn: string; hi: string }> = [
  { id: 'ITR-7', en: 'ITR-7 — Income-tax return', bn: 'আইটিআর-৭', hi: 'ITR-7' },
  { id: '10BD', en: '10BD — Donation statement (filed)', bn: '১০বিডি', hi: '10BD' },
  { id: '10BE', en: '10BE — Donor certificates issued', bn: '১০বিই', hi: '10BE' },
  { id: 'Audit', en: 'Statutory audit', bn: 'বিধিবদ্ধ অডিট', hi: 'वैधानिक ऑडिट' },
  { id: 'FCRA Return', en: 'FCRA annual return', bn: 'এফসিআরএ বার্ষিক রিটার্ন', hi: 'FCRA वार्षिक रिटर्न' },
  { id: 'Board Meeting', en: 'Board / trustee meeting', bn: 'বোর্ড সভা', hi: 'बोर्ड बैठक' },
  { id: 'other', en: 'Other compliance', bn: 'অন্যান্য', hi: 'अन्य' },
];

export interface ComplianceItem {
  id: string;
  kind: ComplianceKind;
  customName?: string;
  /** Indian financial year, e.g. '2026-27'. */
  fy: string;
  dueDate: string; // yyyy-mm-dd
  owner?: string;
  status: 'pending' | 'done' | 'overdue';
  completedAt?: string;
  notes?: string;
}

/** Money the CA confirms as applied for charitable purposes (85% rule). */
export interface ApplicationEntry {
  id: string;
  fy: string;
  date: string; // yyyy-mm-dd
  amount: number;
  purpose: string;
  reference?: string;
}

/** Document metadata — the files themselves stay where the trust keeps them. */
export interface VaultDoc {
  id: string;
  name: string;
  docType: 'Registration Certificate' | 'Audit Report' | 'Board Resolution' | 'ITR / Filing' | 'Other';
  fy?: string;
  /** Honest device-local: where the physical/file copy actually lives. */
  storedWhere: string;
  addedAt: string;
  notes?: string;
}

export interface Resolution {
  id: string;
  no: string;
  text: string;
  passed: boolean;
}

export interface Meeting {
  id: string;
  date: string; // yyyy-mm-dd
  title: string;
  agenda: string[];
  attendees: string[];
  minutes?: string;
  status: 'scheduled' | 'held' | 'cancelled';
  resolutions: Resolution[];
}

export interface NyasSettings {
  trustName: string;
}

export interface NyasState {
  registrations: Registration[];
  compliance: ComplianceItem[];
  applications: ApplicationEntry[];
  vault: VaultDoc[];
  meetings: Meeting[];
  settings: NyasSettings;
}
