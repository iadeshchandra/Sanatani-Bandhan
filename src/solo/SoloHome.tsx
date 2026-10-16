import React, { useMemo } from 'react';
import { useSolo } from './SoloContext';
import { useSoloStore, todayISO } from './soloStore';
import { Card, Stat, T, useLocaleText } from './ui';
import { JoinUpgrade } from './JoinUpgrade';
import { drikTodayLine } from '../lib/drikPanchang';
import { getCalendar } from '../lib/regionalCalendars';

/* SoloHome — the personal "My Space" dashboard.
 * =====================================================================
 * Greeting, today's tithi/panchang, sadhana-at-a-glance, upcoming
 * reminders, and the progressive-joining cards. Everything here is
 * person-scoped — no organisation data can appear by construction.
 */

export const SoloHome: React.FC<{ goTab: (t: 'sadhana' | 'panchang' | 'saved' | 'giving' | 'profile') => void }> = ({
  goTab,
}) => {
  const { profile } = useSolo();
  const { state } = useSoloStore();
  const { tr } = useLocaleText();

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

  return (
    <div className="space-y-4">
      {/* Welcome banner */}
      <div className="rounded-3xl bg-gradient-to-r from-amber-800 via-orange-700 to-amber-800 text-amber-50 p-5 sm:p-6">
        <div className="text-xs font-bold uppercase tracking-widest text-amber-200/80">
          ॥ {tr('solo.motto', 'Atmano Mokshartham', 'আত্মনো মোক্ষার্থম্', 'आत्मनो मोक्षार्थम्')} ॥
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold mt-1">
          {greeting}, {profile?.displayName || tr('solo.sanatani', 'Sanatani', 'সনাতনী', 'सनातनी')}
        </h1>
        <p className="text-sm text-amber-100/90 mt-1 font-mono">{profile?.id || 'SAN-…'}</p>
        {panchangLine && <p className="text-xs text-amber-200/80 mt-2">{panchangLine}</p>}
      </div>

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
