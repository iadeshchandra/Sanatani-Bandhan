/**
 * margdarshan/PublicMargdarshan.tsx — the public web mirror (J1).
 * =====================================================================
 * The owner's read/engage law: EVERYTHING in Margdarshan is readable
 * by anyone, with no login. These routes render the SAME components
 * and the SAME knowledge layer as the in-app centre (views.tsx +
 * lib/margdarshan) — thin wrappers only, no forked content, and no
 * auth context anywhere: nothing here engages, so nothing here asks
 * for an account. The desk door on a public page is a warm "open in
 * the app" box — the desk itself lives in the app, and the page says
 * so instead of pretending.
 *
 * Routes (mounted in App.tsx):
 *   /margdarshan                 → PublicMargdarshanHome
 *   /margdarshan/manual          → PublicManual
 *   /margdarshan/manual/:pageId  → PublicDeskPage
 *   /margdarshan/features        → PublicAtlas
 */

import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PublicLanguageButton } from '../public/PublicLanguageButton';
import { useLanguage } from '../../context/LanguageContext';
import {
  MANUAL_PAGES,
  STARTER_SLUGS,
  getManualPage,
  searchManual,
} from '../../lib/margdarshan';
import {
  AtlasView,
  DeskPageView,
  GroupedPageList,
  MargSearch,
  PageCard,
  WingGrid,
} from './views';

/* ------------------------------------------------------------------ */
/* Public chrome (mirrors the AskAiPage / ContactPage pattern)         */
/* ------------------------------------------------------------------ */

const PublicShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen flex-col bg-[#FFF8F0] font-sans text-stone-900 selection:bg-orange-500 selection:text-white">
      <header className="sticky top-0 z-40 border-b border-orange-100 bg-[#FFF8F0]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:h-[72px] sm:px-6">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex cursor-pointer items-center gap-2.5"
            aria-label="Sanatani Bandhan home"
          >
            <img
              src="/icon-96x96.png"
              alt="Sanatani Bandhan"
              className="h-10 w-10 rounded-2xl shadow-md shadow-orange-500/25"
              width={40}
              height={40}
            />
            <span className="text-lg font-extrabold tracking-tight sm:text-xl">
              Sanatani <span className="text-orange-600">Bandhan</span>
            </span>
          </button>
          <div className="flex items-center gap-2 sm:gap-3">
            <PublicLanguageButton />
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="min-h-[44px] cursor-pointer rounded-xl bg-stone-900 px-6 text-sm font-extrabold tracking-wide text-white transition-all hover:bg-stone-800"
            >
              LOGIN
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>

      <footer className="border-t border-orange-100 bg-[#FFF3E2]">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-stone-500 sm:px-6">
          <p className="font-semibold text-stone-600">{t('marg.publicNote')}</p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Margdarshan">
            <Link className="inline-flex min-h-[44px] items-center font-bold hover:text-orange-600" to="/margdarshan">
              {t('marg.title')}
            </Link>
            <Link className="inline-flex min-h-[44px] items-center font-bold hover:text-orange-600" to="/margdarshan/manual">
              {t('marg.manualTitle')}
            </Link>
            <Link className="inline-flex min-h-[44px] items-center font-bold hover:text-orange-600" to="/margdarshan/features">
              {t('marg.atlasTitle')}
            </Link>
            <Link className="inline-flex min-h-[44px] items-center font-bold hover:text-orange-600" to="/ask-ai">
              Ask AI
            </Link>
            <Link className="inline-flex min-h-[44px] items-center font-bold hover:text-orange-600" to="/contact">
              Contact
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
};

const Hero: React.FC<{ title: string; desc: string }> = ({ title, desc }) => (
  <div className="rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 text-white shadow-lg shadow-orange-500/20 sm:p-6">
    <h1 className="text-xl font-black tracking-tight sm:text-2xl">{title}</h1>
    <p className="mt-1 max-w-2xl text-sm leading-6 text-orange-50">{desc}</p>
  </div>
);

/* ------------------------------------------------------------------ */
/* /margdarshan — the centre home, public face                         */
/* ------------------------------------------------------------------ */

