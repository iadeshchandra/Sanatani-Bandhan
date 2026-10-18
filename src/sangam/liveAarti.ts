/**
 * sangam/liveAarti.ts — Live-aarti pinned card (Phase 3).
 * ============================================================================
 * Trustees pin their temple's live aarti. When orgLiveStatus shows the org
 * is live, a special card pins to the top of the Sangam feed. It unpins
 * automatically when the stream ends — no manual cleanup.
 *
 * This is the FEED surface; Watch tab is the VIDEO surface. Same data
 * (orgLiveStatus), different context.
 */

export interface PinnedAarti {
  orgId: string;
  orgName: string;
  enabled: boolean;
  pinnedAt: number;
  pinnedBy: string;
}

/** Build the org-page pin document (stored on the org doc as `pinnedAarti`). */
export function buildPinnedAarti(input: {
  orgId: string;
  orgName: string;
  pinnedBy: string;
}): PinnedAarti {
  return {
    orgId: input.orgId,
    orgName: input.orgName,
    enabled: true,
    pinnedAt: Date.now(),
    pinnedBy: input.pinnedBy,
  };
}

/** A pinned aarti shows in the feed only while the org is actually live. */
export function shouldShowPinnedAarti(
  pin: PinnedAarti | null | undefined,
  liveStatus: { isLive: boolean; videoId?: string | null } | null | undefined,
): boolean {
  if (!pin || !pin.enabled) return false;
  if (!liveStatus || !liveStatus.isLive) return false;
  return true;
}

/** Feed card copy for a live aarti. */
export function liveAartiCardText(orgName: string, title?: string): string {
  const what = title ? ` — ${title}` : '';
  return `🛕 ${orgName}${what} — LIVE now. Join the aarti. 🙏`;
}
