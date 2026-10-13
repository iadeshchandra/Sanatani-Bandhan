/** Weekly availability slots. Public so devotees see when you're free. */
import React, { useEffect, useState } from 'react';
import { usePurohit } from '../../../context/PurohitContext';
import { WEEK_DAYS, DAY_PARTS } from '../../../types/purohit';
import { Card, SectionTitle, PrimaryButton } from '../ui';

const DAY_LABELS: Record<string, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};
const PART_LABELS: Record<string, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
};

export const AvailabilityTab: React.FC = () => {
  const { availability, saveAvailability } = usePurohit();
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
      alert(e.message || 'Could not save');
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
      <SectionTitle sub="Devotees see these slots when considering you for a ritual.">
        Weekly availability
      </SectionTitle>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setAll(true)}
          className="px-3 py-2 rounded-lg bg-stone-100 text-xs font-bold text-stone-700 min-h-[44px]"
        >
          Select all
        </button>
        <button
          type="button"
          onClick={() => setAll(false)}
          className="px-3 py-2 rounded-lg bg-stone-100 text-xs font-bold text-stone-700 min-h-[44px]"
        >
          Clear all
        </button>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left text-[11px] uppercase tracking-wide text-stone-400 pb-2">Day</th>
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
                          aria-label={`${DAY_LABELS[d]} ${PART_LABELS[p]} ${on ? 'available' : 'unavailable'}`}
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
        {saving ? 'Saving…' : dirty ? 'Save availability' : 'Saved'}
      </PrimaryButton>
    </div>
  );
};
