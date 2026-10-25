/**
 * NeedsAttention — the "Needs your hand" summary (QUEUED #39).
 * ============================================================================
 * Mounted by the shell at the top of the default Insights view: the
 * owner lands and sees, in one glance, everything awaiting a human —
 * payment claims to approve, subscriptions past due, APIs failing,
 * support messages unanswered — each row deep-linking to its desk.
 *
 * Honesty rules (consoleChrome.ts): a row exists only for a fact that
 * was really read and is > 0; the "all clear" line is shown ONLY when
 * every check this role is responsible for loaded successfully
 * (handCompleteness) — a failed read narrows the message instead of
 * faking calm. If nothing could be read at all, the card hides.
 */
import React from 'react';
import { appLocale } from '../../../lib/format';
import {
  AlarmClock,
  CheckCircle2,
  ChevronRight,
  KeyRound,
  LifeBuoy,
  Receipt,
  RefreshCw,
} from 'lucide-react';
import type { PlatformRole } from '../../../lib/platformAdminRoles';
import {
  buildHandItems,
  handCompleteness,
  type ConsoleFacts,
  type HandItem,
} from './consoleChrome';
import { GmBadge, GmCard, GM_TONE_CLASSES } from './ui';

const ITEM_ICONS: Record<HandItem['id'], React.ReactNode> = {
  claims: <Receipt className="w-5 h-5" />,
  dueSubscriptions: <AlarmClock className="w-5 h-5" />,
  apis: <KeyRound className="w-5 h-5" />,
  support: <LifeBuoy className="w-5 h-5" />,
};

const CHECK_NAMES: Record<HandItem['id'], string> = {
  claims: 'payment approvals',
  dueSubscriptions: 'subscription expiries',
  apis: 'API health',
  support: 'the support inbox',
};

interface NeedsAttentionProps {
  role: PlatformRole | null;
  facts: ConsoleFacts;
  loadedAt: number | null;
  loading: boolean;
  onRefresh: () => void;
  onNavigate: (tab: string) => void;
}

export const NeedsAttention: React.FC<NeedsAttentionProps> = ({
  role,
  facts,
  loadedAt,
  loading,
  onRefresh,
  onNavigate,
}) => {
  if (!role) return null;
  const items = buildHandItems(role, facts);
  const { applicable, loaded, complete } = handCompleteness(role, facts);

  // Nothing read at all → hide rather than show an empty promise.
  if (!loading && loaded.length === 0 && items.length === 0) return null;

  return (
    <GmCard className="mb-5">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h3 className="text-sm font-bold text-slate-200">🛠 Needs your hand</h3>
        <div className="flex items-center gap-2 shrink-0">
          {loadedAt && (
            <span className="text-[10px] text-slate-500">
              Checked{' '}
              {new Date(loadedAt).toLocaleTimeString(appLocale(), { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="p-2 min-w-[44px] min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center disabled:opacity-50"
            title="Re-check now"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && items.length === 0 && (
        <p className="text-xs text-slate-500 py-1">Checking approvals, expiries, APIs and support…</p>
      )}

      {items.length > 0 && (
        <div className="space-y-1.5">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.tab)}
              className="w-full flex items-center gap-3 px-3 py-2 min-h-[44px] rounded-xl text-left hover:bg-slate-800/80"
            >
              <span
                className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${GM_TONE_CLASSES[item.tone]}`}
              >
                {ITEM_ICONS[item.id]}
              </span>
              <span className="flex-1 min-w-0 text-sm text-slate-200">{item.label}</span>
              <GmBadge tone={item.tone}>{item.count}</GmBadge>
              <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {!loading && items.length === 0 && complete && (
        <p className="flex items-start gap-2 text-sm text-emerald-300 py-1">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Nothing needs your hand right now —{' '}
            {applicable.map((id) => CHECK_NAMES[id]).join(', ')} checked, all clear.
          </span>
        </p>
      )}

      {!loading && items.length === 0 && !complete && loaded.length > 0 && (
        <p className="text-xs text-slate-500 py-1">
          Some checks couldn’t load just now ({loaded.length} of {applicable.length} read) — open
          the desks to be sure, or tap refresh.
        </p>
      )}
    </GmCard>
  );
};

export default NeedsAttention;
