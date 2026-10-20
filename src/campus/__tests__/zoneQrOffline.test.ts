/**
 * campus/__tests__/zoneQrOffline.test.ts — Queued #20: offline zone-QR
 * verification.
 * =====================================================================
 * The ladder under test (zoneQr.ts):
 *   published map (online) → cached map (offline, real names) →
 *   v2 checksum on-device (offline, honestly labelled) →
 *   v1 offline with no cache = 'offline_unverifiable' (never faked).
 *
 * campusService is mocked so getCampusMap can be driven online /
 * missing / unreachable without Firebase. localStorage is stubbed
 * in-memory (jest runs in the node environment).
 */
jest.mock('../campusService', () => ({
  getCampusMap: jest.fn(),
}));

import { getCampusMap } from '../campusService';
import {
  parseZoneQr,
  buildZoneQrPayload,
  buildZoneQrPayloadV1,
  zoneChecksum,
  zoneChecksumMatches,
  humanizeZoneId,
  verifyZoneQr,
  verifyZoneQrLocal,
} from '../zoneQr';
import { rememberCampusMap, getCachedCampusMap, listCachedCampusMaps } from '../mapCache';
import { checkinPrefillFromScan } from '../scanCheckin';
import type { CampusMap } from '../types';
import type { CachedCampusMap } from '../mapCache';

const mockGetCampusMap = getCampusMap as jest.MockedFunction<typeof getCampusMap>;

// --- in-memory localStorage stub (node test env has none) -----------
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
};

const MAP: CampusMap = {
  orgId: 'dakshineswar',
  orgName: 'Dakshineswar Kali Temple',
  mode: 'image',
  zones: [
    { id: 'zone_garbhagriha', name: 'Garbhagriha', category: 'garbhagriha' },
    { id: 'zone_prasad_counter', name: 'Prasad Counter', category: 'prasad' },
  ],
  updatedAt: 1,
  updatedBy: 'trustee',
};

const CACHED: CachedCampusMap = {
  orgId: 'dakshineswar',
  orgName: 'Dakshineswar Kali Temple',
  zones: [
    { id: 'zone_garbhagriha', name: 'Garbhagriha' },
    { id: 'zone_prasad_counter', name: 'Prasad Counter' },
  ],
  cachedAt: 1,
};

beforeEach(() => {
  store.clear();
  mockGetCampusMap.mockReset();
});

describe('v2 checksum (integrity segment)', () => {
  it('is deterministic and 6 base36 chars', () => {
    const c = zoneChecksum('dakshineswar', 'zone_prasad_counter');
    expect(c).toMatch(/^[a-z0-9]{6}$/);
    expect(zoneChecksum('dakshineswar', 'zone_prasad_counter')).toBe(c);
  });

  it('differs when org or zone differs', () => {
    const base = zoneChecksum('org_a', 'zone_a');
    expect(zoneChecksum('org_b', 'zone_a')).not.toBe(base);
    expect(zoneChecksum('org_a', 'zone_b')).not.toBe(base);
  });

  it('matches for builder output, fails for a tampered zoneId', () => {
    const raw = buildZoneQrPayload('dakshineswar', 'zone_prasad_counter');
    expect(zoneChecksumMatches(parseZoneQr(raw)!)).toBe(true);
    const tampered = raw.replace('zone_prasad_counter', 'zone_prasad_counteq');
    const p = parseZoneQr(tampered);
    expect(p).not.toBeNull(); // still structurally well-formed…
    expect(zoneChecksumMatches(p!)).toBe(false); // …but the integrity segment betrays it
  });

  it('fails when the check segment itself is edited', () => {
    const raw = buildZoneQrPayload('dakshineswar', 'zone_prasad_counter');
    const good = zoneChecksum('dakshineswar', 'zone_prasad_counter');
    const bad = good === 'zzzzzz' ? 'yyyyyy' : 'zzzzzz';
    const p = parseZoneQr(raw.replace(good, bad));
    expect(p).not.toBeNull();
    expect(zoneChecksumMatches(p!)).toBe(false);
  });

  it('v1 payloads carry no segment and trivially match (backwards compat)', () => {
    const p = parseZoneQr(buildZoneQrPayloadV1('org_123', 'zone_abc'));
    expect(p).toEqual({ orgId: 'org_123', zoneId: 'zone_abc', version: 1 });
    expect(zoneChecksumMatches(p!)).toBe(true);
  });
});

