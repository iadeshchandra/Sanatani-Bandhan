import React, { useMemo, useState } from 'react';
import { useGoshala, uid } from './goshalaStore';
import { DutyShift, DutyKind } from './types';
import { Card, Btn, Field, inputCls, Empty, DUTY_KIND_KEY } from './ui';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

/* Goshala One — Sevadar roster: duty slots for feeding, cleaning, milking,
   vet-assist and security across morning/evening shifts. */

const DUTIES: DutyKind[] = ['feeding', 'cleaning', 'milking', 'vet-assist', 'security'];

const dutyIcon: Record<DutyKind, string> = {
  feeding: '🌾', cleaning: '🧹', milking: '🥛', 'vet-assist': '⚕️', security: '🛡️',
};

export const RosterTab: React.FC = () => {
  const { state, add, remove } = useGoshala();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [f, setF] = useState({ date: new Date().toISOString().slice(0, 10), shift: 'morning' as DutyShift, duty: 'feeding' as DutyKind, assignee: '', phone: '' });

  const days = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < 7; i++) { const d = new Date(); d.setDate(d.getDate() + i); out.push(d.toISOString().slice(0, 10)); }
    return out;
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.assignee.trim()) { showToast(t('suites.goshala.roster.need'), 'warning'); return; }
    add('duties', { id: uid('du'), date: f.date, shift: f.shift, duty: f.duty, assignee: f.assignee.trim(), phone: f.phone || undefined });
    showToast(t('suites.goshala.common.saved'), 'success');
    setF({ ...f, assignee: '', phone: '' });
  };

  const dayName = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-stone-800">{t('suites.goshala.roster.title')}</h2>

      <Card>
        <h3 className="font-bold text-stone-800 mb-3">{t('suites.goshala.roster.assignDuty')}</h3>
        <form onSubmit={submit} className="grid sm:grid-cols-3 gap-3">
          <Field label={t('suites.goshala.roster.date')}><input type="date" className={inputCls} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Field label={t('suites.goshala.roster.shift')}>
            <select className={inputCls} value={f.shift} onChange={(e) => setF({ ...f, shift: e.target.value as DutyShift })}>
              <option value="morning">{t('suites.goshala.common.morning')}</option>
              <option value="evening">{t('suites.goshala.common.evening')}</option>
            </select>
          </Field>
          <Field label={t('suites.goshala.roster.duty')}>
            <select className={inputCls} value={f.duty} onChange={(e) => setF({ ...f, duty: e.target.value as DutyKind })}>
              {DUTIES.map((d) => <option key={d} value={d}>{dutyIcon[d]} {t(DUTY_KIND_KEY[d])}</option>)}
            </select>
          </Field>
          <Field label={t('suites.goshala.roster.assignee')}><input className={inputCls} value={f.assignee} onChange={(e) => setF({ ...f, assignee: e.target.value })} placeholder={t('suites.goshala.roster.phAssignee')} /></Field>
          <Field label={t('suites.goshala.roster.phone')}><input className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <div className="flex items-end"><Btn type="submit">{t('suites.goshala.roster.assign')}</Btn></div>
        </form>
      </Card>

      <Card>
        <h3 className="font-bold text-stone-800 mb-3">{t('suites.goshala.roster.weekRoster')}</h3>
        {days.every((d) => !state.duties.some((x) => x.date === d)) ? <Empty text={t('suites.goshala.roster.empty')} /> : (
          <div className="space-y-3">
            {days.map((day) => {
              const slots = state.duties.filter((x) => x.date === day);
              if (!slots.length) return null;
              return (
                <div key={day}>
                  <div className="text-sm font-bold text-stone-700 mb-1">{dayName(day)}</div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {(['morning', 'evening'] as DutyShift[]).map((sh) => (
                      <div key={sh} className="border border-stone-200 rounded-xl p-2">
                        <div className="text-xs font-bold text-amber-800 mb-1">{sh === 'morning' ? t('suites.goshala.common.morning') : t('suites.goshala.common.evening')}</div>
                        {slots.filter((x) => x.shift === sh).map((x) => (
                          <div key={x.id} className="flex items-center justify-between text-sm py-0.5">
                            <span>{dutyIcon[x.duty]} <b>{x.assignee}</b> <span className="text-stone-500">· {t(DUTY_KIND_KEY[x.duty])}</span></span>
                            <button className="text-xs text-red-600 font-bold hover:underline" onClick={() => { if (confirm(t('suites.goshala.common.confirmDelete'))) remove('duties', x.id); }}>✕</button>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
