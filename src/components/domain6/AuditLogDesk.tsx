import React, { useEffect, useMemo, useState } from 'react';
import { appLocale } from '../../lib/format';
import {
  ShieldCheck,
  Search,
  Download,
  ShieldAlert,
  Activity,
  Loader2,
  BadgeCheck,
  TriangleAlert,
} from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useData } from '../../context/DataContext';
import { useLanguage } from '../../context/LanguageContext';
import { useInr } from '../../hooks/useWorkspaceInr';
import { exportToCSV } from '../../utils/csvEngine';
import { useToast } from '../../context/ToastContext';
import { getDict } from '../../i18n/translations';
import { bcp47For } from '../../i18n/schema';
import {
  renderAuditSummary,
  verifyAuditChain,
  type AuditEvent,
  type ChainVerification,
} from '../../lib/auditChain';
import {
  fetchChainForVerification,
  fetchWorkspaceEvents,
} from '../../context/data/auditStore';
import { PublishedAccountsPanel } from '../audit/PublishedAccountsPanel';

/**
 * AuditLogDesk — Blueprint A: the forensic surface of the master
 * audit stream.
 *
 * QUEUED #59 removed this desk's four hard-coded "audit entries"
 * (invented people, invented IPs, invented SHA-256 stamps) and left
 * an honest empty state "until the real audit stream (Blueprint A)".
 * This is that stream: hash-chained `auditEvents` written by the
 * data layer at every commit point (treasury, devotees, bookings,
 * inventory, settings, sample purge, publish/unpublish).
 *
 * The desk offers the research §2c owner-surface: filter by actor,
 * action and date; export CSV; and a "Verify chain" action that
 * recomputes every hash from GENESIS and reports the first break —
 * or says plainly how many events were verified. Fields the client
 * cannot know truthfully (the actor's IP address) are NOT shown:
 * an audit desk that invents evidence is worse than an empty one.
 */
