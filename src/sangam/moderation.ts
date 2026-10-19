/**
 * sangam/moderation.ts — client-side moderation helpers.
 * ======================================================
 * AUDIT FIX #9: report → moderation, wired end-to-end.
 *
 * Two halves:
 * 1. `fileModerationReport()` — files a report to `sangamReports` using the
 *    exact create whitelist (reporterUid, reporterName, targetType, targetId,
 *    reason, details, status, createdAt). Used by surfaces whose reports were
 *    bare counters (shorts, watch videos).
 * 2. `useModerationHides()` — live set of hidden targetIds from
 *    `moderationHides` (owner-written hide directives). Feed, Shorts and Watch
 *    filter these out so "Hide content" actually hides.
 *
 * Reporters are sacred trust: reporter identity is never shown to the
 * reported user, and the moderation queue never exposes reporters either.
 */
import { useEffect, useState } from 'react';
import {
  collection, doc, setDoc, onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { SangamReport } from './types';
import { toCloudReport } from './serializers';
import { REPORT_CREATE_WHITELIST } from './moderationPure';

// Re-export the pure decision helpers so consumers import from one place.
export {
  isHidden,
  warnTargetForReport,
  shouldThankReporter,
  actionsForTarget,
  REPORT_CREATE_WHITELIST,
} from './moderationPure';
export type { ModerationAction, ModerationReportLike } from './moderationPure';

const rid = (p: string) =>
  `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export interface ReportFiler {
  uid: string;
  name: string;
}

/**
 * File a moderation report. Whitelist-exact; `status` is always 'open'.
 * Returns the report id, or null when offline / invalid.
 */
export async function fileModerationReport(
  filer: ReportFiler,
  targetType: SangamReport['targetType'],
  targetId: string,
  reason: SangamReport['reason'],
  details?: string,
): Promise<string | null> {
  if (!filer.uid || !targetId) return null;
  const id = rid('report');
  const report: SangamReport = {
    id,
    reporterUid: filer.uid,
    reporterName: filer.name || 'A devotee',
    targetType,
    targetId,
    reason,
    details: details?.trim() || undefined,
    status: 'open',
    createdAt: Date.now(),
  };
  try {
    // toCloudReport strips `id` and undefined fields → exact rules whitelist.
    await setDoc(doc(db, 'sangamReports', id), toCloudReport(report));
    return id;
  } catch {
    return null;
  }
}

/**
 * Live set of content ids the owner has hidden via GodMode → Moderation →
 * "Hide content". Consumers filter these out of feeds.
 */
export function useModerationHides(): Set<string> {  const [hidden, setHidden] = useState<Set<string>>(new Set());
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'moderationHides'),
      (snap) => {
        const next = new Set<string>();
        snap.forEach((d) => {
          const t = d.data().targetId;
          if (typeof t === 'string' && t) next.add(t);
        });
        setHidden(next);
      },
      () => { /* fail-open: a broken read never hides everything */ },
    );
    return unsub;
  }, []);
  return hidden;
}

/* ------------------------------------------------------------------ */
/* useModerationHides — the live hide-directive subscription.            */
/* (Pure decision helpers live in moderationPure.ts — re-exported above.)*/
/* ------------------------------------------------------------------ */
