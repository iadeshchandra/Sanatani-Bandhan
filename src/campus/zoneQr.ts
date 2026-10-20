/**
 * campus/zoneQr.ts — Zone QR codes with anti-phishing verification.
 * ===================================================================
 * Formats:
 *   v1 (legacy, still valid): SB-ZONE:1:{orgId}:{zoneId}
 *   v2 (current):              SB-ZONE:2:{orgId}:{zoneId}:{check}
 *     {check} = 6-char integrity segment over orgId+zoneId
 *     (see zoneChecksum). CampusBuilder prints v2 since Queued #20.
 *
 * ANTI-PHISHING (structural):
 * 1. The scanner accepts ONLY SB-ZONE payloads. It never opens URLs,
 *    never starts payments, never starts a donation flow. A QR that
 *    isn't a valid zone code shows "This doesn't look like a temple
 *    code" — full stop.
 * 2. Every scan is VERIFIED against the org's published campus map:
 *    the zoneId must exist for that orgId. A photocopied/fake QR for
 *    a non-existent zone fails closed.
 * 3. DONATION FLOWS NEVER START FROM A MAP QR. The scan-result screen
 *    has no payment buttons, no links, no "donate" CTA. This is a
 *    deliberate air-gap: even a perfect phishing QR cannot reach money.
 * 4. Zone QRs are generated ONLY by the org's CampusBuilder (admin).
 *
 * OFFLINE VERIFICATION (Queued #20) — temple courtyards have poor
 * connectivity, so verification climbs a ladder, strongest first:
 *   a. published_map — the live published map (or Firestore's own
 *      cache of it). The authority, unchanged from before.
 *   b. cached_map — the device cache of maps this phone has loaded
 *      before (mapCache.ts). Real temple names, fully offline.
 *   c. device — v2 codes only: the integrity segment proves the code
 *      was minted in builder format (not a URL, not a hand-typed or
 *      edited sticker). Names fall back to the humanized zone id and
 *      the check-in stays fully editable + explicitly confirmed.
 *   v1 codes offline with no cached map CANNOT be verified —
 *   'offline_unverifiable' says so honestly instead of pretending the
 *   code is fake.
 *
 * HONEST LIMITS of the checksum: the algorithm ships inside the app,
 * so a determined forger who reads it can mint a well-formed v2 code.
 * The checksum is tamper-EVIDENCE (casual edits, damaged prints,
 * mistyped stickers all break it), not a cryptographic signature.
 * The published map remains the final authority whenever reachable,
 * and the check-in itself is user-confirmed and user-editable — the
 * blast radius of any accepted code is one editable diary entry.
 */
import { getCampusMap } from './campusService';
import { getCachedCampusMap, type CachedCampusMap } from './mapCache';

export const ZONE_QR_PREFIX = 'SB-ZONE';
/** Current printed format version (CampusBuilder output). */
export const ZONE_QR_VERSION = '2';
/** Legacy printed format — v1 codes remain valid forever. */
export const ZONE_QR_V1 = '1';

export interface ParsedZoneQr {
  orgId: string;
  zoneId: string;
  version: 1 | 2;
  /** v2 only — the integrity segment, exactly as printed. */
  check?: string;
}

const CHECK_SALT = 'sanatani-bandhan/zone-qr/v2';

/**
 * Integrity segment for a v2 code: FNV-1a (32-bit) over
 * orgId + zoneId + an app salt, rendered as 6 base36 chars.
 * Deterministic and offline — builder and scanner compute it with no
 * network and no key exchange. NOT a signature (see header).
 */
export function zoneChecksum(orgId: string, zoneId: string): string {
  const input = `${ZONE_QR_PREFIX}:${orgId}:${zoneId}:${CHECK_SALT}`;
  let h = 0x811c9dc5; // FNV-1a offset basis
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193); // FNV prime
  }
  const n = (h >>> 0) % 2176782336; // 36^6 — keeps the segment at 6 chars
  return n.toString(36).padStart(6, '0');
}

/**
 * Parse a scanned QR string. Returns null for anything that isn't a
 * well-formed zone QR — including URLs, payment codes, and garbage.
 * The scanner must treat null as "not a temple code".
 * Structural only: v2 integrity is checked by zoneChecksumMatches so
 * callers can tell a DAMAGED/ALTERED code from a non-temple code.
 */
export function parseZoneQr(raw: string): ParsedZoneQr | null {
  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  // Strict format — no URLs, no extra segments, no query strings.
  const v1 = /^SB-ZONE:1:([A-Za-z0-9_-]{1,64}):([A-Za-z0-9_-]{1,64})$/.exec(t);
  if (v1) return { orgId: v1[1], zoneId: v1[2], version: 1 };
  const v2 = /^SB-ZONE:2:([A-Za-z0-9_-]{1,64}):([A-Za-z0-9_-]{1,64}):([a-z0-9]{6})$/.exec(t);
  if (v2) return { orgId: v2[1], zoneId: v2[2], version: 2, check: v2[3] };
  return null;
}

