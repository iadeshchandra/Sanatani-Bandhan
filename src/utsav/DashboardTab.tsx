import React, { useState } from 'react';
import { useUtsav, daysUntil, budgetTotals, tasksDonePct, vendorPending, safetyDonePct, totalCheckins, todayISO } from './utsavStore';
import { T, Card, Stat, Field, Empty, fmtDate, inr } from './ui';

/* Utsav One — dashboard: countdown, budget burn, task/vender/safety state. */

export const DashboardTab: React.FC = () => {
  const { state } = useUtsav();
  const [festivalId, setFestivalId] = useState(state.festivals[0]?.id || '');
  const fest = state.festivals.find((f) => f.id === festivalId) || state.festivals[0];

  if (!fest) {
    return <Card><Empty text="No festivals yet. Add your first festival in the Festivals tab." /></Card>;
  }

  const t = budgetTotals(state, fest.id);
  const tasksPct = tasksDonePct(state, fest.id);
  const pending = vendorPending(state, fest.id);
  const safetyPct = safetyDonePct(state, fest.id);
  const checkins = totalCheckins(state, fest.id);
  const dStart = daysUntil(fest.startDate);
  const dEnd = daysUntil(fest.endDate);
  const ongoing = dStart <= 0 && dEnd >= 0;

  const burn = t.plannedExpense > 0 ? Math.round((t.actualExpense / t.plannedExpense) * 100) : 0;

  return (
    <div className="space-y-4">
      <Field label={<T en="Festival" bn="উৎসব" hi="उत्सव" />}>
        <select className="w-full sm:w-80 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm min-h-[44px]"
          value={fest.id} onChange={(e) => setFestivalId(e.target.value)}>
          {state.festivals.map((f) => (
            <option key={f.id} value={f.id}>{f.name} · {fmtDate(f.startDate)}</option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          tone={ongoing ? 'orange' : dStart < 0 ? 'sky' : 'amber'}
          value={ongoing ? <T en="Live now" bn="চলছে" hi="चल रहा है" /> : dStart >= 0 ? `${dStart}` : <T en="Ended" bn="সমাপ্ত" hi="समाप्त" />}
          label={ongoing ? <T en="Festival is live" bn="উৎসব চলছে" hi="उत्सव चल रहा है" /> : dStart >= 0 ? <T en="Days to festival" bn="উৎসবের দিন বাকি" hi="उत्सव में दिन शेष" /> : <T en="Festival ended" bn="উৎসব শেষ" hi="उत्सव समाप्त" />}
          sub={ongoing ? <T en={`${dEnd} day(s) left`} bn={`${dEnd} দিন বাকি`} hi={`${dEnd} दिन शेष`} /> : `${fmtDate(fest.startDate)} → ${fmtDate(fest.endDate)}`}
        />
        <Stat
          tone="emerald"
          value={`${burn}%`}
          label={<T en="Budget burn" bn="বাজেট ব্যয়" hi="बजट खर्च" />}
          sub={<T en={`${inr(t.actualExpense)} of ${inr(t.plannedExpense)} planned`} bn={`পরিকল্পিত ${inr(t.plannedExpense)}-এর ${inr(t.actualExpense)}`} hi={`नियोजित ${inr(t.plannedExpense)} में से ${inr(t.actualExpense)}`} />}
        />
        <Stat
          tone="amber"
          value={`${tasksPct}%`}
          label={<T en="Tasks done" bn="কাজ সম্পন্ন" hi="कार्य पूर्ण" />}
          sub={<T en="Committee task completion" bn="সমিতির কাজের অগ্রগতি" hi="समिति कार्य प्रगति" />}
        />
        <Stat
          tone={pending > 0 ? 'red' : 'sky'}
          value={inr(pending)}
          label={<T en="Vendor payments pending" bn="বিক্রেতা পাওনা" hi="विक्रेता बकाया" />}
          sub={pending > 0
            ? <T en="Settle before the festival ends" bn="উৎসব শেষের আগে মিটিয়ে দিন" hi="उत्सव समाप्ति से पहले चुकाएं" />
            : <T en="All vendor quotes settled" bn="সব পাওনা মিটেছে" hi="सभी बकाया चुकता" />}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-extrabold text-stone-800 mb-3"><T en="Budget at a glance" bn="এক নজরে বাজেট" hi="एक नज़र में बजट" /></h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-stone-500"><T en="Planned income" bn="পরিকল্পিত আয়" hi="नियोजित आय" /></span><span className="font-bold text-emerald-700">{inr(t.plannedIncome)}</span></div>
            <div className="flex justify-between"><span className="text-stone-500"><T en="Actual income" bn="প্রকৃত আয়" hi="वास्तविक आय" /></span><span className="font-bold">{inr(t.actualIncome)}</span></div>
            <div className="flex justify-between"><span className="text-stone-500"><T en="Planned expense" bn="পরিকল্পিত ব্যয়" hi="नियोजित व्यय" /></span><span className="font-bold text-red-700">{inr(t.plannedExpense)}</span></div>
            <div className="flex justify-between"><span className="text-stone-500"><T en="Actual expense" bn="প্রকৃত ব্যয়" hi="वास्तविक व्यय" /></span><span className="font-bold">{inr(t.actualExpense)}</span></div>
            <div className="flex justify-between border-t border-stone-100 pt-2">
              <span className="text-stone-500"><T en="Surplus / deficit (actual)" bn="উদ্বৃত্ত / ঘাটতি (প্রকৃত)" hi="अधिशेष / घाटा (वास्तविक)" /></span>
              <span className={`font-extrabold ${t.actualIncome - t.actualExpense >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {inr(t.actualIncome - t.actualExpense)}
              </span>
            </div>
          </div>
        </Card>
        <Card>
          <h3 className="font-extrabold text-stone-800 mb-3"><T en="Operations" bn="পরিচালনা" hi="संचालन" /></h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-stone-500"><T en="Safety checklist" bn="নিরাপত্তা তালিকা" hi="सुरक्षा सूची" /></span><span className="font-bold">{safetyPct}% <T en="complete" bn="সম্পন্ন" hi="पूर्ण" /></span></div>
            <div className="flex justify-between"><span className="text-stone-500"><T en="Footfall recorded" bn="নথিভুক্ত ভিড়" hi="दर्ज भीड़" /></span><span className="font-bold">{checkins.toLocaleString('en-IN')} <T en="of" bn="/" hi="/" /> {fest.expectedFootfall.toLocaleString('en-IN')} <T en="expected" bn="প্রত্যাশিত" hi="अपेक्षित" /></span></div>
            <div className="flex justify-between"><span className="text-stone-500"><T en="Venue" bn="স্থান" hi="स्थान" /></span><span className="font-bold">{fest.venue || '—'}</span></div>
            <div className="flex justify-between"><span className="text-stone-500"><T en="Deity / occasion" bn="দেবতা / উপলক্ষ" hi="देवता / अवसर" /></span><span className="font-bold">{fest.deity}{fest.occasion ? ` · ${fest.occasion}` : ''}</span></div>
            {fest.expectedFootfall > 500 && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
                🚦 <T en="Footfall above 500 — open the Safety tab and confirm gate check-in is staffed." bn="৫০০-এর বেশি ভিড় — নিরাপত্তা ট্যাবে গেট চেক-ইন নিশ্চিত করুন।" hi="500 से अधिक भीड़ — सुरक्षा टैब में गेट चेक-इन सुनिश्चित करें।" />
              </div>
            )}
          </div>
        </Card>
      </div>

      <p className="text-[11px] text-stone-400">
        <T en="Figures are the samiti's own management view as of today." bn="অঙ্কগুলি আজকের হিসেবে সমিতির নিজস্ব পরিচালন দৃশ্য।" hi="आंकड़े आज की तिथि में समिति का अपना प्रबंधन दृश्य हैं।" /> {todayISO()}
      </p>
    </div>
  );
};
