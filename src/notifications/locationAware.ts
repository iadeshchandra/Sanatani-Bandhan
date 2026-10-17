/**
 * notifications/locationAware.ts — quiet places & aarti-hour muting.
 * ==================================================================
 * PHASE 4 — Notification intelligence layer.
 *
 * HONEST LIMITS (read before building on this):
 *   - Real geofencing (enter/exit a temple boundary in the background)
 *     NEEDS NATIVE. A PWA cannot watch location while closed; background
 *     geofences require the native shell (Capacitor + a geofence plugin,
 *     e.g. @capacitor/geolocation with background mode). `isGeofencingSupported()`
 *     reports this truthfully so UI never promises what the platform can't do.
 *   - What WORKS in the PWA today is the time-based half: the devotee's
 *     "quiet places" each carry aarti/prayer hours (e.g. "my temple,
 *     06:00–07:00 and 18:00–19:00"). During those windows, non-critical
 *     notifications are muted — no ping, no buzz — while critical (SOS)
 *     always breaks through. That is implemented here, purely and testably.
 *
 * "Quiet places" are USER-SET and user-named (e.g. "Mandir — morning aarti").
 * Nothing here tracks location; when native geofencing arrives, these same
 * place records gain a lat/lng + radius and the time check below becomes
 * the fallback for when the geofence state is unknown.
 */

import type { NotifyLang, TriText } from './types';

/** One devotee-defined quiet place with its prayer hours. */
export interface QuietPlace {
  id: string;
  name: string;
  /** One or more daily windows in "HH:MM"–"HH:MM" local time. */
  aartiWindows: Array<{ start: string; end: string }>;
  enabled: boolean;
  /**
   * Reserved for the native future: geofence center. null = time-only
   * (works in PWA today).
   */
  geo?: { lat: number; lng: number; radiusMeters: number } | null;
}

export interface LocationPrefs {
  enabled: boolean;
  quietPlaces: QuietPlace[];
}

export interface MuteDecision {
  /** True → suppress non-critical pings until the window ends. */
  mute: boolean;
  /** Which quiet place triggered the mute (display name). */
  place?: string;
  reason?: TriText;
}

function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

function inWindow(now: Date, start: string, end: string): boolean {
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (s == null || e == null || s === e) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  if (s < e) return cur >= s && cur < e;
  return cur >= s || cur < e; // spans midnight
}

const MUTE_REASON: TriText = {
  en: 'Quiet place — non-critical notifications are resting. Critical alerts still reach you.',
  bn: 'শান্ত স্থান — অ-জরুরি নোটিফিকেশন বিশ্রামে আছে। জরুরি সতর্কতা তবুও পৌঁছাবে।',
  hi: 'शांत स्थान — गैर-गंभीर सूचनाएँ विश्राम में हैं। गंभीर अलर्ट फिर भी पहुँचेंगे।',
};

/**
 * Should non-critical notifications be muted right now?
 * Mutes during any enabled quiet place's aarti window. Critical (SOS)
 * is NEVER muted by this — the caller must exempt critical priority.
 */
export function shouldMuteNonCritical(now: Date, prefs: LocationPrefs): MuteDecision {
  if (!prefs.enabled) return { mute: false };
  for (const place of prefs.quietPlaces) {
    if (!place.enabled) continue;
    if (place.aartiWindows.some((w) => inWindow(now, w.start, w.end))) {
      return { mute: true, place: place.name, reason: MUTE_REASON };
    }
  }
  return { mute: false };
}

export interface GeofenceStatus {
  supported: false;
  /** Why not — shown in settings so the devotee understands. */
  why: TriText;
  /** What would unlock it. */
  needsNative: true;
}

/**
 * Honest capability report: background geofencing is NOT available in the
 * PWA. Foreground location checks are possible later, but entering a
 * temple boundary while the app is closed needs the native shell.
 */
export function isGeofencingSupported(): GeofenceStatus {
  return {
    supported: false,
    why: {
      en: 'Background location needs the native app. Until then, quiet places mute by prayer hours you set.',
      bn: 'ব্যাকগ্রাউন্ড অবস্থানের জন্য নেটিভ অ্যাপ দরকার। ততদিন, আপনার নির্ধারিত প্রার্থনার সময় অনুযায়ী শান্ত স্থান নীরব থাকবে।',
      hi: 'बैकग्राउंड लोकेशन के लिए नेटिव ऐप चाहिए। तब तक, आपके तय प्रार्थना समय के अनुसार शांत स्थान मौन रहेंगे।',
    },
    needsNative: true,
  };
}

/** Example used by the settings screen until the devotee adds their own. */
export function exampleQuietPlace(): QuietPlace {
  return {
    id: 'example-mandir',
    name: 'My temple',
    aartiWindows: [
      { start: '06:00', end: '07:00' },
      { start: '18:00', end: '19:00' },
    ],
    enabled: true,
    geo: null,
  };
}

/** For UI display: the active window's end time, e.g. "07:00". */
export function activeWindowEnd(now: Date, place: QuietPlace): string | null {
  const hit = place.aartiWindows.find((w) => inWindow(now, w.start, w.end));
  return hit ? hit.end : null;
}

/** Re-exported so settings screens can label the language picker. */
export type { NotifyLang };
