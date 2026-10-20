/**
 * campus/scanCheckin.ts — pure scan → check-in prefill mapping.
 * ================================================================
 * When a zone QR verifies, the devotee's Tirtha check-in opens
 * pre-filled from the temple's OWN code (org + zone) — still fully
 * editable, still recorded only on explicit confirm. This is the exact
 * mapping VisitCheckinSheet applies to its own embedded scanner;
 * extracted pure so every scan door (check-in form, campus map) fills
 * the form identically. Jest-safe: zero imports beyond the type.
 */
import type { ZoneScanSuccess } from './ZoneQrScanSheet';

export interface CheckinPrefill {
  /** "Org name · Zone name" — matches the diary's temple-name format. */
  templeName: string;
  /** The verified org — links the visit to the org's public page. */
  orgId: string;
}

export function checkinPrefillFromScan(scan: ZoneScanSuccess): CheckinPrefill {
  return {
    templeName: `${scan.orgName} · ${scan.zoneName}`,
    orgId: scan.orgId,
  };
}
