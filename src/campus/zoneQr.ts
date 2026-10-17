/**
 * campus/zoneQr.ts — Zone QR codes with anti-phishing verification.
 * ===================================================================
 * Format: SB-ZONE:1:{orgId}:{zoneId}
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
 *    The generator stamps the org's verified name into the payload
 *    display so devotees see "Dakshineswar Kali Temple · Prasad Counter"
 *    — not a bare URL.
 *
 * Phase 2 will use these for check-ins; the verification path is built
 * now so it's never bolted on later.
 */
import { getCampusMap } from './campusService';

export const ZONE_QR_PREFIX = 'SB-ZONE';
export const ZONE_QR_VERSION = '1';

export interface ParsedZoneQr {
  orgId: string;
  zoneId: string;
}

/**
 * Parse a scanned QR string. Returns null for anything that isn't a
 * well-formed zone QR — including URLs, payment codes, and garbage.
 * The scanner must treat null as "not a temple code".
 */
export function parseZoneQr(raw: string): ParsedZoneQr | null {
  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  // Strict format — no URLs, no extra segments, no query strings.
  const m = /^SB-ZONE:1:([A-Za-z0-9_-]{1,64}):([A-Za-z0-9_-]{1,64})$/.exec(t);
  if (!m) return null;
  return { orgId: m[1], zoneId: m[2] };
}

/** Build the QR payload string for a zone (used by CampusBuilder). */
export function buildZoneQrPayload(orgId: string, zoneId: string): string {
  return `${ZONE_QR_PREFIX}:${ZONE_QR_VERSION}:${orgId}:${zoneId}`;
}

export type ZoneQrVerification =
  | { ok: true; orgId: string; orgName: string; zoneId: string; zoneName: string }
  | { ok: false; reason: 'bad_format' | 'unknown_org' | 'unknown_zone' };

/**
 * Verify a scanned QR against the org's PUBLISHED campus map.
 * Fails closed: unknown org, unknown zone, or fetch failure → not verified.
 * This is the anti-phishing gate — a fake QR cannot invent a zone.
 */
export async function verifyZoneQr(raw: string): Promise<ZoneQrVerification> {
  const parsed = parseZoneQr(raw);
  if (!parsed) return { ok: false, reason: 'bad_format' };
  let map: Awaited<ReturnType<typeof getCampusMap>>;
  try {
    map = await getCampusMap(parsed.orgId);
  } catch {
    return { ok: false, reason: 'unknown_org' };
  }
  if (!map) return { ok: false, reason: 'unknown_org' };
  const zone = map.zones.find((z) => z.id === parsed.zoneId);
  if (!zone) return { ok: false, reason: 'unknown_zone' };
  return {
    ok: true,
    orgId: map.orgId,
    orgName: map.orgName,
    zoneId: zone.id,
    zoneName: zone.name,
  };
}