export const PublicMargdarshanHome: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const starters = useMemo(
    () =>
      STARTER_SLUGS.map((s) => getManualPage(s)).filter(
        (p): p is NonNullable<typeof p> => !!p
      ),
    []
  );
  return (
    <PublicShell>
      <div className="space-y-8">
        <Hero title={t('marg.greeting')} desc={t('marg.tagline')} />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            navigate(
              query.trim()
                ? `/margdarshan/manual?q=${encodeURIComponent(query.trim())}`
                : '/margdarshan/manual'
            );
          }}
        >
          <MargSearch value={query} onChange={setQuery} />
        </form>
        <WingGrid
          onGo={(target) =>
            navigate(target === 'manual' ? '/margdarshan/manual' : '/margdarshan/features')
          }
        />
        <section aria-label={t('marg.mostNeeded')}>
          <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-amber-700/70">
            {t('marg.mostNeeded')}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {starters.map((p) => (
              <PageCard
                key={p.slug}
                page={p}
                onOpen={(s) => navigate(`/margdarshan/manual/${s}`)}
              />
            ))}
          </div>
        </section>
      </div>
    </PublicShell>
  );
};

/* ------------------------------------------------------------------ */
/* /margdarshan/manual — every page, searchable                        */
/* ------------------------------------------------------------------ */

export const PublicManual: React.FC = () => {
  const { t, currentLang } = useLanguage();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const results = query.trim() ? searchManual(query, currentLang) : null;
  return (
    <PublicShell>
      <div className="space-y-8">
        <Hero title={t('marg.manualTitle')} desc={t('marg.manualDesc')} />
        <MargSearch value={query} onChange={setQuery} autoFocus={!!params.get('q')} />
        {results ? (
          <section aria-label={t('marg.searchResults')}>
            <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-amber-700/70">
              {t('marg.searchResults')} · {results.length}
            </h2>
            {results.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((p) => (
                  <PageCard
                    key={p.slug}
                    page={p}
                    onOpen={(s) => navigate(`/margdarshan/manual/${s}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-amber-200 bg-white px-6 py-10 text-center">
                <p className="text-base font-black text-stone-700">{t('marg.noResults')}</p>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
                  {t('marg.noResultsDesc')}
                </p>
              </div>
            )}
          </section>
        ) : (
          <GroupedPageList
            pages={MANUAL_PAGES}
            onOpen={(s) => navigate(`/margdarshan/manual/${s}`)}
          />
        )}
      </div>
    </PublicShell>
  );
};

/* ------------------------------------------------------------------ */
/* /margdarshan/manual/:pageId — one desk page                         */
/* ------------------------------------------------------------------ */

export const PublicDeskPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { pageId } = useParams<{ pageId: string }>();
  const page = pageId ? getManualPage(pageId) : undefined;

  const door = (
    <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-amber-200/80 bg-white p-5">
      <p className="min-w-0 flex-1 text-sm leading-6 text-stone-500">
        {t('marg.publicNote')}
      </p>
      <button
        type="button"
        onClick={() => navigate(page?.route || '/app')}
        className="inline-flex min-h-[48px] cursor-pointer items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-orange-600"
      >
        {t('marg.openInApp')}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );

  return (
    <PublicShell>
      {page ? (
        <DeskPageView
          slug={page.slug}
          door={door}
          onOpenPage={(s) => navigate(`/margdarshan/manual/${s}`)}
          onBack={() => navigate('/margdarshan/manual')}
          backLabel={t('marg.backToManual')}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-amber-200 bg-white px-6 py-12 text-center">
          <p className="text-base font-black text-stone-700">{t('marg.noResults')}</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
            {t('marg.noResultsDesc')}
          </p>
          <button
            type="button"
            onClick={() => navigate('/margdarshan/manual')}
            className="mt-4 inline-flex min-h-[44px] cursor-pointer items-center rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-black text-white transition hover:bg-stone-800"
          >
            {t('marg.backToManual')}
          </button>
        </div>
      )}
    </PublicShell>
  );
};

/* ------------------------------------------------------------------ */
/* /margdarshan/features — the atlas                                   */
/* ------------------------------------------------------------------ */

export const PublicAtlas: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  return (
    <PublicShell>
      <div className="space-y-8">
        <Hero title={t('marg.atlasTitle')} desc={t('marg.atlasDesc')} />
        <AtlasView onOpenPage={(s) => navigate(`/margdarshan/manual/${s}`)} />
      </div>
    </PublicShell>
  );
};
