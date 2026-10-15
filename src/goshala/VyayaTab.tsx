import React, { useMemo, useState } from 'react';
import { useGoshala, uid, todayISO } from './goshalaStore';
import { ExpenseHead } from './types';
import { Card, Stat, T, Btn, Field, inputCls, Empty, useLocaleText } from './ui';
import { fmtDateEn, inr } from '../pathshala/bn';
import { useToast } from '../context/ToastContext';
import { useData } from '../context/DataContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';

/* Goshala One — Vyaya (expenses): feed, vet, staff, maintenance — posted
   to treasury with fund segregation (Goshala One subcategory). */

const HEADS: ExpenseHead[] = ['feed', 'vet', 'staff', 'maintenance', 'other'];

export const VyayaTab: React.FC = () => {
  const { state, add, remove } = useGoshala();
  const { addTreasuryTransaction } = useData();
  const { activeWorkspace } = useAuthWorkspace();
  const { tr } = useLocaleText();
  const { showToast } = useToast();
  const [f, setF] = useState({ date: todayISO(), head: 'feed' as ExpenseHead, amount: 0, paidTo: '', paymentMode: 'Cash', notes: '' });

  const totals = useMemo(() => {
    const mk = todayISO().slice(0, 7);
    const month = state.expenses.filter((e) => e.date.startsWith(mk)).reduce((s, e) => s + e.amount, 0);
    const byHead = Object.fromEntries(HEADS.map((h) => [h, state.expenses.filter((e) => e.date.startsWith(mk) && e.head === h).reduce((s, e) => s + e.amount, 0)]));
    return { month, byHead };
  }, [state.expenses]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!(f.amount > 0)) { showToast(tr('goshala.vyaya.need', 'Enter amount', 'টাকা দিন', 'राशि दें'), 'warning'); return; }
    const ok = addTreasuryTransaction({
      workspaceId: activeWorkspace.id,
      date: new Date(f.date).toISOString(), type: 'Expense', category: 'Gau Seva (Expense)',
      subcategory: `Goshala One — ${f.head}`, amount: Number(f.amount), handledBy: 'Goshala Karyalaya',
      paymentMode: f.paymentMode, purpose: `Goshala expense — ${f.head}${f.paidTo ? ` → ${f.paidTo}` : ''}${f.notes ? ` (${f.notes})` : ''}`,
    });
    add('expenses', { id: uid('e'), date: f.date, head: f.head, amount: Number(f.amount), paidTo: f.paidTo || undefined, paymentMode: f.paymentMode, treasuryTxId: ok ? 'posted' : undefined, notes: f.notes || undefined });
    showToast(tr('goshala.vyaya.added', 'Expense recorded + posted to treasury', 'খরচ রেকর্ডকৃত + কোষাগারে', 'व्यय दर्ज + कोषागार में'), 'success');
    setF({ date: todayISO(), head: 'feed', amount: 0, paidTo: '', paymentMode: 'Cash', notes: '' });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-stone-800"><T en="Vyaya — expenses" bn="ব্যয়" hi="व्यय" sa="व्यय-लेखा" /></h2>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <Stat label={<T en="This month" bn="এই মাসে" hi="इस माह" />} value={inr(totals.month)} tone="red" />
        {HEADS.map((h) => (
          <Stat key={h} label={<T en={h} bn={h} hi={h} />} value={inr(totals.byHead[h] || 0)} tone="amber" />
        ))}
      </div>

      <Card>
        <h3 className="font-bold text-stone-800 mb-3"><T en="Record expense" bn="খরচ লিখুন" hi="व्यय दर्ज करें" /></h3>
        <form onSubmit={submit} className="grid sm:grid-cols-3 gap-3">
          <Field label={<T en="Date" bn="তারিখ" hi="तिथि" />}><input type="date" className={inputCls} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Field label={<T en="Head" bn="খাত" hi="मद" />}>
            <select className={inputCls} value={f.head} onChange={(e) => setF({ ...f, head: e.target.value as ExpenseHead })}>
              {HEADS.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </Field>
          <Field label={<T en="Amount ₹" bn="টাকা ₹" hi="राशि ₹" />}><input type="number" min={0} className={inputCls} value={f.amount || ''} onChange={(e) => setF({ ...f, amount: Number(e.target.value) })} /></Field>
          <Field label={<T en="Paid to" bn="প্রাপক" hi="प्राप्तकर्ता" />}><input className={inputCls} value={f.paidTo} onChange={(e) => setF({ ...f, paidTo: e.target.value })} /></Field>
          <Field label={<T en="Mode" bn="মাধ্যম" hi="माध्यम" />}>
            <select className={inputCls} value={f.paymentMode} onChange={(e) => setF({ ...f, paymentMode: e.target.value })}>
              {['Cash', 'UPI', 'Bank', 'Cheque'].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label={<T en="Notes" bn="মন্তব্য" hi="टिप्पणी" />}><input className={inputCls} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
          <div className="sm:col-span-3"><Btn type="submit">{tr('goshala.vyaya.record', 'Record + post to treasury', 'রেকর্ড + কোষাগারে', 'दर्ज + कोषागार में')}</Btn></div>
        </form>
      </Card>

      <Card>
        <h3 className="font-bold text-stone-800 mb-2"><T en="Expense log" bn="খরচের হিসাব" hi="व्यय लेखा" /></h3>
        {state.expenses.length === 0 ? <Empty text="—" /> : (
          <ul className="text-sm space-y-1.5 max-h-72 overflow-y-auto">
            {[...state.expenses].sort((a, b) => b.date.localeCompare(a.date)).map((e) => (
              <li key={e.id} className="flex flex-wrap justify-between gap-2 border-b border-stone-100 py-1.5">
                <span><span className="font-mono text-xs bg-stone-100 rounded px-1.5 py-0.5 mr-1">{e.head}</span>{e.paidTo || ''}{e.treasuryTxId && <span className="text-emerald-700 text-xs ml-1">· treasury ✓</span>}</span>
                <span><b className="text-red-700">{inr(e.amount)}</b> <span className="text-stone-500">{e.paymentMode} · {fmtDateEn(e.date)}</span>
                  <button className="ml-2 text-xs font-bold text-red-600 hover:underline" onClick={() => { if (confirm(tr('goshala.confirm_del', 'Delete?', 'মুছবেন?', 'हटाएँ?'))) remove('expenses', e.id); }}>✕</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};