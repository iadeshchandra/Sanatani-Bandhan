import React, { useState } from 'react';
import { useUtsav, uid } from './utsavStore';
import { Vendor, VendorStatus, VENDOR_CATEGORIES } from './types';
import { T, Card, Btn, Field, Modal, inputCls, StatusPill, Empty, fmtDate } from './ui';
import { useInr } from '../hooks/useWorkspaceInr';
import { useToast } from '../context/ToastContext';
import { useData } from '../context/DataContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useLanguage } from '../context/LanguageContext';

/* Utsav One — vendor management: quotes, advances, final payments.
 * Payments post to treasury as festival expenses. */

const blank: Omit<Vendor, 'id' | 'festivalId'> = {
  category: VENDOR_CATEGORIES[0], name: '', phone: '', quote: 0, advance: 0,
  paid: 0, status: 'quoted', notes: '',
};

export const VendorsTab: React.FC = () => {
  const inr = useInr();
  const { t } = useLanguage();
  const { state, add, update, remove } = useUtsav();
  const { showToast } = useToast();
  const { addTreasuryTransaction } = useData();
  const { activeWorkspace } = useAuthWorkspace();
  const [festivalId, setFestivalId] = useState(state.festivals[0]?.id || '');
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [form, setForm] = useState(blank);
  const [payAmt, setPayAmt] = useState<Record<string, string>>({});

  const fest = state.festivals.find((f) => f.id === festivalId) || state.festivals[0];
  if (!fest) return <Card><Empty text={t('ritual.utsav.vendors.empty_add_a_festival_first_then_manage')} /></Card>;

  const vendors = state.vendors.filter((v) => v.festivalId === fest.id);

  const openNew = () => { setForm(blank); setEditing({ ...blank, id: '', festivalId: fest.id } as Vendor); };
  const openEdit = (v: Vendor) => {
    setForm({ category: v.category, name: v.name, phone: v.phone || '', quote: v.quote, advance: v.advance, paid: v.paid, status: v.status, notes: v.notes || '' });
    setEditing(v);
  };

  const save = () => {
    if (!form.name.trim()) { showToast(t('ritual.utsav.vendors.toastNameRequired'), 'error'); return; }
    const payload = { ...form, name: form.name.trim(), quote: Math.max(0, Math.round(form.quote)), advance: Math.max(0, Math.round(form.advance)), paid: Math.max(0, Math.round(form.paid)) };
    if (payload.paid < payload.advance) { showToast(t('ritual.utsav.vendors.toastPaidVsAdvance'), 'error'); return; }
    if (editing && editing.id) { update('vendors', editing.id, payload); showToast(t('ritual.utsav.vendors.toastUpdated'), 'success'); }
    else { add('vendors', { ...payload, id: uid('vn'), festivalId: fest.id }); showToast(t('ritual.utsav.vendors.toastAdded'), 'success'); }
    setEditing(null);
  };

  /** Record a payment (advance top-up or final) and post to treasury. */
  const recordPayment = (v: Vendor) => {
    const amt = Math.round(Number(payAmt[v.id]) || 0);
    if (amt <= 0) { showToast(t('ritual.utsav.vendors.toastNeedAmount'), 'warning'); return; }
    // L7: capture the REAL treasury transaction id (was the literal
    // string 'posted'). With several payments, this holds the latest.
    let postedTxId = '';
    const ok = addTreasuryTransaction({
      workspaceId: activeWorkspace.id,
      date: new Date().toISOString(),
      type: 'Expense',
      category: 'Festival Expense',
      subcategory: `Utsav One — ${fest.name} · ${v.category}`,
      amount: amt,
      handledBy: 'Utsav Samiti',
      paymentMode: 'UPI',
      purpose: `Vendor payment — ${v.name} (${v.category}) for ${fest.name}`,
      is80GEligible: false, taxReceiptIssued: false,
    }, (id) => { postedTxId = id; });
    if (ok) {
      const newPaid = v.paid + amt;
      const newAdvance = Math.max(v.advance, v.status === 'quoted' ? amt : v.advance);
      update('vendors', v.id, {
        paid: newPaid,
        advance: newAdvance,
        status: newPaid >= v.quote && v.quote > 0 ? 'paid' : 'booked',
        treasuryTxId: postedTxId,
      });
      setPayAmt((p) => ({ ...p, [v.id]: '' }));
      showToast(t('ritual.utsav.vendors.toastPaid').replace('{amt}', amt.toLocaleString('en-IN')).replace('{name}', v.name), 'success');
    } else {
      showToast(t('ritual.utsav.vendors.toastPostFailed'), 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Field label={t('ritual.common.festival')}>
          <select className="w-full sm:w-80 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm min-h-[44px]"
            value={fest.id} onChange={(e) => setFestivalId(e.target.value)}>
            {state.festivals.map((f) => <option key={f.id} value={f.id}>{f.name} · {fmtDate(f.startDate)}</option>)}
          </select>
        </Field>
        <Btn onClick={openNew}>＋ {t('ritual.utsav.vendors.add_vendor')}</Btn>
      </div>

      {vendors.length === 0 && <Card><Empty text={t('ritual.utsav.vendors.empty_no_vendors_yet_add_pandal_cateri')} /></Card>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {vendors.map((v) => {
          const due = Math.max(0, v.quote - v.paid);
          return (
            <Card key={v.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-extrabold text-stone-800">{v.name}</div>
                  <div className="text-xs text-orange-700 font-semibold">{v.category}{v.phone ? ` · ${v.phone}` : ''}</div>
                </div>
                <StatusPill status={v.status} />
              </div>
              <div className="mt-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-stone-500">{t('ritual.utsav.vendors.quote')}</span><span className="font-bold">{inr(v.quote)}</span></div>
                <div className="flex justify-between"><span className="text-stone-500">{t('ritual.utsav.vendors.paid_so_far')}</span><span className="font-bold text-emerald-700">{inr(v.paid)}</span></div>
                <div className="flex justify-between"><span className="text-stone-500">{t('ritual.utsav.vendors.balance_due')}</span><span className={`font-extrabold ${due > 0 ? 'text-red-700' : 'text-stone-400'}`}>{inr(due)}</span></div>
                {v.notes && <div className="text-xs text-stone-500 pt-1">{v.notes}</div>}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3 no-print">
                <input
                  type="number" min={1} placeholder={t('ritual.utsav.vendors.amountPh')}
                  className={`${inputCls} !w-32`}
                  value={payAmt[v.id] || ''}
                  onChange={(e) => setPayAmt((p) => ({ ...p, [v.id]: e.target.value }))}
                  aria-label={t('ritual.utsav.vendors.paymentAmountPh')}
                />
                <Btn onClick={() => recordPayment(v)}>💰 {t('ritual.utsav.vendors.pay_post')}</Btn>
                <Btn variant="ghost" onClick={() => openEdit(v)}>{t('ritual.common.edit')}</Btn>
                <Btn variant="danger" onClick={() => { remove('vendors', v.id); showToast(t('ritual.utsav.vendors.toastRemoved'), 'success'); }}>{t('ritual.common.remove')}</Btn>
              </div>
            </Card>
          );
        })}
      </div>

      {editing && (
        <Modal title={editing.id ? t('ritual.utsav.vendors.editVendor') : t('ritual.utsav.vendors.add_vendor')} onClose={() => setEditing(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t('ritual.utsav.safety.category')}>
              <select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {VENDOR_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label={t('ritual.utsav.vendors.vendor_name')}>
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sharma Pandal Works" />
            </Field>
            <Field label={t('ritual.common.phone')}>
              <input className={inputCls} value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 …" />
            </Field>
            <Field label={t('ritual.common.status')}>
              <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as VendorStatus })}>
                <option value="quoted">{t('ritual.utsav.vendors.statusQuoted')}</option>
                <option value="booked">{t('ritual.utsav.vendors.statusBooked')}</option>
                <option value="paid">{t('ritual.utsav.vendors.statusPaid')}</option>
                <option value="cancelled">{t('ritual.utsav.vendors.statusCancelled')}</option>
              </select>
            </Field>
            <Field label={t('ritual.utsav.vendors.quote')}>
              <input type="number" min={0} className={inputCls} value={form.quote} onChange={(e) => setForm({ ...form, quote: Math.max(0, Math.round(Number(e.target.value) || 0)) })} />
            </Field>
            <Field label={t('ritual.utsav.vendors.advance_recorded')}>
              <input type="number" min={0} className={inputCls} value={form.advance} onChange={(e) => setForm({ ...form, advance: Math.max(0, Math.round(Number(e.target.value) || 0)) })} />
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
