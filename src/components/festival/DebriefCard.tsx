/**
 * DebriefCard — the festival debrief pack (EVENTS E4).
 * =====================================================================
 * One honest post-festival view inside the War Room, computed
 * ENTIRELY from records that already exist — the pure builders in
 * lib/festivalDebrief do the math; this card only loads, labels and
 * lays out. Every section names its source, and an absent source
 * shows an empty state that says how the figure gets filled —
 * never a zero dressed as data.
 *
 * Sources, section by section:
 *  - Funnel + day-wise turnout: the festival_rsvps register the War
 *    Room already subscribes to (passed in as props — no second
 *    subscription). arrived = confirmed + checkedIn, the same truth
 *    the E3 gate writes.
 *  - Pass tiers + pass money: this card's own event_tickets
 *    subscription (the TicketSalesPanel pattern) + the published
 *    doc's anchored tierSold counters.
 *  - Donations + budget: the Utsav festival record whose dates
 *    overlap this festival (matchLocalFestival — date overlap only,
 *    never a name guess). Unlinked → the section says so.
 *  - Operations: the War Room plan's own planners (footfall,
 *    prasad, roster, checklist) against the gate truth; safety and
 *    manual gate counts from the linked Utsav record.
 *
 * Money law: pass money and donations are built by different pure
 * functions from different record families and rendered in
 * different blocks — kept apart by construction.
 *
 * The pack: a printable one-page debrief sheet (.receipt-paper —
 * paper colours only, no theme utility inside, no Sandhya rule
 * reaches paper), a committee CSV, "Lessons for next year" written
 * onto the linked festival record (clone-last-year carries it),
 * and an aggregates-only public summary the committee MAY stamp
 * onto the festival's own published doc — the festival page's
 * existing publish path, aggregates by shape (no names can exist
 * in FestivalDebriefSummary).
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  collection, deleteField, doc, onSnapshot, query, setDoc, updateDoc, where,
} from 'firebase/firestore';
import { useLanguage } from '../../context/LanguageContext';
import { useUtsav } from '../../utsav/utsavStore';
import { Btn, Card, Empty, fmtDate, inputCls } from '../../utsav/ui';
import { db } from '../../lib/firebase';
import { formatMoney } from '../../lib/money';
import {
  warChecklistTemplate,
  type FestivalEventDoc,
  type Lang3,
  type RsvpEntry,
  type WarFestival,
  type WarRoomPlan,
} from '../../lib/festival';
import type { EventTicket } from '../../lib/eventTickets';
import {
  buildBudget,
  buildDayRows,
  buildDebriefCsvRows,
  buildFunnel,
  buildOps,
  buildPublicSummary,
  buildTicketMoney,
  buildTierRows,
  buildWalkins,
  matchLocalFestival,
} from '../../lib/festivalDebrief';
import { FeedbackPanel } from './FeedbackPanel';
import { departmentCoverage } from '../../lib/festivalSponsors';
import { buildFairnessSummary } from '../../lib/festivalFairness';

interface Props {
  wf: WarFestival;
  plan: WarRoomPlan;
  event: FestivalEventDoc | null;
  rsvps: RsvpEntry[];
}

const fmtN = (n: number) => n.toLocaleString('en-IN');

/* The ReportsTab CSV idiom, kept per-file like the house pattern. */
const csvEscape = (rows: string[][]) =>
  rows
    .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
const downloadCsv = (name: string, text: string) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};

/** One Day Band cell — the Clean Dashboard anatomy: a small
 *  uppercase label, a big tabular figure, one pill slot. */
const BandCell: React.FC<{ label: string; figure: string; pill?: string }> = ({ label, figure, pill }) => (
  <div className="min-w-0">
    <div className="text-[10px] uppercase tracking-wide text-stone-500 font-bold">{label}</div>
    <div className="text-2xl font-black text-stone-800 tnum leading-tight">{figure}</div>
    {pill ? (
      <span className="inline-block mt-1 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[11px] font-bold">
        {pill}
      </span>
    ) : null}
  </div>
);

const SourceNote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[11px] text-stone-400 mt-2">{children}</p>
);

/** A proportional bar pair (expected vs arrived) — hand-rolled
 *  divs, the WeekShape spirit without a chart library. */
const Bar: React.FC<{ value: number; max: number; className: string }> = ({ value, max, className }) => (
  <div className="h-2 rounded-full bg-stone-100 overflow-hidden flex-1 min-w-[60px]">
    <div
      className={`h-full rounded-full ${className}`}
      style={{ width: max > 0 ? `${Math.min(100, Math.round((value / max) * 100))}%` : '0%' }}
    />
  </div>
);

