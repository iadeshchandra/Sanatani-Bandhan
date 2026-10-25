import React, { useMemo, useState, useEffect } from 'react';
import { useSolo } from './SoloContext';
import { useSoloStore, todayISO } from './soloStore';
import { currentPeriod } from './receipts';
import { Card, Stat, T, useLocaleText } from './ui';
import { JoinUpgrade } from './JoinUpgrade';
import { AjkerSuchana } from './AjkerSuchana';
import { SuchanaFullModal } from '../components/suchana/SuchanaFullModal';
import { GuideCenter } from '../components/suchana/GuideCenter';
import { SuggestionCards } from './SuggestionCards';
import { PersonalWallet } from '../chat/PersonalWallet';
import P2PScanSheet from '../chat/P2PScanSheet';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { calculateDailyPanchang } from '../utils/panchang';
import { Chat } from '../chat/Chat';
import { useChatUnreadTotal } from '../chat/useChat';
import { useGroupUnreadTotal } from '../chat/groups/useGroups';
import { getWallet, fmtWallet, currencyForRegion, type WalletCurrency } from '../lib/wallet';
import { detectPayRegion, type PayRegion } from '../lib/geoDetect';
import { mkt, type MktLang } from '../lib/marketplaceCopy';
import { Eye, EyeOff, Plus, HandHeart, ScanLine, History } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { PanchangHeader } from '../components/common/PanchangHeader';
import { OfflineSevakStatus } from '../components/common/OfflineSevakStatus';
import { SoloUsualRow } from './SoloUsualRow';
import { openDanaSheet } from '../lib/danaSheet';
import {
  ChatFirstRunHint,
  RequestFirstRunWatcher,
  WalletFirstRunHint,
} from '../chat/ChatFirstRun';
import type { ChatParticipant } from '../chat/types';

/* SoloHome — the personal "My Space" dashboard.
 * =====================================================================
 * Greeting, today's tithi/panchang, sadhana-at-a-glance, upcoming
 * reminders, and the progressive-joining cards. Everything here is
 * person-scoped — no organisation data can appear by construction.
 */

/** One-time nudge: claim a spoken VDA alias. Shows only until the devotee
 *  claims an alias or dismisses it — never a nag. Deep-links to the
 *  VDA card on the Profile tab (#vda-alias). */
const VdaHomeNudge: React.FC<{ profile: { vdaAlias?: string } | null; goProfile: () => void }> = ({ profile, goProfile }) => {
  const { rt } = useLanguage();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try { return window.localStorage.getItem('sb-vda-nudge') === 'dismissed'; } catch { return false; }
  });
  if (dismissed || profile?.vdaAlias) return null;
  const dismiss = () => {
    try { window.localStorage.setItem('sb-vda-nudge', 'dismissed'); } catch { /* ignore */ }
    setDismissed(true);
  };
  return (
    <div className="rounded-2xl bg-gradient-to-br from-indigo-950 via-purple-950 to-indigo-900 text-indigo-50 p-4 flex items-center gap-3 shadow-sm">
      <div className="text-3xl shrink-0" aria-hidden>🪔</div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-extrabold">
          <T en="Claim your spoken ID" bn="আপনার কথ্য আইডি নিন" hi="अपनी कथ्य आईडी लें" />
        </div>
        <div className="text-[11px] text-indigo-200/80 mt-0.5">
          <T
            en={`Say it at any ${rt('temple')} counter — no numbers to remember.`}
            bn="যেকোনো মন্দির কাউন্টারে বলুন — নম্বর মনে রাখতে হবে না।"
            hi="किसी भी मंदिर काउंटर पर बोलें — नंबर याद रखने की ज़रूरत नहीं।"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={goProfile}
        className="shrink-0 min-h-[44px] px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 text-xs font-black transition-colors"
      >
        <T en="Claim →" bn="নিন →" hi="लें →" />
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 min-w-[44px] min-h-[44px] rounded-xl text-indigo-200/60 hover:text-indigo-100 text-lg"
      >
        ✕
      </button>
    </div>
  );
};

