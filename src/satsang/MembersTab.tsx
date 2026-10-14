import React, { useState } from 'react';
import { useSatsang, uid, todayISO } from './satsangStore';
import { Member, MEMBER_ROLES, ROLE_LABEL } from './types';
import { T, Card, Btn, Field, inputCls, Modal, StatusPill, fmtDate, Empty } from './ui';
import { useToast } from '../context/ToastContext';

/* ------------------------------------------------------------------ */
/* Mandali registry — members with name, phone, role, active flag.     */
/* ------------------------------------------------------------------ */

const emptyForm = { name: '', phone: '', role: 'member' as Member['role'], joinDate: todayISO(), notes: '' };

export const MembersTab: React.FC = () => {
  const { state, add, update, remove } = useSatsang();
  const { showToast } = useToast();
  const [forming, setForming] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [q, setQ] = useState('');

  const save = () => {
    if (!form.name.trim()) { showToast('Please give the member a name.', 'warning'); return; }
    add('members', {
      id: uid('mb'), name: form.name.trim(), phone: form.phone.trim() || undefined,
      role: form.role, joinDate: form.joinDate, active: true,
      notes: form.notes.trim() || undefined, createdAt: Date.now(),
    });
    showToast('Member added to the mandali.', 'success');
    setForming(false);
    setForm({ ...emptyForm, joinDate: todayISO() });
  };

  const list = [...state.members]
    .filter((m) => !q || m.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            className={inputCls + ' max-w-xs'}
            placeholder="Search members…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search members"
          />
          <Btn onClick={() => setForming(true)} className="no-print">＋ <T en="Add member" bn="সদস্য যোগ করুন" hi="सदस्य जोड़ें" /></Btn>
        </div>
      </Card>

      {list.length === 0 && <Empty text="No members yet. Add the first one." />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.map((m) => (
          <Card key={m.id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-extrabold text-stone-800">{m.name}</div>
                <div className="text-xs text-stone-500">
                  {ROLE_LABEL[m.role]} · <T en="since" bn="থেকে" hi="से" /> {fmtDate(m.joinDate)}
                  {m.phone && <> · 📞 {m.phone}</>}
                </div>
                {m.notes && <div className="text-xs text-stone-500 mt-1">{m.notes}</div>}
              </div>
              <StatusPill status={m.active ? 'active' : 'inactive'} />
            </div>
            <div className="flex flex-wrap gap-2 mt-3 no-print">
              <Btn variant="ghost" onClick={() => { update('members', m.id, { active: !m.active }); }}>
                {m.active ? <T en="Mark inactive" bn="নিষ্ক্রিয় করুন" hi="निष्क्रिय करें" /> : <T en="Mark active" bn="সক্রিয় করুন" hi="सक्रिय करें" />}
              </Btn>
              <Btn variant="danger" onClick={() => { remove('members', m.id); showToast('Member removed.', 'info'); }}>
                <T en="Remove" bn="মুছুন" hi="हटाएं" />
              </Btn>
            </div>
          </Card>
        ))}
      </div>

      {forming && (
        <Modal title={<T en="Add member" bn="সদস্য যোগ করুন" hi="सदस्य जोड़ें" />} onClose={() => setForming(false)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={<T en="Name" bn="নাম" hi="नाम" />}>
              <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label={<T en="Phone (optional)" bn="ফোন (ঐচ্ছিক)" hi="फोन (वैकल्पिक)" />}>
              <input className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label={<T en="Role" bn="ভূমিকা" hi="भूमिका" />}>
              <select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Member['role'] })}>
                {MEMBER_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select>
            </Field>
            <Field label={<T en="Join date" bn="যোগদানের তারিখ" hi="जुड़ने की तिथि" />}>
              <input type="date" className={inputCls} value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} />
            </Field>
            <Field label={<T en="Notes (optional)" bn="নোট (ঐচ্ছিক)" hi="टिप्पणी (वैकल्पिक)" />} className="sm:col-span-2">
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
