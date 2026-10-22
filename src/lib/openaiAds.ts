/**
 * openaiAds.ts — OpenAI (ChatGPT) Ads measurement, browser side.
 *
 * HONEST BY DEFAULT: this module is inert until the owner configures a
 * real OpenAI Ads Pixel ID. It reads the ID from
 * `import.meta.env.VITE_OPENAI_ADS_PIXEL_ID`; when that variable is
 * absent or empty, EVERY export is a safe no-op — no script is loaded,
 * no event is sent, nothing is faked. The /for-institutions landing
 * page and the /contact inquiry form can call it unconditionally.
 *
 * What it does when a Pixel ID *is* configured:
 *  1. Captures the OpenAI click reference (`?oppref=…`, appended by
 *     OpenAI to ad landing URLs) into a first-party cookie named
 *     `__oppref` and mirrors it in localStorage, so a conversion that
 *     happens on a later page (e.g. the /contact form) can still be
 *     attributed to the ad click.
 *  2. Lazily loads the OpenAI measurement SDK
 *     (https://bzrcdn.openai.com/sdk/oaiq.min.js) exactly once and
 *     initialises it: `oaiq("init", { pixelId })`.
 *  3. Sends standard events through `trackOpenAiEvent(name, data,
 *     eventId)` → `oaiq("measure", name, data, { event_id: eventId })`.
 *
 * DEDUPLICATION RULE (pixel + Conversions API): when the same
 * conversion is also sent server-side via the OpenAI Conversions API,
 * both copies must carry the SAME Pixel ID, the SAME event name and
 * the SAME event id (pixel `event_id` === CAPI event `id` — use the
 * order / inquiry / booking reference both sides know). OpenAI keeps
 * the first copy and ignores the duplicate.
 *
 * SERVER CAPI LIVES SERVER-SIDE ONLY: the Conversions API key must
 * never appear in browser code, in this file, or in any client bundle.
 * Nothing in this module sends a CAPI request; it only talks to the
 * browser pixel. Server-side event forwarding belongs on the server.
 *
 * CONTENT SECURITY POLICY: sites sending a Content-Security-Policy
 * header must allow the OpenAI endpoints or the pixel silently fails:
 *   script-src  https://bzrcdn.openai.com
 *   connect-src https://bzr.openai.com
 *   img-src     https://bzr.openai.com
 *
 * CONSENT: the pixel must not fire before the visitor has consented
 * where a consent banner / applicable law requires it. Callers remain
 * responsible for gating `initOpenAiAds()` behind their consent flow;
 * this module never invents consent.
 */

export type OpenAiAdsEventName =
  | 'page_viewed'
  | 'contents_viewed'
  | 'items_added'
  | 'checkout_started'
  | 'order_created'
  | 'lead_created'
  | 'registration_completed'
  | 'appointment_scheduled'
  | 'subscription_created'
  | 'trial_started';

export interface OpenAiAdsEventData {
  type?: string;
  amount?: number;
  currency?: string;
  plan_id?: string;
  contents?: Array<{
    id: string;
    name?: string;
    content_type?: string;
    quantity?: number;
    amount?: number;
    currency?: string;
  }>;
  [key: string]: unknown;
}

const PIXEL_ID: string = (import.meta.env.VITE_OPENAI_ADS_PIXEL_ID as string | undefined)?.trim() ?? '';

const SDK_URL = 'https://bzrcdn.openai.com/sdk/oaiq.min.js';
const OPPREF_COOKIE = '__oppref';
const OPPREF_STORAGE_KEY = '__oppref';
/** 30 days, matching a typical click-attribution window. */
const OPPREF_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

type OaiqFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    oaiq?: OaiqFn & { _q?: unknown[] };
  }
}

let sdkRequested = false;
let sdkReady = false;
let initQueued = false;
const pendingEvents: Array<[OpenAiAdsEventName, OpenAiAdsEventData | undefined, string | undefined]> = [];

/** True only when a real Pixel ID has been configured. */
export function isOpenAiAdsEnabled(): boolean {
  return PIXEL_ID.length > 0;
}

function getOaiq(): OaiqFn | null {
  if (typeof window === 'undefined') return null;
  return typeof window.oaiq === 'function' ? window.oaiq : null;
}

