import React, { useMemo, useState } from 'react';
import { useGoshala, uid, todayISO } from './goshalaStore';
import { SponsorPlan, SponsorStatus } from './types';
import { Card, Stat, Btn, Field, inputCls, Empty, SPONSOR_PLAN_KEY, SPONSOR_STATUS_KEY, labelFor } from './ui';
import { fmtDateEn, receiptWords } from '../pathshala/bn';
import { useInr, useWorkspaceCurrency } from '../hooks/useWorkspaceInr';
import { useToast } from '../context/ToastContext';
import { useData } from '../context/DataContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useLanguage } from '../context/LanguageContext';

/* Goshala One — Gau-seva sponsorships (adopt-a-cow): plans, sponsor
   records, renewal reminders; donations post to treasury with the 80G
   receipt path (honest: issued only when the workspace is 80G-registered). */

const PLANS: SponsorPlan[] = ['monthly', 'quarterly', 'yearly', 'one-time'];

export const SponsorshipTab: React.FC = () => {
  const inr = useInr();
  const wsCurrency = useWorkspaceCurrency();
  const { state, add, update, remove } = useGoshala();
  const { addTreasuryTransaction, getNextReceiptNumber } = useData();
  const { activeWorkspace } = useAuthWorkspace();
  const { t, currentLang } = useLanguage();
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
    if (!f.sponsorName.trim() || !(f.amount > 0)) { showToast(t('suites.goshala.sponsorship.need'), 'warning'); return; }
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
      ? t('suites.goshala.sponsorship.added80g')
      : t('suites.goshala.sponsorship.added'),
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
    showToast(t('suites.goshala.sponsorship.renewed'), 'success');
  };

  const sp = printS ? state.sponsorships.find((x) => x.id === printS) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-stone-800">{t('suites.goshala.sponsorship.title')}</h2>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label={t('suites.goshala.sponsorship.activeSponsors')} value={stats.active} tone="emerald" />
        <Stat label={t('suites.goshala.sponsorship.annualised')} value={inr(stats.annual)} tone="amber" />
        <Stat label={t('suites.goshala.sponsorship.expiringSoon')} value={stats.expiring} tone="red" />
      </div>

      <Card>
        <h3 className="font-bold text-stone-800 mb-3">{t('suites.goshala.sponsorship.newSp')}</h3>
        <form onSubmit={submit} className="grid sm:grid-cols-3 gap-3">
          <Field label={t('suites.goshala.sponsorship.sponsorName')}><input className={inputCls} value={f.sponsorName} onChange={(e) => setF({ ...f, sponsorName: e.target.value })} /></Field>
          <Field label={t('suites.goshala.sponsorship.phone')}><input className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label={t('suites.goshala.sponsorship.gotra')}><input className={inputCls} value={f.gotra} onChange={(e) => setF({ ...f, gotra: e.target.value })} /></Field>
          <Field label={t('suites.goshala.sponsorship.adopt')}>
            <select className={inputCls} value={f.nandiId} onChange={(e) => setF({ ...f, nandiId: e.target.value })}>
              <option value="">{t('suites.goshala.sponsorship.general')}</option>
              {state.nandis.map((n) => <option key={n.id} value={n.id}>{n.name} ({n.tagId})</option>)}
            </select>
          </Field>
          <Field label={t('suites.goshala.sponsorship.plan')}>
            <select className={inputCls} value={f.plan} onChange={(e) => setF({ ...f, plan: e.target.value as SponsorPlan })}>
              {PLANS.map((p) => <option key={p} value={p}>{t(SPONSOR_PLAN_KEY[p])}</option>)}
            </select>
          </Field>
          <Field label={t('suites.goshala.sponsorship.amount')}><input type="number" min={0} className={inputCls} value={f.amount || ''} onChange={(e) => setF({ ...f, amount: Number(e.target.value) })} /></Field>
          <Field label={t('suites.goshala.sponsorship.startDate')}><input type="date" className={inputCls} value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></Field>
          {f.plan !== 'one-time' && (
            <Field label={t('suites.goshala.sponsorship.duration')}><input type="number" min={1} className={inputCls} value={f.months} onChange={(e) => setF({ ...f, months: Number(e.target.value) })} /></Field>
          )}
          <div className="sm:col-span-3 flex items-center gap-3 flex-wrap">
            <Btn type="submit">{t('suites.goshala.sponsorship.record')}</Btn>
            <span className="text-xs text-stone-500">{t('suites.goshala.sponsorship.postNote')}</span>
          </div>
        </form>
      </Card>

      <Card>
        <h3 className="font-bold text-stone-800 mb-3">{t('suites.goshala.sponsorship.sponsors')}</h3>
        {state.sponsorships.length === 0 ? <Empty text="—" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-stone-500 border-b">
                <th className="py-2 pr-3">{t('suites.goshala.sponsorship.thSponsor')}</th><th className="py-2 pr-3">{t('suites.goshala.sponsorship.thFor')}</th>
                <th className="py-2 pr-3">{t('suites.goshala.sponsorship.thPlan')}</th><th className="py-2 pr-3">{t('suites.goshala.sponsorship.thAmount')}</th>
                <th className="py-2 pr-3">{t('suites.goshala.sponsorship.thValidTill')}</th><th className="py-2 pr-3">{t('suites.goshala.sponsorship.thStatus')}</th>
                <th className="py-2">{t('suites.goshala.sponsorship.thActions')}</th>
              </tr></thead>
              <tbody>
                {[...state.sponsorships].sort((a, b) => a.endDate.localeCompare(b.endDate)).map((s) => (
                  <tr key={s.id} className="border-b border-stone-100">
                    <td className="py-2 pr-3 font-semibold">{s.sponsorName}{s.receiptNo && <span className="block text-xs font-mono text-stone-500">{s.receiptNo}{s.treasuryTxId ? ` · ${t('suites.goshala.common.treasuryPosted')}` : ''}</span>}</td>
                    <td className="py-2 pr-3">{nameOf(s.nandiId) || t('suites.goshala.sponsorship.general')}</td>
                    <td className="py-2 pr-3">{labelFor(t, SPONSOR_PLAN_KEY, s.plan)}</td>
                    <td className="py-2 pr-3 font-bold">{inr(s.amount)}</td>
                    <td className="py-2 pr-3">{fmtDateEn(s.endDate)}</td>
                    <td className="py-2 pr-3"><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${s.status === 'active' ? 'bg-emerald-100 text-emerald-800' : s.status === 'expiring' ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-600'}`}>{labelFor(t, SPONSOR_STATUS_KEY, s.status)}</span></td>
                    <td className="py-2 flex gap-1 flex-wrap">
                      <button className="text-xs font-bold text-amber-700 hover:underline px-1" onClick={() => setPrintS(s.id)}>{t('suites.goshala.common.receipt')}</button>
                      {(s.status === 'expiring' || s.status === 'expired') && <button className="text-xs font-bold text-emerald-700 hover:underline px-1" onClick={() => renew(s.id)}>{t('suites.goshala.sponsorship.renew')}</button>}
                      <button className="text-xs font-bold text-red-600 hover:underline px-1" onClick={() => { if (confirm(t('suites.goshala.common.confirmDelete'))) remove('sponsorships', s.id); }}>✕</button>
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
              <h3 className="text-center font-extrabold text-lg">॥ {t('suites.goshala.sponsorship.receiptTitle')} ॥</h3>
              <p className="text-center text-xs text-stone-500 mb-4">{(activeWorkspace as any)?.name || 'Goshala'} · {sp.receiptNo}</p>
              {!(activeWorkspace as any)?.trust80GRegistered && <p className="text-center text-xs font-bold text-red-700 border border-red-300 rounded p-1 mb-3">{t('suites.goshala.sponsorship.sampleWarn')}</p>}
              <table className="w-full text-sm">
                <tbody>
                  <tr><td className="py-1 text-stone-600">{t('suites.goshala.sponsorship.thSponsor')}</td><td className="py-1 font-bold">{sp.sponsorName}</td></tr>
                  {sp.gotra && <tr><td className="py-1 text-stone-600">{t('suites.goshala.sponsorship.rGotra')}</td><td className="py-1">{sp.gotra}</td></tr>}
                  <tr><td className="py-1 text-stone-600">{t('suites.goshala.sponsorship.thFor')}</td><td className="py-1">{nameOf(sp.nandiId) || t('suites.goshala.sponsorship.general')}</td></tr>
                  <tr><td className="py-1 text-stone-600">{t('suites.goshala.sponsorship.thPlan')}</td><td className="py-1">{labelFor(t, SPONSOR_PLAN_KEY, sp.plan)} · {fmtDateEn(sp.startDate)} → {fmtDateEn(sp.endDate)}</td></tr>
                  <tr><td className="py-1 text-stone-600">{t('suites.goshala.sponsorship.thAmount')}</td><td className="py-1 font-extrabold text-lg">{inr(sp.amount)}</td></tr>
                  <tr><td className="py-1 text-stone-600" colSpan={2}>{receiptWords(sp.amount, currentLang, wsCurrency.code)}</td></tr>
                </tbody>
              </table>
              <p className="text-center text-xs text-stone-500 mt-4">॥ गौ माता की सेवा ही सच्ची सेवा ॥</p>
            </div>
            <div className="flex gap-2 mt-4">
              <Btn onClick={() => window.print()}>{t('suites.goshala.common.print')}</Btn>
              <Btn variant="ghost" onClick={() => setPrintS(null)}>{t('suites.goshala.common.close')}</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
