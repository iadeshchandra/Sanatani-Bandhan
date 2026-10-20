/**
 * campus/CampusBuilder.tsx — trustee/admin campus map builder.
 * ====================================================================
 * "Draw your temple in 10 minutes." Two modes:
 *   geo   — click the Leaflet map to drop each zone's pin.
 *   image — upload the temple's layout image (File Vault), click to pin.
 *
 * Starts from a per-org-type template; trustees add / move / remove
 * zones freely. Zone ids are stable once created (Phase 2/3 reference).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, Plus, Trash2, Save, Image as ImageIcon, Globe, Loader2, X, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getCampusMap, saveCampusMap } from './campusService';
import { uploadFile, getFileDataUrl } from '../lib/fileVault';
import { buildZoneQrPayload } from './zoneQr';
import {
  CAMPUS_TEMPLATES,
  ZONE_CATEGORY_META,
  slugifyZone,
  type CampusMap,
  type CampusMode,
  type CampusZone,
  type OrgKind,
  type ZoneCategory,
  type ZoneOpenHours,
} from './types';
import {
  buildOpenHours,
  draftRangesFrom,
  normalizeOpenHours,
  type RangeDraft,
} from './openHours';
import { addResilientTiles, type ResilientTilesHandle } from '../maps/tileProviders';
import '../crisis/leaflet.css';

const LANGS = [
  { code: 'bn', label: 'বাংলা' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'mr', label: 'मराठी' },
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'മലയാളം' },
  { code: 'sa', label: 'संस्कृतम्' },
];

interface Props {
  orgId: string;
  orgName: string;
  orgKind: OrgKind;
  uid: string;
  onSaved?: () => void;
}

const emptyZone = (): CampusZone => ({
  id: `zone_${Date.now().toString(36)}`,
  name: '',
  category: 'other',
});

const DAY_CHIP_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Structured-hours editor (QUEUED #19) — the trustee side of the
 * "Open now" badge. Optional in every way: empty = the zone simply
 * shows its free-text hours note and NO badge. Only complete, valid
 * ranges persist (buildOpenHours drops half-typed input), so a badge
 * can never appear from partial data. Mounted with key={zone.id} so
 * its draft state resets per zone.
 */
