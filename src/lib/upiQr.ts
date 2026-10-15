/**
 * UPI QR availability probe.
 *
 * The Indian payment tab (in_upi, /upi-qr.png) only appears when the owner has
 * uploaded public/upi-qr.png via the GitHub web UI. Until then, Indian users
 * are automatically routed to the INTL (International) payment methods —
 * Payoneer primary, Wise fallback.
 *
 * The probe is cached in memory per page load; a refresh re-checks, so
 * uploading the QR re-enables the India tab automatically on next visit.
 * Never throws — worst case reports "not available" (fail closed to INTL).
 */
import { useEffect, useState } from 'react';

const UPI_QR_URL = '/upi-qr.png';
const PROBE_TIMEOUT_MS = 5000;

let cached: boolean | null = null;
let inflight: Promise<boolean> | null = null;

/** Probe whether /upi-qr.png exists. Safe to call anywhere; never throws. */
export function checkUpiQrAvailable(): Promise<boolean> {
  if (cached !== null) return Promise.resolve(cached);
  if (inflight) return inflight;
  inflight = new Promise((resolve) => {
    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      cached = ok;
      inflight = null;
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
  return inflight;
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
