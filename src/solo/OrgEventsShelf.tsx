/**
 * OrgEventsShelf — Solo home's "From your orgs" shelf (EVENTS P1-7).
 * =====================================================================
 * The devotee's home gathers what their OWN organisations are doing:
 * for every real workspace they belong to, the org's published page
 * events — recurring ones expanded from the same definition the
 * public page shows, so home, page and Sangam can never disagree.
 *
 * Honesty laws: real memberships only (demo/fixture workspaces are
 * not organisations anyone belongs to); an org with nothing
 * published simply does not appear; a devotee with no orgs sees the
 * quiet empty line, not a fake event. Events come from the PUBLIC
 * page projection (orgPages) — the shelf never reaches into private
 * workspace data.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useLanguage } from '../context/LanguageContext';
import { isDemoWorkspaceId, isFixtureWorkspaceId } from '../lib/workspaceKind';
import type { PublicEventItem } from '../lib/orgPublic';
import { expandOccurrences, localTodayISO, occurrenceStartMs } from '../lib/eventRecurrence';
import { buildIcsCalendar, downloadIcs, icsFileName } from '../lib/icsExport';

interface ShelfEvent {
  orgId: string;
  orgName: string;
  title: string;
  date: string;
  time?: string;
  description?: string;
  recurrence?: PublicEventItem['recurrence'];
  startsAt: number;
}

const HORIZON_DAYS = 60;
const MAX_PER_ORG = 3;
const MAX_TOTAL = 8;

export const OrgEventsShelf: React.FC = () => {
  const { workspaces } = useAuthWorkspace();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [events, setEvents] = useState<ShelfEvent[] | null>(null);

  const orgIds = useMemo(
    () =>
      (workspaces || [])
        .map((w) => w.id)
        .filter((id) => id && !isDemoWorkspaceId(id) && !isFixtureWorkspaceId(id)),
    [workspaces]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (orgIds.length === 0) {
        if (!cancelled) setEvents([]);
        return;
      }
      const now = new Date();
      const found: ShelfEvent[] = [];
      await Promise.all(
        orgIds.map(async (orgId) => {
          try {
            const snap = await getDoc(doc(db, 'orgPages', orgId));
            if (!snap.exists()) return;
            const page = snap.data() as { name?: string; upcomingEvents?: PublicEventItem[] };
            const items = (page.upcomingEvents || []).slice(0, 10);
            const fromISO = localTodayISO(now);
            const toD = new Date(now.getFullYear(), now.getMonth(), now.getDate() + HORIZON_DAYS);
            const toISO = localTodayISO(toD);
            const mine: ShelfEvent[] = [];
            for (const item of items) {
              // Recurring definitions expand from the one rule; a
              // one-off event appears once, on its own date, inside
              // the same horizon.
              const occs = item.recurrence
                ? expandOccurrences(item.date, item.recurrence, fromISO, toISO, item.time).slice(0, MAX_PER_ORG)
                : item.date >= fromISO && item.date <= toISO
                  ? [{ date: item.date, startsAt: occurrenceStartMs(item.date, item.time), index: 0 }]
                  : [];
              for (const occ of occs) {
                mine.push({
                  orgId,
                  orgName: page.name || '',
                  title: item.title,
                  date: occ.date,
                  time: item.time,
                  description: item.description,
                  recurrence: item.recurrence,
                  startsAt: occ.startsAt,
                });
              }
            }
            mine.sort((a, b) => a.startsAt - b.startsAt);
            found.push(...mine.slice(0, MAX_PER_ORG));
          } catch {
            /* an unreadable page contributes nothing — never an error */
          }
        })
      );
      found.sort((a, b) => a.startsAt - b.startsAt);
      if (!cancelled) setEvents(found.slice(0, MAX_TOTAL));
    })();
    return () => {
      cancelled = true;
    };
  }, [orgIds]);

  if (events === null) return null; // still gathering — the home never blocks on a shelf

  return (
    <section aria-label={t('surfaces.events.shelfTitle')} className="mt-6">
      <h2 className="text-sm font-black uppercase tracking-widest text-stone-800 flex items-center gap-2 mb-3">
        <span aria-hidden>🏛️</span> {t('surfaces.events.shelfTitle')}
      </h2>
      {events.length === 0 ? (
        <p className="text-xs text-stone-400 leading-relaxed bg-white/60 border border-dashed border-stone-200 rounded-2xl px-4 py-3">
          {t('surfaces.events.shelfEmpty')}
        </p>
      ) : (
        <ul className="space-y-2">
          {events.map((ev, i) => (
            <li
              key={`${ev.orgId}-${ev.title}-${ev.date}-${i}`}
              className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-white px-4 py-3 shadow-sm"
            >
              <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-amber-600 to-orange-800 text-white flex flex-col items-center justify-center">
                <span className="text-base font-black leading-none">
                  {String(parseInt(ev.date.slice(8, 10), 10))}
                </span>
                <span className="text-[9px] font-black uppercase">
                  {new Date(`${ev.date}T12:00:00`).toLocaleDateString('en-IN', { month: 'short' })}
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/org/${ev.orgId}`)}
                className="min-w-0 flex-1 text-left min-h-[44px]"
              >
                <span className="block text-sm font-black text-stone-900 truncate">{ev.title}</span>
                <span className="block text-[11px] text-stone-500 truncate">
                  {ev.orgName} · {ev.date}
                  {ev.time ? ` · ${ev.time}` : ''}
                  {ev.recurrence ? ' · 🔁' : ''}
                </span>
              </button>
              <button
                type="button"
                aria-label={t('surfaces.events.addToCalendar')}
                onClick={() =>
                  downloadIcs(
                    buildIcsCalendar([
                      {
                        uid: `shelf-${ev.orgId}-${ev.title}-${ev.date}@sanatanibandhan`,
                        title: ev.title,
                        description: ev.description,
                        location: ev.orgName,
                        date: ev.date,
                        time: ev.time,
                      },
                    ]),
                    icsFileName(ev.title)
                  )
                }
                className="shrink-0 w-11 h-11 rounded-xl border border-amber-200 bg-amber-50 flex items-center justify-center text-base"
              >
                📅
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default OrgEventsShelf;
