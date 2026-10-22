import React, { useState } from 'react';
import { useTirth, uid, todayISO, nowTime, peakCrowd } from './tirthStore';
import { CROWD_LOCATIONS } from './types';
import { T, Card, Btn, Field, inputCls, Empty } from './ui';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

/* Tirth One — crowd snapshots: headcount recorder through the day,
 * peak-hour readout. Same pattern Utsav One's safety checklist uses. */

export const CrowdTab: React.FC = () => {
  const { state, add, remove } = useTirth();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [location, setLocation] = useState<string>(CROWD_LOCATIONS[0]);
  const [count, setCount] = useState('');
  const [notes, setNotes] = useState('');

  const date = todayISO();
  const todays = state.crowd.filter((c) => c.date === date).sort((a, b) => b.time.localeCompare(a.time));
  const peak = peakCrowd(state, date);

  const record = () => {
    const n = Math.round(Number(count) || 0);
    if (n <= 0) { showToast(t('suites.tirth.crowd.toastNeedCount'), 'warning'); return; }
    add('crowd', {
      id: uid('cr'), date, time: nowTime(), location, count: n,
      recordedAt: new Date().toISOString(), notes: notes.trim() || undefined,
    });
    showToast(t('suites.tirth.crowd.toastRecorded').replace('{count}', String(n)).replace('{location}', location), 'success');
    setCount(''); setNotes('');
  };

  // Simple hourly bar data for today.
  const hours: string[] = [];
  for (let h = 5; h <= 22; h++) hours.push(`${String(h).padStart(2, '0')}:00`);
  const maxFor = (hour: string) => {
    const vals = todays.filter((c) => c.time.slice(0, 2) === hour.slice(0, 2)).map((c) => c.count);
    return vals.length ? Math.max(...vals) : 0;
  };
  const maxAll = Math.max(1, ...hours.map(maxFor));

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-extrabold text-stone-800"><T en="Crowd snapshots" bn="ভিড়ের স্ন্যাপশট" hi="भीड़ स्नैपशॉट" /></h2>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label={<T en="Location" bn="স্থান" hi="स्थान" />}>
            <select className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)}>
              {CROWD_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
          <Field label={<T en="Headcount" bn="মাথাগণনা" hi="सिर गिनती" />}>
            <input type="number" min={1} className={inputCls} value={count} onChange={(e) => setCount(e.target.value)} placeholder="e.g. 450" />
          </Field>
          <Field label={<T en="Note (optional)" bn="মন্তব্য (ঐচ্ছিক)" hi="टिप्पणी (वैकल्पिक)" />}>
            <input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Aarti just ended" />
          </Field>
        </div>
        <div className="mt-3">
          <Btn onClick={record}>📸 <T en="Record snapshot" bn="স্ন্যাপশট নিন" hi="स्नैपशॉट दर्ज करें" /></Btn>
        </div>
      </Card>

      <Card>
        <h3 className="font-extrabold text-stone-800 mb-2"><T en="Today's crowd curve" bn="আজকের ভিড়ের গ্রাফ" hi="आज का भीड़ ग्राफ" /></h3>
        {peak && <p className="text-sm text-stone-600 mb-3">Peak: <span className="font-extrabold text-teal-700">{peak.count}</span> at <span className="font-bold">{peak.hour}</span></p>}
        <div className="flex items-end gap-1 h-32 no-print" aria-hidden>
          {hours.map((h) => {
            const v = maxFor(h);
            return (
              <div key={h} className="flex-1 flex flex-col items-center justify-end gap-1" title={`${h}: ${v}`}>
                <div className="w-full rounded-t bg-teal-500/80" style={{ height: `${Math.max(2, (v / maxAll) * 100)}%` }} />
                <span className="text-[9px] text-stone-400">{h.slice(0, 2)}</span>
              </div>
            );
          })}
        </div>
        {todays.length === 0 && <Empty text={t('suites.tirth.crowd.empty')} />}
      </Card>

      {todays.length > 0 && (
        <Card>
          <h3 className="font-extrabold text-stone-800 mb-2"><T en="Snapshots" bn="স্ন্যাপশট" hi="स्नैपशॉट" /></h3>
          <div className="space-y-1.5">
            {todays.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg bg-stone-50 px-3 py-2 text-sm">
                <span><span className="font-mono font-bold">{c.time}</span> · {c.location}{c.notes ? ` · ${c.notes}` : ''}</span>
                <span className="flex items-center gap-2">
                  <span className="font-extrabold text-teal-700">{c.count}</span>
                  <button onClick={() => { remove('crowd', c.id); showToast(t('suites.tirth.crowd.toastRemoved'), 'success'); }} className="text-xs font-bold text-red-600 underline min-h-[44px] px-2 no-print">Remove</button>
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
