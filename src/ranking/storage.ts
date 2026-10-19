/**
 * ranking/storage.ts — persistence for ranking signals and weights.
 * ====================================================================
 * User signals: IndexedDB, local only, NEVER leaves the device.
 * Platform weights: Firestore `platformConfig/ranking`, cached locally.
 */

import {
  type UserSignals,
  type FeedWeights,
  type InteractionType,
  DEFAULT_FEED_WEIGHTS,
  emptyUserSignals,
  recordInteraction,
} from './feed';
import {
  type MarketplaceWeights,
  DEFAULT_MARKETPLACE_WEIGHTS,
} from './marketplace';
import type { PostKind } from '../sangam/types';

/* ------------------------------------------------------------------ */
/* User signals — IndexedDB (local only)                               */
/* ------------------------------------------------------------------ */

const DB_NAME = 'sanatani_ranking';
const DB_VERSION = 1;
const SIGNALS_STORE = 'user_signals';
const SIGNALS_KEY = 'signals_v1';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(SIGNALS_STORE)) {
        db.createObjectStore(SIGNALS_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Load user signals from IndexedDB. Returns empty signals on any failure. */
export async function loadUserSignals(): Promise<UserSignals> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(SIGNALS_STORE, 'readonly');
      const req = tx.objectStore(SIGNALS_STORE).get(SIGNALS_KEY);
      req.onsuccess = () => {
        const val = req.result as UserSignals | undefined;
        resolve(val && typeof val === 'object' ? { ...emptyUserSignals(), ...val } : emptyUserSignals());
      };
      req.onerror = () => resolve(emptyUserSignals());
    });
  } catch {
    return emptyUserSignals();
  }
}

/** Save user signals to IndexedDB. Fire-and-forget safe. */
export async function saveUserSignals(signals: UserSignals): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(SIGNALS_STORE, 'readwrite');
      tx.objectStore(SIGNALS_STORE).put(signals, SIGNALS_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve(); // never throw on save
    });
  } catch {
    // Silently ignore — ranking degrades gracefully to defaults
  }
}

/**
 * Record an interaction and persist. Returns the updated signals.
 * This is the main entry point for the UI to call.
 */
export async function trackInteraction(
  type: InteractionType,
  authorUid: string,
  postKind?: PostKind,
): Promise<UserSignals> {
  const current = await loadUserSignals();
  const updated = recordInteraction(current, type, authorUid, postKind);
  // Cap seenPostIds to prevent unbounded growth
  if (updated.seenPostIds.length > 500) {
    updated.seenPostIds = updated.seenPostIds.slice(-500);
  }
  await saveUserSignals(updated);
  return updated;
}

/* ------------------------------------------------------------------ */
/* Platform weights — Firestore (GodMode-tunable)                      */
/* ------------------------------------------------------------------ */

export interface RankingConfig {
  feed: FeedWeights;
  marketplace: MarketplaceWeights;
  updatedAt: number;
  updatedBy?: string;
}

export const DEFAULT_RANKING_CONFIG: RankingConfig = {
  feed: DEFAULT_FEED_WEIGHTS,
  marketplace: DEFAULT_MARKETPLACE_WEIGHTS,
  updatedAt: 0,
};

// In-memory cache — avoids a Firestore read on every feed render
let cachedConfig: RankingConfig | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60_000; // 5 minutes

/**
 * Load ranking weights. Tries Firestore, falls back to cached, then defaults.
 * Lazy-imports Firebase to keep the ranking module test-safe.
 */
export async function loadRankingConfig(): Promise<RankingConfig> {
  const now = Date.now();
  if (cachedConfig && now - cacheTime < CACHE_TTL) {
    return cachedConfig;
  }

  try {
    const { getFirestore, doc, getDoc } = await import('firebase/firestore');
    // Use the default app's Firestore — ranking config is platform-wide
    const { getApp } = await import('firebase/app');
    const db = getFirestore(getApp());
    const snap = await getDoc(doc(db, 'platformConfig', 'ranking'));
    if (snap.exists()) {
      const data = snap.data() as Partial<RankingConfig>;
      cachedConfig = {
        feed: { ...DEFAULT_FEED_WEIGHTS, ...(data.feed || {}) },
        marketplace: { ...DEFAULT_MARKETPLACE_WEIGHTS, ...(data.marketplace || {}) },
        updatedAt: data.updatedAt || 0,
        updatedBy: data.updatedBy,
      };
      cacheTime = now;
      return cachedConfig;
    }
  } catch {
    // Firestore unavailable — fall through to defaults
  }

  cachedConfig = { ...DEFAULT_RANKING_CONFIG };
  cacheTime = now;
  return cachedConfig;
}

/**
 * Save ranking weights (GodMode only — rules enforce SuperAdmin).
 * Invalidates the local cache immediately.
 */
export async function saveRankingConfig(
  config: RankingConfig,
  updatedBy: string,
): Promise<void> {
  const { getFirestore, doc, setDoc } = await import('firebase/firestore');
  const { getApp } = await import('firebase/app');
  const db = getFirestore(getApp());
  await setDoc(doc(db, 'platformConfig', 'ranking'), {
    ...config,
    updatedAt: Date.now(),
    updatedBy,
  });
  cachedConfig = { ...config, updatedAt: Date.now(), updatedBy };
  cacheTime = Date.now();
}

/** Clear the in-memory cache (for testing). */
export function clearRankingCache(): void {
  cachedConfig = null;
  cacheTime = 0;
}
