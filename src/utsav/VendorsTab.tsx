import React, { useState } from 'react';
import { useUtsav, uid } from './utsavStore';
import { Vendor, VendorStatus, VENDOR_CATEGORIES } from './types';
import { T, Card, Btn, Field, Modal, inputCls, StatusPill, Empty, fmtDate, inr } from './ui';
import { useToast } from '../context/ToastContext';
import { useData } from '../context/DataContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';

/* Utsav One — vendor management: quotes, advances, final payments.
 * Payments post to treasury as festival expenses. */

const blank: Omit<Vendor, 'id' | 'festivalId'> = {
  category: VENDOR_CATEGORIES[0], name: '', phone: '', quote: 0, advance: 0,
  paid: 0, status: 'quoted', notes: '',
};

export const VendorsTab: React.FC = () => {
  const { state, add, update, remove } = useUtsav();
  const { showToast } = useToast();
  const { addTreasuryTransaction } = useData();
  const { activeWorkspace } = useAuthWorkspace();
  const [festivalId, setFestivalId] = useState(state.festivals[0]?.id || '');
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [form, setForm] = useState(blank);
  const [payAmt, setPayAmt] = useState<Record<string, string>>({});

  const fest = state.festivals.find((f) => f.id === festivalId) || state.festivals[0];
  if (!fest) return <Card><Empty text="Add a festival first, then manage its vendors." /></Card>;

  const vendors = state.vendors.filter((v) => v.festivalId === fest.id);

  const openNew = () => { setForm(blank); setEditing({ ...blank, id: '', festivalId: fest.id } as Vendor); };
  const openEdit = (v: Vendor) => {
    setForm({ category: v.category, name: v.name, phone: v.phone || '', quote: v.quote, advance: v.advance, paid: v.paid, status: v.status, notes: v.notes || '' });
    setEditing(v);
  };

  const save = () => {
    if (!form.name.trim()) { showToast('Vendor name is required.', 'error'); return; }
    const payload = { ...form, name: form.name.trim(), quote: Math.max(0, Math.round(form.quote)), advance: Math.max(0, Math.round(form.advance)), paid: Math.max(0, Math.round(form.paid)) };
    if (payload.paid < payload.advance) { showToast('Paid cannot be less than the advance already recorded.', 'error'); return; }
    if (editing && editing.id) { update('vendors', editing.id, payload); showToast('Vendor updated.', 'success'); }
    else { add('vendors', { ...payload, id: uid('vn'), festivalId: fest.id }); showToast('Vendor added.', 'success'); }
    setEditing(null);
  };

  /** Record a payment (advance top-up or final) and post to treasury. */
  const recordPayment = (v: Vendor) => {
    const amt = Math.round(Number(payAmt[v.id]) || 0);
    if (amt <= 0) { showToast('Enter a payment amount.', 'warning'); return; }
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
    });
    if (ok) {
      const newPaid = v.paid + amt;
      const newAdvance = Math.max(v.advance, v.status === 'quoted' ? amt : v.advance);
      update('vendors', v.id, {
        paid: newPaid,
        advance: newAdvance,
        status: newPaid >= v.quote && v.quote > 0 ? 'paid' : 'booked',
        treasuryTxId: 'posted',
      });
      setPayAmt((p) => ({ ...p, [v.id]: '' }));
      showToast(`₹${amt.toLocaleString('en-IN')} paid to ${v.name} — posted to treasury.`, 'success');
    } else {
      showToast('Treasury posting failed — payment kept locally, retry later.', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Field label={<T en="Festival" bn="উৎসব" hi="उत्सव" />}>
          <select className="w-full sm:w-80 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm min-h-[44px]"
            value={fest.id} onChange={(e) => setFestivalId(e.target.value)}>
            {state.festivals.map((f) => <option key={f.id} value={f.id}>{f.name} · {fmtDate(f.startDate)}</option>)}
          </select>
        </Field>
        <Btn onClick={openNew}>＋ <T en="Add vendor" bn="বিক্রেতা যোগ" hi="विक्रेता जोड़ें" /></Btn>
      </div>

      {vendors.length === 0 && <Card><Empty text="No vendors yet. Add pandal, catering, sound, security and more." /></Card>}

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
                <div className="flex justify-between"><span className="text-stone-500"><T en="Quote" bn="দর" hi="भाव" /></span><span className="font-bold">{inr(v.quote)}</span></div>
                <div className="flex justify-between"><span className="text-stone-500"><T en="Paid so far" bn="এ পর্যন্ত পরিশোধ" hi="अब तक भुगतान" /></span><span className="font-bold text-emerald-700">{inr(v.paid)}</span></div>
                <div className="flex justify-between"><span className="text-stone-500"><T en="Balance due" bn="বকেয়া" hi="बकाया" /></span><span className={`font-extrabold ${due > 0 ? 'text-red-700' : 'text-stone-400'}`}>{inr(due)}</span></div>
                {v.notes && <div className="text-xs text-stone-500 pt-1">{v.notes}</div>}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3 no-print">
                <input
                  type="number" min={1} placeholder="₹ amount"
                  className={`${inputCls} !w-32`}
                  value={payAmt[v.id] || ''}
                  onChange={(e) => setPayAmt((p) => ({ ...p, [v.id]: e.target.value }))}
                  aria-label="Payment amount"
                />
                <Btn onClick={() => recordPayment(v)}>💰 <T en="Pay & post" bn="পরিশোধ ও পোস্ট" hi="भुगतान व दर्ज करें" /></Btn>
                <Btn variant="ghost" onClick={() => openEdit(v)}><T en="Edit" bn="সম্পাদনা" hi="संपादित करें" /></Btn>
                <Btn variant="danger" onClick={() => { remove('vendors', v.id); showToast('Vendor removed.', 'success'); }}><T en="Remove" bn="মুছুন" hi="हटाएं" /></Btn>
              </div>
            </Card>
          );
        })}
      </div>

      {editing && (
        <Modal title={<T en={editing.id ? 'Edit vendor' : 'Add vendor'} bn={editing.id ? 'বিক্রেতা সম্পাদনা' : 'বিক্রেতা যোগ'} hi={editing.id ? 'विक्रेता संपादित करें' : 'विक्रेता जोड़ें'} />} onClose={() => setEditing(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={<T en="Category" bn="বিভাগ" hi="श्रेणी" />}>
              <select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {VENDOR_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label={<T en="Vendor name *" bn="বিক্রেতার নাম *" hi="विक्रेता का नाम *" />}>
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sharma Pandal Works" />
            </Field>
            <Field label={<T en="Phone" bn="ফোন" hi="फोन" />}>
              <input className={inputCls} value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 …" />
            </Field>
            <Field label={<T en="Status" bn="অবস্থা" hi="स्थिति" />}>
              <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as VendorStatus })}>
                <option value="quoted">Quoted</option>
                <option value="booked">Booked</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </Field>
            <Field label={<T en="Quote (₹)" bn="দর (₹)" hi="भाव (₹)" />}>
              <input type="number" min={0} className={inputCls} value={form.quote} onChange={(e) => setForm({ ...form, quote: Math.max(0, Math.round(Number(e.target.value) || 0)) })} />
            </Field>
            <Field label={<T en="Advance recorded (₹)" bn="অগ্রিম (₹)" hi="अग्रिम (₹)" />}>
              <input type="number" min={0} className={inputCls} value={form.advance} onChange={(e) => setForm({ ...form, advance: Math.max(0, Math.round(Number(e.target.value) || 0)) })} />
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
