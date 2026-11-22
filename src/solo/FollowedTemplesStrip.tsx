/**
 * FollowedTemplesStrip — Solo home's "From your temples" strip
 * (NEXT-LEVEL WAVE A1).
 * =====================================================================
 * The subscribable calendar comes home: the next upcoming events
 * from the temples and festival series this devotee FOLLOWS
 * (lib/follows — their own user_follows doc), as distinct from
 * OrgEventsShelf's "From your orgs" (the organisations they are a
 * MEMBER of). A devotee can follow a temple they have never joined;
 * that is the whole point of following.
 *
 * Honesty laws, same as every Solo shelf: following nothing renders
 * NOTHING (no empty shelf, no fake event); the events come only
 * from the public projection (published festival_events — the same
 * bounded read the /events page makes), shaped by the same pure
 * lib/eventDiscovery builders, so home, /events and the festival
 * page can never disagree. The follows read happens first and the
 * festival query runs ONLY when the devotee follows something —
 * a devotee with no follows pays no reads here.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useLanguage } from '../context/LanguageContext';
import { pickLang } from '../lib/microcopy';
import { readFollows } from '../lib/follows';
import {
  DISCOVERY_FETCH_LIMIT,
  buildDiscoveryCards,
  followedCards,
  type DiscoveryCard,
} from '../lib/eventDiscovery';
import { localTodayISO } from '../lib/eventRecurrence';
import type { FestivalEventDoc } from '../lib/festival';
import { Card } from './ui';

const MAX_STRIP = 3;

export const FollowedTemplesStrip: React.FC<{ uid: string }> = ({ uid }) => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [cards, setCards] = useState<DiscoveryCard[]>([]);

  useEffect(() => {
    if (!uid || uid === 'anon') { setCards([]); return; }
    let cancelled = false;
    (async () => {
      const follows = await readFollows(uid);
      if (cancelled) return;
      if (follows.orgIds.length === 0 && follows.festivalIds.length === 0) {
        setCards([]);
        return;
      }
      try {
        const snap = await getDocs(
          query(
            collection(db, 'festival_events'),
            where('published', '==', true),
            limit(DISCOVERY_FETCH_LIMIT)
          )
        );
        if (cancelled) return;
        const festivals = snap.docs.map(
          (d) => ({ id: d.id, ...(d.data() as Omit<FestivalEventDoc, 'id'>) })
        );
        const all = buildDiscoveryCards(
          { festivals, sangamEvents: [], orgPages: [] },
          localTodayISO(),
          pickLang(language)
        );
        setCards(followedCards(all, follows).slice(0, MAX_STRIP));
      } catch {
        if (!cancelled) setCards([]);
      }
    })();
    return () => { cancelled = true; };
    // Language is read once for festival names (the /events page's
    // own trade-off); the heading re-renders live via t().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  if (cards.length === 0) return null;

  const locale = language === 'en' ? 'en-IN' : language;
  const fmtDate = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <Card>
      <p className="text-[12px] font-bold text-temple-600 uppercase tracking-widest">
        {t('surfaces.events.yourTemplesTitle')}
      </p>
      <ul className="mt-2 divide-y divide-stone-100">
        {cards.map((card) => (
          <li key={card.id}>
            <button
              type="button"
              onClick={() => card.href && navigate(card.href)}
              className="w-full text-left py-2.5 min-h-[44px] flex items-center justify-between gap-3"
            >
              <span className="min-w-0">
                <span className="block text-sm font-bold text-stone-800 truncate">
                  {card.title}
                </span>
                {card.orgName && (
                  <span className="block text-xs text-stone-500 truncate">{card.orgName}</span>
                )}
              </span>
              <span className="shrink-0 text-xs font-bold text-orange-700">
                {fmtDate(card.startISO)}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => navigate('/events')}
        className="mt-1 text-xs font-black text-orange-700 underline underline-offset-2 min-h-[44px]"
      >
        {t('surfaces.events.discoverLandingCta')}
      </button>
    </Card>
  );
};