const ZoneHoursEditor: React.FC<{
  zone: CampusZone;
  onChange: (hours: ZoneOpenHours | undefined) => void;
}> = ({ zone, onChange }) => {
  const [drafts, setDrafts] = useState<RangeDraft[]>(() => draftRangesFrom(zone.openHours));
  const [showSecond, setShowSecond] = useState<boolean>(() => {
    const r = draftRangesFrom(zone.openHours);
    return Boolean(r[1].open || r[1].close);
  });
  const [closedDays, setClosedDays] = useState<number[]>(
    () => normalizeOpenHours(zone.openHours)?.closedDays ?? [],
  );

  const emit = (d: RangeDraft[], cd: number[], second: boolean) => {
    onChange(buildOpenHours(second ? d : [d[0]], cd));
  };
  const setRange = (i: number, patch: Partial<RangeDraft>) => {
    const next = drafts.map((r, j) => (j === i ? { ...r, ...patch } : r));
    setDrafts(next);
    emit(next, closedDays, showSecond);
  };
  const toggleDay = (d: number) => {
    const next = closedDays.includes(d)
      ? closedDays.filter((x) => x !== d)
      : [...closedDays, d].sort((a, b) => a - b);
    setClosedDays(next);
    emit(drafts, next, showSecond);
  };

  const timeField = (i: number, field: 'open' | 'close', label: string) => (
    <label className="block">
      <span className="text-[11px] font-bold text-stone-500 uppercase">{label}</span>
      <input
        type="time"
        value={drafts[i][field]}
        onChange={(e) => setRange(i, { [field]: e.target.value })}
        aria-label={`${label} time for ${zone.name || 'zone'}`}
        className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
      />
    </label>
  );

  return (
    <div className="rounded-xl bg-amber-50/60 border border-amber-100 px-3 py-3">
      <span className="text-[11px] font-bold text-stone-500 uppercase">
        Open-now badge (optional)
      </span>
      <p className="text-[12px] text-stone-500 mt-1 leading-relaxed">
        Set the daily hours and devotees see a live “Open now · closes …” badge
        on the map. Leave empty if timings change often — no badge is better
        than a wrong one.
      </p>
      <div className="grid grid-cols-2 gap-3 mt-2.5">
        {timeField(0, 'open', 'Opens')}
        {timeField(0, 'close', 'Closes')}
      </div>
      {showSecond ? (
        <div className="mt-2.5">
          <div className="grid grid-cols-2 gap-3">
            {timeField(1, 'open', 'Opens again')}
            {timeField(1, 'close', 'Closes')}
          </div>
          <button
            type="button"
            onClick={() => { setShowSecond(false); emit(drafts, closedDays, false); }}
            className="mt-1.5 text-[12px] font-bold text-red-700 min-h-[36px] px-2"
          >
            ✕ Remove second session
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowSecond(true)}
          className="mt-2 text-[12px] font-bold text-amber-800 min-h-[36px] px-2"
        >
          ＋ Add a second session (e.g. evening aarti)
        </button>
      )}
      <div className="mt-2">
        <span className="text-[11px] font-bold text-stone-500 uppercase">Closed on</span>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {DAY_CHIP_LABELS.map((label, d) => {
            const active = closedDays.includes(d);
            return (
              <button
                key={label}
                type="button"
                aria-pressed={active}
                onClick={() => toggleDay(d)}
                className={`min-h-[40px] px-3 rounded-full text-[12px] font-bold border transition-colors ${
                  active
                    ? 'bg-stone-800 text-white border-stone-800'
                    : 'bg-white text-stone-600 border-stone-300 hover:border-amber-400'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const CampusBuilder: React.FC<Props> = ({ orgId, orgName, orgKind, uid, onSaved }) => {
  const [mode, setMode] = useState<CampusMode>('geo');
  const [zones, setZones] = useState<CampusZone[]>([]);
  const [layoutImageUrl, setLayoutImageUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState<CampusZone | null>(null);
  const [placing, setPlacing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMap = useRef<any>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Load existing map (with offline timeout — the builder works from
  // the template when Firestore is unreachable).
  useEffect(() => {
    let done = false;
    const finish = (m: CampusMap | null) => {
      if (done) return;
      done = true;
      if (m) {
        setMode(m.mode);
        setZones(m.zones);
        setLayoutImageUrl(m.layoutImageUrl ?? null);
      } else {
        // Fresh: seed from the org-type template.
        const tpl = CAMPUS_TEMPLATES[orgKind] ?? CAMPUS_TEMPLATES.other;
        setZones(tpl.map((t) => ({ ...emptyZone(), id: slugifyZone(t.name), name: t.name, category: t.category, description: t.description })));
      }
      setLoaded(true);
    };
    void getCampusMap(orgId).then(finish).catch(() => finish(null));
    const timer = setTimeout(() => finish(null), 6000);
    return () => { done = true; clearTimeout(timer); };
  }, [orgId, orgKind]);

  // Leaflet editor map (geo mode).
  useEffect(() => {
    if (!loaded || mode !== 'geo' || !mapRef.current) return;
    let cancelled = false;
    let tilesHandle: ResilientTilesHandle | null = null;
    (async () => {
      try {
        const mod = await import('leaflet');
        const L = mod.default ?? mod;
        if (cancelled || !mapRef.current) return;
        const first = zones.find((z) => z.lat != null);
        const leaf = L.map(mapRef.current).setView(
          first ? [first.lat!, first.lng!] : [22.5726, 88.3639], 16,
        );
        // Base tiles via the shared resilient provider chain
        // (CARTO → OSM). The builder stays usable offline: zone list
        // editing never needs tiles.
        tilesHandle = addResilientTiles(L, leaf, {
          onAllFailed: () => { /* offline — list editing still works */ },
        });
        leaf.on('click', (e: any) => {
          if (!placing) return;
          const { lat, lng } = e.latlng;
          setEditing((ed) => (ed ? { ...ed, lat, lng } : ed));
          setPlacing(false);
        });
        leafletMap.current = leaf;
        // Render current zone pins.
        for (const z of zones) {
          if (z.lat == null || z.lng == null) continue;
          L.marker([z.lat, z.lng]).addTo(leaf).bindPopup(z.name);
        }
      } catch { /* offline — list editing still works */ }
    })();
    return () => {
      cancelled = true;
      try { tilesHandle?.destroy(); } catch { /* noop */ }
      try { leafletMap.current?.remove(); } catch { /* noop */ }
      leafletMap.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, mode]);

  const patchZone = (id: string, patch: Partial<CampusZone>) =>
    setZones((zs) => zs.map((z) => (z.id === id ? { ...z, ...patch } : z)));

  const addZone = () => {
    const z = emptyZone();
    setZones((zs) => [...zs, z]);
    setEditing(z);
  };

  const removeZone = (id: string) => {
    setZones((zs) => zs.filter((z) => z.id !== id));
    setEditing((ed) => (ed && ed.id === id ? null : ed));
  };

  const handleImageUpload = async (f: File) => {
    setUploading(true);
    try {
      const res = await uploadFile(f, { visibility: 'public', category: 'gallery', ownerUid: uid });
      const url = await getFileDataUrl(res.fileId);
      setLayoutImageUrl(url);
    } catch {
      /* vault handles the error surfacing via toast upstream */
    } finally {
      setUploading(false);
    }
  };

  const handleImageClick = (e: React.MouseEvent) => {
    if (!placing || !imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 1000);
    setEditing((ed) => (ed ? { ...ed, x, y } : ed));
    setPlacing(false);
  };

  const doSave = async () => {
    const named = zones.filter((z) => z.name.trim().length > 0);
    if (named.length === 0) return;
    setSaving(true);
    try {
      const map: CampusMap = {
        orgId, orgName, mode,
        layoutImageUrl: mode === 'image' ? layoutImageUrl : null,
        centerLat: mode === 'geo' ? (named.find((z) => z.lat != null)?.lat ?? null) : null,
        centerLng: mode === 'geo' ? (named.find((z) => z.lng != null)?.lng ?? null) : null,
        zoom: 17,
        zones: named,
        updatedAt: Date.now(),
        updatedBy: uid,
      };
      await saveCampusMap(map, uid);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  const ed = useMemo(
    () => (editing ? zones.find((z) => z.id === editing.id) ?? null : null),
    [editing, zones],
  );

  if (!loaded) {
    return <div className="flex justify-center py-12 text-stone-400"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl" aria-hidden>🛕</span>
        <div>
          <h3 className="text-lg font-extrabold text-stone-900">Campus map builder</h3>
          <p className="text-[12px] text-stone-500">Draw {orgName} in minutes — devotees will find every corner. 🪔</p>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-4" role="tablist" aria-label="Map mode">
        {(['geo', 'image'] as CampusMode[]).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`min-h-[44px] px-5 rounded-2xl font-bold text-sm flex items-center gap-2 border-2 transition-all ${
              mode === m
                ? 'bg-amber-700 text-amber-50 border-amber-700'
                : 'bg-white text-stone-600 border-stone-200 hover:border-amber-400'
            }`}
          >
            {m === 'geo' ? <Globe className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
            {m === 'geo' ? 'Real map' : 'Our layout image'}
          </button>
        ))}
      </div>

      {/* Placement surface */}
      {mode === 'geo' ? (
        <div>
          <div ref={mapRef} className="w-full rounded-3xl border border-stone-200" style={{ height: 300, background: '#f5f0e8', zIndex: 0 }} />
          <p className="text-[12px] text-stone-500 mt-2 text-center">
            {placing ? '👆 Tap the map to drop the pin.' : 'Pick a zone below, then tap “Place on map”.'}
          </p>
        </div>
      ) : (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImageUpload(f);
            }}
          />
          {layoutImageUrl ? (
            <div className="relative rounded-3xl border border-stone-200 overflow-hidden">
              <img
                ref={imgRef}
                src={layoutImageUrl}
                alt="Temple layout"
                className={`w-full h-auto ${placing ? 'cursor-crosshair' : ''}`}
                onClick={handleImageClick}
              />
              {zones.map((z) =>
                z.x != null && z.y != null ? (
                  <span
                    key={z.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 text-2xl pointer-events-none"
                    style={{ left: `${z.x / 10}%`, top: `${z.y / 10}%` }}
                  >
                    {ZONE_CATEGORY_META[z.category].icon}
                  </span>
                ) : null,
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute top-3 right-3 min-h-[44px] px-4 rounded-xl bg-stone-900/80 text-white text-sm font-bold"
              >
                {uploading ? 'Uploading…' : 'Replace image'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full min-h-[120px] rounded-3xl border-2 border-dashed border-stone-300 bg-stone-50 text-stone-500 font-semibold flex flex-col items-center justify-center gap-2 hover:border-amber-400"
            >
              {uploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <ImageIcon className="w-8 h-8" />}
              {uploading ? 'Uploading…' : 'Upload your temple layout image'}
            </button>
          )}
          {placing && <p className="text-[12px] text-stone-500 mt-2 text-center">👆 Tap the image to drop the pin.</p>}
        </div>
      )}

      {/* Zone list */}
      <div className="mt-5 space-y-2.5">
        {zones.map((z) => {
          const meta = ZONE_CATEGORY_META[z.category];
          const placed = mode === 'geo' ? z.lat != null : z.x != null;
          return (
            <div
              key={z.id}
              className={`bg-white rounded-2xl border-2 p-3.5 transition-all ${ed?.id === z.id ? 'border-amber-500 shadow-md' : 'border-stone-200'}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden>{meta.icon}</span>
                <button type="button" onClick={() => setEditing(z)} className="flex-1 text-left min-w-0">
                  <span className="block text-[15px] font-bold text-stone-900 truncate">{z.name || 'Unnamed zone'}</span>
                  <span className="block text-[12px] text-stone-500">
                    {placed ? '📍 Placed' : '⚠️ Not placed yet'} · {meta.label}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => { setEditing(z); setPlacing(true); }}
                  className="min-w-[44px] min-h-[44px] rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center hover:bg-amber-200"
                  aria-label={`Place ${z.name || 'zone'} on ${mode === 'geo' ? 'map' : 'image'}`}
                  title={mode === 'geo' ? 'Place on map' : 'Place on image'}
                >
                  <MapPin className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeZone(z.id)}
                  className="min-w-[44px] min-h-[44px] rounded-xl bg-red-50 text-red-700 flex items-center justify-center hover:bg-red-100"
                  aria-label={`Remove ${z.name || 'zone'}`}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {ed?.id === z.id && (
                <div className="mt-3 pt-3 border-t border-stone-100 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-[11px] font-bold text-stone-500 uppercase">Name</span>
                      <input
                        value={z.name}
                        onChange={(e) => patchZone(z.id, { name: e.target.value, id: z.id.startsWith('zone_') && !z.name ? slugifyZone(e.target.value) || z.id : z.id })}
                        placeholder="e.g. Prasad Counter"
                        className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-bold text-stone-500 uppercase">Type</span>
                      <select
                        value={z.category}
                        onChange={(e) => patchZone(z.id, { category: e.target.value as ZoneCategory })}
                        className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        {(Object.keys(ZONE_CATEGORY_META) as ZoneCategory[]).map((c) => (
                          <option key={c} value={c}>{ZONE_CATEGORY_META[c].icon} {ZONE_CATEGORY_META[c].label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="block">
                    <span className="text-[11px] font-bold text-stone-500 uppercase">What happens here? (for devotees)</span>
                    <input
                      value={z.description ?? ''}
                      onChange={(e) => patchZone(z.id, { description: e.target.value })}
                      placeholder="e.g. Receive blessed prasad after darshan"
                      className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-bold text-stone-500 uppercase">Hours (optional)</span>
                    <input
                      value={z.hours ?? ''}
                      onChange={(e) => patchZone(z.id, { hours: e.target.value })}
                      placeholder="e.g. 6:00 AM – 12:00 PM"
                      className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </label>
                  <ZoneHoursEditor
                    key={z.id}
                    zone={z}
                    onChange={(openHours) => patchZone(z.id, { openHours })}
                  />
                  {/* 10-language content — optional, falls back to the default name */}
                  <details className="rounded-xl bg-stone-50 border border-stone-200 px-3 py-2.5">
                    <summary className="text-[13px] font-bold text-stone-600 cursor-pointer min-h-[32px] flex items-center">
                      🌐 Translate this spot (9 languages)
                    </summary>
                    <div className="mt-2 space-y-2.5 pb-1">
                      {LANGS.map((l) => (
                        <div key={l.code} className="grid grid-cols-2 gap-2">
                          <input
                            value={z.labels?.[l.code]?.name ?? ''}
                            onChange={(e) => patchZone(z.id, {
                              labels: { ...(z.labels ?? {}), [l.code]: { ...(z.labels?.[l.code] ?? {}), name: e.target.value } },
                            })}
                            placeholder={`${l.label} name`}
                            aria-label={`${l.label} name for ${z.name}`}
                            className="rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                          <input
                            value={z.labels?.[l.code]?.description ?? ''}
                            onChange={(e) => patchZone(z.id, {
                              labels: { ...(z.labels ?? {}), [l.code]: { ...(z.labels?.[l.code] ?? {}), description: e.target.value } },
                            })}
                            placeholder={`${l.label} description`}
                            aria-label={`${l.label} description for ${z.name}`}
                            className="rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      ))}
                    </div>
                  </details>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="min-h-[44px] px-5 rounded-xl bg-stone-100 text-stone-700 font-bold text-sm flex items-center gap-2"
                  >
                    <X className="w-4 h-4" /> Done
                  </button>
                  {/* Zone QR — print and place at the spot's entrance. Anti-phishing:
                      the code only ever identifies this zone; it can never open
                      a payment or donation flow. */}
                  <details className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2.5">
                    <summary className="text-[13px] font-bold text-emerald-800 cursor-pointer min-h-[32px] flex items-center gap-2">
                      <QrCode className="w-4 h-4" /> Zone QR — print for the entrance
                    </summary>
                    <div className="mt-2 flex flex-col items-center gap-2 pb-1">
                      <div className="bg-white p-3 rounded-xl border border-emerald-200">
                        <QRCodeSVG value={buildZoneQrPayload(orgId, z.id)} size={160} />
                      </div>
                      <p className="text-[12px] text-emerald-800 text-center max-w-xs">
                        Devotees scan this to mark their visit here. It only identifies
                        this spot — it can never open payments or donations. 🛡️
                      </p>
                    </div>
                  </details>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={addZone}
          className="min-h-[52px] px-5 rounded-2xl bg-white border-2 border-dashed border-stone-300 text-stone-600 font-bold text-sm flex items-center gap-2 hover:border-amber-400"
        >
          <Plus className="w-5 h-5" /> Add a spot
        </button>
        <button
          type="button"
          onClick={() => void doSave()}
          disabled={saving || zones.filter((z) => z.name.trim()).length === 0}
          className="flex-1 min-h-[52px] rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 text-amber-50 font-extrabold text-sm shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? 'Saving…' : 'Publish campus map 🪔'}
        </button>
      </div>
    </div>
  );
};
