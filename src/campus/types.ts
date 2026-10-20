/**
 * campus/types.ts — Temple campus map data model (Phase 1).
 * ====================================================================
 * A campus map belongs to one org. Two positioning modes:
 *   geo   — zones pinned by lat/lng on a real map base (Leaflet/OSM).
 *   image — zones pinned (x/y, 0–1000 normalized) on the temple's own
 *           layout image. Fully offline-friendly.
 *
 * Zone IDs are STABLE (zone_<slug>) — Phase 2 (QR check-ins) and Phase 3
 * (Tirtha Diary) will reference them. Never rename a zone's id; rename
 * its display name instead.
 *
 * Privacy: campus maps describe PUBLIC temple layouts. Read is public;
 * write is org-admin only (rules-gated). No personal data lives here.
 */

export type CampusMode = 'geo' | 'image';

export type OrgKind = 'mandir' | 'goshala' | 'ashram' | 'gurukul' | 'sangha' | 'other';

/** POI categories — warm, devotee-facing language. */
export type ZoneCategory =
  | 'garbhagriha'    // main shrine / sanctum
  | 'darshan_queue'  // queue complex
  | 'prasad'         // prasad counter / distribution
  | 'shoe_stand'     // footwear deposit
  | 'annakshetra'    // free meal hall / bhandara
  | 'parking'        // vehicle parking
  | 'meditation'     // meditation / prayer hall
  | 'restroom'       // restrooms / washrooms
  | 'first_aid'      // medical / first aid
  | 'donation'       // hundi / donation counter
  | 'shop'           // prasad / book shop
  | 'accommodation'  // dharamshala / guest rooms
  | 'gaushala'       // cow shelter (goshala orgs)
  | 'classroom'      // classrooms (gurukul orgs)
  | 'library'        // granth library
  | 'office'         // admin office
  | 'gate'           // entry / exit gates
  | 'garden'         // garden / parikrama path
  | 'other';

/** One daily open–close window, "HH:MM" 24-hour, temple-local time. */
export interface ZoneTimeRange {
  /** Opens at, e.g. "05:00". */
  open: string;
  /** Closes at, e.g. "21:00". Earlier than `open` = closes after midnight. */
  close: string;
}

/**
 * Structured zone hours — the computable companion to the free-text
 * `hours` string. Powers the "Open now" badge (campus/openHours.ts).
 * Absent/invalid = NO badge is ever shown (never a wrong badge).
 */
export interface ZoneOpenHours {
  /**
   * 1–2 daily ranges. Temples commonly split the day (morning darshan
   * 5 AM–12 PM, evening 4–9 PM), so two ranges are first-class.
   */
  ranges: ZoneTimeRange[];
  /** Weekdays fully closed: 0 = Sunday … 6 = Saturday (Date.getDay). */
  closedDays?: number[];
}

export interface CampusZone {
  /** Stable id — never renamed after creation (Phase 2/3 reference it). */
  id: string;
  /** Default-language display name (fallback when no translation). */
  name: string;
  category: ZoneCategory;
  /** Default-language description. */
  description?: string;
  /**
   * 10-language content from day one. lang code → translated labels.
   * Supported: en, hi, bn, sa, ta, te, mr, gu, kn, ml.
   * Missing language falls back to `name`/`description` (never blank).
   */
  labels?: Record<string, { name?: string; description?: string }>;
  /** Geo mode: WGS84 coordinates. */
  lat?: number;
  lng?: number;
  /** Image mode: 0–1000 normalized position on the layout image. */
  x?: number;
  y?: number;
  /** e.g. "5:00 AM – 12:00 PM, 4:00 PM – 9:00 PM" */
  hours?: string;
  /**
   * Structured hours for the computed "Open now" badge. Optional —
   * the free-text `hours` above stays as the display note / fallback.
   */
  openHours?: ZoneOpenHours;
}

/**
 * Resolve a zone's display name/description for a language.
 * Falls back to the default `name`/`description` — never blank.
 */
export function zoneLabel(
  zone: CampusZone,
  lang: string,
): { name: string; description?: string } {
  const l = zone.labels?.[lang];
  return {
    name: l?.name?.trim() || zone.name,
    description: l?.description?.trim() || zone.description,
  };
}

