import React, { useMemo, useState } from 'react';
import { useGoshala, uid, todayISO } from './goshalaStore';
import { FodderKind } from './types';
import { Card, Stat, T, Btn, Field, inputCls, Empty, useLocaleText } from './ui';
import { inr } from '../pathshala/bn';
import { useToast } from '../context/ToastContext';

/* Goshala One — Chara (fodder): inventory, daily consumption, cost per
   animal per day, and the grant-vs-cost gap dashboard (research: ~₹50
   govt grant vs ₹100–150 real cost). */

const KINDS: FodderKind[] = ['green', 'dry', 'concentrate', 'mineral'];

export const CharaTab: React.FC = () => {
  const { state, add, update, remove, setSettings } = useGoshala();
  const { tr } = useLocaleText();
  const { showToast } = useToast();
  const [item, setItem] = useState({ name: '', kind: 'green' as FodderKind, unit: 'quintal', stockQty: 0, ratePerUnit: 0, reorderLevel: 0 });
  const [use, setUse] = useState({ itemId: '', date: todayISO(), qty: 0 });

  const headcount = state.nandis.length;

  const stats = useMemo(() => {
    const since = new Date(); since.setDate(since.getDate() - 30);
    const sinceISO = since.toISOString().slice(0, 10);
    const use30 = state.fodderUse.filter((u) => u.date >= sinceISO);
    const cost30 = use30.reduce((s, u) => {
      const it = state.fodderItems.find((i) => i.id === u.itemId);
      return s + (it ? u.qty * it.ratePerUnit : 0);
    }, 0);
    const costPerDay = cost30 / 30;
    const costPerAnimalDay = headcount ? costPerDay / headcount : 0;
    const gapPerAnimal = Math.max(0, costPerAnimalDay - state.settings.grantPerDay);
    const stockValue = state.fodderItems.reduce((s, it) => s + it.stockQty * it.ratePerUnit, 0);
    const daysLeft = state.fodderItems.map((it) => {
      const used = state.fodderUse.filter((u) => u.itemId === it.id && u.date >= sinceISO).reduce((s, u) => s + u.qty, 0);
      const avg = used / 30;
      return { it, days: avg > 0 ? Math.floor(it.stockQty / avg) : 999, low: it.stockQty <= it.reorderLevel };
    });
    return { costPerAnimalDay, gapPerAnimal, stockValue, daysLeft, monthlyGap: gapPerAnimal * headcount * 30 };
  }, [state, headcount]);

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item.name.trim()) { showToast(tr('goshala.chara.need', 'Enter fodder name', 'খাদ্যের নাম দিন', 'चारे का नाम दें'), 'warning'); return; }
    add('fodderItems', { id: uid('f'), ...item, name: item.name.trim(), stockQty: Number(item.stockQty) || 0, ratePerUnit: Number(item.ratePerUnit) || 0, reorderLevel: Number(item.reorderLevel) || 0 });
    showToast(tr('goshala.saved', 'Saved', 'সংরক্ষিত', 'सहेजा गया'), 'success');
    setItem({ name: '', kind: 'green', unit: 'quintal', stockQty: 0, ratePerUnit: 0, reorderLevel: 0 });
  };

  const logUse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!use.itemId || !(use.qty > 0)) { showToast(tr('goshala.chara.needuse', 'Select item and quantity', 'খাদ্য ও পরিমাণ দিন', 'चारा और मात्रा दें'), 'warning'); return; }
    const it = state.fodderItems.find((i) => i.id === use.itemId)!;
    if (use.qty > it.stockQty) { showToast(tr('goshala.chara.nostock', 'Not enough stock', 'পর্যাপ্ত মজুদ নেই', 'पर्याप्त भंडार नहीं'), 'warning'); return; }
    add('fodderUse', { id: uid('fu'), itemId: use.itemId, date: use.date, qty: Number(use.qty) });
    update('fodderItems', use.itemId, { stockQty: Math.max(0, it.stockQty - Number(use.qty)) });
    setUse({ itemId: '', date: todayISO(), qty: 0 });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-stone-800"><T en="Chara — fodder management" bn="খাদ্য ব্যবস্থাপনা" hi="चारा प्रबंधन" sa="चार-प्रबन्धनम्" /></h2>
      </div>

      {/* Grant-vs-cost gap dashboard */}
      <Card className="border-red-200 bg-gradient-to-br from-red-50 to-amber-50">
        <h3 className="font-bold text-stone-800 mb-1">📊 <T en="Grant vs real cost — the gap this desk exists to close" bn="অনুদান বনাম প্রকৃত খরচ" hi="अनुदान बनाम वास्तविक लागत" /></h3>
        <p className="text-xs text-stone-600 mb-3"><T en="Government support averages ~₹50/animal/day; real upkeep runs ₹100–150. This panel makes the shortfall visible, per animal, per day." bn="সরকারি সহায়তা গড়ে ~₹৫০/পশু/দিন; প্রকৃত খরচ ₹১০০–১৫০।" hi="सरकारी सहायता ~₹50/पशु/दिन; वास्तविक लागत ₹100–150।" /></p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <Stat label={<T en="Real cost / animal / day" bn="প্রকৃত খরচ / পশু / দিন" hi="वास्तविक लागत / पशु / दिन" />} value={inr(Math.round(stats.costPerAnimalDay))} sub={<T en="last 30 days" bn="গত ৩০ দিন" hi="पिछले 30 दिन" />} tone="amber" />
          <Stat label={<T en="Grant / animal / day" bn="অনুদান / পশু / দিন" hi="अनुदान / पशु / दिन" />} value={inr(state.settings.grantPerDay)} sub={<T en="assumption — editable" bn="অনুমান — পরিবর্তনযোগ্য" hi="अनुमान — संपादन योग्य" />} tone="sky" />
          <Stat label={<T en="Gap / animal / day" bn="ঘাটতি / পশু / দিন" hi="अंतर / पशु / दिन" />} value={inr(Math.round(stats.gapPerAnimal))} sub={<T en="unfunded, per animal" bn="অর্থায়নহীন" hi="अनुदान-रहित" />} tone="red" />
          <Stat label={<T en="Monthly gap (herd)" bn="মাসিক ঘাটতি (পাল)" hi="मासिक अंतर (झुंड)" />} value={inr(Math.round(stats.monthlyGap))} sub={<T en={`${headcount} animals`} bn={`${headcount}টি পশু`} hi={`${headcount} पशु`} />} tone="red" />
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <Field label={<T en="Grant assumption ₹/day" bn="অনুদান অনুমান ₹/দিন" hi="अनुदान अनुमान ₹/दिन" />}>
            <input type="number" min={0} className={`${inputCls} !w-32`} value={state.settings.grantPerDay} onChange={(e) => setSettings({ grantPerDay: Number(e.target.value) || 0 })} />
          </Field>
          <Field label={<T en="Est. real cost ₹/day" bn="আনুমানিক প্রকৃত খরচ ₹/দিন" hi="अनुमानित वास्तविक लागत ₹/दिन" />}>
            <input type="number" min={0} className={`${inputCls} !w-32`} value={state.settings.estCostPerDay} onChange={(e) => setSettings({ estCostPerDay: Number(e.target.value) || 0 })} />
          </Field>
          <span className="text-xs text-stone-500 pb-2"><T en="Adjust to your goshala's reality — the dashboard follows." bn="আপনার গোশালার বাস্তবতা অনুযায়ী ঠিক করুন।" hi="अपनी गोशाला की वास्तविकता के अनुसार ठीक करें।" /></span>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-bold text-stone-800 mb-3"><T en="Fodder stock" bn="খাদ্য মজুদ" hi="चारा भंडार" /> <span className="text-xs font-normal text-stone-500">({inr(Math.round(stats.stockValue))})</span></h3>
          {state.fodderItems.length === 0 ? <Empty text="—" /> : (
            <ul className="space-y-2">
              {stats.daysLeft.map(({ it, days, low }) => (
                <li key={it.id} className={`border rounded-xl px-3 py-2 text-sm ${low ? 'border-red-300 bg-red-50' : 'border-stone-200'}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-bold">{it.name} <span className="font-mono text-xs text-stone-500">{it.kind}</span></span>
                    <button className="text-xs text-red-600 font-bold hover:underline" onClick={() => { if (confirm(tr('goshala.confirm_del', 'Delete?', 'মুছবেন?', 'हटाएँ?'))) remove('fodderItems', it.id); }}>✕</button>
                  </div>
                  <div className="flex justify-between text-xs text-stone-600 mt-1">
                    <span>{it.stockQty} {it.unit} · ₹{it.ratePerUnit}/{it.unit}</span>
                    <span className={days < 7 ? 'text-red-700 font-bold' : ''}>≈ {days >= 999 ? '—' : `${days} ${tr('goshala.days', 'days left', 'দিন বাকি', 'दिन शेष')}`}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={addItem} className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-stone-100">
            <Field label={<T en="Name" bn="নাম" hi="नाम" />} className="col-span-2"><input className={inputCls} value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} placeholder="Hara Chara" /></Field>
            <Field label={<T en="Kind" bn="ধরন" hi="प्रकार" />}>
              <select className={inputCls} value={item.kind} onChange={(e) => setItem({ ...item, kind: e.target.value as FodderKind })}>
                {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </Field>
            <Field label={<T en="Unit" bn="একক" hi="इकाई" />}><input className={inputCls} value={item.unit} onChange={(e) => setItem({ ...item, unit: e.target.value })} /></Field>
            <Field label={<T en="Stock qty" bn="মজুদ" hi="भंडार" />}><input type="number" min={0} step={0.1} className={inputCls} value={item.stockQty || ''} onChange={(e) => setItem({ ...item, stockQty: Number(e.target.value) })} /></Field>
            <Field label={<T en="Rate ₹/unit" bn="দর ₹/একক" hi="दर ₹/इकाई" />}><input type="number" min={0} className={inputCls} value={item.ratePerUnit || ''} onChange={(e) => setItem({ ...item, ratePerUnit: Number(e.target.value) })} /></Field>
            <Field label={<T en="Reorder at" bn="পুনঃক্রয় সীমা" hi="पुनः क्रय सीमा" />}><input type="number" min={0} step={0.1} className={inputCls} value={item.reorderLevel || ''} onChange={(e) => setItem({ ...item, reorderLevel: Number(e.target.value) })} /></Field>
            <div className="col-span-2"><Btn type="submit">{tr('goshala.chara.add', 'Add / restock item', 'যোগ করুন', 'जोड़ें')}</Btn></div>
          </form>
        </Card>

        <Card>
          <h3 className="font-bold text-stone-800 mb-3"><T en="Daily consumption" bn="দৈনিক খরচ" hi="दैनिक खपत" /></h3>
          <form onSubmit={logUse} className="grid grid-cols-2 gap-2 mb-3">
            <Field label={<T en="Item" bn="খাদ্য" hi="चारा" />}>
              <select className={inputCls} value={use.itemId} onChange={(e) => setUse({ ...use, itemId: e.target.value })}>
                <option value="">—</option>
                {state.fodderItems.map((it) => <option key={it.id} value={it.id}>{it.name} ({it.stockQty} {it.unit})</option>)}
              </select>
            </Field>
            <Field label={<T en="Date" bn="তারিখ" hi="तिथि" />}><input type="date" className={inputCls} value={use.date} onChange={(e) => setUse({ ...use, date: e.target.value })} /></Field>
            <Field label={<T en="Qty used" bn="ব্যবহৃত পরিমাণ" hi="उपयोग मात्रा" />} className="col-span-2"><input type="number" min={0} step={0.1} className={inputCls} value={use.qty || ''} onChange={(e) => setUse({ ...use, qty: Number(e.target.value) })} /></Field>
            <div className="col-span-2"><Btn type="submit">{tr('goshala.chara.log', 'Log consumption', 'খরচ লিখুন', 'खपत दर्ज करें')}</Btn></div>
          </form>
          <h4 className="text-sm font-bold text-stone-700 mb-1"><T en="Recent" bn="সাম্প্রতিক" hi="हाल" /></h4>
          <ul className="text-sm space-y-1 max-h-48 overflow-y-auto">
            {[...state.fodderUse].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10).map((u) => (
              <li key={u.id} className="flex justify-between border-b border-stone-100 py-1">
                <span>{state.fodderItems.find((i) => i.id === u.itemId)?.name} · {u.qty}</span>
                <span className="text-stone-500">{u.date}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
};
