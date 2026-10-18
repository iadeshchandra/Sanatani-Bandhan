/**
 * campus/MapYourTemple.tsx — "Map Your Temple" guided onboarding wizard.
 * ============================================================================
 * "Draw your temple in 10 minutes." A 5-step flow around the CampusBuilder
 * engine (shared types, service, category metadata) — not a second engine.
 *
 *   1. Main shrine    — one tap to drop the sanctum pin
 *   2. Entrances      — devotees must never feel lost
 *   3. Comforts       — prasad, water, restrooms, shoe stand (checklist)
 *   4. Everything else— full 19-category picker (optional)
 *   5. Review & publish — devotee preview, completeness, one-tap fixes
 *
 * Laws: drafts auto-save every change (IndexedDB); publish blocked until
 * required items are placed; overlaps warn, never block; RBAC visibly
 * enforced (page already gates — this shows the guard, warmly).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { get, set, del } from 'idb-keyval';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Loader2,
  Lock,
  MapPin,
  Plus,
  Save,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react';
import { getCampusMap, saveCampusMap } from './campusService';
import {
  ZONE_CATEGORY_META,
  type CampusMap,
  type CampusZone,
  type OrgKind,
  type ZoneCategory,
} from './types';
import { addResilientTiles, type ResilientTilesHandle } from '../maps/tileProviders';
import { useLanguage } from '../context/LanguageContext';
import {
  checkCompleteness,
  clampStep,
  countPlaced,
  createDraft,
  detectOverlaps,
  draftKey,
  ESSENTIAL_COMFORTS,
  moveZone,
  newZoneFor,
  parseDraft,
  PRIMARY_CATEGORY,
  PRIMARY_LABEL,
  removeZone,
  type WizardDraft,
  type WizardStep,
} from './wizardLogic';
import '../crisis/leaflet.css';

/* ------------------------------------------------------------------ */
/* i18n helper                                                        */
/* ------------------------------------------------------------------ */

type Lang = 'en' | 'hi' | 'bn';
const pick = (lang: string, en: string, hi: string, bn: string): string =>
  lang === 'bn' ? bn : lang === 'hi' ? hi : en;

/* ------------------------------------------------------------------ */
/* Props                                                              */
/* ------------------------------------------------------------------ */

export interface MapYourTempleProps {
  orgId: string;
  orgName: string;
  orgKind: OrgKind;
  uid: string;
  /** The signed-in user's role in THIS org (lowercased). Gate lives here too. */
  myRole: string;
  onDone?: () => void;
  onClose?: () => void;
}

const MANAGING_ROLES = ['superadmin', 'trustee'];

/* ------------------------------------------------------------------ */
/* Wizard map — focused Leaflet pin placer                            */
/* ------------------------------------------------------------------ */

interface WizardMapProps {
  zones: CampusZone[];
  placing: boolean;
  onPlace: (lat: number, lng: number) => void;
  lang: Lang;
}

