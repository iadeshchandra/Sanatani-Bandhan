import React, { useState } from 'react';
import { useUtsav, uid } from './utsavStore';
import { BudgetLine, BudgetKind, INCOME_HEADS, EXPENSE_HEADS } from './types';
import { T, Card, Btn, Field, Modal, inputCls, Empty, fmtDate, inr } from './ui';
import { useToast } from '../context/ToastContext';
import { useData } from '../context/DataContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';

/* Utsav One — budget planner: income vs expense heads, planned vs actual,
 * variance. Actuals can be posted to treasury (the cloud leg). */

const blank: Omit<BudgetLine, 'id' | 'festivalId'> = {
  kind: 'expense', head: EXPENSE_HEADS[0], planned: 0, actual: 0, notes: '',
};

export const BudgetTab: React.FC = () => {
  const { state, add, update, remove } = useUtsav();
  const { showToast } = useToast();
  const { addTreasuryTransaction } = useData();
  const { activeWorkspace } = useAuthWorkspace();
  const [festivalId, setFestivalId] = useState(state.festivals[0]?.id || '');
  const [editing, setEditing] = useState<BudgetLine | null>(null);
  const [form, setForm] = useState(blank);

  const fest = state.festivals.find((f) => f.id === festivalId) || state.festivals[0];
  const lines = state.budget.filter((b) => b.festivalId === (fest?.id || ''));

  if (!fest) return <Card><Empty text="Add a festival first, then plan its budget." /></Card>;

  const openNew = (kind: BudgetKind) => { setForm({ ...blank, kind }); setEditing({ ...blank, kind, id: '', festivalId: fest.id } as BudgetLine); };
  const openEdit = (l: BudgetLine) => {
    setForm({ kind: l.kind, head: l.head, planned: l.planned, actual: l.actual, notes: l.notes || '' });
    setEditing(l);
  };

  const save = () => {
    if (!form.head.trim()) { showToast('Budget head is required.', 'error'); return; }
    const payload = { ...form, head: form.head.trim(), planned: Math.max(0, Math.round(form.planned)), actual: Math.max(0, Math.round(form.actual)) };
    if (editing && editing.id) {
      update('budget', editing.id, payload);
      showToast('Budget line updated.', 'success');
    } else {
      add('budget', { ...payload, id: uid('bd'), festivalId: fest.id });
      showToast('Budget line added.', 'success');
    }
    setEditing(null);
  };

  /** Post the actual amount to treasury (income or expense). */
  const postToTreasury = (l: BudgetLine) => {
    if (l.treasuryTxId) { showToast('Already posted to treasury.', 'warning'); return; }
    if (l.actual <= 0) { showToast('Actual amount is zero — nothing to post.', 'warning'); return; }
    const isIncome = l.kind === 'income';
    const ok = addTreasuryTransaction({
      workspaceId: activeWorkspace.id,
      date: new Date().toISOString(),
      type: isIncome ? 'Income' : 'Expense',
      category: isIncome ? 'Festival Income' : 'Festival Expense',
      subcategory: `Utsav One — ${fest.name}`,
      amount: l.actual,
      handledBy: 'Utsav Samiti',
      paymentMode: 'UPI',
      purpose: `Festival ${isIncome ? 'income' : 'expense'} — ${l.head} (${fest.name})${l.notes ? ` — ${l.notes}` : ''}`,
      is80GEligible: false, taxReceiptIssued: false,
      devoteeName: isIncome ? 'Festival collection' : undefined,
    });
    if (ok) {
      update('budget', l.id, { treasuryTxId: 'posted' });
      showToast('Posted to treasury.', 'success');
    } else {
      showToast('Treasury posting failed — line kept locally, retry later.', 'error');
    }
  };

  const renderSection = (kind: BudgetKind) => {
    const items = lines.filter((l) => l.kind === kind);
    const planned = items.reduce((s, l) => s + l.planned, 0);
    const actual = items.reduce((s, l) => s + l.actual, 0);
    const variance = actual - planned;
    return (
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-extrabold text-stone-800">
            {kind === 'income' ? <T en="Income" bn="আয়" hi="आय" /> : <T en="Expenses" bn="ব্যয়" hi="व्यय" />}
            <span className="ml-2 text-xs font-normal text-stone-500">
              <T en={`Planned ${inr(planned)} · Actual ${inr(actual)}`} bn={`পরিকল্পিত ${inr(planned)} · প্রকৃত ${inr(actual)}`} hi={`नियोजित ${inr(planned)} · वास्तविक ${inr(actual)}`} />
            </span>
          </h3>
          <Btn onClick={() => openNew(kind)}>＋ <T en="Add" bn="যোগ" hi="जोड़ें" /></Btn>
        </div>
        {items.length === 0 && <Empty text={kind === 'income' ? 'No income heads yet.' : 'No expense heads yet.'} />}
        <div className="space-y-2">
          {items.map((l) => (
            <div key={l.id} className="rounded-xl border border-stone-100 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="font-bold text-stone-800">{l.head}</div>
                <div className="text-right shrink-0">
                  <div className="text-sm"><span className="text-stone-400">P</span> <span className="font-semibold">{inr(l.planned)}</span></div>
                  <div className="text-sm"><span className="text-stone-400">A</span> <span className={`font-extrabold ${kind === 'income' ? 'text-emerald-700' : 'text-red-700'}`}>{inr(l.actual)}</span></div>
                </div>
              </div>
              {l.notes && <div className="text-xs text-stone-500 mt-1">{l.notes}</div>}
              <div className="flex flex-wrap gap-2 mt-2 no-print">
                {!l.treasuryTxId ? (
                  <Btn variant="ghost" onClick={() => postToTreasury(l)}>💰 <T en="Post actual to treasury" bn="প্রকৃত কোষাগারে পোস্ট" hi="वास्तविक कोषागार में दर्ज करें" /></Btn>
                ) : (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">✓ <T en="treasury posted" bn="কোষাগারে পোস্টড" hi="कोषागार में दर्ज" /></span>
                )}
                <Btn variant="ghost" onClick={() => openEdit(l)}><T en="Edit" bn="সম্পাদনা" hi="संपादित करें" /></Btn>
                <Btn variant="danger" onClick={() => { remove('budget', l.id); showToast('Budget line removed.', 'success'); }}><T en="Remove" bn="মুছুন" hi="हटाएं" /></Btn>
              </div>
            </div>
          ))}
        </div>
        <div className={`mt-3 text-sm font-bold ${variance === 0 ? 'text-stone-500' : variance > 0 ? (kind === 'income' ? 'text-emerald-700' : 'text-red-700') : (kind === 'income' ? 'text-red-700' : 'text-emerald-700')}`}>
          <T en={`Variance: ${variance >= 0 ? '+' : ''}${inr(variance)} (actual − planned)`} bn={`ব্যবধান: ${variance >= 0 ? '+' : ''}${inr(variance)}`} hi={`विचलन: ${variance >= 0 ? '+' : ''}${inr(variance)}`} />
        </div>
      </Card>
    );
  };

  const heads = form.kind === 'income' ? INCOME_HEADS : EXPENSE_HEADS;

  return (
    <div className="space-y-4">
      <Field label={<T en="Festival" bn="উৎসব" hi="उत्सव" />}>
        <select className="w-full sm:w-80 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm min-h-[44px]"
          value={fest.id} onChange={(e) => setFestivalId(e.target.value)}>
          {state.festivals.map((f) => <option key={f.id} value={f.id}>{f.name} · {fmtDate(f.startDate)}</option>)}
        </select>
      </Field>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {renderSection('income')}
        {renderSection('expense')}
      </div>

      {editing && (
        <Modal title={<T en={editing.id ? 'Edit budget line' : 'Add budget line'} bn={editing.id ? 'বাজেট সম্পাদনা' : 'বাজেট যোগ'} hi={editing.id ? 'बजट संपादित करें' : 'बजट जोड़ें'} />} onClose={() => setEditing(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={<T en="Type" bn="ধরন" hi="प्रकार" />}>
              <select className={inputCls} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as BudgetKind, head: e.target.value === 'income' ? INCOME_HEADS[0] : EXPENSE_HEADS[0] })}>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </Field>
            <Field label={<T en="Head" bn="খাত" hi="मद" />}>
              <select className={inputCls} value={heads.includes(form.head as never) ? form.head : heads[0]} onChange={(e) => setForm({ ...form, head: e.target.value })}>
                {heads.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </Field>
            <Field label={<T en="Planned amount (₹)" bn="পরিকল্পিত টাকা (₹)" hi="नियोजित राशि (₹)" />}>
              <input type="number" min={0} className={inputCls} value={form.planned} onChange={(e) => setForm({ ...form, planned: Math.max(0, Math.round(Number(e.target.value) || 0)) })} />
            </Field>
            <Field label={<T en="Actual amount (₹)" bn="প্রকৃত টাকা (₹)" hi="वास्तविक राशि (₹)" />}>
              <input type="number" min={0} className={inputCls} value={form.actual} onChange={(e) => setForm({ ...form, actual: Math.max(0, Math.round(Number(e.target.value) || 0)) })} />
            </Field>
            <Field label={<T en="Notes" bn="মন্তব্য" hi="टिप्पणी" />} className="sm:col-span-2">
              <input className={inputCls} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
          </div>
          <div className="flex gap-2 mt-4">
            <Btn onClick={save}><T en="Save" bn="সংরক্ষণ" hi="सहेजें" /></Btn>
            <Btn variant="ghost" onClick={() => setEditing(null)}><T en="Cancel" bn="বাতিল" hi="रद्द करें" /></Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