describe('verifyZoneQrLocal — the offline ladder', () => {
  it('rejects garbage as bad_format', () => {
    expect(verifyZoneQrLocal('https://evil.com', null)).toEqual({ ok: false, reason: 'bad_format' });
    expect(verifyZoneQrLocal('SB-P2P:1:r:1:BDT:u', null)).toEqual({ ok: false, reason: 'bad_format' });
  });

  it('rejects a tampered v2 code as bad_checksum — even with a cached map', () => {
    const raw = buildZoneQrPayload('dakshineswar', 'zone_prasad_counter').replace(
      'zone_prasad_counter',
      'zone_garbhagriha',
    );
    expect(verifyZoneQrLocal(raw, CACHED)).toEqual({ ok: false, reason: 'bad_checksum' });
  });

  it('v2 + no cache → verified on-device, names from the zone id', () => {
    const v = verifyZoneQrLocal(buildZoneQrPayload('newtemple', 'zone_prasad_counter'), null);
    expect(v).toEqual({
      ok: true,
      source: 'device',
      orgId: 'newtemple',
      zoneId: 'zone_prasad_counter',
      zoneName: 'Prasad Counter',
    });
    if (v.ok) expect(v.orgName).toBeUndefined();
  });

  it('v2 + cached map WITH the zone → cached_map wins, real temple names', () => {
    const v = verifyZoneQrLocal(buildZoneQrPayload('dakshineswar', 'zone_prasad_counter'), CACHED);
    expect(v).toEqual({
      ok: true,
      source: 'cached_map',
      orgId: 'dakshineswar',
      orgName: 'Dakshineswar Kali Temple',
      zoneId: 'zone_prasad_counter',
      zoneName: 'Prasad Counter',
    });
  });

  it('v2 + cached map WITHOUT the zone → falls through to device (cache may be stale)', () => {
    const v = verifyZoneQrLocal(buildZoneQrPayload('dakshineswar', 'zone_new_shrine'), CACHED);
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.source).toBe('device');
      expect(v.zoneName).toBe('New Shrine');
    }
  });

  it('v1 + cached map WITH the zone → verified from cache (printed v1 codes work offline)', () => {
    const v = verifyZoneQrLocal(buildZoneQrPayloadV1('dakshineswar', 'zone_garbhagriha'), CACHED);
    expect(v).toEqual({
      ok: true,
      source: 'cached_map',
      orgId: 'dakshineswar',
      orgName: 'Dakshineswar Kali Temple',
      zoneId: 'zone_garbhagriha',
      zoneName: 'Garbhagriha',
    });
  });

  it('v1 + cached map WITHOUT the zone → unknown_zone (map is the authority for v1)', () => {
    expect(verifyZoneQrLocal(buildZoneQrPayloadV1('dakshineswar', 'zone_nope'), CACHED)).toEqual({
      ok: false,
      reason: 'unknown_zone',
    });
  });

  it('v1 + no cache → offline_unverifiable (honest, never faked as verified or fake)', () => {
    expect(verifyZoneQrLocal(buildZoneQrPayloadV1('dakshineswar', 'zone_garbhagriha'), null)).toEqual({
      ok: false,
      reason: 'offline_unverifiable',
    });
  });

  it('a cached map for a DIFFERENT org is ignored', () => {
    const v = verifyZoneQrLocal(buildZoneQrPayloadV1('other', 'zone_garbhagriha'), CACHED);
    expect(v).toEqual({ ok: false, reason: 'offline_unverifiable' });
  });
});

