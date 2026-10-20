/**
 * apiHealth.ts — pure core of the GodMode "API Health & Quota" desk.
 * ============================================================================
 * QUEUED #35. The owner asked: "a system for API so I see all about the
 * api — is it working or not, quota and etc." This module is the desk's
 * brain: the registry of every external API the app calls, classification
 * of provider error shapes into plain outcomes, and the quota maths
 * (Google quotas reset at midnight Pacific — the day buckets follow).
 *
 * HONESTY LAWS baked in here:
 *  - Almost no provider reports live quota usage back to an API key. The
 *    only quota numbers this desk shows are (a) the provider's PUBLISHED
 *    limit and (b) OUR OWN tracked call counts. Every descriptor declares
 *    which of its numbers are tracked, assumed, or simply not knowable —
 *    the UI prints those labels; it never presents an estimate as a fact.
 *  - A probe proves only what it can prove. CARTO answers HTTP 200 with
 *    watermark tiles even for a revoked key, so its probe can prove
 *    "endpoint reachable", never "key valid" — the descriptor says so.
 *
 * This module is firebase-free and fetch-free so it is fully unit-testable.
 * Network lives in apiProbes.ts; persistence in apiHealthStore.ts and
 * apiUsage.ts; UI in admin/ApiHealthDesk.tsx.
 */

/* ------------------------------------------------------------------ types */

export type ProbeOutcomeKind =
  | 'ok'
  | 'invalid_key'
  | 'quota_exceeded'
  | 'rate_limited'
  | 'not_activated'
  | 'http_error'
  | 'network_error'
  | 'no_probe';

export interface ProbeResult {
  apiId: string;
  outcome: ProbeOutcomeKind;
  /** HTTP status when a response was received, else null. */
  httpStatus: number | null;
  /** Round-trip time of the probe, ms. Null when no request was made. */
  latencyMs: number | null;
  /** Plain-words explanation for the owner. */
  detail: string;
  /** Epoch ms when the probe ran. */
  checkedAt: number;
  /** Quota units the probe itself consumed (YouTube channels.list = 1). */
  probeCostUnits: number;
}

export type ApiHealthState =
  | 'ok'
  | 'quota_near'
  | 'quota_full'
  | 'failing'
  | 'untested'
  | 'not_configured';

export type QuotaModel =
  | {
      kind: 'daily-units';
      limit: number;
      unitName: string;
      reset: 'midnight-pacific';
      /** True when the app counts its own calls (apiUsage ledger). */
      tracked: boolean;
    }
  | {
      kind: 'daily-requests';
      limit: number;
      reset: 'midnight-pacific' | 'rolling-24h';
      tracked: boolean;
      /** True when `limit` is a published-but-changeable free-tier figure. */
      limitIsAssumption: boolean;
    }
  | {
      kind: 'monthly-units';
      limit: number;
      unitName: string;
      tracked: boolean;
    }
  | { kind: 'none'; note: string };

export interface ApiDescriptor {
  id: string;
  label: string;
  /** The user-visible feature this API powers. */
  feature: string;
  /** Owner-published key name in GodMode → API Keys, or null. */
  keyName: string | null;
  /**
   * owner  — key the owner manages in the API Keys tab.
   * device — key resolved on the device itself (build env or the user's
   *          own key in Account settings); NOT owner-published.
   * keyless — no key exists.
   */
  keySource: 'owner' | 'device' | 'keyless';
  quota: QuotaModel;
  /** What the health probe can and cannot prove — shown on the card. */
  probeNote: string;
  /**
   * Plain statement of the blast radius when this API is unset/failing —
   * which user-facing feature is affected. Shown on the card whenever the
   * state is not_configured / failing / quota_full (owner addendum #35:
   * "dark-feature clarity" — the owner must always know what a missing
   * key turns off).
   */
  downImpact: string;
}

/** Quota limits the owner may override from the desk (stored in apiHealth). */
export interface QuotaAssumptions {
  youtubeDailyUnits?: number;
  geminiDailyRequests?: number;
}

/* ------------------------------------------------------- call-cost ledger */

