/**
 * campus/future.ts — Phase 2+ data model (ARCHITECTURE ONLY, not implemented).
 * ============================================================================
 * Owner approved the full map system. These types define the data shapes for:
 *   Phase 2: QR zone check-ins + visit timeline
 *   Phase 3: Tirtha Diary (lifetime yatra journal)
 *   Phase 4: Family circles (ephemeral, opt-in location sharing)
 *   Phase 5: Crowd density (aggregated, k-anonymous)
 *   Phase 6: Yatra mode (pilgrimage routes)
 *   Phase 7: Trustee command view (aggregated footfall)
 *
 * PRIVACY (structural, not bolted on):
 * - NOTHING automatic: every visit starts with an explicit user tap.
 * - NOTHING permanent: visits auto-expire; "forget this visit" deletes.
 * - NOTHING public: personal trails are user-owned; crowd data is
 *   aggregated with k-anonymity (min 5 people per zone bucket).
 * - Family circles are ephemeral (sharingUntil) with a one-tap ghost mode.
 *
 * Zone ids from types.ts are the stable join key across ALL phases.
 * Do not build Phase 2 until Phase 1 (Tracks 1-2) is landed and verified.
 */

import type { CampusZone } from './types';

/* ------------------------------------------------------------------ */
/* Phase 2: Visit sessions + QR check-ins                               */
/* ------------------------------------------------------------------ */

/** How a zone visit was recorded. */
export type CheckInSource = 'qr' | 'gps' | 'manual';

export interface ZoneVisit {
  /** Stable zone id (campus/types.ts). */
  zoneId: string;
  zoneName: string; // denormalized for offline rendering
  enteredAt: number; // epoch ms
  exitedAt: number | null; // null = still here (or unknown)
  source: CheckInSource;
}

/**
 * One temple visit. Created ONLY by explicit user tap ("Begin my visit 🪔").
 * Collection: `visits/{visitId}` — owner-read/write only (rules).
 * Auto-expiry: endedAt set on "End visit" or 12h timeout; docs older than
 * 90 days are deleted by the user or a cleanup job (never retained forever).
 */
export interface VisitSession {
  id: string;
  uid: string; // owner — rules: request.auth.uid == uid
  orgId: string;
  orgName: string;
  startedAt: number;
  endedAt: number | null;
  /** 'active' | 'completed' | 'forgotten' (tombstone after user deletes) */
  status: 'active' | 'completed' | 'forgotten';
  zoneVisits: ZoneVisit[];
  /** Free-form note, e.g. "Went with Maa for her birthday." */
  note?: string;
}

/* ------------------------------------------------------------------ */
/* Phase 3: Tirtha Diary (computed — no new collection)                 */
/* ------------------------------------------------------------------ */

/**
 * Derived client-side from the user's VisitSessions. Never stored as a
 * separate doc (single source of truth = visits). Lifetime stats:
 * unique temples, dhams visited, first/last visit per org.
 */
export interface TirthaDiaryEntry {
  orgId: string;
  orgName: string;
  visitCount: number;
  firstVisit: number;
  lastVisit: number;
  zonesSeen: string[]; // zone ids across all visits
}

/* ------------------------------------------------------------------ */
/* Phase 4: Family circles (ephemeral sharing)                           */
/* ------------------------------------------------------------------ */

/**
 * Collection: `familyCircles/{circleId}` — members-only read.
 * Sharing is EPHEMERAL: each member's share has a sharingUntil timestamp.
 * Ghost mode = sharingPaused (one tap, always visible in UI).
 * Granularity is ZONE-level by default (never raw GPS to family).
 */
export interface FamilyCircle {
  id: string;
  name: string; // e.g. "Sharma family"
  memberUids: string[];
  createdBy: string;
  createdAt: number;
}

export interface CircleShare {
  circleId: string;
  uid: string;
  displayName: string;
  /** Zone-level only. Null = not sharing / ghost mode. */
  currentZoneId: string | null;
  currentZoneName: string | null;
  orgId: string | null;
  orgName: string | null;
  /** Ephemeral: share auto-expires. Max 8h. */
  sharingUntil: number | null;
  sharingPaused: boolean; // ghost mode
  updatedAt: number;
}

