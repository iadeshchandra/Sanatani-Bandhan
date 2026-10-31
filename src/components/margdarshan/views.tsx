/**
 * margdarshan/views.tsx — the shared Margdarshan view pieces (J1).
 * =====================================================================
 * One set of presentational components renders the centre in BOTH
 * homes: inside the org shell (MargdarshanCentre) and on the public
 * web (PublicMargdarshan). The wrappers own navigation and the role
 * door; these pieces own only the rendering, so the manual can never
 * drift between app and web (blueprint §3.2 — one content, all faces).
 *
 * Design: the sanctum language of Role Home / the directory — warm
 * ivory ground, white cards with amber hairlines, marigold-saffron
 * accents, ≥44px targets everywhere. All chrome copy comes from the
 * marg.* dictionary keys (no hardcoded English); manual content comes
 * from the knowledge layer (lib/margdarshan), resolved per language.
 */

import React, { useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Compass,
  Feather,
  Globe,
  Landmark,
  Lock,
  MessagesSquare,
  ScrollText,
  Search,
  Sparkles,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import {
  MANUAL_PAGES,
  WINGS,
  buildAtlas,
  getManualPage,
  resolveManualPage,
  type ResolvedManualPage,
  type Wing,
} from '../../lib/margdarshan';
import { DRAFT_LANGS } from '../../ai/lang/shared';
import type { DeskPage } from '../../lib/margdarshan/types';

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

export const MargSearch: React.FC<{
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}> = ({ value, onChange, autoFocus }) => {
  const { t } = useLanguage();
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-amber-600/60"
        aria-hidden="true"
      />
      <input
        type="text"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('marg.searchPlaceholder')}
        aria-label={t('marg.searchPlaceholder')}
        className="min-h-[48px] w-full rounded-2xl border border-amber-200/80 bg-white py-3 pl-12 pr-12 text-sm font-medium text-stone-800 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={t('marg.clearSearch')}
          className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-stone-400 transition hover:bg-amber-50 hover:text-stone-600"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

const WING_ICONS: Record<Wing['id'], React.ReactNode> = {
  manual: <BookOpen className="h-6 w-6" aria-hidden="true" />,
  features: <Compass className="h-6 w-6" aria-hidden="true" />,
  whatsnew: <Sparkles className="h-6 w-6" aria-hidden="true" />,
  voice: <Feather className="h-6 w-6" aria-hidden="true" />,
  satsang: <MessagesSquare className="h-6 w-6" aria-hidden="true" />,
};

/**
 * The four wing doors. LIVE wings are real doors. Unbuilt wings are
 * honest explanation cards — a state chip, the wing's own words, and
 * NO button at all (the no-dead-button law): there is nothing to tap
 * because there is nothing behind it yet.
 */
export const WingGrid: React.FC<{
  onGo: (target: 'manual' | 'atlas') => void;
}> = ({ onGo }) => {
  const { t } = useLanguage();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {WINGS.map((wing) => {
        const body = (
          <>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-orange-600">
              {WING_ICONS[wing.id]}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-base font-black text-stone-900">
                  {t(wing.labelKey)}
                </span>
                {wing.state !== 'live' && (
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-stone-500">
                    {t(wing.state === 'next' ? 'marg.stateNext' : 'marg.stateWorks')}
                  </span>
                )}
              </span>
              <span className="mt-1 block text-sm leading-6 text-stone-500">
                {t(wing.detailKey)}
              </span>
            </span>
            {wing.target && (
              <ArrowRight
                className="mt-1 h-5 w-5 shrink-0 text-amber-500 transition group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            )}
          </>
        );
        return wing.target ? (
          <button
            key={wing.id}
            type="button"
            onClick={() => onGo(wing.target!)}
            className="group flex min-h-[44px] w-full items-start gap-3 rounded-3xl border border-amber-200/80 bg-white p-5 text-left shadow-sm transition hover:border-orange-300 hover:shadow"
          >
            {body}
          </button>
        ) : (
          <div
            key={wing.id}
            className="flex min-h-[44px] w-full items-start gap-3 rounded-3xl border border-dashed border-stone-200 bg-stone-50/60 p-5 text-left"
            aria-label={t(wing.labelKey)}
          >
            {body}
          </div>
        );
      })}
    </div>
  );
};

/** One manual page as a card/row in lists and search results. */
export const PageCard: React.FC<{
  page: DeskPage;
  onOpen: (slug: string) => void;
}> = ({ page, onOpen }) => {
  const { currentLang } = useLanguage();
  const r = resolveManualPage(page, currentLang);
  return (
    <button
      type="button"
      onClick={() => onOpen(page.slug)}
      className="group flex min-h-[44px] w-full items-start gap-3 rounded-2xl border border-amber-100 bg-white p-4 text-left shadow-sm transition hover:border-orange-200 hover:shadow"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-100 bg-amber-50">
        <ScrollText className="h-5 w-5 text-orange-600" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black text-stone-800">
          {r.name}
        </span>
        <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-stone-500">
          {r.whatItDoes}
        </span>
      </span>
      <ArrowRight
        className="mt-1 h-4 w-4 shrink-0 text-stone-300 transition group-hover:text-orange-500"
        aria-hidden="true"
      />
    </button>
  );
};

/**
 * The manual browse list: desk pages grouped by their domain, then
 * the Solo/personal pages, then the guide topics. `pages` is the
 * already-filtered set (search handled by the caller).
 */
export const GroupedPageList: React.FC<{
  pages: DeskPage[];
  onOpen: (slug: string) => void;
}> = ({ pages, onOpen }) => {
  const { t, currentLang } = useLanguage();
  const groups = useMemo(() => {
    const byDomain = new Map<number, { title: string; items: DeskPage[] }>();
    const solo: DeskPage[] = [];
    const topics: DeskPage[] = [];
    for (const p of pages) {
      if (p.domain != null) {
        const g = byDomain.get(p.domain) || {
          title: resolveManualPage(p, currentLang).domainTitle || '',
          items: [],
        };
        g.items.push(p);
        byDomain.set(p.domain, g);
      } else if (p.kind === 'topic') {
        topics.push(p);
      } else {
        solo.push(p);
      }
    }
    return { byDomain, solo, topics };
  }, [pages, currentLang]);

  const section = (label: string, items: DeskPage[]) =>
    items.length > 0 && (
      <section key={label} aria-label={label}>
        <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-amber-700/70">
          {label}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <PageCard key={p.slug} page={p} onOpen={onOpen} />
          ))}
        </div>
      </section>
    );

  return (
    <div className="space-y-8">
      {[...groups.byDomain.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([, g]) => section(g.title, g.items))}
      {section(t('marg.soloTrack'), groups.solo)}
      {section(t('marg.guidesTopics'), groups.topics)}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* The desk page (blueprint §4 anatomy)                                */
/* ------------------------------------------------------------------ */

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="mb-2 text-xs font-black uppercase tracking-widest text-amber-700/70">
    {children}
  </h2>
);

