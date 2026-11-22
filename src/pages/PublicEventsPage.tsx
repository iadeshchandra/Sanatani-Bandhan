/**
 * PublicEventsPage — EVENTS E7: cross-org public event discovery.
 * =====================================================================
 * Route: /events. Anyone may browse WITHOUT signing in (the
 * read/engage law: looking never asks for an account; RSVP/booking
 * happens on each event's own page, under that page's own rules).
 *
 * Data discipline: the page reads ONLY the three collections the
 * rules investigation proved world-readable — published
 * `festival_events`, `sangamEvents`, and `orgPages` (whose
 * `upcomingEvents` the OrgEventManager publishes). One bounded query
 * per source (lib/eventDiscovery DISCOVERY_FETCH_LIMIT); all shaping
 * (upcoming-only, date grouping, org/kind filters) is the pure,
 * unit-tested lib/eventDiscovery. If Firestore is unreachable the
 * page still renders its shell with the honest empty state — the
 * OrgDirectory behaviour — never a crash.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { ArrowLeft, BadgeCheck, CalendarDays, Loader2, MapPin, Sparkles, Ticket } from 'lucide-react';
import { db } from '../lib/firebase';
import { useLanguage } from '../context/LanguageContext';
import { PublicLanguageButton } from '../components/public/PublicLanguageButton';
import { pickLang } from '../lib/microcopy';
import type { FestivalEventDoc } from '../lib/festival';
import type { SangamEvent } from '../sangam/types';
import {
  DISCOVERY_FETCH_LIMIT,
  buildDiscoveryCards,
  filterCards,
  groupCards,
  kindOptions,
  orgOptions,
  type DiscoveryCard,
  type DiscoveryKind,
  type DiscoveryOrgPage,
} from '../lib/eventDiscovery';
import { localTodayISO } from '../lib/eventRecurrence';

const KIND_KEY: Record<DiscoveryKind, string> = {
  festival: 'surfaces.events.discoverKindFestival',
  sangam: 'surfaces.events.discoverKindSangam',
  org: 'surfaces.events.discoverKindOrg',
};

function fmtDate(iso: string, locale: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export const PublicEventsPage: React.FC = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [cards, setCards] = useState<DiscoveryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState('');
  const [kind, setKind] = useState<DiscoveryKind | ''>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Each source fails soft on its own: an unreachable collection
      // contributes nothing, and the page still renders (sandbox /
      // offline honesty — same posture as the org directory).
      const [festivals, sangamEvents, orgPages] = await Promise.all([
        (async (): Promise<FestivalEventDoc[]> => {
          try {
            const snap = await getDocs(
              query(
                collection(db, 'festival_events'),
                where('published', '==', true),
                limit(DISCOVERY_FETCH_LIMIT)
              )
            );
            return snap.docs.map(
              (d) => ({ id: d.id, ...(d.data() as Omit<FestivalEventDoc, 'id'>) })
            );
          } catch {
            return [];
          }
        })(),
        (async (): Promise<SangamEvent[]> => {
          try {
            const snap = await getDocs(
              query(collection(db, 'sangamEvents'), limit(DISCOVERY_FETCH_LIMIT))
            );
            return snap.docs.map(
              (d) => ({ id: d.id, ...(d.data() as Omit<SangamEvent, 'id'>) })
            );
          } catch {
            return [];
          }
        })(),
        (async (): Promise<DiscoveryOrgPage[]> => {
          try {
            const snap = await getDocs(
              query(collection(db, 'orgPages'), limit(DISCOVERY_FETCH_LIMIT))
            );
            return snap.docs
              .map((d) => ({ orgId: d.id, ...(d.data() as Omit<DiscoveryOrgPage, 'orgId'>) }))
              .filter((p) => (p.upcomingEvents || []).length > 0);
          } catch {
            return [];
          }
        })(),
      ]);
      if (cancelled) return;
      setCards(
        buildDiscoveryCards({ festivals, sangamEvents, orgPages }, localTodayISO(), pickLang(language))
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // Language is read once for festival names; the dictionary chrome
    // re-renders live via t(). Refetching on language change would
    // re-run three queries for a label — not worth the reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const orgs = useMemo(() => orgOptions(cards), [cards]);
  const kinds = useMemo(() => kindOptions(cards), [cards]);
  const visible = useMemo(
    () => filterCards(cards, { orgName: org || undefined, kind: kind || undefined }),
    [cards, org, kind]
  );
  const groups = useMemo(() => groupCards(visible, localTodayISO()), [visible]);
  const locale = language === 'en' ? 'en-IN' : language;

  const renderCard = (card: DiscoveryCard) => {
    const inner = (
      <>
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-black text-stone-900 leading-snug">{card.title}</h3>
          <span className="shrink-0 px-2.5 py-1 rounded-full bg-orange-100 text-orange-800 text-[10px] font-black uppercase tracking-wide">
            {t(KIND_KEY[card.kind])}
          </span>
        </div>
        {card.orgName && (
          <p className="text-xs font-bold text-stone-500 mt-1">{card.orgName}</p>
        )}
        <p className="flex items-center gap-1.5 text-sm text-stone-700 mt-2">
          <CalendarDays size={15} className="text-orange-600 shrink-0" />
          {fmtDate(card.startISO, locale)}
          {card.endISO !== card.startISO && <> – {fmtDate(card.endISO, locale)}</>}
        </p>
        {card.place && (
          <p className="flex items-center gap-1.5 text-sm text-stone-500 mt-1">
            <MapPin size={15} className="shrink-0" /> {card.place}
          </p>
        )}
        {(card.hasPasses || card.hasDebrief || card.official) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {card.hasPasses && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold">
                <Ticket size={12} /> {t('surfaces.events.discoverPasses')}
              </span>
            )}
            {card.hasDebrief && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 text-[11px] font-bold">
                <Sparkles size={12} /> {t('surfaces.events.discoverDebrief')}
              </span>
            )}
            {card.official && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-orange-900 text-[11px] font-bold">
                <BadgeCheck size={12} /> {t('surfaces.events.discoverOfficial')}
              </span>
            )}
          </div>
        )}
      </>
    );
    const cls =
      'block w-full text-left bg-white rounded-2xl border border-orange-100 shadow-sm p-4 min-h-[44px]';
    return card.href ? (
      <Link key={card.id} to={card.href} className={`${cls} hover:shadow transition-shadow`}>
        {inner}
      </Link>
    ) : (
      <div key={card.id} className={cls}>
        {inner}
      </div>
    );
  };

  const renderGroup = (title: string, list: DiscoveryCard[]) =>
    list.length === 0 ? null : (
      <section key={title} className="mt-8">
        <h2 className="text-xs font-black uppercase tracking-[0.18em] text-orange-700 mb-3">
          {title}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{list.map(renderCard)}</div>
      </section>
    );

  return (
    <div className="min-h-screen public-backdrop pb-16">
      <div className="bg-gradient-to-br from-amber-700 via-orange-800 to-stone-900 px-4 pt-6 pb-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-start justify-between gap-3">
            <button
              onClick={() => navigate(-1)}
              className="text-white/80 hover:text-white flex items-center gap-1.5 text-xs font-bold mb-4 min-h-[44px]"
            >
              <ArrowLeft size={14} /> {t('surfaces.orgDirectory.back')}
            </button>
            <PublicLanguageButton tone="dark" />
          </div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <CalendarDays size={24} /> {t('surfaces.events.discoverTitle')}
          </h1>
          <p className="text-amber-100/80 text-sm mt-1">{t('surfaces.events.discoverSubtitle')}</p>

          {(orgs.length > 1 || kinds.length > 1) && (
            <div className="mt-4 space-y-3">
              {kinds.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  <button
                    onClick={() => setKind('')}
                    className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-black transition-all min-h-[44px] ${
                      kind === '' ? 'bg-white text-amber-800 shadow' : 'bg-white/15 text-white hover:bg-white/25'
                    }`}
                  >
                    {t('surfaces.events.discoverAllKinds')}
                  </button>
                  {kinds.map((k) => (
                    <button
                      key={k}
                      onClick={() => setKind(k)}
                      className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-black transition-all min-h-[44px] ${
                        kind === k ? 'bg-white text-amber-800 shadow' : 'bg-white/15 text-white hover:bg-white/25'
                      }`}
                    >
                      {t(KIND_KEY[k])}
                    </button>
                  ))}
                </div>
              )}
              {orgs.length > 1 && (
                <select
                  value={org}
                  onChange={(e) => setOrg(e.target.value)}
                  aria-label={t('surfaces.events.discoverAllOrgs')}
                  className="w-full px-4 py-3 rounded-2xl text-sm font-medium text-stone-900 bg-white shadow-lg outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
                >
                  <option value="">{t('surfaces.events.discoverAllOrgs')}</option>
                  {orgs.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4">
        {loading ? (
          <div className="flex items-center justify-center gap-2 text-stone-500 text-sm py-16">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center py-16">
            <h2 className="text-lg font-black text-stone-800">
              {t('surfaces.events.discoverEmptyTitle')}
            </h2>
            <p className="text-sm text-stone-500 mt-2 max-w-md mx-auto">
              {t('surfaces.events.discoverEmptyHint')}
            </p>
          </div>
        ) : visible.length === 0 ? (
          <p className="text-center text-sm text-stone-500 py-16">
            {t('surfaces.events.discoverFilteredEmpty')}
          </p>
        ) : (
          <>
            {renderGroup(t('surfaces.events.discoverToday'), groups.today)}
            {renderGroup(t('surfaces.events.discoverThisWeek'), groups.thisWeek)}
            {renderGroup(t('surfaces.events.discoverComingUp'), groups.comingUp)}
          </>
        )}
      </div>
    </div>
  );
};

export default PublicEventsPage;