/** YouTube search.list — the live-detection call (mirrors darshan/pure). */
export const YT_SEARCH_UNITS = 100;
/** YouTube channels.list — the desk's probe call. Cheapest real check. */
export const YT_PROBE_UNITS = 1;
/** YouTube published free quota: 10,000 units/day, resets midnight PT. */
export const YT_DAILY_UNITS_DEFAULT = 10_000;
/**
 * Gemini free-tier daily request allowance for gemini-2.5-flash, as
 * published by Google AI Studio. These figures change without notice —
 * the desk labels this an ASSUMPTION and lets the owner edit it.
 */
export const GEMINI_DAILY_REQUESTS_DEFAULT = 250;

/* ------------------------------------------------------------- registry */

export const API_DESCRIPTORS: ApiDescriptor[] = [
  {
    id: 'youtube',
    label: 'YouTube Data API',
    feature: 'Live Darshan — detects when a temple channel goes live',
    downImpact: 'Live Darshan channel checks are OFF — temple channels will not show a LIVE badge.',
    keyName: 'youtubeDataApi',
    keySource: 'owner',
    quota: {
      kind: 'daily-units',
      limit: YT_DAILY_UNITS_DEFAULT,
      unitName: 'units',
      reset: 'midnight-pacific',
      tracked: true,
    },
    probeNote:
      'Probe uses channels.list — the cheapest real call (1 unit). Live detection itself uses search.list (100 units per check), shared across all viewers by leader election.',
  },
  {
    id: 'gemini',
    label: 'Gemini AI',
    feature: 'AI helpdesk + Dharmic assistant answers',
    downImpact: 'AI answers are OFF on devices without their own key — the helpdesk falls back to the built-in FAQ.',
    keyName: null,
    keySource: 'device',
    quota: {
      kind: 'daily-requests',
      limit: GEMINI_DAILY_REQUESTS_DEFAULT,
      reset: 'midnight-pacific',
      tracked: true,
      limitIsAssumption: true,
    },
    probeNote:
      'Probe lists models (free — no generation). The key is NOT owner-published: it comes from the build or the signed-in user’s own Account settings, so this card reports the key found on THIS device.',
  },
  {
    id: 'carto',
    label: 'CARTO Basemaps',
    feature: 'Temple maps — primary map tiles when a key is published',
    downImpact: 'Maps run on the free Esri fallback tiles — CARTO styling is off, maps still work.',
    keyName: 'cartoApiKey',
    keySource: 'owner',
    quota: {
      kind: 'monthly-units',
      limit: 5_000_000,
      unitName: 'tile requests / month',
      tracked: false,
    },
    probeNote:
      'Probe fetches one tiny tile. CARTO does not report usage to the key, and it answers HTTP 200 (watermark tiles) even for a revoked key — so this proves the endpoint is reachable, never that the key is valid. Watermarked maps = replace the key.',
  },
  {
    id: 'gmaps',
    label: 'Google Maps (geocoding)',
    feature: 'Reserved — no feature consumes this key yet',
    downImpact: 'Nothing is affected — no feature uses this key yet.',
    keyName: 'googleMapsBrowser',
    keySource: 'owner',
    quota: {
      kind: 'none',
      note: 'Billed pay-as-you-go inside Google Cloud Console. The app makes no Maps calls today, so there is no in-app usage to track.',
    },
    probeNote: 'Probe geocodes one address (the same read-only test as the key form).',
  },
  {
    id: 'nominatim',
    label: 'Nominatim (OpenStreetMap)',
    feature: 'Location picker — place search and address lookup',
    downImpact: 'Place search in the location picker may fail — pin-drop on the map still works.',
    keyName: null,
    keySource: 'keyless',
    quota: {
      kind: 'none',
      note: 'Free community service. Fair use ≈ 1 request/second; no account, no usage reporting.',
    },
    probeNote: 'Probe reverse-geocodes one point in Dhaka.',
  },
  {
    id: 'ipapi',
    label: 'ipapi.co',
    feature: 'Region detection — picks BD / IN / INTL payment rails',
    downImpact: 'Region detection falls back to the phone country code and manual choice.',
    keyName: null,
    keySource: 'keyless',
    quota: {
      kind: 'daily-requests',
      limit: 1000,
      reset: 'rolling-24h',
      tracked: false,
      limitIsAssumption: false,
    },
    probeNote:
      'Free tier is per IP address and results are cached 24h per device, so there is no single global usage number to show — probe health only.',
  },
  {
    id: 'esri',
    label: 'Esri Basemaps',
    feature: 'Temple maps — fallback tiles (used when no CARTO key is set)',
    downImpact: 'Maps fall back one more step to OpenStreetMap tiles.',
    keyName: null,
    keySource: 'keyless',
    quota: { kind: 'none', note: 'Free to embed with attribution. No usage reporting.' },
    probeNote: 'Probe fetches one tiny tile.',
  },
  {
    id: 'osm',
    label: 'OpenStreetMap tiles',
    feature: 'Temple maps — final fallback tiles',
    downImpact: 'If this also fails, maps show the built-in offline schematic instead of a blank screen.',
    keyName: null,
    keySource: 'keyless',
    quota: {
      kind: 'none',
      note: 'Donation-funded community tiles; normal interactive use only. No usage reporting.',
    },
    probeNote: 'Probe fetches one tiny tile.',
  },
];

