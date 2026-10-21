import React, { useMemo, useState } from 'react';
import { Plus, Printer, Receipt as ReceiptIcon, Trash2, Copy } from 'lucide-react';
import { usePathshala } from './pathshalaStore';
import { useData } from '../context/DataContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useLanguage } from '../context/LanguageContext';
import { Card, Btn, Field, inputCls, Empty, Modal, useLocaleText } from './ui';
import { todayISO, receiptWords, uid, fmtDateEn } from './bn';
import { useInr, useWorkspaceCurrency } from '../hooks/useWorkspaceInr';
import { FeeReceipt, FeeHead } from './types';

/* Checklist #8 — fee collection & receipts: multiple heads, auto totals,
   amount-in-words (Bengali + English), duplicate receipt print,
   treasury posting (addTreasuryTransaction). */

export const FeeTab: React.FC = () => {
  const inr = useInr();
  const wsCurrency = useWorkspaceCurrency();
  const { t } = useLanguage();
  const { lang } = useLocaleText();
  const { state, add, update, remove } = usePathshala();
  const { gurukulStudents, addTreasuryTransaction } = useData();
  const { activeWorkspace } = useAuthWorkspace();
  const [collectFor, setCollectFor] = useState('');
  const [heads, setHeads] = useState<Record<string, boolean>>({});
  const [discount, setDiscount] = useState(0);
  const [payMode, setPayMode] = useState('Cash');
  const [printR, setPrintR] = useState<{ r: FeeReceipt; duplicate: boolean } | null>(null);
  const [showHeadForm, setShowHeadForm] = useState(false);
  const [headForm, setHeadForm] = useState({ name: '', nameBn: '', amount: 0, frequency: 'monthly' as FeeHead['frequency'] });
  const [search, setSearch] = useState('');

  const orgName = activeWorkspace.name || t('suites.pathshala.fee.orgFallback');
  const student = gurukulStudents.find((s) => s.id === collectFor);
  const selHeads = state.feeHeads.filter((h) => heads[h.id]);
  const subtotal = selHeads.reduce((s, h) => s + h.amount, 0);
  const total = Math.max(0, subtotal - discount);

  const nextReceiptNo = () => {
    const y = new Date().getFullYear();
    const seq = state.receipts.filter((r) => r.receiptNo.startsWith(`PS-${y}`)).length + 1;
    return `PS-${y}-${String(seq).padStart(4, '0')}`;
  };

  const collect = () => {
    if (!student || !selHeads.length) { alert(t('suites.pathshala.fee.selectShishyaFee')); return; }
    const receiptNo = nextReceiptNo();
    const receipt: FeeReceipt = {
      id: uid('rcpt'), receiptNo, date: todayISO(), studentId: student.id,
      studentName: student.studentName,
      vargaId: state.shishyaMeta.find((m) => m.studentId === student.id)?.vargaId || '',
      heads: selHeads.map((h) => ({ feeHeadId: h.id, name: `${h.nameBn} (${h.name})`, amount: h.amount })),
      discount, total, receivedBy: 'Karyalaya',
    };
    // Post to treasury (cloud-synced financial record).
    const ok = addTreasuryTransaction({
      workspaceId: activeWorkspace.id,
      date: new Date().toISOString(), type: 'Income', category: 'Shulk (Fees)',
      subcategory: 'Pathshala', amount: total, handledBy: 'Karyalaya',
      paymentMode: payMode, referenceNo: receiptNo,
      purpose: `Pathshala fee — ${student.studentName} (${receiptNo})`,
    });
    receipt.treasuryTxId = ok ? 'posted' : undefined;
    add('receipts', receipt);
    setCollectFor(''); setHeads({}); setDiscount(0);
    setPrintR({ r: receipt, duplicate: false });
  };

  const filtered = useMemo(() => gurukulStudents.filter((s) => !search || s.studentName.toLowerCase().includes(search.toLowerCase()) || s.rollNo.toLowerCase().includes(search.toLowerCase())), [gurukulStudents, search]);
  const todayTotal = state.receipts.filter((r) => r.date === todayISO()).reduce((s, r) => s + r.total, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-stone-800">{t('suites.pathshala.fee.heading')}</h2>
        <div className="text-sm bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5">{t('suites.pathshala.fee.todayCollection')}: <b className="text-emerald-700">{inr(todayTotal)}</b></div>
      </div>

      {/* collect */}
      <Card>
        <h3 className="font-bold text-stone-800 mb-3">{t('suites.pathshala.fee.collectTitle')}</h3>
        <div className="grid sm:grid-cols-3 gap-3 mb-3 no-print">
          <Field label={t('suites.pathshala.fee.findShishya')}><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('suites.pathshala.fee.phSearch')} className={inputCls} /></Field>
          <Field label={t('suites.pathshala.fee.fShishya')}>
            <select value={collectFor} onChange={(e) => setCollectFor(e.target.value)} className={inputCls}>
              <option value="">{t('suites.pathshala.fee.selectDash')}</option>
              {filtered.slice(0, 50).map((s) => <option key={s.id} value={s.id}>{s.studentName} ({s.rollNo})</option>)}
            </select>
          </Field>
          <Field label={t('suites.pathshala.fee.fPayMode')}>
            <select value={payMode} onChange={(e) => setPayMode(e.target.value)} className={inputCls}>
              {['Cash', 'UPI / QR', 'Bank Transfer', 'Cheque'].map((m) => <option key={m}>{m}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-2 mb-3">
          {state.feeHeads.map((h) => (
            <label key={h.id} className={`flex items-center justify-between border rounded-xl px-3 py-2.5 cursor-pointer ${heads[h.id] ? 'border-amber-600 bg-amber-50' : 'border-stone-200'}`}>
              <span className="flex items-center gap-2">
                <input type="checkbox" checked={!!heads[h.id]} onChange={(e) => setHeads({ ...heads, [h.id]: e.target.checked })} className="w-5 h-5 accent-amber-700" />
                <span className="text-sm font-semibold">{h.nameBn} <span className="text-stone-500 font-normal text-xs">({h.frequency})</span></span>
              </span>
              <span className="font-bold">{inr(h.amount)}</span>
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 items-end no-print">
          <Field label={t('suites.pathshala.fee.fDiscount')} className="!w-32"><input type="number" min={0} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className={inputCls} /></Field>
          <div className="text-lg font-extrabold">{t('suites.pathshala.fee.total')}: <span className="text-amber-700">{inr(total)}</span></div>
          <div className="text-xs text-stone-500 w-full">{receiptWords(total, lang, wsCurrency.code)}</div>
          <Btn onClick={collect} disabled={!student || !selHeads.length}><ReceiptIcon className="w-4 h-4" /> {t('suites.pathshala.fee.collectBtn')}</Btn>
        </div>
      </Card>

      {/* fee heads */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-stone-800">{t('suites.pathshala.fee.headsTitle')}</h3>
          <Btn variant="ghost" onClick={() => setShowHeadForm(true)}><Plus className="w-4 h-4" /> {t('suites.pathshala.fee.newHead')}</Btn>
        </div>
        <div className="flex flex-wrap gap-2">
          {state.feeHeads.map((h) => (
            <span key={h.id} className="inline-flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-full px-3 py-1.5 text-sm">
              <b>{h.nameBn}</b> {inr(h.amount)} <span className="text-stone-400 text-xs">({h.frequency})</span>
              <button onClick={() => { if (window.confirm(t('suites.pathshala.fee.confirmDelete'))) remove('feeHeads', h.id); }} className="text-red-400 hover:text-red-600" aria-label={t('suites.pathshala.fee.confirmDelete')}><Trash2 className="w-3.5 h-3.5" /></button>
            </span>
          ))}
        </div>
        {showHeadForm && (
          <div className="grid sm:grid-cols-4 gap-2 mt-3 no-print">
            <input value={headForm.nameBn} onChange={(e) => setHeadForm({ ...headForm, nameBn: e.target.value })} placeholder={t('suites.pathshala.fee.phBnName')} className={inputCls} />
            <input value={headForm.name} onChange={(e) => setHeadForm({ ...headForm, name: e.target.value })} placeholder={t('suites.pathshala.fee.phEnName')} className={inputCls} />
            <input type="number" value={headForm.amount} onChange={(e) => setHeadForm({ ...headForm, amount: Number(e.target.value) })} placeholder={t('suites.pathshala.fee.phTaka')} className={inputCls} />
            <div className="flex gap-2">
              <select value={headForm.frequency} onChange={(e) => setHeadForm({ ...headForm, frequency: e.target.value as typeof headForm.frequency })} className={inputCls}>
                <option value="monthly">{t('suites.pathshala.fee.freqMonthly')}</option><option value="one-time">{t('suites.pathshala.fee.freqOneTime')}</option><option value="annual">{t('suites.pathshala.fee.freqAnnual')}</option><option value="exam">{t('suites.pathshala.fee.freqExam')}</option>
              </select>
              <Btn onClick={() => { if (!headForm.nameBn.trim()) return; add('feeHeads', { id: uid('fh'), ...headForm }); setShowHeadForm(false); setHeadForm({ name: '', nameBn: '', amount: 0, frequency: 'monthly' }); }}>{t('suites.pathshala.fee.add')}</Btn>
            </div>
          </div>
        )}
      </Card>

      {/* receipt history */}
      <Card>
        <h3 className="font-bold text-stone-800 mb-3">{t('suites.pathshala.fee.receiptHistory')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-stone-500 border-b">{[t('suites.pathshala.fee.colReceiptNo'), t('suites.pathshala.fee.colDate'), t('suites.pathshala.fee.colShishya'), t('suites.pathshala.fee.colHead'), t('suites.pathshala.fee.colTotal'), ''].map((h) => <th key={h} className="py-2 pr-3">{h}</th>)}</tr></thead>
            <tbody>
              {[...state.receipts].reverse().slice(0, 30).map((r) => (
                <tr key={r.id} className="border-b border-stone-100">
                  <td className="py-2 pr-3 font-mono text-xs">{r.receiptNo}</td>
                  <td className="py-2 pr-3">{fmtDateEn(r.date)}</td>
                  <td className="py-2 pr-3 font-semibold">{r.studentName}</td>
                  <td className="py-2 pr-3 text-xs">{t('suites.pathshala.fee.headsCount').replace('{count}', String(r.heads.length))}</td>
                  <td className="py-2 pr-3 font-bold">{inr(r.total)}</td>
                  <td className="py-2 flex gap-1 no-print">
                    <button onClick={() => setPrintR({ r, duplicate: false })} className="p-2 rounded-lg bg-stone-100 hover:bg-stone-200" title={t('suites.pathshala.fee.print')} aria-label={t('suites.pathshala.fee.print')}><Printer className="w-4 h-4" /></button>
                    <button onClick={() => setPrintR({ r, duplicate: true })} className="p-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800" title={t('suites.pathshala.fee.duplicate')} aria-label={t('suites.pathshala.fee.duplicate')}><Copy className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!state.receipts.length && <Empty text={t('suites.pathshala.fee.noReceipts')} />}
        </div>
      </Card>

      {/* receipt print */}
      {printR && (
        <Modal title={t('suites.pathshala.fee.receiptModal')} onClose={() => setPrintR(null)} wide>
          <div className="print-area rounded-xl border-2 border-amber-800 p-5 relative">
            {printR.duplicate && <div className="absolute top-4 right-4 border-2 border-red-600 text-red-600 font-extrabold px-3 py-1 rotate-[-8deg]">{t('suites.pathshala.fee.duplicate')}</div>}
            <h2 className="text-center font-extrabold text-xl">{orgName}</h2>
            <p className="text-center text-sm mb-1">॥ {t('suites.pathshala.fee.receiptPrintTitle')} ॥</p>
            <div className="flex justify-between text-sm mb-3"><span>{t('suites.pathshala.fee.colReceiptNo')}: <b className="font-mono">{printR.r.receiptNo}</b></span><span>{t('suites.pathshala.fee.colDate')}: {fmtDateEn(printR.r.date)}</span></div>
            <table className="mb-2">
              <tbody>
                <tr><td><b>{t('suites.pathshala.fee.studentName')}</b></td><td>{printR.r.studentName}</td></tr>
                <tr><td><b>{t('suites.pathshala.fee.colVarga')}</b></td><td>{state.vargas.find((v) => v.id === printR.r.vargaId)?.name || '—'}</td></tr>
              </tbody>
            </table>
            <table>
              <thead><tr><th>{t('suites.pathshala.fee.colHead')}</th><th>{t('suites.pathshala.fee.phTaka')}</th></tr></thead>
              <tbody>
                {printR.r.heads.map((h, i) => <tr key={i}><td>{h.name}</td><td>{inr(h.amount)}</td></tr>)}
                {printR.r.discount > 0 && <tr><td>{t('suites.pathshala.fee.discountRow')}</td><td>− {inr(printR.r.discount)}</td></tr>}
                <tr><td><b>{t('suites.pathshala.fee.grandTotal')}</b></td><td><b>{inr(printR.r.total)}</b></td></tr>
              </tbody>
            </table>
            <p className="text-sm mt-2"><b>{t('suites.pathshala.fee.inWords')}:</b> {receiptWords(printR.r.total, lang, wsCurrency.code)}</p>
            <div className="flex justify-between mt-8 text-sm">
              <div><div className="border-t border-black pt-1 px-6">{t('suites.pathshala.fee.receivedBy')}</div></div>
              <div><div className="border-t border-black pt-1 px-6">{t('suites.pathshala.fee.acharyaSeal')}</div></div>
            </div>
          </div>
          <div className="flex gap-2 mt-3 no-print">
            <Btn onClick={() => window.print()}><Printer className="w-4 h-4" /> {t('suites.pathshala.fee.print')}</Btn>
            <Btn variant="ghost" onClick={() => setPrintR(null)}>{t('suites.pathshala.fee.close')}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
