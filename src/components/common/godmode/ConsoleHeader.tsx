/**
 * ConsoleHeader — branded GodMode shell header (QUEUED #39).
 * ============================================================================
 * The owner asked for an ideal admin dashboard header: "on header add
 * our logo, name etc." So the header now carries the product identity —
 * AppLogo + the Sanatani Bandhan wordmark + the GodMode designation —
 * the signed-in identity chip (who am I, in which role), and a slim
 * status strip fed by useConsoleStatus:
 *
 *   ● Production · 🟢 APIs 6 working · 3 claims waiting · 2 subs past due
 *
 * Every strip chip reads REAL state and deep-links to its desk; a fact
 * that could not be read renders NOTHING (consoleChrome honesty laws).
 * Owner-only facts (APIs, claims, due subscriptions) are gated by the
 * same canAccessTab matrix as the tabs themselves — a delegated role
 * never sees those counts here either.
 *
 * Quick-jump (⌕) gives command speed across 22 desks: type to filter,
 * ↑/↓ + Enter on keyboard, ≥44px rows on touch. Hand items (things
 * awaiting the owner) are offered first.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlarmClock, ChevronRight, KeyRound, LogOut, Receipt, Search, LifeBuoy } from 'lucide-react';
import { AppLogo } from '../AppLogo';
import type { PlatformRole } from '../../../lib/platformAdminRoles';
import {
  filterJumpEntries,
  type ConsoleFacts,
  type ConsoleIdentity,
  type HandItem,
  type JumpEntry,
} from './consoleChrome';
import { GmBadge, GM_TONE_CLASSES } from './ui';

export interface ConsoleTabRef {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface ConsoleHeaderProps {
  unlocked: boolean;
  role: PlatformRole | null;
  identity: ConsoleIdentity | null;
  facts: ConsoleFacts;
  handItems: HandItem[];
  loadedAt: number | null;
  tabs: ConsoleTabRef[];
  onNavigate: (tab: string) => void;
  onSignOut: () => void;
  onClose: () => void;
}

const HAND_ICONS: Record<HandItem['id'], React.ReactNode> = {
  claims: <Receipt className="w-4 h-4" />,
  dueSubscriptions: <AlarmClock className="w-4 h-4" />,
  apis: <KeyRound className="w-4 h-4" />,
  support: <LifeBuoy className="w-4 h-4" />,
};

const HAND_SHORT: Record<HandItem['id'], (n: number) => string> = {
  claims: (n) => `${n} claim${n === 1 ? '' : 's'} waiting`,
  dueSubscriptions: (n) => `${n} sub${n === 1 ? '' : 's'} past due`,
  apis: (n) => `${n} API${n === 1 ? '' : 's'} need attention`,
  support: (n) => `${n} new support`,
};

export const ConsoleHeader: React.FC<ConsoleHeaderProps> = ({
  unlocked,
  role,
  identity,
  facts,
  handItems,
  loadedAt,
  tabs,
  onNavigate,
  onSignOut,
  onClose,
}) => {
  const [jumpOpen, setJumpOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const tabLabel = (id: string) => tabs.find((t) => t.id === id)?.label ?? id;

  const entries: JumpEntry[] = useMemo(() => {
    const hand: JumpEntry[] = handItems.map((item) => ({
      id: `hand-${item.id}`,
      kind: 'hand',
      label: item.label,
      hint: tabLabel(item.tab),
      keywords: item.tab,
    }));
    const desks: JumpEntry[] = tabs.map((t) => ({
      id: `tab-${t.id}`,
      kind: 'tab',
      label: t.label,
      hint: 'Desk',
      keywords: t.id,
    }));
    return [...hand, ...desks];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handItems, tabs]);

  const filtered = useMemo(() => filterJumpEntries(query, entries), [query, entries]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query, jumpOpen]);

  useEffect(() => {
    if (jumpOpen) inputRef.current?.focus();
  }, [jumpOpen]);

  const pick = (entry: JumpEntry | undefined) => {
    if (!entry) return;
    const tabId =
      entry.kind === 'hand'
        ? handItems.find((i) => `hand-${i.id}` === entry.id)?.tab
        : entry.id.replace(/^tab-/, '');
    if (tabId) onNavigate(tabId);
    setJumpOpen(false);
    setQuery('');
  };

  const onJumpKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(filtered[activeIdx]);
    } else if (e.key === 'Escape') {
      setJumpOpen(false);
    }
  };

  const apiSummary = facts.apis && facts.apis.rollup !== 'unknown' ? facts.apis : null;
  const stripItems = handItems.filter((i) => i.id !== 'apis');

  return (
    <div className="relative shrink-0 border-b border-saffron-500/30 bg-gradient-to-r from-slate-950 via-slate-900 to-saffron-950/70">
      {/* ------------------------------------------------ brand row */}
      <div className="px-4 sm:px-6 py-3 flex items-center gap-x-3 gap-y-2 flex-wrap">
        <AppLogo size="md" showText textVariant="light" subtitle="GodMode · Sovereign Console" />
        <GmBadge tone="saffron" mono>
          v3.0
        </GmBadge>

        <div className="ml-auto flex items-center gap-2 shrink-0">
          {unlocked && (
            <button
              type="button"
              onClick={() => setJumpOpen((o) => !o)}
              className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
              title="Jump to a desk (search)"
              aria-expanded={jumpOpen}
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">Jump to…</span>
            </button>
          )}
          {unlocked && identity && (
            <div
              className="flex items-center gap-2 pl-1 pr-2.5 py-1 min-h-[44px] rounded-xl bg-slate-800/70 border border-slate-700"
              title={identity.name}
            >
              <span className="w-8 h-8 rounded-full bg-saffron-500/25 border border-saffron-500/50 text-saffron-200 text-sm font-black flex items-center justify-center shrink-0">
                {identity.initial}
              </span>
              <span className="hidden md:flex flex-col leading-tight min-w-0">
                <span className="text-xs font-bold text-slate-100 truncate max-w-[150px]">
                  {identity.name}
                </span>
                {identity.roleLabel && (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-sky-300">
                    {identity.roleLabel}
                  </span>
                )}
              </span>
              <span className="md:hidden">
                <GmBadge tone="sky" mono>
                  {identity.roleLabel || role || ''}
                </GmBadge>
              </span>
            </div>
          )}
          {unlocked && (
            <button
              type="button"
              onClick={onSignOut}
              className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2.5 min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700"
          >
            Exit
          </button>
        </div>
      </div>

      {/* ------------------------------------------------ status strip */}
      {unlocked && (
        <div className="border-t border-slate-800/80 px-4 sm:px-6 py-2 flex items-center gap-2 overflow-x-auto">
          <span className="shrink-0 min-h-[44px] px-3 rounded-xl bg-slate-800/70 border border-slate-700 flex items-center gap-2 text-[11px] font-bold text-slate-200">
            <span className="relative flex w-2 h-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full w-2 h-2 bg-emerald-400" />
            </span>
            Production
          </span>

          {apiSummary && (
            <button
              type="button"
              onClick={() => onNavigate('apikeys')}
              className={`shrink-0 min-h-[44px] px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 ${GM_TONE_CLASSES[apiSummary.rollup === 'fail' ? 'red' : apiSummary.rollup === 'warn' ? 'amber' : 'emerald']}`}
              title="Open API Health"
            >
              <span aria-hidden>{apiSummary.light}</span>
              APIs · {apiSummary.okCount} working
              {apiSummary.problemCount > 0 && <> · {apiSummary.problemCount} failing</>}
              {apiSummary.problemCount === 0 && apiSummary.warnCount > 0 && (
                <> · {apiSummary.warnCount} near quota</>
              )}
              <ChevronRight className="w-3.5 h-3.5 opacity-70" />
            </button>
          )}

          {stripItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.tab)}
              className={`shrink-0 min-h-[44px] px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 ${GM_TONE_CLASSES[item.tone]}`}
              title={item.label}
            >
              {HAND_ICONS[item.id]}
              {HAND_SHORT[item.id](item.count)}
              <ChevronRight className="w-3.5 h-3.5 opacity-70" />
            </button>
          ))}

          {loadedAt && (
            <span className="ml-auto shrink-0 text-[10px] text-slate-500 pl-2">
              Checked{' '}
              {new Date(loadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      )}

      {/* ------------------------------------------------ quick jump */}
      {unlocked && jumpOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setJumpOpen(false)} />
          <div className="absolute left-2 right-2 sm:left-auto sm:right-4 top-full mt-1 sm:w-96 z-40 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2">
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-xl px-3">
              <Search className="w-4 h-4 text-slate-500 shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onJumpKeyDown}
                placeholder="Jump to a desk or pending work…"
                className="w-full bg-transparent py-3 min-h-[44px] text-sm text-slate-100 outline-none placeholder:text-slate-500"
              />
            </div>
            <div className="mt-2 max-h-80 overflow-y-auto space-y-0.5">
              {filtered.length === 0 && (
                <p className="px-3 py-3 text-xs text-slate-500">No desk matches “{query}”.</p>
              )}
              {filtered.map((entry, i) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => pick(entry)}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={`w-full flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-xl text-left text-sm ${
                    i === activeIdx
                      ? 'bg-saffron-500/15 text-saffron-200'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="flex-1 min-w-0 truncate">{entry.label}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 shrink-0">
                    {entry.hint}
                  </span>
                </button>
              ))}
            </div>
            <p className="px-3 pt-2 pb-1 text-[10px] text-slate-600">
              ↑↓ navigate · Enter opens · Esc closes
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default ConsoleHeader;