export const DeskPageView: React.FC<{
  slug: string;
  /** The role door, supplied by the wrapper (app door or public box). */
  door?: React.ReactNode;
  onOpenPage: (slug: string) => void;
  onBack: () => void;
  backLabel: string;
}> = ({ slug, door, onOpenPage, onBack, backLabel }) => {
  const { t, currentLang } = useLanguage();
  const page = getManualPage(slug);
  if (!page) return null;
  const r: ResolvedManualPage = resolveManualPage(page, currentLang);
  const isDraftLang = (DRAFT_LANGS as readonly string[]).includes(
    (currentLang || 'en').toLowerCase()
  );
  const related = r.relatedSlugs
    .map((s) => getManualPage(s))
    .filter((p): p is DeskPage => !!p);

  return (
    <article className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl px-2 text-sm font-bold text-stone-500 transition hover:text-orange-600"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {backLabel}
      </button>

      <header>
        <h1 className="text-2xl font-black tracking-tight text-stone-900 sm:text-3xl">
          {r.name}
        </h1>
        {r.tagline && (
          <p className="mt-1 text-base font-medium text-orange-700">{r.tagline}</p>
        )}
        {r.place && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-stone-400">
            <Landmark className="h-4 w-4" aria-hidden="true" />
            {r.place}
          </p>
        )}
      </header>

      {isDraftLang && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
          {t('marg.translationPending')}
        </p>
      )}

      {/* §4.2 — the real-life example comes FIRST, before any feature talk. */}
      <section
        aria-label={t('marg.inRealLife')}
        className="rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50 p-5"
      >
        <SectionTitle>{t('marg.inRealLife')}</SectionTitle>
        <p className="text-base leading-7 text-stone-700">{r.realLifeExample}</p>
      </section>

      <section aria-label={t('marg.whatItDoes')}>
        <SectionTitle>{t('marg.whatItDoes')}</SectionTitle>
        <p className="text-base leading-7 text-stone-700">{r.whatItDoes}</p>
        {r.whyItMatters && (
          <p className="mt-2 text-base leading-7 text-stone-600">{r.whyItMatters}</p>
        )}
      </section>

      {r.usedBy && (
        <section aria-label={t('marg.whoUsesIt')}>
          <SectionTitle>{t('marg.whoUsesIt')}</SectionTitle>
          <p className="text-base leading-7 text-stone-700">{r.usedBy}</p>
        </section>
      )}

      {r.steps.length > 0 && (
        <section aria-label={t('marg.howTo')}>
          <SectionTitle>{t('marg.howTo')}</SectionTitle>
          {/* Mala-thread steps: numbered beads on a thread. */}
          <ol className="relative space-y-4 border-l-2 border-amber-200 pl-6">
            {r.steps.map((step, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[35px] flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-black text-white">
                  {i + 1}
                </span>
                <p className="text-base leading-7 text-stone-700">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {r.capabilities.length > 0 && (
        <section aria-label={t('marg.youCanDo')}>
          <SectionTitle>{t('marg.youCanDo')}</SectionTitle>
          <ul className="grid gap-2 sm:grid-cols-2">
            {r.capabilities.map((c, i) => (
              <li
                key={i}
                className="rounded-xl border border-amber-100 bg-white px-3 py-2.5 text-sm leading-6 text-stone-600"
              >
                {c}
              </li>
            ))}
          </ul>
        </section>
      )}

      {(r.commonMistakes.length > 0 || r.proTips.length > 0) && (
        <section aria-label={t('marg.goodToKnow')}>
          <SectionTitle>{t('marg.goodToKnow')}</SectionTitle>
          <ul className="space-y-2">
            {[...r.commonMistakes, ...r.proTips].map((tip, i) => (
              <li key={i} className="flex gap-2 text-base leading-7 text-stone-600">
                <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
                {tip}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="flex items-center gap-2 text-sm text-stone-500">
        {r.worksOffline ? (
          <WifiOff className="h-4 w-4 text-emerald-600" aria-hidden="true" />
        ) : (
          <Wifi className="h-4 w-4 text-amber-600" aria-hidden="true" />
        )}
        {t(r.worksOffline ? 'marg.worksOffline' : 'marg.needsInternet')}
      </p>

      {door}

      {related.length > 0 && (
        <section aria-label={t('marg.relatedPages')}>
          <SectionTitle>{t('marg.relatedPages')}</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            {related.map((p) => (
              <PageCard key={p.slug} page={p} onOpen={onOpenPage} />
            ))}
          </div>
        </section>
      )}

      <footer className="border-t border-amber-100 pt-4 text-xs text-stone-400">
        {t('marg.reviewedFor')}
      </footer>
    </article>
  );
};

/* ------------------------------------------------------------------ */
/* The Feature Atlas                                                   */
/* ------------------------------------------------------------------ */

export const AtlasView: React.FC<{
  onOpenPage: (slug: string) => void;
}> = ({ onOpenPage }) => {
  const { t, currentLang } = useLanguage();
  const atlas = useMemo(() => buildAtlas(currentLang), [currentLang]);
  return (
    <div className="space-y-8">
      {atlas.map((dom) => (
        <section key={dom.domain} aria-label={dom.title}>
          <h2 className="mb-3 flex items-baseline gap-2 text-xs font-black uppercase tracking-widest text-amber-700/70">
            {dom.title}
            <span className="font-bold normal-case tracking-normal text-stone-300">
              {dom.entries.length} {t('marg.pagesLabel')}
            </span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dom.entries.map((e) => (
              <button
                key={e.slug}
                type="button"
                onClick={() => onOpenPage(e.slug)}
                className="group flex min-h-[44px] w-full flex-col items-start gap-1.5 rounded-2xl border border-amber-100 bg-white p-4 text-left shadow-sm transition hover:border-orange-200 hover:shadow"
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="truncate text-sm font-black text-stone-800">
                    {e.name}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                    {t('marg.liveToday')}
                  </span>
                </span>
                <span className="line-clamp-2 text-xs leading-5 text-stone-500">
                  {e.line}
                </span>
                <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-stone-400">
                  <Globe className="h-3 w-3" aria-hidden="true" />
                  {t('marg.planLabel')}: {e.tier ?? t('marg.planEvery')}
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

/** The locked-door explanation (role or plan) — text, never a button. */
export const DoorExplanation: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
    <Lock className="mt-0.5 h-5 w-5 shrink-0 text-stone-400" aria-hidden="true" />
    <p className="text-sm leading-6 text-stone-500">{text}</p>
  </div>
);

/** Re-export for wrappers that list every page. */
export { MANUAL_PAGES };
