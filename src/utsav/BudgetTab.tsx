import React, { useState } from 'react';
import { useUtsav, uid } from './utsavStore';
import { BudgetLine, BudgetKind, INCOME_HEADS, EXPENSE_HEADS } from './types';
import { T, Card, Btn, Field, Modal, inputCls, Empty, fmtDate, inr } from './ui';
import { useToast } from '../context/ToastContext';
import { useData } from '../context/DataContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useLanguage } from '../context/LanguageContext';

/* Utsav One — budget planner: income vs expense heads, planned vs actual,
 * variance. Actuals can be posted to treasury (the cloud leg). */

const blank: Omit<BudgetLine, 'id' | 'festivalId'> = {
  kind: 'expense', head: EXPENSE_HEADS[0], planned: 0, actual: 0, notes: '',
};

export const BudgetTab: React.FC = () => {
  const { t } = useLanguage();
  const { state, add, update, remove } = useUtsav();
  const { showToast } = useToast();
  const { addTreasuryTransaction } = useData();
  const { activeWorkspace } = useAuthWorkspace();
  const [festivalId, setFestivalId] = useState(state.festivals[0]?.id || '');
  const [editing, setEditing] = useState<BudgetLine | null>(null);
  const [form, setForm] = useState(blank);

  const fest = state.festivals.find((f) => f.id === festivalId) || state.festivals[0];
  const lines = state.budget.filter((b) => b.festivalId === (fest?.id || ''));

  if (!fest) return <Card><Empty text={t('ritual.utsav.budget.empty_add_a_festival_first_then_plan_i')} /></Card>;

  const openNew = (kind: BudgetKind) => { setForm({ ...blank, kind }); setEditing({ ...blank, kind, id: '', festivalId: fest.id } as BudgetLine); };
  const openEdit = (l: BudgetLine) => {
    setForm({ kind: l.kind, head: l.head, planned: l.planned, actual: l.actual, notes: l.notes || '' });
    setEditing(l);
  };

  const save = () => {
    if (!form.head.trim()) { showToast(t('ritual.utsav.budget.toastHeadRequired'), 'error'); return; }
    const payload = { ...form, head: form.head.trim(), planned: Math.max(0, Math.round(form.planned)), actual: Math.max(0, Math.round(form.actual)) };
    if (editing && editing.id) {
      update('budget', editing.id, payload);
      showToast(t('ritual.utsav.budget.toastUpdated'), 'success');
    } else {
      add('budget', { ...payload, id: uid('bd'), festivalId: fest.id });
      showToast(t('ritual.utsav.budget.toastAdded'), 'success');
    }
    setEditing(null);
  };

  /** Post the actual amount to treasury (income or expense). */
  const postToTreasury = (l: BudgetLine) => {
    if (l.treasuryTxId) { showToast(t('ritual.utsav.budget.toastAlreadyPosted'), 'warning'); return; }
    if (l.actual <= 0) { showToast(t('ritual.utsav.budget.toastZeroActual'), 'warning'); return; }
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
      showToast(t('ritual.utsav.budget.toastPosted'), 'success');
    } else {
      showToast(t('ritual.utsav.budget.toastPostFailed'), 'error');
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
            {kind === 'income' ? t('ritual.utsav.budget.income') : t('ritual.utsav.budget.expenses')}
            <span className="ml-2 text-xs font-normal text-stone-500">
              {t('ritual.utsav.budget.plannedActual').replace('{planned}', inr(planned)).replace('{actual}', inr(actual))}
            </span>
          </h3>
          <Btn onClick={() => openNew(kind)}>＋ {t('ritual.common.add')}</Btn>
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
                  <Btn variant="ghost" onClick={() => postToTreasury(l)}>💰 {t('ritual.utsav.budget.post_actual_to_treasury')}</Btn>
                ) : (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">✓ {t('ritual.utsav.budget.treasury_posted')}</span>
                )}
                <Btn variant="ghost" onClick={() => openEdit(l)}>{t('ritual.common.edit')}</Btn>
                <Btn variant="danger" onClick={() => { remove('budget', l.id); showToast(t('ritual.utsav.budget.toastRemoved'), 'success'); }}>{t('ritual.common.remove')}</Btn>
              </div>
            </div>
          ))}
        </div>
        <div className={`mt-3 text-sm font-bold ${variance === 0 ? 'text-stone-500' : variance > 0 ? (kind === 'income' ? 'text-emerald-700' : 'text-red-700') : (kind === 'income' ? 'text-red-700' : 'text-emerald-700')}`}>
          {t('ritual.utsav.budget.variance').replace('{sign}', variance >= 0 ? '+' : '').replace('{amount}', inr(variance))}
        </div>
      </Card>
    );
  };

  const heads = form.kind === 'income' ? INCOME_HEADS : EXPENSE_HEADS;

  return (
    <div className="space-y-4">
      <Field label={t('ritual.common.festival')}>
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
        <Modal title={editing.id ? t('ritual.utsav.budget.editLine') : t('ritual.utsav.budget.addLine')} onClose={() => setEditing(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t('ritual.utsav.budget.type')}>
              <select className={inputCls} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as BudgetKind, head: e.target.value === 'income' ? INCOME_HEADS[0] : EXPENSE_HEADS[0] })}>
                <option value="income">{t('ritual.utsav.budget.income')}</option>
                <option value="expense">{t('ritual.utsav.budget.expenses')}</option>
              </select>
            </Field>
            <Field label={t('ritual.utsav.budget.head')}>
              <select className={inputCls} value={heads.includes(form.head as never) ? form.head : heads[0]} onChange={(e) => setForm({ ...form, head: e.target.value })}>
                {heads.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </Field>
            <Field label={t('ritual.utsav.budget.planned_amount')}>
              <input type="number" min={0} className={inputCls} value={form.planned} onChange={(e) => setForm({ ...form, planned: Math.max(0, Math.round(Number(e.target.value) || 0)) })} />
            </Field>
            <Field label={t('ritual.utsav.budget.actual_amount')}>
              <input type="number" min={0} className={inputCls} value={form.actual} onChange={(e) => setForm({ ...form, actual: Math.max(0, Math.round(Number(e.target.value) || 0)) })} />
            </Field>
            <Field label={t('ritual.common.notes')} className="sm:col-span-2">
              <input className={inputCls} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
          </div>
          <div className="flex gap-2 mt-4">
            <Btn onClick={save}>{t('ritual.common.save')}</Btn>
            <Btn variant="ghost" onClick={() => setEditing(null)}>{t('ritual.common.cancel')}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
