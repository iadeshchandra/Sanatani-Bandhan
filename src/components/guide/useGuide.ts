/**
 * guide/useGuide.ts — per-feature tour state machine.
 * ====================================================
 * Statuses:
 *   unseen     → first visit: show the gentle invitational pill.
 *   offered     → pill was shown once (recorded so it never nags).
 *   active     → the coach-mark tour is on screen.
 *   done       → finished the tour; never re-shows.
 *   dismissed  → skipped / closed; never re-shows.
 *
 * Feature tours are ALWAYS invitational — this hook never auto-starts a
 * tour. (The one auto-showing first-run explainer in notifications/ keeps
 * its own show-once logic.)
 */

import { useCallback, useState } from 'react';
import {
  getGuideStatus,
  setGuideStatus,
  type GuideStatus,
} from './guideProgress';

export interface UseGuide {
  status: GuideStatus;
  /** The invitational pill should be visible right now. */
  pillVisible: boolean;
  /** The coach-mark overlay should be rendered right now. */
  tourActive: boolean;
  /** Devotee tapped the pill (or a "Take a tour" trigger). */
  start: () => void;
  /** Tour finished: completed=true reached the last step. */
  finish: (completed: boolean) => void;
  /** Dismiss the invitational pill without starting. */
  dismissPill: () => void;
  /** "Take a tour" links: restart even after done/dismissed. */
  restart: () => void;
}

export function useGuide(guideId: string, uid: string = 'anon'): UseGuide {
  const [status, setStatus] = useState<GuideStatus>(() => getGuideStatus(guideId, uid));

  const persist = useCallback(
    (next: GuideStatus) => {
      setGuideStatus(guideId, uid, next);
      setStatus(next);
    },
    [guideId, uid]
  );

  const start = useCallback(() => persist('active'), [persist]);

  const finish = useCallback(
    (completed: boolean) => persist(completed ? 'done' : 'dismissed'),
    [persist]
  );

  const dismissPill = useCallback(() => persist('dismissed'), [persist]);

  const restart = useCallback(() => persist('active'), [persist]);

  // The pill shows exactly once per devotee: on the first visit while the
  // guide is unseen. After that it is either taken, dismissed, or done.
  const pillVisible = status === 'unseen';
  const tourActive = status === 'active';

  // Record that the pill was offered as soon as it becomes visible, so a
  // devotee who navigates away and back is not re-invited forever.
  // (Done lazily via the pill component's onShown callback — see TourPill.)

  return { status, pillVisible, tourActive, start, finish, dismissPill, restart };
}

/** Mark the pill as offered without changing visibility semantics. */
export function markPillOffered(guideId: string, uid: string = 'anon'): void {
  if (getGuideStatus(guideId, uid) === 'unseen') {
    setGuideStatus(guideId, uid, 'offered');
  }
}
