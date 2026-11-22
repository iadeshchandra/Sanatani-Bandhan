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
  /**
   * EVENTS E4 — "Lessons for next year": the committee's own words
   * from this festival's debrief. Written in the War Room debrief
   * (or the Festivals tab), stored on the record inside the
   * utsav_stores doc, and CARRIED by clone-last-year so next year's
   * record opens with them pre-filled.
   */
  lessons?: string;
  /**
   * EVENTS E6 — the sponsors & stalls register and the seva
   * departments, all OPTIONAL fields on this record (inside the
   * existing utsav_stores doc — no new collection, no rules
   * change; the doc's staff whole-write carries them). Clone law:
   * sponsors and stalls are per-year commercial state and are
   * STRIPPED by clone-last-year (like vendors); departments are
   * structure and CARRY (names + targets only — leads and
   * volunteer names are re-formed each year).
   */
  sponsors?: FestivalSponsor[];
  stalls?: FestivalStall[];
  departments?: SevaDepartment[];
}

/* ------------------------------------------------------------------ */
/* EVENTS E6 — sponsors, stalls, seva departments                      */
/* ------------------------------------------------------------------ */

export type SponsorKind = 'cash' | 'kind' | 'seva';

/**
 * One sponsor of the festival. Money fields (pledged / received)
 * mean something only for kind 'cash' — a sponsor who gives goods
 * ('kind') or their own labour ('seva') is honoured in the register
 * without a rupee figure ever being invented for them.
 */
export interface FestivalSponsor {
  id: string;
  name: string;
  contact?: string;
  kind: SponsorKind;
  /** Promised amount (cash kind only; 0 otherwise). */
  pledged: number;
  /** Amount actually received so far (cash kind only). */
  received: number;
  /** The real treasury transaction id, stamped when "mark
   *  received" posts the outstanding amount (the L7 honesty
   *  pattern — a row claims treasury posting only with its id). */
  linkedTxId?: string;
  /** Explicit consent: may the festival page thank them by name?
   *  Default false — nobody is thanked publicly unasked. */
  publicAck: boolean;
  note?: string;
}

export type StallKind = 'prasad' | 'food' | 'books' | 'flowers' | 'other';

/** One allotted stall: who holds it, what it sells, its fee. */
export interface FestivalStall {
  id: string;
  holder: string;
  kind: StallKind;
  fee: number;
  received: number;
  /** Real treasury tx id once the outstanding fee is posted. */
  linkedTxId?: string;
  zone?: string;
  note?: string;
}

/**
 * One seva department (the ISKCON festival taxonomy): a named
 * team with a lead and a volunteer target. volunteerNames is the
 * committee's own list of who has offered — planning data on this
 * record, never a public artefact.
 */
export interface SevaDepartment {
  id: string;
  name: string;
  leadName?: string;
  targetVolunteers: number;
  volunteerNames?: string[];
  note?: string;
}

/** The preset taxonomy a department board is seeded from. */
export const DEPARTMENT_PRESETS: ReadonlyArray<{ name: string; targetVolunteers: number }> = [
  { name: 'Kitchen & Prasadam', targetVolunteers: 12 },
  { name: 'Darshan & Crowd', targetVolunteers: 20 },
  { name: 'Decoration', targetVolunteers: 8 },
  { name: 'Sound & Stage', targetVolunteers: 4 },
  { name: 'Transport', targetVolunteers: 6 },
  { name: 'Medical & Safety', targetVolunteers: 6 },
  { name: 'Media', targetVolunteers: 4 },
  { name: 'Accommodation', targetVolunteers: 6 },
  { name: 'Cleanliness', targetVolunteers: 10 },
  { name: 'Cultural Programme', targetVolunteers: 8 },
];

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
