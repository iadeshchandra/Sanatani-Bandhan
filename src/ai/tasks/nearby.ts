/**
 * TASK: nearby_temples
 * =====================================================================
 * "Temples near me" — real-time location assistance with explicit consent.
 *
 * PRIVACY ARCHITECTURE (non-negotiable):
 * - Location is accessed ONLY inside the explicit consent flow in the
 *   AssistantSheet. This task NEVER calls geolocation itself.
 * - Coordinates are NEVER written to Firestore, IndexedDB, localStorage,
 *   or any log. They exist in memory for the duration of the query,
 *   then are discarded (function scope — no retention).
 * - No background watchers, no polling, no caching between queries.
 * - Campus maps are publicly readable (firestore.rules: allow read: if true).
 *
 * FLOW:
 * 1. nearbyTask(ctx) → { variant: 'consent', action: { kind: 'requestLocation' } }
 * 2. AssistantSheet renders LocationConsentCard (proper UI, not confirm())
 * 3. Allow → sheet calls navigator.geolocation → findNearbyTemples(lat, lng)
 * 4. Deny → sheet shows the 'denied' template variant
 *
 * DATA SOURCES (priority order):
 * 1. Community campus maps (Firestore `campusMaps`, geo-mode only)
 * 2. Curated major tirthas (bundled, offline) — labelled as such
 */
import { CURATED_TIRTHAS, type CuratedTirtha } from '../corpus/tirthas';
import { labelFor } from '../lang/shared';
import { suggestionsFor } from '../templates';
import type { TaskCtx, TaskOutcome } from '../types';
// NOTE: firebase/firestore is imported dynamically inside
// queryCampusMapsNear() so this module stays import-safe in Jest/node
// (the static import broke the entire AI test suite via tasks/index.ts).

/* ------------------------------------------------------------------ */
/* Pure helpers — fully unit-testable, zero side effects              */
/* ------------------------------------------------------------------ */

/** Great-circle distance in kilometres. */
export function haversineKm(
  lat1: number, lng1: number, lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Human-friendly distance: "800m" under 1km, "3.2km" above. */
export function formatDistance(km: number, lang: string): string {
  if (km < 1) {
    const m = Math.round(km * 1000);
    if (lang === 'bn') return `${m} মি`;
    if (lang === 'hi') return `${m} मी`;
    // B2-C draft overlays: nearby.m / nearby.km unit suffixes.
    const ms = labelFor(lang, 'nearby.m');
    if (ms) return `${m} ${ms}`;
    return `${m}m`;
  }
  const k = km < 10 ? km.toFixed(1) : Math.round(km).toString();
  if (lang === 'bn') return `${k} কিমি`;
  if (lang === 'hi') return `${k} किमी`;
  const ks = labelFor(lang, 'nearby.km');
  if (ks) return `${k} ${ks}`;
  return `${k}km`;
}

/** Validate coordinates are sane WGS84 (guards against garbage input). */
export function validCoords(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
  );
}

export interface NearbyTemple {
  name: string;
  distanceKm: number;
  distanceLabel: string;
  source: 'community' | 'tirtha';
  /** For community maps: orgId for deep-linking. For tirthas: curated id. */
  ref: string;
}

export interface NearbyResult {
  temples: NearbyTemple[];
  /** True when the list is curated tirthas (no community maps nearby). */
  fromCurated: boolean;
  /** True when nothing was found within maxKm at all. */
  empty: boolean;
}

/** Search the curated list — pure, offline, synchronous. */
export function findNearbyCurated(
  lat: number, lng: number, lang: string,
  maxKm = 25, maxResults = 5
): NearbyTemple[] {
  if (!validCoords(lat, lng)) return [];
  return CURATED_TIRTHAS.map((t) => {
    const distanceKm = haversineKm(lat, lng, t.lat, t.lng);
    // B2-C: tirtha names carry merged draft overlays (corpus/tirthas.ts).
    const name = (t.name as Record<string, string>)[lang] || t.name.en;
    return {
      name, distanceKm,
      distanceLabel: formatDistance(distanceKm, lang),
      source: 'tirtha' as const, ref: t.id,
    };
  })
    .filter((t) => t.distanceKm <= maxKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, maxResults);
}

