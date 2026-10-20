/**
 * campus/reporting.ts — Sevadar live reporting layer ("human sensors").
 * =====================================================================
 * Sevadars report live conditions per zone: "queue long", "counter open",
 * "lost child at gate", "medical needed", "all clear". Devotees see these
 * as live badges on the campus map — the human layer no camera system
 * can replace.
 *
 * Collection: `zoneReports/{reportId}`
 *   read:   public (live conditions are public information)
 *   write:  sevadar+ of that workspace (rules-gated)
 *   delete: none (reports EXPIRE — see below)
 *
 * EXPIRY (structural): every report carries expiresAt (default: createdAt
 * + 2h; festival mode: +30min). Clients filter expired reports; a cleanup
 * pass deletes them. Live conditions are never permanent.
 *
 * FESTIVAL MODE: when a campus sets festivalMode=true, reports expire
 * faster (30min) and clients degrade their LOCAL expiry-sweep cadence
 * (60s → 5min — see reportRefreshMs). The Firestore subscription
 * itself is created ONCE per org and never re-created on a timer:
 * onSnapshot reads are change-driven, so re-subscribing would re-bill
 * the whole result set every tick and INCREASE reads in a festival
 * crowd — the exact opposite of the intent (audit 2026-10-19 F-L3,
 * fixed QUEUED #17).
 *
 * ANTI-ABUSE: reports are attributed (reportedBy uid + name). Coordinators
 * can clear bad reports. This is a trusted-role feature, not anonymous.
 */

import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';

const COL = 'zoneReports';

/** Live condition types — simple language, elderly-friendly. */
export type ReportType =
  | 'queue_long'      // "Long queue here right now"
  | 'queue_short'     // "Short queue — good time to visit"
  | 'counter_open'    // "Counter / facility is open"
  | 'counter_closed'  // "Counter / facility is closed"
  | 'lost_child'      // "Lost child reported here — please look out"
  | 'medical_needed'  // "Medical help needed here"
  | 'crowded'         // "Very crowded — consider coming later"
  | 'all_clear';      // "All clear"

export const REPORT_META: Record<ReportType, { icon: string; label: string; tone: 'warn' | 'good' | 'alert' }> = {
  queue_long: { icon: '🧍', label: 'Long queue here', tone: 'warn' },
  queue_short: { icon: '✅', label: 'Short queue — good time', tone: 'good' },
  counter_open: { icon: '🟢', label: 'Open now', tone: 'good' },
  counter_closed: { icon: '🔴', label: 'Closed for now', tone: 'warn' },
  lost_child: { icon: '🧒', label: 'Lost child — please look out', tone: 'alert' },
  medical_needed: { icon: '⛑️', label: 'Medical help needed', tone: 'alert' },
  crowded: { icon: '👥', label: 'Very crowded', tone: 'warn' },
  all_clear: { icon: '🕊️', label: 'All clear', tone: 'good' },
};

export interface ZoneReport {
  id: string;
  orgId: string;
  zoneId: string;
  zoneName: string;
  type: ReportType;
  /** Optional one-line note from the sevadar, plain language. */
  note?: string;
  reportedBy: string; // uid
  reporterName: string;
  createdAt: number;
  /** Structural expiry — clients hide expired; cleanup deletes. */
  expiresAt: number;
}

export function reportExpiryMs(festivalMode: boolean): number {
  return festivalMode ? 30 * 60 * 1000 : 2 * 60 * 60 * 1000;
}

export function isReportLive(r: ZoneReport, now = Date.now()): boolean {
  return r.expiresAt > now;
}

/**
 * Local expiry sweep — drops reports whose expiresAt has passed.
 * Pure and render-time only: zero Firestore reads. Callers re-run it
 * on the reportRefreshMs cadence so an idle map still clears expired
 * badges with the same freshness the old re-subscribe timer provided
 * only as a side effect (QUEUED #17).
 */
export function sweepExpiredReports(reports: ZoneReport[], now = Date.now()): ZoneReport[] {
  return reports.filter((r) => isReportLive(r, now));
}

export async function submitZoneReport(
  input: Omit<ZoneReport, 'id' | 'createdAt' | 'expiresAt'> & { festivalMode?: boolean },
): Promise<string> {
  const id = `zr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const now = Date.now();
  const report: ZoneReport = {
    ...input,
    id,
    createdAt: now,
    expiresAt: now + reportExpiryMs(!!input.festivalMode),
  };
  const { festivalMode: _fm, ...doc_data } = report as ZoneReport & { festivalMode?: boolean };
  void _fm;
  // Strip undefined optionals — Firestore rejects undefined values on setDoc.
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(doc_data)) {
    if (v !== undefined) clean[k] = v;
  }
  await setDoc(doc(db, COL, id), { ...clean, serverAt: serverTimestamp() });
  return id;
}

/**
 * Live reports for one org, newest first. SUBSCRIBE ONCE per org —
 * this is a realtime onSnapshot listener; NEVER tear it down and
 * re-subscribe on a timer (every re-attach re-reads the full result
 * set; the timer that used to do this was QUEUED #17's churn bug).
 * Expiry is filtered here at snapshot time; between snapshots the
 * caller sweeps locally with sweepExpiredReports on the
 * reportRefreshMs cadence.
 */
export function subscribeToZoneReports(
  orgId: string,
  onReports: (reports: ZoneReport[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, COL),
    where('orgId', '==', orgId),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(
    q,
    (snap) => {
      onReports(
        sweepExpiredReports(snap.docs.map((d) => d.data() as ZoneReport)),
      );
    },
    () => onReports([]),
  );
}

/**
 * Local expiry-sweep cadence (render-only — NOT a re-subscription
 * interval): how often an open map re-filters expired reports
 * locally. Degrades in festival mode — fewer re-renders on low-end
 * devices when crowds open the map; report lifetime is shorter then
 * anyway, so freshness is unchanged.
 */
export function reportRefreshMs(festivalMode: boolean): number {
  return festivalMode ? 5 * 60 * 1000 : 60 * 1000;
}

const REPORTING_ROLES = ['superadmin', 'trustee', 'sevadar', 'coordinator'];

/**
 * Client-side gate for the sevadar report button — mirrors the
 * `zoneReports` Firestore rules (courtesy, not security; the rules
 * enforce the same gate server-side). Kept here (pure, no context
 * imports) so it stays unit-testable.
 */
export function canSubmitZoneReport(
  membershipRole: string | undefined,
  email: string | undefined,
  ownerEmail: string,
): boolean {
  if (!membershipRole && !email) return false;
  if (email && email.toLowerCase() === ownerEmail.toLowerCase()) return true;
  return REPORTING_ROLES.includes((membershipRole || '').toLowerCase());
}
