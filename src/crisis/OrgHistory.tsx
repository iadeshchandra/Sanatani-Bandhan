/**
 * crisis/OrgHistory.tsx — Phase 3: organisation incident management.
 * ===================================================================
 * Trustee / Crisis Coordinator ONLY, fail-closed:
 *   - SuperAdmin passes every gate (checkPermission).
 *   - Otherwise requires an explicit Trustee-family role OR a
 *     `crisisCoordinators/{workspaceId}_{uid}` edge.
 *   - While the coordinator edge is resolving we show a skeleton —
 *     never a denial, never the data.
 * Queries are workspaceId-scoped; see historyService for privacy notes.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { appLocale } from '../lib/format';
import {
  BarChart3,
  Clock3,
  FileText,
  Filter,
  Lock,
  Printer,
  Search,
  ShieldAlert,
  Timer,
  TrendingUp,
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useLanguage } from '../context/LanguageContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import {
  crisisCopy,
  useCrisisT,
  normalizeLang,
  type TriString,
} from './crisisStrings';
import {
  type CrisisEvent,
  type CrisisResponse,
  type CrisisSituation,
  type CrisisStatus,
} from './crisisCommandTypes';
import { tsToMs } from './crisisCommandTypes';
import {
  getOrgEvents,
  responseAnalytics,
  firstAckSec,
  resolveSec,
  exportIncident,
  printIncidentReport,
  type OrgEventFilters,
  type ResponseAnalytics,
} from './historyService';

const SITUATIONS: CrisisSituation[] = ['medical', 'fire', 'robbery', 'crowd', 'disaster', 'other'];
const STATUSES: CrisisStatus[] = ['active', 'acknowledged', 'responding', 'resolved', 'cancelled'];

function situationLabel(s: CrisisSituation, t: (x: TriString) => string): string {
  switch (s) {
    case 'medical': return t(crisisCopy.sitMedical);
    case 'fire': return t(crisisCopy.sitFire);
    case 'robbery': return t(crisisCopy.sitRobbery);
    case 'crowd': return t(crisisCopy.sitCrowd);
    case 'disaster': return t(crisisCopy.sitDisaster);
    default: return t(crisisCopy.sitOther);
  }
}

function fmtDur(sec: number | null): string {
  if (sec == null) return '—';
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d`;
}

function fmtDay(ms: number, lang: string): string {
  if (!ms) return '—';
  try {
    return new Date(ms).toLocaleDateString(
      lang === 'bn' ? 'bn-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN',
      { day: 'numeric', month: 'short', year: 'numeric' },
    );
  } catch {
    return new Date(ms).toLocaleDateString(appLocale());
  }
}

function severityBadge(sev: string): string {
  switch (String(sev).toLowerCase()) {
    case 'critical': return 'bg-red-100 text-red-800 border-red-200';
    case 'high': return 'bg-amber-100 text-amber-800 border-amber-200';
    default: return 'bg-stone-100 text-stone-600 border-stone-200';
  }
}

/* ------------------------------------------------------------------ */
/* 30-day sparkline (pure SVG, no chart lib)                           */
/* ------------------------------------------------------------------ */

