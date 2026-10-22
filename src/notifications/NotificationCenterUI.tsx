/**
 * NotificationCenterUI.tsx — the full-screen notification center.
 * ==============================================================
 * Follows the Chat.tsx full-screen overlay pattern (fixed inset-0,
 * warm-paper surface, colorScheme light — never inverted by OS dark mode).
 *
 * - Smart summary header: "3 things need your attention · 12 gentle
 *   updates in your digest" (trilingual).
 * - Critical items: persistent deep-red banner until acknowledged.
 * - Everything else: grouped expandable cards, chronological.
 * - Swipe-left (or the check button) marks a card read; tap deep-links
 *   via the `onOpenDeepLink` callback (parent owns navigation for now).
 * - Mark-all-read + Clear-read (read items only) in the footer.
 *
 * Pure presentational: all data arrives as props; Phase 1's
 * `useNotificationCenter` hook (see index.ts) wires it to Firestore.
 */

import React, { useMemo, useRef, useState } from 'react';
import {
  X,
  Settings,
  ChevronDown,
  Check,
  CheckCheck,
  Trash2,
  Siren,
  HandCoins,
  MessageCircle,
  Sunrise,
  Landmark,
  Sparkles,
} from 'lucide-react';
import { NT, pick, useNotifLang } from './NT';
import { whyLine } from './whyLine';
import {
  groupCenterItems,
  summarizeForHeader,
  timeAgo,
  FILTER_LABELS,
  type CenterFilter,
  type CenterGroup,
} from './uiTypes';
import type { NotificationItem, NotifyPriority, TriText } from './types';

/* ------------------------------------------------------------------ */

export interface NotificationCenterProps {
  items: NotificationItem[];
  onClose: () => void;
  onMarkRead: (itemId: string) => void;
  onMarkGroupRead: (group: CenterGroup) => void;
  onMarkAllRead: () => void;
  /** Deletes read items only — never unread. */
  onClearRead: () => void;
  /** Acknowledge a critical item (persistent banner). */
  onAcknowledge?: (itemId: string) => void;
  /** Deep-link: tap a money request → open the chat thread at the request card. */
  onOpenDeepLink?: (item: NotificationItem) => void;
  /** If provided, a gear opens the settings overlay. */
  onOpenSettings?: () => void;
  initialFilter?: CenterFilter;
}

const FILTERS: CenterFilter[] = ['all', 'money', 'chat', 'suchana', 'org', 'blessing'];

function CategoryIcon({ category, className = 'w-5 h-5' }: { category: CenterGroup['category']; className?: string }) {
  switch (category) {
    case 'money':
      return <HandCoins className={className} aria-hidden />;
    case 'chat':
      return <MessageCircle className={className} aria-hidden />;
    case 'suchana':
      return <Sunrise className={className} aria-hidden />;
    case 'org':
      return <Landmark className={className} aria-hidden />;
    case 'blessing':
      return <Sparkles className={className} aria-hidden />;
  }
}

const PRIORITY_DOT: Record<NotifyPriority, string> = {
  critical: 'bg-red-600',
  important: 'bg-amber-500',
  gentle: 'bg-stone-300',
  silent: 'bg-stone-200',
};

/* ---------------- smart summary line ---------------- */

const attentionText = (n: number): TriText => ({
  en: n === 1 ? '1 thing needs your attention' : `${n} things need your attention`,
  bn: n === 1 ? '১টি বিষয়ে আপনার মনোযোগ প্রয়োজন' : `${n}টি বিষয়ে আপনার মনোযোগ প্রয়োজন`,
  hi: n === 1 ? '1 बात पर आपका ध्यान चाहिए' : `${n} बातों पर आपका ध्यान चाहिए`,
});
const digestText = (n: number): TriText => ({
  en: n === 1 ? '1 gentle update in your digest' : `${n} gentle updates in your digest`,
  bn: n === 1 ? 'আপনার সূচনায় ১টি শান্ত আপডেট' : `আপনার সূচনায় ${n}টি শান্ত আপডেট`,
  hi: n === 1 ? 'आपकी सूचना में 1 सौम्य अपडेट' : `आपकी सूचना में ${n} सौम्य अपडेट`,
});

