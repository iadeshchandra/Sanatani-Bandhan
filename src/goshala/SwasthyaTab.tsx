import React, { useMemo, useState } from 'react';
import { useGoshala, uid, todayISO } from './goshalaStore';
import { HealthKind } from './types';
import { Card, T, Btn, Field, inputCls, Empty, StatusPill, useLocaleText } from './ui';
import { fmtDateEn, inr } from '../pathshala/bn';
import { useToast } from '../context/ToastContext';

/* Goshala One — Swasthya (health & veterinary): vaccination schedule +
   reminders, treatment log, vet visit records, deworming calendar. */

const KINDS: HealthKind[] = ['vaccination', 'deworming', 'treatment', 'checkup'];

export const SwasthyaTab: React.FC = () => {
  const { state, add, remove } = useGoshala();
  const { tr } = useLocaleText();
  const { showToast } = useToast();
  const [f, setF] = useState({ nandiId: '', date: todayISO(), kind: 'vaccination' as HealthKind, title: '', details: '', vetName: '', cost: 0, nextDue: '' });
  const [filter, setFilter] = useState('');

  const nameOf = (id: string) => state.nandis.find((n) => n.id === id);
  const sorted = useMemo(() => [...state.health].sort((a, b) => b.date.localeCompare(a.date)).filter((h) => !filter || h.kind === filter), [state.health, filter]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.nandiId || !f.title.trim()) { showToast(tr('goshala.health.need', 'Select animal and enter a title', 'পশু ও শিরোনাম দিন', 'पशु और शीर्षक दें'), 'warning'); return; }
    add('health', { id: uid('h'), nandiId: f.nandiId, date: f.date, kind: f.kind, title: f.title.trim(), details: f.details || undefined, vetName: f.vetName || undefined, cost: Number(f.cost) || 0, nextDue: f.nextDue || undefined });
    showToast(tr('goshala.health.added', 'Health record saved', 'স্বাস্থ্য রেকর্ড সংরক্ষিত', 'स्वास्थ्य रिकॉर्ड सहेजा गया'), 'success');
    setF({ nandiId: '', date: todayISO(), kind: 'vaccination', title: '', details: '', vetName: '', cost: 0, nextDue: '' });
  };

  const dueSoon = useMemo(() => {
    const today = todayISO();
    const soon = new Date(); soon.setDate(soon.getDate() + 14);
    const soonISO = soon.toISOString().slice(0, 10);
    return state.health.filter((h) => h.nextDue && h.nextDue >= today && h.nextDue <= soonISO).sort((a, b) => a.nextDue!.localeCompare(b.nextDue!));
  }, [state.health]);

  const monthCost = useMemo(() => {
    const mk = todayISO().slice(0, 7);
    return state.health.filter((h) => h.date.startsWith(mk)).reduce((s, h) => s + h.cost, 0);
  }, [state.health]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-stone-800"><T en="Swasthya — health & veterinary" bn="স্বাস্থ্য ও পশু-চিকিৎসা" hi="स्वास्थ्य एवं पशु-चिकित्सा" sa="गवां स्वास्थ्यम्" /></h2>
        <div className="text-sm bg-stone-100 rounded-xl px-3 py-1.5">{tr('goshala.health.month_cost', "This month's vet cost", 'এই মাসের চিকিৎসা খরচ', 'इस माह की चिकित्सा लागत')}: <b>{inr(monthCost)}</b></div>
      </div>

      {dueSoon.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/60">
          <h3 className="font-bold text-amber-900 mb-2">🔔 <T en="Due in next 14 days" bn="আগামী ১৪ দিনে নির্ধারিত" hi="अगले 14 दिनों में नियत" /></h3>
          <ul className="space-y-1.5 text-sm">
            {dueSoon.map((h) => (
              <li key={h.id} className="flex justify-between"><span><b>{h.title}</b> — {nameOf(h.nandiId)?.name}</span><b className="text-amber-800">{fmtDateEn(h.nextDue!)}</b></li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h3 className="font-bold text-stone-800 mb-3"><T en="Log health event" bn="স্বাস্থ্য ঘটনা লিখুন" hi="स्वास्थ्य घटना दर्ज करें" /></h3>
        <form onSubmit={submit} className="grid sm:grid-cols-3 gap-3">
          <Field label={<T en="Animal" bn="পশু" hi="पशु" />}>
            <select className={inputCls} value={f.nandiId} onChange={(e) => setF({ ...f, nandiId: e.target.value })}>
              <option value="">—</option>
              {state.nandis.map((n) => <option key={n.id} value={n.id}>{n.name} ({n.tagId})</option>)}
            </select>
          </Field>
          <Field label={<T en="Date" bn="তারিখ" hi="तिथि" />}><input type="date" className={inputCls} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Field label={<T en="Kind" bn="ধরন" hi="प्रकार" />}>
            <select className={inputCls} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as HealthKind })}>
              {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </Field>
          <Field label={<T en="Title" bn="শিরোনাম" hi="शीर्षक" />}><input className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="FMD vaccination" /></Field>
          <Field label={<T en="Vet / attendant" bn="পশু-চিকিৎসক" hi="पशु-चिकित्सक" />}><input className={inputCls} value={f.vetName} onChange={(e) => setF({ ...f, vetName: e.target.value })} /></Field>
          <Field label={<T en="Cost (₹)" bn="খরচ (₹)" hi="लागत (₹)" />}><input type="number" min={0} className={inputCls} value={f.cost} onChange={(e) => setF({ ...f, cost: Number(e.target.value) })} /></Field>
          <Field label={<T en="Next due (reminder)" bn="পরবর্তী নির্ধারিত তারিখ" hi="अगली नियत तिथि" />}><input type="date" className={inputCls} value={f.nextDue} onChange={(e) => setF({ ...f, nextDue: e.target.value })} /></Field>
          <Field label={<T en="Details" bn="বিবরণ" hi="विवरण" />} className="sm:col-span-2"><input className={inputCls} value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} /></Field>
          <div className="sm:col-span-3"><Btn type="submit">{tr('goshala.save', 'Save', 'সংরক্ষণ', 'सहेजें')}</Btn></div>
        </form>
      </Card>

      <Card>
        <div className="flex gap-2 mb-3 items-center">
          <h3 className="font-bold text-stone-800 mr-auto"><T en="Health log" bn="স্বাস্থ্য লগ" hi="स्वास्थ्य लॉग" /></h3>
          <select className={`${inputCls} !w-44`} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">{tr('goshala.all', 'All', 'সব', 'सभी')}</option>
            {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        {sorted.length === 0 ? <Empty text={tr('goshala.health.empty', 'No health records yet.', 'কোনো স্বাস্থ্য রেকর্ড নেই।', 'कोई स्वास्थ्य रिकॉर्ड नहीं।')} /> : (
          <ul className="space-y-2">
            {sorted.map((h) => {
              const n = nameOf(h.nandiId);
              return (
                <li key={h.id} className="border border-stone-200 rounded-xl px-3 py-2.5 flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-mono text-xs bg-stone-100 rounded px-1.5 py-0.5">{h.kind}</span>
                  <span className="font-bold">{h.title}</span>
                  <span className="text-stone-600">— {n?.name} ({n?.tagId})</span>
                  {n && <StatusPill status={n.status} />}
                  <span className="text-stone-500 ml-auto">{fmtDateEn(h.date)}</span>
                  {h.cost > 0 && <span className="font-semibold">{inr(h.cost)}</span>}
                  {h.nextDue && <span className="text-xs text-amber-700">↻ {fmtDateEn(h.nextDue)}</span>}
                  <button className="text-xs font-bold text-red-600 hover:underline" onClick={() => { if (confirm(tr('goshala.confirm_del', 'Delete this record?', 'মুছবেন?', 'हटाएँ?'))) remove('health', h.id); }}>{tr('goshala.del', 'Delete', 'মুছুন', 'हटाएँ')}</button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
};