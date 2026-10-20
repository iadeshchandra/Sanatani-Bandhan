/**
 * darshan/goLiveMount.ts — pure mount logic for the purohit "Go Live" button.
 * ============================================================================
 * Decides WHEN the GoLiveButton appears on a PoojaBookingDesk roster card.
 *
 * Rules:
 *  1. Only priest/purohit/trustee/admin roles see it (devotees never).
 *  2. Only on live-able bookings: Confirmed or In-Progress.
 *     Completed / Cancelled / Standby bookings are not streamable.
 *  3. If a stream URL already exists, the "Watch" link covers it —
 *     no need to show Go Live again.
 *  4. The shraddha/funeral gate lives INSIDE GoLiveButton (via
 *     isPrivateCeremony on the pooja name) — this module only decides
 *     visibility, never consent.
 *
 * Jest-safe: zero imports from firebase or React.
 */

export type DarshanLang = 'en' | 'hi' | 'bn';

/** Map the app locale to the darshan i18n lang. Unknown → 'en'. */
export function toDarshanLang(currentLang: string | undefined | null): DarshanLang {
  const l = (currentLang || '').toLowerCase();
  if (l.startsWith('hi')) return 'hi';
  if (l.startsWith('bn')) return 'bn';
  return 'en';
}

export interface GoLiveBookingLike {
  id: string;
  status?: string;
  liveStreamUrl?: string;
}

/** Bookings a purohit can meaningfully stream right now. */
const STREAMABLE_STATUSES = ['confirmed', 'in-progress'];

/**
 * Should the Go Live button render for this booking + viewer?
 * Pure — safe to unit test, safe to reuse in any future surface.
 */
export function shouldShowGoLive(
  booking: GoLiveBookingLike | null | undefined,
  isPriestOrAdmin: boolean,
): boolean {
  if (!booking || !isPriestOrAdmin) return false;
  if (booking.liveStreamUrl) return false; // Watch link already covers it
  const status = (booking.status || '').toLowerCase();
  return STREAMABLE_STATUSES.includes(status);
}
