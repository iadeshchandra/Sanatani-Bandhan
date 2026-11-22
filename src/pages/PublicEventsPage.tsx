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
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { PublicLanguageButton } from '../components/public/PublicLanguageButton';
import { pickLang } from '../lib/microcopy';
import type { FestivalEventDoc } from '../lib/festival';
import type { SangamEvent } from '../sangam/types';
import {
  DISCOVERY_FETCH_LIMIT,
  buildDiscoveryCards,
  cardsCoveringDate,
  filterCards,
  followedCards,
  groupCards,
  kindOptions,
  observanceStrip,
  orgOptions,
  type DiscoveryCard,
  type DiscoveryKind,
  type DiscoveryOrgPage,
  type ObservanceDay,
} from '../lib/eventDiscovery';
import { localTodayISO } from '../lib/eventRecurrence';
import { EMPTY_FOLLOWS, readFollows, type FollowState } from '../lib/follows';

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
  const { firebaseUser } = useAuthWorkspace();
  const [cards, setCards] = useState<DiscoveryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState('');
  const [kind, setKind] = useState<DiscoveryKind | ''>('');
  // NEXT-LEVEL A1 — the signed-in devotee's follows (their own doc,
  // read through lib/follows — the page itself still reads ONLY the
  // three public collections) and the panchang strip's date filter.
  const [follows, setFollows] = useState<FollowState>(EMPTY_FOLLOWS);
  const [dateFilter, setDateFilter] = useState('');

  const uid = (firebaseUser as { uid?: string } | null)?.uid || '';
  useEffect(() => {
    if (!uid) { setFollows(EMPTY_FOLLOWS); return; }
    let cancelled = false;
    readFollows(uid).then((s) => { if (!cancelled) setFollows(s); });
    return () => { cancelled = true; };
  }, [uid]);

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
  const visible = useMemo(() => {
    const base = filterCards(cards, { orgName: org || undefined, kind: kind || undefined });
    return dateFilter ? cardsCoveringDate(base, dateFilter) : base;
  }, [cards, org, kind, dateFilter]);
  const groups = useMemo(() => groupCards(visible, localTodayISO()), [visible]);
  const locale = language === 'en' ? 'en-IN' : language;

  // NEXT-LEVEL A1 — the "From your temples" rail: followed events
  // FIRST, on the plain (unfiltered) view only. Following nothing —
  // or nothing followed having an event — means NO rail at all:
  // never an empty shelf. The cards still appear in the groups
  // below; the rail is the devotee's shortcut shelf, capped at 6.
  const unfiltered = !org && !kind && !dateFilter;
  const rail = useMemo(
    () => (unfiltered ? followedCards(cards, follows).slice(0, 6) : []),
    [unfiltered, cards, follows]
  );
  // The panchang strip: sacred days of the next 30 days with the
  // count of discovered events covering each. One engine pass over
  // 31 days, memoised on the loaded cards (the panjikaMonth idiom).
  const strip = useMemo(
    () => (loading ? [] : observanceStrip(cards, localTodayISO(), 30)),
    [loading, cards]
  );
  const observanceLabel = (day: ObservanceDay): string => {
    const n = day.names[0];
    if (n) return language === 'bn' ? n.bn : language === 'hi' ? n.hi || n.en : n.en;
    return day.tithiName;
  };

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
        {/* NEXT-LEVEL A1 — the panchang strip: the sacred days of
            the next 30 days (DB festivals + the engine's tithi
            observances), each with its discovered-event count.
            Tapping one filters the list to that date; tapping it
            again (or "Show all dates") clears the filter. */}
        {!loading && strip.length > 0 && (
          <section className="mt-6">
            <h2 className="text-xs font-black uppercase tracking-[0.18em] text-orange-700 mb-3">
              {t('surfaces.events.observancesTitle')}
            </h2>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
              {strip.map((day) => {
                const active = dateFilter === day.date;
                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => setDateFilter(active ? '' : day.date)}
                    aria-pressed={active}
                    className={`shrink-0 text-left px-3.5 py-2.5 rounded-2xl border min-h-[44px] transition-all ${
                      active
                        ? 'bg-orange-600 border-orange-600 text-white shadow'
                        : 'bg-white border-orange-100 text-stone-800 hover:shadow'
                    }`}
                  >
                    <span className="block text-xs font-black leading-tight">
                      {observanceLabel(day)}
                    </span>
                    <span className={`block text-[11px] font-bold mt-0.5 ${active ? 'text-orange-100' : 'text-stone-500'}`}>
                      {fmtDate(day.date, locale)} ·{' '}
                      {day.eventCount === 1
                        ? t('surfaces.events.observanceEventOne')
                        : t('surfaces.events.observanceEvents').replace('{count}', String(day.eventCount))}
                    </span>
                  </button>
                );
              })}
            </div>
            {dateFilter && (
              <button
                type="button"
                onClick={() => setDateFilter('')}
                className="mt-2 text-xs font-black text-orange-700 underline underline-offset-2 min-h-[44px]"
              >
                {t('surfaces.events.observancesClear')}
              </button>
            )}
          </section>
        )}
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
            {rail.length > 0 && (
              <section className="mt-8">
                <h2 className="text-xs font-black uppercase tracking-[0.18em] text-orange-700 mb-3">
                  {t('surfaces.events.yourTemplesTitle')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {rail.map(renderCard)}
                </div>
              </section>
            )}
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
