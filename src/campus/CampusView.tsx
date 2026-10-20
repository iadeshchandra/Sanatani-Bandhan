/**
 * campus/CampusView.tsx — devotee-facing temple campus map.
 * ====================================================================
 * "Where is the prasad counter?" — the visitor sees every zone of the
 * temple, taps for details, and gets walking directions. Warm Sanatani
 * copy throughout; never corporate.
 *
 * Two render modes (from the org's saved map):
 *   geo   — Leaflet + OSM pins (offline → schematic fallback).
 *   image — pins over the temple's own layout image (fully offline).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, Navigation, Clock, X, Church, BadgeCheck, QrCode } from 'lucide-react';
import { subscribeToCampusMap } from './campusService';
import { subscribeToZoneReports, sweepExpiredReports, REPORT_META, reportRefreshMs, type ZoneReport } from './reporting';
import { ZONE_CATEGORY_META, zoneLabel, type CampusMap, type CampusZone } from './types';
import { useLanguage } from '../context/LanguageContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { RecordVisitButton } from '../tirtha/RecordVisitButton';
import { VisitCheckinSheet } from '../tirtha/VisitCheckinSheet';
import { ZoneQrScanSheet, type ZoneScanSuccess } from './ZoneQrScanSheet';
import { checkinPrefillFromScan, type CheckinPrefill } from './scanCheckin';
import { ZoneReportButton } from './ZoneReportButton';
import { GUIDES, useGuide, TourPill, TourLink, CoachMark } from '../components/guide';
import { addResilientTiles, type ResilientTilesHandle } from '../maps/tileProviders';
import '../crisis/leaflet.css';

interface Props {
  orgId: string;
  orgName: string;
  /** When true, the local expiry-sweep cadence degrades to 5 min (festival load). */
  festivalMode?: boolean;
}

