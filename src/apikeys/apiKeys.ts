/**
 * apiKeys.ts — runtime access to owner-managed third-party API keys.
 * ============================================================================
 * The owner adds/edits keys in GodMode → "API Keys". Client-safe keys are
 * published to `platformConfig/public` (authenticated read, owner-only write)
 * and fetched here once, then cached in memory + localStorage.
 *
 * SECURITY MODEL (read before touching):
 *  - A phone app cannot keep secrets. Anything this module returns is visible
 *    in the device's network tab. ONLY client-safe keys (browser-restricted
 *    Google Maps keys, YouTube Data API keys) may ever be published here.
 *  - Server-only keys (payment secrets, private tokens) live in
 *    `platformConfig/apiKeys/{keyId}` (owner-only) and are NEVER readable
 *    from a client. This module cannot see them by design.
 *  - Never log a key value. The masked display lives in the admin UI.
 */
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface PublicApiKeyConfig {
  keys: Record<string, string>;
  configVersion: number;
  updatedAt: string | null;
}

const DOC_PATH = 'platformConfig/public';
const LS_KEYS = 'sb.publicApiKeys.v1';
const LS_VERSION = 'sb.publicApiKeys.version';

let memCache: PublicApiKeyConfig | null = null;
let inflight: Promise<PublicApiKeyConfig> | null = null;

const EMPTY: PublicApiKeyConfig = { keys: {}, configVersion: 0, updatedAt: null };

function readLocalCache(): PublicApiKeyConfig | null {
  try {
    const raw = localStorage.getItem(LS_KEYS);
    const ver = localStorage.getItem(LS_VERSION);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { keys?: Record<string, string>; updatedAt?: string | null };
    return {
      keys: parsed.keys && typeof parsed.keys === 'object' ? parsed.keys : {},
      configVersion: ver ? Number(ver) || 0 : 0,
      updatedAt: parsed.updatedAt ?? null,
    };
  } catch {
    return null;
  }
}

function writeLocalCache(cfg: PublicApiKeyConfig): void {
  try {
    localStorage.setItem(LS_KEYS, JSON.stringify({ keys: cfg.keys, updatedAt: cfg.updatedAt }));
    localStorage.setItem(LS_VERSION, String(cfg.configVersion));
  } catch {
    /* storage full or unavailable — memory cache still works */
  }
}

async function fetchRemote(): Promise<PublicApiKeyConfig> {
  const snap = await getDoc(doc(db, DOC_PATH));
  if (!snap.exists()) return EMPTY;
  const d = snap.data() as Partial<PublicApiKeyConfig> & { keys?: unknown };
  const keys: Record<string, string> = {};
  if (d.keys && typeof d.keys === 'object') {
    for (const [k, v] of Object.entries(d.keys as Record<string, unknown>)) {
      if (typeof v === 'string' && v.length > 0) keys[k] = v;
    }
  }
  return {
    keys,
    configVersion: typeof d.configVersion === 'number' ? d.configVersion : 0,
    updatedAt: typeof d.updatedAt === 'string' ? d.updatedAt : null,
  };
}

/** Load (and cache) the published key set. Never throws — returns {} on failure. */
export async function loadPublicApiKeys(): Promise<PublicApiKeyConfig> {
  if (memCache) return memCache;
  const local = readLocalCache();
  if (local) {
    memCache = local;
    // Refresh in background so a newly published key arrives without a reload.
    void fetchRemote()
      .then((remote) => {
        if (remote.configVersion > (memCache?.configVersion ?? 0)) {
          memCache = remote;
          writeLocalCache(remote);
        }
      })
      .catch(() => undefined);
    return memCache;
  }
  if (!inflight) {
    inflight = fetchRemote()
      .then((remote) => {
        memCache = remote;
        writeLocalCache(remote);
        return remote;
      })
      .catch(() => EMPTY)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Get one published client-safe key by name. Null when not configured. Never throws. */
export async function getPublicApiKey(name: string): Promise<string | null> {
  try {
    const cfg = await loadPublicApiKeys();
    return cfg.keys[name] ?? null;
  } catch {
    return null;
  }
}

/**
 * Synchronous cached read of one published key — no network, never throws.
 * Checks the in-memory cache first, then localStorage. Returns null when the
 * cache has never been populated (e.g. very first load before any async
 * fetch). Map tile layers use this at init so a newly published key takes
 * effect on the next map open with no reload and no code deploy.
 */
export function getCachedApiKeySync(name: string): string | null {
  try {
    if (memCache && typeof memCache.keys[name] === 'string' && memCache.keys[name].length > 0) {
      return memCache.keys[name];
    }
    const local = readLocalCache();
    if (local) {
      memCache = local; // warm the memory cache from disk
      const v = local.keys[name];
      return typeof v === 'string' && v.length > 0 ? v : null;
    }
  } catch {
    /* storage unavailable — treat as unconfigured */
  }
  return null;
}

/** React hook version. Returns null while loading or when unconfigured. */
export function useApiKey(name: string): string | null {
  const [key, setKey] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void getPublicApiKey(name).then((k) => {
      if (alive) setKey(k);
    });
    return () => {
      alive = false;
    };
  }, [name]);
  return key;
}

/** Drop caches (e.g. after the owner rotates a key and wants it picked up now). */
export function clearApiKeyCache(): void {
  memCache = null;
  try {
    localStorage.removeItem(LS_KEYS);
    localStorage.removeItem(LS_VERSION);
  } catch {
    /* ignore */
  }
}
