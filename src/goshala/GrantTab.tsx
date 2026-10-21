import React, { useMemo, useState } from 'react';
import { useGoshala, uid } from './goshalaStore';
import { GrantStatus } from './types';
import { Card, Stat, Btn, Field, inputCls, Empty, GRANT_STATUS_KEY, labelFor } from './ui';
import { fmtDateEn } from '../pathshala/bn';
import { useInr } from '../hooks/useWorkspaceInr';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

/* Goshala One — Grant & scheme tracker: government goshala grants and
   subsidies applied / approved / received / pending. The ₹50/day/animal
   support (and its pending dues) is the #1 pain point per research. */

const STATUSES: GrantStatus[] = ['applied', 'pending', 'approved', 'received', 'rejected'];

export const GrantTab: React.FC = () => {
  const inr = useInr();
  const { state, add, update, remove } = useGoshala();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [f, setF] = useState({ scheme: '', authority: '', appliedDate: new Date().toISOString().slice(0, 10), status: 'applied' as GrantStatus, amountApplied: 0, amountReceived: 0, notes: '' });

  const totals = useMemo(() => ({
    applied: state.grants.reduce((s, g) => s + g.amountApplied, 0),
    received: state.grants.reduce((s, g) => s + g.amountReceived, 0),
    pending: state.grants.filter((g) => g.status === 'pending' || g.status === 'applied').reduce((s, g) => s + (g.amountApplied - g.amountReceived), 0),
  }), [state.grants]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.scheme.trim()) { showToast(t('suites.goshala.grant.need'), 'warning'); return; }
    add('grants', { id: uid('g'), scheme: f.scheme.trim(), authority: f.authority || undefined, appliedDate: f.appliedDate, status: f.status, amountApplied: Number(f.amountApplied) || 0, amountReceived: Number(f.amountReceived) || 0, notes: f.notes || undefined });
    showToast(t('suites.goshala.common.saved'), 'success');
    setF({ scheme: '', authority: '', appliedDate: new Date().toISOString().slice(0, 10), status: 'applied', amountApplied: 0, amountReceived: 0, notes: '' });
  };

  const statusTone = (s: GrantStatus) =>
    s === 'received' ? 'bg-emerald-100 text-emerald-800' : s === 'rejected' ? 'bg-red-100 text-red-800' : s === 'approved' ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-800';

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-stone-800">{t('suites.goshala.grant.title')}</h2>

      <div className="grid grid-cols-3 gap-3">
        <Stat label={t('suites.goshala.grant.claimed')} value={inr(totals.applied)} tone="sky" />
        <Stat label={t('suites.goshala.grant.received')} value={inr(totals.received)} tone="emerald" />
        <Stat label={t('suites.goshala.grant.pendingDues')} value={inr(totals.pending)} sub={t('suites.goshala.grant.followUp')} tone="red" />
      </div>

      <Card>
        <h3 className="font-bold text-stone-800 mb-3">{t('suites.goshala.grant.trackScheme')}</h3>
        <form onSubmit={submit} className="grid sm:grid-cols-3 gap-3">
          <Field label={t('suites.goshala.grant.scheme')}><input className={inputCls} value={f.scheme} onChange={(e) => setF({ ...f, scheme: e.target.value })} placeholder={t('suites.goshala.grant.phScheme')} /></Field>
          <Field label={t('suites.goshala.grant.authority')}><input className={inputCls} value={f.authority} onChange={(e) => setF({ ...f, authority: e.target.value })} placeholder={t('suites.goshala.grant.phAuthority')} /></Field>
          <Field label={t('suites.goshala.grant.appliedOn')}><input type="date" className={inputCls} value={f.appliedDate} onChange={(e) => setF({ ...f, appliedDate: e.target.value })} /></Field>
          <Field label={t('suites.goshala.grant.status')}>
            <select className={inputCls} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as GrantStatus })}>
              {STATUSES.map((s) => <option key={s} value={s}>{t(GRANT_STATUS_KEY[s])}</option>)}
            </select>
          </Field>
          <Field label={t('suites.goshala.grant.amountClaimed')}><input type="number" min={0} className={inputCls} value={f.amountApplied || ''} onChange={(e) => setF({ ...f, amountApplied: Number(e.target.value) })} /></Field>
          <Field label={t('suites.goshala.grant.amountReceived')}><input type="number" min={0} className={inputCls} value={f.amountReceived || ''} onChange={(e) => setF({ ...f, amountReceived: Number(e.target.value) })} /></Field>
          <Field label={t('suites.goshala.grant.notes')} className="sm:col-span-3"><input className={inputCls} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
          <div className="sm:col-span-3"><Btn type="submit">{t('suites.goshala.common.saved')}</Btn></div>
        </form>
      </Card>

      <Card>
        <h3 className="font-bold text-stone-800 mb-3">{t('suites.goshala.grant.schemeRegister')}</h3>
        {state.grants.length === 0 ? <Empty text="—" /> : (
          <ul className="space-y-2">
            {[...state.grants].sort((a, b) => b.appliedDate.localeCompare(a.appliedDate)).map((g) => (
              <li key={g.id} className="border border-stone-200 rounded-xl px-3 py-2.5 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{g.scheme}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${statusTone(g.status)}`}>{labelFor(t, GRANT_STATUS_KEY, g.status)}</span>
                  <span className="ml-auto text-stone-500">{fmtDateEn(g.appliedDate)}</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600 mt-1">
                  {g.authority && <span>{g.authority}</span>}
                  <span>{t('suites.goshala.grant.claimed')}: <b>{inr(g.amountApplied)}</b></span>
                  <span>{t('suites.goshala.grant.received')}: <b className="text-emerald-700">{inr(g.amountReceived)}</b></span>
                  {g.notes && <span className="w-full text-stone-500">{g.notes}</span>}
                </div>
                <div className="flex gap-2 mt-2">
                  <select className="text-xs border border-stone-300 rounded-lg px-2 py-1" value={g.status} onChange={(e) => update('grants', g.id, { status: e.target.value as GrantStatus })}>
                    {STATUSES.map((s) => <option key={s} value={s}>{t(GRANT_STATUS_KEY[s])}</option>)}
                  </select>
                  <button className="text-xs font-bold text-red-600 hover:underline" onClick={() => { if (confirm(t('suites.goshala.common.confirmDelete'))) remove('grants', g.id); }}>{t('suites.goshala.common.delete')}</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};
