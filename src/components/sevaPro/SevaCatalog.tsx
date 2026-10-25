/**
 * SevaCatalog — the devotee's occasion-first journey through the unified catalog.
 * ==============================================================================
 * "What occasion brings you here?" → pick a samskara/life event → see the
 * curated path (jyotish counsel first, purohit ritual after) → book it as ONE
 * bundle → track both linked services in a single view via shared bundleId.
 *
 * Life events are SAMSKARAS, not use cases — copy honors that. Timing notes
 * are respectful, never prescriptive: the jyotishi decides the muhurat.
 *
 * Trilingual EN / BN / HI, mobile-first, ≥44px touch targets. New UI — does
 * not touch the existing marketplace/devotee browse screens.
 */
import React, { useMemo, useState } from 'react';
import { ArrowLeft, CalendarHeart, CheckCircle2, Circle, Sparkles, Users } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { PublicLanguageButton } from '../public/PublicLanguageButton';
import {
  LIFE_EVENTS,
  getLifeEvent,
  tritext,
  createBundlePlan,
  refreshBundleStatus,
  bundleStore,
  type DisplayLang,
  type LifeEvent,
  type SevaBundle,
  type BundleItem,
  type BundleItemStatus,
} from '../../lib/sevaPro/lifeEvents';

const EVENT_ICON: Record<string, string> = {
  vivah: '💍',
  'griha-pravesh': '🏠',
  naamkaran: '👶',
  annaprashan: '🍚',
  mundan: '✂️',
  upanayanam: '🧵',
  vidyarambham: '📖',
  'navagraha-shanti': '🪐',
  'kaal-sarp-shanti': '🐍',
  'pitru-paksha': '🙏',
  vastu: '🧭',
  'business-opening': '🪔',
};

const COPY: Record<string, Record<DisplayLang, string>> = {
  occasionTitle: {
    en: 'What occasion brings you here?',
    bn: 'কোন উপলক্ষে এসেছেন?',
    hi: 'किस अवसर पर पधारे हैं?',
  },
  occasionSub: {
    en: 'Choose a samskara or life event — we will gently guide the whole journey.',
    bn: 'একটি সংস্কার বা জীবনের ঘটনা বেছে নিন — পুরো যাত্রায় আমরা স্নেহে পথ দেখাব।',
    hi: 'एक संस्कार या जीवन-घटना चुनें — पूरी यात्रा में हम स्नेह से मार्ग दिखाएँगे।',
  },
  curatedPath: {
    en: 'Your curated path',
    bn: 'আপনার সাজানো পথ',
    hi: 'आपका सुझाया मार्ग',
  },
  timing: {
    en: 'On auspicious timing',
    bn: 'শুভ সময় সম্পর্কে',
    hi: 'शुभ समय पर',
  },
  bookBundle: {
    en: 'Book this journey together',
    bn: 'এই যাত্রা একসাথে বুক করুন',
    hi: 'यह यात्रा एक साथ बुक करें',
  },
  bundlePlanned: {
    en: 'Your bundle is planned — book each step when ready. Both stay linked in one view.',
    bn: 'আপনার বান্ডিল পরিকল্পিত — প্রস্তুত হলে প্রতিটি ধাপ বুক করুন। দুটোই এক দৃশ্যে যুক্ত থাকবে।',
    hi: 'आपका बंडल योजनाबद्ध है — तैयार हों तो प्रत्येक चरण बुक करें। दोनों एक ही दृश्य में जुड़े रहेंगे।',
  },
  myJourneys: {
    en: 'My journeys',
    bn: 'আমার যাত্রা',
    hi: 'मेरी यात्राएँ',
  },
  back: { en: 'Back', bn: 'পেছনে', hi: 'पीछे' },
  stepCounsel: { en: 'Counsel & timing', bn: 'পরামর্শ ও সময়', hi: 'परामर्श व समय' },
  stepRitual: { en: 'Sacred rite', bn: 'পবিত্র বিধি', hi: 'पवित्र विधि' },
  statusPlanned: { en: 'Planned', bn: 'পরিকল্পিত', hi: 'योजनाबद्ध' },
  statusBooked: { en: 'Booked', bn: 'বুকড', hi: 'बुक' },
  statusCompleted: { en: 'Completed', bn: 'সম্পন্ন', hi: 'पूर्ण' },
  samskaraTag: { en: 'Samskara', bn: 'সংস্কার', hi: 'संस्कार' },
};

