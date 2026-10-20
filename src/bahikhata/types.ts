/* ------------------------------------------------------------------ */
/* Bahi-Khata Seva — paper-register digitization (Phase 1).             */
/*                                                                     */
/* Iron laws (owner, 2026-10-20):                                      */
/*  1. EVERYTHING lands in a review batch first — nothing an entrant   */
/*     types becomes a real record until an approver commits it.       */
/*  2. Commit runs under the APPROVER's own session/role, so the       */
/*     existing Firestore rules stay the enforcement. Zero new         */
/*     collections, zero rules changes — batches are device-local.     */
/*  3. Opening snapshot over history: today's herd/members + ONE       */
/*     verified opening-balance line per fund + lifetime giving on     */
/*     the person. Old register lines are never recreated, and no      */
/*     80G receipt number is ever invented for paper history.          */
/*  4. Imported members receive NO live PIN from a paper name alone.   */
/* ------------------------------------------------------------------ */

export type BahiTarget = 'herd' | 'members' | 'donors';
export type BatchSource = 'register' | 'csv' | 'photo';
export type BatchState =
  | 'draft' | 'pending' | 'approved' | 'rejected' | 'committed' | 'undone';
export type RowState = 'ok' | 'duplicate' | 'needs_fix' | 'excluded';

export interface BatchActor {
  uid: string;
  name: string;
  role: string;
}

/** Approver-only: one opening-balance line per fund, written at commit
 *  ONLY when `verified` is ticked ("I have verified this against the
 *  paper book"). The tick is what makes the line audit-verified. */
export interface OpeningBalanceInput {
  amount: number;
  fundLabel: string;
  asOfDate: string; // ISO yyyy-mm-dd
  verified: boolean;
}

/** One OCR-read field of a scanned row (Phase 2). Fractions are
 *  relative to the page photo (0..1) so the review screen can draw the
 *  highlight box over any rendering of the page. */
export interface ScanCellBox { x0: number; y0: number; x1: number; y1: number }

export interface ScanCell {
  /** The text the machine read, before any human correction. */
  text: string;
  /** 0..100 — blended OCR confidence (see scan/cellConfidence.ts). */
  confidence: number;
  cls: 'green' | 'amber' | 'red';
  /** Why this colour, in plain words (EN — the review translates the
   *  stable reason keys; free-text reasons stay as written). */
  reasons: string[];
  /** Where on the page photo this cell was read from. */
  bbox?: ScanCellBox;
  /** A human has looked at this cell and vouched for its value. Red
   *  cells must be confirmed before the row can commit. */
  confirmed?: boolean;
  /** Dictionary proposal awaiting one tap (closed vocabularies only). */
  proposal?: string;
  /** On-device AI (WebLLM) proposal awaiting the reviewer's tap —
   *  rendered diff-style beside `proposal`; never auto-applied. */
  llmProposal?: string;
  /** A human touched this cell (confirmed / corrected / accepted a
   *  proposal). Feeds the verification report's honest accuracy
   *  numbers: auto-green vs human-touched. */
  touched?: boolean;
}

export interface ImportRow {
  rowId: string;
  /** Register page this row was read from (1-based). */
  pageNo: number;
  /** Exactly as typed / as read from the CSV file. */
  raw: Record<string, string>;
  /** Normalized, app-shaped values (see normalize.ts / dedupe.ts). */
  mapped: Record<string, any>;
  state: RowState;
  /** Human-readable notes for the reviewer (warm, specific). */
  issues: string[];
  /** Fields the system filled in — disclosed in review, never silent. */
  defaultedFields: string[];
  /** Per-row approval. Defaults true when state is 'ok'. */
  approved: boolean;
  /** Phase 2: per-field OCR provenance for scanned rows. Absent for
   *  typed/CSV rows. */
  cells?: Record<string, ScanCell>;
}

export interface BatchCommitSummary {
  added: number;
  skippedDuplicates: number;
  treasuryLines: number;
  openingBalanceWritten: boolean;
  at: number;
}

/* --------------------- commit manifest & undo ----------------------- */
/* Phase 2 trust system: every commit records EXACTLY what it wrote,   */
/* so a mistaken batch can be undone precisely — herd/member rows are  */
/* removed by id, money is corrected by a visible compensating entry   */
/* (the treasury ledger is append-only and never lies by erasure).     */

export interface ManifestDevoteeChange {
  devoteeId: string;
  /** totalDonated before this batch touched the person. */
  beforeTotalDonated: number;
  /** totalDonated after the batch's writes settled. */
  afterTotalDonated: number;
}

export interface ManifestDonationLine {
  amount: number;
  date: string;
  devoteeId?: string;
  devoteeName: string;
  referenceNo?: string;
}