export const CampusView: React.FC<Props> = ({ orgId, orgName, festivalMode = false }) => {
  const { currentLang } = useLanguage();
  const { firebaseUser } = useAuthWorkspace();
  const uid = (firebaseUser as { uid?: string } | null)?.uid || '';
  const scanLang = currentLang === 'bn' ? 'bn' : currentLang === 'hi' ? 'hi' : 'en';
  const [map, setMap] = useState<CampusMap | null>(null);
  const [reports, setReports] = useState<ZoneReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CampusZone | null>(null);
  const [tilesFailed, setTilesFailed] = useState(false);
  // Zone-QR scan door (audit 2026-10-20, offense #6): the devotee standing
  // AT the temple scans the 🛕 code right here — previously the scanner
  // existed only inside the Tirtha check-in form, four taps away.
  const [scanOpen, setScanOpen] = useState(false);
  const [scanPrefill, setScanPrefill] = useState<CheckinPrefill | null>(null);

  const handleScanVerified = (scan: ZoneScanSuccess) => {
    setScanOpen(false);
    setScanPrefill(checkinPrefillFromScan(scan));
  };
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMap = useRef<any>(null);
  // Quick Guide: visitor basics — invitational; dormant until the UX agent
  // wires campus routes into App.tsx.
  const campusGuide = useGuide('campus');

  useEffect(() => {
    let settled = false;
    const done = (m: CampusMap | null) => {
      if (settled) return;
      settled = true;
      setMap(m);
      setLoading(false);
    };
    const unsub = subscribeToCampusMap(orgId, done);
    const timer = setTimeout(() => done(null), 6000);
    return () => { settled = true; clearTimeout(timer); unsub(); };
  }, [orgId]);

  // Sevadar live reports — ONE realtime subscription per org.
  // (QUEUED #17: this used to unsubscribe + re-subscribe on a
  // reportRefreshMs timer, but subscribeToZoneReports is onSnapshot —
  // already realtime. Every re-attach re-read the whole result set,
  // churning Firestore reads and battery for zero benefit.)
  useEffect(() => subscribeToZoneReports(orgId, setReports), [orgId]);

  // Expiry sweep (render-only): the snapshot filter runs only when
  // Firestore pushes a change, so a lightweight tick re-filters
  // LOCALLY on the same cadence the old timer used — expired badges
  // still clear on an idle map, at zero Firestore cost. The tick runs
  // only while live reports exist and stops itself when the last one
  // expires. It never touches the subscription.
  const [nowMs, setNowMs] = useState(() => Date.now());
  const liveReports = useMemo(
    () => sweepExpiredReports(reports, nowMs),
    [reports, nowMs],
  );
  const hasLiveReports = liveReports.length > 0;
  useEffect(() => {
    if (!hasLiveReports) return;
    const t = setInterval(() => setNowMs(Date.now()), reportRefreshMs(festivalMode));
    return () => clearInterval(t);
  }, [hasLiveReports, festivalMode]);

  const reportsByZone = useMemo(() => {
    const m = new Map<string, ZoneReport[]>();
    for (const r of liveReports) {
      const arr = m.get(r.zoneId) ?? [];
      arr.push(r);
      m.set(r.zoneId, arr);
    }
    return m;
  }, [liveReports]);

  const geoZones = useMemo(
    () => (map?.zones ?? []).filter((z) => typeof z.lat === 'number' && typeof z.lng === 'number'),
    [map],
  );

  // Leaflet for geo mode.
  useEffect(() => {
    if (!map || map.mode !== 'geo' || !mapRef.current || geoZones.length === 0) return;
    let cancelled = false;
    let tilesHandle: ResilientTilesHandle | null = null;
    (async () => {
      try {
        const mod = await import('leaflet');
        const L = mod.default ?? mod;
        if (cancelled || !mapRef.current) return;
        const cLat = map.centerLat ?? geoZones[0].lat!;
        const cLng = map.centerLng ?? geoZones[0].lng!;
        const leaf = L.map(mapRef.current, { center: [cLat, cLng], zoom: map.zoom ?? 17 });
        // Base tiles via the shared resilient provider chain
        // (CARTO → OSM → schematic fallback). Never a blank screen.
        tilesHandle = addResilientTiles(L, leaf, {
          onAllFailed: () => { if (!cancelled) setTilesFailed(true); },
        });
        for (const z of geoZones) {
          const meta = ZONE_CATEGORY_META[z.category];
          const icon = L.divIcon({
            className: 'campus-pin',
            html: `<div style="width:40px;height:40px;border-radius:50%;background:#fff;border:2px solid #b45309;box-shadow:0 2px 8px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;font-size:20px;">${meta.icon}</div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
          });
          L.marker([z.lat!, z.lng!], { icon }).addTo(leaf)
            .bindPopup(`<b>${z.name}</b><br/>${meta.label}${z.hours ? `<br/>🕐 ${z.hours}` : ''}`);
        }
        leafletMap.current = leaf;
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
  }, [map, geoZones]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-stone-400">
        <MapPin className="w-8 h-8 animate-pulse" aria-hidden />
      </div>
    );
  }

  if (!map || map.zones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 px-6 text-center bg-stone-50 rounded-3xl border border-stone-200">
        <Church className="w-10 h-10 text-stone-300 mb-3" aria-hidden />
        <p className="text-[15px] font-semibold text-stone-600">
          🪔 {orgName} hasn't drawn its campus map yet.
        </p>
        <p className="text-[13px] text-stone-500 mt-1 max-w-xs">
          When the temple shares its map, you'll find every shrine, counter and quiet corner right here.
        </p>
      </div>
    );
  }

  const dirUrl = (z: CampusZone) =>
    z.lat != null && z.lng != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${z.lat},${z.lng}`
      : null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl" aria-hidden>🛕</span>
        <div className="flex-1">
          <h3 className="text-lg font-extrabold text-stone-900 flex items-center gap-2 flex-wrap">
            Campus map
            {/* Verified badge — this map was published by the temple's admins */}
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 rounded-full px-2.5 py-1">
              <BadgeCheck className="w-3.5 h-3.5" aria-hidden />
              Verified by {orgName}
            </span>
          </h3>
          <p className="text-[12px] text-stone-500">Find your way around {orgName} 🪔</p>
        </div>
        <TourLink guide={GUIDES.campus} onRestart={campusGuide.restart} />
        {uid && (
          <>
            {/* Scan the temple's own QR while standing here — verifies
                against the map, then opens the check-in pre-filled. */}
            <button
              type="button"
              onClick={() => setScanOpen(true)}
              aria-label={scanLang === 'bn' ? 'মন্দিরের QR স্ক্যান করুন' : scanLang === 'hi' ? 'मंदिर का QR स्कैन करें' : 'Scan temple QR'}
              className="rounded-xl px-4 py-2 text-sm font-bold min-h-[44px] bg-stone-900 hover:bg-stone-800 text-white flex items-center gap-1.5"
            >
              <QrCode className="w-4 h-4" aria-hidden />
              {scanLang === 'bn' ? '📷 স্ক্যান' : scanLang === 'hi' ? '📷 स्कैन' : '📷 Scan'}
            </button>
            <RecordVisitButton uid={uid} templeName={orgName} orgId={orgId} />
          </>
        )}
      </div>

      {hasLiveReports && (
        <div className="mb-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3" aria-live="polite">
          <p className="text-[13px] font-bold text-amber-900">📢 Live from our sevadars</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {liveReports.slice(0, 4).map((r) => {
              const meta = REPORT_META[r.type];
              return (
                <span key={r.id} className="inline-flex items-center gap-1.5 text-[12px] font-semibold bg-white border border-amber-200 rounded-full px-3 py-1.5">
                  <span aria-hidden>{meta.icon}</span> {r.zoneName}: {meta.label}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div data-guide-anchor="campus-map">
      {map.mode === 'geo' && !tilesFailed ? (
        <div
          ref={mapRef}
          className="w-full rounded-3xl border border-stone-200 overflow-hidden"
          style={{ height: 340, background: '#f5f0e8', zIndex: 0 }}
          role="application"
          aria-label={`Campus map of ${orgName}`}
        />
      ) : map.mode === 'image' && map.layoutImageUrl ? (
        <div className="relative rounded-3xl border border-stone-200 overflow-hidden bg-stone-100">
          <img src={map.layoutImageUrl} alt={`Layout of ${orgName}`} className="w-full h-auto" />
          {map.zones.map((z) => {
            if (z.x == null || z.y == null) return null;
            const meta = ZONE_CATEGORY_META[z.category];
            return (
              <button
                key={z.id}
                type="button"
                onClick={() => setSelected(z)}
                className="absolute min-w-[44px] min-h-[44px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white border-2 border-amber-700 shadow-lg flex items-center justify-center text-xl hover:scale-110 transition-transform"
                style={{ left: `${z.x / 10}%`, top: `${z.y / 10}%` }}
                aria-label={z.name}
              >
                {meta.icon}
              </button>
            );
          })}
        </div>
      ) : (
        /* Schematic fallback (offline geo or missing image): zone list */
        <div className="rounded-3xl border border-stone-200 bg-[#faf7f2] p-4">
          <p className="text-[12px] text-stone-500 text-center mb-3">
            🪔 Showing all sacred spots — tap one for details.
          </p>
        </div>
      )}
      </div>

      {/* Zone list — always available, works offline. Big targets, simple language. */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5" data-guide-anchor="campus-zones">
        {map.zones.map((z) => {
          const meta = ZONE_CATEGORY_META[z.category];
          const lbl = zoneLabel(z, currentLang);
          const url = dirUrl(z);
          const zReports = reportsByZone.get(z.id) ?? [];
          const topReport = zReports[0];
          return (
            <button
              key={z.id}
              type="button"
              onClick={() => setSelected(z)}
              className="flex items-center gap-3 bg-white rounded-2xl border border-stone-200 p-3.5 text-left hover:border-amber-400 hover:shadow-md transition-all min-h-[72px]"
            >
              <span className="text-3xl shrink-0" aria-hidden>{meta.icon}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-[16px] font-bold text-stone-900 truncate">{lbl.name}</span>
                <span className="block text-[13px] text-stone-500">{meta.label}</span>
                {topReport && (
                  <span className="inline-flex items-center gap-1 mt-1 text-[12px] font-bold text-amber-800 bg-amber-100 rounded-full px-2.5 py-1">
                    <span aria-hidden>{REPORT_META[topReport.type].icon}</span>
                    {REPORT_META[topReport.type].label}
                  </span>
                )}
              </span>
              {url && <Navigation className="w-5 h-5 text-amber-700 shrink-0" aria-hidden />}
            </button>
          );
        })}
      </div>

      {/* Zone detail sheet — big targets, simple language */}
      {selected && (
        <div
          className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center bg-stone-950/60 backdrop-blur-sm p-0 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={zoneLabel(selected, currentLang).name}
          onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}
        >
          <div className="w-full sm:max-w-md bg-gradient-to-b from-amber-50 to-stone-100 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-5xl" aria-hidden>{ZONE_CATEGORY_META[selected.category].icon}</span>
                <div>
                  <h3 className="text-2xl font-extrabold text-stone-900">{zoneLabel(selected, currentLang).name}</h3>
                  <p className="text-[14px] text-stone-500">{ZONE_CATEGORY_META[selected.category].label}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full bg-stone-200/70 text-stone-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            {(reportsByZone.get(selected.id) ?? []).length > 0 && (
              <div className="mt-4 space-y-2" aria-live="polite">
                {(reportsByZone.get(selected.id) ?? []).slice(0, 3).map((r) => (
                  <p key={r.id} className="flex items-center gap-2 text-[14px] font-bold text-amber-900 bg-amber-100 border border-amber-200 rounded-xl px-4 py-3">
                    <span className="text-xl" aria-hidden>{REPORT_META[r.type].icon}</span>
                    {REPORT_META[r.type].label}
                    {r.note ? <span className="font-medium text-amber-800"> — {r.note}</span> : null}
                  </p>
                ))}
              </div>
            )}
            {zoneLabel(selected, currentLang).description && (
              <p className="text-[15px] text-stone-700 mt-4 leading-relaxed">{zoneLabel(selected, currentLang).description}</p>
            )}
            {selected.hours && (
              <p className="flex items-center gap-2 text-[14px] font-semibold text-stone-600 mt-3">
                <Clock className="w-5 h-5" aria-hidden /> {selected.hours}
              </p>
            )}
            {dirUrl(selected) && (
              <a
                href={dirUrl(selected)!}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 w-full min-h-[56px] rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 text-amber-50 font-extrabold text-base flex items-center justify-center gap-2 shadow-lg hover:brightness-110"
              >
                <Navigation className="w-5 h-5" aria-hidden />
                Guide me here 🙏
              </a>
            )}
            {/* Sevadar live reporting — renders only for sevadar-grade roles */}
            <div className="mt-3">
              <ZoneReportButton
                orgId={orgId}
                zoneId={selected.id}
                zoneName={zoneLabel(selected, currentLang).name}
                festivalMode={festivalMode}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Quick Guide: visitor basics — invitational only. */}
      {campusGuide.pillVisible && (
        <TourPill guide={GUIDES.campus} onStart={campusGuide.start} onDismiss={campusGuide.dismissPill} />
      )}
      {campusGuide.tourActive && <CoachMark guide={GUIDES.campus} onFinish={campusGuide.finish} />}

      {/* Zone-QR scanner + verified check-in (the scan door's flow) */}
      {scanOpen && (
        <ZoneQrScanSheet onVerified={handleScanVerified} onClose={() => setScanOpen(false)} />
      )}
      {scanPrefill && uid && (
        <VisitCheckinSheet
          uid={uid}
          initialTemple={scanPrefill.templeName}
          initialOrgId={scanPrefill.orgId}
          onSaved={() => setScanPrefill(null)}
          onClose={() => setScanPrefill(null)}
        />
      )}
    </div>
  );
};
