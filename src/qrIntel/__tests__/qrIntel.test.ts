/**
 * qrIntel/__tests__/qrIntel.test.ts — QR Intelligence Phase 1 pure-logic tests.
 */
import {
  hashScanner,
  isValidScanOutcome,
  isValidQrType,
  isValidScannerHash,
  buildScanEvent,
  initialScanStats,
  applyScanToStats,
  funnelMath,
  rankQrStats,
  scansPerDay,
  MAX_SCANNER_HASHES,
  UNKNOWN_QR_ID,
  SCAN_EVENT_KEYS,
  SCAN_STATS_KEYS,
  type QrScanStats,
  type QrScanEvent,
} from '../qrIntel';

const H1 = 'a'.repeat(64);
const H2 = 'b'.repeat(64);

function stats(over: Partial<QrScanStats> = {}): QrScanStats {
  return {
    qrId: 'req1',
    qrType: 'p2p',
    totalScans: 0,
    uniqueScanners: 0,
    scannerHashes: [],
    parsed: 0,
    invalid: 0,
    expired: 0,
    completions: 0,
    failures: 0,
    lastScannedAt: 1000,
    firstSeenAt: 1000,
    ...over,
  };
}

function event(over: Partial<QrScanEvent> = {}): QrScanEvent {
  return {
    qrId: 'req1',
    qrType: 'p2p',
    scannerHash: H1,
    outcome: 'parsed',
    scannedAt: 2000,
    ...over,
  };
}

describe('hashScanner', () => {
  it('produces a 64-char lowercase hex digest', async () => {
    const h = await hashScanner('user123');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });
  it('is consistent for the same uid', async () => {
    expect(await hashScanner('user123')).toBe(await hashScanner('user123'));
  });
  it('differs across uids', async () => {
    expect(await hashScanner('user123')).not.toBe(await hashScanner('user456'));
  });
  it('never contains the raw uid', async () => {
    const h = await hashScanner('user123');
    expect(h.includes('user123')).toBe(false);
  });
});

describe('validators', () => {
  it('accepts known outcomes and rejects unknown', () => {
    expect(isValidScanOutcome('parsed')).toBe(true);
    expect(isValidScanOutcome('payment_completed')).toBe(true);
    expect(isValidScanOutcome('hacked')).toBe(false);
    expect(isValidScanOutcome(undefined)).toBe(false);
  });
  it('accepts p2p type and rejects unknown', () => {
    expect(isValidQrType('p2p')).toBe(true);
    expect(isValidQrType('donation')).toBe(false);
  });
  it('validates scanner hash shape', () => {
    expect(isValidScannerHash(H1)).toBe(true);
    expect(isValidScannerHash('xyz')).toBe(false);
    expect(isValidScannerHash('A'.repeat(64))).toBe(false); // uppercase rejected
  });
});

describe('buildScanEvent', () => {
  it('builds a whitelist-exact event', () => {
    const e = buildScanEvent({
      qrId: 'req1',
      qrType: 'p2p',
      scannerHash: H1,
      outcome: 'parsed',
      amount: 500,
      currency: 'BDT',
    });
    expect(e.qrId).toBe('req1');
    expect(e.amount).toBe(500);
    expect(e.currency).toBe('BDT');
    expect(typeof e.scannedAt).toBe('number');
  });
  it('strips undefined optionals (no Firestore-rejected undefined)', () => {
    const e = buildScanEvent({ qrId: 'req1', qrType: 'p2p', scannerHash: H1, outcome: 'invalid' });
    expect('amount' in e).toBe(false);
    expect('currency' in e).toBe(false);
    expect(JSON.stringify(e)).not.toContain('undefined');
  });
  it('throws on invalid shape (fail-closed)', () => {
    expect(() =>
      buildScanEvent({ qrId: '', qrType: 'p2p', scannerHash: H1, outcome: 'parsed' }),
    ).toThrow();
    expect(() =>
      buildScanEvent({ qrId: 'r', qrType: 'p2p', scannerHash: 'bad', outcome: 'parsed' }),
    ).toThrow();
    expect(() =>
      buildScanEvent({ qrId: 'r', qrType: 'p2p', scannerHash: H1, outcome: 'nope' as never }),
    ).toThrow();
  });
  it('event keys match the declared whitelist constant', () => {
    const e = buildScanEvent({ qrId: 'r', qrType: 'p2p', scannerHash: H1, outcome: 'parsed' });
    for (const k of Object.keys(e)) {
      expect((SCAN_EVENT_KEYS as readonly string[]).includes(k)).toBe(true);
    }
  });
});

