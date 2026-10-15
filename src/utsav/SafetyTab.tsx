import React, { useState } from 'react';
import { useUtsav, uid, todayISO } from './utsavStore';
import { SafetyItem, SAFETY_CATEGORIES } from './types';
import { Card, Btn, Field, Modal, inputCls, Empty, fmtDate } from './ui';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

/* Utsav One — crowd & safety checklist + gate check-in counts.
 *
 * Footfall above 500 triggers the Seva Suggestions gate check-in nudge;
 * this tab owns the checklist and the recorded counts. */

const blank: Omit<SafetyItem, 'id' | 'festivalId'> = {
  item: '', category: SAFETY_CATEGORIES[0], done: false, owner: '', notes: '',
};

export const SafetyTab: React.FC = () => {
  const { t } = useLanguage();
  const { state, add, update, remove } = useUtsav();
  const { showToast } = useToast();
  const [festivalId, setFestivalId] = useState(state.festivals[0]?.id || '');
  const [editing, setEditing] = useState<SafetyItem | null>(null);
  const [form, setForm] = useState(blank);
  const [gate, setGate] = useState('Main Gate');
  const [count, setCount] = useState('');

  const fest = state.festivals.find((f) => f.id === festivalId) || state.festivals[0];
  if (!fest) return <Card><Empty text={t('ritual.utsav.safety.empty_add_a_festival_first_then_run_it')} /></Card>;

  const items = state.safety.filter((s) => s.festivalId === fest.id);
  const checkins = state.checkins.filter((c) => c.festivalId === fest.id).sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  const total = checkins.reduce((s, c) => s + c.count, 0);
  const donePct = items.length ? Math.round((items.filter((i) => i.done).length / items.length) * 100) : 0;

  const openNew = () => { setForm(blank); setEditing({ ...blank, id: '', festivalId: fest.id } as SafetyItem); };
  const save = () => {
    if (!form.item.trim()) { showToast(t('ritual.utsav.safety.toastItemRequired'), 'error'); return; }
    if (editing && editing.id) { update('safety', editing.id, { ...form }); showToast(t('ritual.utsav.safety.toastUpdated'), 'success'); }
    else { add('safety', { ...form, id: uid('sf'), festivalId: fest.id }); showToast(t('ritual.utsav.safety.toastAdded'), 'success'); }
    setEditing(null);
  };

  const recordCheckin = () => {
    const n = Math.floor(Number(count) || 0);
    if (n <= 0) { showToast(t('ritual.utsav.safety.toastNeedHeadcount'), 'warning'); return; }
    if (!gate.trim()) { showToast(t('ritual.utsav.safety.toastNeedGate'), 'warning'); return; }
    add('checkins', { id: uid('ck'), festivalId: fest.id, date: todayISO(), gate: gate.trim(), count: n, recordedAt: new Date().toISOString() });
    setCount('');
    showToast(t('ritual.utsav.safety.toastCountRecorded').replace('{count}', n.toLocaleString('en-IN')).replace('{gate}', gate.trim()), 'success');
  };

  const byCat: Record<string, SafetyItem[]> = {};
  for (const i of items) { (byCat[i.category] = byCat[i.category] || []).push(i); }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Field label={t('ritual.common.festival')}>
          <select className="w-full sm:w-80 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm min-h-[44px]"
            value={fest.id} onChange={(e) => setFestivalId(e.target.value)}>
            {state.festivals.map((f) => <option key={f.id} value={f.id}>{f.name} · {fmtDate(f.startDate)}</option>)}
          </select>
        </Field>
        <Btn onClick={openNew}>＋ {t('ritual.utsav.safety.add_checklist_item')}</Btn>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-extrabold text-stone-800 mb-1">
            {t('ritual.utsav.dashboard.safety_checklist')}
            <span className="ml-2 text-xs font-normal text-stone-500">{donePct}% {t('ritual.utsav.dashboard.complete')}</span>
          </h3>
          <div className="h-2 rounded-full bg-stone-100 overflow-hidden mb-3 no-print">
            <div className="h-full bg-gradient-to-r from-orange-600 to-red-700 transition-all" style={{ width: `${donePct}%` }} />
          </div>
          {items.length === 0 && <Empty text={t('ritual.utsav.safety.empty_no_checklist_items_yet')} />}
          {Object.keys(byCat).sort().map((cat) => (
            <div key={cat} className="mb-3">
              <div className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-1">{cat}</div>
              <div className="space-y-1.5">
                {byCat[cat].map((i) => (
                  <div key={i.id} className="flex items-center gap-2 rounded-xl border border-stone-100 px-3 py-2">
                    <input
                      type="checkbox" checked={i.done} onChange={() => update('safety', i.id, { done: !i.done })}
                      className="w-5 h-5 accent-orange-700 shrink-0" aria-label={i.item}
                    />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-semibold ${i.done ? 'line-through text-stone-400' : 'text-stone-800'}`}>{i.item}</div>
                      {i.owner && <div className="text-[11px] text-stone-500">{t('ritual.utsav.safety.owner')}: {i.owner}</div>}
                    </div>
                    <button onClick={() => { remove('safety', i.id); showToast(t('ritual.utsav.safety.toastRemoved'), 'success'); }}
                      className="text-stone-400 hover:text-red-600 text-lg leading-none px-2 py-2 no-print" aria-label={t('ritual.utsav.safety.removeTitle')}>🗑</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Card>

        <div className="space-y-4">
          <Card>
            <h3 className="font-extrabold text-stone-800 mb-3">
              {t('ritual.utsav.safety.gate_check_in_counts')}
              <span className="ml-2 text-xs font-normal text-stone-500">{t('ritual.utsav.safety.total')}: {total.toLocaleString('en-IN')} / {fest.expectedFootfall.toLocaleString('en-IN')}</span>
            </h3>
            <div className="flex flex-wrap gap-2 no-print">
              <input className={`${inputCls} !w-36`} value={gate} onChange={(e) => setGate(e.target.value)} placeholder={t('ritual.utsav.safety.gateNamePh')} aria-label="Gate name" />
              <input type="number" min={1} className={`${inputCls} !w-32`} value={count} onChange={(e) => setCount(e.target.value)} placeholder={t('ritual.utsav.safety.headcountPh')} aria-label="Headcount" />
              <Btn onClick={recordCheckin}>📋 {t('ritual.utsav.safety.record')}</Btn>
            </div>
            {checkins.length === 0 && <p className="text-xs text-stone-400 mt-3">{t('ritual.utsav.safety.no_counts_recorded_yet')}</p>}
            <div className="mt-3 space-y-1.5 max-h-64 overflow-y-auto">
              {checkins.map((c) => (
                <div key={c.id} className="flex justify-between text-sm rounded-lg bg-stone-50 px-3 py-2">
                  <span className="font-semibold text-stone-700">{c.gate} <span className="text-stone-400 font-normal">· {fmtDate(c.date)}</span></span>
                  <span className="font-extrabold text-orange-800">{c.count.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="font-extrabold text-stone-800 mb-2">🚦 {t('ritual.utsav.safety.crowd_guidance')}</h3>
            <p className="text-xs text-stone-600">
              {t('ritual.utsav.safety.crowdGuidanceLong')}
            </p>
          </Card>
        </div>
      </div>

      {editing && (
        <Modal title={t('ritual.utsav.safety.add_checklist_item')} onClose={() => setEditing(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t('ritual.utsav.safety.item')} className="sm:col-span-2">
              <input className={inputCls} value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} placeholder="Barricades at main gate" />
            </Field>
            <Field label={t('ritual.utsav.safety.category')}>
              <select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {SAFETY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label={t('ritual.utsav.safety.owner')}>
              <input className={inputCls} value={form.owner || ''} onChange={(e) => setForm({ ...form, owner: e.target.value })} placeholder={t('ritual.utsav.safety.volunteerNamePh')} />
            </Field>
            <Field label={t('ritual.common.notes')} className="sm:col-span-2">
              <input className={inputCls} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
          </div>
          <div className="flex gap-2 mt-4">
            <Btn onClick={save}>{t('ritual.common.save')}</Btn>
            <Btn variant="ghost" onClick={() => setEditing(null)}>{t('ritual.common.cancel')}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
