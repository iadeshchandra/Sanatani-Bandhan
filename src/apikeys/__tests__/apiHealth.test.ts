/**
 * apiHealth.test.ts — QUEUED #35 (GodMode API Health & Quota desk).
 * Pure logic only: provider error classification, Pacific-day quota
 * maths, ledger bucketing, registry parity, rotation history, impact
 * lines, cache TTL. No Firebase, no network.
 */
import {
  API_DESCRIPTORS,
  bucketIdFor,
  classifyGmapsError,
  classifyGoogleError,
  descriptorFor,
  effectiveLimit,
  goodCheckInfo,
  healthState,
  impactFor,
  isCacheFresh,
  maskTail,
  nextPacificMidnight,
  pacificDayKey,
  quotaBand,
  quotaRatio,
  rotateGoodCheck,
  type ProbeResult,
} from '../apiHealth';
import { PROBES } from '../apiProbes';
import { applyUse, pruneLedger, todayBucket, type UsageLedger } from '../apiUsage';

const YT_ERROR = (reason: string, status = 403, message = 'err') => ({
  error: { code: status, message, status: 'PERMISSION_DENIED', errors: [{ reason, domain: 'usageLimits', message }] },
});

describe('classifyGoogleError — YouTube/Gemini error shapes', () => {
  it('keyInvalid reason → invalid_key', () => {
    expect(classifyGoogleError(400, YT_ERROR('keyInvalid', 400, 'API key not valid'))).toBe('invalid_key');
  });
  it('"API key not valid" message alone → invalid_key (Gemini 400 shape)', () => {
    expect(
      classifyGoogleError(400, { error: { code: 400, message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT' } }),
    ).toBe('invalid_key');
  });
  it('quotaExceeded → quota_exceeded', () => {
    expect(classifyGoogleError(403, YT_ERROR('quotaExceeded'))).toBe('quota_exceeded');
  });
  it('dailyLimitExceeded → quota_exceeded', () => {
    expect(classifyGoogleError(403, YT_ERROR('dailyLimitExceeded'))).toBe('quota_exceeded');
  });
  it('RESOURCE_EXHAUSTED status → quota_exceeded (Gemini 429 shape)', () => {
    expect(
      classifyGoogleError(429, { error: { code: 429, message: 'Quota exceeded', status: 'RESOURCE_EXHAUSTED' } }),
    ).toBe('quota_exceeded');
  });
  it('rateLimitExceeded → rate_limited; bare 429 → rate_limited', () => {
    expect(classifyGoogleError(403, YT_ERROR('rateLimitExceeded'))).toBe('rate_limited');
    expect(classifyGoogleError(429, { error: { message: 'slow down' } })).toBe('rate_limited');
  });
  it('API not enabled for project → not_activated', () => {
    expect(
      classifyGoogleError(403, {
        error: { message: 'YouTube Data API v3 has not been used in project 123 before or it is disabled.' },
      }),
    ).toBe('not_activated');
    expect(classifyGoogleError(403, YT_ERROR('accessNotConfigured'))).toBe('not_activated');
  });
  it('generic 500 → http_error; 401 → invalid_key', () => {
    expect(classifyGoogleError(500, { error: { message: 'boom' } })).toBe('http_error');
    expect(classifyGoogleError(401, null)).toBe('invalid_key');
  });
});

describe('classifyGmapsError', () => {
  it('OK / ZERO_RESULTS → ok', () => {
    expect(classifyGmapsError({ status: 'OK' })).toBe('ok');
    expect(classifyGmapsError({ status: 'ZERO_RESULTS' })).toBe('ok');
  });
  it('REQUEST_DENIED with key message → invalid_key', () => {
    expect(
      classifyGmapsError({ status: 'REQUEST_DENIED', error_message: 'The provided API key is invalid.' }),
    ).toBe('invalid_key');
  });
  it('OVER_QUERY_LIMIT → quota_exceeded', () => {
    expect(classifyGmapsError({ status: 'OVER_QUERY_LIMIT' })).toBe('quota_exceeded');
  });
});

describe('Pacific quota day maths (Google resets at midnight Los Angeles)', () => {
  it('pacificDayKey: same UTC day, different PT day across the offset', () => {
    // 2026-10-20T06:30Z is still Oct 19 in Los Angeles (PDT, UTC-7).
    expect(pacificDayKey(Date.UTC(2026, 9, 20, 6, 30))).toBe('2026-10-19');
    expect(pacificDayKey(Date.UTC(2026, 9, 20, 7, 30))).toBe('2026-10-20');
    // Winter: PST (UTC-8).
    expect(pacificDayKey(Date.UTC(2026, 0, 15, 7, 30))).toBe('2026-01-14');
    expect(pacificDayKey(Date.UTC(2026, 0, 15, 8, 30))).toBe('2026-01-15');
  });
  it('nextPacificMidnight: 07:00Z in PDT, 08:00Z in PST', () => {
    expect(nextPacificMidnight(Date.UTC(2026, 9, 20, 12, 0))).toBe(Date.UTC(2026, 9, 21, 7, 0));
    expect(nextPacificMidnight(Date.UTC(2026, 0, 15, 12, 0))).toBe(Date.UTC(2026, 0, 16, 8, 0));
  });
  it('nextPacificMidnight is strictly after now and lands on a PT day boundary', () => {
    const now = Date.UTC(2026, 10, 1, 10, 0); // DST ends Nov 1, 2026
    const next = nextPacificMidnight(now);
    expect(next).toBeGreaterThan(now);
    expect(pacificDayKey(next)).not.toBe(pacificDayKey(now));
    expect(pacificDayKey(next - 1)).toBe(pacificDayKey(now));
  });
  it('bucketIdFor embeds api + PT day', () => {
    expect(bucketIdFor('youtube', Date.UTC(2026, 9, 20, 12, 0))).toBe('youtube_2026-10-20');
  });
});

describe('quota ratio + bands', () => {
  it('thresholds: <0.8 normal, 0.8 near, ≥1 full', () => {
    expect(quotaBand(quotaRatio(790, 1000))).toBe('normal');
    expect(quotaBand(quotaRatio(800, 1000))).toBe('near');
    expect(quotaBand(quotaRatio(1000, 1000))).toBe('full');
    expect(quotaBand(quotaRatio(1500, 1000))).toBe('full');
  });
  it('degenerate inputs are safe', () => {
    expect(quotaRatio(10, 0)).toBe(0);
    expect(quotaRatio(-5, 100)).toBe(0);
  });
  it('effectiveLimit honors owner assumptions only where editable', () => {
    const yt = descriptorFor('youtube')!;
    const gem = descriptorFor('gemini')!;
    const carto = descriptorFor('carto')!;
    expect(effectiveLimit(yt, {})).toBe(10_000);
    expect(effectiveLimit(yt, { youtubeDailyUnits: 20_000 })).toBe(20_000);
    expect(effectiveLimit(gem, { geminiDailyRequests: 500 })).toBe(500);
    expect(effectiveLimit(carto, { youtubeDailyUnits: 1 })).toBe(5_000_000);
    expect(effectiveLimit(descriptorFor('nominatim')!, {})).toBeNull();
  });
});

describe('usage ledger bucketing (pure core of apiUsage)', () => {
  const t0 = Date.UTC(2026, 9, 20, 12, 0); // PT Oct 20
  it('accumulates calls and units into the Pacific-day bucket', () => {
    let l: UsageLedger = {};
    l = applyUse(l, 'youtube', 1, 100, t0);
    l = applyUse(l, 'youtube', 1, 100, t0 + 60_000);
    l = applyUse(l, 'gemini', 3, 3, t0);
    expect(todayBucket(l, 'youtube', t0)).toEqual({ calls: 2, units: 200 });
    expect(todayBucket(l, 'gemini', t0)).toEqual({ calls: 3, units: 3 });
  });
  it('a new Pacific day starts a fresh bucket (no bleed across reset)', () => {
    let l: UsageLedger = {};
    l = applyUse(l, 'youtube', 1, 100, t0);
    const afterReset = nextPacificMidnight(t0) + 1;
    expect(todayBucket(l, 'youtube', afterReset)).toEqual({ calls: 0, units: 0 });
    l = applyUse(l, 'youtube', 1, 100, afterReset);
    expect(todayBucket(l, 'youtube', afterReset)).toEqual({ calls: 1, units: 100 });
    expect(todayBucket(l, 'youtube', t0)).toEqual({ calls: 1, units: 100 });
  });
  it('zero/negative deltas never create buckets', () => {
    expect(applyUse({}, 'youtube', 0, 0, t0)).toEqual({});
    expect(applyUse({}, 'youtube', -1, -5, t0)).toEqual({});
  });
  it('pruneLedger drops buckets older than the keep window', () => {
    const old = bucketIdFor('youtube', t0 - 60 * 24 * 3600 * 1000);
    const fresh = bucketIdFor('youtube', t0);
    const pruned = pruneLedger({ [old]: { calls: 1, units: 1 }, [fresh]: { calls: 2, units: 2 } }, t0);
    expect(pruned[fresh]).toEqual({ calls: 2, units: 2 });
    expect(pruned[old]).toBeUndefined();
  });
});

describe('healthState — the status light', () => {
  const res = (outcome: ProbeResult['outcome']): ProbeResult => ({
    apiId: 'youtube', outcome, httpStatus: 200, latencyMs: 10, detail: '', checkedAt: 1, probeCostUnits: 0,
  });
  it('unconfigured beats everything; untested when no result', () => {
    expect(healthState(null, { configured: false, ratio: null })).toBe('not_configured');
    expect(healthState(null, { configured: true, ratio: null })).toBe('untested');
  });
  it('ok + high tracked ratio → quota_near (still working)', () => {
    expect(healthState(res('ok'), { configured: true, ratio: 0.5 })).toBe('ok');
    expect(healthState(res('ok'), { configured: true, ratio: 0.85 })).toBe('quota_near');
    expect(healthState(res('ok'), { configured: true, ratio: null })).toBe('ok');
  });
  it('quota_exceeded → quota_full; rate_limited → quota_near; bad key → failing', () => {
    expect(healthState(res('quota_exceeded'), { configured: true, ratio: 1 })).toBe('quota_full');
    expect(healthState(res('rate_limited'), { configured: true, ratio: null })).toBe('quota_near');
    expect(healthState(res('invalid_key'), { configured: true, ratio: null })).toBe('failing');
    expect(healthState(res('network_error'), { configured: true, ratio: null })).toBe('failing');
  });
});

describe('dark-feature clarity — impact lines', () => {
  it('every descriptor carries a feature + a plain down-impact', () => {
    for (const d of API_DESCRIPTORS) {
      expect(d.feature.length).toBeGreaterThan(0);
      expect(d.downImpact.length).toBeGreaterThan(0);
    }
  });
  it('impact shows for down states, never for healthy ones', () => {
    const yt = descriptorFor('youtube')!;
    expect(impactFor(yt, 'not_configured')).toContain('Live Darshan');
    expect(impactFor(yt, 'failing')).toContain('Live Darshan');
    expect(impactFor(yt, 'ok')).toBeNull();
    expect(impactFor(yt, 'quota_near')).toBeNull();
    expect(impactFor(yt, 'untested')).toBeNull();
  });
});

describe('registry parity — desk renders from the registry', () => {
  it('every descriptor has exactly one probe, and vice versa', () => {
    const descIds = API_DESCRIPTORS.map((d) => d.id).sort();
    const probeIds = Object.keys(PROBES).sort();
    expect(probeIds).toEqual(descIds);
  });
  it('keyed descriptors name their key field; keyless ones do not', () => {
    for (const d of API_DESCRIPTORS) {
      if (d.keySource === 'owner') expect(d.keyName).toBeTruthy();
      if (d.keySource === 'keyless') expect(d.keyName).toBeNull();
    }
    expect(descriptorFor('youtube')!.keyName).toBe('youtubeDataApi');
    expect(descriptorFor('carto')!.keyName).toBe('cartoApiKey');
  });
  it('untrackable quotas are honestly marked untracked', () => {
    expect(descriptorFor('carto')!.quota).toMatchObject({ tracked: false });
    expect(descriptorFor('ipapi')!.quota).toMatchObject({ tracked: false });
    expect(descriptorFor('youtube')!.quota).toMatchObject({ tracked: true });
  });
});

describe('rotation-safe history', () => {
  const goodRes: ProbeResult = {
    apiId: 'youtube', outcome: 'ok', httpStatus: 200, latencyMs: 42, detail: '', checkedAt: 1000, probeCostUnits: 1,
  };
  const badRes: ProbeResult = { ...goodRes, outcome: 'invalid_key', checkedAt: 2000 };
  it('a good check is recorded; a later bad check never erases it', () => {
    const g1 = rotateGoodCheck(null, goodRes, '••••AAAA');
    expect(g1?.keyTail).toBe('••••AAAA');
    const g2 = rotateGoodCheck(g1, badRes, '••••BBBB');
    expect(g2?.keyTail).toBe('••••AAAA');
    expect(g2?.result.checkedAt).toBe(1000);
  });
  it('goodCheckInfo flags rotation when the bad check used a different key', () => {
    const g = rotateGoodCheck(null, goodRes, '••••AAAA');
    const info = goodCheckInfo(g, badRes, '••••BBBB');
    expect(info).toEqual({ checkedAt: 1000, keyTail: '••••AAAA', rotated: true });
    expect(goodCheckInfo(g, badRes, '••••AAAA')?.rotated).toBe(false);
  });
  it('no info line when the current check is itself good', () => {
    const g = rotateGoodCheck(null, goodRes, '••••AAAA');
    expect(goodCheckInfo(g, goodRes, '••••AAAA')).toBeNull();
    expect(goodCheckInfo(null, badRes, '••••BBBB')).toBeNull();
  });
});

describe('masking + cache TTL (hot activation)', () => {
  it('maskTail exposes only the last 4 — never the middle', () => {
    const key = 'AIzaSyDUMMYKEYVALUE1234567890wxyz';
    const masked = maskTail(key);
    expect(masked).toBe('••••wxyz');
    expect(masked).not.toContain('DUMMY');
    expect(maskTail('abc')).toBe('••••');
    expect(maskTail('')).toBe('');
  });
  it('isCacheFresh: fresh inside TTL, stale at/after, never when unstamped', () => {
    const ttl = 60_000;
    expect(isCacheFresh(1_000, 1_000 + ttl - 1, ttl)).toBe(true);
    expect(isCacheFresh(1_000, 1_000 + ttl, ttl)).toBe(false);
    expect(isCacheFresh(0, 5_000, ttl)).toBe(false);
  });
});