export const DebriefCard: React.FC<Props> = ({ wf, plan, event, rsvps }) => {
  const { t, currentLang } = useLanguage();
  const lang = (currentLang || 'en').slice(0, 2);
  const pick = (l: Lang3) => (l as unknown as Record<string, string>)[lang] || l.en;
  const { state: utsav, update } = useUtsav();

  /* Pass records — the TicketSalesPanel subscription pattern. */
  const [tickets, setTickets] = useState<EventTicket[]>([]);
  useEffect(() => {
    const q = query(collection(db, 'event_tickets'), where('festivalId', '==', plan.id));
    const unsub = onSnapshot(
      q,
      (snap) =>
        setTickets(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<EventTicket, 'id'>) }))),
      () => { /* staff-only read; offline keeps the last list */ }
    );
    return unsub;
  }, [plan.id]);

  /* The linked Utsav festival record (budgets, safety, gate counts,
   * lessons) — date overlap only. */
  const linked = useMemo(
    () => matchLocalFestival(wf.dateISO, wf.endDateISO, utsav.festivals),
    [wf.dateISO, wf.endDateISO, utsav.festivals]
  );
  const budgetLines = useMemo(
    () => (linked ? utsav.budget.filter((b) => b.festivalId === linked.id) : []),
    [linked, utsav.budget]
  );
  const safetyItems = useMemo(
    () => (linked ? utsav.safety.filter((s) => s.festivalId === linked.id) : null),
    [linked, utsav.safety]
  );
  const checkins = useMemo(
    () => (linked ? utsav.checkins.filter((c) => c.festivalId === linked.id) : null),
    [linked, utsav.checkins]
  );

  const funnel = useMemo(() => buildFunnel(rsvps), [rsvps]);
  const dayRows = useMemo(
    () => buildDayRows(rsvps, wf.dateISO, wf.endDateISO),
    [rsvps, wf.dateISO, wf.endDateISO]
  );
  const tierRows = useMemo(
    () =>
      buildTierRows(
        event?.ticketTiers ?? plan.ticketing?.tiers,
        event?.tierSold,
        event?.tierCaps
      ),
    [event?.ticketTiers, event?.tierSold, event?.tierCaps, plan.ticketing?.tiers]
  );
  const tm = useMemo(
    () => buildTicketMoney(tickets, plan.ticketing?.tiers),
    [tickets, plan.ticketing?.tiers]
  );
  const budget = useMemo(
    () => (linked ? buildBudget(budgetLines) : null),
    [linked, budgetLines]
  );
  const ops = useMemo(
    () => buildOps(plan, warChecklistTemplate(wf), funnel.arrivedHeads, safetyItems),
    [plan, wf, funnel.arrivedHeads, safetyItems]
  );
  const walkins = useMemo(
    () => buildWalkins(checkins, funnel.arrivedHeads),
    [checkins, funnel.arrivedHeads]
  );
  const discountUses = plan.ticketing?.discountUses || {};
  const hasDiscounts = Object.keys(discountUses).length > 0;
  const currency = tm.currency;

  /* Lessons — a draft over the linked record's field; saving writes
   * through the utsav store (the utsav_stores doc), and
   * clone-last-year carries the field into next year's record. */
  const [lessonsDraft, setLessonsDraft] = useState<string | null>(null);
  const [lessonsSaved, setLessonsSaved] = useState(false);
  useEffect(() => {
    setLessonsDraft(null);
    setLessonsSaved(false);
  }, [linked?.id]);
  const lessonsValue = lessonsDraft ?? linked?.lessons ?? '';
  const saveLessons = () => {
    if (!linked) return;
    update('festivals', linked.id, { lessons: lessonsValue });
    setLessonsSaved(true);
    setTimeout(() => setLessonsSaved(false), 3000);
  };

  /* The public summary — stamped onto the festival's own published
   * doc through its existing publish path (merge), removed with a
   * field delete. Aggregates only, by the summary's shape. */
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [pubBusy, setPubBusy] = useState(false);
  const published = event?.debriefSummary;
  const publishSummary = async () => {
    setPubBusy(true);
    try {
      const summary = buildPublicSummary({
        funnel,
        ticketMoney: tm,
        budget,
        dateISO: wf.dateISO,
        endDateISO: wf.endDateISO,
        nowIso: new Date().toISOString(),
      });
      await setDoc(doc(db, 'festival_events', plan.id), { debriefSummary: summary }, { merge: true });
      setConfirmPublish(false);
    } finally {
      setPubBusy(false);
    }
  };
  const unpublishSummary = async () => {
    setPubBusy(true);
    try {
      await updateDoc(doc(db, 'festival_events', plan.id), { debriefSummary: deleteField() });
    } finally {
      setPubBusy(false);
    }
  };

  /* NEXT-LEVEL B1a — the booking results, published the same way:
   * a staff-stamped aggregates-only field on the festival's own
   * published doc (merge write; field delete withdraws). The
   * figures are THIS card's own tier rows (anchored tierSold vs
   * tierCaps) and funnel (the register as it stands), shaped by
   * lib/festivalFairness — the public count and the committee's
   * count are the same numbers by construction. The public page
   * renders it only after the festival concludes. */
  const [confirmFair, setConfirmFair] = useState(false);
  const [fairBusy, setFairBusy] = useState(false);
  const publishedFairness = event?.fairnessSummary;
  const publishFairness = async () => {
    setFairBusy(true);
    try {
      const summary = buildFairnessSummary({
        tierRows,
        waitlistParties: funnel.waitlistedParties,
        ticketReleaseAtMs: event?.ticketReleaseAtMs,
        nowIso: new Date().toISOString(),
      });
      await setDoc(doc(db, 'festival_events', plan.id), { fairnessSummary: summary }, { merge: true });
      setConfirmFair(false);
    } finally {
      setFairBusy(false);
    }
  };
  const unpublishFairness = async () => {
    setFairBusy(true);
    try {
      await updateDoc(doc(db, 'festival_events', plan.id), { fairnessSummary: deleteField() });
    } finally {
      setFairBusy(false);
    }
  };

  /* Print — the Utilisation Certificate idiom: mark the sheet,
   * let it paint, print, unmark. print.css isolates .print-debrief. */
  const [printing, setPrinting] = useState(false);
  const printSheet = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 150);
  };

  const exportCsv = () => {
    const rows = buildDebriefCsvRows({
      festivalName: pick(wf.name),
      dateISO: wf.dateISO,
      endDateISO: wf.endDateISO,
      funnel,
      dayRows,
      tierRows,
      ticketMoney: tm,
      budget,
      discountUses: hasDiscounts ? discountUses : null,
      walkins,
    });
    downloadCsv(`utsav-debrief-${wf.dateISO}.csv`, csvEscape(rows));
  };

  const moneyRow = (label: string, value: string, strong = false) => (
    <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-stone-100 last:border-0">
      <span className="text-sm text-stone-600">{label}</span>
      <span className={`tnum ${strong ? 'font-black text-stone-800' : 'font-bold text-stone-700'}`}>{value}</span>
    </div>
  );

  return (
    <Card className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div>
        <h3 className="text-lg font-black text-stone-800">📋 {t('surfaces.events.debriefTitle')}</h3>
        <p className="text-sm text-stone-500 mt-0.5">
          {pick(wf.name)} · {fmtDate(wf.dateISO)}
          {wf.endDateISO && wf.endDateISO !== wf.dateISO ? ` – ${fmtDate(wf.endDateISO)}` : ''}
        </p>
        <p className="text-sm text-stone-500 mt-1">{t('surfaces.events.debriefIntro')}</p>
      </div>

      {/* ── Day Band — the festival at a glance ────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 rounded-2xl bg-stone-50 border border-stone-100 p-4">
        <BandCell
          label={t('surfaces.events.debriefTurnout')}
          figure={funnel.turnoutPct !== null ? `${funnel.turnoutPct}%` : '—'}
          pill={`${fmtN(funnel.arrivedHeads)} / ${fmtN(funnel.confirmedHeads)}`}
        />
        <BandCell
          label={t('surfaces.events.debriefCame')}
          figure={fmtN(funnel.arrivedHeads)}
          pill={`${fmtN(funnel.arrivedParties)} ${t('surfaces.events.debriefParties')}`}
        />
        {tickets.length > 0 && (
          <BandCell
            label={t('surfaces.events.debriefPassMoney')}
            figure={formatMoney(tm.collectedTotal, currency)}
            pill={t('surfaces.events.debriefCollected')}
          />
        )}
        {budget?.donations && (
          <BandCell
            label={t('surfaces.events.debriefDonations')}
            figure={formatMoney(budget.donations.actual, currency)}
            pill={`${t('surfaces.events.debriefPlanned')} ${formatMoney(budget.donations.planned, currency)}`}
          />
        )}
      </div>

      {/* ── 1 · The funnel — the register as it stands ─────────── */}
      <section>
        <h4 className="font-black text-stone-700">{t('surfaces.events.debriefFunnelTitle')}</h4>
        {rsvps.length === 0 ? (
          <Empty text={t('surfaces.events.debriefEmptyRsvps')} />
        ) : (
          <div className="mt-2 space-y-2">
            {[
              { label: t('surfaces.events.debriefConfirmed'), heads: funnel.confirmedHeads, parties: funnel.confirmedParties, bar: 'bg-amber-500' },
              { label: t('surfaces.events.debriefArrived'), heads: funnel.arrivedHeads, parties: funnel.arrivedParties, bar: 'bg-emerald-600' },
              { label: t('surfaces.events.debriefNoShow'), heads: funnel.noShowHeads, parties: funnel.noShowParties, bar: 'bg-stone-300' },
              { label: t('surfaces.events.debriefWaitlisted'), heads: funnel.waitlistedHeads, parties: funnel.waitlistedParties, bar: 'bg-orange-300' },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-sm font-semibold text-stone-600">{row.label}</span>
                <Bar value={row.heads} max={Math.max(funnel.confirmedHeads, funnel.waitlistedHeads, 1)} className={row.bar} />
                <span className="w-28 shrink-0 text-right text-sm tnum">
                  <span className="font-black text-stone-800">{fmtN(row.heads)}</span>{' '}
                  <span className="text-stone-400">· {fmtN(row.parties)}</span>
                </span>
              </div>
            ))}
            <SourceNote>{t('surfaces.events.debriefFunnelSource')}</SourceNote>
          </div>
        )}
      </section>

      {/* ── Day by day (multi-day festivals) ───────────────────── */}
      {dayRows.length > 1 && rsvps.length > 0 && (
        <section>
          <h4 className="font-black text-stone-700">{t('surfaces.events.debriefDayTitle')}</h4>
          <div className="mt-2 space-y-2">
            {dayRows.map((d) => (
              <div key={d.date} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-sm font-semibold text-stone-600">{fmtDate(d.date)}</span>
                <div className="flex-1 space-y-1">
                  <Bar value={d.expectedHeads} max={Math.max(...dayRows.map((x) => x.expectedHeads), 1)} className="bg-amber-300" />
                  <Bar value={d.arrivedHeads} max={Math.max(...dayRows.map((x) => x.expectedHeads), 1)} className="bg-emerald-600" />
                </div>
                <span className="w-28 shrink-0 text-right text-sm tnum">
                  <span className="font-black text-stone-800">{fmtN(d.arrivedHeads)}</span>{' '}
                  <span className="text-stone-400">/ {fmtN(d.expectedHeads)}</span>
                  {d.turnoutPct !== null && <span className="block text-[11px] text-stone-400">{d.turnoutPct}%</span>}
                </span>
              </div>
            ))}
            <SourceNote>{t('surfaces.events.debriefDaySource')}</SourceNote>
          </div>
        </section>
      )}

      {/* ── Pass tiers + discount codes ────────────────────────── */}
      {tierRows.length > 0 && (
        <section>
          <h4 className="font-black text-stone-700">{t('surfaces.events.debriefTiersTitle')}</h4>
          <div className="mt-2 space-y-2">
            {tierRows.map((row) => (
              <div key={row.tierId} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-sm font-semibold text-stone-600 truncate">{row.tierName}</span>
                {row.capacity !== null ? (
                  <Bar value={row.soldQty} max={Math.max(row.capacity, 1)} className="bg-amber-500" />
                ) : (
                  <span className="flex-1" />
                )}
                <span className="shrink-0 text-sm tnum font-bold text-stone-700">
                  {row.capacity !== null
                    ? t('surfaces.events.debriefSoldOf')
                        .replace('{sold}', fmtN(row.soldQty))
                        .replace('{cap}', fmtN(row.capacity))
                    : `${fmtN(row.soldQty)} ${t('surfaces.events.debriefSold')}`}
                </span>
              </div>
            ))}
          </div>
          {hasDiscounts && (
            <div className="mt-3">
              <div className="text-sm font-semibold text-stone-600">{t('surfaces.events.debriefCodesTitle')}</div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {Object.entries(discountUses).map(([code, n]) => (
                  <span key={code} className="rounded-full bg-stone-100 border border-stone-200 px-2.5 py-1 text-xs font-bold text-stone-600 tnum">
                    {code} × {fmtN(n)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── 3 · Money, kept apart ──────────────────────────────── */}
      <section>
        <h4 className="font-black text-stone-700">{t('surfaces.events.debriefMoneyTitle')}</h4>
        {tickets.length === 0 ? (
          <Empty text={t('surfaces.events.debriefEmptyTickets')} />
        ) : (
          <div className="mt-1">
            <div className="text-sm font-bold text-stone-500 uppercase text-[11px] tracking-wide mt-2">
              {t('surfaces.events.debriefPassMoney')}
            </div>
            {moneyRow(t('surfaces.events.debriefCollected'), formatMoney(tm.collectedTotal, currency), true)}
            {moneyRow(`· ${t('surfaces.events.debriefWallet')}`, formatMoney(tm.collectedWallet, currency))}
            {moneyRow(`· ${t('surfaces.events.debriefVenueReceived')}`, formatMoney(tm.collectedVenue, currency))}
            {tm.venuePendingCount > 0 &&
              moneyRow(`· ${t('surfaces.events.debriefVenuePending')}`, formatMoney(tm.venuePendingTotal, currency))}
            {tm.compCount > 0 &&
              moneyRow(t('surfaces.events.debriefComp'), `${fmtN(tm.compQty)}`)}
            {tm.refundCount > 0 &&
              moneyRow(
                `${t('surfaces.events.debriefRefunds')} (${fmtN(tm.refundCount)})`,
                formatMoney(tm.refundTotal, currency)
              )}
            {tm.venueRefundDueCount > 0 &&
              moneyRow(t('surfaces.events.debriefVenueRefundDue'), formatMoney(tm.venueRefundDueTotal, currency))}
            {tm.byTier.length > 0 && (
              <div className="mt-2 space-y-1">
                {tm.byTier.map((row) => (
                  <div key={row.tierId} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-stone-500">
                      {row.tierName} · <span className="tnum">{fmtN(row.liveQty)}</span>
                    </span>
                    <span className="tnum font-semibold text-stone-600">
                      {formatMoney(row.collected, currency)}
                      {row.venuePending > 0 ? ` · ${formatMoney(row.venuePending, currency)}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <SourceNote>{t('surfaces.events.debriefPassSource')}</SourceNote>
          </div>
        )}

        {/* Donations — their own line, never added to pass money. */}
        {budget?.donations && (
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-bold text-stone-700">{t('surfaces.events.debriefDonations')}</span>
              <span className="text-lg font-black text-stone-800 tnum">
                {formatMoney(budget.donations.actual, currency)}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-1">{t('surfaces.events.debriefDonationsNote')}</p>
          </div>
        )}

        {/* Budget — planned vs actual, per head. */}
        <div className="mt-3">
          <div className="text-sm font-bold text-stone-500 uppercase text-[11px] tracking-wide">
            {t('surfaces.events.debriefBudgetTitle')}
          </div>
          {!budget || budgetLines.length === 0 ? (
            <Empty text={t('surfaces.events.debriefEmptyBudget')} />
          ) : (
            <div className="mt-1 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-stone-400">
                    <th className="py-1 pr-2 font-bold"> </th>
                    <th className="py-1 px-2 font-bold text-right">{t('surfaces.events.debriefPlanned')}</th>
                    <th className="py-1 px-2 font-bold text-right">{t('surfaces.events.debriefActual')}</th>
                    <th className="py-1 pl-2 font-bold text-right">{t('surfaces.events.debriefDifference')}</th>
                  </tr>
                </thead>
                <tbody>
                  {budget.donations && (
                    <tr className="border-t border-stone-100">
                      <td className="py-1.5 pr-2 font-semibold text-stone-600">{t('surfaces.events.debriefDonations')}</td>
                      <td className="py-1.5 px-2 text-right tnum">{formatMoney(budget.donations.planned, currency)}</td>
                      <td className="py-1.5 px-2 text-right tnum font-bold">{formatMoney(budget.donations.actual, currency)}</td>
                      <td className="py-1.5 pl-2 text-right tnum">{formatMoney(budget.donations.actual - budget.donations.planned, currency)}</td>
                    </tr>
                  )}
                  {budget.rows.map((r) => (
                    <tr key={`${r.kind}-${r.head}`} className="border-t border-stone-100">
                      <td className="py-1.5 pr-2 font-semibold text-stone-600">{r.head}</td>
                      <td className="py-1.5 px-2 text-right tnum">{formatMoney(r.planned, currency)}</td>
                      <td className="py-1.5 px-2 text-right tnum font-bold">{formatMoney(r.actual, currency)}</td>
                      <td className="py-1.5 pl-2 text-right tnum">{formatMoney(r.variance, currency)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-stone-200 font-bold text-stone-700">
                    <td className="py-1.5 pr-2">{t('surfaces.events.debriefTotalIncome')}</td>
                    <td className="py-1.5 px-2 text-right tnum">{formatMoney(budget.plannedIncome, currency)}</td>
                    <td className="py-1.5 px-2 text-right tnum">{formatMoney(budget.actualIncome, currency)}</td>
                    <td className="py-1.5 pl-2 text-right tnum">{formatMoney(budget.actualIncome - budget.plannedIncome, currency)}</td>
                  </tr>
                  <tr className="font-bold text-stone-700">
                    <td className="py-1.5 pr-2">{t('surfaces.events.debriefTotalExpense')}</td>
                    <td className="py-1.5 px-2 text-right tnum">{formatMoney(budget.plannedExpense, currency)}</td>
                    <td className="py-1.5 px-2 text-right tnum">{formatMoney(budget.actualExpense, currency)}</td>
                    <td className="py-1.5 pl-2 text-right tnum">{formatMoney(budget.actualExpense - budget.plannedExpense, currency)}</td>
                  </tr>
                </tbody>
              </table>
              <SourceNote>{t('surfaces.events.debriefBudgetSource')}</SourceNote>
            </div>
          )}
        </div>
      </section>

      {/* ── 4 · Operations — planner vs what happened ──────────── */}
      <section>
        <h4 className="font-black text-stone-700">{t('surfaces.events.debriefOpsTitle')}</h4>
        <div className="mt-1">
          {ops.lastYearFootfall > 0 &&
            moneyRow(t('surfaces.events.debriefLastYear'), fmtN(ops.lastYearFootfall))}
          {ops.projectionSet &&
            moneyRow(t('surfaces.events.debriefPlannedFor'), fmtN(ops.projectedBase))}
          {moneyRow(t('surfaces.events.debriefCame'), fmtN(funnel.arrivedHeads), true)}
          {ops.checklistPct !== null &&
            moneyRow(t('surfaces.events.debriefChecklist'), `${ops.checklistPct}%`)}
          {moneyRow(t('surfaces.events.debriefRosterGaps'), fmtN(ops.rosterMissing))}
          {ops.safety &&
            moneyRow(
              t('surfaces.events.debriefSafety'),
              `${fmtN(ops.safety.done)} / ${fmtN(ops.safety.total)} · ${ops.safety.pct}%`
            )}
        </div>
        {ops.prasadForProjection.length > 0 && (
          <div className="mt-2">
            <div className="space-y-1">
              {ops.prasadForProjection.map((p, i) => (
                <div key={p.id} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-stone-600">{pick(p.name)}</span>
                  <span className="tnum text-stone-500">
                    {p.display} <span className="text-stone-300">→</span>{' '}
                    <span className="font-bold text-stone-700">{ops.prasadForActual[i]?.display ?? p.display}</span>
                  </span>
                </div>
              ))}
            </div>
            <SourceNote>{t('surfaces.events.debriefPrasadNote')}</SourceNote>
          </div>
        )}
        {walkins && (
          <div className="mt-2 rounded-2xl border border-stone-200 bg-stone-50 p-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-bold text-stone-700">{t('surfaces.events.debriefWalkins')}</span>
              <span className="text-lg font-black text-stone-800 tnum">{fmtN(walkins.walkinEstimate)}</span>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              {fmtN(walkins.manualTotal)} − {fmtN(walkins.arrivedHeads)}
            </p>
            <SourceNote>{t('surfaces.events.debriefWalkinsSource')}</SourceNote>
          </div>
        )}
      </section>

      {/* ── 4a · Seva department coverage (E6) — from the linked
          record the debrief already holds; the pinned builders in
          festivalDebrief are untouched, the coverage math is
          lib/festivalSponsors'. Shown only when the committee
          keeps a department board. ──────────────────────────── */}
      {linked?.departments && linked.departments.length > 0 && (() => {
        const cov = departmentCoverage(linked.departments);
        return (
          <section>
            <h4 className="font-black text-stone-700">{t('surfaces.events.deptTitle')}</h4>
            <div className="mt-1">
              {cov.rows.map((r) => (
                <div key={r.id} className="flex items-baseline justify-between gap-3 py-1.5 border-b border-stone-100 last:border-0">
                  <span className="text-sm text-stone-600">
                    {r.name}
                    {!r.covered && (
                      <span className="ml-2 text-[11px] font-black text-amber-800">
                        {t('surfaces.events.deptGap').replace('{gap}', fmtN(r.gap))}
                      </span>
                    )}
                  </span>
                  <span className="tnum font-bold text-stone-700">
                    {fmtN(r.assigned)} / {fmtN(r.target)}
                  </span>
                </div>
              ))}
              <SourceNote>
                {t('surfaces.events.deptSummary')
                  .replace('{assigned}', fmtN(cov.totalAssigned))
                  .replace('{target}', fmtN(cov.totalTarget))
                  .replace('{gap}', fmtN(cov.totalGap))}
              </SourceNote>
            </div>
          </section>
        );
      })()}

      {/* ── 4b · Attendee feedback (E5) ────────────────────────── */}
      <FeedbackPanel plan={plan} event={event} checkedInParties={funnel.arrivedParties} />

      {/* ── 5b · Lessons for next year ─────────────────────────── */}
      <section>
        <h4 className="font-black text-stone-700">{t('surfaces.events.debriefLessonsTitle')}</h4>
        {linked ? (
          <div className="mt-2">
            <textarea
              className={`${inputCls} min-h-[96px] w-full`}
              value={lessonsValue}
              onChange={(e) => setLessonsDraft(e.target.value)}
              placeholder={t('surfaces.events.debriefLessonsHint')}
            />
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Btn onClick={saveLessons} className="min-h-[44px]">
                {lessonsSaved ? t('surfaces.events.debriefLessonsSaved') : t('surfaces.events.debriefLessonsSave')}
              </Btn>
              <span className="text-xs text-stone-400">{t('surfaces.events.debriefLessonsHint')}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-stone-500 mt-1">{t('surfaces.events.debriefLessonsNoLink')}</p>
        )}
      </section>

      {/* ── 5 · The pack — print, CSV, public summary ──────────── */}
      <section className="no-print">
        <div className="flex flex-wrap gap-2">
          <Btn onClick={printSheet} className="min-h-[44px]">🖨️ {t('surfaces.events.debriefPrint')}</Btn>
          <Btn variant="ghost" onClick={exportCsv} className="min-h-[44px]">📥 {t('surfaces.events.debriefCsv')}</Btn>
          {published ? (
            <Btn variant="ghost" onClick={unpublishSummary} disabled={pubBusy} className="min-h-[44px]">
              {t('surfaces.events.debriefUnpublish')}
            </Btn>
          ) : confirmPublish ? (
            <>
              <Btn onClick={publishSummary} disabled={pubBusy} className="min-h-[44px]">
                {t('surfaces.events.debriefPublish')}
              </Btn>
              <Btn variant="ghost" onClick={() => setConfirmPublish(false)} className="min-h-[44px]">
                ✕
              </Btn>
            </>
          ) : (
            <Btn variant="ghost" onClick={() => setConfirmPublish(true)} className="min-h-[44px]">
              {t('surfaces.events.debriefPublish')}
            </Btn>
          )}
        </div>
        {confirmPublish && !published && (
          <p className="text-sm text-stone-500 mt-2">{t('surfaces.events.debriefPublishConfirm')}</p>
        )}
        {published && (
          <p className="text-sm text-emerald-700 font-semibold mt-2">
            ✓ {t('surfaces.events.debriefPublishedOn').replace('{date}', published.publishedAt.slice(0, 10))}
          </p>
        )}
      </section>

      {/* ── 5c · Fairness results (NEXT-LEVEL B1a) — publish the
          booking count itself: per-tier offered/booked from the
          anchored counters, the still-waiting count, the release
          moment when one was used. Shown only for a festival that
          actually sold passes; the public page renders the block
          only after the festival concludes. ──────────────────── */}
      {(event?.ticketTiers?.length ?? 0) > 0 && (
        <section className="no-print">
          <h4 className="font-black text-stone-700">{t('surfaces.events.fairStaffTitle')}</h4>
          <SourceNote>{t('surfaces.events.fairStaffNote')}</SourceNote>
          <div className="flex flex-wrap gap-2 mt-2">
            {publishedFairness ? (
              <Btn variant="ghost" onClick={unpublishFairness} disabled={fairBusy} className="min-h-[44px]">
                {t('surfaces.events.fairUnpublish')}
              </Btn>
            ) : confirmFair ? (
              <>
                <Btn onClick={publishFairness} disabled={fairBusy} className="min-h-[44px]">
                  {t('surfaces.events.fairPublish')}
                </Btn>
                <Btn variant="ghost" onClick={() => setConfirmFair(false)} className="min-h-[44px]">
                  ✕
                </Btn>
              </>
            ) : (
              <Btn variant="ghost" onClick={() => setConfirmFair(true)} className="min-h-[44px]">
                {t('surfaces.events.fairPublish')}
              </Btn>
            )}
          </div>
          {confirmFair && !publishedFairness && (
            <p className="text-sm text-stone-500 mt-2">{t('surfaces.events.fairPublishConfirm')}</p>
          )}
          {publishedFairness && (
            <p className="text-sm text-emerald-700 font-semibold mt-2">
              ✓ {t('surfaces.events.fairPublishedOn').replace('{date}', publishedFairness.publishedAt.slice(0, 10))}
            </p>
          )}
        </section>
      )}

      {/* ── 5a · The printable sheet — paper only ──────────────── */}
      {printing && (
        <div className="receipt-paper print-debrief rounded-2xl p-5">
          <div className="rp-eyebrow text-[11px] font-bold uppercase tracking-widest">
            {pick(wf.name)} · {fmtDate(wf.dateISO)}
            {wf.endDateISO && wf.endDateISO !== wf.dateISO ? ` – ${fmtDate(wf.endDateISO)}` : ''}
          </div>
          <div className="rp-title text-2xl font-black mt-1">{t('surfaces.events.debriefSheetTitle')}</div>
          <div className="paper-line border-t mt-3 pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between gap-3">
              <span className="rp-soft">{t('surfaces.events.debriefTurnout')}</span>
              <span className="rp-ink font-black tnum">
                {funnel.turnoutPct !== null ? `${funnel.turnoutPct}%` : '—'} · {fmtN(funnel.arrivedHeads)} / {fmtN(funnel.confirmedHeads)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="rp-soft">{t('surfaces.events.debriefNoShow')}</span>
              <span className="rp-ink font-bold tnum">{fmtN(funnel.noShowHeads)}</span>
            </div>
            {tickets.length > 0 && (
              <div className="flex justify-between gap-3">
                <span className="rp-soft">{t('surfaces.events.debriefPassMoney')} · {t('surfaces.events.debriefCollected')}</span>
                <span className="rp-amount font-black tnum">{formatMoney(tm.collectedTotal, currency)}</span>
              </div>
            )}
            {tm.refundCount > 0 && (
              <div className="flex justify-between gap-3">
                <span className="rp-soft">{t('surfaces.events.debriefRefunds')}</span>
                <span className="rp-ink font-bold tnum">{fmtN(tm.refundCount)} · {formatMoney(tm.refundTotal, currency)}</span>
              </div>
            )}
            {budget?.donations && (
              <div className="flex justify-between gap-3">
                <span className="rp-soft">{t('surfaces.events.debriefDonations')}</span>
                <span className="rp-amount font-black tnum">{formatMoney(budget.donations.actual, currency)}</span>
              </div>
            )}
            {budget && (
              <div className="flex justify-between gap-3">
                <span className="rp-soft">{t('surfaces.events.debriefTotalExpense')} · {t('surfaces.events.debriefActual')}</span>
                <span className="rp-ink font-bold tnum">{formatMoney(budget.actualExpense, currency)}</span>
              </div>
            )}
            {ops.checklistPct !== null && (
              <div className="flex justify-between gap-3">
                <span className="rp-soft">{t('surfaces.events.debriefChecklist')}</span>
                <span className="rp-ink font-bold tnum">{ops.checklistPct}%</span>
              </div>
            )}
          </div>
          {linked?.lessons ? (
            <div className="paper-line border-t mt-3 pt-3">
              <div className="rp-eyebrow text-[11px] font-bold uppercase tracking-widest">
                {t('surfaces.events.debriefLessonsTitle')}
              </div>
              <p className="rp-ink text-sm mt-1 whitespace-pre-wrap">{linked.lessons}</p>
            </div>
          ) : null}
          <p className="rp-faint text-xs mt-4">{t('surfaces.events.debriefSheetNote')}</p>
          <p className="rp-blessing text-center text-sm mt-3">🙏</p>
        </div>
      )}
    </Card>
  );
};

export default DebriefCard;
