/**
 * tileProviders.ts — single source of truth for map tile layers.
 * ============================================================================
 * Every Leaflet map in the app (SOS responder map, campus visitor view,
 * campus builder) renders its base tiles through `addResilientTiles()` below.
 *
 * PROVIDER CHAIN (all $0, no API keys, no billing):
 *   1. CARTO basemaps (primary) — free with attribution, prettier cartography
 *      than raw OSM. Light: `voyager` · Dark: `dark_all`.
 *   2. OpenStreetMap standard (fallback) — the community tile service.
 *   3. The app's own offline schematic SVG (final fallback — handled by the
 *      caller via `onAllFailed`; the map never blank-screens).
 *
 * USAGE-POLICY NOTES (please keep these true):
 *   - CARTO basemaps are free for this use with the attribution line below.
 *     See https://carto.com/basemaps/ for terms.
 *   - OSM's tile servers are donation-funded: no bulk downloading / scraping,
 *     normal interactive panning only. The browser sends an identifying
 *     Referer automatically. If traffic ever outgrows fair use, switch the
 *     primary to a dedicated tile host — this module is the only file to edit.
 *   - Never add Google Maps tiles here: they require a billing account and
 *     violate the project's $0 / no-card rule.
 */

export type TileProviderId = 'carto-voyager' | 'carto-dark' | 'osm-standard';

export interface TileProvider {
  id: TileProviderId;
  /** Leaflet URL template. */
  url: string;
  /** Exact attribution HTML — required by the provider's terms. */
  attribution: string;
  maxZoom: number;
  /** Subdomain pool for parallel tile fetching. */
  subdomains: string;
}

export const TILE_PROVIDERS: Record<TileProviderId, TileProvider> = {
  'carto-voyager': {
    id: 'carto-voyager',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
    subdomains: 'abcd',
  },
  'carto-dark': {
    id: 'carto-dark',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
    subdomains: 'abcd',
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

/** Ordered failover chain for a given theme. */
function chainFor(dark: boolean): TileProviderId[] {
  return dark
    ? ['carto-dark', 'osm-standard']
    : ['carto-voyager', 'osm-standard'];
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
 * Chain: CARTO (voyager or dark_all) → OSM standard → `onAllFailed`.
 * A handful of consecutive `tileerror` events moves to the next provider;
 * any successful `tileload` resets the counter. The first provider is chosen
 * by theme (dark option or OS preference).
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
  const chain = chainFor(dark);
  const failoverAfter = Math.max(1, opts.failoverAfterErrors ?? 3);

  let index = 0;
  let consecutiveErrors = 0;
  let destroyed = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let layer: any = null;

  const mount = (i: number) => {
    if (destroyed) return;
    const provider = TILE_PROVIDERS[chain[i]];
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
    layer = L.tileLayer(provider.url, {
      maxZoom: provider.maxZoom,
      attribution: provider.attribution,
      subdomains: provider.subdomains,
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
    currentProvider: () => chain[index],
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