export interface CommitManifest {
  batchId: string;
  committedAt: number;
  committedBy: BatchActor;
  /** Herd rows created (goshalaStore ids). */
  createdNandiIds: string[];
  /** Devotee records created (members + donor persons). */
  createdDevoteeIds: string[];
  /** Creates whose id the write path did not return (defensive — the
   *  undo guard resolves these by name+phone against live records). */
  createdUnresolved?: { fullName: string; phone?: string }[];
  /** Pre-existing people whose lifetime giving this batch raised. */
  devoteeChanges: ManifestDevoteeChange[];
  /** Treasury gift lines written (reversed by counter-entry on undo). */
  donationLines: ManifestDonationLine[];
  /** The opening-balance line, when the approver verified one. */
  openingBalance?: { amount: number; date: string; fundLabel: string };
}

/* ---------------------- verification report ------------------------- */

export interface SpotCheck {
  rowId: string;
  pageNo: number;
  /** The trustee has compared this row against the paper photo. */
  ok: boolean;
}

export interface BatchVerification {
  sealedBy: BatchActor;
  sealedAt: number;
  spotChecks: SpotCheck[];
  /** Keyed page totals matched the approved rows' sums. */
  totalsMatch: boolean;
  /** Pages whose keyed total disagrees — shown, never hidden. */
  mismatchedPages: number[];
}

export interface ImportBatch {
  id: string;
  workspaceId: string;
  target: BahiTarget;
  source: BatchSource;
  /** Provenance, e.g. "Gai khata vol. 3 — pages 12–15". Editable. */
  label: string;
  state: BatchState;
  enteredBy: BatchActor;
  createdAt: number;
  updatedAt: number;
  submittedAt?: number;
  reviewedBy?: BatchActor;
  reviewedAt?: number;
  rejectReason?: string;
  /** The register page currently being entered. */
  currentPage: number;
  /** File Vault refs of photographed register pages — the paper itself,
   *  beside the rows, so review disputes end at the evidence. */
  pagePhotoRefs: { pageNo: number; ref: string; fileName?: string }[];
  openingBalance?: OpeningBalanceInput;
  rows: ImportRow[];
  commitSummary?: BatchCommitSummary;
  /* ---- Phase 2 (scan) ---- */
  /** Register profile used to read this batch's pages, if any. */
  profileId?: string;
  /** Donation total the entrant keyed from each page's own footer —
   *  the double-key control the verification report checks against. */
  pageTotals?: Record<number, number>;
  /** What the commit wrote (Phase 2 trust system — enables undo). */
  manifest?: CommitManifest;
  /** The closing verification report, sealed by the approver. */
  verification?: BatchVerification;
  undoneBy?: BatchActor;
  undoneAt?: number;
}

/* ----------------------- register profiles -------------------------- */
/* Phase 2 layout learning: a register's columns are mapped ONCE from  */
/* page 1 and reused for every later page of the same book. Profiles   */
/* live in the same device-local store as the batches.                  */

export type ScanScript = 'ben' | 'hin' | 'eng' | 'mixed';

export interface ColumnRegion {
  /** App field key from TARGET_FIELDS; '' while unmapped. */
  field: string;
  /** Fractions of page width. */
  x0: number;
  x1: number;
}

export interface RegisterProfile {
  id: string;
  workspaceId: string;
  target: BahiTarget;
  /** Entrant-given name: "Gai khata — old book". */
  label: string;
  script: ScanScript;
  columns: ColumnRegion[];
  /** Fraction of page height occupied by the header (skipped). */
  headerRowSkip: number;
  writerStyle: 'print' | 'neat-hand' | 'mixed-hand';
  createdAt: number;
  updatedAt: number;
  /** Learning: per-field accept counters from reviewer outcomes. */
  fieldStats: Record<string, { seen: number; accepted: number }>;
  /** Recurring raw→fixed pairs for closed vocabularies, per field. */
  learnedPairs: Record<string, Record<string, string>>;
}

export interface BahiKhataData {
  batches: ImportBatch[];
  /** Remembered CSV column mappings per target: appField ← csvHeader. */
  columnMaps: Partial<Record<BahiTarget, Record<string, string>>>;
  /** Phase 2: learned register layouts per workspace. */
  registerProfiles: RegisterProfile[];
}

/* ------------------------- field descriptors ------------------------ */

export type FieldKind =
  | 'text' | 'number' | 'phone' | 'amount' | 'enum' | 'picklist' | 'date' | 'year';

export interface FieldOption {
  value: string;
  en: string;
  bn: string;
  hi: string;
}

export interface FieldDef {
  key: string;
  kind: FieldKind;
  required?: boolean;
  /** Stays filled from the last row until changed (a paper page is 20
   *  rows of near-identical context with one varying name). */
  persistent?: boolean;
  options?: FieldOption[];
  /** Workspace-fed pick-list source for kind 'picklist'. */
  picklistFrom?: 'breeds' | 'gotras';
}

const SEX_OPTIONS: FieldOption[] = [
  { value: 'cow', en: '🐄 Gai (cow)', bn: '🐄 গাই', hi: '🐄 गाय' },
  { value: 'bull', en: '🐂 Shar (bull)', bn: '🐂 ষাঁড়', hi: '🐂 साँड़' },
  { value: 'vatsa', en: '🐮 Bachhda (calf)', bn: '🐮 বাছুর', hi: '🐮 बछड़ा' },
];

