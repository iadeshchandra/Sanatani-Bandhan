/**
 * Geographic coordinate guards.
 *
 * Leaflet throws `Invalid LatLng object: (undefined, undefined)` — a full
 * desk crash — whenever a Marker/Circle/MapContainer receives undefined or
 * non-finite coordinates. Records coming from GPS, seeds, or partial syncs
 * can carry a `location` object with missing lat/lng, so every map render
 * site must validate before handing coordinates to Leaflet.
 */

/** True only when lat/lng are finite numbers inside valid Earth bounds. */
export function isValidLatLng(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

/** Narrow an optional `{ lat, lng }`-shaped location to a valid tuple, or null. */
export function toLatLngTuple(
  location: { lat?: unknown; lng?: unknown } | null | undefined
): [number, number] | null {
  if (!location) return null;
  const { lat, lng } = location;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (!isValidLatLng(lat, lng)) return null;
  return [lat, lng];
}
