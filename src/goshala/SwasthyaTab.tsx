import React, { useMemo, useState } from 'react';
import { useGoshala, uid, todayISO } from './goshalaStore';
import { HealthKind } from './types';
import { Card, Btn, Field, inputCls, Empty, StatusPill, HEALTH_KIND_KEY, labelFor } from './ui';
import { fmtDateEn } from '../pathshala/bn';
import { useInr } from '../hooks/useWorkspaceInr';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

/* Goshala One — Swasthya (health & veterinary): vaccination schedule +
   reminders, treatment log, vet visit records, deworming calendar. */

const KINDS: HealthKind[] = ['vaccination', 'deworming', 'treatment', 'checkup'];

export const SwasthyaTab: React.FC = () => {
  const inr = useInr();
  const { state, add, remove } = useGoshala();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [f, setF] = useState({ nandiId: '', date: todayISO(), kind: 'vaccination' as HealthKind, title: '', details: '', vetName: '', cost: 0, nextDue: '' });
  const [filter, setFilter] = useState('');

  const nameOf = (id: string) => state.nandis.find((n) => n.id === id);
  const sorted = useMemo(() => [...state.health].sort((a, b) => b.date.localeCompare(a.date)).filter((h) => !filter || h.kind === filter), [state.health, filter]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.nandiId || !f.title.trim()) { showToast(t('suites.goshala.swasthya.need'), 'warning'); return; }
    add('health', { id: uid('h'), nandiId: f.nandiId, date: f.date, kind: f.kind, title: f.title.trim(), details: f.details || undefined, vetName: f.vetName || undefined, cost: Number(f.cost) || 0, nextDue: f.nextDue || undefined });
    showToast(t('suites.goshala.swasthya.added'), 'success');
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
        <h2 className="text-lg font-bold text-stone-800">{t('suites.goshala.swasthya.title')}</h2>
        <div className="text-sm bg-stone-100 rounded-xl px-3 py-1.5">{t('suites.goshala.swasthya.monthCost')}: <b>{inr(monthCost)}</b></div>
      </div>

      {dueSoon.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/60">
          <h3 className="font-bold text-amber-900 mb-2">🔔 {t('suites.goshala.swasthya.due14')}</h3>
          <ul className="space-y-1.5 text-sm">
            {dueSoon.map((h) => (
              <li key={h.id} className="flex justify-between"><span><b>{h.title}</b> — {nameOf(h.nandiId)?.name}</span><b className="text-amber-800">{fmtDateEn(h.nextDue!)}</b></li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h3 className="font-bold text-stone-800 mb-3">{t('suites.goshala.swasthya.logEvent')}</h3>
        <form onSubmit={submit} className="grid sm:grid-cols-3 gap-3">
          <Field label={t('suites.goshala.swasthya.animal')}>
            <select className={inputCls} value={f.nandiId} onChange={(e) => setF({ ...f, nandiId: e.target.value })}>
              <option value="">—</option>
              {state.nandis.map((n) => <option key={n.id} value={n.id}>{n.name} ({n.tagId})</option>)}
            </select>
          </Field>
          <Field label={t('suites.goshala.swasthya.date')}><input type="date" className={inputCls} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Field label={t('suites.goshala.swasthya.kind')}>
            <select className={inputCls} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as HealthKind })}>
              {KINDS.map((k) => <option key={k} value={k}>{t(HEALTH_KIND_KEY[k])}</option>)}
            </select>
          </Field>
          <Field label={t('suites.goshala.swasthya.titleLabel')}><input className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder={t('suites.goshala.swasthya.phTitle')} /></Field>
          <Field label={t('suites.goshala.swasthya.vet')}><input className={inputCls} value={f.vetName} onChange={(e) => setF({ ...f, vetName: e.target.value })} /></Field>
          <Field label={t('suites.goshala.swasthya.cost')}><input type="number" min={0} className={inputCls} value={f.cost} onChange={(e) => setF({ ...f, cost: Number(e.target.value) })} /></Field>
          <Field label={t('suites.goshala.swasthya.nextDue')}><input type="date" className={inputCls} value={f.nextDue} onChange={(e) => setF({ ...f, nextDue: e.target.value })} /></Field>
          <Field label={t('suites.goshala.swasthya.details')} className="sm:col-span-2"><input className={inputCls} value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} /></Field>
          <div className="sm:col-span-3"><Btn type="submit">{t('suites.goshala.common.save')}</Btn></div>
        </form>
      </Card>

      <Card>
        <div className="flex gap-2 mb-3 items-center">
          <h3 className="font-bold text-stone-800 mr-auto">{t('suites.goshala.swasthya.healthLog')}</h3>
          <select className={`${inputCls} !w-44`} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">{t('suites.goshala.common.all')}</option>
            {KINDS.map((k) => <option key={k} value={k}>{t(HEALTH_KIND_KEY[k])}</option>)}
          </select>
        </div>
        {sorted.length === 0 ? <Empty text={t('suites.goshala.swasthya.empty')} /> : (
          <ul className="space-y-2">
            {sorted.map((h) => {
              const n = nameOf(h.nandiId);
              return (
                <li key={h.id} className="border border-stone-200 rounded-xl px-3 py-2.5 flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-mono text-xs bg-stone-100 rounded px-1.5 py-0.5">{labelFor(t, HEALTH_KIND_KEY, h.kind)}</span>
                  <span className="font-bold">{h.title}</span>
                  <span className="text-stone-600">— {n?.name} ({n?.tagId})</span>
                  {n && <StatusPill status={n.status} />}
                  <span className="text-stone-500 ml-auto">{fmtDateEn(h.date)}</span>
                  {h.cost > 0 && <span className="font-semibold">{inr(h.cost)}</span>}
                  {h.nextDue && <span className="text-xs text-amber-700">↻ {fmtDateEn(h.nextDue)}</span>}
                  <button className="text-xs font-bold text-red-600 hover:underline" onClick={() => { if (confirm(t('suites.goshala.common.confirmDelete'))) remove('health', h.id); }}>{t('suites.goshala.common.delete')}</button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
};