export const SoloHome: React.FC<{ goTab: (t: 'sadhana' | 'panchang' | 'panjika' | 'saved' | 'giving' | 'receipts' | 'profile' | 'marketplace' | 'sangam' | 'wallet' | 'samskara' | 'jyotish') => void }> = ({
  goTab,
}) => {
  const { profile } = useSolo();
  const { state } = useSoloStore();
  const { firebaseUser, activeWorkspace } = useAuthWorkspace();
  const uid = ((firebaseUser as { uid?: string } | null)?.uid || 'anon') as string;
  const { tr, lang } = useLocaleText();
  const { rt } = useLanguage();
  const L = (lang === 'bn' || lang === 'hi' ? lang : 'en') as MktLang;
  const [suchanaOpen, setSuchanaOpen] = useState(false);
  const [guidesOpen, setGuidesOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  // Deep-link target for the Messages overlay — set when the Personal Wallet
  // "chat" action fires (sanatani:open-chat via PersonalWallet onOpenChat).
  const [chatInitialId, setChatInitialId] = useState<string | null>(null);
  const unreadTotal =
    useChatUnreadTotal(uid === 'anon' ? null : uid) +
    useGroupUnreadTotal(uid === 'anon' ? null : uid);
  const selfInfo: ChatParticipant = {
    uid,
    displayName: profile?.displayName || tr('solo.sanatani', 'Sanatani', 'সনাতনী', 'सनातनी'),
    photoUrl: ((firebaseUser as { photoURL?: string } | null)?.photoURL as string) || undefined,
    sanataniId: profile?.id,
    verificationTier: profile?.verificationTier,
  };

  // VIBE B1: the canonical panchang today-line now renders inside the
  // PanchangHeader strip (same engine, same line — QUEUED #52's single
  // source is preserved; the header computes it from calculatePanchang).

  const today = todayISO();
  const japaToday = state.japa.filter((j) => j.date === today).reduce((s, j) => s + j.count, 0);
  const japaTotal = state.japa.reduce((s, j) => s + j.count, 0);
  const activeSankalpa = state.sankalpa.filter((s) => s.active);
  const upcoming = [...state.reminders]
    .filter((r) => r.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);
  const givingTotal = state.giving.reduce((s, g) => s + g.amount, 0);
  // 🧾 Receipts door headline — the CURRENT Indian financial year's truthful
  // total (donors think in FY at tax time; invalid rows never counted).
  const givingThisFY = useMemo(() => currentPeriod(state.giving, 'fy'), [state.giving]);

  // Home wallet glance — spec §1: the balance card sits DIRECTLY below the
  // home header. One Big Number + 4 quick actions; whole card taps → Wallet.
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [glanceCurrency, setGlanceCurrency] = useState<WalletCurrency>('INR');
  const [balanceHidden, setBalanceHidden] = useState<boolean>(() => {
    try { return window.localStorage.getItem('sb_wallet_hidden') === '1'; } catch { return false; }
  });
  const toggleBalanceHidden = () => {
    const next = !balanceHidden;
    setBalanceHidden(next);
    try { window.localStorage.setItem('sb_wallet_hidden', next ? '1' : '0'); } catch { /* ignore */ }
  };
  useEffect(() => {
    let live = true;
    setWalletLoading(true);
    (async () => {
      try {
        const w = await getWallet();
        if (!live) return;
        setWalletBalance(w.balance);
        // Currency precedence (same as WalletTab — never the geo flash):
        // active wallet currency > workspace currency > geo fallback.
        const hasAct = w.balance + w.totalToppedUp + w.totalReceived > 0;
        if (hasAct) {
          setGlanceCurrency(w.currency);
        } else {
          const c = String((activeWorkspace as { currency?: string } | null)?.currency || '').toUpperCase();
          if (c === 'INR' || c === 'BDT' || c === 'USD') setGlanceCurrency(c as WalletCurrency);
          else {
            try {
              const r = await detectPayRegion();
              setGlanceCurrency(currencyForRegion(r === 'IN' || r === 'INTL' ? r : 'BD'));
            } catch { /* keep default — skeleton hides the paint anyway */ }
          }
        }
      } catch {
        if (live) setWalletBalance(0);
      } finally {
        if (live) setWalletLoading(false);
      }
    })();
    return () => { live = false; };
  }, [uid, activeWorkspace]);

  const hour = new Date().getHours();
  // Regional greeting — the afternoon word belongs to the devotee's region:
  // வணக்கம் in Tamil Nadu, নমস্কার in Bengal, Vanakkam for English UI there.
  // The tr() key stays for the dictionary; the regional term wins the fallback.
  const greetingWord = rt('greeting');
  const greeting =
    hour < 12
      ? tr('solo.greet.morning', 'Suprabhat', 'সুপ্রভাত', 'सुप्रभात')
      : hour < 17
        ? tr('solo.greet.afternoon', greetingWord, 'নমস্কার', 'नमस्ते')
        : tr('solo.greet.evening', 'Shubh Sandhya', 'শুভ সন্ধ্যা', 'शुभ संध्या');

  // Tithi-aware warmth — the Panjika engine knows today; surface it kindly.
  // Special days get a blessing line; ordinary days stay quiet (the full
  // panchang line below already carries the detail).
  const tithiWarm = useMemo(() => {
    try {
      // QUEUED #52 (audit D12): judge "today" by the same sunrise-anchored
      // day tithi as the panchang line above — never the raw moment, or
      // the greeting would bless an Ekadashi that ended at noon while
      // the panjika line below already reads Dashami.
      const dayTithi = calculateDailyPanchang(new Date()).tithi;
      if (dayTithi.endsWith('Ekadashi'))
        return tr(
          'solo.greet.ekadashi',
          'Ekadashi today — a blessed day for vrata and remembrance 🙏',
          'আজ একাদশী — ব্রত ও স্মরণের পুণ্যদিন 🙏',
          'आज एकादशी है — व्रत और स्मरण का पुण्य दिन 🙏'
        );
      if (dayTithi.endsWith('Purnima'))
        return tr(
          'solo.greet.purnima',
          'Purnima tonight — the moon is full, and so is grace 🌕',
          'আজ পূর্ণিমা — চাঁদ পূর্ণ, কৃপাও পূর্ণ 🌕',
          'आज पूर्णिमा है — चंद्र पूर्ण, कृपा भी पूर्ण 🌕'
        );
      if (dayTithi.endsWith('Amavasya'))
        return tr(
          'solo.greet.amavasya',
          'Amavasya today — a quiet day for remembrance and deep japa 🌑',
          'আজ অমাবস্যা — স্মরণ ও গভীর জপের নীরব দিন 🌑',
          'आज अमावस्या है — स्मरण व गहन जप का शांत दिन 🌑'
        );
      return '';
    } catch {
      return '';
    }
  }, [tr]);

  return (
    <div className="space-y-4">
      {/* Welcome banner — VIBE B1: the dark amber slab became the
          sanctum PanchangHeader (ivory/sandalwood, lamplight, festival
          dressing, tithi greeting + brass muhurat chip). The greeting,
          tithi-warmth line and SAN id are unchanged — they simply live
          inside the temple now instead of on a gradient. */}
      <PanchangHeader
        eyebrow={<>॥ {tr('solo.motto', 'Atmano Mokshartham', 'আত্মনো মোক্ষার্থম্', 'आत्मनो मोक्षार्थम्')} ॥</>}
        title={<>{greeting}, {profile?.displayName || tr('solo.sanatani', 'Sanatani', 'সনাতনী', 'सनातनी')}</>}
      >
        <div>
          {tithiWarm && <p className="text-sm text-temple-600 font-medium">{tithiWarm}</p>}
          <p className="text-sm text-temple-400 mt-1 font-mono">{profile?.id || 'SAN-…'}</p>
        </div>
      </PanchangHeader>

      {/* VIBE B2 — the offline sevak strip + "Your usual": this
          devotee's own most-used sadhana actions from device-local
          usage (cold start: the starter set, plainly labelled). */}
      <OfflineSevakStatus variant="bar" />
      <SoloUsualRow goTab={goTab} />

      {/* Wallet glance — spec §1: balance DIRECTLY below the home header.
          One Big Number (30px) + 4 quick actions; whole card taps → Wallet. */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => goTab('wallet')}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goTab('wallet'); } }}
        aria-label={mkt(L, 'sevaWallet')}
        className="rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 text-white p-5 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-bold text-white/80 uppercase tracking-widest">
            {mkt(L, 'sevaWallet')}
          </p>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleBalanceHidden(); }}
            aria-label={balanceHidden ? mkt(L, 'showBalance') : mkt(L, 'hideBalance')}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            {balanceHidden ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {walletLoading ? (
          <div className="h-9 w-40 rounded-lg bg-white/25 animate-pulse mt-1" aria-hidden />
        ) : (
          <p className="text-[30px] leading-9 font-semibold tabular-nums mt-1">
            {balanceHidden ? '••••••' : fmtWallet(walletBalance || 0, glanceCurrency)}
          </p>
        )}
        <div className="grid grid-cols-4 gap-2 mt-4">
          {(
            [
              { id: 'topup', icon: Plus, label: mkt(L, 'quickTopUp'), fn: () => goTab('wallet') },
              // 🪔 Give opens the express dana sheet — the Seva Wallet card
              // is platform money; P2P obligations live only in their own
              // card below (two-wallet boundary).
              { id: 'give', icon: HandHeart, label: mkt(L, 'quickGive'), fn: () => openDanaSheet({}) },
              { id: 'scan', icon: ScanLine, label: mkt(L, 'quickScan'), fn: () => setScanOpen(true) },
              { id: 'history', icon: History, label: mkt(L, 'quickHistory'), fn: () => goTab('wallet') },
            ] as const
          ).map(({ id, icon: Icon, label, fn }) => (
            <button
              key={id}
              type="button"
              onClick={(e) => { e.stopPropagation(); fn(); }}
              className="min-h-[64px] rounded-xl bg-white/15 hover:bg-white/25 flex flex-col items-center justify-center gap-1 transition-colors"
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] font-bold">{label}</span>
            </button>
          ))}
        </div>
      </div>
      {scanOpen && (
        <P2PScanSheet
          open={scanOpen}
          onClose={() => setScanOpen(false)}
          currentUser={{
            uid: selfInfo.uid,
            displayName: selfInfo.displayName,
            photoUrl: selfInfo.photoUrl,
          }}
        />
      )}

      {/* 🪔 Claim your spoken ID — one-time Home moment for the VDA alias.
          Profile placement is correct, but nobody discovers it there. */}
      <VdaHomeNudge profile={profile} goProfile={() => { goTab('profile'); window.location.hash = 'vda-alias'; }} />

      {/* Ajker Suchana — the morning briefing (now merged: panjika + module insights) */}
      <AjkerSuchana goTab={goTab} role="solo" onViewAll={() => setSuchanaOpen(true)} uid={uid} />

      {/* Progressive discovery — Suchana suggests the next natural feature */}
      <SuggestionCards uid={uid} />

      {/* Messages — chat entry (full-screen overlay, not a modal) */}
      {uid !== 'anon' && (
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className="w-full rounded-2xl bg-gradient-to-br from-amber-700 via-orange-700 to-amber-800 text-amber-50 p-4 flex items-center gap-4 text-left shadow-sm hover:shadow-md transition-shadow min-h-[76px]"
        >
          <div className="relative shrink-0">
            <div className="text-3xl" aria-hidden>
              💬
            </div>
            {unreadTotal > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[22px] h-[22px] px-1 rounded-full bg-amber-200 text-amber-900 text-[11px] font-extrabold flex items-center justify-center shadow">
                {unreadTotal > 99 ? '99+' : unreadTotal}
              </span>
            )}
          </div>
          <div className="flex-1">
            <div className="text-sm font-extrabold">
              <T en="Messages" bn="বার্তা" hi="संदेश" />
            </div>
            <div className="text-[11px] text-amber-200/80">
              {unreadTotal > 0 ? (
                <T
                  en={`${unreadTotal} unread — your sangha is speaking`}
                  bn={`${unreadTotal}টি অপঠিত — আপনার সংঘ কথা বলছে`}
                  hi={`${unreadTotal} अपठित — आपका संघ बोल रहा है`}
                />
              ) : (
                <T
                  en="Calm conversations with verified Sanatanis"
                  bn="যাচাইকৃত সনাতনীদের সঙ্গে শান্ত কথোপকথন"
                  hi="सत्यापित सनातनियों के साथ शांत बातचीत"
                />
              )}
            </div>
          </div>
          <div className="text-amber-200/70 text-xl" aria-hidden>
            →
          </div>
        </button>
      )}
      {chatOpen && uid !== 'anon' && (
        <>
          <Chat
            uid={uid}
            selfInfo={selfInfo}
            initialChatId={chatInitialId || undefined}
            onClose={() => { setChatOpen(false); setChatInitialId(null); }}
          />
          {/* First-run guides — each shows once, dismissable forever. */}
          <ChatFirstRunHint />
          <RequestFirstRunWatcher uid={uid} />
        </>
      )}

      {/* Suchana + Guides entry row */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setSuchanaOpen(true)}
          className="rounded-2xl bg-gradient-to-br from-amber-700 via-orange-600 to-rose-700 text-amber-50 p-4 text-left shadow-sm min-h-[64px] hover:shadow-md transition-shadow"
        >
          <div className="text-2xl" aria-hidden>🪔</div>
          <div className="text-sm font-extrabold mt-1">
            <T en="All Suchana" bn="সব সূচনা" hi="सभी सूचनाएं" />
          </div>
          <div className="text-[11px] text-amber-200/80">
            <T en="Guidance for your path" bn="আপনার পথের নির্দেশনা" hi="आपके मार्ग का मार्गदर्शन" />
          </div>
        </button>
        <button
          type="button"
          onClick={() => setGuidesOpen(true)}
          className="rounded-2xl bg-white border border-amber-200 p-4 text-left shadow-sm min-h-[64px] hover:border-amber-400 hover:shadow-md transition-all"
        >
          <div className="text-2xl" aria-hidden>📖</div>
          <div className="text-sm font-extrabold text-stone-800 mt-1">
            <T en="Guides" bn="নির্দেশিকা" hi="मार्गदर्शिका" />
          </div>
          <div className="text-[11px] text-stone-500">
            <T en="Every module in 30 seconds" bn="৩০ সেকেন্ডে প্রতিটি মডিউল" hi="30 सेकंड में हर मॉड्यूल" />
          </div>
        </button>
      </div>

      <SuchanaFullModal
        isOpen={suchanaOpen}
        onClose={() => setSuchanaOpen(false)}
        role="solo"
        onAction={(route) => {
          setSuchanaOpen(false);
          const soloTabs = ['panjika', 'sadhana', 'marketplace', 'sangam'];
          goTab((soloTabs.includes(route) ? route : 'panjika') as any);
        }}
      />
      <GuideCenter isOpen={guidesOpen} onClose={() => setGuidesOpen(false)} />

      {/* My Wallet — private P2P obligation ledger (not an AppShell tab) */}
      {uid !== 'anon' && (
        <button
          type="button"
          onClick={() => setWalletOpen(true)}
          data-guide-anchor="wallet-personal"
          className="w-full rounded-2xl bg-gradient-to-br from-emerald-700 via-teal-700 to-emerald-800 text-white p-4 text-left shadow-sm min-h-[64px] hover:shadow-md transition-shadow"
        >
          <div className="text-2xl" aria-hidden>
            🪙
          </div>
          <div className="text-sm font-extrabold mt-1">
            <T en="🤝 My obligations" bn="🤝 আমার দেনা-পাওনা" hi="🤝 मेरे लेन-देन" />
          </div>
          <div className="text-[11px] text-emerald-100/80">
            <T
              en="Private P2P obligations — only you can see"
              bn="ব্যক্তিগত P2P হিসাব — শুধু আপনি দেখতে পাবেন"
              hi="निजी P2P हिसाब — केवल आप देख सकते हैं"
            />
          </div>
        </button>
      )}
      <PersonalWallet
        uid={uid}
        isOpen={walletOpen}
        onClose={() => setWalletOpen(false)}
        currentUser={selfInfo}
        // sanatani:open-chat wiring: the wallet's per-entry "chat" action
        // deep-links straight into the thread (closes the wallet first so the
        // Messages overlay owns the screen).
        onOpenChat={(chatId) => {
          setChatInitialId(chatId);
          setWalletOpen(false);
          setChatOpen(true);
        }}
      />
      {/* First-run wallet explainer — shows once, dismissable forever. */}
      {walletOpen && uid !== 'anon' && <WalletFirstRunHint />}

      {/* Sadhana at a glance */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat
          label={<T en="Japa today" bn="আজকের জপ" hi="आज का जप" />}
          value={japaToday.toLocaleString('en-IN')}
          sub={<T en="mantras" bn="মন্ত্র" hi="मंत्र" />}
          tone="amber"
        />
        <Stat
          label={<T en="Total japa" bn="মোট জপ" hi="कुल जप" />}
          value={japaTotal.toLocaleString('en-IN')}
          sub={<T en="all time" bn="সর্বকাল" hi="सदैव" />}
          tone="emerald"
        />
        <Stat
          label={<T en="Active sankalpa" bn="সক্রিয় সংকল্প" hi="सक्रिय संकल्प" />}
          value={activeSankalpa.length}
          sub={<T en="vows" bn="ব্রত" hi="व्रत" />}
          tone="sky"
        />
        <button
          type="button"
          onClick={() => goTab('giving')}
          className="text-left rounded-2xl focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/70 transition-transform active:scale-[0.98]"
          aria-label={tr('solo.home.givingGo', 'View your dana ledger', 'আপনার দানের খাতা দেখুন', 'आपका दान-खाता देखें')}
        >
          <Stat
            label={<T en="Total giving" bn="মোট দান" hi="कुल दान" />}
            value={`₹${givingTotal.toLocaleString('en-IN')}`}
            sub={<T en="dana →" bn="দান →" hi="दान →" />}
            tone="amber"
          />
        </button>
      </div>

      {/* 🧾 My giving & receipts — one tap from Home to tax-time proof
          (QUEUED #30; discoverability #12's solo answer). The door shows the
          CURRENT Indian FY total; the view itself groups by FY / calendar
          year over the devotee's own personal ledger only. */}
      <button
        type="button"
        onClick={() => goTab('receipts')}
        data-guide-anchor="giving-receipts"
        className="w-full rounded-2xl bg-white border border-amber-200 p-4 flex items-center gap-4 text-left shadow-sm hover:border-amber-400 hover:shadow-md transition-all min-h-[76px]"
        aria-label={tr('solo.home.receiptsGo', 'My giving and receipts', 'আমার দান ও রসিদ', 'मेरा दान और रसीदें')}
      >
        <div className="text-3xl shrink-0" aria-hidden>
          🧾
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-extrabold text-stone-800">
            <T en="My giving & receipts" bn="আমার দান ও রসিদ" hi="मेरा दान और रसीदें" />
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">
            {givingThisFY.count > 0 ? (
              <T
                en={`₹${givingThisFY.total.toLocaleString('en-IN')} given in ${givingThisFY.label} · ${givingThisFY.count} offering${givingThisFY.count === 1 ? '' : 's'} — receipts ready for tax time`}
                bn={`${givingThisFY.label}-এ ₹${givingThisFY.total.toLocaleString('en-IN')} দান · ${givingThisFY.count}টি দান — করের সময়ের জন্য রসিদ প্রস্তুত`}
                hi={`${givingThisFY.label} में ₹${givingThisFY.total.toLocaleString('en-IN')} दान · ${givingThisFY.count} भेंटें — कर के समय हेतु रसीदें तैयार`}
              />
            ) : (
              <T
                en="Your dana receipts will gather here — ready for tax time"
                bn="আপনার দানের রসিদ এখানে জমা হবে — করের সময়ের জন্য প্রস্তুত"
                hi="आपकी दान रसीदें यहाँ एकत्र होंगी — कर के समय हेतु तैयार"
              />
            )}
          </div>
        </div>
        <div className="text-amber-600 text-xl shrink-0" aria-hidden>
          →
        </div>
      </button>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Upcoming reminders */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-extrabold text-stone-900">
              <T en="Upcoming" bn="আসন্ন" hi="आगामी" />
            </h3>
            <button onClick={() => goTab('panchang')} className="text-xs font-bold text-amber-700 hover:underline min-h-[44px] px-2">
              <T en="Manage →" bn="পরিচালনা →" hi="प्रबंधित →" />
            </button>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-stone-400">
              <T en="No reminders yet — add Ekadashi, Purnima or a shraddha date." bn="এখনও কোনো রিমাইন্ডার নেই — একাদশী, পূর্ণিমা বা শ্রাদ্ধের তারিখ যোগ করুন।" hi="अभी कोई रिमाइंडर नहीं — एकादशी, पूर्णिमा या श्राद्ध तिथि जोड़ें।" />
            </p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((r) => (
                <li key={r.id} className="flex items-center justify-between text-sm border-b border-stone-100 pb-2">
                  <span className="font-semibold text-stone-800">{r.title}</span>
                  <span className="text-xs text-stone-500">{r.date}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Quick actions */}
        <Card>
          <h3 className="font-extrabold text-stone-900 mb-3">
            <T en="Quick actions" bn="দ্রুত কাজ" hi="त्वरित कार्य" />
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['sadhana', '📿', 'Log japa', 'জপ লিখুন', 'जप लिखें'],
                ['panchang', '📅', 'Add reminder', 'রিমাইন্ডার', 'रिमाइंडर'],
                ['saved', '🔖', 'Save shloka', 'শ্লোক', 'श्लोक'],
                ['giving', '🪔', 'Record dana', 'দান', 'दान'],
              ] as const
            ).map(([id, icon, en, bn, hi]) => (
              <button
                key={id}
                onClick={() => goTab(id)}
                className="rounded-2xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 p-3 text-left min-h-[64px]"
              >
                <div className="text-xl">{icon}</div>
                <div className="text-xs font-bold text-stone-800 mt-1">
                  <T en={en} bn={bn} hi={hi} />
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Progressive joining */}
      <JoinUpgrade />
    </div>
  );
};
