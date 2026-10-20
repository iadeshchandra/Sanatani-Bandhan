/**
 * apiProbes.ts — the cheapest REAL health check per API (QUEUED #35).
 * ============================================================================
 * REGISTRY-DRIVEN (owner addendum): `PROBES` maps every descriptor id in
 * apiHealth.ts → its probe function. The desk renders and tests purely
 * from the two registries; adding a future provider (e.g. a Gemini
 * vision rung) = one descriptor + one probe entry — no other surgery.
 * A parity test asserts the two registries cover exactly the same ids.
 *
 * Each probe makes one small read-only call and classifies the answer
 * with the pure classifiers in apiHealth.ts. Probes never throw — every
 * failure mode lands in a ProbeResult the desk can show in plain words.
 *
 * Cost honesty:
 *  - YouTube probe = channels.list = 1 unit of the 10,000/day quota.
 *    (Live detection's search.list costs 100 — the probe avoids it.)
 *  - Gemini probe = models list — free, generates nothing.
 *  - CARTO/Esri/OSM probes fetch a single 256px tile at zoom 0.
 *  - Health checks run on demand + at most once per 15 min automatically,
 *    precisely because checks themselves consume quota.
 */
import {
  classifyGmapsError,
  classifyGoogleError,
  detailForOutcome,
  providerMessage,
  YT_PROBE_UNITS,
  type ProbeOutcomeKind,
  type ProbeResult,
} from './apiHealth';

const TIMEOUT_MS = 8_000;
/** Same public channel id the API Keys form test has always used. */
const YT_TEST_CHANNEL = 'UC_x5XG1OV2P6uZZ5FSM9Ttw';

type FetchImpl = typeof fetch;
export type ProbeFn = (key: string | null, fetchImpl: FetchImpl) => Promise<ProbeResult>;

interface RawAnswer {
  status: number;
  body: unknown;
}

async function fetchJson(url: string, fetchImpl: FetchImpl): Promise<RawAnswer> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, { signal: ctrl.signal });
    const body: unknown = await res.json().catch(() => null);
    return { status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchOk(url: string, fetchImpl: FetchImpl): Promise<number> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, { signal: ctrl.signal });
    try {
      await res.body?.cancel();
    } catch {
      /* body already consumed/closed */
    }
    return res.status;
  } finally {
    clearTimeout(timer);
  }
}

function makeResult(apiId: string) {
  return (
    outcome: ProbeOutcomeKind,
    httpStatus: number | null,
    latencyMs: number | null,
    detail: string,
    probeCostUnits = 0,
  ): ProbeResult => ({
    apiId,
    outcome,
    httpStatus,
    latencyMs,
    detail,
    checkedAt: Date.now(),
    probeCostUnits,
  });
}

/* ------------------------------------------------------------ the probes */

const probeYouTube: ProbeFn = async (key, fetchImpl) => {
  const result = makeResult('youtube');
  const started = Date.now();
  if (!key) return result('no_probe', null, null, 'No key configured.');
  const { status, body } = await fetchJson(
    `https://www.googleapis.com/youtube/v3/channels?part=id&id=${YT_TEST_CHANNEL}&key=${encodeURIComponent(key)}`,
    fetchImpl,
  );
  const latency = Date.now() - started;
  if (status >= 200 && status < 300) {
    const items = (body as { items?: unknown })?.items;
    return Array.isArray(items)
      ? result('ok', status, latency, detailForOutcome('ok'), YT_PROBE_UNITS)
      : result('http_error', status, latency, detailForOutcome('http_error', providerMessage(body)), YT_PROBE_UNITS);
  }
  const kind = classifyGoogleError(status, body);
  return result(kind, status, latency, detailForOutcome(kind, providerMessage(body)), YT_PROBE_UNITS);
};

const probeGemini: ProbeFn = async (key, fetchImpl) => {
  const result = makeResult('gemini');
  const started = Date.now();
  if (!key) return result('no_probe', null, null, 'No Gemini key found on this device.');
  const { status, body } = await fetchJson(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}&pageSize=1`,
    fetchImpl,
  );
  const latency = Date.now() - started;
  if (status >= 200 && status < 300) return result('ok', status, latency, detailForOutcome('ok'));
  const kind = classifyGoogleError(status, body);
  return result(kind, status, latency, detailForOutcome(kind, providerMessage(body)));
};

const probeCarto: ProbeFn = async (key, fetchImpl) => {
  const result = makeResult('carto');
  const started = Date.now();
  if (!key) return result('no_probe', null, null, 'No CARTO key published — Esri tiles are in use.');
  const status = await fetchOk(
    `https://basemaps.cartocdn.com/rastertiles/voyager/0/0/0.png?key=${encodeURIComponent(key)}`,
    fetchImpl,
  );
  const latency = Date.now() - started;
  // CARTO answers 200 even for revoked keys (watermark tiles) — the
  // descriptor's probeNote carries that caveat to the card.
  return status >= 200 && status < 300
    ? result('ok', status, latency, 'Tile endpoint reachable (key validity cannot be proven by probe — see note).')
    : result('http_error', status, latency, detailForOutcome('http_error', `HTTP ${status}`));
};

