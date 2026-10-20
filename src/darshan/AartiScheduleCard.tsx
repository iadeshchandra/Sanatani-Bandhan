/**
 * darshan/AartiScheduleCard.tsx — "🪔 Daily Aarti" section for the org page.
 * ============================================================================
 * Renders the org's published aartiSchedules with the next occurrence and
 * a one-tap "🔔 Remind me" toggle per aarti. Subscriptions are local to
 * this device (see aartiReminders.ts) — one gentle bell 15 minutes before,
 * never more than one per occurrence, easy to switch off.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Bell, BellOff, Clock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { friendlyCountdown, nextOccurrence, type AartiSlot } from './aartiSchedule';
import { isSubscribed, toggleSubscription, type AartiSubscription } from './aartiReminders';

interface Props {
  orgId: string;
  orgName: string;
  schedules: AartiSlot[];
}

export const AartiScheduleCard: React.FC<Props> = ({ orgId, orgName, schedules }) => {
  const { safeTranslate } = useLanguage();
  const T = (key: string, en: string, bn: string, hi: string) => safeTranslate(key, en, bn, hi);

  // Re-render every minute so "next" counts stay honest while the page is open.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);
  const now = useMemo(() => new Date(nowMs), [nowMs]);

  const rows = useMemo(() => {
    return schedules
      .map((slot) => ({ slot, at: nextOccurrence(slot, now) }))
      .filter((r): r is { slot: AartiSlot; at: Date } => r.at !== null)
      .sort((a, b) => a.at.getTime() - b.at.getTime());
  }, [schedules, now]);

  const [, forceTick] = useState(0);
  if (rows.length === 0) return null;

  return (
    <section className="bg-white rounded-3xl shadow-sm border border-stone-200 p-6 mt-4">
      <h2 className="text-sm font-black uppercase tracking-widest text-stone-900 flex items-center gap-2 mb-1">
        <span aria-hidden>🪔</span>
        {T('orgpublic_aarti_schedule', 'Daily Aarti', 'দৈনন্দিন আরতি', 'दैनिक आरती')}
      </h2>
      <p className="text-xs text-stone-500 mb-4">
        {T(
          'orgpublic_aarti_remind_hint',
          'Tap the bell and we will ring once, gently, 15 minutes before the aarti.',
          'ঘণ্টায় ট্যাপ করুন — আরতির ১৫ মিনিট আগে আমরা একবার মৃদুভাবে জানিয়ে দেব।',
          'घंटी दबाएँ — आरती से 15 मिनट पहले हम एक बार सौम्यता से बता देंगे।',
        )}
      </p>
      <div className="divide-y divide-stone-100">
        {rows.map(({ slot, at }) => {
          const sub: AartiSubscription = { orgId, orgName, ...slot };
          const on = isSubscribed(sub);
          return (
            <div key={`${slot.name}:${slot.time}`} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-stone-800 truncate">{slot.name}</p>
                <p className="text-xs text-amber-800 font-semibold flex items-center gap-1 mt-0.5">
                  <Clock size={12} aria-hidden />
                  {slot.time} · {friendlyCountdown(at, now)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  toggleSubscription(sub);
                  forceTick((n) => n + 1);
                }}
                aria-pressed={on}
                aria-label={
                  on
                    ? T('orgpublic_aarti_remind_off', `Stop reminders for ${slot.name}`, `${slot.name}-এর রিমাইন্ডার বন্ধ করুন`, `${slot.name} के रिमाइंडर बंद करें`)
                    : T('orgpublic_aarti_remind_on', `Remind me before ${slot.name}`, `${slot.name}-এর আগে জানান`, `${slot.name} से पहले बताएँ`)
                }
                className={`shrink-0 inline-flex items-center gap-1.5 min-h-[44px] px-3.5 rounded-full text-xs font-extrabold border transition ${
                  on
                    ? 'bg-amber-700 text-white border-amber-700'
                    : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                }`}
              >
                {on ? <Bell size={14} aria-hidden /> : <BellOff size={14} aria-hidden />}
                {on
                  ? T('orgpublic_aarti_reminding', 'Reminding', 'জানাবো', 'बताएँगे')
                  : T('orgpublic_aarti_remind_me', 'Remind me', 'মনে করিয়ে দিন', 'याद दिलाएँ')}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};
