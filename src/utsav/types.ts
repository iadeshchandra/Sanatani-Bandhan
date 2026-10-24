/* Utsav One — Mahotsav Samiti festival management types.
 *
 * Offline-first: festival records are device-local (own store, never
 * DataContext). Only treasury postings (festival income / expenses /
 * vendor payments) go to the cloud ledger.
 *
 * HONESTY RULE: planned-vs-actual is a management view, not audited
 * accounts. The utilisation certificate is the samiti's own summary for
 * donors/sponsors — confirm final figures with the koshadhyaksh / CA.
 */

export type FestivalStatus = 'planned' | 'ongoing' | 'completed' | 'cancelled';

export interface Festival {
  id: string;
  name: string;            // "Sharadiya Durga Puja 2026"
  deity: string;           // "Maa Durga"
  occasion: string;        // "Sharadiya Navratri"
  startDate: string;       // yyyy-mm-dd
  endDate: string;         // yyyy-mm-dd
  venue: string;
  expectedFootfall: number;
  status: FestivalStatus;
  notes?: string;
}

export type BudgetKind = 'income' | 'expense';

export const INCOME_HEADS = [
  'Donations', 'Sponsorships', 'Stall fees', 'Prasad sales', 'Cultural tickets', 'Other income',
] as const;

export const EXPENSE_HEADS = [
  'Pandal & decoration', 'Prasad & bhandara', 'Sound & light', 'Security', 'Artists & honorarium',
  'Flowers & puja samagri', 'Printing & publicity', 'Water & sanitation', 'Medical', 'Other expense',
] as const;

export interface BudgetLine {
  id: string;
  festivalId: string;
  kind: BudgetKind;
  head: string;
  planned: number;
  actual: number;
  /** Set once the actual amount is posted to treasury. */
  treasuryTxId?: string;
  notes?: string;
}

export const COMMITTEE_ROLES = [
  'Adhyaksh (President)', 'Upadhyaksh (Vice-President)', 'Mantri (Secretary)',
  'Koshadhyaksh (Treasurer)', 'Sanyojak (Coordinator)', 'Sevadar', 'Volunteer', 'Advisor',
] as const;

export interface CommitteeMember {
  id: string;
  festivalId: string;
  name: string;
  phone?: string;
  role: string;
  responsibilities?: string;
}

export type TaskStatus = 'todo' | 'doing' | 'done';

export interface Task {
  id: string;
  festivalId: string;
  title: string;
  assignedTo?: string;
  dueDate?: string; // yyyy-mm-dd
  status: TaskStatus;
  notes?: string;
}

export const VENDOR_CATEGORIES = [
  'Pandal', 'Catering', 'Sound & Light', 'Security', 'Flowers', 'Artists', 'Printing', 'Transport', 'Other',
] as const;

export type VendorStatus = 'quoted' | 'booked' | 'paid' | 'cancelled';

export interface Vendor {
  id: string;
  festivalId: string;
  category: string;
  name: string;
  phone?: string;
  quote: number;
  advance: number;
  /** Total paid so far (advance + subsequent payments). */
  paid: number;
  status: VendorStatus;
  treasuryTxId?: string;
  notes?: string;
}

export const PROGRAM_KINDS = [
  'Aarti', 'Kirtan / Bhajan', 'Pravachan', 'Cultural program', 'Prasad distribution',
  'Shobha Yatra', 'Havan', 'Other',
] as const;

export interface ProgramSlot {
  id: string;
  festivalId: string;
  date: string;      // yyyy-mm-dd
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  title: string;
  kind: string;
  lead?: string;
  venue?: string;
  notes?: string;
}

export const SAFETY_CATEGORIES = [
  'Crowd control', 'Medical', 'Water', 'Fire safety', 'Volunteers', 'Police liaison', 'Lost & found', 'Other',
] as const;

export interface SafetyItem {
  id: string;
  festivalId: string;
  item: string;
  category: string;
  done: boolean;
  owner?: string;
  notes?: string;
}

export interface CheckinCount {
  id: string;
  festivalId: string;
  date: string; // yyyy-mm-dd
  gate: string;
  count: number;
  recordedAt: string; // ISO
}

export interface UtsavSettings {
  samitiName: string;
}

export interface UtsavState {
  festivals: Festival[];
  budget: BudgetLine[];
  members: CommitteeMember[];
  tasks: Task[];
  vendors: Vendor[];
  program: ProgramSlot[];
  safety: SafetyItem[];
  checkins: CheckinCount[];
  settings: UtsavSettings;
  /**
   * Utilisation-certificate numbers ever issued on this device
   * (monotonic — a UC number is never reused, even after the festival
   * it belonged to is deleted). See utsavStore.nextUCNo / takeUCNo.
   */
  ucSeq: number;
}
