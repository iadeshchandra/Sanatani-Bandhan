import React, { useState } from 'react';
import { useMatha, uid, displayName } from './mathaStore';
import { BranchMatha } from './types';
import { T, Card, Btn, Field, inputCls, Modal, Empty } from './ui';
import { useToast } from '../context/ToastContext';

/* Branch mathas — sub-centres with in-charge. */

const emptyForm = { name: '', location: '', inChargeId: '', phone: '', establishedYear: '', notes: '' };

export const BranchesTab: React.FC = () => {
  const { state, add, update, remove } = useMatha();
  const { showToast } = useToast();
  const [forming, setForming] = useState(false);
  const [editing, setEditing] = useState<BranchMatha | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openNew = () => { setForm(emptyForm); setEditing(null); setForming(true); };
  const openEdit = (b: BranchMatha) => {
    setForm({
      name: b.name, location: b.location, inChargeId: b.inChargeId || '',
      phone: b.phone || '', establishedYear: b.establishedYear || '', notes: b.notes || '',
    });
    setEditing(b);
    setForming(true);
  };

  const save = () => {
    if (!form.name.trim()) { showToast('Please give the branch a name.', 'warning'); return; }
    const payload = {
      name: form.name.trim(), location: form.location.trim(),
      inChargeId: form.inChargeId || undefined, phone: form.phone.trim() || undefined,
      establishedYear: form.establishedYear.trim() || undefined, notes: form.notes.trim() || undefined,
    };
    if (editing) { update('branches', editing.id, payload); showToast('Branch updated.', 'success'); }
    else { add('branches', { ...payload, id: uid('br'), createdAt: Date.now() }); showToast('Branch matha added.', 'success'); }
    setForming(false);
    setEditing(null);
  };

  const inChargeName = (id?: string) => {
    if (!id) return '—';
    const s = state.sannyasis.find((x) => x.id === id);
    return s ? displayName(s) : '—';
  };

  return (
    <div className="space-y-4">
      <div className="no-print"><Btn onClick={openNew}>＋ <T en="Add branch matha" bn="শাখা মঠ যোগ করুন" hi="शाखा मठ जोड़ें" /></Btn></div>
      {state.branches.length === 0 && <Empty text="No branch mathas recorded yet." />}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {state.branches.map((b) => (
          <Card key={b.id}>
            <div className="font-extrabold text-stone-800">🏛️ {b.name}</div>
            <div className="mt-2 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-stone-500"><T en="Location" bn="অবস্থান" hi="स्थान" /></span><span className="font-semibold text-right">{b.location || '—'}</span></div>
              <div className="flex justify-between"><span className="text-stone-500"><T en="In-charge" bn="দায়িত্বপ্রাপ্ত" hi="प्रभारी" /></span><span className="font-semibold text-right">{inChargeName(b.inChargeId)}</span></div>
              <div className="flex justify-between"><span className="text-stone-500"><T en="Phone" bn="ফোন" hi="फोन" /></span><span className="font-semibold">{b.phone || '—'}</span></div>
              <div className="flex justify-between"><span className="text-stone-500"><T en="Established" bn="প্রতিষ্ঠিত" hi="स्थापित" /></span><span className="font-semibold">{b.establishedYear || '—'}</span></div>
              {b.notes && <div className="text-xs text-stone-500 pt-1">{b.notes}</div>}
            </div>
            <div className="flex gap-2 mt-3 no-print">
              <Btn variant="ghost" onClick={() => openEdit(b)}><T en="Edit" bn="সম্পাদনা" hi="संपादित करें" /></Btn>
              <Btn variant="danger" onClick={() => { remove('branches', b.id); showToast('Branch removed.', 'info'); }}>
                <T en="Remove" bn="মুছুন" hi="हटाएं" />
              </Btn>
            </div>
          </Card>
        ))}
      </div>

      {forming && (
        <Modal title={editing ? 'Edit branch matha' : 'Add branch matha'} onClose={() => setForming(false)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={<T en="Branch name" bn="শাখার নাম" hi="शाखा का नाम" />}>
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label={<T en="Location" bn="অবস্থান" hi="स्थान" />}>
              <input className={inputCls} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </Field>
            <Field label={<T en="In-charge" bn="দায়িত্বপ্রাপ্ত" hi="प्रभारी" />}>
              <select className={inputCls} value={form.inChargeId} onChange={(e) => setForm({ ...form, inChargeId: e.target.value })}>
                <option value="">—</option>
                {state.sannyasis.map((s) => <option key={s.id} value={s.id}>{displayName(s)}</option>)}
              </select>
            </Field>
            <Field label={<T en="Phone" bn="ফোন" hi="फोन" />}>
              <input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label={<T en="Established (year)" bn="প্রতিষ্ঠা (বছর)" hi="स्थापना (वर्ष)" />}>
              <input className={inputCls} value={form.establishedYear} onChange={(e) => setForm({ ...form, establishedYear: e.target.value })} placeholder="1985" />
            </Field>
            <Field label={<T en="Notes" bn="নোট" hi="टिप्पणी" />}>
              <input className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
          </div>
          <div className="flex gap-2 mt-4">
            <Btn onClick={save}><T en="Save" bn="সংরক্ষণ" hi="सहेजें" /></Btn>
            <Btn variant="ghost" onClick={() => setForming(false)}><T en="Cancel" bn="বাতিল" hi="रद्द करें" /></Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
