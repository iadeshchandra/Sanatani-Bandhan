/* Sabha One — types for the Purohit Sabha association management suite.
 *
 * This is the ASSOCIATION'S tool (membership, dues, welfare fund,
 * training, duty roster, meetings, notices). Individual purohit
 * profiles, bookings and ratings stay in Purohit One — no duplication,
 * no cross-writes. The verification tier shown here is display-only.
 */

export type Specialization =
  | 'vivah' | 'griha-pravesh' | 'shraddha' | 'navagraha'
  | 'rudrabhishek' | 'havan' | 'katha' | 'vastu' | 'samskara' | 'other';

/** Display-only mirror of Purohit One's four verification tiers. Never written here. */
export type VerificationTier = 'unverified' | 'bronze' | 'silver' | 'gold';

export interface Member {
  id: string;
  name: string;
  phone?: string;
  specializations: Specialization[];
  experienceYears?: number;
  verificationTier: VerificationTier;   // display-only; managed in Purohit One
  joinDate: string;                     // yyyy-mm-dd
  active: boolean;
  notes?: string;
  createdAt: number;
}

export interface DuesEntry {
  id: string;
  memberId: string;
  year: number;                         // FY year, e.g. 2026
  amount: number;
  date: string;                         // yyyy-mm-dd
  receiptNo: string;                    // SB-DUES-YYYY-NNNN
  treasuryTxId?: string;                // set once posted
  createdAt: number;
}

export type WelfareKind = 'contribution' | 'disbursement';

export interface WelfareEntry {
  id: string;
  date: string;                         // yyyy-mm-dd
  kind: WelfareKind;
  memberId?: string;                    // contributor or beneficiary
  amount: number;
  purpose?: string;                     // e.g. "Medical emergency — approved in meeting #12"
  approvedBy?: string;
  treasuryTxId?: string;
  createdAt: number;
}

export interface Training {
  id: string;
  title: string;                        // e.g. "Karmakanda refresher — Vivah paddhati"
  date: string;                         // yyyy-mm-dd
  venue?: string;
  trainer?: string;
  attendeeIds: string[];                // member ids
  certificatesIssued: string[];         // member ids who received certificates
  notes?: string;
  createdAt: number;
}

export type DutyStatus = 'assigned' | 'confirmed' | 'completed' | 'cancelled';

export interface DutyAssignment {
  id: string;
  festival: string;                     // e.g. "Navratri — Durga Puja"
  mandir?: string;                      // member mandir name
  date: string;                         // yyyy-mm-dd
  slot?: string;                        // e.g. "Morning", "Evening"
  memberId: string;
  status: DutyStatus;
  notes?: string;
  createdAt: number;
}

export interface Meeting {
  id: string;
  date: string;                         // yyyy-mm-dd
  agenda: string;
  attendeeIds: string[];
  minutes?: string;
  resolution?: string;                  // resolution text, if any passed
  resolutionNo?: string;                // RES-0001… auto-numbered
  createdAt: number;
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  postedAt: number;
  pinned: boolean;
}

export interface SabhaSettings {
  sabhaName: string;
  annualDues: number;
  duesReceiptSeq: number;
  resolutionSeq: number;
}

export interface SabhaState {
  members: Member[];
  dues: DuesEntry[];
  welfare: WelfareEntry[];
  trainings: Training[];
  duties: DutyAssignment[];
  meetings: Meeting[];
  notices: Notice[];
  settings: SabhaSettings;
}

export const SPECIALIZATIONS: Specialization[] = [
  'vivah', 'griha-pravesh', 'shraddha', 'navagraha', 'rudrabhishek',
  'havan', 'katha', 'vastu', 'samskara', 'other',
];

export const SPEC_LABEL: Record<Specialization, string> = {
  'vivah': 'Vivah',
  'griha-pravesh': 'Griha Pravesh',
  'shraddha': 'Shraddha',
  'navagraha': 'Navagraha',
  'rudrabhishek': 'Rudrabhishek',
  'havan': 'Havan',
  'katha': 'Katha',
  'vastu': 'Vastu',
  'samskara': 'Samskara',
  'other': 'Other',
};

export const TIER_LABEL: Record<VerificationTier, string> = {
  unverified: 'Unverified',
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
};