describe('applyScanToStats', () => {
  it('increments totalScans and the outcome counter', () => {
    const next = applyScanToStats(stats(), event({ outcome: 'parsed' }));
    expect(next.totalScans).toBe(1);
    expect(next.parsed).toBe(1);
    expect(next.completions).toBe(0);
  });
  it('counts a new scanner hash as unique', () => {
    const next = applyScanToStats(stats(), event({ scannerHash: H1 }));
    expect(next.uniqueScanners).toBe(1);
    expect(next.scannerHashes).toEqual([H1]);
  });
  it('does not double-count a repeat scanner', () => {
    const s1 = applyScanToStats(stats(), event({ scannerHash: H1 }));
    const s2 = applyScanToStats(s1, event({ scannerHash: H1 }));
    expect(s2.uniqueScanners).toBe(1);
    expect(s2.totalScans).toBe(2);
  });
  it('honors the hash cap (approximate beyond cap)', () => {
    const full = stats({
      scannerHashes: Array.from({ length: MAX_SCANNER_HASHES }, (_, i) => `h${i}`),
      uniqueScanners: MAX_SCANNER_HASHES,
    });
    const next = applyScanToStats(full, event({ scannerHash: H2 }));
    expect(next.scannerHashes.length).toBe(MAX_SCANNER_HASHES);
    expect(next.uniqueScanners).toBe(MAX_SCANNER_HASHES);
    expect(next.totalScans).toBe(1); // scans still counted
  });
  it('updates lastScannedAt to the max', () => {
    const next = applyScanToStats(stats({ lastScannedAt: 5000 }), event({ scannedAt: 3000 }));
    expect(next.lastScannedAt).toBe(5000);
  });
  it('routes payment outcomes to completions/failures', () => {
    const s1 = applyScanToStats(stats(), event({ outcome: 'payment_completed' }));
    expect(s1.completions).toBe(1);
    const s2 = applyScanToStats(stats(), event({ outcome: 'payment_failed' }));
    expect(s2.failures).toBe(1);
  });
  it('stats keys match the declared whitelist constant', () => {
    const s = initialScanStats('r', 'p2p');
    for (const k of Object.keys(s)) {
      expect((SCAN_STATS_KEYS as readonly string[]).includes(k)).toBe(true);
    }
  });
});

describe('funnelMath', () => {
  it('computes conversion and decision rates', () => {
    const f = funnelMath({ parsed: 100, completions: 25, failures: 10, totalScans: 120 });
    expect(f.conversionRate).toBe(0.25);
    expect(f.decisionRate).toBe(0.35);
  });
  it('is zero-division safe', () => {
    const f = funnelMath({ parsed: 0, completions: 0, failures: 0, totalScans: 0 });
    expect(f.conversionRate).toBe(0);
    expect(f.decisionRate).toBe(0);
    expect(Number.isNaN(f.conversionRate)).toBe(false);
  });
});

describe('rankQrStats', () => {
  it('sorts by scans desc, then recency', () => {
    const a = stats({ qrId: 'a', totalScans: 5, lastScannedAt: 100 });
    const b = stats({ qrId: 'b', totalScans: 10, lastScannedAt: 50 });
    const c = stats({ qrId: 'c', totalScans: 5, lastScannedAt: 200 });
    const ranked = rankQrStats([a, b, c]).map((s) => s.qrId);
    expect(ranked).toEqual(['b', 'c', 'a']);
  });
});

describe('scansPerDay', () => {
  it('buckets events into per-day counts, oldest first', () => {
    const dayMs = 86_400_000;
    const now = Math.floor(Date.now() / dayMs) * dayMs + 1000; // start of today + 1s
    const events = [
      { scannedAt: now }, // today
      { scannedAt: now - dayMs }, // yesterday
      { scannedAt: now - dayMs }, // yesterday
      { scannedAt: now - 30 * dayMs }, // outside window
    ];
    const buckets = scansPerDay(events, 7, now);
    expect(buckets.length).toBe(7);
    expect(buckets[6].scans).toBe(1); // today is last
    expect(buckets[5].scans).toBe(2); // yesterday
    expect(buckets[0].scans).toBe(0);
  });
});

describe('UNKNOWN_QR_ID', () => {
  it('is a stable sentinel for unparseable scans', () => {
    expect(typeof UNKNOWN_QR_ID).toBe('string');
    expect(UNKNOWN_QR_ID.length).toBeGreaterThan(0);
  });
});
