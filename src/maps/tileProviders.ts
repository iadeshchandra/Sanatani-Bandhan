/**
 * tileProviders.ts — single source of truth for map tile layers.
 * ============================================================================
 * Every Leaflet map in the app (SOS responder map, campus visitor view,
 * campus builder, and all react-leaflet maps via <ResilientTileLayer>)
 * renders its base tiles through `addResilientTiles()` below.
 *
 * PROVIDER CHAIN (all $0):
 *   1. CARTO basemaps (primary — ONLY when the owner has published a key;
 *      see "MANAGED CARTO KEY" below). Light: Voyager · Dark: Dark Matter.
 *   2. Esri basemaps (primary when no CARTO key is configured) — free to
 *      embed with attribution, no key. Light: World Topo Map · Dark: Dark
 *      Gray Canvas (battery-friendly night maps). Note the Esri tile URL
 *      order is {z}/{y}/{x}.
 *   3. OpenStreetMap standard (fallback) — the community tile service.
 *   4. The app's own offline schematic SVG (final fallback — handled by the
 *      caller via `onAllFailed`; the map never blank-screens).
 *
 * MANAGED CARTO KEY (no code deploys for rotation):
 *   GodMode → "API Keys" → add a key named `cartoApiKey` (client-safe) →
 *   Save + Publish. Every map reads the published key from its local cache
 *   at init (getCachedApiKeySync — no network); the key takes effect on the
 *   next map open, no app update or page reload required. Removing the key
 *   in GodMode restores Esri as primary just as silently.
 *   Free tier: 5M tile requests/month non-commercial, 1M/month commercial
 *   (counted across all keys on the account). Past the quota CARTO serves
 *   watermark tiles — rotate or upgrade the key in GodMode.
 *   Google Maps is permanently off the table: it needs a billing account
 *   and violates the project's $0 / no-card rule.
 *
 * KNOWN LIMITATION: a revoked/invalid CARTO key serves "API KEY REQUIRED"
 * watermark tiles with HTTP 200, which Leaflet counts as successful loads —
 * automatic failover will NOT trigger on a bad key. If maps ever show
 * watermarks, fix or remove `cartoApiKey` in GodMode (removing it restores
 * Esri primary on the next map open).
 *
 * USAGE-POLICY NOTES (please keep these true):
 *   - CARTO: attribution "© OpenStreetMap contributors, © CARTO" must stay
 *     visible — that is the price of the free tier. Keys are per-customer;
 *     do not share them. Terms: https://carto.com/basemaps/
 *   - Esri basemaps are free to embed with the attribution line below.
 *     See https://www.esri.com/en-us/legal/terms/full-master-agreement
 *     (free basemap use) — do not strip the attribution.
 *   - OSM's tile servers are donation-funded: no bulk downloading / scraping,
 *     normal interactive panning only. The browser sends an identifying
 *     Referer automatically. If traffic ever outgrows fair use, switch the
 *     primary to a dedicated tile host — this module is the only file to edit.
 */

import { getCachedApiKeySync } from '../apikeys/apiKeys';

/** Managed key name the owner publishes in GodMode → API Keys. */
export const CARTO_KEY_NAME = 'cartoApiKey';

export type TileProviderId =
  | 'carto-voyager'
  | 'carto-dark'
  | 'esri-topo'
  | 'esri-dark'
  | 'osm-standard';

export interface TileProvider {
  id: TileProviderId;
  /** Leaflet URL template. */
  url: string;
  /** Exact attribution HTML — required by the provider's terms. */
  attribution: string;
  maxZoom: number;
  /** Subdomain pool for parallel tile fetching (omit when the URL has no {s}). */
  subdomains?: string;
}

/** Static (keyless) providers. CARTO providers are built at runtime — see buildCartoProviders. */
type StaticTileProviderId = Exclude<TileProviderId, 'carto-voyager' | 'carto-dark'>;

export const TILE_PROVIDERS: Record<StaticTileProviderId, TileProvider> = {
  'esri-topo': {
    id: 'esri-topo',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community',
    maxZoom: 19,
  },
  'esri-dark': {
    id: 'esri-dark',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Esri, DeLorme, NAVTEQ',
    maxZoom: 16,
  },
  'osm-standard': {
    id: 'osm-standard',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    subdomains: 'abc',
  },
};

/**
 * Builds the two CARTO providers for a published key. Key param name `key`
 * per https://carto.com/basemaps/ (verified 2026-10-17).
 */
export function buildCartoProviders(apiKey: string): {
  light: TileProvider;
  dark: TileProvider;
} {
  const key = encodeURIComponent(apiKey.trim());
  const attribution =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
  return {
    light: {
      id: 'carto-voyager',
      url: `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${key}`,
      attribution,
      maxZoom: 20,
    },
    dark: {
      id: 'carto-dark',
      url: `https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key=${key}`,
      attribution,
      maxZoom: 20,
    },
  };
}

