/**
 * tileProviders.ts — single source of truth for map tile layers.
 * ============================================================================
 * Every Leaflet map in the app (SOS responder map, campus visitor view,
 * campus builder, and all react-leaflet maps via <ResilientTileLayer>)
 * renders its base tiles through `addResilientTiles()` below.
 *
 * PROVIDER CHAIN (all $0, no API keys, no billing):
 *   1. Esri basemaps (primary) — free to embed with attribution, no key.
 *      Light: World Topo Map · Dark: Dark Gray Canvas (battery-friendly
 *      night maps). Note the Esri tile URL order is {z}/{y}/{x}.
 *   2. OpenStreetMap standard (fallback) — the community tile service.
 *   3. The app's own offline schematic SVG (final fallback — handled by the
 *      caller via `onAllFailed`; the map never blank-screens).
 *
 * WHY NOT CARTO: since 25 September 2026 CARTO raster tiles require a free
 * API key (their tiles now render "API KEY REQUIRED" without one). If the
 * owner ever requests a key (1 minute, no account, carto.com/basemaps/apikey)
 * it can be re-added here as primary with `?key=` — until then Esri is the
 * best keyless option. Google Maps is permanently off the table: it needs a
 * billing account and violates the project's $0 / no-card rule.
 *
 * USAGE-POLICY NOTES (please keep these true):
 *   - Esri basemaps are free to embed with the attribution line below.
 *     See https://www.esri.com/en-us/legal/terms/full-master-agreement
 *     (free basemap use) — do not strip the attribution.
 *   - OSM's tile servers are donation-funded: no bulk downloading / scraping,
 *     normal interactive panning only. The browser sends an identifying
 *     Referer automatically. If traffic ever outgrows fair use, switch the
 *     primary to a dedicated tile host — this module is the only file to edit.
 */

export type TileProviderId = 'esri-topo' | 'esri-dark' | 'osm-standard';

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

export const TILE_PROVIDERS: Record<TileProviderId, TileProvider> = {
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

/** Ordered failover chain for a given theme. */
function chainFor(dark: boolean): TileProviderId[] {
  return dark
    ? ['esri-dark', 'osm-standard']
    : ['esri-topo', 'osm-standard'];
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
 * Chain: Esri (topo or dark canvas) → OSM standard → `onAllFailed`.
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