/* ---------------- swipe-to-read row ---------------- */

const SwipeRow: React.FC<{
  children: React.ReactNode;
  onTap: () => void;
  onMarkRead: () => void;
  read: boolean;
  label: string;
}> = ({ children, onTap, onMarkRead, read, label }) => {
  const [dx, setDx] = useState(0);
  const [open, setOpen] = useState(false);
  const startX = useRef<number | null>(null);
  const moved = useRef(false);

  const reveal = -88;
  const handleStart = (x: number) => {
    startX.current = x;
    moved.current = false;
  };
  const handleMove = (x: number) => {
    if (startX.current === null) return;
    const d = x - startX.current;
    if (Math.abs(d) > 6) moved.current = true;
    setDx(open ? reveal + Math.min(0, Math.max(-60, d)) : Math.min(0, Math.max(-120, d)));
  };
  const handleEnd = () => {
    if (startX.current === null) return;
    startX.current = null;
    if (dx < -48) {
      setOpen(true);
      setDx(reveal);
    } else {
      setOpen(false);
      setDx(0);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* revealed action */}
      <div className="absolute inset-y-0 right-0 w-[88px] flex items-stretch justify-end">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMarkRead();
            setOpen(false);
            setDx(0);
          }}
          aria-label={label}
          className="w-[88px] min-h-[44px] bg-emerald-700 text-emerald-50 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold"
        >
          <Check className="w-5 h-5" aria-hidden />
          <NT
            text={{ en: 'Read', bn: 'পড়া', hi: 'पढ़ा' }}
            className="text-[10px]"
          />
        </button>
      </div>
      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        onClick={() => {
          if (moved.current) {
            moved.current = false;
            return;
          }
          if (open) {
            setOpen(false);
            setDx(0);
            return;
          }
          onTap();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onTap();
          }
        }}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
        onMouseDown={(e) => handleStart(e.clientX)}
        onMouseMove={(e) => {
          if (startX.current !== null) handleMove(e.clientX);
        }}
        onMouseUp={handleEnd}
        onMouseLeave={() => {
          if (startX.current !== null) handleEnd();
        }}
        style={{ transform: `translateX(${dx}px)` }}
        className={`relative bg-white transition-transform duration-150 select-none ${
          read ? 'opacity-70' : ''
        }`}
      >
        {children}
      </div>
    </div>
  );
};

/* ---------------- group card ---------------- */