export const AuditLogDesk: React.FC = () => {
  const { activeWorkspace } = useAuthWorkspace();
  const { devotees } = useData();
  const { showToast } = useToast();
  const { t, currentLang } = useLanguage();
  const inr = useInr();

  const workspaceId = activeWorkspace?.id || '';
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(
    'loading'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [verifyState, setVerifyState] = useState<
    | { kind: 'idle' }
    | { kind: 'verifying' }
    | { kind: 'done'; result: ChainVerification; truncated: boolean }
  >({ kind: 'idle' });

  useEffect(() => {
    let cancelled = false;
    setLoadState('loading');
    setVerifyState({ kind: 'idle' });
    fetchWorkspaceEvents(workspaceId, 300)
      .then((rows) => {
        if (!cancelled) {
          setEvents(rows);
          setLoadState('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setLoadState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const actors = useMemo(
    () => [...new Set(events.map((e) => e.actorName))].sort(),
    [events]
  );
  const actions = useMemo(
    () => [...new Set(events.map((e) => e.action))].sort(),
    [events]
  );

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return events.filter((e) => {
      if (actorFilter && e.actorName !== actorFilter) return false;
      if (actionFilter && e.action !== actionFilter) return false;
      const day = new Date(e.createdAt).toISOString().slice(0, 10);
      if (fromDate && day < fromDate) return false;
      if (toDate && day > toDate) return false;
      if (q) {
        const hay = `${e.actorName} ${e.action} ${e.entityType} ${e.entityLabel || ''} ${e.entityId}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [events, searchTerm, actorFilter, actionFilter, fromDate, toDate]);

  const formatWhen = (ts: number): string => {
    try {
      return new Intl.DateTimeFormat(
        bcp47For(currentLang),
        {
          day: 'numeric',
          month: 'short',
          hour: 'numeric',
          minute: '2-digit',
        }
      ).format(new Date(ts));
    } catch {
      return new Date(ts).toLocaleString(appLocale());
    }
  };

  /** CSV summaries render in English from the en dict — a forensic
   *  export is shared with auditors who may not read the UI language. */
  const enTranslate = (key: string): string => {
    let cur: unknown = getDict('en');
    for (const seg of key.split('.')) {
      if (cur && typeof cur === 'object' && seg in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[seg];
      } else {
        return key;
      }
    }
    return typeof cur === 'string' ? cur : key;
  };

  const handleExportCSV = () => {
    const headers = ['Event ID', 'Time (ISO)', 'Actor', 'Role', 'Action', 'Record Type', 'Record ID', 'Summary', 'SHA-256 Hash'];
    const rows = filtered.map((e) => [
      e.id,
      new Date(e.createdAt).toISOString(),
      e.actorName,
      e.actorRole,
      e.action,
      e.entityType,
      e.entityId,
      renderAuditSummary(e, enTranslate, (n) => String(n)),
      e.hash,
    ]);
    exportToCSV(
      `Audit_Log_${activeWorkspace.type}_${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
    showToast(t('org.audit.desk.exportedToast'), 'success');
  };

  const handleVerify = async () => {
    setVerifyState({ kind: 'verifying' });
    try {
      const { events: chain, truncated } = await fetchChainForVerification(workspaceId);
      setVerifyState({
        kind: 'done',
        result: verifyAuditChain(chain),
        truncated,
      });
    } catch {
      setVerifyState({ kind: 'idle' });
      showToast(t('org.audit.desk.verifyFailed'), 'error');
    }
  };

  const verifyBanner = () => {
    if (verifyState.kind === 'idle') return null;
    if (verifyState.kind === 'verifying') {
      return (
        <div className="flex items-center gap-2 rounded-2xl border border-temple-700 bg-temple-900/90 px-4 py-3 text-xs text-temple-300">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t('org.audit.desk.verifying')}
        </div>
      );
    }
    const { result, truncated } = verifyState;
    if (result.ok) {
      return (
        <div className="flex items-start gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300">
          <BadgeCheck className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {t('org.audit.desk.chainOk').replace('{count}', String(result.checked))}
            {truncated
              ? ` ${t('org.audit.desk.chainTruncated').replace('{count}', String(result.checked))}`
              : ''}
          </span>
        </div>
      );
    }
    return (
      <div className="flex items-start gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
        <TriangleAlert className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          {t('org.audit.desk.chainBroken').replace(
            '{id}',
            (result.firstBreakId || '').slice(0, 12)
          )}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-temple-900/90 border border-temple-800 p-6 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] font-bold uppercase tracking-wider">
              {t('org.audit.desk.badge')}
            </span>
            <span className="text-xs text-temple-400 font-mono">
              {activeWorkspace.name}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-temple-100">
            {t('org.audit.desk.title')}
          </h2>
          <p className="text-xs text-temple-400 mt-0.5">
            {t('org.audit.desk.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleVerify()}
            className="min-h-[44px] px-3.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t('org.audit.desk.verifyButton')}</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="min-h-[44px] px-3.5 rounded-xl bg-temple-800 hover:bg-temple-750 border border-temple-700 text-temple-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('org.audit.desk.exportButton')}</span>
          </button>
        </div>
      </div>

      {verifyBanner()}

      {/* Security Health Check Widget */}
      <div className="bg-temple-900/90 border border-temple-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/20">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-temple-100">{t('org.audit.desk.healthTitle')}</h3>
            <p className="text-xs text-temple-400">{t('org.audit.desk.healthSubtitle')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(() => {
            const elevatedRoles = ['TRUSTEE', 'SUPER_ADMIN', 'MANAGER', 'SUPER_ADMIN', 'SUPER_ADMIN'];
            const elevatedUsers = devotees.filter(d => elevatedRoles.includes(d.role));
            // A non-admin user with trustee roles might be someone with a generic email or low seva index
            const suspiciousUsers = elevatedUsers.filter(d => d.sevaIndex < 100 || !d.email?.includes('@'));

            return (
              <>
                <div className="bg-temple-950/50 border border-temple-800 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-temple-300">{t('org.audit.desk.privilegedAccounts')}</span>
                    <span className="text-xs font-mono bg-temple-800 text-temple-300 px-2 py-0.5 rounded-lg">{elevatedUsers.length}</span>
                  </div>
                  <p className="text-[10px] text-temple-500">{t('org.audit.desk.privilegedHint')}</p>
                </div>

                <div className="bg-rose-950/20 border border-rose-900/30 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-rose-400">{t('org.audit.desk.suspiciousAccess')}</span>
                    <span className={`text-xs font-mono px-2 py-0.5 rounded-lg ${suspiciousUsers.length > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      {suspiciousUsers.length} {t('org.audit.desk.flags')}
                    </span>
                  </div>
                  <p className="text-[10px] text-temple-500">{t('org.audit.desk.suspiciousHint')}</p>

                  {suspiciousUsers.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {suspiciousUsers.map(u => (
                        <div key={u.id} className="flex items-center justify-between bg-temple-900/50 p-2 rounded-xl border border-rose-500/10">
                          <div>
                            <p className="text-xs font-bold text-temple-200">{u.fullName || u.name || 'Unknown'}</p>
                            <p className="text-[10px] text-rose-400 font-mono uppercase">{u.role}</p>
                          </div>
                          <button className="min-h-[44px] text-[10px] bg-temple-800 hover:bg-temple-700 text-temple-300 px-2 py-1 rounded border border-temple-700 transition-colors">
                            {t('org.audit.desk.review')}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-temple-900/90 border border-temple-800 p-4 rounded-2xl flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative w-full lg:w-72">
          <Search className="w-3.5 h-3.5 text-temple-400 absolute left-3 top-3.5" />
          <input
            type="text"
            placeholder={t('org.audit.desk.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full min-h-[44px] bg-temple-800 border border-temple-700 rounded-xl pl-9 pr-3 py-2 text-xs text-temple-200 placeholder-temple-400 focus:outline-none focus:border-saffron-500"
          />
        </div>
        <select
          value={actorFilter}
          onChange={(e) => setActorFilter(e.target.value)}
          className="min-h-[44px] bg-temple-800 border border-temple-700 rounded-xl px-3 text-xs text-temple-200 focus:outline-none focus:border-saffron-500"
          aria-label={t('org.audit.desk.filterActor')}
        >
          <option value="">{t('org.audit.desk.allActors')}</option>
          {actors.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="min-h-[44px] bg-temple-800 border border-temple-700 rounded-xl px-3 text-xs text-temple-200 focus:outline-none focus:border-saffron-500"
          aria-label={t('org.audit.desk.filterAction')}
        >
          <option value="">{t('org.audit.desk.allActions')}</option>
          {actions.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="min-h-[44px] bg-temple-800 border border-temple-700 rounded-xl px-3 text-xs text-temple-200 focus:outline-none focus:border-saffron-500"
            aria-label={t('org.audit.desk.filterFrom')}
          />
          <span className="text-temple-500 text-xs">→</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="min-h-[44px] bg-temple-800 border border-temple-700 rounded-xl px-3 text-xs text-temple-200 focus:outline-none focus:border-saffron-500"
            aria-label={t('org.audit.desk.filterTo')}
          />
        </div>
      </div>

      {/* Stream table */}
      <div className="bg-temple-900/90 border border-temple-800 rounded-3xl p-6 shadow-xl overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] text-temple-400 uppercase bg-temple-950/60 font-semibold border-b border-temple-800">
              <tr>
                <th className="p-3">{t('org.audit.desk.colTime')}</th>
                <th className="p-3">{t('org.audit.desk.colActor')}</th>
                <th className="p-3">{t('org.audit.desk.colAction')}</th>
                <th className="p-3">{t('org.audit.desk.colSummary')}</th>
                <th className="p-3">{t('org.audit.desk.colHash')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-temple-800">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-temple-800/40 transition-colors">
                  <td className="p-3 font-mono text-temple-300 text-[11px] whitespace-nowrap">
                    {formatWhen(log.createdAt)}
                  </td>
                  <td className="p-3">
                    <p className="font-bold text-temple-100">{log.actorName}</p>
                    <p className="text-[10px] text-saffron-400 font-mono uppercase">{log.actorRole}</p>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-temple-800 text-temple-200 font-mono text-[10px]">
                      {log.action}
                    </span>
                    <p className="text-[10px] text-temple-500 mt-1">
                      {log.entityType}
                      {log.entityLabel ? ` · ${log.entityLabel}` : ''}
                    </p>
                  </td>
                  <td className="p-3 text-temple-200 max-w-[340px]">
                    {renderAuditSummary(log, t, inr)}
                  </td>
                  <td className="p-3 font-mono text-[10px] text-temple-400 whitespace-nowrap">
                    #{log.hash.slice(0, 10)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loadState === 'loading' && (
          <div className="text-center py-10">
            <Loader2 className="w-6 h-6 text-temple-500 mx-auto mb-3 animate-spin" />
            <p className="text-xs text-temple-400">{t('org.audit.history.loading')}</p>
          </div>
        )}
        {loadState === 'error' && (
          <div className="text-center py-10">
            <ShieldAlert className="w-8 h-8 text-amber-500 mx-auto mb-3" />
            <p className="text-sm font-bold text-temple-200">{t('org.audit.desk.unavailableTitle')}</p>
            <p className="text-xs text-temple-400 mt-1 max-w-md mx-auto">{t('org.audit.desk.unavailableBody')}</p>
          </div>
        )}
        {loadState === 'ready' && filtered.length === 0 && (
          <div className="text-center py-10">
            <Activity className="w-8 h-8 text-temple-600 mx-auto mb-3" />
            <p className="text-sm font-bold text-temple-200">
              {events.length === 0 ? t('org.audit.desk.emptyTitle') : t('org.audit.desk.noMatchTitle')}
            </p>
            <p className="text-xs text-temple-400 mt-1 max-w-md mx-auto">
              {events.length === 0 ? t('org.audit.desk.emptyBody') : t('org.audit.desk.noMatchBody')}
            </p>
          </div>
        )}
      </div>

      {/* Published accounts — the publish flow for the public board */}
      <PublishedAccountsPanel />
    </div>
  );
};
