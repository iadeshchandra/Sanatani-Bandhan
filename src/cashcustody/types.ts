/**
 * Mandir Cash Custody — Hundi-to-Bank Chain of Custody types.
 * ============================================================================
 * The June–July 2026 Ram Mandir scandal (donation-box keys with unauthorised
 * persons, no frisking enforcement, 23 counting-staff resignations, CCTV kept
 * 45 days vs mandated 180) proved cash donations run on trust and paper. This
 * suite is the missing SOP: dual-custody box openings, maker-checker counting,
 * SHA-256 hash-chained custody events, bank deposit slips, and staff rosters.
 *
 * OFFLINE-FIRST: custody records live on this device (own store file).
 * Only treasury postings travel to the cloud.
 *
 * 80G HONESTY: hundi cash is anonymous — no donor identity, so no 80G receipt
 * can ever be issued for it. Cash donations above ₹2,000 also kill the 80G
 * deduction by law. The UI warns; it never promises.
 */

export type BoxStatus = 'sealed' | 'open' | 'counting' | 'closed';

/** A physical donation box / hundi. */
export interface HundiBox {
  id: string;
  /** e.g. HND-001 */
  boxCode: string;
  name: string;
  /** sanctum | gate | annakshetra | corridor | office | other */
  location: string;
  sealNumber: string;
  custodian1: string;
  custodian2: string;
  status: BoxStatus;
  lastOpenedAt?: number;
  lastOpenedBy?: string;
  notes?: string;
  createdAt: number;
}

/** Custody events, hash-chained (SHA-256, prev-hash linked). */
export type CustodyEventKind =
  | 'box_registered'
  | 'box_opened'
  | 'count_started'
  | 'count_verified'
  | 'session_closed'
  | 'deposit_created'
  | 'deposit_confirmed'
  | 'seal_changed'
  | 'staff_checkin'
  | 'staff_checkout';

export interface CustodyEvent {
  id: string;
  ts: number;
  /** Monotonic append-order sequence — the chain's canonical order.
   *  Timestamps alone are not enough: two events can share a millisecond. */
  seq: number;
  kind: CustodyEventKind;
  actor: string;
  details: string;
  prevHash: string;
  hash: string;
}

/** Denomination keys, high → low. */
export const DENOMINATIONS = [
  '2000', '500', '200', '100', '50', '20', '10', '5', 'coins',
] as const;
export type DenomKey = (typeof DENOMINATIONS)[number];

export const DENOM_LABEL: Record<DenomKey, string> = {
  '2000': '₹2,000', '500': '₹500', '200': '₹200', '100': '₹100',
  '50': '₹50', '20': '₹20', '10': '₹10', '5': '₹5', 'coins': 'Coins',
};

/** Numeric value per key (coins counted as a lump sum). */
export const DENOM_VALUE: Record<DenomKey, number> = {
  '2000': 2000, '500': 500, '200': 200, '100': 100,
  '50': 50, '20': 20, '10': 10, '5': 5, 'coins': 1,
};

export type SessionStatus = 'open' | 'counting' | 'verified' | 'closed';

/** One box-opening + counting session. */
export interface CountingSession {
  id: string;
  boxId: string;
  openedAt: number;
  /** Dual custody: both must confirm. */
  openedBy1: string;
  openedBy2: string;
  sealNumberVerified: string;
  photoNote?: string;
  status: SessionStatus;
  /** Maker's denomination counts (piece counts, except coins = ₹ value). */
  makerCounts: Record<DenomKey, number>;
  makerName: string;
  /** Checker's independent counts. */
  checkerCounts?: Record<DenomKey, number>;
  checkerName?: string;
  discrepancyNote?: string;
  discrepancyResolved: boolean;
  total: number;
  closedAt?: number;
  depositId?: string;
  treasuryTxId?: string;
  createdAt: number;
}

export type DepositStatus = 'pending' | 'deposited';

/** Bank deposit slip auto-generated from a closed session. */
export interface DepositSlip {
  id: string;
  /** SB-DPST-2026-0001 */
  slipNo: string;
  sessionId: string;
  boxId: string;
  amount: number;
  denominationMix: Record<DenomKey, number>;
  countedBy: string;
  verifiedBy: string;
  createdAt: number;
  depositDate: string;
  bankName?: string;
  bankBranch?: string;
  status: DepositStatus;
  depositedAt?: number;
  treasuryTxId?: string;
}

export type StaffRole = 'counter' | 'checker' | 'supervisor';

/** Counting-staff roster (addresses churn/accountability). */
export interface CountingStaff {
  id: string;
  name: string;
  phone?: string;
  role: StaffRole;
  idProofRef?: string;
  active: boolean;
  joinedDate: string;
  notes?: string;
}

export interface StaffAttendance {
  id: string;
  staffId: string;
  date: string;
  sessionId?: string;
  present: boolean;
  checkInTs?: number;
  checkOutTs?: number;
}

export interface CustodySettings {
  /** Running counter for SB-DPST slip numbers (per year). */
  slipSeq: Record<string, number>;
  defaultBankName: string;
  defaultBankBranch: string;
}

export interface CashCustodyState {
  boxes: HundiBox[];
  sessions: CountingSession[];
  events: CustodyEvent[];
  deposits: DepositSlip[];
  staff: CountingStaff[];
  attendance: StaffAttendance[];
  settings: CustodySettings;
}
