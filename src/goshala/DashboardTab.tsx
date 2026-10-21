import React, { useMemo } from 'react';
import { useGoshala, todayISO } from './goshalaStore';
import { Card, Stat, StatusPill } from './ui';
import { LocalOnlyBadge } from '../components/common/LocalOnlyBadge';
import { fmtDateEn } from '../pathshala/bn';
import { useInr } from '../hooks/useWorkspaceInr';
import { useLanguage } from '../context/LanguageContext';
import { resolveHerdCount } from '../lib/herdCount';

/* Goshala One — dashboard: headcount, sick list, today's milk, fodder
   days-remaining, grant-vs-cost gap, upcoming vaccinations. */

export const DashboardTab: React.FC = () => {
  const inr = useInr();
  const { state, workspaceId } = useGoshala();
  const { t } = useLanguage();
  const today = todayISO();

  const m = useMemo(() => {
    // QUEUED #59 (A4-1): headcount via the ONE herd resolver every
    // surface shares — inside the provider the live suite count is
    // authoritative (this store IS the register of record).
    const headcount = resolveHerdCount(workspaceId, { legacyCowCount: state.nandis.length, liveSuiteCount: state.nandis.length });
    const sick = state.nandis.filter((n) => n.status === 'sick' || n.status === 'quarantine');
    const milking = state.nandis.filter((n) => n.status === 'milking').length;
    const todayMilk = state.milk.filter((r) => r.date === today).reduce((s, r) => s + r.liters, 0);
    // Fodder days-remaining: stock / avg daily use (last 7 days).
    const since = new Date(); since.setDate(since.getDate() - 7);
    const sinceISO = since.toISOString().slice(0, 10);
    const fodderDays = state.fodderItems.map((it) => {
      const used = state.fodderUse.filter((u) => u.itemId === it.id && u.date >= sinceISO).reduce((s, u) => s + u.qty, 0);
      const avg = used / 7;
      return { item: it, days: avg > 0 ? Math.floor(it.stockQty / avg) : 999 };
    });
    const lowest = fodderDays.sort((a, b) => a.days - b.days)[0];
    // Grant gap: (real cost − grant) × headcount.
    const gapPerDay = Math.max(0, state.settings.estCostPerDay - state.settings.grantPerDay);
    const upcomingVax = state.health
      .filter((h) => h.nextDue && h.nextDue >= today)
      .sort((a, b) => a.nextDue!.localeCompare(b.nextDue!))
      .slice(0, 5);
    const overdueVax = state.health.filter((h) => h.nextDue && h.nextDue < today);
    const activeSponsors = state.sponsorships.filter((s) => s.status === 'active').length;
    const expiring = state.sponsorships.filter((s) => s.status === 'expiring');
    const pendingGrants = state.grants.filter((g) => g.status === 'pending' || g.status === 'applied');
    return { headcount, sick, milking, todayMilk, lowest, gapPerDay, upcomingVax, overdueVax, activeSponsors, expiring, pendingGrants };
  }, [state, today]);

  const nandiName = (id: string) => state.nandis.find((n) => n.id === id)?.name || '—';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-stone-800">
          {t('suites.goshala.dashboard.title')}
        </h2>
        <LocalOnlyBadge />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label={t('suites.goshala.dashboard.headcount')} value={m.headcount} sub={t('suites.goshala.dashboard.headcountSub')} tone="amber" />
        <Stat label={t('suites.goshala.dashboard.milkingNow')} value={m.milking} sub={t('suites.goshala.dashboard.milkingSub')} tone="emerald" />
        <Stat label={t('suites.goshala.dashboard.todayMilk')} value={`${m.todayMilk.toFixed(1)} L`} sub={t('suites.goshala.dashboard.todayMilkSub')} tone="sky" />
        <Stat
          label={t('suites.goshala.dashboard.dailyGrantGap')}
          value={inr(m.gapPerDay * m.headcount)}
          sub={t('suites.goshala.dashboard.grantGapSub').replace('{cost}', String(state.settings.estCostPerDay)).replace('{grant}', String(state.settings.grantPerDay))}
          tone="red"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-bold text-stone-800 mb-2">{t('suites.goshala.dashboard.needsAttention')}</h3>
          {m.sick.length === 0 && m.overdueVax.length === 0 && m.expiring.length === 0 ? (
            <p className="text-sm text-emerald-700">{t('suites.goshala.dashboard.allHealthy')}</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {m.sick.map((n) => (
                <li key={n.id} className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  <span className="font-semibold text-red-900">{n.name} <span className="text-red-500 font-normal">({n.tagId})</span></span>
                  <StatusPill status={n.status} />
                </li>
              ))}
              {m.overdueVax.map((h) => (
                <li key={h.id} className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  <span className="text-amber-900">{t('suites.goshala.dashboard.overdue')}: {h.title} — {nandiName(h.nandiId)}</span>
                  <span className="text-xs text-amber-700">{fmtDateEn(h.nextDue!)}</span>
                </li>
              ))}
              {m.expiring.map((s) => (
                <li key={s.id} className="flex items-center justify-between bg-sky-50 border border-sky-200 rounded-xl px-3 py-2">
                  <span className="text-sky-900">{t('suites.goshala.dashboard.sponsorshipExpiring')}: {s.sponsorName}</span>
                  <span className="text-xs text-sky-700">{fmtDateEn(s.endDate)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h3 className="font-bold text-stone-800 mb-2">{t('suites.goshala.dashboard.upcomingVax')}</h3>
          {m.upcomingVax.length === 0 ? (
            <p className="text-sm text-stone-500">{t('suites.goshala.dashboard.nothingScheduled')}</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {m.upcomingVax.map((h) => (
                <li key={h.id} className="flex items-center justify-between border border-stone-200 rounded-xl px-3 py-2">
                  <span><b>{h.title}</b> — {nandiName(h.nandiId)}{h.vetName ? ` · ${h.vetName}` : ''}</span>
                  <span className="text-xs text-stone-600">{fmtDateEn(h.nextDue!)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 pt-3 border-t border-stone-100 grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-stone-500">{t('suites.goshala.dashboard.charaStock')}:</span><br />
              <b className={m.lowest && m.lowest.days < 7 ? 'text-red-700' : 'text-stone-800'}>
                {m.lowest ? `${m.lowest.item.name} — ${t(m.lowest.days === 1 ? 'suites.goshala.dashboard.daysOne' : 'suites.goshala.dashboard.daysMany').replace('{n}', String(m.lowest.days))}` : '—'}
              </b>
            </div>
            <div><span className="text-stone-500">{t('suites.goshala.dashboard.activeSponsors')}:</span><br /><b className="text-stone-800">{m.activeSponsors}</b></div>
            <div><span className="text-stone-500">{t('suites.goshala.dashboard.grantsPending')}:</span><br /><b className="text-stone-800">{m.pendingGrants.length} · {inr(m.pendingGrants.reduce((s, g) => s + g.amountApplied, 0))}</b></div>
            <div><span className="text-stone-500">{t('suites.goshala.dashboard.monthlyGap')}:</span><br /><b className="text-red-700">{inr(m.gapPerDay * m.headcount * 30)}</b></div>
          </div>
        </Card>
      </div>
    </div>
  );
};
