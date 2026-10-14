import React, { useState } from 'react';
import { useNyas, uid, daysUntil, regStatus, todayISO } from './nyasStore';
import { REG_KINDS, Registration } from './types';
import { T, Card, Btn, Field, Modal, inputCls, StatusPill, Empty, fmtDate } from './ui';
import { useToast } from '../context/ToastContext';

/* Nyas One — registration tracker: 12A / 80G / FCRA / CSR-1 / Darpan / PAN / TAN / GST. */

const blank: Omit<Registration, 'id'> = {
  kind: '12A', regNo: '', validFrom: todayISO(), validTo: '',
  issuingAuthority: '', docRef: '', notes: '',
};

export const RegistrationsTab: React.FC = () => {
  const { state, add, update, remove } = useNyas();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<Registration | null>(null);
  const [form, setForm] = useState(blank);

  const openNew = () => { setForm(blank); setEditing({ ...blank, id: '' } as Registration); };
  const openEdit = (r: Registration) => {
    setForm({ kind: r.kind, customName: r.customName, regNo: r.regNo, validFrom: r.validFrom, validTo: r.validTo || '', issuingAuthority: r.issuingAuthority || '', docRef: r.docRef || '', notes: r.notes || '' });
    setEditing(r);
  };

  const save = () => {
    if (!form.regNo.trim()) { showToast('Registration number is required.', 'error'); return; }
    if (editing && editing.id) {
      update('registrations', editing.id, { ...form });
      showToast('Registration updated.', 'success');
    } else {
      add('registrations', { ...form, id: uid('rg') });
      showToast('Registration added.', 'success');
    }
    setEditing(null);
  };

  const sorted = [...state.registrations].sort((a, b) => {
    const sa = regStatus(a); const sb = regStatus(b);
    const rank = (s: string) => (s === 'expired' ? 0 : s === 'expiring' ? 1 : s === 'active' ? 2 : 3);
    return rank(sa) - rank(sb);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-stone-800"><T en="Registrations" bn="নিবন্ধনসমূহ" hi="पंजीकरण" /></h2>
        <Btn onClick={openNew}>＋ <T en="Add registration" bn="নিবন্ধন যোগ" hi="पंजीकरण जोड़ें" /></Btn>
      </div>

      {sorted.length === 0 && <Card><Empty text="No registrations tracked yet. Add your 12A, 80G, FCRA and other registrations." /></Card>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sorted.map((r) => {
          const st = regStatus(r);
          const kind = REG_KINDS.find((k) => k.id === r.kind);
          const d = r.validTo ? daysUntil(r.validTo) : null;
          return (
            <Card key={r.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-extrabold text-stone-800">{r.customName || kind?.en || r.kind}</div>
                  <div className="text-sm font-mono text-stone-600 mt-0.5">{r.regNo}</div>
                </div>
                <StatusPill status={st} />
              </div>
              <div className="mt-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-stone-500"><T en="Valid from" bn="বৈধতা শুরু" hi="वैधता प्रारंभ" /></span><span className="font-semibold">{fmtDate(r.validFrom)}</span></div>
                <div className="flex justify-between"><span className="text-stone-500"><T en="Valid to" bn="বৈধতা শেষ" hi="वैधता समाप्ति" /></span><span className="font-semibold">{r.validTo ? fmtDate(r.validTo) : <T en="Lifetime" bn="আজীবন" hi="आजीवन" />}</span></div>
                {d !== null && d >= 0 && st === 'expiring' && (
                  <div className="text-amber-700 text-xs font-bold">⚠️ <T en={`${d} days left — start renewal`} bn={`${d} দিন বাকি — নবায়ন শুরু করুন`} hi={`${d} दिन शेष — नवीनीकरण शुरू करें`} /></div>
                )}
                {d !== null && d < 0 && (
                  <div className="text-red-700 text-xs font-bold">🚨 <T en="Expired — renew immediately" bn="মেয়াদোত্তীর্ণ — অবিলম্বে নবায়ন করুন" hi="समाप्त — तुरंत नवीनीकरण करें" /></div>
                )}
                {r.issuingAuthority && <div className="flex justify-between"><span className="text-stone-500"><T en="Authority" bn="কর্তৃপক্ষ" hi="प्राधिकरण" /></span><span className="font-semibold">{r.issuingAuthority}</span></div>}
                {r.docRef && <div className="flex justify-between"><span className="text-stone-500"><T en="Document ref" bn="নথি সূত্র" hi="दस्तावेज़ संदर्भ" /></span><span className="font-semibold">{r.docRef}</span></div>}
                {r.notes && <div className="text-xs text-stone-500 pt-1">{r.notes}</div>}
              </div>
              <div className="flex gap-2 mt-3 no-print">
                <Btn variant="ghost" onClick={() => openEdit(r)}><T en="Edit" bn="সম্পাদনা" hi="संपादित करें" /></Btn>
                <Btn variant="danger" onClick={() => { remove('registrations', r.id); showToast('Registration removed.', 'success'); }}><T en="Remove" bn="মুছুন" hi="हटाएं" /></Btn>
              </div>
            </Card>
          );
        })}
      </div>

      {editing && (
        <Modal title={<T en={editing.id ? 'Edit registration' : 'Add registration'} bn={editing.id ? 'নিবন্ধন সম্পাদনা' : 'নিবন্ধন যোগ'} hi={editing.id ? 'पंजीकरण संपादित करें' : 'पंजीकरण जोड़ें'} />} onClose={() => setEditing(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={<T en="Registration type" bn="নিবন্ধনের ধরন" hi="पंजीकरण प्रकार" />}>
              <select className={inputCls} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as Registration['kind'] })}>
                {REG_KINDS.map((k) => <option key={k.id} value={k.id}>{k.en}</option>)}
              </select>
            </Field>
            <Field label={<T en="Custom name (optional)" bn="নিজস্ব নাম (ঐচ্ছিক)" hi="कस्टम नाम (वैकल्पिक)" />}>
              <input className={inputCls} value={form.customName || ''} onChange={(e) => setForm({ ...form, customName: e.target.value })} placeholder="e.g. 12A renewal 2026" />
            </Field>
            <Field label={<T en="Registration number *" bn="নিবন্ধন নম্বর *" hi="पंजीकरण संख्या *" />} className="sm:col-span-2">
              <input className={inputCls} value={form.regNo} onChange={(e) => setForm({ ...form, regNo: e.target.value })} placeholder="AACT1234AF20261" />
            </Field>
            <Field label={<T en="Valid from" bn="বৈধতা শুরু" hi="वैधता प्रारंभ" />}>
              <input type="date" className={inputCls} value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} />
            </Field>
            <Field label={<T en="Valid to (blank = lifetime)" bn="বৈধতা শেষ (খালি = আজীবন)" hi="वैधता समाप्ति (खाली = आजीवन)" />}>
              <input type="date" className={inputCls} value={form.validTo || ''} onChange={(e) => setForm({ ...form, validTo: e.target.value })} />
            </Field>
            <Field label={<T en="Issuing authority" bn="প্রদানকারী কর্তৃপক্ষ" hi="जारीकर्ता प्राधिकरण" />}>
              <input className={inputCls} value={form.issuingAuthority || ''} onChange={(e) => setForm({ ...form, issuingAuthority: e.target.value })} placeholder="CIT (Exemptions)" />
            </Field>
            <Field label={<T en="Document reference" bn="নথির সূত্র" hi="दस्तावेज़ संदर्भ" />}>
              <input className={inputCls} value={form.docRef || ''} onChange={(e) => setForm({ ...form, docRef: e.target.value })} placeholder="File / almirah location" />
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
