/**
 * ForecastCard — NEXT-LEVEL A3: "From your past festivals".
 * =====================================================================
 * The planning companion to the E4 debrief: the debrief reports
 * what happened; this card carries the same registers forward into
 * the NEXT festival's planning. The pure builders in
 * lib/festivalForecast do the arithmetic (show-rates from the
 * workspace's own concluded festivals, applied to this festival's
 * bookings); this card only loads, labels and lays out.
 *
 * Loading discipline (the DebriefCard / war-store patterns, no new
 * query shapes):
 *  - Past festivals: ONE bounded getDocs of the workspace's
 *    festival_plans (the war store's own pull query), concluded
 *    ones only, most recent MAX_HISTORY_FESTIVALS; then per
 *    festival the SAME two reads the War Room already makes —
 *    festival_rsvps by eventId (the useFestivalCloud shape) and
 *    event_tickets by festivalId (the DebriefCard shape). Every
 *    read fails soft: an unreachable register simply does not
 *    witness anything.
 *  - This festival: the RSVP register arrives as props (the War
 *    Room's live subscription — no second subscription); its pass
 *    records ride one onSnapshot of the same DebriefCard query.
 *
 * Honesty: every figure carries its basis line; where the history
 * cannot speak (no concluded festival, no gate marks, too little
 * data) the card teaches instead of estimating. The "plan from
 * this forecast" tap is the only write, it is explicit, and its
 * note says exactly what it sets.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { useLanguage } from '../../context/LanguageContext';
import { Btn, Card } from '../../utsav/ui';
import { db } from '../../lib/firebase';
import {
  festivalDayList,
  prasadTotals,
  todayISO,
  type Lang3,
  type RsvpEntry,
  type WarFestival,
  type WarRoomPlan,
} from '../../lib/festival';
import { deriveDayCounts } from '../../lib/festivalRsvp';
import type { EventTicket, TicketPaymentState } from '../../lib/eventTickets';
import {
  buildForecast,
  type ForecastHistoryFestival,
  type ForecastPartyInput,
  type ForecastResult,
} from '../../lib/festivalForecast';

interface Props {
  wf: WarFestival;
  plan: WarRoomPlan;
  rsvps: RsvpEntry[];
  patch: (p: Partial<WarRoomPlan>) => void;
}

/** History is a planning aid, not an archive trawl: the most
 *  recent concluded festivals are the ones whose registers speak
 *  for how this community gathers now. */
const MAX_HISTORY_FESTIVALS = 6;

const fmtN = (n: number) => n.toLocaleString('en-IN');

/** Confirmed parties only (the register law), with the paid fact
 *  joined from the pass records: a live paid-wallet / pay-at-venue
 *  pass makes the party a paid party; a complimentary, cancelled
 *  or refunded pass does not. A pass-linked record whose pass is
 *  not in the loaded set (it arrived after the read) counts as
 *  paid — the link itself is the record's own fact. */
function partyFacts(
  rsvps: readonly RsvpEntry[],
  stateByRsvp: ReadonlyMap<string, TicketPaymentState>
): ForecastPartyInput[] {
  return rsvps
    .filter((r) => (r.status || 'confirmed') === 'confirmed')
    .map((r) => {
      const state = r.ticketId ? stateByRsvp.get(r.id) : undefined;
      const paid =
        state !== undefined
          ? state === 'paid-wallet' || state === 'pay-at-venue'
          : !!r.ticketId;
      return {
        headcount: r.headcount || 0,
        arrived: !!r.checkedIn,
        ...(r.createdAt ? { createdAt: r.createdAt } : {}),
        paid,
      };
    });
}

function ticketStates(tickets: readonly EventTicket[]): Map<string, TicketPaymentState> {
  const m = new Map<string, TicketPaymentState>();
  for (const t of tickets) if (t.rsvpId) m.set(t.rsvpId, t.paymentState);
  return m;
}