const WizardMap: React.FC<WizardMapProps> = ({ zones, placing, onPlace, lang }) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMap = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const onPlaceRef = useRef(onPlace);
  onPlaceRef.current = onPlace;
  const placingRef = useRef(placing);
  placingRef.current = placing;

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;
    let cancelled = false;
    let tilesHandle: ResilientTilesHandle | null = null;
    (async () => {
      try {
        const mod = await import('leaflet');
        const L = mod.default ?? mod;
        if (cancelled || !mapRef.current) return;
        const first = zones.find((z) => z.lat != null && z.lng != null);
        const leaf = L.map(mapRef.current).setView(
          first ? [first.lat!, first.lng!] : [22.5726, 88.3639],
          16,
        );
        tilesHandle = addResilientTiles(L, leaf, { onAllFailed: () => {} });
        leaf.on('click', (e: any) => {
          if (!placingRef.current) return;
          onPlaceRef.current(e.latlng.lat, e.latlng.lng);
        });
        leafletMap.current = { leaf, L };
      } catch {
        /* offline — pins still listable */
      }
    })();
    return () => {
      cancelled = true;
      try { tilesHandle?.destroy(); } catch { /* noop */ }
      try { leafletMap.current?.leaf?.remove(); } catch { /* noop */ }
      leafletMap.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync markers with zones.
  useEffect(() => {
    const inst = leafletMap.current;
    if (!inst) return;
    const { leaf, L } = inst;
    for (const m of markersRef.current) {
      try { m.remove(); } catch { /* noop */ }
    }
    markersRef.current = [];
    for (const z of zones) {
      if (z.lat == null || z.lng == null) continue;
      const meta = ZONE_CATEGORY_META[z.category];
      const icon = L.divIcon({
        className: 'wizard-pin',
        html: `<div style="font-size:26px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))">${meta.icon}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 28],
      });
      const marker = L.marker([z.lat, z.lng], { icon })
        .addTo(leaf)
        .bindPopup(`<b>${z.name}</b><br/>${meta.label}`);
      markersRef.current.push(marker);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zones]);

  return (
    <div className="relative">
      <div
        ref={mapRef}
        className="w-full h-[320px] md:h-[380px] rounded-2xl border border-stone-200 overflow-hidden bg-stone-100"
        style={{ cursor: placing ? 'crosshair' : undefined }}
        aria-label={pick(lang, 'Temple map', 'मंदिर का नक्शा', 'মন্দিরের মানচিত্র')}
      />
      {placing && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-amber-900/95 text-amber-50 text-sm font-bold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 pointer-events-none min-h-[44px]">
          <MapPin size={18} aria-hidden />
          {pick(lang, 'Tap the map to place the pin', 'पिन लगाने के लिए नक्शे पर टैप करें', 'পিন বসাতে মানচিত্রে ট্যাপ করুন')}
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Step progress dots                                                 */
/* ------------------------------------------------------------------ */

const StepDots: React.FC<{ step: WizardStep; lang: Lang }> = ({ step, lang }) => (
  <div className="flex items-center justify-center gap-2" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={5}
    aria-label={pick(lang, `Step ${step} of 5`, `चरण ${step} / 5`, `ধাপ ${step} / ৫`)}>
    {([1, 2, 3, 4, 5] as WizardStep[]).map((s) => (
      <span
        key={s}
        className={`h-2.5 rounded-full transition-all ${s === step ? 'w-8 bg-amber-600' : s < step ? 'w-2.5 bg-amber-400' : 'w-2.5 bg-stone-300'}`}
      />
    ))}
  </div>
);

/* ------------------------------------------------------------------ */
/* Main wizard                                                        */
/* ------------------------------------------------------------------ */

const MapYourTemple: React.FC<MapYourTempleProps> = ({
  orgId, orgName, orgKind, uid, myRole, onDone, onClose,
}) => {
  const { currentLang } = useLanguage();
  const lang: Lang = currentLang === 'bn' ? 'bn' : currentLang === 'hi' ? 'hi' : 'en';
  const t = (en: string, hi: string, bn: string) => pick(lang, en, hi, bn);

  const [draft, setDraft] = useState<WizardDraft | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [placingFor, setPlacingFor] = useState<string | null>(null); // zone id awaiting tap
  const [pendingCategory, setPendingCategory] = useState<ZoneCategory | null>(null);
  const [saving, setSaving] = useState(false);
  const [published, setPublished] = useState(false);

  const canManage = MANAGING_ROLES.includes((myRole || '').toLowerCase());
  const primaryLabel = PRIMARY_LABEL[orgKind] ?? PRIMARY_LABEL.other;

  /* Load: published map wins, else draft, else blank. */
  useEffect(() => {
    let done = false;
    (async () => {
      let zones: CampusZone[] = [];
      let step: WizardStep = 1;
      try {
        const [saved, rawDraft] = await Promise.all([
          getCampusMap(orgId).catch(() => null),
          get(draftKey(orgId)).catch(() => null),
        ]);
        if (done) return;
        if (saved) {
          zones = saved.zones;
          // Resume where the draft left off, but keep published zones.
          const d = parseDraft(rawDraft);
          if (d && d.zones.length > 0) {
            // Draft has unsaved work — prefer it, it's newer by design.
            zones = d.zones;
            step = d.step;
          }
        } else {
          const d = parseDraft(rawDraft);
          if (d) {
            zones = d.zones;
            step = d.step;
          }
        }
      } catch {
        /* offline — start blank */
      }
      if (done) return;
      setDraft({ ...createDraft(orgId, orgName, orgKind), zones, step });
      setLoaded(true);
    })();
    return () => { done = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  /* Auto-save draft on every change. */
  useEffect(() => {
    if (!draft || !loaded) return;
    const timer = setTimeout(() => {
      void set(draftKey(orgId), { ...draft, updatedAt: Date.now() }).catch(() => {});
    }, 400);
    return () => clearTimeout(timer);
  }, [draft, loaded, orgId]);

  const zones = draft?.zones ?? [];
  const step: WizardStep = draft ? clampStep(draft.step) : 1;
  const setStep = (s: WizardStep) =>
    setDraft((d) => (d ? { ...d, step: s } : d));

  const updateZones = useCallback((zs: CampusZone[]) => {
    setDraft((d) => (d ? { ...d, zones: zs } : d));
  }, []);

  /* Pin placement from the map tap. */
  const handlePlace = useCallback((lat: number, lng: number) => {
    if (placingFor) {
      updateZones(moveZone(zones, placingFor, lat, lng));
      setPlacingFor(null);
      return;
    }
    if (pendingCategory) {
      const name = pendingName(pendingCategory);
      const z = newZoneFor(pendingCategory, name);
      z.lat = lat; z.lng = lng;
      updateZones([...zones, z]);
      setPendingCategory(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placingFor, pendingCategory, zones, updateZones, lang]);

  const pendingName = (category: ZoneCategory): string => {
    const comfort = ESSENTIAL_COMFORTS.find((c) => c.category === category);
    if (comfort) return comfort.defaultName[lang];
    if (category === 'gate') return t('Main Gate', 'मुख्य द्वार', 'প্রধান ফটক');
    const meta = ZONE_CATEGORY_META[category];
    const n = countPlaced(zones, category) + 1;
    return n > 1 ? `${meta.label} ${n}` : meta.label;
  };

  /* Publish. */
  const handlePublish = async () => {
    const report = checkCompleteness(zones, orgKind);
    if (!report.canPublish || !draft) return;
    setSaving(true);
    try {
      const named = zones.filter((z) => z.name.trim().length > 0 && z.lat != null);
      const first = named[0];
      const map: CampusMap = {
        orgId, orgName, mode: 'geo',
        layoutImageUrl: null,
        centerLat: first?.lat ?? 22.5726,
        centerLng: first?.lng ?? 88.3639,
        zoom: 17,
        zones: named,
        updatedAt: Date.now(),
        updatedBy: uid,
      };
      await saveCampusMap(map, uid);
      await del(draftKey(orgId)).catch(() => {});
      setPublished(true);
      onDone?.();
    } finally {
      setSaving(false);
    }
  };

  const completeness = useMemo(() => checkCompleteness(zones, orgKind), [zones, orgKind]);
  const overlaps = useMemo(() => detectOverlaps(zones), [zones]);

  /* ---- RBAC gate (warm, never blank) ---- */
  if (loaded && !canManage) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
        <div className="text-center max-w-sm bg-white rounded-3xl border border-stone-200 p-8 shadow-sm">
          <Lock size={36} className="mx-auto text-amber-600 mb-3" aria-hidden />
          <h2 className="text-lg font-black text-stone-900">
            {t('Trustees only 🪔', 'केवल ट्रस्टी 🪔', 'শুধুমাত্র ট্রাস্টি 🪔')}
          </h2>
          <p className="text-sm text-stone-500 mt-2 leading-relaxed">
            {t(
              `Only trustees and admins of ${orgName} can draw its temple map. Ask your trustee to set it up — you can explore the visitor map meanwhile.`,
              `${orgName} का मंदिर मानचित्र केवल ट्रस्टी और व्यवस्थापक बना सकते हैं। अपने ट्रस्टी से कहें — तब तक दर्शक मानचित्र देखें।`,
              `শুধুমাত্র ${orgName}-এর ট্রাস্টি ও প্রশাসকরা মন্দিরের মানচিত্র আঁকতে পারেন। আপনার ট্রাস্টিকে বলুন — ততক্ষণে দর্শনার্থী মানচিত্র দেখুন।`,
            )}
          </p>
          {onClose && (
            <button
              onClick={onClose}
              className="mt-5 px-6 py-3 min-h-[48px] rounded-xl bg-amber-700 text-white text-sm font-black"
            >
              {t('Go back', 'वापस जाएँ', 'ফিরে যান')}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!loaded || !draft) {
    return (
      <div className="flex justify-center py-16 text-stone-400">
        <Loader2 className="w-8 h-8 animate-spin" aria-hidden />
      </div>
    );
  }

  if (published) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4" aria-hidden>🪔</div>
          <h2 className="text-xl font-black text-stone-900">
            {t('Your temple is on the map!', 'आपका मंदिर मानचित्र पर है!', 'আপনার মন্দির মানচিত্রে!')}
          </h2>
          <p className="text-sm text-stone-500 mt-2 leading-relaxed">
            {t(
              'Devotees can now find every corner. Tirtha Diary check-ins and "temples near me" pick it up automatically.',
              'भक्त अब हर कोना ढूँढ सकते हैं। तीर्थ डायरी और "आस-पास के मंदिर" इसे खुद ले लेंगे।',
              'ভক্তরা এখন প্রতিটি কোণা খুঁজে পাবেন। তীর্থ ডায়েরি ও "কাছের মন্দির" নিজেই নিয়ে নেবে।',
            )}
          </p>
          {onDone && (
            <button
              onClick={onDone}
              className="mt-6 px-6 py-3 min-h-[48px] rounded-xl bg-amber-700 text-white text-sm font-black"
            >
              {t('View the map', 'मानचित्र देखें', 'মানচিত্র দেখুন')}
            </button>
          )}
        </div>
      </div>
    );
  }

  const placing = placingFor !== null || pendingCategory !== null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header: title + visible RBAC guard */}
      <div className="text-center mb-4">
        <div className="text-4xl mb-2" aria-hidden>🗺️</div>
        <h1 className="text-2xl font-black text-stone-900">
          {t('Map Your Temple', 'अपना मंदिर मैप करें', 'আপনার মন্দিরের মানচিত্র')}
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          {t('Draw it in 10 minutes — devotees will find every corner. 🪔', '10 मिनट में बनाएँ — भक्त हर कोना पाएँगे। 🪔', '১০ মিনিটে এঁকে ফেলুন — ভক্তরা প্রতিটি কোণা খুঁজে পাবেন। 🪔')}
        </p>
        <p className="inline-flex items-center gap-1.5 text-[12px] text-stone-400 mt-2 bg-stone-100 rounded-full px-3 py-1.5">
          <Lock size={12} aria-hidden />
          {t(
            `Only trustees of ${orgName} can edit this map`,
            `इस मानचित्र को केवल ${orgName} के ट्रस्टी संपादित कर सकते हैं`,
            `এই মানচিত্র শুধুমাত্র ${orgName}-এর ট্রাস্টিরা সম্পাদনা করতে পারেন`,
          )}
        </p>
      </div>

      <StepDots step={step} lang={lang} />

      <div className="mt-6">
        {step === 1 && (
          <StepShrine
            t={t} zones={zones} orgKind={orgKind}
            placing={placingFor !== null}
            onStartPlace={() => {
              const primary = PRIMARY_CATEGORY[orgKind];
              const found = zones.find((z) => z.category === primary && z.lat != null);
              if (found) { setPlacingFor(found.id); }
              else {
                const z = newZoneFor(primary, primaryLabel[lang]);
                const withId = [...zones, z];
                updateZones(withId);
                setPlacingFor(z.id);
              }
            }}
            onCancelPlace={() => setPlacingFor(null)}
          />
        )}
        {step === 2 && (
          <StepGates
            t={t} zones={zones}
            placing={placingFor !== null || pendingCategory === 'gate'}
            onAddGate={() => setPendingCategory('gate')}
            onMove={(id) => setPlacingFor(id)}
            onRemove={(id) => updateZones(removeZone(zones, id))}
            onCancelPlace={() => { setPlacingFor(null); setPendingCategory(null); }}
          />
        )}
        {step === 3 && (
          <StepComforts
            t={t} zones={zones} lang={lang}
            placingCategory={pendingCategory}
            onPlace={(c) => setPendingCategory(c)}
            onMove={(id) => setPlacingFor(id)}
            onRemove={(id) => updateZones(removeZone(zones, id))}
            onCancelPlace={() => { setPlacingFor(null); setPendingCategory(null); }}
          />
        )}
        {step === 4 && (
          <StepMore
            t={t} zones={zones} lang={lang}
            placingCategory={pendingCategory}
            onPlace={(c) => setPendingCategory(c)}
            onRemove={(id) => updateZones(removeZone(zones, id))}
            onCancelPlace={() => setPendingCategory(null)}
          />
        )}
        {step === 5 && (
          <StepReview
            t={t} zones={zones} orgKind={orgKind} lang={lang}
            completeness={completeness} overlaps={overlaps}
            onAddMissing={(category, name) => {
              const z = newZoneFor(category, name);
              updateZones([...zones, z]);
              setPlacingFor(z.id);
              setStep(2); // jump back to map to place it
            }}
            onRemove={(id) => updateZones(removeZone(zones, id))}
          />
        )}
      </div>

      {/* Map (steps 1–4) */}
      {step < 5 && (
        <div className="mt-4">
          <WizardMap zones={zones} placing={placing} onPlace={handlePlace} lang={lang} />
        </div>
      )}

      {/* Placed pins list (steps 2–4) */}
      {step >= 2 && step <= 4 && zones.length > 0 && (
        <PlacedList t={t} zones={zones} onRemove={(id) => updateZones(removeZone(zones, id))} onMove={(id) => setPlacingFor(id)} placingId={placingFor} />
      )}

      {/* Footer nav */}
      <div className="flex items-center justify-between gap-3 mt-6 pb-8">
        <button
          onClick={() => (step > 1 ? setStep((step - 1) as WizardStep) : onClose?.())}
          className="flex items-center gap-2 px-5 py-3 min-h-[48px] rounded-xl border border-stone-300 text-stone-700 text-sm font-bold"
        >
          <ArrowLeft size={18} aria-hidden />
          {step > 1 ? t('Back', 'पीछे', 'পেছনে') : t('Exit', 'बाहर', 'বেরিয়ে যান')}
        </button>
        <button
          onClick={() => onClose?.()}
          className="flex items-center gap-2 px-4 py-3 min-h-[48px] rounded-xl text-stone-500 text-sm font-bold"
          title={t('Draft auto-saves — finish anytime', 'ड्राफ्ट खुद सहेजा जाता है', 'খসড়া নিজেই সংরক্ষিত হয়')}
        >
          <Save size={16} aria-hidden />
          {t('Save & finish later', 'सहेजें और बाद में', 'সংরক্ষণ করে পরে')}
        </button>
        {step < 5 ? (
          <button
            onClick={() => setStep((step + 1) as WizardStep)}
            disabled={step === 1 && !zones.some((z) => z.category === PRIMARY_CATEGORY[orgKind] && z.lat != null)}
            className="flex items-center gap-2 px-6 py-3 min-h-[48px] rounded-xl bg-amber-700 text-white text-sm font-black disabled:opacity-40"
          >
            {t('Continue', 'आगे', 'এগিয়ে যান')}
            <ArrowRight size={18} aria-hidden />
          </button>
        ) : (
          <button
            onClick={handlePublish}
            disabled={!completeness.canPublish || saving}
            className="flex items-center gap-2 px-6 py-3 min-h-[48px] rounded-xl bg-amber-700 text-white text-sm font-black disabled:opacity-40"
          >
            {saving ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Check size={18} aria-hidden />}
            {t('Publish map 🪔', 'मानचित्र प्रकाशित करें 🪔', 'মানচিত্র প্রকাশ করুন 🪔')}
          </button>
        )}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Step 1 — main shrine                                               */
/* ------------------------------------------------------------------ */

const StepShrine: React.FC<{
  t: (en: string, hi: string, bn: string) => string;
  zones: CampusZone[];
  orgKind: OrgKind;
  placing: boolean;
  onStartPlace: () => void;
  onCancelPlace: () => void;
}> = ({ t, zones, orgKind, placing, onStartPlace, onCancelPlace }) => {
  const primary = PRIMARY_CATEGORY[orgKind];
  const placed = zones.some((z) => z.category === primary && z.lat != null);
  const label = PRIMARY_LABEL[orgKind] ?? PRIMARY_LABEL.other;
  // lang is embedded via t(); label shown in current UI language through parent.
  return (
    <div className="text-center">
      <h2 className="text-xl font-black text-stone-900">
        {t(`Where is your ${label.en.toLowerCase()}?`, `आपका ${label.hi} कहाँ है?`, `আপনার ${label.bn} কোথায়?`)}
      </h2>
      <p className="text-sm text-stone-500 mt-2 max-w-md mx-auto leading-relaxed">
        {t(
          'One tap on the map — this is the heart devotees navigate by.',
          'नक्शे पर एक टैप — यही वह हृदय है जिससे भक्त मार्ग पाते हैं।',
          'মানচিত্রে একটি ট্যাপ — এটিই সেই প্রাণকেন্দ্র যা ধরে ভক্তরা পথ খুঁজবেন।',
        )}
      </p>
      <div className="mt-4">
        {placing ? (
          <button
            onClick={onCancelPlace}
            className="px-6 py-3 min-h-[48px] rounded-xl border border-stone-300 text-stone-600 text-sm font-bold inline-flex items-center gap-2"
          >
            <X size={18} aria-hidden />
            {t('Cancel placement', 'रद्द करें', 'বাতিল করুন')}
          </button>
        ) : (
          <button
            onClick={onStartPlace}
            className="px-6 py-3 min-h-[52px] rounded-xl bg-amber-700 text-white text-sm font-black inline-flex items-center gap-2 shadow-md"
          >
            <MapPin size={18} aria-hidden />
            {placed
              ? t('Move the pin', 'पिन हटाएँ', 'পিন সরান')
              : t('Place the shrine pin 🛕', 'मंदिर पिन लगाएँ 🛕', 'মন্দিরের পিন বসান 🛕')}
          </button>
        )}
      </div>
      {placed && !placing && (
        <p className="text-sm text-emerald-700 font-bold mt-3 inline-flex items-center gap-1.5">
          <CheckCircle2 size={16} aria-hidden />
          {t('Placed — tap Continue when ready', 'लग गया — तैयार हों तो आगे बढ़ें', 'বসানো হয়েছে — প্রস্তুত হলে এগিয়ে যান')}
        </p>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Step 2 — entrances                                                 */
/* ------------------------------------------------------------------ */

const StepGates: React.FC<{
  t: (en: string, hi: string, bn: string) => string;
  zones: CampusZone[];
  placing: boolean;
  onAddGate: () => void;
  onMove: (id: string) => void;
  onRemove: (id: string) => void;
  onCancelPlace: () => void;
}> = ({ t, zones, placing, onAddGate, onMove, onRemove, onCancelPlace }) => {
  const gates = zones.filter((z) => z.category === 'gate');
  const placedCount = gates.filter((g) => g.lat != null).length;
  return (
    <div className="text-center">
      <h2 className="text-xl font-black text-stone-900">
        {t('How do devotees enter?', 'भक्त कैसे प्रवेश करते हैं?', 'ভক্তরা কীভাবে প্রবেশ করেন?')}
      </h2>
      <p className="text-sm text-stone-500 mt-2 max-w-md mx-auto leading-relaxed">
        {t(
          'Mark every entrance — so no visitor ever feels lost. Add the exit too, if it differs.',
          'हर प्रवेश द्वार चिह्नित करें — ताकि कोई दर्शक कभी भटके नहीं। निकास भी जोड़ें, यदि अलग हो।',
          'প্রতিটি প্রবেশপথ চিহ্নিত করুন — যাতে কোনো দর্শনার্থী কখনও হারিয়ে না যান। প্রস্থানপথ আলাদা হলে সেটিও যোগ করুন।',
        )}
      </p>
      <div className="mt-4 flex items-center justify-center gap-3">
        {placing ? (
          <button
            onClick={onCancelPlace}
            className="px-6 py-3 min-h-[48px] rounded-xl border border-stone-300 text-stone-600 text-sm font-bold inline-flex items-center gap-2"
          >
            <X size={18} aria-hidden />{t('Cancel', 'रद्द करें', 'বাতিল')}
          </button>
        ) : (
          <button
            onClick={onAddGate}
            className="px-6 py-3 min-h-[52px] rounded-xl bg-amber-700 text-white text-sm font-black inline-flex items-center gap-2 shadow-md"
          >
            <Plus size={18} aria-hidden />
            {t('Add entrance 🚪', 'प्रवेश द्वार जोड़ें 🚪', 'প্রবেশপথ যোগ করুন 🚪')}
          </button>
        )}
      </div>
      {placedCount > 0 && (
        <p className="text-sm text-emerald-700 font-bold mt-3">
          {t(`${placedCount} entrance${placedCount > 1 ? 's' : ''} placed ✓`, `${placedCount} प्रवेश द्वार ✓`, `${placedCount}টি প্রবেশপথ ✓`)}
        </p>
      )}
      {gates.length > 0 && (
        <GateList t={t} gates={gates} onMove={onMove} onRemove={onRemove} />
      )}
    </div>
  );
};

const GateList: React.FC<{
  t: (en: string, hi: string, bn: string) => string;
  gates: CampusZone[];
  onMove: (id: string) => void;
  onRemove: (id: string) => void;
}> = ({ t, gates, onMove, onRemove }) => (
  <div className="mt-4 max-w-md mx-auto space-y-2 text-left">
    {gates.map((g, i) => (
      <div key={g.id} className="flex items-center gap-2 bg-white border border-stone-200 rounded-xl px-3 py-2.5">
        <span className="text-xl" aria-hidden>🚪</span>
        <input
          value={g.name}
          onChange={() => {}}
          placeholder={t(`Entrance ${i + 1}`, `प्रवेश ${i + 1}`, `প্রবেশপথ ${i + 1}`)}
          aria-label={t('Gate name', 'द्वार का नाम', 'ফটকের নাম')}
          className="flex-1 min-w-0 text-sm font-bold text-stone-800 bg-transparent focus:outline-none"
          readOnly
        />
        <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${g.lat != null ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
          {g.lat != null ? '✓' : '…'}
        </span>
        <button onClick={() => onMove(g.id)} className="w-11 h-11 flex items-center justify-center rounded-full text-amber-700 hover:bg-amber-50" aria-label={t('Move pin', 'पिन हटाएँ', 'পিন সরান')}>
          <MapPin size={18} />
        </button>
        <button onClick={() => onRemove(g.id)} className="w-11 h-11 flex items-center justify-center rounded-full text-stone-400 hover:bg-stone-100" aria-label={t('Remove', 'हटाएँ', 'মুছুন')}>
          <Trash2 size={18} />
        </button>
      </div>
    ))}
  </div>
);

/* ------------------------------------------------------------------ */
/* Step 3 — essential comforts                                        */
/* ------------------------------------------------------------------ */

const StepComforts: React.FC<{
  t: (en: string, hi: string, bn: string) => string;
  zones: CampusZone[];
  lang: 'en' | 'hi' | 'bn';
  placingCategory: ZoneCategory | null;
  onPlace: (c: ZoneCategory) => void;
  onMove: (id: string) => void;
  onRemove: (id: string) => void;
  onCancelPlace: () => void;
}> = ({ t, zones, lang, placingCategory, onPlace, onMove, onRemove, onCancelPlace }) => {
  const done = ESSENTIAL_COMFORTS.filter((c) => zones.some((z) => z.category === c.category && z.lat != null)).length;
  return (
    <div className="text-center">
      <h2 className="text-xl font-black text-stone-900">
        {t('Essential comforts', 'मूलभूत सुविधाएँ', 'প্রয়োজনীয় সুবিধা')}
      </h2>
      <p className="text-sm text-stone-500 mt-2 max-w-md mx-auto leading-relaxed">
        {t(
          'One tap each — the small kindnesses devotees remember.',
          'हर एक पर एक टैप — वे छोटी सुविधाएँ जो भक्त याद रखते हैं।',
          'প্রতিটিতে একটি ট্যাপ — সেই ছোট্ট যত্ন যা ভক্তরা মনে রাখেন।',
        )}
      </p>
      <p className="text-sm font-black text-amber-700 mt-3">
        {t(`${done} of ${ESSENTIAL_COMFORTS.length} placed`, `${ESSENTIAL_COMFORTS.length} में से ${done}`, `${ESSENTIAL_COMFORTS.length}টির মধ্যে ${done}টি`)}
      </p>
      <div className="mt-4 max-w-md mx-auto space-y-2 text-left">
        {ESSENTIAL_COMFORTS.map((c) => {
          const meta = ZONE_CATEGORY_META[c.category];
          const existing = zones.find((z) => z.category === c.category && z.lat != null);
          const isPlacing = placingCategory === c.category;
          return (
            <div key={c.category} className="flex items-center gap-3 bg-white border border-stone-200 rounded-xl px-4 py-3">
              <span className="text-2xl" aria-hidden>{meta.icon}</span>
              <span className="flex-1 font-bold text-stone-800 text-sm">{c.defaultName[lang]}</span>
              {existing ? (
                <>
                  <CheckCircle2 size={20} className="text-emerald-600" aria-hidden />
                  <button onClick={() => onMove(existing.id)} className="w-11 h-11 flex items-center justify-center rounded-full text-amber-700 hover:bg-amber-50" aria-label={t('Move pin', 'पिन हटाएँ', 'পিন সরান')}>
                    <MapPin size={18} />
                  </button>
                  <button onClick={() => onRemove(existing.id)} className="w-11 h-11 flex items-center justify-center rounded-full text-stone-400 hover:bg-stone-100" aria-label={t('Remove', 'हटाएँ', 'মুছুন')}>
                    <Trash2 size={18} />
                  </button>
                </>
              ) : isPlacing ? (
                <button onClick={onCancelPlace} className="px-4 py-2.5 min-h-[44px] rounded-xl border border-stone-300 text-stone-600 text-sm font-bold">
                  {t('Cancel', 'रद्द करें', 'বাতিল')}
                </button>
              ) : (
                <button
                  onClick={() => onPlace(c.category)}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl bg-amber-100 text-amber-800 text-sm font-black hover:bg-amber-200"
                >
                  {t('Place', 'लगाएँ', 'বসান')}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Step 4 — everything else                                           */
/* ------------------------------------------------------------------ */

const StepMore: React.FC<{
  t: (en: string, hi: string, bn: string) => string;
  zones: CampusZone[];
  lang: 'en' | 'hi' | 'bn';
  placingCategory: ZoneCategory | null;
  onPlace: (c: ZoneCategory) => void;
  onRemove: (id: string) => void;
  onCancelPlace: () => void;
}> = ({ t, zones, lang, placingCategory, onPlace, onRemove, onCancelPlace }) => {
  const used = new Set<ZoneCategory>(['garbhagriha', 'gate', ...ESSENTIAL_COMFORTS.map((c) => c.category)]);
  const rest = (Object.keys(ZONE_CATEGORY_META) as ZoneCategory[]).filter((c) => !used.has(c));
  return (
    <div className="text-center">
      <h2 className="text-xl font-black text-stone-900">
        {t('Everything else', 'और सब कुछ', 'বাকি সব')}
      </h2>
      <p className="text-sm text-stone-500 mt-2 max-w-md mx-auto leading-relaxed">
        {t(
          'Parking, halls, gardens — whatever makes your campus yours. Optional: you can always add more later.',
          'पार्किंग, हॉल, उद्यान — जो भी आपके परिसर को खास बनाए। वैकल्पिक: बाद में भी जोड़ सकते हैं।',
          'পার্কিং, হল, বাগান — যা আপনার প্রাঙ্গণকে আপনার করে তোলে। ঐচ্ছিক: পরে যেকোনো সময় যোগ করতে পারেন।',
        )}
      </p>
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-lg mx-auto">
        {rest.map((c) => {
          const meta = ZONE_CATEGORY_META[c];
          const count = zones.filter((z) => z.category === c && z.lat != null).length;
          const isPlacing = placingCategory === c;
          return (
            <button
              key={c}
              onClick={() => (isPlacing ? onCancelPlace() : onPlace(c))}
              className={`flex items-center gap-2 px-3 py-3 min-h-[52px] rounded-xl border text-sm font-bold text-left ${
                isPlacing ? 'border-amber-600 bg-amber-50 text-amber-800' : 'border-stone-200 bg-white text-stone-700 hover:border-amber-300'
              }`}
            >
              <span className="text-xl" aria-hidden>{meta.icon}</span>
              <span className="flex-1 truncate">{meta.label}</span>
              {count > 0 && (
                <span className="text-[11px] bg-emerald-100 text-emerald-700 font-black rounded-full px-2 py-0.5">{count}✓</span>
              )}
            </button>
          );
        })}
      </div>
      {zones.filter((z) => rest.includes(z.category)).length > 0 && (
        <button
          onClick={() => {
            const extra = zones.filter((z) => rest.includes(z.category));
            const last = extra[extra.length - 1];
            if (last) onRemove(last.id);
          }}
          className="mt-3 text-sm text-stone-400 font-bold underline"
        >
          {t('Remove last added', 'अंतिम हटाएँ', 'শেষটি মুছুন')}
        </button>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Step 5 — review & publish                                          */
/* ------------------------------------------------------------------ */

const StepReview: React.FC<{
  t: (en: string, hi: string, bn: string) => string;
  zones: CampusZone[];
  orgKind: OrgKind;
  lang: 'en' | 'hi' | 'bn';
  completeness: ReturnType<typeof checkCompleteness>;
  overlaps: ReturnType<typeof detectOverlaps>;
  onAddMissing: (category: ZoneCategory, name: string) => void;
  onRemove: (id: string) => void;
}> = ({ t, zones, lang, completeness, overlaps, onAddMissing, onRemove }) => {
  const placed = zones.filter((z) => z.lat != null && z.name.trim());
  return (
    <div>
      <h2 className="text-xl font-black text-stone-900 text-center">
        {t('Review & publish', 'समीक्षा और प्रकाशन', 'পর্যালোচনা ও প্রকাশ')}
      </h2>
      <p className="text-sm text-stone-500 mt-2 text-center max-w-md mx-auto leading-relaxed">
        {t(
          'This is what devotees will see. Check it with love before it goes live.',
          'भक्त यही देखेंगे। लाइव होने से पहले प्यार से जाँच लें।',
          'ভক্তরা এটাই দেখবেন। প্রকাশের আগে ভালোবেসে যাচাই করে নিন।',
        )}
      </p>

      {/* Completeness checklist */}
      <div className="mt-5 bg-white border border-stone-200 rounded-2xl p-4 max-w-lg mx-auto">
        <h3 className="text-sm font-black text-stone-800 mb-3">
          {t('Completeness', 'पूर्णता', 'সম্পূর্ণতা')} — {completeness.requiredDone}/{completeness.requiredTotal} {t('required', 'आवश्यक', 'আবশ্যক')}
        </h3>
        <div className="space-y-2">
          {completeness.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              {item.done ? (
                <CheckCircle2 size={20} className="text-emerald-600 shrink-0" aria-hidden />
              ) : (
                <Circle size={20} className={item.required ? 'text-red-400 shrink-0' : 'text-stone-300 shrink-0'} aria-hidden />
              )}
              <span className={`flex-1 text-sm font-bold ${item.done ? 'text-stone-700' : 'text-stone-400'}`}>
                {item.label[lang]}
                {!item.required && (
                  <span className="ml-2 text-[11px] font-bold text-stone-400">
                    {t('(recommended)', '(सुझाया गया)', '(প্রস্তাবিত)')}
                  </span>
                )}
              </span>
              {!item.done && item.addCategory && item.addName && (
                <button
                  onClick={() => onAddMissing(item.addCategory!, item.addName![lang])}
                  className="px-3 py-2 min-h-[40px] rounded-xl bg-amber-100 text-amber-800 text-xs font-black"
                >
                  {t('+ Add it', '+ जोड़ें', '+ যোগ করুন')}
                </button>
              )}
            </div>
          ))}
        </div>
        {!completeness.canPublish && (
          <p className="text-xs text-red-600 font-bold mt-3">
            {t(
              'Place the required pins above to publish — devotees need the essentials to find their way.',
              'प्रकाशन के लिए ऊपर के आवश्यक पिन लगाएँ।',
              'প্রকাশ করতে উপরের আবশ্যক পিনগুলো বসান।',
            )}
          </p>
        )}
      </div>

      {/* Overlap warnings */}
      {overlaps.length > 0 && (
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 max-w-lg mx-auto">
          <h3 className="text-sm font-black text-amber-800 mb-2 flex items-center gap-2">
            <TriangleAlert size={16} aria-hidden />
            {t('Close together — is that right?', 'बहुत पास — क्या यह सही है?', 'খুব কাছাকাছি — ঠিক আছে তো?')}
          </h3>
          {overlaps.map((w, i) => (
            <p key={i} className="text-xs text-amber-700 leading-relaxed">
              {t(
                `"${w.zoneA.name}" and "${w.zoneB.name}" are ${w.distanceM}m apart.`,
                `"${w.zoneA.name}" और "${w.zoneB.name}" ${w.distanceM}मी दूर हैं।`,
                `"${w.zoneA.name}" ও "${w.zoneB.name}" ${w.distanceM}মি দূরে।`,
              )}
            </p>
          ))}
        </div>
      )}

      {/* Placed zones */}
      <div className="mt-4 max-w-lg mx-auto">
        <h3 className="text-sm font-black text-stone-800 mb-2">
          {t(`Your pins (${placed.length})`, `आपके पिन (${placed.length})`, `আপনার পিন (${placed.length})`)}
        </h3>
        <div className="space-y-2">
          {placed.map((z) => {
            const meta = ZONE_CATEGORY_META[z.category];
            return (
              <div key={z.id} className="flex items-center gap-3 bg-white border border-stone-200 rounded-xl px-3 py-2.5">
                <span className="text-xl" aria-hidden>{meta.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-stone-800 truncate">{z.name}</p>
                  <p className="text-[11px] text-stone-400">{meta.label}</p>
                </div>
                <button onClick={() => onRemove(z.id)} className="w-11 h-11 flex items-center justify-center rounded-full text-stone-400 hover:bg-stone-100" aria-label={t('Remove', 'हटाएँ', 'মুছুন')}>
                  <Trash2 size={18} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Placed pins strip (steps 2–4)                                      */
/* ------------------------------------------------------------------ */

const PlacedList: React.FC<{
  t: (en: string, hi: string, bn: string) => string;
  zones: CampusZone[];
  placingId: string | null;
  onRemove: (id: string) => void;
  onMove: (id: string) => void;
}> = ({ t, zones, placingId, onRemove, onMove }) => {
  const placed = zones.filter((z) => z.lat != null);
  if (placed.length === 0) return null;
  return (
    <div className="mt-4">
      <h3 className="text-xs font-black text-stone-500 uppercase tracking-wide mb-2">
        {t(`Placed (${placed.length})`, `लगाए गए (${placed.length})`, `বসানো (${placed.length})`)}
      </h3>
      <div className="flex flex-wrap gap-2">
        {placed.map((z) => {
          const meta = ZONE_CATEGORY_META[z.category];
          const active = placingId === z.id;
          return (
            <span
              key={z.id}
              className={`inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full border text-xs font-bold ${
                active ? 'border-amber-600 bg-amber-50 text-amber-800' : 'border-stone-200 bg-white text-stone-700'
              }`}
            >
              <span aria-hidden>{meta.icon}</span>
              <span className="max-w-[120px] truncate">{z.name}</span>
              <button onClick={() => onMove(z.id)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-amber-100" aria-label={t('Move', 'हटाएँ', 'সরান')}>
                <MapPin size={14} />
              </button>
              <button onClick={() => onRemove(z.id)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 text-stone-400" aria-label={t('Remove', 'हटाएँ', 'মুছুন')}>
                <X size={14} />
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default MapYourTemple;