const GroupCard: React.FC<{
  group: CenterGroup;
  expanded: boolean;
  onToggle: () => void;
  onMarkRead: (id: string) => void;
  onMarkGroupRead: () => void;
  onOpenDeepLink?: (item: NotificationItem) => void;
}> = ({ group, expanded, onToggle, onMarkRead, onMarkGroupRead, onOpenDeepLink }) => {
  const lang = useNotifLang();
  const critical = group.priority === 'critical';
  const firstUnread = group.items.find((i) => !i.read) ?? group.items[0];

  return (
    <div
      className={`rounded-2xl border bg-white overflow-hidden transition-shadow ${
        critical
          ? 'border-red-300 shadow-md shadow-red-100'
          : group.unreadCount > 0
            ? 'border-amber-200 shadow-sm'
            : 'border-stone-200'
      }`}
    >
      {/* Card header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <span
          className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
            critical
              ? 'bg-red-50 text-red-700'
              : group.unreadCount > 0
                ? 'bg-amber-50 text-amber-700'
                : 'bg-stone-100 text-stone-500'
          }`}
        >
          {critical ? <Siren className="w-5 h-5" aria-hidden /> : <CategoryIcon category={group.category} />}
        </span>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex-1 min-w-0 text-left min-h-[44px] flex flex-col justify-center"
        >
          <span className={`text-sm font-bold truncate ${group.unreadCount > 0 ? 'text-stone-900' : 'text-stone-600'}`}>
            {pick(group.title, lang)}
          </span>
          <span className="text-xs text-stone-500">
            <NT text={timeAgo(group.latestCreatedAt)} />
            {group.unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5">
                <NT
                  text={{
                    en: `${group.unreadCount} new`,
                    bn: `${group.unreadCount}টি নতুন`,
                    hi: `${group.unreadCount} नए`,
                  }}
                />
              </span>
            )}
          </span>
        </button>
        <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOT[group.priority]}`} aria-hidden />
        <button
          type="button"
          onClick={onToggle}
          aria-label={pick(
            { en: expanded ? 'Collapse' : 'Expand', bn: expanded ? 'সংকুচিত' : 'বিস্তারিত', hi: expanded ? 'सिकोड़ें' : 'विस्तार' },
            lang
          )}
          className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-500"
        >
          <ChevronDown className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden />
        </button>
      </div>

      {/* Expanded items */}
      {expanded && (
        <div className="border-t border-stone-100 divide-y divide-stone-100">
          {group.items.map((item) => (
            <SwipeRow
              key={item.id}
              read={item.read}
              onTap={() => onOpenDeepLink?.(item)}
              onMarkRead={() => onMarkRead(item.id)}
              label={pick(
                {
                  en: `${item.read ? '' : 'Unread: '}${pick(item.title, lang)}`,
                  bn: `${item.read ? '' : 'অপঠিত: '}${pick(item.title, lang)}`,
                  hi: `${item.read ? '' : 'अपठित: '}${pick(item.title, lang)}`,
                },
                lang
              )}
            >
              <div className="px-4 py-3 pl-14">
                <p className={`text-sm ${item.read ? 'text-stone-500' : 'text-stone-800'} leading-snug`}>
                  <NT text={item.body} />
                </p>
                <div className="mt-1.5 flex items-center gap-2 text-xs text-stone-400">
                  <NT text={timeAgo(item.createdAt)} />
                  {!item.read && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden />}
                  {item.quietHold && (
                    <span className="italic">
                      <NT
                        text={{
                          en: 'held for quiet hours',
                          bn: 'শান্ত সময়ের জন্য স্থগিত',
                          hi: 'शांत समय हेतु रोका गया',
                        }}
                      />
                    </span>
                  )}
                </div>
                {/* Blueprint D — "Why am I seeing this?": every card
                    names its category and the control that allowed
                    it, derived from the item's own stored decision. */}
                <p className="mt-1 text-[11px] leading-snug text-stone-400">
                  <span className="font-bold">
                    <NT
                      text={{
                        en: 'Why am I seeing this? ',
                        bn: 'আমি এটি কেন দেখছি? ',
                        hi: 'मैं यह क्यों देख रहा हूँ? ',
                      }}
                    />
                  </span>
                  <NT text={whyLine(item)} />
                </p>
              </div>
            </SwipeRow>
          ))}
          {group.unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkGroupRead}
              className="w-full min-h-[44px] py-2.5 text-xs font-bold text-amber-800 hover:bg-amber-50 flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" aria-hidden />
              <NT
                text={{
                  en: 'Mark this thread read',
                  bn: 'এই থ্রেড পড়া হিসেবে চিহ্নিত করুন',
                  hi: 'इस थ्रेड को पढ़ा मानें',
                }}
              />
            </button>
          )}
        </div>
      )}

      {/* Collapsed preview: first unread body line */}
      {!expanded && group.unreadCount > 0 && (
        <button type="button" onClick={onToggle} className="w-full text-left px-4 pb-3 pl-14 -mt-1">
          <p className="text-[13px] text-stone-500 leading-snug line-clamp-2">
            <NT text={firstUnread.body} />
          </p>
        </button>
      )}
    </div>
  );
};

/* ---------------- the center ---------------- */

