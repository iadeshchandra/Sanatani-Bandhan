/**
 * Ashram One — Dharamshala stay-management types.
 * ============================================================
 * Room registry, advance bookings, guest stays (check-in/out),
 * stay-donation ledger, yatri history and bhandara meal counts.
 *
 * HONESTY CONTRACT (offline-first, $0):
 * - Stay records are DEVICE-LOCAL (per-workspace localStorage). Only the
 *   donation collected at checkout posts to treasury (cloud path).
 * - Guest ID numbers are stored device-local and labelled as such in the
 *   UI — they never leave this device except inside the printed register.
 * - Accommodation donations are generally NOT 80G-eligible under Indian
 *   tax law. Checkout posts with is80GEligible:false and says so on screen.
 * - Dormitory overbooking is blocked by bed-count, not just room-count.
 */

export type RoomType = 'single' | 'double' | 'dormitory' | 'family';
export type RoomStatus = 'available' | 'maintenance';

export const ROOM_TYPES: RoomType[] = ['single', 'double', 'dormitory', 'family'];

export interface Room {
  id: string;
  /** Human room number, e.g. "101", "D-1". */
  number: string;
  type: RoomType;
  /** Beds / person capacity. */
  capacity: number;
  facilities: string[];
  /** Suggested donation per night (₹). Informational — actual may differ. */
  suggestedDonation: number;
  /** 'maintenance' takes the room out of booking. Occupancy is computed. */
  status: RoomStatus;
  floor?: string;
  notes?: string;
}

export type BookingStatus =
  | 'held'
  | 'confirmed'
  | 'waitlist'
  | 'cancelled'
  | 'no-show'
  | 'checked-in';

export interface Booking {
  id: string;
  guestName: string;
  phone: string;
  /** Specific room hold — empty means "any room of roomType". */
  roomId?: string;
  roomType?: RoomType;
  partySize: number;
  /** ISO dates (yyyy-mm-dd). checkOut is exclusive. */
  checkIn: string;
  checkOut: string;
  purpose?: string;
  status: BookingStatus;
  notes?: string;
  createdAt: number;
}

export type StayStatus = 'checked-in' | 'checked-out';

export interface Stay {
  id: string;
  bookingId?: string;
  guestName: string;
  phone: string;
  /** ID proof — DEVICE-LOCAL ONLY, labelled honestly in the UI. */
  idType?: string;
  idNumber?: string;
  purpose?: string;
  partySize: number;
  roomId: string;
  /** ISO datetime of actual check-in. */
  checkIn: string;
  /** ISO date (yyyy-mm-dd) the guest expects to leave. */
  expectedCheckout: string;
  /** ISO datetime of actual checkout. */
  checkoutAt?: string;
  status: StayStatus;
  /** nights × room suggestedDonation at check-in time. */
  suggestedTotal: number;
  /** What was actually received at checkout. */
  actualDonation?: number;
  paymentMode?: string;
  receiptNo?: string;
  treasuryTxId?: string;
  notes?: string;
}

export interface MealCount {
  id: string;
  /** ISO date (yyyy-mm-dd). */
  date: string;
  breakfast: number;
  lunch: number;
  dinner: number;
  autoSuggested: boolean;
  notes?: string;
}

export interface AshramSettings {
  defaultSuggestedDonation: number;
  /** Meals auto-suggested per occupied bed (e.g. 2 = lunch + dinner). */
  mealsPerGuest: number;
}

export interface AshramState {
  rooms: Room[];
  bookings: Booking[];
  stays: Stay[];
  meals: MealCount[];
  settings: AshramSettings;
}
