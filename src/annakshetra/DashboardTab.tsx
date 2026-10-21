import React, { useMemo } from 'react';
import { useInr } from '../hooks/useWorkspaceInr';
import { useAnnakshetra, lowStockItems, totalMeals, todayISO, daysFrom } from './annakshetraStore';
import { Card, Stat, useLocaleText } from './ui';

/* Annakshetra One — dashboard: meals served, inventory alerts, upcoming
 * bhandaras, top sponsors, wastage trend. All device-local. */

export const DashboardTab: React.FC = () => {
  const { state } = useAnnakshetra();
  const { tr } = useLocaleText();

  const s = useMemo(() => {
    const today = todayISO();
    const weekAgo = daysFrom(-6);
    const monthStart = today.slice(0, 7) + '-01';
    const mealsWeek = totalMeals(state, weekAgo, today);
    const mealsMonth = totalMeals(state, monthStart, today);
    const low = lowStockItems(state);
    const upcoming = state.bhandaras
      .filter((b) => b.status === 'planned' && b.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 4);
    const sponsorTotals = new Map<string, number>();
    for (const b of state.bhandaras) {
      if (b.status === 'cancelled') continue;
      sponsorTotals.set(b.sponsorName, (sponsorTotals.get(b.sponsorName) || 0) + b.donationAmount);
    }
    const topSponsors = [...sponsorTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const wastageWeek = state.wastage.filter((w) => w.date >= weekAgo).length;
    const wastagePrev = state.wastage.filter((w) => w.date >= daysFrom(-13) && w.date < weekAgo).length;
    const completed = state.bhandaras.filter((b) => b.status === 'completed');
    const totalServed = completed.reduce((sum, b) => sum + (b.servedCount || 0), 0);
    return { mealsWeek, mealsMonth, low, upcoming, topSponsors, wastageWeek, wastagePrev, totalServed };
  }, [state]);

  const inr = useInr();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label={tr('anna.db.week', 'Meals served · 7 days', '৭ দিনে পরিবেশন', '७ दिनों में परोसे')} value={s.mealsWeek.toLocaleString('en-IN')} tone="emerald" />
        <Stat label={tr('anna.db.month', 'Meals served · this month', 'এই মাসে', 'इस माह')} value={s.mealsMonth.toLocaleString('en-IN')} tone="sky" />
        <Stat
          label={tr('anna.db.low', 'Low-stock items', 'কম মজুত', 'कम स्टॉक')}
          value={s.low.length}
          tone={s.low.length ? 'red' : 'emerald'}
          sub={s.low.length ? s.low.slice(0, 3).map((i) => i.name).join(', ') : tr('anna.db.lowok', 'All stocked', 'সব ঠিক', 'सब ठीक')}
        />
        <Stat label={tr('anna.db.bhserved', 'Bhandara plates served', 'ভাণ্ডারা থালা', 'भंडारा थाली')} value={s.totalServed.toLocaleString('en-IN')} />
      </div>

      {s.low.length > 0 && (
        <Card className="border-red-200 bg-red-50/60">
          <div className="text-sm font-bold text-red-900 mb-2">
            ⚠️ {tr('anna.db.lowalert', 'Low stock — purchase before the next cook', 'কম মজুত — রান্নার আগে কিনুন', 'कम स्टॉक — अगली रसोई से पहले खरीदें')}
          </div>
          <div className="flex flex-wrap gap-2">
            {s.low.map((i) => (
              <span key={i.id} className="px-2.5 py-1 rounded-full bg-white border border-red-200 text-xs font-semibold text-red-800">
                {i.name}: {i.stock} {i.unit}
              </span>
            ))}
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-bold text-stone-800 mb-3">🪔 {tr('anna.db.upcoming', 'Upcoming bhandaras', 'আসন্ন ভাণ্ডারা', 'आगामी भंडारे')}</h3>
          {s.upcoming.length === 0 && <p className="text-sm text-stone-400">{tr('anna.db.noup', 'No bhandaras planned yet.', 'কোনো ভাণ্ডারা নেই।', 'कोई भंडारा नियोजित नहीं।')}</p>}
          {s.upcoming.map((b) => (
            <div key={b.id} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
              <div>
                <div className="text-sm font-bold text-stone-800">{b.name}</div>
                <div className="text-xs text-stone-500">{b.date} · {tr('anna.db.by', 'by', 'দ্বারা', 'द्वारा')} {b.sponsorName} · {b.expectedCount} {tr('anna.db.plates', 'plates', 'থালা', 'थाली')}</div>
              </div>
              <div className="text-sm font-bold text-amber-800">{inr(b.donationAmount)}</div>
            </div>
          ))}
        </Card>

        <Card>
          <h3 className="font-bold text-stone-800 mb-3">🙏 {tr('anna.db.topsponsors', 'Top sponsors', 'শীর্ষ পৃষ্ঠপোষক', 'शीर्ष प्रायोजक')}</h3>
          {s.topSponsors.length === 0 && <p className="text-sm text-stone-400">{tr('anna.db.nosponsors', 'No sponsors recorded yet.', 'কোনো পৃষ্ঠপোষক নেই।', 'कोई प्रायोजक नहीं।')}</p>}
          {s.topSponsors.map(([name, amt], i) => (
            <div key={name} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
              <div className="text-sm font-bold text-stone-800">{i + 1}. {name}</div>
              <div className="text-sm font-bold text-emerald-800">{inr(amt)}</div>
            </div>
          ))}
        </Card>
      </div>

      <Card>
        <h3 className="font-bold text-stone-800 mb-2">♻️ {tr('anna.db.wastage', 'Wastage trend', 'অপচয়ের ধারা', 'बर्बादी की प्रवृत्ति')}</h3>
        <p className="text-sm text-stone-600">
          {tr('anna.db.wastageweek', 'Wastage entries this week', 'এই সপ্তাহে অপচয়', 'इस सप्ताह बर्बादी')}: <b>{s.wastageWeek}</b>
          {' · '}
          {tr('anna.db.wastageprev', 'previous week', 'আগের সপ্তাহ', 'पिछला सप्ताह')}: <b>{s.wastagePrev}</b>
          {s.wastageWeek < s.wastagePrev && s.wastagePrev > 0 && (
            <span className="ml-2 text-emerald-700 font-semibold">↓ {tr('anna.db.improving', 'improving', 'উন্নতি', 'सुधार')}</span>
          )}
        </p>
        <p className="text-xs text-stone-400 mt-1">
          {tr('anna.db.wastagehint', 'Honest waste logs are the first step to zero-waste annakshetra.', 'সৎ অপচয়-লগই শূন্য-অপচয়ের প্রথম ধাপ।', 'ईमानदार बर्बादी-लॉग शून्य-अपव्यय का पहला कदम है।')}
        </p>
      </Card>
    </div>
  );
};
