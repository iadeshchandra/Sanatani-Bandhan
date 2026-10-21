import React, { useMemo, useState } from 'react';
import { useGoshala, uid, todayISO } from './goshalaStore';
import { MilkSession, DisposalKind } from './types';
import { Card, Btn, Field, inputCls, Empty, DISPOSAL_KIND_KEY, labelFor } from './ui';
import { fmtDateEn, inr } from '../pathshala/bn';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { SampleBadge } from '../components/common/SampleBadge';
import { SampleEraBar } from '../components/common/SampleEraBar';
import { isSampleEraMilkRow } from '../lib/sampleData';

/* Goshala One — Dugdha (milk ledger): daily yield per animal, session-wise
   entry, disposal (sold / distributed / donated), simple lactation view. */

const KINDS: DisposalKind[] = ['sold', 'distributed', 'donated', 'consumed'];

export const DugdhaTab: React.FC = () => {
  const { state, add, remove } = useGoshala();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [f, setF] = useState({ nandiId: '', date: todayISO(), session: 'morning' as MilkSession, liters: 0 });
  const [d, setD] = useState({ date: todayISO(), liters: 0, kind: 'sold' as DisposalKind, amount: 0, party: '' });

  const milking = useMemo(() => state.nandis.filter((n) => n.status === 'milking'), [state.nandis]);
  const nameOf = (id: string) => state.nandis.find((n) => n.id === id)?.name || '—';

  const addMilk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.nandiId || !(f.liters > 0)) { showToast(t('suites.goshala.dugdha.need'), 'warning'); return; }
    if (state.milk.some((r) => r.nandiId === f.nandiId && r.date === f.date && r.session === f.session)) {
      showToast(t('suites.goshala.dugdha.dup'), 'warning'); return;
    }
    add('milk', { id: uid('ml'), nandiId: f.nandiId, date: f.date, session: f.session, liters: Number(f.liters) });
    showToast(t('suites.goshala.dugdha.added'), 'success');
    setF({ ...f, nandiId: '', liters: 0 });
  };

  const addDisposal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!(d.liters > 0)) { showToast(t('suites.goshala.dugdha.needLitres'), 'warning'); return; }
    add('disposals', { id: uid('md'), date: d.date, liters: Number(d.liters), kind: d.kind, amount: Number(d.amount) || 0, party: d.party || undefined });
    showToast(t('suites.goshala.common.saved'), 'success');
    setD({ date: todayISO(), liters: 0, kind: 'sold', amount: 0, party: '' });
  };

  const recent = useMemo(() => [...state.milk].sort((a, b) => b.date.localeCompare(a.date) || b.session.localeCompare(a.session)).slice(0, 20), [state.milk]);

  // QUEUED #59 (sample-era review): milk rows the old sample seed left
  // behind — identifiable with certainty because they reference a
  // buildSeed nandi (n_1…n_8) that is no longer in the herd. Badged in
  // the list below; removable in one tap. Real rows can never match.
  const liveNandiIds = useMemo(() => new Set(state.nandis.map((n) => n.id)), [state.nandis]);
  const eraMilk = useMemo(
    () => state.milk.filter((r) => isSampleEraMilkRow(r, liveNandiIds)),
    [state.milk, liveNandiIds],
  );
  const disposals = useMemo(() => [...state.disposals].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12), [state.disposals]);

  // 7-day lactation view per milking animal.
  const lact = useMemo(() => {
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) { const dt = new Date(); dt.setDate(dt.getDate() - i); days.push(dt.toISOString().slice(0, 10)); }
    return milking.map((n) => ({
      nandi: n,
      series: days.map((day) => state.milk.filter((r) => r.nandiId === n.id && r.date === day).reduce((s, r) => s + r.liters, 0)),
      total: state.milk.filter((r) => r.nandiId === n.id && days.includes(r.date)).reduce((s, r) => s + r.liters, 0),
    }));
  }, [milking, state.milk]);

  const saleTotal = useMemo(() => state.disposals.filter((x) => x.kind === 'sold').reduce((s, x) => s + x.amount, 0), [state.disposals]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-stone-800">{t('suites.goshala.dugdha.title')}</h2>
        <div className="text-sm bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5">{t('suites.goshala.dugdha.milkSales')}: <b className="text-emerald-700">{inr(saleTotal)}</b></div>
      </div>

      <SampleEraBar
        count={eraMilk.length}
        nounEn="milk rows"
        nounBn="দুধের সারি"
        nounHi="दूध पंक्तियाँ"
        onClear={() => eraMilk.forEach((r) => remove('milk', r.id))}
      />

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-bold text-stone-800 mb-3">{t('suites.goshala.dugdha.recordYield')}</h3>
          <form onSubmit={addMilk} className="grid grid-cols-2 gap-3">
            <Field label={t('suites.goshala.dugdha.animal')} className="col-span-2">
              <select className={inputCls} value={f.nandiId} onChange={(e) => setF({ ...f, nandiId: e.target.value })}>
                <option value="">—</option>
                {milking.map((n) => <option key={n.id} value={n.id}>{n.name} ({n.tagId})</option>)}
              </select>
            </Field>
            <Field label={t('suites.goshala.dugdha.date')}><input type="date" className={inputCls} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
            <Field label={t('suites.goshala.dugdha.session')}>
              <select className={inputCls} value={f.session} onChange={(e) => setF({ ...f, session: e.target.value as MilkSession })}>
                <option value="morning">{t('suites.goshala.common.morning')}</option>
                <option value="evening">{t('suites.goshala.common.evening')}</option>
              </select>
            </Field>
            <Field label={t('suites.goshala.dugdha.litres')} className="col-span-2"><input type="number" min={0} step={0.1} className={inputCls} value={f.liters || ''} onChange={(e) => setF({ ...f, liters: Number(e.target.value) })} placeholder="4.5" /></Field>
            <div className="col-span-2"><Btn type="submit">{t('suites.goshala.dugdha.recordYield')}</Btn></div>
          </form>
        </Card>

        <Card>
          <h3 className="font-bold text-stone-800 mb-3">{t('suites.goshala.dugdha.disposalTitle')}</h3>
          <form onSubmit={addDisposal} className="grid grid-cols-2 gap-3">
            <Field label={t('suites.goshala.dugdha.date')}><input type="date" className={inputCls} value={d.date} onChange={(e) => setD({ ...d, date: e.target.value })} /></Field>
            <Field label={t('suites.goshala.dugdha.litres')}><input type="number" min={0} step={0.1} className={inputCls} value={d.liters || ''} onChange={(e) => setD({ ...d, liters: Number(e.target.value) })} /></Field>
            <Field label={t('suites.goshala.dugdha.kind')}>
              <select className={inputCls} value={d.kind} onChange={(e) => setD({ ...d, kind: e.target.value as DisposalKind })}>
                {KINDS.map((k) => <option key={k} value={k}>{t(DISPOSAL_KIND_KEY[k])}</option>)}
              </select>
            </Field>
            <Field label={t('suites.goshala.dugdha.amount')}><input type="number" min={0} className={inputCls} value={d.amount || ''} onChange={(e) => setD({ ...d, amount: Number(e.target.value) })} /></Field>
            <Field label={t('suites.goshala.dugdha.party')} className="col-span-2"><input className={inputCls} value={d.party} onChange={(e) => setD({ ...d, party: e.target.value })} placeholder={t('suites.goshala.dugdha.phParty')} /></Field>
            <div className="col-span-2"><Btn type="submit">{t('suites.goshala.common.saved')}</Btn></div>
          </form>
        </Card>
      </div>

      <Card>
        <h3 className="font-bold text-stone-800 mb-3">{t('suites.goshala.dugdha.lactation')}</h3>
        {lact.length === 0 ? <Empty text={t('suites.goshala.dugdha.noMilking')} /> : (
          <div className="space-y-3">
            {lact.map(({ nandi, series, total }) => {
              const max = Math.max(...series, 1);
              return (
                <div key={nandi.id}>
                  <div className="flex justify-between text-sm mb-1"><span className="font-bold">{nandi.name} <span className="text-stone-500 font-normal">({nandi.tagId})</span></span><span className="text-stone-600">{total.toFixed(1)} L / 7d</span></div>
                  <div className="flex items-end gap-1 h-14">
                    {series.map((v, i) => (
                      <div key={i} className="flex-1 bg-sky-100 rounded-t relative" style={{ height: `${Math.max(6, (v / max) * 100)}%` }} title={`${v.toFixed(1)} L`}>
                        <div className="absolute inset-x-0 bottom-0 bg-sky-500/70 rounded-t" style={{ height: '100%' }} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-bold text-stone-800 mb-2">{t('suites.goshala.dugdha.recentYields')}</h3>
          {recent.length === 0 ? <Empty text="—" /> : (
            <ul className="text-sm space-y-1.5 max-h-64 overflow-y-auto">
              {recent.map((r) => (
                <li key={r.id} className="flex justify-between border-b border-stone-100 py-1">
                  <span>{nameOf(r.nandiId)} · {r.session === 'morning' ? t('suites.goshala.common.morning') : t('suites.goshala.common.evening')} {isSampleEraMilkRow(r, liveNandiIds) && <SampleBadge className="ml-1" />}</span>
                  <span><b>{r.liters.toFixed(1)} L</b> <span className="text-stone-500">{fmtDateEn(r.date)}</span></span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h3 className="font-bold text-stone-800 mb-2">{t('suites.goshala.dugdha.recentDisposals')}</h3>
          {disposals.length === 0 ? <Empty text="—" /> : (
            <ul className="text-sm space-y-1.5 max-h-64 overflow-y-auto">
              {disposals.map((x) => (
                <li key={x.id} className="flex justify-between border-b border-stone-100 py-1">
                  <span><span className="font-mono text-xs bg-stone-100 rounded px-1.5 py-0.5 mr-1">{labelFor(t, DISPOSAL_KIND_KEY, x.kind)}</span>{x.party || ''}</span>
                  <span><b>{x.liters.toFixed(1)} L</b>{x.amount > 0 && <span className="text-emerald-700"> · {inr(x.amount)}</span>} <span className="text-stone-500">{fmtDateEn(x.date)}</span>
                    <button className="ml-2 text-xs font-bold text-red-600 hover:underline" onClick={() => { if (confirm(t('suites.goshala.common.confirmDelete'))) remove('disposals', x.id); }}>✕</button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
};