const probeGmaps: ProbeFn = async (key, fetchImpl) => {
  const result = makeResult('gmaps');
  const started = Date.now();
  if (!key) return result('no_probe', null, null, 'No key configured.');
  const { body } = await fetchJson(
    `https://maps.googleapis.com/maps/api/geocode/json?address=Dhaka&key=${encodeURIComponent(key)}`,
    fetchImpl,
  );
  const kind = classifyGmapsError(body);
  return result(
    kind,
    kind === 'ok' ? 200 : null,
    Date.now() - started,
    kind === 'ok' ? detailForOutcome('ok') : detailForOutcome(kind, providerMessage(body)),
  );
};

const probeNominatim: ProbeFn = async (_key, fetchImpl) => {
  const result = makeResult('nominatim');
  const started = Date.now();
  const { status, body } = await fetchJson(
    'https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=23.8103&lon=90.4125',
    fetchImpl,
  );
  const latency = Date.now() - started;
  return status >= 200 && status < 300 && body && typeof body === 'object'
    ? result('ok', status, latency, detailForOutcome('ok'))
    : result('http_error', status, latency, detailForOutcome('http_error', `HTTP ${status}`));
};

const probeIpapi: ProbeFn = async (_key, fetchImpl) => {
  const result = makeResult('ipapi');
  const started = Date.now();
  const { status, body } = await fetchJson('https://ipapi.co/json/', fetchImpl);
  const latency = Date.now() - started;
  if (status === 429) return result('rate_limited', status, latency, detailForOutcome('rate_limited'));
  const b = body as { country_code?: unknown; ip?: unknown } | null;
  return status >= 200 && status < 300 && b && (b.country_code || b.ip)
    ? result('ok', status, latency, detailForOutcome('ok'))
    : result('http_error', status, latency, detailForOutcome('http_error', `HTTP ${status}`));
};

const probeEsri: ProbeFn = async (_key, fetchImpl) => {
  const result = makeResult('esri');
  const started = Date.now();
  const status = await fetchOk(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/0/0/0',
    fetchImpl,
  );
  const latency = Date.now() - started;
  return status >= 200 && status < 300
    ? result('ok', status, latency, detailForOutcome('ok'))
    : result('http_error', status, latency, detailForOutcome('http_error', `HTTP ${status}`));
};

const probeOsm: ProbeFn = async (_key, fetchImpl) => {
  const result = makeResult('osm');
  const started = Date.now();
  const status = await fetchOk('https://tile.openstreetmap.org/0/0/0.png', fetchImpl);
  const latency = Date.now() - started;
  return status >= 200 && status < 300
    ? result('ok', status, latency, detailForOutcome('ok'))
    : result('http_error', status, latency, detailForOutcome('http_error', `HTTP ${status}`));
};

/** The probe registry — keys MUST match API_DESCRIPTORS ids (parity-tested). */
export const PROBES: Record<string, ProbeFn> = {
  youtube: probeYouTube,
  gemini: probeGemini,
  carto: probeCarto,
  gmaps: probeGmaps,
  nominatim: probeNominatim,
  ipapi: probeIpapi,
  esri: probeEsri,
  osm: probeOsm,
};

/**
 * Run one probe by descriptor id. `key` is the resolved key for keyed
 * APIs (owner doc value for owner keys; device-resolved for Gemini);
 * null for keyless APIs or when no key is configured.
 */
export async function runProbe(
  apiId: string,
  key: string | null,
  fetchImpl: FetchImpl = fetch,
): Promise<ProbeResult> {
  const probe = PROBES[apiId];
  if (!probe) {
    return {
      apiId,
      outcome: 'no_probe',
      httpStatus: null,
      latencyMs: null,
      detail: detailForOutcome('no_probe'),
      checkedAt: Date.now(),
      probeCostUnits: 0,
    };
  }
  try {
    return await probe(key, fetchImpl);
  } catch {
    return {
      apiId,
      outcome: 'network_error',
      httpStatus: null,
      latencyMs: null,
      detail: detailForOutcome('network_error'),
      checkedAt: Date.now(),
      probeCostUnits: 0,
    };
  }
}
