import React, { useState } from 'react';
import { useYoga, uid, todayISO, monthISO, nextReceiptNo, feePaid, feesOverdue, feesCollected } from './yogaStore';
import { FeeRecord, PaymentMode } from './types';
import { T, Card, Btn, Field, Modal, inputCls, StatusPill, fmtDate, fmtPeriod } from './ui';
import { useInr, useWorkspaceCurrency } from '../hooks/useWorkspaceInr';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { useData } from '../context/DataContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';

/* ------------------------------------------------------------------ */
/* Yoga fees — collect monthly/quarterly fees, issue receipts, post to  */
/* treasury as class income. Honest: class fees are generally not      */
/* 80G-eligible — posted as non-80G income, stated plainly.             */
/* ------------------------------------------------------------------ */

const MODES: PaymentMode[] = ['Cash', 'UPI', 'Bank Transfer', 'Other'];

export const FeesTab: React.FC = () => {
  const inr = useInr();
  const wsCurrency = useWorkspaceCurrency();
  const { state, add, update, setSettings } = useYoga();
  const { addTreasuryTransaction } = useData();
  const { activeWorkspace } = useAuthWorkspace();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [period, setPeriod] = useState(monthISO());
  const [collecting, setCollecting] = useState<string | null>(null);
  const [form, setForm] = useState({ amount: 0, mode: 'Cash' as PaymentMode, receivedBy: '', notes: '' });
  const [printing, setPrinting] = useState<string | null>(null);

  const overdue = feesOverdue(state, period);
  const collected = feesCollected(state, period);
  const activeStudents = state.students.filter((s) => s.status === 'active');

  const openCollect = (studentId: string) => {
    const s = state.students.find((x) => x.id === studentId);
    const b = state.batches.find((x) => x.id === s?.batchId);
    const mult = s?.feeCycle === 'quarterly' ? 3 : 1;
    setForm({ amount: (b?.feeMonthly || state.settings.defaultFeeMonthly) * mult, mode: 'Cash', receivedBy: '', notes: '' });
    setCollecting(studentId);
  };

  const confirmCollect = () => {
    if (!collecting || form.amount <= 0) { showToast(t('suites.yoga.fees.toastNeedAmount'), 'warning'); return; }
    const s = state.students.find((x) => x.id === collecting);
    const b = state.batches.find((x) => x.id === s?.batchId);
    const { receiptNo, seq } = nextReceiptNo(state.settings);
    const fee: FeeRecord = {
      id: uid('fee'), receiptNo, studentId: collecting, batchId: s?.batchId || '',
      period, amount: form.amount, paidAt: Date.now(), paidDate: todayISO(),
      paymentMode: form.mode, receivedBy: form.receivedBy.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };
    add('fees', fee);
    setSettings({ receiptSeq: seq });
    showToast(t('suites.yoga.fees.toastReceipt').replace('{receipt}', receiptNo).replace('{amount}', inr(form.amount)), 'success');
    setCollecting(null);
  };

  const postToTreasury = (fee: FeeRecord) => {
    if (fee.treasuryTxId) { showToast(t('suites.yoga.fees.toastAlreadyPosted'), 'warning'); return; }
    const s = state.students.find((x) => x.id === fee.studentId);
    const b = state.batches.find((x) => x.id === fee.batchId);
    const ok = addTreasuryTransaction({
      workspaceId: activeWorkspace.id,
      date: new Date().toISOString(),
      type: 'Income', category: 'Yoga Class Fees',
      subcategory: `Yoga One — ${b?.name || ''}`.trim(),
      amount: fee.amount,
      handledBy: fee.receivedBy || 'Shala',
      paymentMode: fee.paymentMode, referenceNo: fee.receiptNo,
      purpose: `Yoga fee — ${s?.name || ''} (${fmtPeriod(fee.period)})`,
      // Honest: class fees are generally not 80G-eligible.
      is80GEligible: false, taxReceiptIssued: false,
      devoteeName: s?.name || '',
    });
    if (ok) {
      update('fees', fee.id, { treasuryTxId: 'posted' });
      showToast(t('suites.yoga.fees.toastPosted'), 'success');
    } else {
      showToast(t('suites.yoga.fees.toastPostFailed'), 'error');
    }
  };

  const printReceipt = (id: string) => {
    setPrinting(id);
    setTimeout(() => { window.print(); setPrinting(null); }, 150);
  };

  const periodFees = state.fees.filter((f) => f.period === period).sort((a, b) => b.paidAt - a.paidAt);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-extrabold text-stone-800"><T en="Fees" bn="ফি" hi="शुल्क" /></h2>
        <Field label={<T en="Period" bn="সময়কাল" hi="अवधि" />}>
          <input type="month" className={inputCls} value={period} onChange={(e) => setPeriod(e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="text-center">
          <div className="text-2xl font-extrabold text-emerald-700">{inr(collected)}</div>
          <div className="text-xs font-semibold text-stone-500"><T en="collected" bn="আদায়" hi="वसूला" /> {fmtPeriod(period)}</div>
        </Card>
        <Card className="text-center">
          <div className={`text-2xl font-extrabold ${overdue.length ? 'text-red-700' : 'text-stone-700'}`}>{overdue.length}</div>
          <div className="text-xs font-semibold text-stone-500"><T en="students unpaid" bn="শিক্ষার্থী বাকি" hi="छात्र बकाया" /></div>
        </Card>
      </div>

      {overdue.length > 0 && (
        <Card className="border-amber-200">
          <h3 className="font-extrabold text-stone-800 mb-2"><T en="Collect now" bn="এখন আদায় করুন" hi="अभी वसूलें" /> — {fmtPeriod(period)}</h3>
          <div className="space-y-1">
            {overdue.map((s) => {
              const b = state.batches.find((x) => x.id === s.batchId);
              const mult = s.feeCycle === 'quarterly' ? 3 : 1;
              const due = (b?.feeMonthly || state.settings.defaultFeeMonthly) * mult;
              return (
                <div key={s.id} className="flex items-center justify-between gap-2 py-2 border-b border-stone-100 last:border-0">
                  <div>
                    <div className="font-semibold text-stone-800 text-sm">{s.name}</div>
                    <div className="text-xs text-stone-500">{b?.name} · {s.feeCycle === 'quarterly' ? <T en="quarterly" bn="ত্রৈমাসিক" hi="त्रैमासिक" /> : <T en="monthly" bn="মাসিক" hi="मासिक" />} · {inr(due)}</div>
                  </div>
                  <Btn onClick={() => openCollect(s.id)}><T en="Collect" bn="আদায়" hi="वसूलें" /></Btn>
                </div>
              );
            })}
          </div>
        </Card>
      )}
      {overdue.length === 0 && activeStudents.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✓ <T en="All active students have paid for this period." bn="সবাই এই সময়ের ফি দিয়েছে।" hi="सभी ने इस अवधि का शुल्क दे दिया है।" />
        </div>
      )}

      <Card>
        <h3 className="font-extrabold text-stone-800 mb-2"><T en="Receipts" bn="রসিদ" hi="रसीदें" /> — {fmtPeriod(period)}</h3>
        <div className="space-y-2">
          {periodFees.map((f) => {
            const s = state.students.find((x) => x.id === f.studentId);
            const isPrinting = printing === f.id;
            return (
              <div key={f.id} className={`flex items-center justify-between gap-2 py-2 border-b border-stone-100 last:border-0 ${isPrinting ? 'print-receipt' : ''}`}>
                <div>
                  <div className="font-mono font-bold text-stone-800 text-sm">{f.receiptNo}</div>
                  <div className="text-xs text-stone-500">{s?.name} · {fmtDate(f.paidDate)} · {f.paymentMode}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-stone-800">{inr(f.amount)}</span>
                  {f.treasuryTxId
                    ? <StatusPill status="paid" />
                    : <Btn variant="ghost" onClick={() => postToTreasury(f)}><T en="Post" bn="পোস্ট" hi="पोस्ट" /></Btn>}
                  <button onClick={() => printReceipt(f.id)} className="w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 text-sm no-print" aria-label="Print">🖨️</button>
                </div>
              </div>
            );
          })}
          {periodFees.length === 0 && <p className="text-sm text-stone-500"><T en="No receipts this period yet." bn="এই সময়ে এখনও কোনো রসিদ নেই।" hi="इस अवधि में अभी कोई रसीद नहीं।" /></p>}
        </div>
        <p className="text-[11px] text-stone-400 mt-3">⚖️ <T en="Class fees are generally not 80G-eligible — receipts are honest payment records, not tax receipts." bn="ক্লাস ফি সাধারণত 80G-যোগ্য নয়।" hi="कक्षा शुल्क सामान्यतः 80G-योग्य नहीं है।" /></p>
      </Card>

      {collecting && (
        <Modal title={<T en="Collect fee" bn="ফি আদায়" hi="शुल्क वसूलें" />} onClose={() => setCollecting(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={<T en={`Amount (${wsCurrency.symbol})`} bn={`টাকা (${wsCurrency.symbol})`} hi={`राशि (${wsCurrency.symbol})`} />}>
              <input type="number" min={1} className={inputCls} value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
            </Field>
            <Field label={<T en="Payment mode" bn="পেমেন্ট মাধ্যম" hi="भुगतान माध्यम" />}>
              <select className={inputCls} value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as PaymentMode })}>
                {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            <Field label={<T en="Received by" bn="গ্রহণকারী" hi="प्राप्तकर्ता" />} className="sm:col-span-2">
              <input className={inputCls} value={form.receivedBy} onChange={(e) => setForm({ ...form, receivedBy: e.target.value })} placeholder="Teacher / desk name" />
            </Field>
            <Field label={<T en="Notes" bn="নোট" hi="नोट" />} className="sm:col-span-2">
              <input className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" />
            </Field>
          </div>
          <div className="flex gap-2 mt-4">
            <Btn onClick={confirmCollect}><T en="Issue receipt" bn="রসিদ দিন" hi="रसीद जारी करें" /></Btn>
            <Btn variant="ghost" onClick={() => setCollecting(null)}><T en="Cancel" bn="বাতিল" hi="रद्द करें" /></Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