/* ------------------------------------------------------------------ */
/* Phase 5: Crowd density (aggregated, k-anonymous)                      */
/* ------------------------------------------------------------------ */

/**
 * Collection: `crowdSnapshots/{orgId}` — public read (like campus maps).
 * NEVER individual locations: zoneId → count only, and zones with
 * fewer than 5 people are OMITTED (k-anonymity floor). Updated from
 * anonymized check-in counts; no uid ever appears here.
 */
export interface CrowdSnapshot {
  orgId: string;
  /** zoneId -> number of people currently in that zone (>= 5 or omitted) */
  zoneCounts: Record<string, number>;
  updatedAt: number;
  /** Freshness for UI: "updated 3 min ago" */
  source: 'checkins' | 'estimate';
}

/* ------------------------------------------------------------------ */
/* Phase 6: Yatra mode (pilgrimage routes — static data + visit links)  */
/* ------------------------------------------------------------------ */

export interface YatraRoute {
  id: string;
  name: string; // e.g. "Char Dham", "12 Jyotirlingas"
  description: string;
  /** Ordered org ids. Progress = diary entries matching these orgs. */
  orgIds: string[];
  createdBy: string; // 'platform' for curated, uid for custom
}

/* ------------------------------------------------------------------ */
/* Phase 7: Trustee command view (reads existing data)                   */
/* ------------------------------------------------------------------ */
/* No new collections. Reads: campusMaps/{orgId} + crowdSnapshots/{orgId}
 * + anonymized visit aggregates. Trustees see flows, never individuals. */

/* ------------------------------------------------------------------ */
/* Cross-cutting: offline-first, battery, yatra packs (REQUIREMENTS)    */
/* ------------------------------------------------------------------ */

/**
 * OFFLINE-FIRST (structural):
 * - Campus layouts are local images/SVG (image mode) — once loaded via
 *   File Vault they are base64 data URLs, fully offline-capable.
 * - Yatra packs (below) bundle everything for a pilgrimage: campus maps,
 *   zone lists, and static route info. Downloaded before the journey.
 * - QR check-ins QUEUE offline: VisitSession.zoneVisits append locally
 *   first (IndexedDB outbox), sync to Firestore on reconnect. The visit
 *   timeline NEVER depends on network.
 * - Every map component degrades to schematic/list view without tiles.
 *   Blank screens are a bug, not a state.
 */
export interface YatraPack {
  id: string; // e.g. "pack_char_dham"
  name: string;
  description: string;
  /** orgIds included, in route order. */
  orgIds: string[];
  /** Snapshot of each org's campus map at pack time (offline copy). */
  campusSnapshots: Array<{
    orgId: string;
    orgName: string;
    zones: import('./types').CampusZone[];
    layoutImageUrl?: string | null; // data URL when downloaded
  }>;
  packedAt: number;
  packVersion: number;
}

/**
 * BATTERY DISCIPLINE for visit mode (structural policy):
 * - GPS fixes at LOW frequency: max 1 fix per 2 minutes during a visit.
 * - PAUSE-WHEN-STATIONARY: if the last two fixes are within 25m, stop
 *   requesting until the device moves again (or 15 min heartbeat).
 * - Foreground only (PWA constraint) — documented, not worked around.
 * - QR check-ins are the primary zone signal; GPS is the fallback.
 * Implementations MUST honor these caps; a "high accuracy" toggle is
 * never exposed to users.
 */
export const VISIT_GPS_POLICY = {
  minIntervalMs: 2 * 60 * 1000,
  stationaryRadiusM: 25,
  stationaryHeartbeatMs: 15 * 60 * 1000,
  foregroundOnly: true,
} as const;

/**
 * Offline check-in outbox entry. Written to IndexedDB immediately on
 * scan; synced to the VisitSession when online. Never lost, never
 * duplicated (idempotent by checkInId).
 */
export interface QueuedCheckIn {
  checkInId: string; // client-generated, idempotency key
  uid: string;
  orgId: string;
  zoneId: string;
  scannedAt: number;
  source: 'qr';
  synced: boolean;
}

export type { CampusZone };
