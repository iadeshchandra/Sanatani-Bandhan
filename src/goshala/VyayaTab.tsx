import React, { useMemo, useState } from 'react';
import { useGoshala, uid, todayISO } from './goshalaStore';
import { ExpenseHead } from './types';
import { Card, Stat, Btn, Field, inputCls, Empty, EXPENSE_HEAD_KEY, labelFor } from './ui';
import { fmtDateEn } from '../pathshala/bn';
import { useInr } from '../hooks/useWorkspaceInr';
import { useToast } from '../context/ToastContext';
import { useData } from '../context/DataContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useLanguage } from '../context/LanguageContext';

/* Goshala One — Vyaya (expenses): feed, vet, staff, maintenance — posted
   to treasury with fund segregation (Goshala One subcategory). */

const HEADS: ExpenseHead[] = ['feed', 'vet', 'staff', 'maintenance', 'other'];

export const VyayaTab: React.FC = () => {
  const inr = useInr();
  const { state, add, remove } = useGoshala();
  const { addTreasuryTransaction } = useData();
  const { activeWorkspace } = useAuthWorkspace();
  const { t } = useLanguage();
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
    if (!(f.amount > 0)) { showToast(t('suites.goshala.vyaya.need'), 'warning'); return; }
    const ok = addTreasuryTransaction({
      workspaceId: activeWorkspace.id,
      date: new Date(f.date).toISOString(), type: 'Expense', category: 'Gau Seva (Expense)',
      subcategory: `Goshala One — ${f.head}`, amount: Number(f.amount), handledBy: 'Goshala Karyalaya',
      paymentMode: f.paymentMode, purpose: `Goshala expense — ${f.head}${f.paidTo ? ` → ${f.paidTo}` : ''}${f.notes ? ` (${f.notes})` : ''}`,
    });
    add('expenses', { id: uid('e'), date: f.date, head: f.head, amount: Number(f.amount), paidTo: f.paidTo || undefined, paymentMode: f.paymentMode, treasuryTxId: ok ? 'posted' : undefined, notes: f.notes || undefined });
    showToast(t('suites.goshala.vyaya.added'), 'success');
    setF({ date: todayISO(), head: 'feed', amount: 0, paidTo: '', paymentMode: 'Cash', notes: '' });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-stone-800">{t('suites.goshala.vyaya.title')}</h2>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <Stat label={t('suites.goshala.vyaya.thisMonth')} value={inr(totals.month)} tone="red" />
        {HEADS.map((h) => (
          <Stat key={h} label={t(EXPENSE_HEAD_KEY[h])} value={inr(totals.byHead[h] || 0)} tone="amber" />
        ))}
      </div>

      <Card>
        <h3 className="font-bold text-stone-800 mb-3">{t('suites.goshala.vyaya.recordExpense')}</h3>
        <form onSubmit={submit} className="grid sm:grid-cols-3 gap-3">
          <Field label={t('suites.goshala.vyaya.date')}><input type="date" className={inputCls} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Field label={t('suites.goshala.vyaya.head')}>
            <select className={inputCls} value={f.head} onChange={(e) => setF({ ...f, head: e.target.value as ExpenseHead })}>
              {HEADS.map((h) => <option key={h} value={h}>{t(EXPENSE_HEAD_KEY[h])}</option>)}
            </select>
          </Field>
          <Field label={t('suites.goshala.vyaya.amount')}><input type="number" min={0} className={inputCls} value={f.amount || ''} onChange={(e) => setF({ ...f, amount: Number(e.target.value) })} /></Field>
          <Field label={t('suites.goshala.vyaya.paidTo')}><input className={inputCls} value={f.paidTo} onChange={(e) => setF({ ...f, paidTo: e.target.value })} /></Field>
          <Field label={t('suites.goshala.vyaya.mode')}>
            <select className={inputCls} value={f.paymentMode} onChange={(e) => setF({ ...f, paymentMode: e.target.value })}>
              {['Cash', 'UPI', 'Bank', 'Cheque'].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label={t('suites.goshala.vyaya.notes')}><input className={inputCls} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
          <div className="sm:col-span-3"><Btn type="submit">{t('suites.goshala.vyaya.record')}</Btn></div>
        </form>
      </Card>

      <Card>
        <h3 className="font-bold text-stone-800 mb-2">{t('suites.goshala.vyaya.expenseLog')}</h3>
        {state.expenses.length === 0 ? <Empty text="—" /> : (
          <ul className="text-sm space-y-1.5 max-h-72 overflow-y-auto">
            {[...state.expenses].sort((a, b) => b.date.localeCompare(a.date)).map((e) => (
              <li key={e.id} className="flex flex-wrap justify-between gap-2 border-b border-stone-100 py-1.5">
                <span><span className="font-mono text-xs bg-stone-100 rounded px-1.5 py-0.5 mr-1">{labelFor(t, EXPENSE_HEAD_KEY, e.head)}</span>{e.paidTo || ''}{e.treasuryTxId && <span className="text-emerald-700 text-xs ml-1">· {t('suites.goshala.common.treasuryPosted')}</span>}</span>
                <span><b className="text-red-700">{inr(e.amount)}</b> <span className="text-stone-500">{e.paymentMode} · {fmtDateEn(e.date)}</span>
                  <button className="ml-2 text-xs font-bold text-red-600 hover:underline" onClick={() => { if (confirm(t('suites.goshala.common.confirmDelete'))) remove('expenses', e.id); }}>✕</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};
