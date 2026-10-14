import React, { useState } from 'react';
import { useMatha, uid, todayISO, displayName } from './mathaStore';
import { Sannyasi, SANNYASI_ROLES, ROLE_LABEL, SannyasiRole, SannyasiStatus } from './types';
import { T, Card, Btn, Field, inputCls, Modal, StatusPill, fmtDate, Empty } from './ui';
import { useToast } from '../context/ToastContext';

/* Sannyasi registry — CRUD for the monastic roll. */

const emptyForm = {
  poorvashramName: '', sannyasName: '', dikshaDate: '', dikshaGuruId: '',
  parampara: '', role: 'sadhak' as SannyasiRole, status: 'resident' as SannyasiStatus,
  contactNote: '', notes: '',
};

export const SannyasiTab: React.FC = () => {
  const { state, add, update, remove } = useMatha();
  const { showToast } = useToast();
  const [forming, setForming] = useState(false);
  const [editing, setEditing] = useState<Sannyasi | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [q, setQ] = useState('');

  const openNew = () => {
    setForm({ ...emptyForm, parampara: state.settings.paramparaName });
    setEditing(null);
    setForming(true);
  };
  const openEdit = (s: Sannyasi) => {
    setForm({
      poorvashramName: s.poorvashramName, sannyasName: s.sannyasName,
      dikshaDate: s.dikshaDate || '', dikshaGuruId: s.dikshaGuruId || '',
      parampara: s.parampara, role: s.role, status: s.status,
      contactNote: s.contactNote || '', notes: s.notes || '',
    });
    setEditing(s);
    setForming(true);
  };

  const save = () => {
    if (!form.sannyasName.trim() && !form.poorvashramName.trim()) {
      showToast('Please give at least one name.', 'warning');
      return;
    }
    const payload = {
      poorvashramName: form.poorvashramName.trim(),
      sannyasName: form.sannyasName.trim(),
      dikshaDate: form.dikshaDate || undefined,
      dikshaGuruId: form.dikshaGuruId || undefined,
      parampara: form.parampara.trim(),
      role: form.role, status: form.status,
      contactNote: form.contactNote.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };
    if (editing) {
      update('sannyasis', editing.id, payload);
      showToast('Record updated.', 'success');
    } else {
      add('sannyasis', { ...payload, id: uid('sn'), createdAt: Date.now() });
      showToast('Sannyasi added to the registry.', 'success');
    }
    setForming(false);
    setEditing(null);
  };

  const guruName = (id?: string) => {
    if (!id) return '—';
    const g = state.sannyasis.find((s) => s.id === id);
    return g ? displayName(g) : '—';
  };

  const list = state.sannyasis
    .filter((s) => {
      const hay = `${s.sannyasName} ${s.poorvashramName} ${s.parampara}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    })
    .sort((a, b) => a.createdAt - b.createdAt);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 no-print">
        <Btn onClick={openNew}>＋ <T en="Add sannyasi" bn="সন্ন্যাসী যোগ করুন" hi="संन्यासी जोड़ें" /></Btn>
        <input className={inputCls} style={{ maxWidth: 260 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name / parampara" />
      </div>

      {list.length === 0 && <Empty text="The registry is empty. Add the matha's sannyasis to begin." />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {list.map((s) => (
          <Card key={s.id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-extrabold text-stone-800">{displayName(s)}</div>
                {s.sannyasName && s.poorvashramName && (
                  <div className="text-xs text-stone-500"><T en="Poorvashram" bn="পূর্বাশ্রম" hi="पूर्वाश्रम" />: {s.poorvashramName}</div>
                )}
              </div>
              <StatusPill status={s.status} />
            </div>
            <div className="mt-2 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-stone-500"><T en="Role" bn="ভূমিকা" hi="भूमिका" /></span><span className="font-semibold">{ROLE_LABEL[s.role]}</span></div>
              <div className="flex justify-between"><span className="text-stone-500"><T en="Parampara" bn="পরম্পরা" hi="परंपरा" /></span><span className="font-semibold">{s.parampara || '—'}</span></div>
              <div className="flex justify-between"><span className="text-stone-500"><T en="Diksha guru" bn="দীক্ষা গুরু" hi="दीक्षा गुरु" /></span><span className="font-semibold">{guruName(s.dikshaGuruId)}</span></div>
              <div className="flex justify-between"><span className="text-stone-500"><T en="Diksha date" bn="দীক্ষা তারিখ" hi="दीक्षा तिथि" /></span><span className="font-semibold">{fmtDate(s.dikshaDate || '')}</span></div>
              {s.notes && <div className="text-xs text-stone-500 pt-1">{s.notes}</div>}
            </div>
            <div className="flex gap-2 mt-3 no-print">
              <Btn variant="ghost" onClick={() => openEdit(s)}><T en="Edit" bn="সম্পাদনা" hi="संपादित करें" /></Btn>
              <Btn variant="danger" onClick={() => { remove('sannyasis', s.id); showToast('Record removed.', 'info'); }}>
                <T en="Remove" bn="মুছুন" hi="हटाएं" />
              </Btn>
            </div>
          </Card>
        ))}
      </div>

      {forming && (
        <Modal title={editing ? 'Edit sannyasi record' : 'Add sannyasi'} onClose={() => setForming(false)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={<T en="Sannyas name" bn="সন্ন্যাস নাম" hi="संन्यास नाम" />}>
              <input className={inputCls} value={form.sannyasName} onChange={(e) => setForm({ ...form, sannyasName: e.target.value })} placeholder="Swami …" />
            </Field>
            <Field label={<T en="Poorvashram name" bn="পূর্বাশ্রম নাম" hi="पूर्वाश्रम नाम" />}>
              <input className={inputCls} value={form.poorvashramName} onChange={(e) => setForm({ ...form, poorvashramName: e.target.value })} />
            </Field>
            <Field label={<T en="Diksha date" bn="দীক্ষা তারিখ" hi="दीक्षा तिथि" />}>
              <input type="date" className={inputCls} value={form.dikshaDate} onChange={(e) => setForm({ ...form, dikshaDate: e.target.value })} />
            </Field>
            <Field label={<T en="Diksha guru" bn="দীক্ষা গুরু" hi="दीक्षा गुरु" />}>
              <select className={inputCls} value={form.dikshaGuruId} onChange={(e) => setForm({ ...form, dikshaGuruId: e.target.value })}>
                <option value="">—</option>
                {state.sannyasis.filter((s) => !editing || s.id !== editing.id).map((s) => (
                  <option key={s.id} value={s.id}>{displayName(s)}</option>
                ))}
              </select>
            </Field>
            <Field label={<T en="Parampara" bn="পরম্পরা" hi="परंपरा" />}>
              <input className={inputCls} value={form.parampara} onChange={(e) => setForm({ ...form, parampara: e.target.value })} placeholder="Dashanami" />
            </Field>
            <Field label={<T en="Role" bn="ভূমিকা" hi="भूमिका" />}>
              <select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as SannyasiRole })}>
                {SANNYASI_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select>
            </Field>
            <Field label={<T en="Status" bn="অবস্থা" hi="स्थिति" />}>
              <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as SannyasiStatus })}>
                <option value="resident">Resident</option>
                <option value="itinerant">Itinerant</option>
                <option value="mahasamadhi">Mahasamadhi</option>
              </select>
            </Field>
            <Field label={<T en="Contact note" bn="যোগাযোগ নোট" hi="संपर्क नोट" />}>
              <input className={inputCls} value={form.contactNote} onChange={(e) => setForm({ ...form, contactNote: e.target.value })} />
            </Field>
            <div className="sm:col-span-2">
              <Field label={<T en="Notes" bn="নোট" hi="टिप्पणी" />}>
                <textarea className={inputCls} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </Field>
            </div>
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