/* ------------------------------------------------------------------ */
/* Firestore: community campus maps (public read per firestore.rules)  */
/* ------------------------------------------------------------------ */

interface CampusMapDoc {
  orgId?: string;
  orgName?: string;
  mode?: string;
  centerLat?: number | null;
  centerLng?: number | null;
}

/**
 * Query geo-mode campus maps near the devotee.
 * NOTE: `lat`/`lng` are used ONLY for this query — never stored.
 */
async function queryCampusMapsNear(
  lat: number, lng: number, lang: string,
  maxKm = 25, maxResults = 5
): Promise<NearbyTemple[]> {
  try {
    // Dynamic imports: keeps this module import-safe in Jest/node.
    const { collection, getDocs, limit, query } = await import('firebase/firestore');
    const { db } = await import('../../firebase');
    // campusMaps docs are keyed by orgId; pull geo-mode ones.
    // Collection is small (one doc per org) — a bounded read is fine.
    const snap = await getDocs(
      query(collection(db, 'campusMaps'), limit(200))
    );
    const out: NearbyTemple[] = [];
    snap.forEach((d) => {
      const m = d.data() as CampusMapDoc;
      if (m.mode !== 'geo') return;
      const clat = m.centerLat, clng = m.centerLng;
      if (typeof clat !== 'number' || typeof clng !== 'number') return;
      if (!validCoords(clat, clng)) return;
      const distanceKm = haversineKm(lat, lng, clat, clng);
      if (distanceKm > maxKm) return;
      out.push({
        name: m.orgName || (lang === 'bn' ? 'মন্দির' : lang === 'hi' ? 'मंदिर' : (labelFor(lang, 'nearby.temple') ?? 'Temple')),
        distanceKm,
        distanceLabel: formatDistance(distanceKm, lang),
        source: 'community',
        ref: m.orgId || d.id,
      });
    });
    return out
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, maxResults);
  } catch {
    // Offline or permission hiccup → empty; caller falls back to curated.
    return [];
  }
}

/**
 * Full nearby search: community maps first, curated tirthas as fallback.
 * Called by the AssistantSheet AFTER explicit consent + geolocation.
 * Coordinates are function-scoped — never persisted anywhere.
 */
export async function findNearbyTemples(
  lat: number, lng: number, lang: string
): Promise<NearbyResult> {
  // B2-C: the full language code flows through (no collapse to en) —
  // draft languages resolve via the overlays inside formatDistance,
  // the tirtha name pick and the generic temple word; en stays default.
  const lc = (lang || 'en').toLowerCase();
  if (!validCoords(lat, lng)) {
    return { temples: [], fromCurated: false, empty: true };
  }
  const community = await queryCampusMapsNear(lat, lng, lc);
  if (community.length > 0) {
    return { temples: community, fromCurated: false, empty: false };
  }
  const curated = findNearbyCurated(lat, lng, lc);
  return {
    temples: curated,
    fromCurated: true,
    empty: curated.length === 0,
  };
}

/* ------------------------------------------------------------------ */
/* Task executor — returns the consent gate (never geolocates itself) */
/* ------------------------------------------------------------------ */

export function nearbyTask(ctx: TaskCtx): TaskOutcome {
  // If the host already has coords (tests / programmatic), answer directly.
  const lat = parseFloat(ctx.slots.lat || '');
  const lng = parseFloat(ctx.slots.lng || '');
  if (validCoords(lat, lng)) {
    // Async path: the renderer will await this via the pipeline.
    return {
      params: { lat: String(lat), lng: String(lng) },
      variant: 'with_coords',
      suggestions: suggestionsFor('nearby_temples', ctx.lang),
    };
  }
  // Normal path: ask for consent first. The sheet renders the consent
  // card and only calls findNearbyTemples() after explicit Allow.
  return {
    params: {},
    variant: 'consent',
    action: { kind: 'requestLocation', target: 'nearby_temples' },
    suggestions: suggestionsFor('nearby_temples', ctx.lang),
  };
}