export interface CampusMap {
  orgId: string;
  orgName: string;
  mode: CampusMode;
  /** Image mode: vault:// or https URL of the temple layout image. */
  layoutImageUrl?: string | null;
  /** Geo mode: map centre + default zoom. */
  centerLat?: number | null;
  centerLng?: number | null;
  zoom?: number | null;
  zones: CampusZone[];
  updatedAt: number;
  updatedBy: string;
}

export const ZONE_CATEGORY_META: Record<ZoneCategory, { icon: string; label: string }> = {
  garbhagriha: { icon: '🛕', label: 'Main Shrine' },
  darshan_queue: { icon: '🧍', label: 'Darshan Queue' },
  prasad: { icon: '🍛', label: 'Prasad Counter' },
  shoe_stand: { icon: '👡', label: 'Shoe Stand' },
  annakshetra: { icon: '🍲', label: 'Annakshetra' },
  parking: { icon: '🅿️', label: 'Parking' },
  meditation: { icon: '🧘', label: 'Meditation Hall' },
  restroom: { icon: '🚻', label: 'Restrooms' },
  first_aid: { icon: '⛑️', label: 'First Aid' },
  donation: { icon: '🪙', label: 'Donation / Hundi' },
  shop: { icon: '🏪', label: 'Shop' },
  accommodation: { icon: '🏠', label: 'Guest Rooms' },
  gaushala: { icon: '🐄', label: 'Gaushala' },
  classroom: { icon: '📚', label: 'Classroom' },
  library: { icon: '📖', label: 'Library' },
  office: { icon: '🏢', label: 'Office' },
  gate: { icon: '🚪', label: 'Gate' },
  garden: { icon: '🌳', label: 'Garden / Parikrama' },
  other: { icon: '📍', label: 'Point of Interest' },
};

/** Starter zone templates per org type — trustees edit freely. */
export const CAMPUS_TEMPLATES: Record<OrgKind, Array<{ name: string; category: ZoneCategory; description?: string }>> = {
  mandir: [
    { name: 'Garbhagriha', category: 'garbhagriha', description: 'The sanctum — the heart of the mandir.' },
    { name: 'Darshan Queue', category: 'darshan_queue', description: 'Join the queue for darshan here.' },
    { name: 'Prasad Counter', category: 'prasad', description: 'Receive blessed prasad after darshan.' },
    { name: 'Shoe Stand', category: 'shoe_stand', description: 'Leave footwear here before entering.' },
    { name: 'Hundi', category: 'donation', description: 'Offerings for the temple.' },
    { name: 'Main Gate', category: 'gate', description: 'Primary entrance.' },
    { name: 'Parking', category: 'parking' },
    { name: 'Restrooms', category: 'restroom' },
  ],
  goshala: [
    { name: 'Gaushala Sheds', category: 'gaushala', description: 'Home of the gomata.' },
    { name: 'Main Gate', category: 'gate' },
    { name: 'Office', category: 'office' },
    { name: 'Parking', category: 'parking' },
    { name: 'Restrooms', category: 'restroom' },
  ],
  ashram: [
    { name: 'Meditation Hall', category: 'meditation', description: 'Silence is kept here.' },
    { name: 'Bhojanalaya', category: 'annakshetra', description: 'Community meals.' },
    { name: 'Guest Rooms', category: 'accommodation' },
    { name: 'Main Gate', category: 'gate' },
    { name: 'Parking', category: 'parking' },
    { name: 'Library', category: 'library' },
  ],
  gurukul: [
    { name: 'Classrooms', category: 'classroom' },
    { name: 'Granth Library', category: 'library' },
    { name: 'Bhojanalaya', category: 'annakshetra' },
    { name: 'Hostel', category: 'accommodation' },
    { name: 'Main Gate', category: 'gate' },
    { name: 'Playground', category: 'garden' },
  ],
  sangha: [
    { name: 'Prayer Hall', category: 'meditation' },
    { name: 'Community Kitchen', category: 'annakshetra' },
    { name: 'Office', category: 'office' },
    { name: 'Main Gate', category: 'gate' },
    { name: 'Parking', category: 'parking' },
  ],
  other: [
    { name: 'Main Entrance', category: 'gate' },
    { name: 'Office', category: 'office' },
    { name: 'Parking', category: 'parking' },
    { name: 'Restrooms', category: 'restroom' },
  ],
};

export function slugifyZone(name: string): string {
  return 'zone_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
}
