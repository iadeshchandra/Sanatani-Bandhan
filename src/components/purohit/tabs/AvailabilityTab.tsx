/** Weekly availability slots. Public so devotees see when you're free. */
import React, { useEffect, useState } from 'react';
import { usePurohit } from '../../../context/PurohitContext';
import { WEEK_DAYS, DAY_PARTS } from '../../../types/purohit';
import { Card, SectionTitle, PrimaryButton } from '../ui';
import { useLanguage } from '../../../context/LanguageContext';
import { friendlyError } from '../../../lib/friendlyError';

const getDayLabels = (t: (k: string) => string): Record<string, string> => ({
  mon: t('purohit.availability.days.mon'),
  tue: t('purohit.availability.days.tue'),
  wed: t('purohit.availability.days.wed'),
  thu: t('purohit.availability.days.thu'),
  fri: t('purohit.availability.days.fri'),
  sat: t('purohit.availability.days.sat'),
  sun: t('purohit.availability.days.sun'),
});
const getPartLabels = (t: (k: string) => string): Record<string, string> => ({
  morning: t('purohit.availability.parts.morning'),
  afternoon: t('purohit.availability.parts.afternoon'),
  evening: t('purohit.availability.parts.evening'),
});

export const AvailabilityTab: React.FC = () => {
  const { t } = useLanguage();
  const { availability, saveAvailability } = usePurohit();
  const DAY_LABELS = getDayLabels(t);
  const PART_LABELS = getPartLabels(t);
  const [slots, setSlots] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (availability) {
      setSlots(availability.slots || {});
      setDirty(false);
    }
  }, [availability]);

  const toggle = (key: string) => {
    setSlots((s) => ({ ...s, [key]: !s[key] }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveAvailability(slots);
      setDirty(false);
    } catch (e: any) {
      console.error(e);
      alert(friendlyError(e, t, 'save'));
    } finally {
      setSaving(false);
    }
  };

  const setAll = (v: boolean) => {
    const next: Record<string, boolean> = {};
    WEEK_DAYS.forEach((d) => DAY_PARTS.forEach((p) => (next[`${d}-${p}`] = v)));
    setSlots(next);
    setDirty(true);
  };

  return (
    <div className="space-y-4">
      <SectionTitle sub={t('purohit.availability.titleSub')}>
        {t('purohit.availability.title')}
      </SectionTitle>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setAll(true)}
          className="px-3 py-2 rounded-lg bg-stone-100 text-xs font-bold text-stone-700 min-h-[44px]"
        >
          {t('purohit.availability.selectAll')}
        </button>
        <button
          type="button"
          onClick={() => setAll(false)}
          className="px-3 py-2 rounded-lg bg-stone-100 text-xs font-bold text-stone-700 min-h-[44px]"
        >
          {t('purohit.availability.clearAll')}
        </button>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left text-[11px] uppercase tracking-wide text-stone-400 pb-2">{t('purohit.availability.day')}</th>
                {DAY_PARTS.map((p) => (
                  <th key={p} className="text-[11px] uppercase tracking-wide text-stone-400 pb-2 text-center">
                    {PART_LABELS[p]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {WEEK_DAYS.map((d) => (
                <tr key={d} className="border-t border-stone-100">
                  <td className="py-2.5 font-bold text-stone-700 text-xs">{DAY_LABELS[d]}</td>
                  {DAY_PARTS.map((p) => {
                    const key = `${d}-${p}`;
                    const on = !!slots[key];
                    return (
                      <td key={key} className="text-center py-2">
                        <button
                          type="button"
                          onClick={() => toggle(key)}
                          aria-pressed={on}
                          aria-label={`${DAY_LABELS[d]} ${PART_LABELS[p]} ${on ? t('purohit.availability.available') : t('purohit.availability.unavailable')}`}
                          className={`w-11 h-11 rounded-xl border-2 font-black text-xs transition-all ${
                            on
                              ? 'bg-emerald-500 border-emerald-600 text-white shadow-sm'
                              : 'bg-stone-50 border-stone-200 text-stone-300'
                          }`}
                        >
                          {on ? '✓' : '–'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <PrimaryButton className="w-full" disabled={!dirty || saving} onClick={save}>
        {saving ? t('purohit.availability.saving') : dirty ? t('purohit.availability.saveAvailability') : t('purohit.availability.saved')}
      </PrimaryButton>
    </div>
  );
};