const SOURCE_OPTIONS: FieldOption[] = [
  { value: 'donated', en: '🎁 Donated', bn: '🎁 দান', hi: '🎁 दान' },
  { value: 'rescued', en: '🛟 Rescued', bn: '🛟 উদ্ধার', hi: '🛟 बचाई गई' },
  { value: 'born', en: '🌱 Born here', bn: '🌱 এখানে জন্ম', hi: '🌱 यहीं जन्मी' },
  { value: 'purchased', en: '🛒 Purchased', bn: '🛒 কেনা', hi: '🛒 खरीदी' },
];

const TIER_OPTIONS: FieldOption[] = [
  { value: 'Sadharan', en: 'Sadharan', bn: 'সাধারণ', hi: 'साधारण' },
  { value: 'Karmi', en: 'Karmi', bn: 'কর্মী', hi: 'कर्मी' },
  { value: 'Vishesh', en: 'Vishesh', bn: 'বিশেষ', hi: 'विशेष' },
  { value: 'Ratna', en: 'Ratna', bn: 'রত্ন', hi: 'रत्न' },
];

const PAYMODE_OPTIONS: FieldOption[] = [
  { value: 'Cash', en: 'Cash', bn: 'নগদ', hi: 'नकद' },
  { value: 'UPI / QR', en: 'UPI / QR', bn: 'UPI / QR', hi: 'UPI / QR' },
  { value: 'Bank Transfer', en: 'Bank Transfer', bn: 'ব্যাংক', hi: 'बैंक' },
  { value: 'Cheque', en: 'Cheque', bn: 'চেক', hi: 'चेक' },
  { value: 'Card', en: 'Card', bn: 'কার্ড', hi: 'कार्ड' },
];

/** Register order mirrors the paper page: name first, context after. */
export const TARGET_FIELDS: Record<BahiTarget, FieldDef[]> = {
  herd: [
    { key: 'name', kind: 'text', required: true },
    { key: 'tagId', kind: 'text' },
    { key: 'breed', kind: 'picklist', picklistFrom: 'breeds', persistent: true },
    { key: 'sex', kind: 'enum', options: SEX_OPTIONS, required: true },
    { key: 'ageYears', kind: 'number' },
    { key: 'arrivalYear', kind: 'year' },
    { key: 'source', kind: 'enum', options: SOURCE_OPTIONS, persistent: true },
    { key: 'notes', kind: 'text' },
  ],
  members: [
    { key: 'fullName', kind: 'text', required: true },
    { key: 'phone', kind: 'phone' },
    { key: 'gotra', kind: 'picklist', picklistFrom: 'gotras', persistent: true },
    { key: 'address', kind: 'text', persistent: true },
    { key: 'sevaTier', kind: 'enum', options: TIER_OPTIONS },
    { key: 'spiritualName', kind: 'text' },
    { key: 'email', kind: 'text' },
  ],
  donors: [
    { key: 'fullName', kind: 'text', required: true },
    { key: 'phone', kind: 'phone' },
    { key: 'gotra', kind: 'picklist', picklistFrom: 'gotras', persistent: true },
    { key: 'address', kind: 'text', persistent: true },
    { key: 'lifetimeDonated', kind: 'amount' },
    { key: 'donationDate', kind: 'date' },
    { key: 'donationAmount', kind: 'amount' },
    { key: 'purpose', kind: 'text' },
    { key: 'paymentMode', kind: 'enum', options: PAYMODE_OPTIONS },
    { key: 'receiptNo', kind: 'text' },
  ],
};

export const TARGET_EMOJI: Record<BahiTarget, string> = {
  herd: '🐄',
  members: '🙏',
  donors: '🪔',
};

/* ------------------------------ roles ------------------------------- */
/* Role strings arrive in both modern (Trustee) and legacy (TRUSTEE)   */
/* spellings across the app — normalize before judging.                */

export function roleKey(role: string | null | undefined): string {
  return String(role || '').replace(/[^a-z]/gi, '').toUpperCase();
}

const ENTRY_ROLES = new Set([
  'SUPERADMIN', 'TRUSTEE', 'ACCOUNTANT', 'SEVADAR', 'MANAGER', 'VOLUNTEER', 'PRIEST', 'PUROHIT',
]);

/** Who may create batches and type rows. Entry is wide on purpose —
 *  entry alone can never make a record real. */
export function canEnterBahi(role: string | null | undefined): boolean {
  return ENTRY_ROLES.has(roleKey(role));
}

/** Who may approve (= commit). Trustee/SuperAdmin approve anything;
 *  Accountant approves donor/donation batches only — the same finance
 *  class the treasury rules gate (R_FINANCE). */
export function canApproveBahi(role: string | null | undefined, target: BahiTarget): boolean {
  const r = roleKey(role);
  if (r === 'SUPERADMIN' || r === 'TRUSTEE') return true;
  if (r === 'ACCOUNTANT') return target === 'donors';
  return false;
}

export function canApproveAnyBahi(role: string | null | undefined): boolean {
  const r = roleKey(role);
  return r === 'SUPERADMIN' || r === 'TRUSTEE' || r === 'ACCOUNTANT';
}