/**
 * Ordered failover chain for a given theme. CARTO leads ONLY when a key is
 * published in GodMode; otherwise the chain is byte-for-byte the old
 * Esri → OSM behavior.
 */
function chainFor(dark: boolean, cartoKey: string | null): TileProvider[] {
  const chain: TileProvider[] = dark
    ? [TILE_PROVIDERS['esri-dark'], TILE_PROVIDERS['osm-standard']]
    : [TILE_PROVIDERS['esri-topo'], TILE_PROVIDERS['osm-standard']];
  if (cartoKey && cartoKey.trim().length > 0) {
    const carto = buildCartoProviders(cartoKey);
    chain.unshift(dark ? carto.dark : carto.light);
  }
  return chain;
}

/**
 * Detects the OS-level dark preference. Used as the default so night-time
 * map views automatically use the battery-friendly dark tiles on OLED phones.
 */
export function prefersDarkMap(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );
  } catch {
    return false;
  }
}

export interface ResilientTilesOptions {
  /**
   * Force dark or light tiles. When omitted, follows the OS dark preference
   * (battery-friendly dark maps at night).
   */
  dark?: boolean;
  /**
   * Called when every tile provider has failed — the caller should switch to
   * its offline schematic fallback (never a blank screen).
   */
  onAllFailed: () => void;
  /**
   * Consecutive tile errors before failing over to the next provider.
   * Default 3 — tolerates transient blips without flapping.
   * @default 3
   */
  failoverAfterErrors?: number;
}

export interface ResilientTilesHandle {
  /** Current provider in use. */
  currentProvider: () => TileProviderId;
  /** Remove the active layer and stop listening. */
  destroy: () => void;
}

/**
 * Adds a tile layer to a Leaflet map with automatic provider failover.
 *
 * Chain: CARTO (when a managed `cartoApiKey` is published in GodMode) →
 * Esri (topo or dark canvas) → OSM standard → `onAllFailed`. A handful of
 * consecutive `tileerror` events moves to the next provider; any successful
 * `tileload` resets the counter. The first provider is chosen by theme
 * (dark option or OS preference). The managed key is read synchronously
 * from the local cache — no network at map init, no behavior change when
 * no key is configured.
 *
 * @param L Leaflet module (dynamically imported by callers).
 * @param map Leaflet map instance.
 */
export function addResilientTiles(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  L: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  map: any,
  opts: ResilientTilesOptions,
): ResilientTilesHandle {
  const dark = opts.dark ?? prefersDarkMap();
  // Sync cache read only — never blocks map init on network. Null when the
  // owner hasn't published a key (or the cache is cold): Esri stays primary.
  const cartoKey = getCachedApiKeySync(CARTO_KEY_NAME);
  const chain = chainFor(dark, cartoKey);
  const failoverAfter = Math.max(1, opts.failoverAfterErrors ?? 3);

  let index = 0;
  let consecutiveErrors = 0;
  let destroyed = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let layer: any = null;

  const mount = (i: number) => {
    if (destroyed) return;
    const provider = chain[i];
    try {
      if (layer) {
        try {
          map.removeLayer(layer);
        } catch {
          /* noop */
        }
        layer = null;
      }
    } catch {
      /* noop */
    }
    // QUEUED #58 (YatraNet crash root cause): `subdomains` must be passed
    // ONLY when the provider defines it. Leaflet's L.setOptions copies own
    // keys verbatim — an explicit `subdomains: undefined` (Esri and CARTO
    // providers define none) clobbers TileLayer's default 'abc', and
    // _getSubdomain then throws "Cannot read properties of undefined
    // (reading 'length')" the moment the map creates its first tile —
    // which crashed EVERY map surface (YatraNet in all org types, SOS
    // responder map, campus maps, location picker) into its error
    // boundary on mount, deterministically, so retry always failed.
    layer = L.tileLayer(provider.url, {
      maxZoom: provider.maxZoom,
      attribution: provider.attribution,
      ...(provider.subdomains ? { subdomains: provider.subdomains } : {}),
    });
    layer.on('tileerror', onTileError);
    layer.on('tileload', onTileLoad);
    layer.addTo(map);
  };

  const onTileLoad = () => {
    consecutiveErrors = 0;
  };

  const onTileError = () => {
    if (destroyed) return;
    consecutiveErrors += 1;
    if (consecutiveErrors < failoverAfter) return;
    consecutiveErrors = 0;
    if (index + 1 < chain.length) {
      index += 1;
      mount(index);
    } else {
      // Every provider failed (offline, most likely) — hand over to the
      // caller's schematic fallback. Never a blank screen.
      try {
        if (layer) map.removeLayer(layer);
      } catch {
        /* noop */
      }
      layer = null;
      opts.onAllFailed();
    }
  };

  mount(0);

  return {
    currentProvider: (): TileProviderId => chain[index].id,
    destroy: () => {
      destroyed = true;
      try {
        if (layer) map.removeLayer(layer);
      } catch {
        /* noop */
      }
      layer = null;
    },
  };
}
