/**
 * qrLinks.ts — Smart-link builder for the QR-driven app download system.
 *
 * One QR works everywhere: the smart link `https://sanatanibandhan.web.app/get-app`
 * routes to the right store / install flow. Campaign QRs append `?c={campaignId}`
 * so the Admin builder's campaign analytics can attribute installs.
 *
 * Firestore collection `appGrowthCampaigns` is READ-ONLY here — the Admin
 * builder owns campaign CRUD. This module only reads for label/temple display.
 */

import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';

/** The universal app-download smart link (no campaign). */
export const APP_DOWNLOAD_BASE = 'https://sanatanibandhan.web.app/get-app';

export type QrVariant = 'generic' | 'campaign';

/** Campaign document shape (read-only contract with the Admin builder). */
export interface AppGrowthCampaign {
  id: string;
  /** Display label printed under the QR, e.g. "Diwali 2026 — Kalighat". */
  label: string;
  /** Temple / organisation name for the poster header. */
  templeName?: string;
}

/**
 * Build the smart link for a QR.
 * Generic (no campaign): https://sanatanibandhan.web.app/get-app
 * Campaign:              https://sanatanibandhan.web.app/get-app?c={campaignId}
 */
export function buildAppLink(campaignId?: string | null): string {
  const id = (campaignId || '').trim();
  if (!id) return APP_DOWNLOAD_BASE;
  return `${APP_DOWNLOAD_BASE}?c=${encodeURIComponent(id)}`;
}

export function variantOf(campaignId?: string | null): QrVariant {
  return (campaignId || '').trim() ? 'campaign' : 'generic';
}

/** Default download filename stem for a QR export. */
export function qrFileStem(variant: QrVariant, campaignId?: string | null): string {
  const id = (campaignId || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return variant === 'campaign' && id ? `sanatani-app-qr-${id}` : 'sanatani-app-qr';
}

const CAMPAIGN_COLLECTION = 'appGrowthCampaigns';
const CAMPAIGN_FETCH_LIMIT = 50;

/**
 * Read-only fetch of app-growth campaigns for QR/poster labeling.
 * Never throws — returns [] when offline or the collection is missing.
 */
export async function fetchAppGrowthCampaigns(): Promise<AppGrowthCampaign[]> {
  try {
    const q = query(collection(db, CAMPAIGN_COLLECTION), orderBy('createdAt', 'desc'), limit(CAMPAIGN_FETCH_LIMIT));
    const snap = await getDocs(q);
    const out: AppGrowthCampaign[] = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data() as Record<string, unknown>;
      const label =
        typeof d.label === 'string' && d.label.trim()
          ? d.label.trim()
          : typeof d.name === 'string' && d.name.trim()
            ? d.name.trim()
            : docSnap.id;
      out.push({
        id: docSnap.id,
        label,
        templeName: typeof d.templeName === 'string' ? d.templeName : undefined,
      });
    });
    return out;
  } catch {
    // orderBy may fail if createdAt is missing on docs — retry unordered.
    try {
      const snap = await getDocs(query(collection(db, CAMPAIGN_COLLECTION), limit(CAMPAIGN_FETCH_LIMIT)));
      const out: AppGrowthCampaign[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data() as Record<string, unknown>;
        out.push({
          id: docSnap.id,
          label: typeof d.label === 'string' && d.label.trim() ? d.label.trim() : docSnap.id,
          templeName: typeof d.templeName === 'string' ? d.templeName : undefined,
        });
      });
      return out;
    } catch {
      return [];
    }
  }
}
