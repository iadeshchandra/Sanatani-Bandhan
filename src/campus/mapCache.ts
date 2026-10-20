/**
 * campus/mapCache.ts — on-device cache of campus maps this phone has seen.
 * =======================================================================
 * WHY: zone-QR verification (zoneQr.ts) is anchored on the org's
 * PUBLISHED campus map — but temple courtyards have poor connectivity,
 * and a devotee standing at the shrine cannot wait for Firestore.
 * Every map the app successfully loads (CampusView subscription,
 * getCampusMap) is written through to this cache, so a later scan can
 * verify against the temple's OWN published data — with the real org
 * and zone names — entirely offline.
 *
 * SCOPE: caches only what verification needs (org name + zone id/name
 * pairs). Public temple-layout data only — campus maps are public by
 * design (rules: public read). No personal data, ever.
 *
 * FAIL-OPEN: every function swallows storage errors (private mode,
 * quota, sandboxed iframe, jest node env without localStorage) and
 * degrades to "no cache" — verification then falls to its next rung.
 */
import type { CampusMap } from './types';

export interface CachedCampusMap {
  orgId: string;
  orgName: string;
  zones: Array<{ id: string; name: string }>;
  cachedAt: number;
}

const KEY = 'sb_campus_maps_v1';
const MAX_ORGS = 20;

function storage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

function readAll(): CachedCampusMap[] {
  const s = storage();
  if (!s) return [];
  try {
    const raw = s.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is CachedCampusMap =>
        !!e &&
        typeof e.orgId === 'string' &&
        typeof e.orgName === 'string' &&
        Array.isArray(e.zones),
    );
  } catch {
    return [];
  }
}

function writeAll(list: CachedCampusMap[]): void {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(KEY, JSON.stringify(list));
  } catch {
    /* quota / private mode — cache is a nicety, never a dependency */
  }
}

/**
 * Write-through: remember a freshly loaded published map. Most-recent
 * first; capped so one devotee's pilgrimage history can't grow forever.
 */
export function rememberCampusMap(map: CampusMap): void {
  if (!map || typeof map.orgId !== 'string' || !Array.isArray(map.zones)) return;
  const entry: CachedCampusMap = {
    orgId: map.orgId,
    orgName: typeof map.orgName === 'string' ? map.orgName : '',
    zones: map.zones
      .filter((z) => !!z && typeof z.id === 'string')
      .map((z) => ({ id: z.id, name: typeof z.name === 'string' && z.name ? z.name : z.id })),
    cachedAt: Date.now(),
  };
  const rest = readAll().filter((e) => e.orgId !== entry.orgId);
  writeAll([entry, ...rest].slice(0, MAX_ORGS));
}

/** The cached published map for one org, or null if never seen here. */
export function getCachedCampusMap(orgId: string): CachedCampusMap | null {
  if (typeof orgId !== 'string' || !orgId) return null;
  return readAll().find((e) => e.orgId === orgId) ?? null;
}

/** Every cached map (newest first) — diagnostics/tests. */
export function listCachedCampusMaps(): CachedCampusMap[] {
  return readAll();
}