const Sparkline: React.FC<{ trend: { dayStartMs: number; count: number }[] }> = ({ trend }) => {
  const W = 280;
  const H = 64;
  const max = Math.max(1, ...trend.map((p) => p.count));
  const pts = trend
    .map((p, i) => {
      const x = (i / (trend.length - 1)) * (W - 8) + 4;
      const y = H - 6 - (p.count / max) * (H - 16);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-16 w-full" role="img" aria-hidden="true">
      <polyline points={pts} fill="none" stroke="#b45309" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {trend.map((p, i) => {
        const x = (i / (trend.length - 1)) * (W - 8) + 4;
        const y = H - 6 - (p.count / max) * (H - 16);
        return <circle key={i} cx={x} cy={y} r={p.count > 0 ? 2.5 : 0} fill="#b45309" />;
      })}
    </svg>
  );
};

/* ------------------------------------------------------------------ */
/* Main view                                                           */
/* ------------------------------------------------------------------ */

type Item = { event: CrisisEvent; responses: CrisisResponse[] };

export const OrgHistory: React.FC = () => {
  const { currentLang } = useLanguage();
  const { checkPermission, activeWorkspaceId, firebaseUser, currentUser, isLoading: authLoading } = useAuthWorkspace();
  const t = useCrisisT();
  const lang = normalizeLang(currentLang);

  const uid = firebaseUser?.uid ?? (currentUser as { id?: string } | undefined)?.id ?? '';
  const workspaceId = activeWorkspaceId ?? '';

  // ---- Fail-closed access resolution ---------------------------------
  const [edgeLoading, setEdgeLoading] = useState(true);
  const [isCoordinator, setIsCoordinator] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setEdgeLoading(true);
      try {
        if (uid && workspaceId) {
          const snap = await getDoc(doc(db, 'crisisCoordinators', `${workspaceId}_${uid}`));
          if (alive) setIsCoordinator(snap.exists());
        } else if (alive) {
          setIsCoordinator(false);
        }
      } catch {
        if (alive) setIsCoordinator(false); // read failure = no edge = locked
      } finally {
        if (alive) setEdgeLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [uid, workspaceId]);

  const allowed =
    !authLoading &&
    !edgeLoading &&
    (checkPermission(['SuperAdmin', 'SUPER_ADMIN', 'Trustee', 'TRUSTEE', 'CSO', 'Crisis Coordinator', 'CRISIS_COORDINATOR']) || isCoordinator);

  // ---- Data -----------------------------------------------------------
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<OrgEventFilters>({ situation: 'all', status: 'all', search: '' });
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    if (!allowed || !workspaceId) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const data = await getOrgEvents(workspaceId, {
          situation: filters.situation,
          status: filters.status,
          search: filters.search,
          fromMs: fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null,
          toMs: toDate ? new Date(`${toDate}T23:59:59`).getTime() : null,
        });
        if (alive) setItems(data);
      } catch {
        if (alive) setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [allowed, workspaceId, filters.situation, filters.status, fromDate, toDate]);

  // Search is debounced-lite: refetch only on submit/enter via a key.
  const [searchInput, setSearchInput] = useState('');
  const submitSearch = () => setFilters((f) => ({ ...f, search: searchInput }));

  const analytics: ResponseAnalytics = useMemo(() => responseAnalytics(items), [items]);

  const handlePrint = (item: Item) => {
    const report = exportIncident(item.event, item.responses, {
      uid,
      name: (currentUser as { name?: string } | undefined)?.name ?? 'Coordinator',
    });
    printIncidentReport(report, {
      title: t(crisisCopy.reportTitle),
      generatedBy: t(crisisCopy.reportGeneratedBy),
      on: t(crisisCopy.reportOn),
      situation: t(crisisCopy.colSituation),
      status: t(crisisCopy.filterStatus),
      triggeredAt: t(crisisCopy.reportTriggeredAt),
      resolvedAt: t(crisisCopy.reportResolvedAt),
      location: t(crisisCopy.reportLocation),
      details: t(crisisCopy.reportDetails),
      outcome: t(crisisCopy.reportOutcome),
      responders: t(crisisCopy.reportResponders),
      name: t(crisisCopy.reportName),
      role: t(crisisCopy.reportRole),
      respondedAt: t(crisisCopy.reportRespondedAt),
      firstAck: t(crisisCopy.reportFirstAck),
      resolutionTime: t(crisisCopy.reportResolutionTime),
      notRecorded: t(crisisCopy.reportNotRecorded),
      coming: t(crisisCopy.reportComing),
      arrived: t(crisisCopy.reportArrived),
      footer: t(crisisCopy.reportFooter),
    });
  };

  /* ---------------- Gate states ---------------- */

  if (authLoading || edgeLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8" aria-busy="true">
        <div className="h-8 w-48 animate-pulse rounded bg-stone-200" />
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-stone-100" />
          ))}
        </div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <Lock className="mx-auto h-10 w-10 text-stone-400" />
        <h1 className="mt-4 text-xl font-bold text-stone-900">{t(crisisCopy.accessDeniedTitle)}</h1>
        <p className="mt-2 text-sm text-stone-600">{t(crisisCopy.accessDeniedBody)}</p>
      </div>
    );
  }

  /* ---------------- Main ---------------- */

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 pb-16">
      <header className="mb-5">
        <h1 className="flex items-center gap-2 text-xl font-bold text-stone-900">
          <ShieldAlert className="h-5 w-5 text-amber-700" />
          {t(crisisCopy.orgHistoryTitle)}
        </h1>
        <p className="mt-1 text-sm text-stone-500">{t(crisisCopy.orgHistorySubtitle)}</p>
      </header>

      {/* Analytics cards */}
      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="analytics">
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-stone-500">
            <Timer className="h-3.5 w-3.5" /> {t(crisisCopy.statAvgFirstAck)}
          </p>
          <p className="mt-1 text-2xl font-bold text-stone-900">
            {analytics.avgFirstAckSec == null ? '—' : fmtDur(analytics.avgFirstAckSec)}
          </p>
          <p className="mt-0.5 text-[11px] text-stone-500">
            {t(crisisCopy.basedOn)} {analytics.sampleSizeAck} {t(crisisCopy.incidentsWord)}
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-stone-500">
            <Clock3 className="h-3.5 w-3.5" /> {t(crisisCopy.statAvgResolve)}
          </p>
          <p className="mt-1 text-2xl font-bold text-stone-900">
            {analytics.avgResolveSec == null ? '—' : fmtDur(analytics.avgResolveSec)}
          </p>
          <p className="mt-0.5 text-[11px] text-stone-500">
            {t(crisisCopy.basedOn)} {analytics.sampleSizeResolve} {t(crisisCopy.incidentsWord)}
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-stone-500">
            <BarChart3 className="h-3.5 w-3.5" /> {t(crisisCopy.statBySituation)}
          </p>
          <div className="mt-2 space-y-1">
            {SITUATIONS.map((s) => (
              <div key={s} className="flex items-center justify-between text-xs">
                <span className="text-stone-600">{situationLabel(s, t)}</span>
                <span className="font-semibold text-stone-900">{analytics.bySituation[s]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-4">
          <p className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-stone-500">
            <TrendingUp className="h-3.5 w-3.5" /> {t(crisisCopy.statTrend)}
          </p>
          <Sparkline trend={analytics.trend} />
          <p className="text-[11px] text-stone-500">
            {analytics.totalEvents} {t(crisisCopy.incidentsWord)}
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="mb-4 rounded-2xl border border-stone-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-xs font-medium text-stone-500">
            <Filter className="h-4 w-4" />
          </span>
          <label className="flex min-h-[44px] items-center gap-1.5 text-sm">
            <span className="sr-only">{t(crisisCopy.filterSituation)}</span>
            <select
              value={filters.situation}
              onChange={(e) => setFilters((f) => ({ ...f, situation: e.target.value as CrisisSituation | 'all' }))}
              className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm"
            >
              <option value="all">{t(crisisCopy.filterAll)} · {t(crisisCopy.filterSituation)}</option>
              {SITUATIONS.map((s) => (
                <option key={s} value={s}>{situationLabel(s, t)}</option>
              ))}
            </select>
          </label>
          <label className="flex min-h-[44px] items-center gap-1.5 text-sm">
            <span className="sr-only">{t(crisisCopy.filterStatus)}</span>
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as CrisisStatus | 'all' }))}
              className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm"
            >
              <option value="all">{t(crisisCopy.filterAll)} · {t(crisisCopy.filterStatus)}</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="min-h-[44px] rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm"
            aria-label={t(crisisCopy.colDate)}
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="min-h-[44px] rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm"
            aria-label={t(crisisCopy.colDate)}
          />
          <div className="flex min-h-[44px] flex-1 items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3">
            <Search className="h-4 w-4 shrink-0 text-stone-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitSearch(); }}
              placeholder={t(crisisCopy.filterSearch)}
              className="w-full bg-transparent py-2 text-sm outline-none"
            />
          </div>
        </div>
      </section>

      {/* Table */}
      {loading ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-stone-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-2xl bg-stone-50 p-8 text-center text-sm text-stone-500">
          {t(crisisCopy.noOrgEvents)}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
                <th className="px-4 py-3">{t(crisisCopy.colDate)}</th>
                <th className="px-4 py-3">{t(crisisCopy.colSituation)}</th>
                <th className="px-4 py-3">{t(crisisCopy.colSender)}</th>
                <th className="px-4 py-3">{t(crisisCopy.colSeverity)}</th>
                <th className="px-4 py-3">{t(crisisCopy.colFirstAck)}</th>
                <th className="px-4 py-3">{t(crisisCopy.colResolvedIn)}</th>
                <th className="px-4 py-3">{t(crisisCopy.colOutcome)}</th>
                <th className="px-4 py-3 text-right">{t(crisisCopy.colActions)}</th>
              </tr>
            </thead>
            <tbody>
              {items.map(({ event, responses }) => (
                <tr key={event.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50/60">
                  <td className="whitespace-nowrap px-4 py-3 text-stone-700">
                    {fmtDay(tsToMs(event.createdAt), lang)}
                  </td>
                  <td className="px-4 py-3 font-medium text-stone-900">
                    {situationLabel(event.situation, t)}
                  </td>
                  <td className="px-4 py-3 text-stone-700">
                    {event.senderName}
                    {event.sanId && <span className="block text-xs text-stone-400">{event.sanId}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${severityBadge(String(event.severity))}`}>
                      {String(event.severity)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-stone-700">
                    {fmtDur(firstAckSec(event, responses))}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-stone-700">
                    {fmtDur(resolveSec(event))}
                  </td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-stone-600" title={event.outcomeNote ?? ''}>
                    {event.outcomeNote ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handlePrint({ event, responses })}
                      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-xl border border-stone-200 px-3 text-xs font-medium text-stone-700 hover:bg-stone-50"
                      title={t(crisisCopy.exportReport)}
                    >
                      <Printer className="h-4 w-4" />
                      <FileText className="hidden h-4 w-4 sm:inline" />
                      <span className="hidden sm:inline">{t(crisisCopy.exportReport)}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default OrgHistory;