export const ForecastCard: React.FC<Props> = ({ wf, plan, rsvps, patch }) => {
  const { t, currentLang } = useLanguage();
  const lang = (currentLang || 'en').slice(0, 2);
  const pick = (l: Lang3) => (l as unknown as Record<string, string>)[lang] || l.en;
  const fill = (s: string, vals: Record<string, string | number>) =>
    Object.entries(vals).reduce(
      (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
      s
    );

  /* This festival's pass records — the DebriefCard subscription. */
  const [targetTickets, setTargetTickets] = useState<EventTicket[]>([]);
  useEffect(() => {
    const q = query(collection(db, 'event_tickets'), where('festivalId', '==', plan.id));
    const unsub = onSnapshot(
      q,
      (snap) =>
        setTargetTickets(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<EventTicket, 'id'>) }))),
      () => { /* staff-only read; offline keeps the last list */ }
    );
    return unsub;
  }, [plan.id]);

  /* Past festivals' registers — one bounded pull, fail-soft. */
  const [history, setHistory] = useState<ForecastHistoryFestival[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    setHistory(null);
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, 'festival_plans'), where('workspaceId', '==', plan.workspaceId))
        );
        const today = todayISO();
        const concluded = snap.docs
          .map((d) => d.data() as WarRoomPlan)
          .filter((p) => p.id && p.id !== plan.id && (p.endDateISO || p.dateISO) < today)
          .sort((a, b) => (b.endDateISO || b.dateISO).localeCompare(a.endDateISO || a.dateISO))
          .slice(0, MAX_HISTORY_FESTIVALS);
        const loaded: ForecastHistoryFestival[] = [];
        for (const p of concluded) {
          try {
            const [rsvpSnap, ticketSnap] = await Promise.all([
              getDocs(query(collection(db, 'festival_rsvps'), where('eventId', '==', p.id))),
              getDocs(query(collection(db, 'event_tickets'), where('festivalId', '==', p.id))),
            ]);
            const regs = rsvpSnap.docs.map(
              (d) => ({ id: d.id, ...(d.data() as Omit<RsvpEntry, 'id'>) }) as RsvpEntry
            );
            const states = ticketStates(
              ticketSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<EventTicket, 'id'>) }))
            );
            loaded.push({
              festivalId: p.id,
              startDateISO: p.dateISO,
              parties: partyFacts(regs, states),
            });
          } catch {
            /* one unreachable register witnesses nothing — the rest still speak */
          }
        }
        if (!cancelled) setHistory(loaded);
      } catch {
        if (!cancelled) setHistory([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [plan.id, plan.workspaceId]);

  const result: ForecastResult | null = useMemo(() => {
    if (history === null) return null;
    const days = festivalDayList(wf.dateISO, wf.endDateISO);
    const busiest = deriveDayCounts(rsvps, days).reduce((m, d) => Math.max(m, d.parties), 0);
    return buildForecast(history, {
      startDateISO: wf.dateISO,
      parties: partyFacts(rsvps, ticketStates(targetTickets)),
      busiestDayBookedParties: busiest,
    });
  }, [history, rsvps, targetTickets, wf.dateISO, wf.endDateISO]);

  const [used, setUsed] = useState(false);
  useEffect(() => setUsed(false), [plan.id]);

  const title = (
    <h3 className="font-extrabold text-stone-800 mb-1">📊 {t('surfaces.events.forecastTitle')}</h3>
  );

  if (result === null) {
    return (
      <Card>
        {title}
        <p className="text-xs text-stone-500">{t('surfaces.events.forecastLoading')}</p>
      </Card>
    );
  }

  if (result.blocker === 'no-history') {
    return (
      <Card>
        {title}
        <p className="text-xs text-stone-500">{t('surfaces.events.forecastTeach')}</p>
      </Card>
    );
  }
  if (result.blocker === 'no-gate-data') {
    return (
      <Card>
        {title}
        <p className="text-xs text-stone-500">{t('surfaces.events.forecastNoGate')}</p>
      </Card>
    );
  }
  if (result.blocker === 'thin-history') {
    return (
      <Card>
        {title}
        <p className="text-xs text-stone-500">
          {fill(t('surfaces.events.forecastThin'), { parties: result.history.partiesBooked })}
        </p>
      </Card>
    );
  }

  if (!result.forecast) return null; // unreachable — the blockers above returned
  const f = result.forecast;
  const basisLine = fill(
    t(
      f.basis.festivalsUsed === 1
        ? 'surfaces.events.forecastBasisOne'
        : 'surfaces.events.forecastBasis'
    ),
    { festivals: f.basis.festivalsUsed, parties: f.basis.partiesBooked }
  );
  const turnoutPct = Math.round((f.overall.partyRate || 0) * 100);
  const prasadRows = f.prasad ? prasadTotals(plan.prasad, f.prasad.headsToCookFor) : [];

  return (
    <Card>
      {title}
      <p className="text-xs text-stone-500 mb-3">{t('surfaces.events.forecastIntro')}</p>

      {result.blocker === 'no-bookings' || !f.expected ? (
        <p className="text-sm text-stone-600">
          {fill(t('surfaces.events.forecastNoBookings'), { pct: turnoutPct })}
        </p>
      ) : (
        <>
          <div className="text-[10px] uppercase tracking-wide text-stone-500 font-bold">
            {t('surfaces.events.forecastExpected')}
          </div>
          <div className="text-3xl font-black text-stone-900 tnum leading-tight">
            {fill(t('surfaces.events.forecastHeadsRange'), {
              low: fmtN(f.expected.headsLow),
              high: fmtN(f.expected.headsHigh),
            })}
          </div>
          <div className="text-xs text-stone-500">
            {fill(t('surfaces.events.forecastPartiesRange'), {
              low: fmtN(f.expected.partiesLow),
              high: fmtN(f.expected.partiesHigh),
            })}
            {' · '}
            {fill(t('surfaces.events.forecastTurnout'), { pct: turnoutPct })}
          </div>

          {f.prasad && prasadRows.length > 0 && (
            <div className="mt-3 rounded-xl bg-orange-50/60 border border-orange-100 px-3 py-2.5">
              <div className="text-sm font-extrabold text-orange-900">
                {fill(t('surfaces.events.forecastPrasad'), { heads: fmtN(f.prasad.headsToCookFor) })}
              </div>
              <div className="text-[11px] text-stone-500 mt-0.5">
                {fill(t('surfaces.events.forecastPrasadWhy'), {
                  mid: fmtN(f.prasad.expectedHeadsMid),
                  pct: Math.round((f.prasad.bufferFactor - 1) * 100),
                })}
              </div>
              <div className="mt-1.5 space-y-0.5">
                {prasadRows.slice(0, 3).map((row) => (
                  <div key={row.id} className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="text-stone-600 min-w-0">{pick(row.name)}</span>
                    <span className="font-black text-orange-800 shrink-0">{row.display}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {f.gate && (
            <p className="text-xs text-stone-600 mt-3">
              {fill(t('surfaces.events.forecastGate'), {
                parties: fmtN(f.gate.expectedParties),
                volunteers: f.gate.volunteers,
              })}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Btn
              className="!min-h-[44px]"
              onClick={() => {
                patch({ footfall: { lastYear: f.expected!.headsMid, growthPct: 0 } });
                setUsed(true);
                setTimeout(() => setUsed(false), 3000);
              }}
            >
              {t('surfaces.events.forecastUseBtn')}
            </Btn>
            {used && (
              <span className="text-xs font-bold text-emerald-700">
                {t('surfaces.events.forecastUsed')}
              </span>
            )}
          </div>
          <p className="text-[11px] text-stone-400 mt-1.5">
            {fill(t('surfaces.events.forecastUseNote'), { n: fmtN(f.expected.headsMid) })}
          </p>
        </>
      )}

      <p className="text-[11px] text-stone-400 mt-2">{basisLine}</p>
    </Card>
  );
};

export default ForecastCard;