describe('verifyZoneQr — online first, ladder only on fetch failure', () => {
  it('published map verifies with real names', async () => {
    mockGetCampusMap.mockResolvedValue(MAP);
    const v = await verifyZoneQr(buildZoneQrPayload('dakshineswar', 'zone_garbhagriha'));
    expect(v).toEqual({
      ok: true,
      source: 'published_map',
      orgId: 'dakshineswar',
      orgName: 'Dakshineswar Kali Temple',
      zoneId: 'zone_garbhagriha',
      zoneName: 'Garbhagriha',
    });
  });

  it('online v1 codes still verify against the published map (backwards compat)', async () => {
    mockGetCampusMap.mockResolvedValue(MAP);
    const v = await verifyZoneQr(buildZoneQrPayloadV1('dakshineswar', 'zone_prasad_counter'));
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.source).toBe('published_map');
  });

  it('a definitive published-map answer is never overridden by the ladder', async () => {
    mockGetCampusMap.mockResolvedValue(MAP);
    await expect(verifyZoneQr(buildZoneQrPayload('dakshineswar', 'zone_nope'))).resolves.toEqual({
      ok: false,
      reason: 'unknown_zone',
    });
    mockGetCampusMap.mockResolvedValue(null);
    await expect(verifyZoneQr(buildZoneQrPayload('ghost', 'zone_x'))).resolves.toEqual({
      ok: false,
      reason: 'unknown_org',
    });
  });

  it('fetch failure (offline) climbs the ladder: cached map gives real names', async () => {
    rememberCampusMap(MAP);
    mockGetCampusMap.mockRejectedValue(new Error('unavailable'));
    const v = await verifyZoneQr(buildZoneQrPayloadV1('dakshineswar', 'zone_garbhagriha'));
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.source).toBe('cached_map');
      expect(v.orgName).toBe('Dakshineswar Kali Temple');
    }
  });

  it('fetch failure + never-seen temple + v2 → device verification', async () => {
    mockGetCampusMap.mockRejectedValue(new Error('unavailable'));
    const v = await verifyZoneQr(buildZoneQrPayload('faraway', 'zone_main_gate'));
    expect(v.ok).toBe(true);
    if (v.ok) {
      expect(v.source).toBe('device');
      expect(v.zoneName).toBe('Main Gate');
    }
  });

  it('fetch failure + never-seen temple + v1 → offline_unverifiable, not a fake rejection', async () => {
    mockGetCampusMap.mockRejectedValue(new Error('unavailable'));
    await expect(verifyZoneQr(buildZoneQrPayloadV1('faraway', 'zone_main_gate'))).resolves.toEqual({
      ok: false,
      reason: 'offline_unverifiable',
    });
  });

  it('tampered v2 is rejected before any fetch', async () => {
    const raw = buildZoneQrPayload('dakshineswar', 'zone_prasad_counter').replace(
      'zone_prasad_counter',
      'zone_garbhagriha',
    );
    await expect(verifyZoneQr(raw)).resolves.toEqual({ ok: false, reason: 'bad_checksum' });
    expect(mockGetCampusMap).not.toHaveBeenCalled();
  });
});

describe('mapCache', () => {
  it('round-trips a remembered map (id + names only)', () => {
    rememberCampusMap(MAP);
    const c = getCachedCampusMap('dakshineswar');
    expect(c?.orgName).toBe('Dakshineswar Kali Temple');
    expect(c?.zones).toEqual([
      { id: 'zone_garbhagriha', name: 'Garbhagriha' },
      { id: 'zone_prasad_counter', name: 'Prasad Counter' },
    ]);
    expect(getCachedCampusMap('never-seen')).toBeNull();
  });

  it('caps stored orgs and keeps the most recent first', () => {
    for (let i = 0; i < 25; i++) {
      rememberCampusMap({ ...MAP, orgId: `org_${i}` });
    }
    const all = listCachedCampusMaps();
    expect(all.length).toBe(20);
    expect(all[0].orgId).toBe('org_24');
  });

  it('fails open on corrupt storage', () => {
    (globalThis as any).localStorage.setItem('sb_campus_maps_v1', '{not json');
    expect(getCachedCampusMap('dakshineswar')).toBeNull();
    expect(() => rememberCampusMap(MAP)).not.toThrow();
  });
});

describe('humanizeZoneId + offline prefill', () => {
  it('humanizes zone ids for device-verified prefills', () => {
    expect(humanizeZoneId('zone_prasad_counter')).toBe('Prasad Counter');
    expect(humanizeZoneId('zone_garbhagriha')).toBe('Garbhagriha');
    expect(humanizeZoneId('main-gate')).toBe('Main Gate');
  });

  it('check-in prefill without an org name uses the zone name alone (no "undefined ·")', () => {
    const p = checkinPrefillFromScan({
      orgId: 'newtemple',
      zoneId: 'zone_prasad_counter',
      zoneName: 'Prasad Counter',
      offline: true,
    });
    expect(p).toEqual({ templeName: 'Prasad Counter', orgId: 'newtemple' });
  });

  it('check-in prefill with an org name keeps the "Org · Zone" form', () => {
    const p = checkinPrefillFromScan({
      orgId: 'dakshineswar',
      orgName: 'Dakshineswar Kali Temple',
      zoneId: 'zone_prasad_counter',
      zoneName: 'Prasad Counter',
    });
    expect(p.templeName).toBe('Dakshineswar Kali Temple · Prasad Counter');
  });
});
