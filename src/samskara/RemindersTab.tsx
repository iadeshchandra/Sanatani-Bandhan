import React from 'react';
import { useSamskara, allReminders, Reminder } from './samskaraStore';
import { Card, Empty, useTr } from './ui';
import { useLanguage } from '../context/LanguageContext';

/* Samskara One — Reminders. Gentle, never urgent: age-based samskara
 * nudges, annual shraddha remembrance, and upcoming ceremonies.
 * Quiet by design — this is remembrance, not notification spam. */

const KIND_ICON: Record<Reminder['kind'], string> = {
  'samskara-age': '🌱',
  'shraddha': '🪔',
  'ceremony': '📿',
};

export const RemindersTab: React.FC = () => {
  const { state } = useSamskara();
  const { t } = useLanguage();
  const tr = useTr();
  const reminders = allReminders(state, tr);

  const groups: Array<{ kind: Reminder['kind']; title: string }> = [
    {
      kind: 'shraddha',
      title: t('suites.samskara.reminders.shraddha'),
    },
    {
      kind: 'ceremony',
      title: t('suites.samskara.reminders.ceremony'),
    },
    {
      kind: 'samskara-age',
      title: t('suites.samskara.reminders.age'),
    },
  ];

  if (reminders.length === 0) {
    return (
      <Empty text={t('suites.samskara.reminders.empty')} />
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((g) => {
        const items = reminders.filter((r) => r.kind === g.kind);
        if (items.length === 0) return null;
        return (
          <div key={g.kind}>
            <h3 className="text-sm font-bold text-stone-600 mb-2 px-1">{g.title}</h3>
            <div className="space-y-2">
              {items.map((r) => (
                <Card key={r.id} className={r.gentle ? 'border-stone-200 bg-stone-50/60' : ''}>
                  <div className="flex gap-3">
                    <div className="text-2xl shrink-0">{KIND_ICON[r.kind]}</div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-stone-800">{r.title}</div>
                      <div className="text-xs text-stone-500 mt-1 leading-relaxed">{r.detail}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      <p className="text-[11px] text-stone-400 italic text-center px-4 pt-2">
        {t('suites.samskara.reminders.footnote')}
      </p>
    </div>
  );
};
