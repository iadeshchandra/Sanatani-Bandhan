/**
 * crisis/SOSResponderMap.tsx — responder live map for an active SOS.
 * ====================================================================
 * PRIVACY (non-negotiable):
 * - Renders the victim pin ONLY while event.status === 'active'.
 *   The moment it resolves/cancels, the map shows the "ended" state —
 *   the location is never rendered again from this component.
 * - Single point only (the SOS-moment GPS). No trail, no history.
 * - Audience is gated upstream (alert banner / coordinator dashboard);
 *   this component additionally refuses non-active events.
 *
 * MAP TECH: Leaflet + CARTO basemaps (free, no key; dark tiles at night)
 * with OSM fallback, via the shared src/maps/tileProviders module. If all
 * tiles fail (offline / patchy data), degrades to the schematic SVG view —
 * never a blank screen. Offline-first is a standing rule.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Navigation, MapPin, AlertTriangle } from 'lucide-react';
import type { CrisisEvent } from './types';
import { crisisCopy, useCrisisT } from './crisisStrings';
import { addResilientTiles, type ResilientTilesHandle } from '../maps/tileProviders';

const SEV_COLOR: Record<string, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#ca8a04',
};

function minutesAgo(ts: number | null | undefined): number | null {
  if (!ts) return null;
  const ms = Date.now() - ts;
  if (ms < 0) return 0;
  return Math.floor(ms / 60000);
}

interface Props {
  event: CrisisEvent;
  onAcknowledge?: () => void;
  acknowledged?: boolean;
}

export const SOSResponderMap: React.FC<Props> = ({ event, onAcknowledge, acknowledged }) => {
  const t = useCrisisT();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMap = useRef<any>(null);
  const [tilesFailed, setTilesFailed] = useState(false);
  const [leafletReady, setLeafletReady] = useState(false);

  const active = event.status === 'active';
  const lat = event.location?.lat;
  const lng = event.location?.lng;
  const hasCoords = typeof lat === 'number' && typeof lng === 'number';
  const color = SEV_COLOR[event.severity] ?? SEV_COLOR.medium;
  const ago = useMemo(() => minutesAgo(event.createdAt), [event.createdAt]);

  // Leaflet lifecycle — only for active events with coordinates.
  useEffect(() => {
    if (!active || !hasCoords || !mapRef.current) return;
    let cancelled = false;
    let tilesHandle: ResilientTilesHandle | null = null;
    let L: any = null;

    (async () => {
      try {
        const mod = await import('leaflet');
        L = mod.default ?? mod;
        if (cancelled || !mapRef.current) return;
        // Leaflet CSS is bundled via the app's global stylesheet import
        // (src/crisis/leaflet.css imported once in SOSResponderSheet).
        const map = L.map(mapRef.current, {
          center: [lat, lng],
          zoom: 16,
          zoomControl: true,
          attributionControl: true,
        });
        // Base tiles via the shared resilient provider chain
        // (CARTO → OSM → schematic fallback). Never a blank screen.
        tilesHandle = addResilientTiles(L, map, {
          onAllFailed: () => {
            // Every tile provider failed → destroy the map instance and
            // show the schematic fallback (offline-first).
            if (!cancelled) {
              try { map.remove(); } catch { /* noop */ }
              leafletMap.current = null;
              setTilesFailed(true);
            }
          },
        });
        const icon = L.divIcon({
          className: 'sos-pin-wrap',
          html: `<div style="width:44px;height:44px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:22px;">🆘</div>`,
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        });
        L.marker([lat, lng], { icon }).addTo(map)
          .bindPopup(`<b>${event.senderName || 'A devotee'}</b><br/>${event.situation}`)
          .openPopup();
        // Responder's own position (foreground only, best-effort).
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (cancelled) return;
              L.circleMarker([pos.coords.latitude, pos.coords.longitude], {
                radius: 8, color: '#1d4ed8', fillColor: '#3b82f6', fillOpacity: 0.9, weight: 2,
              }).addTo(map);
            },
            () => undefined,
            { timeout: 8000, maximumAge: 60000 },
          );
        }
        leafletMap.current = map;
        setLeafletReady(true);
      } catch {
        if (!cancelled) setTilesFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      try { tilesHandle?.destroy(); } catch { /* noop */ }
      try { leafletMap.current?.remove(); } catch { /* noop */ }
      leafletMap.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, hasCoords]);

  if (!active) {
    return (
      <div className="flex flex-col items-center justify-center py-14 px-6 text-center bg-stone-100 rounded-3xl border border-stone-200">
        <MapPin className="w-10 h-10 text-stone-400 mb-3" aria-hidden />
        <p className="text-[15px] font-semibold text-stone-600 max-w-xs">{t(crisisCopy.mapEnded)}</p>
      </div>
    );
  }

  if (!hasCoords) {
    return (
      <div className="flex flex-col items-center justify-center py-14 px-6 text-center bg-amber-50 rounded-3xl border border-amber-200">
        <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" aria-hidden />
        <p className="text-[15px] font-semibold text-amber-800 max-w-xs">
          {t(crisisCopy.mapOfflineNote)}
        </p>
      </div>
    );
  }

  const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  return (
    <div>
      {/* Freshness header */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="inline-flex items-center gap-2 text-[13px] font-bold text-red-800 bg-red-100 border border-red-200 rounded-full px-3 py-1.5"
          aria-live="polite"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" aria-hidden />
          {t(crisisCopy.mapActiveAgo)}
          {ago != null && ago > 0 ? ` · ${ago} min` : ''}
        </span>
        <span className="text-[12px] font-semibold text-stone-500">
          {event.senderName || 'A devotee'} · {event.situation}
        </span>
      </div>

      {/* Map or schematic fallback */}
      {!tilesFailed ? (
        <div
          ref={mapRef}
          className="w-full rounded-3xl border border-stone-200 overflow-hidden"
          style={{ height: 320, background: '#f5f0e8', zIndex: 0 }}
          role="application"
          aria-label={t(crisisCopy.mapViewTitle)}
        />
      ) : (
        <div className="rounded-3xl border border-stone-200 overflow-hidden bg-[#faf7f2] p-6">
          <p className="text-[12px] text-stone-500 text-center mb-4">{t(crisisCopy.mapOfflineNote)}</p>
          <svg viewBox="0 0 400 240" className="w-full h-auto" role="img" aria-label={t(crisisCopy.mapViewTitle)}>
            <circle cx="200" cy="120" r="90" fill="none" stroke="#d6c9b8" strokeWidth="1" strokeDasharray="4 4" />
            <circle cx="200" cy="120" r="45" fill="none" stroke="#d6c9b8" strokeWidth="1" strokeDasharray="4 4" />
            <circle cx="200" cy="120" r="26" fill={color} opacity="0.22">
              <animate attributeName="r" values="20;32;20" dur="1.6s" repeatCount="indefinite" />
            </circle>
            <circle cx="200" cy="104" r="13" fill={color} stroke="#fff" strokeWidth="3" />
            <path d="M 191 112 L 200 128 L 209 112 Z" fill={color} stroke="#fff" strokeWidth="1.5" />
            <text x="200" y="152" fontSize="12" fill="#44403c" textAnchor="middle" fontWeight="700">
              {event.senderName || 'A devotee'}
            </text>
            <text x="200" y="170" fontSize="10" fill="#78716c" textAnchor="middle">
              {Number(lat).toFixed(4)}, {Number(lng).toFixed(4)}
            </text>
          </svg>
        </div>
      )}

      {/* One-tap actions */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <a
          href={navUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-[52px] rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 text-amber-50 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg hover:brightness-110"
        >
          <Navigation className="w-5 h-5" aria-hidden />
          {t(crisisCopy.mapNavigate)}
        </a>
        {onAcknowledge && !acknowledged ? (
          <button
            type="button"
            onClick={onAcknowledge}
            className="min-h-[52px] rounded-2xl bg-stone-800 text-stone-50 font-extrabold text-sm hover:bg-stone-700"
          >
            {t(crisisCopy.ackButton)}
          </button>
        ) : (
          <div className="min-h-[52px] rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold text-sm flex items-center justify-center px-3 text-center">
            {t(crisisCopy.ackedMessage)}
          </div>
        )}
      </div>
    </div>
  );
};
