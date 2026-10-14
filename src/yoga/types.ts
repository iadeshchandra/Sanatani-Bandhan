/* Yoga One — type definitions. All shala records live device-local;
 * only treasury postings (fee income) reach the cloud ledger. */

export type BatchLevel = 'beginner' | 'intermediate' | 'advanced';
export type FeeCycle = 'monthly' | 'quarterly';
export type StudentStatus = 'active' | 'paused' | 'left';
export type PaymentMode = 'Cash' | 'UPI' | 'Bank Transfer' | 'Other';

export interface YogaBatch {
  id: string;
  name: string;
  level: BatchLevel;
  /** Weekday numbers 0=Sun..6=Sat */
  days: number[];
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  instructorId?: string;
  capacity: number;
  feeMonthly: number;
  active: boolean;
  notes?: string;
}

export interface YogaStudent {
  id: string;
  name: string;
  phone?: string;
  /** PRIVATE — device-local only, never synced. Shown with a lock note in UI. */
  healthNotes?: string;
  joinDate: string; // yyyy-mm-dd
  batchId: string;
  feeCycle: FeeCycle;
  status: StudentStatus;
  createdAt: number;
}

export interface AttendanceRecord {
  id: string;
  date: string; // yyyy-mm-dd
  batchId: string;
  studentId: string;
  present: boolean;
  markedAt: number;
}

export interface FeeRecord {
  id: string;
  receiptNo: string; // YG-RCT-YYYY-NNNN
  studentId: string;
  batchId: string;
  period: string; // YYYY-MM
  amount: number;
  paidAt: number;
  paidDate: string; // yyyy-mm-dd
  paymentMode: PaymentMode;
  receivedBy?: string;
  treasuryTxId?: string;
  notes?: string;
}

export interface YogaInstructor {
  id: string;
  name: string;
  phone?: string;
  specialties?: string;
  honorariumMonthly?: number;
  active: boolean;
  notes?: string;
}

export interface ClassDiaryEntry {
  id: string;
  date: string; // yyyy-mm-dd
  batchId: string;
  instructorName: string;
  topics: string; // e.g. "Surya Namaskar ×6, Tadasana, Pranayama — Anulom Vilom"
  notes?: string;
  createdAt: number;
}

export interface YogaSettings {
  shalaName: string;
  defaultFeeMonthly: number;
  receiptSeq: number;
  attendanceAlertBelowPct: number;
}

export interface YogaState {
  batches: YogaBatch[];
  students: YogaStudent[];
  attendance: AttendanceRecord[];
  fees: FeeRecord[];
  instructors: YogaInstructor[];
  diary: ClassDiaryEntry[];
  settings: YogaSettings;
}

export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const LEVEL_LABEL: Record<BatchLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};
