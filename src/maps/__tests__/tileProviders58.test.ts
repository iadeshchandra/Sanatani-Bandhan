/**
 * tileProviders58.test.ts — QUEUED #58 regression pins for the YatraNet
 * crash (audit #58 item 1).
 *
 * Root cause: addResilientTiles passed `subdomains: provider.subdomains`
 * verbatim. Esri and CARTO providers define no subdomains, so the option
 * arrived as an explicit `undefined`, which Leaflet's L.setOptions copies
 * over TileLayer's default 'abc'; _getSubdomain then threw
 * "Cannot read properties of undefined (reading 'length')" on the first
 * tile — crashing every ResilientTileLayer surface (YatraNet in all org
 * types, SOS map, campus maps, location picker) into its error boundary
 * on mount, deterministically (retry always failed).
 *
 * These tests drive addResilientTiles with a fake Leaflet + map and pin
 * the options contract: no `subdomains` key at all for providers that
 * don't define one; 'abc' for OSM.
 */
// No CARTO key in tests (Esri primary) — and mocking apiKeys keeps the
// firebase ESM chain out of this unit test entirely.
jest.mock('../../apikeys/apiKeys', () => ({
  getCachedApiKeySync: () => null,
}));

import { addResilientTiles } from '../tileProviders';

function makeFakeLeaflet() {
  const layers: any[] = [];
  const L = {
    tileLayer: jest.fn((url: string, options: any) => {
      const layer: any = {
        url,
        options,
        handlers: {} as Record<string, Function>,
        on: jest.fn((event: string, cb: Function) => {
          layer.handlers[event] = cb;
          return layer;
        }),
        addTo: jest.fn(() => layer),
      };
      layers.push(layer);
      return layer;
    }),
  };
  const map = { removeLayer: jest.fn() };
  return { L, map, layers };
}

describe('addResilientTiles — subdomains contract (Q58)', () => {
  it('never passes an undefined subdomains option for the Esri primary', () => {
    const { L, map, layers } = makeFakeLeaflet();
    const handle = addResilientTiles(L, map, { dark: false, onAllFailed: () => {} });

    expect(L.tileLayer).toHaveBeenCalledTimes(1);
    const firstOptions = (L.tileLayer as jest.Mock).mock.calls[0][1];
    // THE pin: the key must be absent entirely — an own key holding
    // `undefined` is exactly what clobbered Leaflet's default and
    // crashed every map desk on mount.
    expect(Object.prototype.hasOwnProperty.call(firstOptions, 'subdomains')).toBe(false);
    expect(handle.currentProvider()).toBe('esri-topo');
    handle.destroy();
    expect(layers[0]).toBeDefined();
  });

  it('fails over to OSM with its real subdomains after repeated tile errors', () => {
    const { L, map } = makeFakeLeaflet();
    const onAllFailed = jest.fn();
    const handle = addResilientTiles(L, map, {
      dark: false,
      onAllFailed,
      failoverAfterErrors: 2,
    });

    const layers = (L.tileLayer as jest.Mock).mock.results.map((r: any) => r.value);
    // Two consecutive errors on Esri → mount OSM.
    layers[0].handlers['tileerror']();
    layers[0].handlers['tileerror']();

    expect(L.tileLayer).toHaveBeenCalledTimes(2);
    const osmOptions = (L.tileLayer as jest.Mock).mock.calls[1][1];
    expect(osmOptions.subdomains).toBe('abc');
    expect(handle.currentProvider()).toBe('osm-standard');
    expect(onAllFailed).not.toHaveBeenCalled();
    handle.destroy();
  });

  it('dark chain also omits subdomains for Esri dark', () => {
    const { L, map } = makeFakeLeaflet();
    const handle = addResilientTiles(L, map, { dark: true, onAllFailed: () => {} });
    const firstOptions = (L.tileLayer as jest.Mock).mock.calls[0][1];
    expect(Object.prototype.hasOwnProperty.call(firstOptions, 'subdomains')).toBe(false);
    expect(handle.currentProvider()).toBe('esri-dark');
    handle.destroy();
  });
});
