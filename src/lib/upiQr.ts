/**
 * UPI QR availability probe.
 *
 * The Indian payment tab (in_upi) appears when the owner has provided a UPI
 * QR code — either uploaded from GodMode → Settings → Geo Payments → QR Codes
 * (stored in Firestore `qrCodes/IN`, checked first) or the legacy static
 * file public/upi-qr.png (uploaded via GitHub web UI).
 *
 * Until a QR is available, Indian users are automatically routed to the INTL
 * (International) payment methods — Payoneer primary, Wise fallback.
 *
 * The probe is cached in memory per page load; a refresh re-checks, so
 * uploading the QR enables the India tab automatically on next visit.
 * Never throws — worst case reports "not available" (fail closed to INTL).
 */
import { useEffect, useState } from 'react';
import { getQrCodeUrl } from './qrCodes';

const UPI_QR_URL = '/upi-qr.png';
const PROBE_TIMEOUT_MS = 5000;

let cached: boolean | null = null;
let inflight: Promise<boolean> | null = null;
let cachedUrl: string | null = null;

/** Probe whether the static /upi-qr.png file exists. */
function probeStaticQr(): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };
    try {
      const img = new Image();
      img.onload = () => done(true);
      img.onerror = () => done(false);
      // Cache-buster: a 404 may be cached by the browser/SW, and we must see
      // a freshly uploaded QR without waiting for that entry to expire.
      img.src = `${UPI_QR_URL}?probe=${Date.now()}`;
      setTimeout(() => done(false), PROBE_TIMEOUT_MS);
    } catch {
      done(false);
    }
  });
}

/**
 * Best available UPI QR image URL, or null if none.
 * Order: Firestore (GodMode upload) → static /upi-qr.png → null.
 * Result is cached in memory per page load. Never throws.
 */
export async function getUpiQrUrl(): Promise<string | null> {
  if (cached !== null) return cachedUrl;
  if (inflight) {
    await inflight;
    return cachedUrl;
  }
  inflight = (async () => {
    try {
      // 1. Firestore — uploaded from the GodMode admin panel.
      const fsUrl = await getQrCodeUrl('IN');
      if (fsUrl) {
        cachedUrl = fsUrl;
        return true;
      }
      // 2. Legacy static file.
      const staticOk = await probeStaticQr();
      cachedUrl = staticOk ? UPI_QR_URL : null;
      return staticOk;
    } catch {
      cachedUrl = null;
      return false;
    }
  })();
  const ok = await inflight;
  cached = ok;
  inflight = null;
  return cachedUrl;
}

/** Probe whether a UPI QR is available. Safe to call anywhere; never throws. */
export function checkUpiQrAvailable(): Promise<boolean> {
  if (cached !== null) return Promise.resolve(cached);
  return getUpiQrUrl().then((url) => url !== null);
}

/**
 * React hook — returns true/false once probed, null while probing.
 * While null, callers should keep showing their current UI (no flicker).
 */
export function useUpiQrAvailable(): boolean | null {
  const [ok, setOk] = useState<boolean | null>(cached);
  useEffect(() => {
    let alive = true;
    checkUpiQrAvailable().then((v) => {
      if (alive) setOk(v);
    });
    return () => {
      alive = false;
    };
  }, []);
  return ok;
}

/**
 * React hook — returns the best UPI QR image URL (or null).
 * While loading, returns null; callers should keep current UI (no flicker).
 */
export function useUpiQrUrl(): string | null {
  const [url, setUrl] = useState<string | null>(cachedUrl);
  useEffect(() => {
    let alive = true;
    getUpiQrUrl().then((u) => {
      if (alive) setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, []);
  return url;
}
