/* Tirth One — Darshan queue & token management types.
 *
 * Offline-first: darshan slots, tokens, queue state and crowd counts are
 * device-local (own store, never DataContext). Only treasury postings
 * (seva-darshan bookings) go to the cloud ledger.
 *
 * HONESTY RULE: wait times are estimates, labelled as such. Darshan fees
 * are generally not 80G-eligible — the UI says so plainly.
 */

export const SLOT_TYPES = [
  'General', 'Senior citizen', 'Divyang', 'VIP seva',
] as const;

export type SlotType = (typeof SLOT_TYPES)[number];

export interface DarshanSlot {
  id: string;
  name: string;            // "Morning darshan"
  startTime: string;       // HH:MM
  endTime: string;         // HH:MM
  capacity: number;        // tokens per day
  slotType: SlotType;
  active: boolean;
  notes?: string;
}

export type TokenStatus = 'waiting' | 'served' | 'no-show' | 'cancelled';
export type TokenKind = 'walk-in' | 'advance' | 'seva';

export interface DarshanToken {
  id: string;
  date: string;            // yyyy-mm-dd — tokens reset daily
  slotId: string;
  no: string;              // "T-0001" — sequential per day
  seq: number;             // numeric sequence within the day
  name?: string;
  phone?: string;
  kind: TokenKind;
  status: TokenStatus;
  issuedAt: string;        // ISO
  servedAt?: string;       // ISO
  notes?: string;
}

export interface SevaBooking {
  id: string;
  date: string;            // yyyy-mm-dd
  passType: string;        // "Mangal Aarti pass", "Special darshan", ...
  name: string;
  phone?: string;
  persons: number;
  amount: number;
  /** Set once posted to treasury. */
  treasuryTxId?: string;
  createdAt: string;       // ISO
  notes?: string;
}

export const SEVA_PASS_TYPES = [
  'Special darshan', 'Mangal Aarti pass', 'Sandhya Aarti pass', 'Abhishek seva', 'Other seva',
] as const;

export interface CrowdSnapshot {
  id: string;
  date: string;            // yyyy-mm-dd
  time: string;            // HH:MM
  location: string;        // "Main gate", "Sanctum", "Queue hall", ...
  count: number;
  recordedAt: string;      // ISO
  notes?: string;
}

export const CROWD_LOCATIONS = [
  'Main gate', 'Sanctum', 'Queue hall', 'Prasad counter', 'Parking', 'Ghat / parikrama', 'Other',
] as const;

export interface TirthSettings {
  avgMinsPerDevotee: number; // used for wait-time estimates
  tirthName: string;
}

export interface TirthState {
  slots: DarshanSlot[];
  tokens: DarshanToken[];
  seva: SevaBooking[];
  crowd: CrowdSnapshot[];
  settings: TirthSettings;
}
