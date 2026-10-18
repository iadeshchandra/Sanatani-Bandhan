/**
 * i18n/translationOverrides.ts — runtime override fetcher.
 * ========================================================
 * Owner-approved translation corrections live in Firestore at
 * `translationOverrides/{lang}` (a flat map of dot-delimited key → text).
 * This module fetches one language's doc and hands it to
 * `applyTranslationOverrides` in translations.ts, which merges it over the
 * bundled dictionary.
 *
 * Fail-open by design: offline, denied, timed-out, or malformed — the
 * bundled dictionary is used as-is and the app never notices.
 */

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { applyTranslationOverrides } from './translations';

/** Overrides must never hold up the UI — 6 seconds, then give up quietly. */
const OVERRIDE_TIMEOUT_MS = 6000;

/** Languages whose override doc has been fetched (or confirmed absent) this session. */
const fetchedLangs = new Set<string>();
/** In-flight fetches, deduped. */
const inflight: Record<string, Promise<boolean> | undefined> = {};

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('translation-override-timeout')), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

/**
 * Fetch and apply runtime overrides for a language. Resolves true when at
 * least one override was applied (so the caller can re-render), false
 * otherwise. Never throws, never blocks: safe to fire-and-forget.
 */
export function fetchTranslationOverrides(lang: string): Promise<boolean> {
  const normalized = (lang || 'en').toLowerCase();
  if (normalized === 'en' || fetchedLangs.has(normalized)) {
    return Promise.resolve(false);
  }
  if (inflight[normalized]) return inflight[normalized] as Promise<boolean>;

  inflight[normalized] = (async (): Promise<boolean> => {
    try {
      const snap = await withTimeout(
        getDoc(doc(db, 'translationOverrides', normalized)),
        OVERRIDE_TIMEOUT_MS
      );
      const data = snap.exists() ? (snap.data() as Record<string, unknown>) : null;
      fetchedLangs.add(normalized);
      if (data && typeof data === 'object') {
        const flat: Record<string, string> = {};
        for (const k of Object.keys(data)) {
          if (typeof data[k] === 'string') flat[k] = data[k] as string;
        }
        if (Object.keys(flat).length > 0) {
          applyTranslationOverrides(normalized, flat);
          return true;
        }
      }
      return false;
    } catch {
      // Offline / permission-denied / timeout — bundled dict stands.
      return false;
    } finally {
      inflight[normalized] = undefined;
    }
  })();

  return inflight[normalized] as Promise<boolean>;
}

/** Forget a language's fetch state (tests / manual refresh). */
export function resetOverrideFetch(lang: string): void {
  fetchedLangs.delete((lang || 'en').toLowerCase());
}
