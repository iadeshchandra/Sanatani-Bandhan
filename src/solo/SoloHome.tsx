import React, { useMemo, useState } from 'react';
import { useSolo } from './SoloContext';
import { useSoloStore, todayISO } from './soloStore';
import { Card, Stat, T, useLocaleText } from './ui';
import { JoinUpgrade } from './JoinUpgrade';
import { AjkerSuchana } from './AjkerSuchana';
import { SuchanaFullModal } from '../components/suchana/SuchanaFullModal';
import { GuideCenter } from '../components/suchana/GuideCenter';
import { SuggestionCards } from './SuggestionCards';
import { PersonalWallet } from '../chat/PersonalWallet';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { drikTodayLine, drikTithiAt } from '../lib/drikPanchang';
import { getCalendar } from '../lib/regionalCalendars';
import { Chat } from '../chat/Chat';
import { useChatUnreadTotal } from '../chat/useChat';
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

export const SoloHome: React.FC<{ goTab: (t: 'sadhana' | 'panchang' | 'panjika' | 'saved' | 'giving' | 'profile' | 'marketplace' | 'sangam') => void }> = ({
  goTab,
}) => {
  const { profile } = useSolo();
  const { state } = useSoloStore();
  const { firebaseUser } = useAuthWorkspace();
  const uid = ((firebaseUser as { uid?: string } | null)?.uid || 'anon') as string;
  const { tr } = useLocaleText();
  const [suchanaOpen, setSuchanaOpen] = useState(false);
  const [guidesOpen, setGuidesOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const unreadTotal = useChatUnreadTotal(uid === 'anon' ? null : uid);
  const selfInfo: ChatParticipant = {
    uid,
    displayName: profile?.displayName || tr('solo.sanatani', 'Sanatani', 'সনাতনী', 'सनातनी'),
    photoUrl: ((firebaseUser as { photoURL?: string } | null)?.photoURL as string) || undefined,
    sanataniId: profile?.id,
    verificationTier: profile?.verificationTier,
  };

  const panchangLine = useMemo(() => {
    try {
      // Drik engine — the legacy mean-motion engine drifted ~2 tithis.
      const vsYear = getCalendar('vikram').toRegional(new Date()).year;
      return drikTodayLine(new Date(), vsYear);
    } catch {
      return '';
    }
  }, []);

  const today = todayISO();
  const japaToday = state.japa.filter((j) => j.date === today).reduce((s, j) => s + j.count, 0);
  const japaTotal = state.japa.reduce((s, j) => s + j.count, 0);
  const activeSankalpa = state.sankalpa.filter((s) => s.active);
  const upcoming = [...state.reminders]
    .filter((r) => r.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);
  const givingTotal = state.giving.reduce((s, g) => s + g.amount, 0);

  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? tr('solo.greet.morning', 'Suprabhat', 'সুপ্রভাত', 'सुप्रभात')
      : hour < 17
        ? tr('solo.greet.afternoon', 'Namaste', 'নমস্কার', 'नमस्ते')
        : tr('solo.greet.evening', 'Shubh Sandhya', 'শুভ সন্ধ্যা', 'शुभ संध्या');

  // Tithi-aware warmth — the Panjika engine knows today; surface it kindly.
  // Special days get a blessing line; ordinary days stay quiet (the full
  // panchang line below already carries the detail).
  const tithiWarm = useMemo(() => {
    try {
      const t = drikTithiAt(new Date());
      if (t.name === 'Ekadashi')
        return tr(
          'solo.greet.ekadashi',
          'Ekadashi today — a blessed day for vrata and remembrance 🙏',
          'আজ একাদশী — ব্রত ও স্মরণের পুণ্যদিন 🙏',
          'आज एकादशी है — व्रत और स्मरण का पुण्य दिन 🙏'
        );
      if (t.name === 'Purnima')
        return tr(
          'solo.greet.purnima',
          'Purnima tonight — the moon is full, and so is grace 🌕',
          'আজ পূর্ণিমা — চাঁদ পূর্ণ, কৃপাও পূর্ণ 🌕',
          'आज पूर्णिमा है — चंद्र पूर्ण, कृपा भी पूर्ण 🌕'
        );
      if (t.name === 'Amavasya')
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
      {/* Welcome banner */}
      <div className="rounded-3xl bg-gradient-to-r from-amber-800 via-orange-700 to-amber-800 text-amber-50 p-5 sm:p-6">
        <div className="text-xs font-bold uppercase tracking-widest text-amber-200/80">
          ॥ {tr('solo.motto', 'Atmano Mokshartham', 'আত্মনো মোক্ষার্থম্', 'आत्मनो मोक्षार्थम्')} ॥
        </div>
        <h1 className="font-display text-xl sm:text-2xl font-extrabold mt-1">
          {greeting}, {profile?.displayName || tr('solo.sanatani', 'Sanatani', 'সনাতনী', 'सनातनी')}
        </h1>
        {tithiWarm && <p className="text-sm text-amber-100/95 mt-1.5 font-medium">{tithiWarm}</p>}
        <p className="text-sm text-amber-100/90 mt-1 font-mono">{profile?.id || 'SAN-…'}</p>
        {panchangLine && <p className="text-xs text-amber-200/80 mt-2">{panchangLine}</p>}
      </div>

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
          <Chat uid={uid} selfInfo={selfInfo} onClose={() => setChatOpen(false)} />
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
          className="w-full rounded-2xl bg-gradient-to-br from-emerald-700 via-teal-700 to-emerald-800 text-white p-4 text-left shadow-sm min-h-[64px] hover:shadow-md transition-shadow"
        >
          <div className="text-2xl" aria-hidden>
            🪙
          </div>
          <div className="text-sm font-extrabold mt-1">
            <T en="My Wallet" bn="আমার ওয়ালেট" hi="मेरा वॉलेट" />
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
      <PersonalWallet uid={uid} isOpen={walletOpen} onClose={() => setWalletOpen(false)} />
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
        <Stat
          label={<T en="Total giving" bn="মোট দান" hi="कुल दान" />}
          value={`₹${givingTotal.toLocaleString('en-IN')}`}
          sub={<T en="dana" bn="দান" hi="दान" />}
          tone="amber"
        />
      </div>

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
