/**
 * PersonalWallet.tsx — the private P2P obligation ledger.
 * =======================================================
 * Each user sees ONLY their own requests (queries are uid-bound, and the
 * server rules deny anything else). Coordination layer, NOT custody: this
 * tracks who owes whom; money moves on bKash/Nagad/UPI outside the app.
 *
 * Entry point: the "My Wallet" card on Solo Home. NOT an AppShell tab.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { T, useLocaleText } from '../solo/ui';
import { GUIDES, useGuide, TourPill, TourLink, CoachMark } from '../components/guide';
import {
  MoneyRequest,
  requestStatusLabel,
  formatMoney,
} from './types';
import { REQUEST_STATUS_PILL } from './MoneyRequestCard';
import { VerifiedPill } from './ChatList';
import { WalletEntriesSkeleton } from './ChatSkeletons';
import {
  LedgerEntry,
  NettingSuggestion,
  deriveWalletEntries,
  summarizeWallet,
  suggestNetting,
  filterEntries,
  EntryFilter,
  timeAgo,
  fetchMyMoneyRequests,
  acceptMoneyRequest,
  declineMoneyRequest,
  cancelMoneyRequest,
  markMoneyRequestPaid,
  confirmMoneyRequestSettled,
  getPlatformWalletBalance,
  payMoneyRequestFromPlatformWallet,
  PlatformBalance,
} from '../lib/p2pLedger';

type TabId = 'all' | 'owed_to_me' | 'i_owe' | 'pending' | 'history';

const RAILS: Array<{ id: NonNullable<MoneyRequest['paidVia']>; en: string; bn: string; hi: string; icon: string }> = [
  { id: 'bkash', en: 'bKash', bn: 'বিকাশ', hi: 'बिकाश', icon: '📱' },
  { id: 'nagad', en: 'Nagad', bn: 'নগদ', hi: 'नगद', icon: '📲' },
  { id: 'upi', en: 'UPI', bn: 'ইউপিআই', hi: 'यूपीआई', icon: '💳' },
  { id: 'bank', en: 'Bank transfer', bn: 'ব্যাংক ট্রান্সফার', hi: 'बैंक ट्रांसफर', icon: '🏦' },
  { id: 'cash', en: 'Cash', bn: 'নগদ', hi: 'नकद', icon: '💵' },
  { id: 'other', en: 'Other', bn: 'অন্যান্য', hi: 'अन्य', icon: '🧾' },
];

const STATUS_PILL = REQUEST_STATUS_PILL;

export interface PersonalWalletProps {
  uid: string;
  isOpen: boolean;
  onClose: () => void;
  /** Open the chat thread holding this request (wired by the parent when chat ships). */
  onOpenChat?: (chatId: string, requestId: string) => void;
}

