import React, { useMemo, useState } from 'react';
import { useGoshala, uid, todayISO } from './goshalaStore';
import { MilkSession, DisposalKind } from './types';
import { Card, T, Btn, Field, inputCls, Empty, useLocaleText } from './ui';
import { fmtDateEn, inr } from '../pathshala/bn';
import { useToast } from '../context/ToastContext';

/* Goshala One — Dugdha (milk ledger): daily yield per animal, session-wise
   entry, disposal (sold / distributed / donated), simple lactation view. */

const KINDS: DisposalKind[] = ['sold', 'distributed', 'donated', 'consumed'];

export const DugdhaTab: React.FC = () => {
  const { state, add, remove } = useGoshala();
  const { tr } = useLocaleText();
  const { showToast } = useToast();
  const [f, setF] = useState({ nandiId: '', date: todayISO(), session: 'morning' as MilkSession, liters: 0 });
  const [d, setD] = useState({ date: todayISO(), liters: 0, kind: 'sold' as DisposalKind, amount: 0, party: '' });

  const milking = useMemo(() => state.nandis.filter((n) => n.status === 'milking'), [state.nandis]);
  const nameOf = (id: string) => state.nandis.find((n) => n.id === id)?.name || '—';

  const addMilk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.nandiId || !(f.liters > 0)) { showToast(tr('goshala.milk.need', 'Select animal and enter litres', 'পশু ও লিটার দিন', 'पशु और लीटर दें'), 'warning'); return; }
    if (state.milk.some((r) => r.nandiId === f.nandiId && r.date === f.date && r.session === f.session)) {
      showToast(tr('goshala.milk.dup', 'Already recorded for this session', 'এই বেলার রেকর্ড আছে', 'इस सत्र का रिकॉर्ड है'), 'warning'); return;
    }
    add('milk', { id: uid('ml'), nandiId: f.nandiId, date: f.date, session: f.session, liters: Number(f.liters) });
    showToast(tr('goshala.milk.added', 'Yield recorded', 'উৎপাদন রেকর্ডকৃত', 'उत्पादन दर्ज'), 'success');
    setF({ ...f, nandiId: '', liters: 0 });
  };

  const addDisposal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!(d.liters > 0)) { showToast(tr('goshala.milk.needl', 'Enter litres', 'লিটার দিন', 'लीटर दें'), 'warning'); return; }
    add('disposals', { id: uid('md'), date: d.date, liters: Number(d.liters), kind: d.kind, amount: Number(d.amount) || 0, party: d.party || undefined });
    showToast(tr('goshala.saved', 'Saved', 'সংরক্ষিত', 'सहेजा गया'), 'success');
    setD({ date: todayISO(), liters: 0, kind: 'sold', amount: 0, party: '' });
  };

  const recent = useMemo(() => [...state.milk].sort((a, b) => b.date.localeCompare(a.date) || b.session.localeCompare(a.session)).slice(0, 20), [state.milk]);
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
        <h2 className="text-lg font-bold text-stone-800"><T en="Dugdha — milk ledger" bn="দুগ্ধ — দুধের হিসাব" hi="दुग्ध — दूध लेखा" sa="दुग्ध-लेखा" /></h2>
        <div className="text-sm bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5">{tr('goshala.milk.sales', 'Milk sales (all time)', 'দুধ বিক্রি (সর্বমোট)', 'दूध बिक्री (कुल)')}: <b className="text-emerald-700">{inr(saleTotal)}</b></div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-bold text-stone-800 mb-3"><T en="Record yield" bn="উৎপাদন লিখুন" hi="उत्पादन दर्ज करें" /></h3>
          <form onSubmit={addMilk} className="grid grid-cols-2 gap-3">
            <Field label={<T en="Animal" bn="পশু" hi="पशु" />} className="col-span-2">
              <select className={inputCls} value={f.nandiId} onChange={(e) => setF({ ...f, nandiId: e.target.value })}>
                <option value="">—</option>
                {milking.map((n) => <option key={n.id} value={n.id}>{n.name} ({n.tagId})</option>)}
              </select>
            </Field>
            <Field label={<T en="Date" bn="তারিখ" hi="तिथि" />}><input type="date" className={inputCls} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
            <Field label={<T en="Session" bn="বেলা" hi="समय" />}>
              <select className={inputCls} value={f.session} onChange={(e) => setF({ ...f, session: e.target.value as MilkSession })}>
                <option value="morning">{tr('goshala.morning', 'Morning', 'সকাল', 'प्रातः')}</option>
                <option value="evening">{tr('goshala.evening', 'Evening', 'সন্ধ্যা', 'सायं')}</option>
              </select>
            </Field>
            <Field label={<T en="Litres" bn="লিটার" hi="लीटर" />} className="col-span-2"><input type="number" min={0} step={0.1} className={inputCls} value={f.liters || ''} onChange={(e) => setF({ ...f, liters: Number(e.target.value) })} placeholder="4.5" /></Field>
            <div className="col-span-2"><Btn type="submit">{tr('goshala.milk.record', 'Record yield', 'উৎপাদন লিখুন', 'उत्पादन दर्ज करें')}</Btn></div>
          </form>
        </Card>

        <Card>
          <h3 className="font-bold text-stone-800 mb-3"><T en="Disposal — sale / distribution" bn="বণ্টন — বিক্রি / বিতরণ" hi="वितरण — बिक्री / वितरण" /></h3>
          <form onSubmit={addDisposal} className="grid grid-cols-2 gap-3">
            <Field label={<T en="Date" bn="তারিখ" hi="तिथि" />}><input type="date" className={inputCls} value={d.date} onChange={(e) => setD({ ...d, date: e.target.value })} /></Field>
            <Field label={<T en="Litres" bn="লিটার" hi="लीटर" />}><input type="number" min={0} step={0.1} className={inputCls} value={d.liters || ''} onChange={(e) => setD({ ...d, liters: Number(e.target.value) })} /></Field>
            <Field label={<T en="Kind" bn="ধরন" hi="प्रकार" />}>
              <select className={inputCls} value={d.kind} onChange={(e) => setD({ ...d, kind: e.target.value as DisposalKind })}>
                {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </Field>
            <Field label={<T en="Amount ₹ (if sold)" bn="টাকা ₹ (বিক্রি হলে)" hi="राशि ₹ (बिक्री पर)" />}><input type="number" min={0} className={inputCls} value={d.amount || ''} onChange={(e) => setD({ ...d, amount: Number(e.target.value) })} /></Field>
            <Field label={<T en="Party / purpose" bn="পক্ষ / উদ্দেশ্য" hi="पक्ष / उद्देश्य" />} className="col-span-2"><input className={inputCls} value={d.party} onChange={(e) => setD({ ...d, party: e.target.value })} placeholder="Local dairy / Ashram bhojan-shala" /></Field>
            <div className="col-span-2"><Btn type="submit">{tr('goshala.saved', 'Saved', 'সংরক্ষিত', 'सहेजा गया')}</Btn></div>
          </form>
        </Card>
      </div>

      <Card>
        <h3 className="font-bold text-stone-800 mb-3"><T en="7-day lactation view" bn="৭ দিনের দুগ্ধ-চিত্র" hi="7-दिवसीय दुग्ध चित्र" /></h3>
        {lact.length === 0 ? <Empty text={tr('goshala.milk.no_milking', 'No milking animals — mark cows as "milking" in the Nandi registry.', 'দুগ্ধবতী পশু নেই।', 'दुधारू पशु नहीं।')} /> : (
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
          <h3 className="font-bold text-stone-800 mb-2"><T en="Recent yields" bn="সাম্প্রতিক উৎপাদন" hi="हाल का उत्पादन" /></h3>
          {recent.length === 0 ? <Empty text="—" /> : (
            <ul className="text-sm space-y-1.5 max-h-64 overflow-y-auto">
              {recent.map((r) => (
                <li key={r.id} className="flex justify-between border-b border-stone-100 py-1">
                  <span>{nameOf(r.nandiId)} · {r.session === 'morning' ? tr('goshala.morning', 'Morning', 'সকাল', 'प्रातः') : tr('goshala.evening', 'Evening', 'সন্ধ্যা', 'सायं')}</span>
                  <span><b>{r.liters.toFixed(1)} L</b> <span className="text-stone-500">{fmtDateEn(r.date)}</span></span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h3 className="font-bold text-stone-800 mb-2"><T en="Recent disposals" bn="সাম্প্রতিক বণ্টন" hi="हाल का वितरण" /></h3>
          {disposals.length === 0 ? <Empty text="—" /> : (
            <ul className="text-sm space-y-1.5 max-h-64 overflow-y-auto">
              {disposals.map((x) => (
                <li key={x.id} className="flex justify-between border-b border-stone-100 py-1">
                  <span><span className="font-mono text-xs bg-stone-100 rounded px-1.5 py-0.5 mr-1">{x.kind}</span>{x.party || ''}</span>
                  <span><b>{x.liters.toFixed(1)} L</b>{x.amount > 0 && <span className="text-emerald-700"> · {inr(x.amount)}</span>} <span className="text-stone-500">{fmtDateEn(x.date)}</span>
                    <button className="ml-2 text-xs font-bold text-red-600 hover:underline" onClick={() => { if (confirm(tr('goshala.confirm_del', 'Delete?', 'মুছবেন?', 'हटाएँ?'))) remove('disposals', x.id); }}>✕</button>
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