/**
 * RecordHistory — Blueprint A: the per-record History view.
 * ============================================================================
 * One reusable component + data path (auditStore.fetchEntityHistory)
 * that renders the master audit stream for ONE record in plain
 * language — the research §2c "History tab on every donation,
 * expense, member record": who did what, when, in the reader's
 * language, with amounts in the workspace's own currency.
 *
 * Honesty rules: an empty history says so plainly (records created
 * before the stream existed have no events — nothing is back-filled
 * or invented); a failed read (e.g. the reader's role cannot read
 * the stream — finance/oversight only, per rules) shows an honest
 * unavailable state, never a fake empty.
 */

import React, { useEffect, useState } from 'react';
import { History, Loader2, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useInr } from '../../hooks/useWorkspaceInr';
import { bcp47For } from '../../i18n/schema';
import { renderAuditSummary, type AuditEvent } from '../../lib/auditChain';
import { fetchEntityHistory } from '../../context/data/auditStore';

interface RecordHistoryProps {
  workspaceId: string;
  entityType: string;
  entityId: string;
  /** Render the section heading (default true). Desks that place the
   *  component under their own tab label can turn it off. */
  showTitle?: boolean;
  /** The desks are dark; the devotee detail modal is light. */
  tone?: 'dark' | 'light';
}

const TONE = {
  dark: {
    title: 'text-temple-100',
    muted: 'text-temple-400',
    item: 'border-temple-800 bg-temple-950/50',
    itemText: 'text-temple-100',
    meta: 'text-temple-500',
    hash: 'text-temple-600',
  },
  light: {
    title: 'text-temple-900',
    muted: 'text-temple-500',
    item: 'border-temple-200 bg-temple-50',
    itemText: 'text-temple-800',
    meta: 'text-temple-500',
    hash: 'text-temple-400',
  },
} as const;

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'ready'; events: AuditEvent[] };

export const RecordHistory: React.FC<RecordHistoryProps> = ({
  workspaceId,
  entityType,
  entityId,
  showTitle = true,
  tone = 'dark',
}) => {
  const { t, currentLang } = useLanguage();
  const inr = useInr();
  const cls = TONE[tone];
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });
    fetchEntityHistory(workspaceId, entityType, entityId)
      .then((events) => {
        if (!cancelled) setState({ kind: 'ready', events });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId, entityType, entityId]);

  const formatWhen = (ts: number): string => {
    try {
      return new Intl.DateTimeFormat(
        bcp47For(currentLang),
        { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }
      ).format(new Date(ts));
    } catch {
      return new Date(ts).toLocaleString();
    }
  };

  return (
    <div className="space-y-3">
      {showTitle && (
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-amber-500" />
          <h4 className={`text-sm font-bold ${cls.title}`}>
            {t('org.audit.history.title')}
          </h4>
        </div>
      )}

      {state.kind === 'loading' && (
        <div className={`flex items-center gap-2 py-4 text-xs ${cls.muted}`}>
          <Loader2 className="w-4 h-4 animate-spin" />
          {t('org.audit.history.loading')}
        </div>
      )}

      {state.kind === 'error' && (
        <div className={`flex items-start gap-2 py-3 text-xs ${cls.muted}`}>
          <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <span>{t('org.audit.history.unavailable')}</span>
        </div>
      )}

      {state.kind === 'ready' && state.events.length === 0 && (
        <p className={`py-3 text-xs ${cls.muted}`}>
          {t('org.audit.history.empty')}
        </p>
      )}

      {state.kind === 'ready' && state.events.length > 0 && (
        <ul className="space-y-2.5">
          {state.events.map((ev) => (
            <li
              key={ev.id}
              className={`flex gap-3 rounded-xl border px-3 py-2.5 ${cls.item}`}
            >
              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500/70" />
              <div className="min-w-0">
                <p className={`text-xs leading-relaxed ${cls.itemText}`}>
                  {renderAuditSummary(ev, t, inr)}
                </p>
                <p className={`mt-0.5 text-[10px] ${cls.meta}`}>
                  {formatWhen(ev.createdAt)}
                  {ev.actorRole ? ` · ${ev.actorRole}` : ''}
                  <span className={`ml-2 font-mono ${cls.hash}`}>
                    #{ev.hash.slice(0, 8)}
                  </span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
