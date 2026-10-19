/**
 * campus/__tests__/zoneLoops.test.ts — Step 10: wired maps loops.
 * =====================================================================
 * Covers the two loops that were built but had zero callers:
 *  1. Zone QR check-in loop (parse → verify → pre-filled check-in)
 *  2. Sevadar live reporting (role gate, expiry, report meta)
 *
 * Pure-function tests only — no Firebase, no camera, no DOM.
 * Firebase modules are stubbed (repo's CommonJS jest setup).
 */
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  onSnapshot: jest.fn(),
  orderBy: jest.fn(),
  query: jest.fn(),
  serverTimestamp: jest.fn(),
  setDoc: jest.fn(),
  where: jest.fn(),
}));
jest.mock('../../firebase', () => ({ db: {} }));
jest.mock('../../lib/firebase', () => ({ db: {} }));
jest.mock('../../lib/firestoreAdmin', () => ({ OWNER_EMAIL: 'iadeshchandra@gmail.com' }));

import { parseZoneQr, buildZoneQrPayload, ZONE_QR_PREFIX, ZONE_QR_VERSION } from '../zoneQr';
import {
  reportExpiryMs,
  isReportLive,
  REPORT_META,
  canSubmitZoneReport,
  type ZoneReport,
  type ReportType,
} from '../reporting';

describe('zone QR payload', () => {
  it('builds the canonical SB-ZONE:1:{orgId}:{zoneId} format', () => {
    expect(buildZoneQrPayload('org_123', 'zone_abc')).toBe('SB-ZONE:1:org_123:zone_abc');
    expect(ZONE_QR_PREFIX).toBe('SB-ZONE');
    expect(ZONE_QR_VERSION).toBe('1');
  });

  it('parses a well-formed zone QR', () => {
    const p = parseZoneQr('SB-ZONE:1:org_123:zone_abc');
    expect(p).toEqual({ orgId: 'org_123', zoneId: 'zone_abc' });
  });

  it('round-trips build → parse', () => {
    const raw = buildZoneQrPayload('dakshineswar', 'prasad-counter');
    expect(parseZoneQr(raw)).toEqual({ orgId: 'dakshineswar', zoneId: 'prasad-counter' });
  });

  it('rejects URLs (anti-phishing gate 1)', () => {
    expect(parseZoneQr('https://evil.com/SB-ZONE:1:a:b')).toBeNull();
    expect(parseZoneQr('SB-ZONE:1:a:b?x=1')).toBeNull();
  });

  it('rejects payment codes and garbage', () => {
    expect(parseZoneQr('SB-P2P:1:req:100:BDT:uid')).toBeNull();
    expect(parseZoneQr('')).toBeNull();
    expect(parseZoneQr('SB-ZONE:2:org:zone')).toBeNull(); // wrong version
    expect(parseZoneQr('SB-ZONE:1:org')).toBeNull(); // missing segment
    expect(parseZoneQr('SB-ZONE:1:org:zone:extra')).toBeNull(); // extra segment
    expect(parseZoneQr('  SB-ZONE:1:org:zone  ')).not.toBeNull(); // trims whitespace
  });

  it('rejects non-strings safely', () => {
    expect(parseZoneQr(null as any)).toBeNull();
    expect(parseZoneQr(undefined as any)).toBeNull();
  });
});

describe('sevadar report expiry', () => {
  it('expires after 2h in normal mode', () => {
    expect(reportExpiryMs(false)).toBe(2 * 60 * 60 * 1000);
  });

  it('expires after 30min in festival mode', () => {
    expect(reportExpiryMs(true)).toBe(30 * 60 * 1000);
  });

  it('isReportLive hides expired reports', () => {
    const now = Date.now();
    const live = { expiresAt: now + 1000 } as ZoneReport;
    const dead = { expiresAt: now - 1000 } as ZoneReport;
    const edge = { expiresAt: now } as ZoneReport;
    expect(isReportLive(live, now)).toBe(true);
    expect(isReportLive(dead, now)).toBe(false);
    expect(isReportLive(edge, now)).toBe(false); // boundary: not live
  });
});

describe('report metadata', () => {
  it('every report type has icon + label + tone', () => {
    const types: ReportType[] = [
      'queue_long', 'queue_short', 'counter_open', 'counter_closed',
      'lost_child', 'medical_needed', 'crowded', 'all_clear',
    ];
    for (const t of types) {
      const meta = REPORT_META[t];
      expect(meta.icon).toBeTruthy();
      expect(meta.label).toBeTruthy();
      expect(['warn', 'good', 'alert']).toContain(meta.tone);
    }
  });

  it('alert tones are reserved for urgent types', () => {
    expect(REPORT_META.lost_child.tone).toBe('alert');
    expect(REPORT_META.medical_needed.tone).toBe('alert');
    expect(REPORT_META.all_clear.tone).toBe('good');
  });
});

describe('canSubmitZoneReport (client-side gate)', () => {
  const OWNER = 'iadeshchandra@gmail.com';
  it('allows sevadar-grade roles', () => {
    for (const role of ['sevadar', 'Sevadar', 'SEVADAR', 'trustee', 'coordinator', 'superadmin']) {
      expect(canSubmitZoneReport(role, 'someone@x.com', OWNER)).toBe(true);
    }
  });

  it('denies devotees and empty roles', () => {
    expect(canSubmitZoneReport('devotee', 'd@x.com', OWNER)).toBe(false);
    expect(canSubmitZoneReport(undefined, 'd@x.com', OWNER)).toBe(false);
    expect(canSubmitZoneReport('', '', OWNER)).toBe(false);
  });

  it('always allows the platform owner', () => {
    expect(canSubmitZoneReport(undefined, OWNER, OWNER)).toBe(true);
    expect(canSubmitZoneReport('devotee', OWNER.toUpperCase(), OWNER)).toBe(true);
  });
});