export function descriptorFor(apiId: string): ApiDescriptor | null {
  return API_DESCRIPTORS.find((d) => d.id === apiId) ?? null;
}

/** The limit in force for a descriptor, honoring owner-edited assumptions. */
export function effectiveLimit(desc: ApiDescriptor, a: QuotaAssumptions): number | null {
  const q = desc.quota;
  if (q.kind === 'daily-units') {
    return desc.id === 'youtube' && a.youtubeDailyUnits && a.youtubeDailyUnits > 0
      ? a.youtubeDailyUnits
      : q.limit;
  }
  if (q.kind === 'daily-requests') {
    return desc.id === 'gemini' && a.geminiDailyRequests && a.geminiDailyRequests > 0
      ? a.geminiDailyRequests
      : q.limit;
  }
  if (q.kind === 'monthly-units') return q.limit;
  return null;
}

/** True when the limit figure is an editable assumption, not a hard fact. */
export function limitIsAssumption(desc: ApiDescriptor): boolean {
  return desc.quota.kind === 'daily-requests' && desc.quota.limitIsAssumption;
}

/* ------------------------------------------------------ error classifying */

/**
 * Classify a Google API error response (YouTube, Gemini, Maps all return
 * the same { error: { status, message, errors: [{ reason }] } } shape;
 * Maps Platform adds a top-level status/error_message pair instead —
 * see classifyGmapsError).
 */
export function classifyGoogleError(httpStatus: number, body: unknown): ProbeOutcomeKind {
  const err = (body as { error?: unknown } | null)?.error as
    | { status?: unknown; message?: unknown; errors?: unknown }
    | undefined;
  const message = typeof err?.message === 'string' ? err.message : '';
  const gstatus = typeof err?.status === 'string' ? err.status : '';
  const reasons: string[] = Array.isArray(err?.errors)
    ? (err.errors as unknown[])
        .map((e) => (e as { reason?: unknown })?.reason)
        .filter((r): r is string => typeof r === 'string')
    : [];

  if (reasons.includes('keyInvalid') || /api key not valid/i.test(message)) return 'invalid_key';
  if (httpStatus === 401) return 'invalid_key';
  if (
    reasons.includes('quotaExceeded') ||
    reasons.includes('dailyLimitExceeded') ||
    gstatus === 'RESOURCE_EXHAUSTED'
  ) {
    return 'quota_exceeded';
  }
  if (
    reasons.includes('rateLimitExceeded') ||
    reasons.includes('userRateLimitExceeded')
  ) {
    return 'rate_limited';
  }
  if (httpStatus === 429) return 'rate_limited';
  if (
    reasons.includes('accessNotConfigured') ||
    /has not been used in project|is disabled|has not been activated/i.test(message)
  ) {
    return 'not_activated';
  }
  return 'http_error';
}