export const PersonalWallet: React.FC<PersonalWalletProps> = ({ uid, isOpen, onClose, onOpenChat }) => {
  const { lang } = useLocaleText();
  const L: 'en' | 'bn' | 'hi' = lang === 'bn' ? 'bn' : lang === 'hi' ? 'hi' : 'en';

  const [requests, setRequests] = useState<MoneyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [person, setPerson] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [settleEntry, setSettleEntry] = useState<LedgerEntry | null>(null);
  const [rail, setRail] = useState<NonNullable<MoneyRequest['paidVia']>>('bkash');
  // Quick Guide: the honest-claim P2P pattern — invitational, never
  // auto-playing on this money screen.
  const p2pGuide = useGuide('p2p', uid);
  const [paidRef, setPaidRef] = useState('');
  const [acting, setActing] = useState<string | null>(null);
  const [platform, setPlatform] = useState<PlatformBalance | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('p2p-netting-dismissed') || '[]'));
    } catch {
      return new Set();
    }
  });

  const refresh = useCallback(async () => {
    if (!uid || uid === 'anon') {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [reqs, bal] = await Promise.all([
        fetchMyMoneyRequests(uid),
        getPlatformWalletBalance(uid),
      ]);
      setRequests(reqs);
      setPlatform(bal);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load wallet');
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    if (isOpen) void refresh();
  }, [isOpen, refresh]);

  const entries = useMemo(() => deriveWalletEntries(requests, uid), [requests, uid]);
  const summary = useMemo(() => summarizeWallet(uid, entries), [uid, entries]);
  const netting = useMemo(
    () => suggestNetting(entries).filter((s) => !dismissed.has(s.id)),
    [entries, dismissed],
  );

  const people = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of entries) if (!m.has(e.counterpartyId)) m.set(e.counterpartyId, e.counterpartyName);
    return [...m.entries()];
  }, [entries]);

  const filter: EntryFilter = useMemo(
    () => ({
      person: person || undefined,
      status:
        tab === 'all'
          ? 'all'
          : tab === 'owed_to_me'
            ? 'all'
            : tab === 'i_owe'
              ? 'all'
              : tab === 'pending'
                ? 'active'
                : 'history',
      dateRange:
        fromDate || toDate
          ? {
              from: fromDate ? new Date(fromDate).getTime() : undefined,
              to: toDate ? new Date(toDate).getTime() + 86399999 : undefined,
            }
          : undefined,
    }),
    [person, tab, fromDate, toDate],
  );

  const visible = useMemo(() => {
    let list = filterEntries(entries, filter);
    if (tab === 'owed_to_me') list = list.filter((e) => e.direction === 'owed_to_me');
    if (tab === 'i_owe') list = list.filter((e) => e.direction === 'i_owe');
    return list;
  }, [entries, filter, tab]);

  const dismissSuggestion = (s: NettingSuggestion) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(s.id);
      try {
        localStorage.setItem('p2p-netting-dismissed', JSON.stringify([...next]));
      } catch {
        /* private mode */
      }
      return next;
    });
  };

  const act = async (id: string, fn: () => Promise<void>) => {
    setActing(id);
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActing(null);
    }
  };

  const openChat = (chatId: string, requestId: string) => {
    if (onOpenChat) onOpenChat(chatId, requestId);
    window.dispatchEvent(new CustomEvent('sanatani:open-chat', { detail: { chatId, requestId } }));
  };

  const requestById = (id: string) => requests.find((r) => r.id === id);

  if (!isOpen) return null;

  const tabs: Array<{ id: TabId; en: string; bn: string; hi: string; count: number }> = [
    { id: 'all', en: 'All', bn: 'সব', hi: 'सभी', count: entries.length },
    {
      id: 'owed_to_me',
      en: 'Owed to me',
      bn: 'পাবো',
      hi: 'मुझे मिलेगा',
      count: entries.filter((e) => e.direction === 'owed_to_me').length,
    },
    {
      id: 'i_owe',
      en: 'I owe',
      bn: 'দেবো',
      hi: 'मुझे देना है',
      count: entries.filter((e) => e.direction === 'i_owe').length,
    },
    {
      id: 'pending',
      en: 'Pending',
      bn: 'অপেক্ষমাণ',
      hi: 'लंबित',
      count: summary.activeCount,
    },
    { id: 'history', en: 'History', bn: 'ইতিহাস', hi: 'इतिहास', count: summary.historyCount },
  ];

  const net = summary.totalOwedToMe - summary.totalIOwe;

  return (
    <div className="fixed inset-0 z-[120] bg-stone-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="bg-stone-50 w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-700 to-emerald-800 text-white px-5 pt-5 pb-4 shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-emerald-200/80">
                <T en="Private — only you can see this" bn="ব্যক্তিগত — শুধু আপনি দেখতে পাবেন" hi="निजी — केवल आप देख सकते हैं" />
              </div>
              <h2 className="text-xl font-extrabold mt-1">
                <T en="My Wallet" bn="আমার ওয়ালেট" hi="मेरा वॉलेट" />
              </h2>
            </div>
            <div className="flex items-center gap-1">
              <TourLink guide={GUIDES.p2p} onRestart={p2pGuide.restart} className="!text-emerald-100 hover:!text-white" />
              <button
                onClick={onClose}
                className="p-2 text-emerald-100/70 hover:text-white rounded-full min-h-[44px] min-w-[44px]"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="rounded-2xl bg-white/10 p-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-200">
                <T en="Owed to me" bn="পাবো" hi="मुझे मिलेगा" />
              </div>
              <div className="text-2xl font-extrabold text-emerald-300 mt-1">
                {formatMoney(summary.totalOwedToMe, summary.currency)}
              </div>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-200">
                <T en="I owe" bn="দেবো" hi="मुझे देना है" />
              </div>
              <div className="text-2xl font-extrabold text-amber-300 mt-1">
                {formatMoney(summary.totalIOwe, summary.currency)}
              </div>
            </div>
          </div>
          <div className="mt-2 text-xs text-emerald-100/80">
            <T en="Net position" bn="নিট অবস্থা" hi="शुद्ध स्थिति" />:{' '}
            <span className={net >= 0 ? 'text-emerald-300 font-bold' : 'text-amber-300 font-bold'}>
              {formatMoney(net, summary.currency)}
            </span>
            {summary.pendingSent + summary.pendingReceived > 0 && (
              <span className="ml-2">
                · <T en="awaiting response" bn="উত্তরের অপেক্ষায়" hi="उत्तर की प्रतीक्षा" />: {summary.pendingSent + summary.pendingReceived}
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-3 overflow-x-auto shrink-0" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 rounded-full text-xs font-bold whitespace-nowrap min-h-[44px] ${
                tab === t.id ? 'bg-emerald-700 text-white' : 'bg-white text-stone-600 border border-stone-200'
              }`}
            >
              <T en={t.en} bn={t.bn} hi={t.hi} /> · {t.count}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" data-guide-anchor="p2p-requests">
          {error && (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
          )}

          {/* Netting suggestions */}
          {netting.map((s) => (
            <div key={s.id} className="rounded-2xl bg-amber-50 border border-amber-200 p-3 flex gap-2">
              <div className="text-xl shrink-0" aria-hidden>
                🔀
              </div>
              <div className="flex-1 text-sm text-stone-800">
                <div className="font-bold text-amber-800 text-xs uppercase tracking-wider mb-1">
                  <T en="Netting idea" bn="নেটিং ধারণা" hi="नेटिंग सुझाव" />
                </div>
                <p>{s.text[L]}</p>
              </div>
              <button
                onClick={() => dismissSuggestion(s)}
                className="self-start p-2 text-stone-400 hover:text-stone-600 min-h-[44px] min-w-[44px]"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          ))}

          {/* Filters */}
          <div>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="text-xs font-bold text-stone-500 min-h-[44px] px-2"
              aria-expanded={showFilters}
            >
              {showFilters ? '▾' : '▸'} <T en="Filters" bn="ফিল্টার" hi="फ़िल्टर" />
            </button>
            {showFilters && (
              <div className="grid grid-cols-2 gap-2 mt-1">
                <select
                  value={person}
                  onChange={(e) => setPerson(e.target.value)}
                  className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm min-h-[44px]"
                  aria-label="Filter by person"
                >
                  <option value="">
                    {L === 'bn' ? 'সবাই' : L === 'hi' ? 'सभी' : 'Everyone'}
                  </option>
                  {people.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="rounded-xl border border-stone-200 bg-white px-2 py-2 text-sm min-h-[44px] w-full"
                    aria-label="From date"
                  />
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="rounded-xl border border-stone-200 bg-white px-2 py-2 text-sm min-h-[44px] w-full"
                    aria-label="To date"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Entries */}
          {loading ? (
            <WalletEntriesSkeleton rows={4} />
          ) : visible.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3" aria-hidden>
                🪔
              </div>
              <p className="font-extrabold text-stone-800">
                <T en="All settled 🪔 — no pending obligations" bn="সব মিটে গেছে 🪔 — কোনো বাকি নেই" hi="सब निपट गया 🪔 — कोई बकाया नहीं" />
              </p>
              <p className="text-sm text-stone-500 mt-1">
                <T
                  en="When you agree a payment in chat, it appears here."
                  bn="চ্যাটে কোনো পেমেন্টে সম্মত হলে তা এখানে দেখা যাবে।"
                  hi="चैट में भुगतान पर सहमति होते ही वह यहाँ दिखेगा।"
                />
              </p>
            </div>
          ) : (
            visible.map((e) => (
              <EntryRow
                key={e.requestId}
                entry={e}
                L={L}
                acting={acting === e.requestId}
                onOpenChat={() => e.chatId && openChat(e.chatId, e.requestId)}
                onAccept={() => act(e.requestId, () => acceptMoneyRequest(e.requestId))}
                onDecline={() => act(e.requestId, () => declineMoneyRequest(e.requestId))}
                onCancel={() => act(e.requestId, () => cancelMoneyRequest(e.requestId))}
                onMarkPaid={() => {
                  setSettleEntry(e);
                  setRail('bkash');
                  setPaidRef('');
                }}
                onConfirmReceived={() => act(e.requestId, () => confirmMoneyRequestSettled(e.requestId))}
              />
            ))
          )}
        </div>

        {/* Settle sheet */}
        {settleEntry && (
          <SettleSheet
            entry={settleEntry}
            L={L}
            rail={rail}
            setRail={setRail}
            paidRef={paidRef}
            setPaidRef={setPaidRef}
            platform={platform}
            busy={acting === settleEntry.requestId}
            onClose={() => setSettleEntry(null)}
            onPaidViaRail={() => {
              const id = settleEntry.requestId;
              if (!paidRef.trim()) return; // button is disabled too; never confirm without a reference
              void act(id, () => markMoneyRequestPaid(id, rail, paidRef.trim())).then(() =>
                setSettleEntry(null),
              );
            }}
            onPaidViaPlatform={() => {
              const id = settleEntry.requestId;
              const r = requestById(id);
              if (!r) return;
              // Keep the settle sheet open on failure so the devotee can
              // read the loud error (e.g. insufficient balance), top up,
              // and retry — close it only when the debit actually commits.
              setActing(id);
              payMoneyRequestFromPlatformWallet(uid, r)
                .then(() => {
                  setSettleEntry(null);
                  return refresh();
                })
                .catch((e: unknown) => {
                  setError(
                    e instanceof Error ? e.message : 'Seva Wallet settlement failed. Please try again.',
                  );
                })
                .finally(() => setActing(null));
            }}
          />
        )}
      </div>

      {/* Quick Guide: the honest-claim P2P pattern — invitational only. */}
      {p2pGuide.pillVisible && (
        <TourPill guide={GUIDES.p2p} uid={uid} onStart={p2pGuide.start} onDismiss={p2pGuide.dismissPill} />
      )}
      {p2pGuide.tourActive && <CoachMark guide={GUIDES.p2p} onFinish={p2pGuide.finish} />}
    </div>
  );
};

// ---------------------------------------------------------------------------

const EntryRow: React.FC<{
  entry: LedgerEntry;
  L: 'en' | 'bn' | 'hi';
  acting: boolean;
  onOpenChat: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
  onMarkPaid: () => void;
  onConfirmReceived: () => void;
}> = ({ entry: e, L, acting, onOpenChat, onAccept, onDecline, onCancel, onMarkPaid, onConfirmReceived }) => {
  const initial = (e.counterpartyName || '?').trim().charAt(0).toUpperCase();
  return (
    <div className="rounded-2xl bg-white border border-stone-200 p-3 shadow-sm">
      <button onClick={onOpenChat} className="w-full text-left flex gap-3 items-start min-h-[44px]">
        {e.counterpartyPhotoUrl ? (
          <img src={e.counterpartyPhotoUrl} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-lg shrink-0">
            {initial}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="font-bold text-stone-900 text-sm truncate">{e.counterpartyName}</span>
            {e.orgCounterparty && <VerifiedPill compact />}
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_PILL[e.status]}`}
            >
              {requestStatusLabel(e.status, L)}
            </span>
          </div>
          {e.note && <p className="text-xs text-stone-500 truncate mt-0.5">{e.note}</p>}
          <p className="text-[11px] text-stone-400 mt-0.5">
            {timeAgo(e.updatedAt, L)}
            {e.trusteeName && (
              <span>
                {' '}
                · <T en="via" bn="মাধ্যমে" hi="द्वारा" /> {e.trusteeName}
              </span>
            )}
          </p>
        </div>
        <div className="text-right shrink-0 max-w-[45%]">
          <div className={`font-extrabold break-words ${e.direction === 'owed_to_me' ? 'text-emerald-700' : 'text-amber-700'}`}>
            {e.direction === 'owed_to_me' ? '+' : '−'}
            {formatMoney(e.amount, e.currency)}
          </div>
          <div className="text-[10px] text-stone-400 font-semibold">
            {e.direction === 'owed_to_me' ? (
              <T en="owed to me" bn="পাবো" hi="मिलेगा" />
            ) : (
              <T en="I owe" bn="দেবো" hi="देना है" />
            )}
          </div>
        </div>
      </button>

      {/* Actions */}
      <div className="flex gap-2 mt-2 flex-wrap">
        {e.status === 'pending' && !e.iAmPayer && (
          <>
            <button
              onClick={onAccept}
              disabled={acting}
              className="flex-1 rounded-xl bg-emerald-700 text-white text-sm font-bold py-2.5 min-h-[44px] disabled:opacity-50"
            >
              <T en="Accept" bn="গ্রহণ" hi="स्वीकार" />
            </button>
            <button
              onClick={onDecline}
              disabled={acting}
              className="flex-1 rounded-xl border border-stone-300 text-stone-700 text-sm font-bold py-2.5 min-h-[44px] disabled:opacity-50"
            >
              <T en="Decline" bn="প্রত্যাখ্যান" hi="अस्वीकार" />
            </button>
          </>
        )}
        {e.status === 'pending' && e.iAmPayer && (
          <button
            onClick={onCancel}
            disabled={acting}
            className="rounded-xl border border-stone-300 text-stone-600 text-sm font-bold px-4 py-2.5 min-h-[44px] disabled:opacity-50"
          >
            <T en="Cancel request" bn="অনুরোধ বাতিল" hi="अनुरोध रद्द करें" />
          </button>
        )}
        {e.status === 'accepted' && e.iAmPayer && (
          <button
            onClick={onMarkPaid}
            disabled={acting}
            className="flex-1 rounded-xl bg-amber-600 text-white text-sm font-bold py-2.5 min-h-[44px] disabled:opacity-50"
          >
            <T en="Mark as paid" bn="পরিশোধিত চিহ্নিত করুন" hi="भुगतान किया चिह्नित करें" />
          </button>
        )}
        {e.status === 'paid' && !e.iAmPayer && (
          <button
            onClick={onConfirmReceived}
            disabled={acting}
            className="flex-1 rounded-xl bg-emerald-700 text-white text-sm font-bold py-2.5 min-h-[44px] disabled:opacity-50"
          >
            <T en="Confirm received" bn="প্রাপ্তি নিশ্চিত করুন" hi="प्राप्ति की पुष्टि करें" />
          </button>
        )}
        {e.status === 'paid' && e.iAmPayer && (
          <span className="text-xs text-stone-500 italic py-2">
            <T
              en="Waiting for confirmation…"
              bn="নিশ্চিতকরণের অপেক্ষায়…"
              hi="पुष्टि की प्रतीक्षा…"
            />
          </span>
        )}
        {acting && <span className="text-xs text-stone-400 py-2">…</span>}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------

const SettleSheet: React.FC<{
  entry: LedgerEntry;
  L: 'en' | 'bn' | 'hi';
  rail: NonNullable<MoneyRequest['paidVia']>;
  setRail: (r: NonNullable<MoneyRequest['paidVia']>) => void;
  paidRef: string;
  setPaidRef: (s: string) => void;
  platform: PlatformBalance | null;
  busy: boolean;
  onClose: () => void;
  onPaidViaRail: () => void;
  onPaidViaPlatform: () => void;
}> = ({ entry, L, rail, setRail, paidRef, setPaidRef, platform, busy, onClose, onPaidViaRail, onPaidViaPlatform }) => {
  const platformEligible =
    platform != null && platform.balance >= entry.amount && platform.currency === entry.currency;
  // The chat path (p2pService.markPaid) refuses an empty reference — the
  // wallet path must hold the same line: a payment without a TrxID/UPI
  // reference can't be trusted by the other side.
  const refMissing = !paidRef.trim();
  return (
    <div className="absolute inset-0 z-[130] bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-extrabold text-stone-900">
            <T en="Mark as paid" bn="পরিশোধিত চিহ্নিত করুন" hi="भुगतान चिह्नित करें" />
          </h3>
          <button onClick={onClose} className="p-2 text-stone-400 min-h-[44px] min-w-[44px]" aria-label="Close">
            ✕
          </button>
        </div>
        <p className="text-sm text-stone-600 mb-4">
          {formatMoney(entry.amount, entry.currency)} <T en="to" bn="প্রতি" hi="को" /> {entry.counterpartyName}
        </p>

        <div className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
          <T en="Payment rail" bn="পেমেন্ট মাধ্যম" hi="भुगतान माध्यम" />
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {RAILS.map((r) => (
            <button
              key={r.id}
              onClick={() => setRail(r.id)}
              className={`rounded-xl border p-2 text-center min-h-[56px] ${
                rail === r.id ? 'border-emerald-600 bg-emerald-50' : 'border-stone-200'
              }`}
              aria-pressed={rail === r.id}
            >
              <div className="text-xl">{r.icon}</div>
              <div className="text-[11px] font-bold text-stone-700">{L === 'bn' ? r.bn : L === 'hi' ? r.hi : r.en}</div>
            </button>
          ))}
        </div>

        <label className="text-xs font-bold uppercase tracking-wider text-stone-500" htmlFor="p2p-paid-ref" data-guide-anchor="p2p-reference">
          <T en="Transaction reference" bn="লেনদেন রেফারেন্স" hi="लेनदेन संदर्भ" />
        </label>
        <input
          id="p2p-paid-ref"
          value={paidRef}
          onChange={(e) => setPaidRef(e.target.value)}
          placeholder={L === 'bn' ? 'যেমন: TrxID 9HXK2M' : L === 'hi' ? 'जैसे: UPI रेफ 1234' : 'e.g. TrxID 9HXK2M'}
          className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm min-h-[44px] mb-1"
        />
        {refMissing ? (
          <p className="text-xs text-amber-700 mb-3">
            <T
              en="Please add your bKash TrxID / UPI reference above — it keeps the record honest for both sides. 🙏"
              bn="অনুগ্রহ করে উপরে আপনার বিকাশ TrxID / UPI রেফারেন্স যোগ করুন — এটি উভয় পক্ষের জন্য রেকর্ডটি নির্ভরযোগ্য রাখে। 🙏"
              hi="कृपया ऊपर अपना bKash TrxID / UPI संदर्भ जोड़ें — इससे दोनों पक्षों के लिए रिकॉर्ड विश्वसनीय रहता है। 🙏"
            />
          </p>
        ) : (
          <div className="mb-3" />
        )}

        <button
          onClick={onPaidViaRail}
          disabled={busy || refMissing}
          className="w-full rounded-2xl bg-emerald-700 text-white font-bold py-3 min-h-[48px] disabled:opacity-50"
        >
          <T en="Confirm — I paid" bn="নিশ্চিত — আমি পরিশোধ করেছি" hi="पुष्टि — मैंने भुगतान किया" />
        </button>

        {platformEligible && (
          <div className="mt-4 rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/50 p-3">
            <div className="text-xs font-extrabold text-indigo-800 uppercase tracking-wider mb-1">
              <T en="Platform rails" bn="প্ল্যাটফর্ম মাধ্যম" hi="प्लेटफ़ॉर्म माध्यम" />
            </div>
            <p className="text-xs text-stone-600 mb-2">
              <T
                en="Pay from your Seva Wallet balance. The amount is debited immediately in one atomic step — no queues, no waiting."
                bn="আপনার সেবা ওয়ালেট ব্যালেন্স থেকে পরিশোধ করুন। অর্থ এক ধাপে সাথে সাথে কেটে নেওয়া হয় — কোনো সারি বা অপেক্ষা নেই।"
                hi="अपने सेवा वॉलेट बैलेंस से भुगतान करें। राशि एक ही चरण में तुरंत डेबिट हो जाती है — कोई कतार नहीं, कोई प्रतीक्षा नहीं।"
              />
            </p>
            <button
              onClick={onPaidViaPlatform}
              disabled={busy}
              className="w-full rounded-2xl bg-indigo-700 text-white font-bold py-3 min-h-[48px] disabled:opacity-50"
            >
              <T en="Pay from Seva Wallet" bn="সেবা ওয়ালেট থেকে দিন" hi="सेवा वॉलेट से भुगतान करें" /> ·{' '}
              {formatMoney(entry.amount, entry.currency)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