function flushPendingEvents(): void {
  const oaiq = getOaiq();
  if (!oaiq) return;
  while (pendingEvents.length > 0) {
    const [name, data, eventId] = pendingEvents.shift() as [
      OpenAiAdsEventName,
      OpenAiAdsEventData | undefined,
      string | undefined,
    ];
    oaiq('measure', name, data ?? {}, eventId ? { event_id: eventId } : {});
  }
}

function loadSdk(): void {
  if (sdkRequested || typeof document === 'undefined') return;
  sdkRequested = true;
  const script = document.createElement('script');
  script.src = SDK_URL;
  script.async = true;
  script.onload = () => {
    sdkReady = true;
    flushPendingEvents();
  };
  script.onerror = () => {
    // SDK unreachable (offline, blocker, CSP) — measurement must never
    // break the page. Drop quietly; events stay un-sent, not faked.
    pendingEvents.length = 0;
  };
  document.head.appendChild(script);
}

/**
 * Capture `?oppref=` from the current URL (if present) into the
 * first-party `__oppref` cookie + localStorage mirror. Returns the
 * stored oppref value, or '' when there is none. Safe to call on any
 * page, with or without a configured Pixel ID — capturing the click
 * reference is harmless plumbing, sending events is what stays inert.
 */
export function captureOppref(): string {
  if (typeof window === 'undefined') return '';
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('oppref');
    if (fromUrl) {
      document.cookie =
        `${OPPREF_COOKIE}=${encodeURIComponent(fromUrl)}; path=/; max-age=${OPPREF_MAX_AGE_SECONDS}; SameSite=Lax`;
      try {
        window.localStorage.setItem(OPPREF_STORAGE_KEY, fromUrl);
      } catch {
        /* storage unavailable (private mode) — cookie is the primary store */
      }
      return fromUrl;
    }
  } catch {
    /* malformed URL — fall through to stored values */
  }
  return getStoredOppref();
}

/** The oppref captured earlier (cookie first, localStorage mirror second). */
export function getStoredOppref(): string {
  if (typeof window === 'undefined') return '';
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${OPPREF_COOKIE}=([^;]*)`));
    if (match) return decodeURIComponent(match[1]);
  } catch {
    /* cookies unavailable */
  }
  try {
    return window.localStorage.getItem(OPPREF_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

/**
 * Initialise OpenAI Ads measurement for the current page: capture the
 * click reference, load the SDK once and initialise the pixel.
 * No-op when no Pixel ID is configured.
 */
export function initOpenAiAds(): void {
  if (!isOpenAiAdsEnabled()) return;
  if (typeof window === 'undefined') return;
  captureOppref();
  if (sdkReady) return;
  loadSdk();
  // oaiq queues calls made before the SDK arrives; init is queued first.
  const queueInit = () => {
    if (initQueued) return;
    initQueued = true;
    const oaiq = getOaiq();
    if (oaiq) {
      oaiq('init', { pixelId: PIXEL_ID });
    } else {
      // SDK script has not defined window.oaiq yet — install the
      // standard queue stub so the init call is not lost.
      const stub = ((...args: unknown[]) => {
        (stub._q = stub._q ?? []).push(args);
      }) as OaiqFn & { _q?: unknown[] };
      window.oaiq = stub;
      stub('init', { pixelId: PIXEL_ID });
    }
  };
  queueInit();
}

/**
 * Send one standard event to the OpenAI pixel.
 *
 * No-ops safely (returns false) when no Pixel ID is configured or the
 * SDK is unavailable; returns true when the event was handed to oaiq
 * (queued events are flushed once the SDK loads). Pass `eventId` — the
 * same id the server Conversions API will use — so browser + server
 * copies of the same conversion deduplicate (see header).
 */
export function trackOpenAiEvent(
  name: OpenAiAdsEventName,
  data?: OpenAiAdsEventData,
  eventId?: string,
): boolean {
  if (!isOpenAiAdsEnabled()) return false;
  if (typeof window === 'undefined') return false;
  initOpenAiAds();
  const oaiq = getOaiq();
  if (!oaiq) return false;
  if (!sdkReady) {
    pendingEvents.push([name, data, eventId]);
    return true;
  }
  oaiq('measure', name, data ?? {}, eventId ? { event_id: eventId } : {});
  return true;
}
