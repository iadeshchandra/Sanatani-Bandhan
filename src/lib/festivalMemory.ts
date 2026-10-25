/**
 * festivalMemory.ts — the post-festival memory card (EVENTS P2).
 * =====================================================================
 * After a festival concludes, its page stops being an invitation and
 * becomes a memory: how many came, how many were expected, the
 * blessings devotees shared, and a word of gratitude — the mala of
 * the festival, bead by bead, in the north-star's temple idiom.
 *
 * HONESTY LAW: every number on the card comes from a real record —
 * the published event doc's anchored counters, the RSVP list (when
 * the viewer may read it), and the community's own festival-moment
 * posts. Nothing is estimated, rounded up, or invented; a section
 * with no records behind it is simply absent.
 */
import type { FestivalEventDoc, RsvpEntry } from './festival';

export interface FestivalMomentLike {
  text: string;
  authorName: string;
}

export interface FestivalMemory {
  /** Festival display name (English line; callers localise via the doc's Lang3). */
  nameEn: string;
  orgName: string;
  dateISO: string;
  endDateISO: string;
  /** Whole days the festival ran (≥1). */
  days: number;
  /** Public anchored RSVP headcount (the doc's own counter). */
  expectedHeads: number;
  /** Families/groups who RSVP'd — only when the RSVP list was readable. */
  families: number | null;
  /** Heads on RSVPs the organisers marked arrived — list-derived, else null. */
  arrivedHeads: number | null;
  /** Per-day expected heads from RSVP day choices (P1 day-wise RSVP). */
  perDay: { date: string; heads: number }[];
  moments: FestivalMomentLike[];
  momentsCount: number;
}

/** A festival is concluded once its last day has fully passed (local time). */
export function festivalConcluded(ev: Pick<FestivalEventDoc, 'endDateISO' | 'dateISO'>, nowMs: number): boolean {
  const end = ev.endDateISO || ev.dateISO;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(end || '');
  if (!m) return false;
  const endOfDay = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10), 23, 59, 59, 999).getTime();
  return nowMs > endOfDay;
}

function daySpan(dateISO: string, endDateISO: string): number {
  const a = new Date(`${dateISO}T12:00:00`).getTime();
  const b = new Date(`${endDateISO}T12:00:00`).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 1;
  return Math.round((b - a) / 86400000) + 1;
}

/**
 * Build the memory from real records. `rsvps` is null when the viewer
 * cannot read the RSVP list (a public visitor) — list-derived figures
 * then stay null and the card shows only the public counter truth.
 * Waitlisted RSVPs never count as attendance.
 */
export function buildFestivalMemory(
  ev: FestivalEventDoc,
  rsvps: readonly RsvpEntry[] | null,
  moments: readonly FestivalMomentLike[],
  nowMs: number
): FestivalMemory | null {
  if (!festivalConcluded(ev, nowMs)) return null;
  let families: number | null = null;
  let arrivedHeads: number | null = null;
  const perDayMap = new Map<string, number>();
  if (rsvps) {
    const confirmed = rsvps.filter((r) => (r.status || 'confirmed') === 'confirmed');
    families = confirmed.length;
    arrivedHeads = confirmed
      .filter((r) => r.checkedIn)
      .reduce((s, r) => s + (r.headcount || 0), 0);
    for (const r of confirmed) {
      for (const day of r.days || []) {
        perDayMap.set(day, (perDayMap.get(day) || 0) + (r.headcount || 0));
      }
    }
  }
  const perDay = [...perDayMap.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, heads]) => ({ date, heads }));
  return {
    nameEn: ev.name?.en || '',
    orgName: ev.orgName || '',
    dateISO: ev.dateISO,
    endDateISO: ev.endDateISO || ev.dateISO,
    days: daySpan(ev.dateISO, ev.endDateISO || ev.dateISO),
    expectedHeads: ev.rsvpHeadcount || 0,
    families,
    arrivedHeads,
    perDay,
    moments: moments.slice(0, 3),
    momentsCount: moments.length,
  };
}
