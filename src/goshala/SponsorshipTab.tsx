import React, { useMemo, useState } from 'react';
import { useGoshala, uid, todayISO } from './goshalaStore';
import { SponsorPlan, SponsorStatus } from './types';
import { Card, Stat, T, Btn, Field, inputCls, Empty, useLocaleText } from './ui';
import { fmtDateEn, inr, receiptWords } from '../pathshala/bn';
import { useToast } from '../context/ToastContext';
import { useData } from '../context/DataContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';

/* Goshala One — Gau-seva sponsorships (adopt-a-cow): plans, sponsor
   records, renewal reminders; donations post to treasury with the 80G
   receipt path (honest: issued only when the workspace is 80G-registered). */

const PLANS: SponsorPlan[] = ['monthly', 'quarterly', 'yearly', 'one-time'];

export const SponsorshipTab: React.FC = () => {
  const { state, add, update, remove } = useGoshala();
  const { addTreasuryTransaction, getNextReceiptNumber } = useData();
  const { activeWorkspace } = useAuthWorkspace();
  const { tr, lang } = useLocaleText();
  const { showToast } = useToast();
  const [f, setF] = useState({ nandiId: '', sponsorName: '', phone: '', gotra: '', plan: 'yearly' as SponsorPlan, amount: 0, startDate: todayISO(), months: 12 });
  const [printS, setPrintS] = useState<string | null>(null);

  const endDate = useMemo(() => {
    const d = new Date(f.startDate || todayISO());
    d.setMonth(d.getMonth() + (f.plan === 'one-time' ? 0 : f.months));
    return d.toISOString().slice(0, 10);
  }, [f.startDate, f.months, f.plan]);

  const nameOf = (id?: string) => (id ? state.nandis.find((n) => n.id === id)?.name : undefined);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.sponsorName.trim() || !(f.amount > 0)) { showToast(tr('goshala.sp.need', 'Sponsor name and amount required', 'নাম ও টাকা আবশ্যক', 'नाम और राशि आवश्यक'), 'warning'); return; }
    const receiptNo = getNextReceiptNumber ? getNextReceiptNumber('SB-80G') : `SB-80G-${Date.now().toString().slice(-6)}`;
    const registered = !!(activeWorkspace as any)?.trust80GRegistered;
    const ok = addTreasuryTransaction({
      workspaceId: activeWorkspace.id,
      date: new Date().toISOString(), type: 'Income', category: 'Gau Seva (Donation)',
      subcategory: 'Goshala One — Sponsorship', amount: Number(f.amount), handledBy: 'Goshala Karyalaya',
      paymentMode: 'UPI', referenceNo: receiptNo,
      purpose: `Gau-seva sponsorship — ${f.sponsorName.trim()}${nameOf(f.nandiId) ? ` (${nameOf(f.nandiId)})` : ''} (${receiptNo})`,
      is80GEligible: true,
      taxReceiptIssued: registered,
      taxReceiptNumber: receiptNo,
      devoteeName: f.sponsorName.trim(),
    });
    add('sponsorships', {
      id: uid('sp'), nandiId: f.nandiId || undefined, sponsorName: f.sponsorName.trim(),
      phone: f.phone || undefined, gotra: f.gotra || undefined, plan: f.plan,
      amount: Number(f.amount), startDate: f.startDate, endDate,
      status: 'active', receiptNo, treasuryTxId: ok ? 'posted' : undefined,
    });
    showToast(registered
      ? tr('goshala.sp.added80g', 'Sponsorship recorded — 80G receipt issued', 'পৃষ্ঠপোষকতা রেকর্ডকৃত — 80G রসিদ', 'प्रायोजन दर्ज — 80G रसीद जारी')
      : tr('goshala.sp.added', 'Sponsorship recorded (80G not registered — receipt marked SAMPLE)', 'রেকর্ডকৃত (80G নিবন্ধিত নয়)', 'दर्ज (80G पंजीकृत नहीं)'),
      'success');
    setF({ nandiId: '', sponsorName: '', phone: '', gotra: '', plan: 'yearly', amount: 0, startDate: todayISO(), months: 12 });
  };

  const stats = useMemo(() => {
    const active = state.sponsorships.filter((s) => s.status === 'active');
    const annual = active.reduce((s, x) => s + (x.plan === 'monthly' ? x.amount * 12 : x.plan === 'quarterly' ? x.amount * 4 : x.plan === 'yearly' ? x.amount : 0), 0);
    return { active: active.length, annual, expiring: state.sponsorships.filter((s) => s.status === 'expiring').length };
  }, [state.sponsorships]);

  const renew = (id: string) => {
    const s = state.sponsorships.find((x) => x.id === id);
    if (!s) return;
    const d = new Date(s.endDate); d.setFullYear(d.getFullYear() + 1);
    update('sponsorships', id, { status: 'active', endDate: d.toISOString().slice(0, 10) });
    showToast(tr('goshala.sp.renewed', 'Sponsorship renewed for a year', 'এক বছরের জন্য নবায়ন', 'एक वर्ष हेतु नवीकृत'), 'success');
  };

  const sp = printS ? state.sponsorships.find((x) => x.id === printS) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-stone-800"><T en="Gau-seva sponsorships — adopt a cow" bn="গো-সেবা পৃষ্ঠপোষকতা" hi="गौ-सेवा प्रायोजन" sa="गो-सेवा-प्रायोजनम्" /></h2>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label={<T en="Active sponsors" bn="সক্রিয় পৃষ্ঠপোষক" hi="सक्रिय प्रायोजक" />} value={stats.active} tone="emerald" />
        <Stat label={<T en="Annualised value" bn="বার্ষিক মূল্য" hi="वार्षिक मूल्य" />} value={inr(stats.annual)} tone="amber" />
        <Stat label={<T en="Expiring soon" bn="শীঘ্রই শেষ" hi="शीघ्र समाप्त" />} value={stats.expiring} tone="red" />
      </div>

      <Card>
        <h3 className="font-bold text-stone-800 mb-3"><T en="New sponsorship" bn="নতুন পৃষ্ঠপোষকতা" hi="नया प्रायोजन" /></h3>
        <form onSubmit={submit} className="grid sm:grid-cols-3 gap-3">
          <Field label={<T en="Sponsor name" bn="পৃষ্ঠপোষকের নাম" hi="प्रायोजक का नाम" />}><input className={inputCls} value={f.sponsorName} onChange={(e) => setF({ ...f, sponsorName: e.target.value })} /></Field>
          <Field label={<T en="Phone" bn="ফোন" hi="फोन" />}><input className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label={<T en="Gotra (optional)" bn="গোত্র" hi="गोत्र" />}><input className={inputCls} value={f.gotra} onChange={(e) => setF({ ...f, gotra: e.target.value })} /></Field>
          <Field label={<T en="Adopt (optional)" bn="দত্তক (ঐচ্ছিক)" hi="गोद (वैकल्पिक)" />}>
            <select className={inputCls} value={f.nandiId} onChange={(e) => setF({ ...f, nandiId: e.target.value })}>
              <option value="">{tr('goshala.sp.general', 'General Gau Seva', 'সাধারণ গো-সেবা', 'सामान्य गौ सेवा')}</option>
              {state.nandis.map((n) => <option key={n.id} value={n.id}>{n.name} ({n.tagId})</option>)}
            </select>
          </Field>
          <Field label={<T en="Plan" bn="পরিকল্পনা" hi="योजना" />}>
            <select className={inputCls} value={f.plan} onChange={(e) => setF({ ...f, plan: e.target.value as SponsorPlan })}>
              {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label={<T en="Amount ₹" bn="টাকা ₹" hi="राशि ₹" />}><input type="number" min={0} className={inputCls} value={f.amount || ''} onChange={(e) => setF({ ...f, amount: Number(e.target.value) })} /></Field>
          <Field label={<T en="Start date" bn="শুরুর তারিখ" hi="आरंभ तिथि" />}><input type="date" className={inputCls} value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></Field>
          {f.plan !== 'one-time' && (
            <Field label={<T en="Duration (months)" bn="মেয়াদ (মাস)" hi="अवधि (माह)" />}><input type="number" min={1} className={inputCls} value={f.months} onChange={(e) => setF({ ...f, months: Number(e.target.value) })} /></Field>
          )}
          <div className="sm:col-span-3 flex items-center gap-3 flex-wrap">
            <Btn type="submit">{tr('goshala.sp.record', 'Record + post to treasury', 'রেকর্ড + কোষাগারে', 'दर्ज + कोषागार में')}</Btn>
            <span className="text-xs text-stone-500"><T en="Posts to treasury with 80G receipt path." bn="80G রসিদসহ কোষাগারে পোস্ট হয়।" hi="80G रसीद सहित कोषागार में दर्ज।" /></span>
          </div>
        </form>
      </Card>

      <Card>
        <h3 className="font-bold text-stone-800 mb-3"><T en="Sponsors" bn="পৃষ্ঠপোষকগণ" hi="प्रायोजकगण" /></h3>
        {state.sponsorships.length === 0 ? <Empty text="—" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-stone-500 border-b">
                <th className="py-2 pr-3"><T en="Sponsor" bn="পৃষ্ঠপোষক" hi="प्रायोजक" /></th><th className="py-2 pr-3"><T en="For" bn="যার জন্য" hi="हेतु" /></th>
                <th className="py-2 pr-3"><T en="Plan" bn="পরিকল্পনা" hi="योजना" /></th><th className="py-2 pr-3"><T en="Amount" bn="টাকা" hi="राशि" /></th>
                <th className="py-2 pr-3"><T en="Valid till" bn="মেয়াদ" hi="वैधता" /></th><th className="py-2 pr-3"><T en="Status" bn="অবস্থা" hi="स्थिति" /></th>
                <th className="py-2"><T en="Actions" bn="কর্ম" hi="कार्य" /></th>
              </tr></thead>
              <tbody>
                {[...state.sponsorships].sort((a, b) => a.endDate.localeCompare(b.endDate)).map((s) => (
                  <tr key={s.id} className="border-b border-stone-100">
                    <td className="py-2 pr-3 font-semibold">{s.sponsorName}{s.receiptNo && <span className="block text-xs font-mono text-stone-500">{s.receiptNo}{s.treasuryTxId ? ' · treasury ✓' : ''}</span>}</td>
                    <td className="py-2 pr-3">{nameOf(s.nandiId) || tr('goshala.sp.general', 'General Gau Seva', 'সাধারণ গো-সেবা', 'सामान्य गौ सेवा')}</td>
                    <td className="py-2 pr-3">{s.plan}</td>
                    <td className="py-2 pr-3 font-bold">{inr(s.amount)}</td>
                    <td className="py-2 pr-3">{fmtDateEn(s.endDate)}</td>
                    <td className="py-2 pr-3"><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${s.status === 'active' ? 'bg-emerald-100 text-emerald-800' : s.status === 'expiring' ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-600'}`}>{s.status}</span></td>
                    <td className="py-2 flex gap-1 flex-wrap">
                      <button className="text-xs font-bold text-amber-700 hover:underline px-1" onClick={() => setPrintS(s.id)}>{tr('goshala.receipt', 'Receipt', 'রসিদ', 'रसीद')}</button>
                      {(s.status === 'expiring' || s.status === 'expired') && <button className="text-xs font-bold text-emerald-700 hover:underline px-1" onClick={() => renew(s.id)}>{tr('goshala.sp.renew', 'Renew', 'নবায়ন', 'नवीकृत')}</button>}
                      <button className="text-xs font-bold text-red-600 hover:underline px-1" onClick={() => { if (confirm(tr('goshala.confirm_del', 'Delete?', 'মুছবেন?', 'हटाएँ?'))) remove('sponsorships', s.id); }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {sp && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 no-print" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPrintS(null)} />
          <div className="relative bg-white w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl">
            <div className="print-area rounded-xl border p-5">
              <h3 className="text-center font-extrabold text-lg">॥ {tr('goshala.sp.receipt_title', 'Gau-Seva Donation Receipt', 'গো-সেবা দান রসিদ', 'गौ-सेवा दान रसीद')} ॥</h3>
              <p className="text-center text-xs text-stone-500 mb-4">{(activeWorkspace as any)?.name || 'Goshala'} · {sp.receiptNo}</p>
              {!(activeWorkspace as any)?.trust80GRegistered && <p className="text-center text-xs font-bold text-red-700 border border-red-300 rounded p-1 mb-3">SAMPLE — 80G not registered for this workspace</p>}
              <table className="w-full text-sm">
                <tbody>
                  <tr><td className="py-1 text-stone-600">Sponsor</td><td className="py-1 font-bold">{sp.sponsorName}</td></tr>
                  {sp.gotra && <tr><td className="py-1 text-stone-600">Gotra</td><td className="py-1">{sp.gotra}</td></tr>}
                  <tr><td className="py-1 text-stone-600">For</td><td className="py-1">{nameOf(sp.nandiId) || tr('goshala.sp.general', 'General Gau Seva', 'সাধারণ গো-সেবা', 'सामान्य गौ सेवा')}</td></tr>
                  <tr><td className="py-1 text-stone-600">Plan</td><td className="py-1">{sp.plan} · {fmtDateEn(sp.startDate)} → {fmtDateEn(sp.endDate)}</td></tr>
                  <tr><td className="py-1 text-stone-600">Amount</td><td className="py-1 font-extrabold text-lg">{inr(sp.amount)}</td></tr>
                  <tr><td className="py-1 text-stone-600" colSpan={2}>{receiptWords(sp.amount, lang)}</td></tr>
                </tbody>
              </table>
              <p className="text-center text-xs text-stone-500 mt-4">॥ गौ माता की सेवा ही सच्ची सेवा ॥</p>
            </div>
            <div className="flex gap-2 mt-4">
              <Btn onClick={() => window.print()}>{tr('goshala.print', 'Print', 'প্রিন্ট', 'प्रिंट करें')}</Btn>
              <Btn variant="ghost" onClick={() => setPrintS(null)}>{tr('goshala.close', 'Close', 'বন্ধ', 'बंद करें')}</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