function asLang(currentLang: string): DisplayLang {
  return currentLang === 'bn' || currentLang === 'hi' ? currentLang : 'en';
}

export interface SevaCatalogProps {
  /** Devotee uid for bundle ownership. Falls back to 'anon-devotee' for browsing. */
  devoteeUid?: string;
  className?: string;
}

export const SevaCatalog: React.FC<SevaCatalogProps> = ({
  devoteeUid = 'anon-devotee',
  className = '',
}) => {
  const { currentLang } = useLanguage();
  const lang = asLang(currentLang || 'en');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bundles, setBundles] = useState<SevaBundle[]>(() => bundleStore.list(devoteeUid));

  const event: LifeEvent | undefined = selectedId ? getLifeEvent(selectedId) : undefined;

  const createBundle = (id: string) => {
    const plan = createBundlePlan(devoteeUid, id);
    bundleStore.save(plan);
    setBundles(bundleStore.list(devoteeUid));
  };

  const markItem = (bundleId: string, itemId: string) => {
    const all = bundleStore.list(devoteeUid);
    const b = all.find((x) => x.bundleId === bundleId);
    if (!b) return;
    const nextItems: BundleItem[] = b.items.map((i) => {
      const status: BundleItemStatus =
        i.status === 'planned' ? 'booked' : i.status === 'booked' ? 'completed' : i.status;
      return { ...i, status };
    });
    const next = refreshBundleStatus({ ...b, items: nextItems });
    bundleStore.save(next);
    setBundles(bundleStore.list(devoteeUid));
  };

  const statusLabel = (s: string) =>
    s === 'completed' ? COPY.statusCompleted[lang]
      : s === 'booked' ? COPY.statusBooked[lang]
        : COPY.statusPlanned[lang];

  const bundleCountLabel = useMemo(
    () => `${bundles.length}`,
    [bundles]
  );

  return (
    <div className={`space-y-5 ${className}`}>
      {/* World-Readiness B4 (G-L3): the canonical language door. */}
      <div className="flex justify-end">
        <PublicLanguageButton tone="light" />
      </div>
      {/* ---- My journeys (bundle tracking) ---- */}
      {bundles.length > 0 && (
        <section aria-label={COPY.myJourneys[lang]} className="space-y-3">
          <h2 className="flex items-center gap-2 text-base font-bold text-stone-900 dark:text-stone-50">
            <Users className="h-4 w-4" aria-hidden="true" />
            {COPY.myJourneys[lang]} · {bundleCountLabel}
          </h2>
          {bundles.map((b) => {
            const ev = getLifeEvent(b.eventId);
            return (
              <article
                key={b.bundleId}
                className="rounded-3xl border border-amber-200/70 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-950/20 p-4"
              >
                <p className="text-sm font-bold text-stone-900 dark:text-stone-50">
                  {ev ? tritext(ev.name, lang) : b.eventId}
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-stone-500 dark:text-stone-400">
                  {b.bundleId}
                </p>
                <ol className="mt-3 space-y-2">
                  {b.items.map((item) => {
                    const svc = ev?.services.find((s) => s.key === item.serviceKey);
                    const done = item.status === 'completed';
                    return (
                      <li key={item.itemId}>
                        <button
                          type="button"
                          onClick={() => markItem(b.bundleId, item.itemId)}
                          className="flex min-h-[44px] w-full items-center gap-3 rounded-2xl bg-white/70 dark:bg-stone-900/60 px-3 py-2 text-left"
                          aria-label={`${svc ? tritext(svc.title, lang) : item.serviceKey} — ${statusLabel(item.status)}`}
                        >
                          {done
                            ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
                            : <Circle className="h-5 w-5 shrink-0 text-stone-400" aria-hidden="true" />}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-stone-800 dark:text-stone-100">
                              {svc ? tritext(svc.title, lang) : item.serviceKey}
                            </span>
                            <span className="block text-xs text-stone-500 dark:text-stone-400">
                              {item.role === 'jyotish' ? COPY.stepCounsel[lang] : COPY.stepRitual[lang]}
                              {' · '}{statusLabel(item.status)}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </article>
            );
          })}
        </section>
      )}

      {/* ---- Header ---- */}
      <header className="space-y-1">
        {event && (
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="mb-1 inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-sm font-medium text-stone-600 dark:text-stone-300"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {COPY.back[lang]}
          </button>
        )}
        <h1 className="flex items-center gap-2 text-xl font-bold text-stone-900 dark:text-stone-50">
          <CalendarHeart className="h-6 w-6 text-amber-600" aria-hidden="true" />
          {COPY.occasionTitle[lang]}
        </h1>
        <p className="text-sm text-stone-600 dark:text-stone-300">{COPY.occasionSub[lang]}</p>
      </header>

      {/* ---- Occasion grid ---- */}
      {!event && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {LIFE_EVENTS.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setSelectedId(e.id)}
              className="flex min-h-[88px] flex-col items-start justify-between gap-2 rounded-3xl border border-stone-200/70 dark:border-stone-700/60 bg-white/80 dark:bg-stone-900/60 p-3 text-left transition active:scale-[0.98]"
            >
              <span className="text-2xl" aria-hidden="true">{EVENT_ICON[e.id] ?? '🪔'}</span>
              <span>
                <span className="block text-sm font-semibold leading-snug text-stone-900 dark:text-stone-50">
                  {tritext(e.name, lang)}
                </span>
                {e.samskara && (
                  <span className="mt-1 inline-block rounded-full bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-200">
                    {COPY.samskaraTag[lang]}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ---- Event detail: curated path ---- */}
      {event && (
        <article className="space-y-4">
          <div className="rounded-3xl border border-stone-200/70 dark:border-stone-700/60 bg-white/80 dark:bg-stone-900/60 p-4 sm:p-5">
            <p className="text-2xl" aria-hidden="true">{EVENT_ICON[event.id] ?? '🪔'}</p>
            <h2 className="mt-1 text-lg font-bold text-stone-900 dark:text-stone-50">
              {tritext(event.name, lang)}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
              {tritext(event.description, lang)}
            </p>
          </div>

          <section aria-label={COPY.curatedPath[lang]} className="space-y-3">
            <h3 className="flex items-center gap-2 text-base font-bold text-stone-900 dark:text-stone-50">
              <Sparkles className="h-4 w-4 text-amber-600" aria-hidden="true" />
              {COPY.curatedPath[lang]}
            </h3>
            <ol className="space-y-3">
              {event.services.map((s, i) => (
                <li
                  key={s.key}
                  className="flex gap-3 rounded-3xl border border-stone-200/70 dark:border-stone-700/60 bg-white/80 dark:bg-stone-900/60 p-4"
                >
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-100 dark:bg-amber-900/50 text-sm font-bold text-amber-800 dark:text-amber-200"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-stone-900 dark:text-stone-50">
                      {tritext(s.title, lang)}
                    </p>
                    <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
                      {s.role === 'jyotish' ? COPY.stepCounsel[lang] : COPY.stepRitual[lang]}
                    </p>
                    <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
                      {tritext(s.note, lang)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <aside className="rounded-3xl border border-amber-200/70 dark:border-amber-800/40 bg-amber-50/70 dark:bg-amber-950/20 p-4">
            <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
              🕉️ {COPY.timing[lang]}
            </h4>
            <p className="mt-1 text-sm leading-relaxed text-stone-700 dark:text-stone-200">
              {tritext(event.timingNote, lang)}
            </p>
          </aside>

          <button
            type="button"
            onClick={() => createBundle(event.id)}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-3xl bg-amber-600 px-5 text-base font-bold text-white shadow-sm transition active:scale-[0.99] hover:bg-amber-700"
          >
            🪔 {COPY.bookBundle[lang]}
          </button>
          <p className="text-center text-xs text-stone-500 dark:text-stone-400">
            {COPY.bundlePlanned[lang]}
          </p>
        </article>
      )}
    </div>
  );
};

export default SevaCatalog;
