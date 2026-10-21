import React, { useState } from 'react';
import { useUtsav, daysUntil, budgetTotals, tasksDonePct, vendorPending, safetyDonePct, totalCheckins, todayISO } from './utsavStore';
import { T, Card, Stat, Field, Empty, fmtDate } from './ui';
import { useInr } from '../hooks/useWorkspaceInr';
import { useLanguage } from '../context/LanguageContext';

/* Utsav One — dashboard: countdown, budget burn, task/vender/safety state. */

export const DashboardTab: React.FC = () => {
  const inr = useInr();
  const { t } = useLanguage();
  const { state } = useUtsav();
  const [festivalId, setFestivalId] = useState(state.festivals[0]?.id || '');
  const fest = state.festivals.find((f) => f.id === festivalId) || state.festivals[0];

  if (!fest) {
    return <Card><Empty text={t('ritual.utsav.dashboard.empty_no_festivals_yet_add_your_first')} /></Card>;
  }

  const totals = budgetTotals(state, fest.id);
  const tasksPct = tasksDonePct(state, fest.id);
  const pending = vendorPending(state, fest.id);
  const safetyPct = safetyDonePct(state, fest.id);
  const checkins = totalCheckins(state, fest.id);
  const dStart = daysUntil(fest.startDate);
  const dEnd = daysUntil(fest.endDate);
  const ongoing = dStart <= 0 && dEnd >= 0;

  const burn = totals.plannedExpense > 0 ? Math.round((totals.actualExpense / totals.plannedExpense) * 100) : 0;

  return (
    <div className="space-y-4">
      <Field label={t('ritual.common.festival')}>
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
          value={ongoing ? t('ritual.utsav.dashboard.live_now') : dStart >= 0 ? `${dStart}` : t('ritual.utsav.dashboard.ended')}
          label={ongoing ? t('ritual.utsav.dashboard.festival_is_live') : dStart >= 0 ? t('ritual.utsav.dashboard.days_to_festival') : t('ritual.utsav.dashboard.festival_ended')}
          sub={ongoing ? t('ritual.utsav.dashboard.daysLeft').replace('{n}', String(dEnd)) : `${fmtDate(fest.startDate)} → ${fmtDate(fest.endDate)}`}
        />
        <Stat
          tone="emerald"
          value={`${burn}%`}
          label={t('ritual.utsav.dashboard.budget_burn')}
          sub={t('ritual.utsav.dashboard.expenseOfPlanned').replace('{actual}', inr(totals.actualExpense)).replace('{planned}', inr(totals.plannedExpense))}
        />
        <Stat
          tone="amber"
          value={`${tasksPct}%`}
          label={t('ritual.utsav.dashboard.tasks_done')}
          sub={t('ritual.utsav.dashboard.committee_task_completion')}
        />
        <Stat
          tone={pending > 0 ? 'red' : 'sky'}
          value={inr(pending)}
          label={t('ritual.utsav.dashboard.vendor_payments_pending')}
          sub={pending > 0
            ? t('ritual.utsav.dashboard.settle_before_the_festival_ends')
            : t('ritual.utsav.dashboard.all_vendor_quotes_settled')}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-extrabold text-stone-800 mb-3">{t('ritual.utsav.dashboard.budget_at_a_glance')}</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-stone-500">{t('ritual.utsav.dashboard.planned_income')}</span><span className="font-bold text-emerald-700">{inr(t.plannedIncome)}</span></div>
            <div className="flex justify-between"><span className="text-stone-500">{t('ritual.utsav.dashboard.actual_income')}</span><span className="font-bold">{inr(totals.actualIncome)}</span></div>
            <div className="flex justify-between"><span className="text-stone-500">{t('ritual.utsav.dashboard.planned_expense')}</span><span className="font-bold text-red-700">{inr(totals.plannedExpense)}</span></div>
            <div className="flex justify-between"><span className="text-stone-500">{t('ritual.utsav.dashboard.actual_expense')}</span><span className="font-bold">{inr(totals.actualExpense)}</span></div>
            <div className="flex justify-between border-t border-stone-100 pt-2">
              <span className="text-stone-500">{t('ritual.utsav.dashboard.surplus_deficit_actual')}</span>
              <span className={`font-extrabold ${totals.actualIncome - totals.actualExpense >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {inr(totals.actualIncome - totals.actualExpense)}
              </span>
            </div>
          </div>
        </Card>
        <Card>
          <h3 className="font-extrabold text-stone-800 mb-3">{t('ritual.utsav.dashboard.operations')}</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-stone-500">{t('ritual.utsav.dashboard.safety_checklist')}</span><span className="font-bold">{safetyPct}% {t('ritual.utsav.dashboard.complete')}</span></div>
            <div className="flex justify-between"><span className="text-stone-500">{t('ritual.utsav.dashboard.footfall_recorded')}</span><span className="font-bold">{checkins.toLocaleString('en-IN')} {t('ritual.utsav.dashboard.of')} {fest.expectedFootfall.toLocaleString('en-IN')} {t('ritual.utsav.dashboard.expected')}</span></div>
            <div className="flex justify-between"><span className="text-stone-500">{t('ritual.common.venue')}</span><span className="font-bold">{fest.venue || '—'}</span></div>
            <div className="flex justify-between"><span className="text-stone-500">{t('ritual.utsav.dashboard.deity_occasion')}</span><span className="font-bold">{fest.deity}{fest.occasion ? ` · ${fest.occasion}` : ''}</span></div>
            {fest.expectedFootfall > 500 && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
                🚦 {t('ritual.utsav.dashboard.footfall_above_500_open_the_safe')}
              </div>
            )}
          </div>
        </Card>
      </div>

      <p className="text-[11px] text-stone-400">
        {t('ritual.utsav.dashboard.figuresNote')} {todayISO()}
      </p>
    </div>
  );
};
