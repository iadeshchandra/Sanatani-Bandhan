/* ------------------------------------------------------------------ */
/* Goshala One — domain types. Offline-first; every record is          */
/* per-workspace and device-local (LocalOnlyBadge), except money that  */
/* also posts to treasury (cloud-synced financial record).             */
/* Sanatani terms: Nandi (नन्दी, cattle), Vatsa (वत्स, calf),           */
/* Gau Mata (गौ माता).                                                 */
/* ------------------------------------------------------------------ */

export type NandiSex = 'cow' | 'bull' | 'vatsa';
export type NandiSource = 'rescued' | 'donated' | 'born' | 'purchased';
export type NandiStatus =
  | 'milking' | 'dry' | 'pregnant' | 'sick' | 'retired' | 'vatsa' | 'quarantine';

export interface Nandi {
  id: string;
  name: string;
  /** Ear-tag / QR id, e.g. GM-0042 */
  tagId: string;
  breed: string;
  sex: NandiSex;
  ageYears: number;
  source: NandiSource;
  status: NandiStatus;
  motherId?: string;
  notes?: string;
  addedDate: string; // ISO date
}

export type HealthKind = 'vaccination' | 'deworming' | 'treatment' | 'checkup';

export interface HealthRecord {
  id: string;
  nandiId: string;
  date: string; // ISO date
  kind: HealthKind;
  title: string;
  details?: string;
  vetName?: string;
  cost: number;
  /** ISO date of the next due dose / follow-up, for reminders */
  nextDue?: string;
  notes?: string;
}

export type MilkSession = 'morning' | 'evening';

export interface MilkRecord {
  id: string;
  nandiId: string;
  date: string; // ISO date
  session: MilkSession;
  liters: number;
}

export type DisposalKind = 'sold' | 'distributed' | 'donated' | 'consumed';

export interface MilkDisposal {
  id: string;
  date: string;
  liters: number;
  kind: DisposalKind;
  amount: number; // ₹ received (0 for donated/distributed)
  party?: string;
}

export type FodderKind = 'green' | 'dry' | 'concentrate' | 'mineral';

export interface FodderItem {
  id: string;
  name: string;
  kind: FodderKind;
  unit: string; // kg / quintal / bag
  stockQty: number;
  ratePerUnit: number; // ₹
  reorderLevel: number;
}

export interface FodderConsumption {
  id: string;
  date: string; // ISO date
  itemId: string;
  qty: number;
}

export type SponsorPlan = 'monthly' | 'quarterly' | 'yearly' | 'one-time';
export type SponsorStatus = 'active' | 'expiring' | 'expired';

export interface Sponsorship {
  id: string;
  /** empty = general Gau Seva sponsorship (not tied to one animal) */
  nandiId?: string;
  sponsorName: string;
  phone?: string;
  gotra?: string;
  plan: SponsorPlan;
  amount: number; // ₹ per plan period (or total for one-time)
  startDate: string;
  endDate: string;
  status: SponsorStatus;
  receiptNo?: string;
  treasuryTxId?: string;
}

export type DutyShift = 'morning' | 'evening';
export type DutyKind = 'feeding' | 'cleaning' | 'milking' | 'vet-assist' | 'security';

export interface DutySlot {
  id: string;
  date: string; // ISO date
  shift: DutyShift;
  duty: DutyKind;
  assignee: string;
  phone?: string;
}

export type GrantStatus = 'applied' | 'approved' | 'received' | 'pending' | 'rejected';

export interface GrantRecord {
  id: string;
  scheme: string;
  authority: string;
  appliedDate: string;
  status: GrantStatus;
  amountApplied: number;
  amountReceived: number;
  notes?: string;
}

export type ExpenseHead = 'feed' | 'vet' | 'staff' | 'maintenance' | 'other';

export interface GoshalaExpense {
  id: string;
  date: string; // ISO date
  head: ExpenseHead;
  amount: number;
  paidTo?: string;
  paymentMode: string;
  treasuryTxId?: string;
  notes?: string;
}

export interface GoshalaSettings {
  /** Govt grant assumption, ₹/animal/day (research: ~₹50) */
  grantPerDay: number;
  /** Estimated real upkeep, ₹/animal/day (research: ₹100–150) */
  estCostPerDay: number;
}

export interface GoshalaState {
  nandis: Nandi[];
  health: HealthRecord[];
  milk: MilkRecord[];
  disposals: MilkDisposal[];
  fodderItems: FodderItem[];
  fodderUse: FodderConsumption[];
  sponsorships: Sponsorship[];
  duties: DutySlot[];
  grants: GrantRecord[];
  expenses: GoshalaExpense[];
  settings: GoshalaSettings;
}