/** Google Maps Platform returns { status, error_message } instead. */
export function classifyGmapsError(body: unknown): ProbeOutcomeKind {
  const b = body as { status?: unknown; error_message?: unknown } | null;
  const status = typeof b?.status === 'string' ? b.status : '';
  const msg = typeof b?.error_message === 'string' ? b.error_message : '';
  if (status === 'OK' || status === 'ZERO_RESULTS') return 'ok';
  if (/api key not valid|invalid/i.test(msg) && status === 'REQUEST_DENIED') return 'invalid_key';
  if (status === 'OVER_QUERY_LIMIT' || status === 'OVER_DAILY_LIMIT') return 'quota_exceeded';
  if (/has not been used|not activated|disabled/i.test(msg)) return 'not_activated';
  if (status === 'REQUEST_DENIED') return 'http_error';
  return 'http_error';
}

/** Extract the provider's own message (for the detail line), if present. */
export function providerMessage(body: unknown): string {
  const b = body as { error?: { message?: unknown }; error_message?: unknown } | null;
  const m = b?.error?.message;
  if (typeof m === 'string' && m.trim()) return m.trim().slice(0, 180);
  if (typeof b?.error_message === 'string' && b.error_message.trim()) {
    return b.error_message.trim().slice(0, 180);
  }
  return '';
}

/** Plain-words explanation of an outcome — what the owner reads. */
export function detailForOutcome(kind: ProbeOutcomeKind, extra = ''): string {
  const base = ((): string => {
    switch (kind) {
      case 'ok':
        return 'Working — the provider answered the test call.';
      case 'invalid_key':
        return 'The key was rejected. Check the value in the API Keys tab (and its provider-side restrictions).';
      case 'quota_exceeded':
        return 'Quota is full for now. It resets at the time shown on the card; features using this API pause until then.';
      case 'rate_limited':
        return 'Too many calls in a short window. This usually clears within a minute.';
      case 'not_activated':
        return 'The API is not enabled for this key’s project. Enable it in the provider console, then test again.';
      case 'http_error':
        return 'The provider answered with an error.';
      case 'network_error':
        return 'No answer — the device could not reach the provider (offline, DNS, or the provider is down).';
      case 'no_probe':
        return 'No safe test call exists for this API.';
    }
  })();
  return extra ? `${base} Provider said: “${extra}”` : base;
}

/* ------------------------------------------------------------ quota maths */

export const PACIFIC_TZ = 'America/Los_Angeles';

const dayFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: PACIFIC_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** YYYY-MM-DD of the instant in America/Los_Angeles (Google's quota day). */
export function pacificDayKey(nowMs: number): string {
  const parts = dayFmt.formatToParts(new Date(nowMs));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Ledger bucket id for one API on the Pacific day containing `nowMs`. */
export function bucketIdFor(apiId: string, nowMs: number): string {
  return `${apiId}_${pacificDayKey(nowMs)}`;
}

const fullFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: PACIFIC_TZ,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/** Offset of `tz` from UTC at `utcMs` (ms; e.g. -7h → -25_200_000). */
function tzOffsetMs(tz: string, utcMs: number): number {
  const fmt = tz === PACIFIC_TZ ? fullFmt : new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = fmt.formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
  const asUTC = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24,
    get('minute'),
    get('second'),
  );
  return asUTC - Math.floor(utcMs / 1000) * 1000;
}

/** Epoch ms of the next midnight in America/Los_Angeles after `nowMs`. */
export function nextPacificMidnight(nowMs: number): number {
  const parts = dayFmt.formatToParts(new Date(nowMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
  const guess = Date.UTC(get('year'), get('month') - 1, get('day') + 1, 0, 0, 0);
  // Two passes: the offset at the guess can differ by an hour across a DST
  // boundary; refine once with the offset at the candidate itself.
  const first = guess - tzOffsetMs(PACIFIC_TZ, guess);
  return guess - tzOffsetMs(PACIFIC_TZ, first);
}

export function quotaRatio(used: number, limit: number): number {
  if (!Number.isFinite(used) || !Number.isFinite(limit) || limit <= 0) return 0;
  return Math.max(0, used) / limit;
}

export type QuotaBand = 'normal' | 'near' | 'full';

export function quotaBand(ratio: number): QuotaBand {
  if (ratio >= 1) return 'full';
  if (ratio >= 0.8) return 'near';
  return 'normal';
}

/** Roll a probe result + facts into the card's status light. */
export function healthState(
  result: ProbeResult | null,
  opts: { configured: boolean; ratio: number | null },
): ApiHealthState {
  if (!opts.configured) return 'not_configured';
  if (!result) return 'untested';
  switch (result.outcome) {
    case 'ok':
      return opts.ratio !== null && quotaBand(opts.ratio) !== 'normal' ? 'quota_near' : 'ok';
    case 'quota_exceeded':
      return 'quota_full';
    case 'rate_limited':
      return 'quota_near';
    case 'no_probe':
      return 'untested';
    default:
      return 'failing';
  }
}

export const HEALTH_LIGHT: Record<ApiHealthState, string> = {
  ok: '🟢',
  quota_near: '🟡',
  quota_full: '🟡',
  failing: '🔴',
  untested: '⚪',
  not_configured: '⚪',
};

export const HEALTH_LABEL: Record<ApiHealthState, string> = {
  ok: 'Working',
  quota_near: 'Working — quota near the limit',
  quota_full: 'Quota full',
  failing: 'Failing',
  untested: 'Not tested yet',
  not_configured: 'Not configured',
};

/** Last-4-only key mask for cards. Never returns more of the key. */
export function maskTail(value: string): string {
  if (!value) return '';
  if (value.length <= 4) return '••••';
  return `••••${value.slice(-4)}`;
}

/* ------------------------------------------- dark-feature clarity (UI) */

/**
 * The impact line for a card, or null when the API is healthy/untested
 * and there is nothing to warn about. Quota-near still means "working",
 * so it carries no impact line.
 */
export function impactFor(desc: ApiDescriptor, state: ApiHealthState): string | null {
  if (state === 'not_configured' || state === 'failing' || state === 'quota_full') {
    return desc.downImpact;
  }
  return null;
}

/* ------------------------------------------------- rotation-safe history */

/** The last known-good check for an API, and the key tail it ran with. */
export interface GoodCheck {
  result: ProbeResult;
  /** Last-4 mask of the key that produced the good check (never more). */
  keyTail: string;
}

/**
 * Advance the good-check record after a fresh probe (pure). A good result
 * replaces the record; a bad one leaves the previous good check intact —
 * so after a bad key rotation the desk can still say when this API last
 * worked, and with which key (owner addendum #35: never silently dark).
 */
export function rotateGoodCheck(
  prev: GoodCheck | null,
  fresh: ProbeResult,
  keyTail: string,
): GoodCheck | null {
  if (fresh.outcome === 'ok') return { result: fresh, keyTail };
  return prev;
}

export interface GoodCheckInfo {
  checkedAt: number;
  keyTail: string;
  /** True when the good check ran with a DIFFERENT key than today's. */
  rotated: boolean;
}

/**
 * What the card shows about the last good check, or null when the current
 * check is itself good (nothing to explain) or no good check exists.
 */
export function goodCheckInfo(
  good: GoodCheck | null,
  current: ProbeResult | null,
  currentKeyTail: string,
): GoodCheckInfo | null {
  if (!good) return null;
  if (current && current.outcome === 'ok') return null;
  return {
    checkedAt: good.result.checkedAt,
    keyTail: good.keyTail,
    rotated: good.keyTail !== '' && currentKeyTail !== '' && good.keyTail !== currentKeyTail,
  };
}

/** Pure freshness test for a TTL cache stamped at `cachedAt` (ms). */
export function isCacheFresh(cachedAt: number, nowMs: number, ttlMs: number): boolean {
  return cachedAt > 0 && nowMs - cachedAt < ttlMs;
}
