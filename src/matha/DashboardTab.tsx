import React from 'react';
import { useMatha, livingSannyasis, todaysDinacharya, upcomingObservances, dakshinaTotal, displayName } from './mathaStore';
import { Card, Stat, fmtTime, fmtMonthDay } from './ui';
import { useInr } from '../hooks/useWorkspaceInr';
import { useLanguage } from '../context/LanguageContext';

/* Dashboard — residents, today's dinacharya, upcoming observances, branches. */

export const DashboardTab: React.FC = () => {
  const inr = useInr();
  const { state } = useMatha();
  const { t } = useLanguage();
  const residents = livingSannyasis(state);
  const today = todaysDinacharya(state);
  const upcoming = upcomingObservances(state).slice(0, 5);
  const students = state.students.filter((s) => s.status === 'studying');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label={t('suites.matha.dashboard.statResidents')} value={residents.length} sub={t('suites.matha.dashboard.statResidentsSub')} />
        <Stat label={t('suites.matha.dashboard.statStudents')} value={students.length} sub={t('suites.matha.dashboard.statStudentsSub')} tone="amber" />
        <Stat label={t('suites.matha.dashboard.statBranches')} value={state.branches.length} sub={t('suites.matha.dashboard.statBranchesSub')} tone="sky" />
        <Stat label={t('suites.matha.dashboard.statDakshina')} value={inr(dakshinaTotal(state))} sub={t('suites.matha.dashboard.statDakshinaSub')} tone="stone" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-extrabold text-stone-800 mb-3">
            {t('suites.matha.dashboard.todaysDinacharya')}
          </h3>
          {today.length === 0 && (
            <p className="text-sm text-stone-400">
              {t('suites.matha.dashboard.noRoutine')}
            </p>
          )}
          <div className="space-y-2">
            {today.map((d) => (
              <div key={d.id} className="flex items-center gap-3 py-1.5 border-b border-stone-100 last:border-0">
                <span className="font-mono font-bold text-orange-800 text-sm w-20 shrink-0">{fmtTime(d.time)}</span>
                <span className="text-sm text-stone-700 font-medium">{d.activity}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-extrabold text-stone-800 mb-3">
            {t('suites.matha.dashboard.upcomingObservances')}
          </h3>
          {upcoming.length === 0 && (
            <p className="text-sm text-stone-400">
              {t('suites.matha.dashboard.noObservances')}
            </p>
          )}
          <div className="space-y-2">
            {upcoming.map(({ o, date, inDays }) => (
              <div key={o.id} className="flex items-center justify-between py-1.5 border-b border-stone-100 last:border-0">
                <div>
                  <div className="text-sm font-bold text-stone-800">{o.name}</div>
                  <div className="text-xs text-stone-500">{fmtMonthDay(o.monthDay)}</div>
                </div>
                <span className="text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-2.5 py-1">
                  {inDays === 0 ? t('suites.matha.common.today') : t('suites.matha.common.days').replace('{days}', String(inDays))}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {residents.length > 0 && (
        <Card>
          <h3 className="font-extrabold text-stone-800 mb-3">
            {t('suites.matha.dashboard.residentSannyasis')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {residents.map((s) => (
              <span key={s.id} className="text-sm bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 font-semibold text-orange-900">
                {displayName(s)}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
