/**
 * maps/ResilientTileLayer.tsx — drop-in replacement for react-leaflet's
 * <TileLayer> that renders through the shared resilient tile chain.
 * ============================================================================
 * Usage (inside a react-leaflet <MapContainer>):
 *
 *   import { ResilientTileLayer } from '../../maps/ResilientTileLayer';
 *   <MapContainer ...>
 *     <ResilientTileLayer />
 *     ...
 *   </MapContainer>
 *
 * Renders CARTO basemaps (free, no key; dark tiles follow the OS dark
 * preference for battery-friendly night maps), fails over to OSM standard
 * on tile errors. Pass `dark` to force a theme.
 */
import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { addResilientTiles } from './tileProviders';

interface Props {
  /** Force dark or light tiles. Default: follow the OS dark preference. */
  dark?: boolean;
}

export const ResilientTileLayer: React.FC<Props> = ({ dark }) => {
  const map = useMap();
  useEffect(() => {
    // No schematic fallback in these generic maps — on total tile failure
    // the map simply shows its background. CARTO → OSM failover already
    // covers everything short of a fully offline device.
    const handle = addResilientTiles(L, map, { dark, onAllFailed: () => {} });
    return () => {
      handle.destroy();
    };
  }, [map, dark]);
  return null;
};