export const NotificationCenterUI: React.FC<NotificationCenterProps> = ({
  items,
  onClose,
  onMarkRead,
  onMarkGroupRead,
  onMarkAllRead,
  onClearRead,
  onAcknowledge,
  onOpenDeepLink,
  onOpenSettings,
  initialFilter = 'all',
}) => {
  const lang = useNotifLang();
  const [filter, setFilter] = useState<CenterFilter>(initialFilter);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const summary = useMemo(() => summarizeForHeader(items), [items]);
  const groups = useMemo(() => groupCenterItems(items), [items]);

  const criticalItems = useMemo(
    () => items.filter((i) => i.priority === 'critical' && !i.read && !i.acknowledged),
    [items]
  );
  // Items shown in the persistent critical banner are NOT repeated as cards.
  const bannerIds = useMemo(() => new Set(criticalItems.map((i) => i.id)), [criticalItems]);
  const visibleGroups = useMemo(
    () =>
      groups.filter((g) => {
        if (g.items.every((i) => bannerIds.has(i.id))) return false; // already in the banner
        if (filter === 'all') return true;
        return g.category === filter;
      }),
    [groups, filter, bannerIds]
  );
  const hasRead = items.some((i) => i.read);
  const unreadTotal = items.filter((i) => !i.read).length;

  const summaryLine: TriText =
    summary.attention > 0 && summary.digest > 0
      ? {
          en: `${pick(attentionText(summary.attention), 'en')} · ${pick(digestText(summary.digest), 'en')}`,
          bn: `${pick(attentionText(summary.attention), 'bn')} · ${pick(digestText(summary.digest), 'bn')}`,
          hi: `${pick(attentionText(summary.attention), 'hi')} · ${pick(digestText(summary.digest), 'hi')}`,
        }
      : summary.attention > 0
        ? attentionText(summary.attention)
        : summary.digest > 0
          ? digestText(summary.digest)
          : {
              en: unreadTotal === 0 ? 'All is calm. Nothing needs you right now.' : 'Nothing urgent — browse at your ease.',
              bn: unreadTotal === 0 ? 'সব শান্ত। এখন আপনার কিছুই দরকার নেই।' : 'জরুরি কিছু নেই — নিজের গতিতে দেখুন।',
              hi: unreadTotal === 0 ? 'सब शांत है। अभी आपको कुछ नहीं चाहिए।' : 'कुछ आवश्यक नहीं — आराम से देखें।',
            };

  return (
    <div
      className="fixed inset-0 z-[110] bg-stone-950/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
      role="dialog"
      aria-label={pick({ en: 'Notification centre', bn: 'বিজ্ঞপ্তি কেন্দ্র', hi: 'सूचना केंद्र' }, lang)}
      style={{ colorScheme: 'light' }}
    >
      <div className="bg-[#faf7f2] w-full sm:max-w-xl h-[100dvh] sm:h-[88vh] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 bg-gradient-to-br from-amber-800 via-orange-700 to-amber-800 text-amber-50 px-4 pt-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="font-serif text-xl font-bold leading-tight">
                <NT text={{ en: 'Notification Centre', bn: 'বিজ্ঞপ্তি কেন্দ্র', hi: 'सूचना केंद्र' }} />
              </h2>
              <p className="text-[12px] text-amber-200/90 mt-0.5 leading-snug">
                <NT text={summaryLine} />
              </p>
            </div>
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                aria-label={pick({ en: 'Notification settings', bn: 'বিজ্ঞপ্তি সেটিংস', hi: 'सूचना सेटिंग' }, lang)}
                className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
              >
                <Settings className="w-5 h-5" aria-hidden />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label={pick({ en: 'Close notifications', bn: 'বিজ্ঞপ্তি বন্ধ করুন', hi: 'सूचनाएं बंद करें' }, lang)}
              className="w-11 h-11 min-h-[44px] min-w-[44px] rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" aria-hidden />
            </button>
          </div>

          {/* Filter chips */}
          <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar -mx-4 px-4" role="tablist" aria-label={pick({ en: 'Filter', bn: 'ফিল্টার', hi: 'फ़िल्टर' }, lang)}>
            {FILTERS.map((f) => {
              const active = filter === f;
              return (
                <button
                  key={f}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(f)}
                  className={`shrink-0 min-h-[44px] px-4 rounded-full text-[13px] font-bold transition-colors ${
                    active ? 'bg-amber-50 text-amber-900 shadow' : 'bg-white/15 text-amber-100 hover:bg-white/25'
                  }`}
                >
                  <NT text={FILTER_LABELS[f]} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Critical banner — persistent until acknowledged */}
        {criticalItems.length > 0 && (
          <div className="shrink-0 px-4 pt-3 space-y-2">
            {criticalItems.map((item) => (
              <div
                key={item.id}
                role="alert"
                className="rounded-2xl bg-red-700 text-red-50 p-4 shadow-lg shadow-red-900/20 border border-red-600"
              >
                <div className="flex items-start gap-3">
                  <span className="shrink-0 w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
                    <Siren className="w-5 h-5" aria-hidden />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-serif font-bold text-[15px] leading-tight">
                      <NT text={item.title} />
                    </p>
                    <p className="text-[13px] text-red-100/90 mt-1 leading-snug">
                      <NT text={item.body} />
                    </p>
                    <div className="flex gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => onOpenDeepLink?.(item)}
                        className="min-h-[44px] px-4 rounded-xl bg-white text-red-800 text-sm font-bold"
                      >
                        <NT text={{ en: 'Open now', bn: 'এখনই খুলুন', hi: 'अभी खोलें' }} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onAcknowledge?.(item.id)}
                        className="min-h-[44px] px-4 rounded-xl bg-white/15 hover:bg-white/25 text-sm font-bold border border-white/25"
                      >
                        <NT text={{ en: 'I’ve seen this', bn: 'আমি দেখেছি', hi: 'मैंने देख लिया' }} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Body: grouped cards */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-2.5 custom-scrollbar">
          {visibleGroups.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-16">
              <span className="text-5xl" aria-hidden>
                🪔
              </span>
              <p className="font-serif text-lg font-bold text-stone-700 mt-4">
                <NT text={{ en: 'All is calm', bn: 'সব শান্ত', hi: 'सब शांत' }} />
              </p>
              <p className="text-sm text-stone-500 mt-1 max-w-[240px]">
                <NT
                  text={{
                    en: 'No new suchanas here. Breathe easy.',
                    bn: 'এখানে কোনো নতুন সূচনা নেই। নির্ভারে থাকুন।',
                    hi: 'यहाँ कोई नई सूचना नहीं। निश्चिंत रहें।',
                  }}
                />
              </p>
            </div>
          ) : (
            visibleGroups.map((g) => (
              <GroupCard
                key={g.key}
                group={g}
                expanded={expandedKey === g.key}
                onToggle={() => setExpandedKey((k) => (k === g.key ? null : g.key))}
                onMarkRead={onMarkRead}
                onMarkGroupRead={() => onMarkGroupRead(g)}
                onOpenDeepLink={onOpenDeepLink}
              />
            ))
          )}
        </div>

        {/* Footer actions */}
        <div className="shrink-0 bg-white border-t border-stone-200 px-4 py-2.5 flex items-center gap-2">
          <button
            type="button"
            onClick={onMarkAllRead}
            disabled={unreadTotal === 0}
            className="flex-1 min-h-[44px] rounded-xl bg-amber-700 hover:bg-amber-800 disabled:opacity-40 disabled:hover:bg-amber-700 text-amber-50 text-sm font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <CheckCheck className="w-4 h-4" aria-hidden />
            <NT text={{ en: 'Mark all read', bn: 'সব পড়া চিহ্নিত', hi: 'सभी को पढ़ा मानें' }} />
          </button>
          <button
            type="button"
            onClick={onClearRead}
            disabled={!hasRead}
            className="flex-1 min-h-[44px] rounded-xl bg-white hover:bg-stone-50 disabled:opacity-40 text-stone-600 border border-stone-200 text-sm font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-4 h-4" aria-hidden />
            <NT text={{ en: 'Clear read', bn: 'পড়া মুছুন', hi: 'पढ़े हटाएं' }} />
          </button>
        </div>
      </div>
    </div>
  );
};
