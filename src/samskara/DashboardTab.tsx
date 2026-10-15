import React from 'react';
import { useSamskara, allReminders, familyMembers } from './samskaraStore';
import { Card, Stat, Btn, Empty, fmtDate, T, useTr } from './ui';
import { useLanguage } from '../context/LanguageContext';

/* Samskara One — Dashboard. A quiet overview of the family's sacred
 * record: families, members, samskaras chronicled, and gentle
 * upcoming remembrances. */

export const DashboardTab: React.FC<{ goTab: (t: string) => void }> = ({ goTab }) => {
  const { state } = useSamskara();
  const { t } = useLanguage();
  const tr = useTr();
  const reminders = allReminders(state, tr).slice(0, 5);
  const completedCount = state.records.filter((r) => r.status === 'completed').length;
  const plannedCount = state.plans.length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat
          label={<T k="suites.samskara.dashboard.statFamilies" en="Families" />}
          value={state.families.length}
          tone="maroon"
        />
        <Stat
          label={<T k="suites.samskara.dashboard.statMembers" en="Family members" />}
          value={state.members.length}
          tone="gold"
        />
        <Stat
          label={<T k="suites.samskara.dashboard.statChronicled" en="Samskaras chronicled" />}
          value={completedCount}
          tone="sage"
        />
        <Stat
          label={<T k="suites.samskara.dashboard.statPlanned" en="Ceremonies planned" />}
          value={plannedCount}
          tone="stone"
        />
      </div>

      <Card>
        <h3 className="font-bold text-stone-800 mb-3">
          {t('suites.samskara.dashboard.upcoming')}
        </h3>
        {reminders.length === 0 ? (
          <Empty text={t('suites.samskara.dashboard.noReminders')} />
        ) : (
          <div className="space-y-2">
            {reminders.map((r) => (
              <div
                key={r.id}
                className={`rounded-xl border px-4 py-3 ${r.gentle ? 'border-stone-200 bg-stone-50' : 'border-amber-200 bg-amber-50/60'}`}
              >
                <div className="text-sm font-bold text-stone-800">{r.title}</div>
                <div className="text-xs text-stone-500 mt-0.5">{r.detail}</div>
              </div>
            ))}
          </div>
        )}
        {reminders.length > 0 && (
          <Btn variant="ghost" className="mt-3" onClick={() => goTab('reminders')}>
            {t('suites.samskara.dashboard.viewAll')}
          </Btn>
        )}
      </Card>

      {state.families.length === 0 ? (
        <Card className="text-center py-8">
          <div className="text-4xl mb-3">🪔</div>
          <h3 className="font-bold text-stone-800 mb-2">
            {t('suites.samskara.dashboard.begin')}
          </h3>
          <p className="text-sm text-stone-500 mb-4 max-w-md mx-auto">
            {t('suites.samskara.dashboard.beginBody')}
          </p>
          <Btn onClick={() => goTab('family')}>
            {t('suites.samskara.dashboard.beginCta')}
          </Btn>
        </Card>
      ) : (
        <Card>
          <h3 className="font-bold text-stone-800 mb-3">
            {t('suites.samskara.dashboard.families')}
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {state.families.map((f) => {
              const members = familyMembers(state, f.id);
              return (
                <button
                  key={f.id}
                  onClick={() => goTab('family')}
                  className="text-left rounded-xl border border-stone-200 hover:border-rose-300 bg-stone-50/50 p-4 transition min-h-[44px]"
                >
                  <div className="font-bold text-stone-800">{f.name}</div>
                  <div className="text-xs text-stone-500 mt-1">
                    {members.length} {t('suites.samskara.dashboard.memberCount')}
                    {f.gotra ? ` · ${t('suites.samskara.common.gotra')}: ${f.gotra}` : ''}
                  </div>
                  {members.slice(0, 3).map((m) => (
                    <div key={m.id} className="text-xs text-stone-600 mt-0.5">
                      {m.name}{m.birthDate ? ` · ${fmtDate(m.birthDate)}` : ''}
                    </div>
                  ))}
                </button>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
};