/** True when the payload's integrity segment matches its contents. */
export function zoneChecksumMatches(parsed: ParsedZoneQr): boolean {
  if (parsed.version === 1) return true; // v1 carries no segment — nothing to match
  return typeof parsed.check === 'string' && parsed.check === zoneChecksum(parsed.orgId, parsed.zoneId);
}

/** Build the QR payload for a zone (used by CampusBuilder) — v2. */
export function buildZoneQrPayload(orgId: string, zoneId: string): string {
  return `${ZONE_QR_PREFIX}:${ZONE_QR_VERSION}:${orgId}:${zoneId}:${zoneChecksum(orgId, zoneId)}`;
}

/** Build a legacy v1 payload — kept for compatibility tests/fixtures. */
export function buildZoneQrPayloadV1(orgId: string, zoneId: string): string {
  return `${ZONE_QR_PREFIX}:${ZONE_QR_V1}:${orgId}:${zoneId}`;
}

/**
 * Best-effort display name from a zone id — used ONLY for device-only
 * verification (offline, v2, never-seen temple), as an editable
 * check-in prefill. 'zone_prasad_counter' → 'Prasad Counter'.
 */
export function humanizeZoneId(zoneId: string): string {
  const words = String(zoneId || '')
    .replace(/^zone[_-]/i, '')
    .split(/[_-]+/)
    .filter(Boolean);
  if (words.length === 0) return zoneId;
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export type ZoneVerificationSource = 'published_map' | 'cached_map' | 'device';

export type ZoneQrVerification =
  | {
      ok: true;
      source: ZoneVerificationSource;
      orgId: string;
      /** Absent only for source 'device' (the payload carries no names). */
      orgName?: string;
      zoneId: string;
      zoneName: string;
    }
  | {
      ok: false;
      reason: 'bad_format' | 'unknown_org' | 'unknown_zone' | 'bad_checksum' | 'offline_unverifiable';
    };

/**
 * The offline ladder — pure, no network. Given a raw scan and whatever
 * cached map the device holds for the org (may be null), decide.
 * Ladder rules (strongest evidence first):
 *  - cached map WITH the zone → verified by the temple's own data.
 *  - cached map WITHOUT the zone → v2 falls through to the checksum
 *    rung (the cache may predate a newly added zone); v1 fails closed
 *    (it has no integrity to fall back on).
 *  - no cached map → v2 verifies on-device; v1 is honestly
 *    'offline_unverifiable'.
 */
export function verifyZoneQrLocal(raw: string, cached: CachedCampusMap | null): ZoneQrVerification {
  const parsed = parseZoneQr(raw);
  if (!parsed) return { ok: false, reason: 'bad_format' };
  if (!zoneChecksumMatches(parsed)) return { ok: false, reason: 'bad_checksum' };

  if (cached && cached.orgId === parsed.orgId) {
    const zone = cached.zones.find((z) => z.id === parsed.zoneId);
    if (zone) {
      return {
        ok: true,
        source: 'cached_map',
        orgId: cached.orgId,
        orgName: cached.orgName,
        zoneId: zone.id,
        zoneName: zone.name,
      };
    }
    if (parsed.version === 1) return { ok: false, reason: 'unknown_zone' };
    // v2 + stale cache: fall through to the checksum rung below.
  }

  if (parsed.version === 2) {
    return {
      ok: true,
      source: 'device',
      orgId: parsed.orgId,
      zoneId: parsed.zoneId,
      zoneName: humanizeZoneId(parsed.zoneId),
    };
  }
  return { ok: false, reason: 'offline_unverifiable' };
}

/**
 * Verify a scanned QR — published map first (the authority), the
 * offline ladder only when the fetch itself fails (no connectivity).
 * A definitive answer from the map (org/zone missing) is NEVER
 * overridden by the local rungs: fails closed, as before.
 */
export async function verifyZoneQr(raw: string): Promise<ZoneQrVerification> {
  const parsed = parseZoneQr(raw);
  if (!parsed) return { ok: false, reason: 'bad_format' };
  if (!zoneChecksumMatches(parsed)) return { ok: false, reason: 'bad_checksum' };
  let map: Awaited<ReturnType<typeof getCampusMap>>;
  try {
    map = await getCampusMap(parsed.orgId);
  } catch {
    // No connectivity (or Firestore unavailable) — verify on-device.
    return verifyZoneQrLocal(raw, getCachedCampusMap(parsed.orgId));
  }
  if (!map) return { ok: false, reason: 'unknown_org' };
  const zone = map.zones.find((z) => z.id === parsed.zoneId);
  if (!zone) return { ok: false, reason: 'unknown_zone' };
  return {
    ok: true,
    source: 'published_map',
    orgId: map.orgId,
    orgName: map.orgName,
    zoneId: zone.id,
    zoneName: zone.name,
  };
}
