/**
 * campus/__tests__/scanDoor.test.ts — the campus map's scan door.
 * =====================================================================
 * Audit 2026-10-20, offense #6: ZoneQrScanSheet's only production mount
 * was inside the Tirtha check-in form — four taps from the campus map,
 * the very screen a devotee opens while standing at the temple. The
 * repair mounts the scanner on CampusView itself.
 *
 * Pins:
 *  1. checkinPrefillFromScan() — the pure scan → check-in mapping is
 *     identical to the one VisitCheckinSheet applies internally
 *     ("Org · Zone" + orgId), so both doors fill the form the same way.
 *  2. Wiring (fs-scan, house pattern): CampusView mounts the scanner
 *     trigger, the scanner, and the pre-filled check-in sheet.
 */
import * as fs from 'fs';
import * as path from 'path';
import { checkinPrefillFromScan } from '../scanCheckin';
import type { ZoneScanSuccess } from '../ZoneQrScanSheet';

const SRC = path.resolve(__dirname, '..', '..');
const src = (rel: string): string => fs.readFileSync(path.join(SRC, rel), 'utf8');

const scan: ZoneScanSuccess = {
  orgId: 'org_kashi',
  orgName: 'Kashi Vishwanath',
  zoneId: 'zone_garbhagriha',
  zoneName: 'Garbhagriha',
};

describe('checkinPrefillFromScan', () => {
  it('maps a verified scan to the diary temple name + org link', () => {
    expect(checkinPrefillFromScan(scan)).toEqual({
      templeName: 'Kashi Vishwanath · Garbhagriha',
      orgId: 'org_kashi',
    });
  });

  it('matches the mapping VisitCheckinSheet applies to its own scanner', () => {
    // VisitCheckinSheet's onQrVerified: `${orgName} · ${zoneName}` + orgId.
    const prefill = checkinPrefillFromScan(scan);
    expect(prefill.templeName).toBe(`${scan.orgName} · ${scan.zoneName}`);
    expect(prefill.orgId).toBe(scan.orgId);
  });
});

describe('CampusView scan-door wiring', () => {
  const view = () => src('campus/CampusView.tsx');

  it('imports and renders the ZoneQrScanSheet', () => {
    expect(view()).toContain("import { ZoneQrScanSheet, type ZoneScanSuccess } from './ZoneQrScanSheet';");
    expect(view()).toContain('<ZoneQrScanSheet onVerified={handleScanVerified}');
  });

  it('offers a labeled scan trigger next to Record-visit (signed-in only)', () => {
    expect(view()).toContain('onClick={() => setScanOpen(true)}');
    expect(view()).toContain("'Scan temple QR'");
  });

  it('a verified scan opens the check-in sheet pre-filled', () => {
    expect(view()).toContain('checkinPrefillFromScan(scan)');
    expect(view()).toContain('initialTemple={scanPrefill.templeName}');
    expect(view()).toContain('initialOrgId={scanPrefill.orgId}');
  });
});
