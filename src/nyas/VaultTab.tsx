import React, { useState } from 'react';
import { useNyas, uid, todayISO } from './nyasStore';
import { VaultDoc } from './types';
import { T, Card, Btn, Field, Modal, inputCls, Empty, fmtDate } from './ui';
import { useToast } from '../context/ToastContext';

/* Nyas One — document vault (metadata registry).
 *
 * Honest $0-infra design: files are NOT uploaded anywhere. The vault
 * records what each document is, which FY it belongs to, and exactly
 * where the physical/digital copy lives — so nothing gets lost when
 * the CA asks for it.
 */

const blank: Omit<VaultDoc, 'id' | 'addedAt'> = {
  name: '', docType: 'Registration Certificate', fy: '', storedWhere: '', notes: '',
};

const DOC_TYPES: VaultDoc['docType'][] = [
  'Registration Certificate', 'Audit Report', 'Board Resolution', 'ITR / Filing', 'Other',
];

export const VaultTab: React.FC = () => {
  const { state, add, remove } = useNyas();
  const { showToast } = useToast();
  const [form, setForm] = useState(blank);
  const [adding, setAdding] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');

  const save = () => {
    if (!form.name.trim()) { showToast('Document name is required.', 'error'); return; }
    if (!form.storedWhere.trim()) { showToast('Say where the copy lives (e.g. almirah file 3, Google Drive).', 'error'); return; }
    add('vault', { ...form, id: uid('vd'), addedAt: todayISO() });
    showToast('Document registered in the vault.', 'success');
    setForm(blank);
    setAdding(false);
  };

  const list = state.vault
    .filter((d) => typeFilter === 'all' || d.docType === typeFilter)
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-extrabold text-stone-800"><T en="Document vault" bn="নথিভাণ্ডার" hi="दस्तावेज़ भंडार" /></h2>
        <div className="flex gap-2 items-center no-print">
          <select className={inputCls} style={{ width: 'auto' }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all"><T en="All types" bn="সব ধরন" hi="सभी प्रकार" /></option>
            {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <Btn onClick={() => setAdding(true)}>＋ <T en="Register document" bn="নথি নিবন্ধন" hi="दस्तावेज़ दर्ज करें" /></Btn>
        </div>
      </div>

      <Card>
        <p className="text-xs text-stone-500">
          <T
            en="The vault does not store files — it records what each document is and exactly where the copy lives, so nothing is lost when your CA asks for it."
            bn="ভল্ট ফাইল সংরক্ষণ করে না — প্রতিটি নথি কী এবং অনুলিপি কোথায় আছে তা লিপিবদ্ধ করে, যাতে সিএ চাইলে কিছু হারায় না।"
            hi="वॉल्ट फाइलें संग्रहीत नहीं करता — यह दर्ज करता है कि प्रत्येक दस्तावेज़ क्या है और प्रति कहाँ है, ताकि CA माँगे तो कुछ खोए नहीं।"
          />
        </p>
      </Card>

      {list.length === 0 && <Card><Empty text="No documents registered yet." /></Card>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {list.map((d) => (
          <Card key={d.id} className="py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-bold text-stone-800 text-sm">📄 {d.name}</div>
                <div className="text-xs text-stone-500 mt-1">
                  {d.docType}{d.fy ? ` · FY ${d.fy}` : ''} · <T en="added" bn="যোগ" hi="जोड़ा" /> {fmtDate(d.addedAt)}
                </div>
                <div className="text-xs mt-1.5 bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-1.5 text-indigo-900">
                  📍 <span className="font-semibold"><T en="Lives at:" bn="অবস্থান:" hi="स्थिति:" /></span> {d.storedWhere}
                </div>
                {d.notes && <div className="text-xs text-stone-400 mt-1">{d.notes}</div>}
              </div>
              <button onClick={() => { remove('vault', d.id); showToast('Removed.', 'success'); }} className="w-9 h-9 rounded-full bg-stone-100 hover:bg-red-100 text-stone-500 hover:text-red-600 font-bold min-w-[44px] min-h-[44px] shrink-0 no-print" aria-label="Delete">✕</button>
            </div>
          </Card>
        ))}
      </div>

      {adding && (
        <Modal title={<T en="Register document" bn="নথি নিবন্ধন" hi="दस्तावेज़ दर्ज करें" />} onClose={() => setAdding(false)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={<T en="Document name *" bn="নথির নাম *" hi="दस्तावेज़ का नाम *" />} className="sm:col-span-2">
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="12A registration certificate" />
            </Field>
            <Field label={<T en="Type" bn="ধরন" hi="प्रकार" />}>
              <select className={inputCls} value={form.docType} onChange={(e) => setForm({ ...form, docType: e.target.value as VaultDoc['docType'] })}>
                {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label={<T en="FY (optional)" bn="অর্থবছর (ঐচ্ছিক)" hi="वि.व. (वैकल्पिक)" />}>
              <input className={inputCls} value={form.fy || ''} onChange={(e) => setForm({ ...form, fy: e.target.value })} placeholder="2026-27" />
            </Field>
            <Field label={<T en="Where does the copy live? *" bn="অনুলিপি কোথায়? *" hi="प्रति कहाँ है? *" />} className="sm:col-span-2">
              <input className={inputCls} value={form.storedWhere} onChange={(e) => setForm({ ...form, storedWhere: e.target.value })} placeholder="Trustee office almirah, file 3 · or Google Drive link" />
            </Field>
            <Field label={<T en="Notes" bn="মন্তব্য" hi="टिप्पणी" />} className="sm:col-span-2">
              <input className={inputCls} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
          </div>
          <div className="flex gap-2 mt-4">
            <Btn onClick={save}><T en="Save" bn="সংরক্ষণ" hi="सहेजें" /></Btn>
            <Btn variant="ghost" onClick={() => setAdding(false)}><T en="Cancel" bn="বাতিল" hi="रद्द करें" /></Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
