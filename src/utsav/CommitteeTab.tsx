import React, { useState } from 'react';
import { useUtsav, uid, todayISO } from './utsavStore';
import { CommitteeMember, Task, TaskStatus, COMMITTEE_ROLES } from './types';
import { T, Card, Btn, Field, Modal, inputCls, StatusPill, Empty, fmtDate } from './ui';
import { useToast } from '../context/ToastContext';

/* Utsav One — committee & volunteer roster + task assignments. */

const blankMember: Omit<CommitteeMember, 'id' | 'festivalId'> = {
  name: '', phone: '', role: COMMITTEE_ROLES[4], responsibilities: '',
};

const blankTask: Omit<Task, 'id' | 'festivalId'> = {
  title: '', assignedTo: '', dueDate: todayISO(), status: 'todo', notes: '',
};

export const CommitteeTab: React.FC = () => {
  const { state, add, update, remove } = useUtsav();
  const { showToast } = useToast();
  const [festivalId, setFestivalId] = useState(state.festivals[0]?.id || '');
  const [editingM, setEditingM] = useState<CommitteeMember | null>(null);
  const [formM, setFormM] = useState(blankMember);
  const [editingT, setEditingT] = useState<Task | null>(null);
  const [formT, setFormT] = useState(blankTask);

  const fest = state.festivals.find((f) => f.id === festivalId) || state.festivals[0];
  if (!fest) return <Card><Empty text="Add a festival first, then build its committee." /></Card>;

  const members = state.members.filter((m) => m.festivalId === fest.id);
  const tasks = state.tasks.filter((t) => t.festivalId === fest.id).sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));

  const saveMember = () => {
    if (!formM.name.trim()) { showToast('Member name is required.', 'error'); return; }
    if (editingM && editingM.id) { update('members', editingM.id, { ...formM }); showToast('Member updated.', 'success'); }
    else { add('members', { ...formM, id: uid('cm'), festivalId: fest.id }); showToast('Member added.', 'success'); }
    setEditingM(null);
  };

  const saveTask = () => {
    if (!formT.title.trim()) { showToast('Task title is required.', 'error'); return; }
    if (editingT && editingT.id) { update('tasks', editingT.id, { ...formT }); showToast('Task updated.', 'success'); }
    else { add('tasks', { ...formT, id: uid('tk'), festivalId: fest.id }); showToast('Task assigned.', 'success'); }
    setEditingT(null);
  };

  const cycleTask = (t: Task) => {
    const next: TaskStatus = t.status === 'todo' ? 'doing' : t.status === 'doing' ? 'done' : 'todo';
    update('tasks', t.id, { status: next });
  };

  return (
    <div className="space-y-4">
      <Field label={<T en="Festival" bn="উৎসব" hi="उत्सव" />}>
        <select className="w-full sm:w-80 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm min-h-[44px]"
          value={fest.id} onChange={(e) => setFestivalId(e.target.value)}>
          {state.festivals.map((f) => <option key={f.id} value={f.id}>{f.name} · {fmtDate(f.startDate)}</option>)}
        </select>
      </Field>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-extrabold text-stone-800"><T en="Committee & volunteers" bn="সমিতি ও স্বেচ্ছাসেবক" hi="समिति व स्वयंसेवक" /> <span className="text-xs font-normal text-stone-500">({members.length})</span></h3>
            <Btn onClick={() => { setFormM(blankMember); setEditingM({ ...blankMember, id: '', festivalId: fest.id } as CommitteeMember); }}>＋ <T en="Add" bn="যোগ" hi="जोड़ें" /></Btn>
          </div>
          {members.length === 0 && <Empty text="No committee members yet." />}
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="rounded-xl border border-stone-100 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-stone-800">{m.name}</div>
                    <div className="text-xs text-orange-700 font-semibold">{m.role}</div>
                    {m.phone && <div className="text-xs text-stone-500">{m.phone}</div>}
                    {m.responsibilities && <div className="text-xs text-stone-500 mt-1">{m.responsibilities}</div>}
                  </div>
                  <div className="flex gap-1 shrink-0 no-print">
                    <Btn variant="ghost" onClick={() => { setFormM({ name: m.name, phone: m.phone || '', role: m.role, responsibilities: m.responsibilities || '' }); setEditingM(m); }}>✎</Btn>
                    <Btn variant="danger" onClick={() => { remove('members', m.id); showToast('Member removed.', 'success'); }}>🗑</Btn>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-extrabold text-stone-800"><T en="Tasks" bn="কাজ" hi="कार्य" /> <span className="text-xs font-normal text-stone-500">({tasks.filter((t) => t.status === 'done').length}/{tasks.length} <T en="done" bn="সম্পন্ন" hi="पूर्ण" />)</span></h3>
            <Btn onClick={() => { setFormT(blankTask); setEditingT({ ...blankTask, id: '', festivalId: fest.id } as Task); }}>＋ <T en="Assign" bn="অর্পণ" hi="सौंपें" /></Btn>
          </div>
          {tasks.length === 0 && <Empty text="No tasks yet. Break the festival into assignable work." />}
          <div className="space-y-2">
            {tasks.map((t) => (
              <div key={t.id} className="rounded-xl border border-stone-100 p-3">
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => cycleTask(t)} className="text-left flex-1 no-print" aria-label="Toggle task status">
                    <div className={`font-bold ${t.status === 'done' ? 'line-through text-stone-400' : 'text-stone-800'}`}>{t.title}</div>
                    <div className="text-xs text-stone-500 mt-0.5">
                      {t.assignedTo && <><T en="Assigned to" bn="দায়িত্বে" hi="सौंपा गया" />: <span className="font-semibold">{t.assignedTo}</span> · </>}
                      {t.dueDate && <><T en="Due" bn="শেষ তারিখ" hi="नियत तिथि" />: {fmtDate(t.dueDate)}</>}
                    </div>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <StatusPill status={t.status} />
                    <div className="no-print flex gap-1">
                      <Btn variant="ghost" onClick={() => { setFormT({ title: t.title, assignedTo: t.assignedTo || '', dueDate: t.dueDate || todayISO(), status: t.status, notes: t.notes || '' }); setEditingT(t); }}>✎</Btn>
                      <Btn variant="danger" onClick={() => { remove('tasks', t.id); showToast('Task removed.', 'success'); }}>🗑</Btn>
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-stone-400 mt-1 no-print"><T en="Tap the task to cycle todo → doing → done." bn="কাজে ট্যাপ করে অবস্থা বদলান।" hi="कार्य पर टैप करके स्थिति बदलें।" /></div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {editingM && (
        <Modal title={<T en={editingM.id ? 'Edit member' : 'Add member'} bn={editingM.id ? 'সদস্য সম্পাদনা' : 'সদস্য যোগ'} hi={editingM.id ? 'सदस्य संपादित करें' : 'सदस्य जोड़ें'} />} onClose={() => setEditingM(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={<T en="Name *" bn="নাম *" hi="नाम *" />}>
              <input className={inputCls} value={formM.name} onChange={(e) => setFormM({ ...formM, name: e.target.value })} placeholder="Shri Ramesh Sharma" />
            </Field>
            <Field label={<T en="Phone" bn="ফোন" hi="फोन" />}>
              <input className={inputCls} value={formM.phone || ''} onChange={(e) => setFormM({ ...formM, phone: e.target.value })} placeholder="+91 …" />
            </Field>
            <Field label={<T en="Role" bn="ভূমিকা" hi="भूमिका" />}>
              <select className={inputCls} value={formM.role} onChange={(e) => setFormM({ ...formM, role: e.target.value })}>
                {COMMITTEE_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label={<T en="Responsibilities" bn="দায়িত্ব" hi="जिम्मेदारियां" />}>
              <input className={inputCls} value={formM.responsibilities || ''} onChange={(e) => setFormM({ ...formM, responsibilities: e.target.value })} placeholder="e.g. Pandal + vendors" />
            </Field>
          </div>
          <div className="flex gap-2 mt-4">
            <Btn onClick={saveMember}><T en="Save" bn="সংরক্ষণ" hi="सहेजें" /></Btn>
            <Btn variant="ghost" onClick={() => setEditingM(null)}><T en="Cancel" bn="বাতিল" hi="रद्द करें" /></Btn>
          </div>
        </Modal>
      )}

      {editingT && (
        <Modal title={<T en={editingT.id ? 'Edit task' : 'Assign task'} bn={editingT.id ? 'কাজ সম্পাদনা' : 'কাজ অর্পণ'} hi={editingT.id ? 'कार्य संपादित करें' : 'कार्य सौंपें'} />} onClose={() => setEditingT(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={<T en="Task title *" bn="কাজের শিরোনাম *" hi="कार्य शीर्षक *" />} className="sm:col-span-2">
              <input className={inputCls} value={formT.title} onChange={(e) => setFormT({ ...formT, title: e.target.value })} placeholder="Book pandal vendor" />
            </Field>
            <Field label={<T en="Assigned to" bn="দায়িত্বে" hi="सौंपा गया" />}>
              <input className={inputCls} value={formT.assignedTo || ''} onChange={(e) => setFormT({ ...formT, assignedTo: e.target.value })} placeholder="Member name" list="utsav-members" />
              <datalist id="utsav-members">{members.map((m) => <option key={m.id} value={m.name} />)}</datalist>
            </Field>
            <Field label={<T en="Due date" bn="শেষ তারিখ" hi="नियत तिथि" />}>
              <input type="date" className={inputCls} value={formT.dueDate || ''} onChange={(e) => setFormT({ ...formT, dueDate: e.target.value })} />
            </Field>
            <Field label={<T en="Status" bn="অবস্থা" hi="स्थिति" />}>
              <select className={inputCls} value={formT.status} onChange={(e) => setFormT({ ...formT, status: e.target.value as TaskStatus })}>
                <option value="todo">To do</option>
                <option value="doing">Doing</option>
                <option value="done">Done</option>
              </select>
            </Field>
            <Field label={<T en="Notes" bn="মন্তব্য" hi="टिप्पणी" />}>
              <input className={inputCls} value={formT.notes || ''} onChange={(e) => setFormT({ ...formT, notes: e.target.value })} />
            </Field>
          </div>
          <div className="flex gap-2 mt-4">
            <Btn onClick={saveTask}><T en="Save" bn="সংরক্ষণ" hi="सहेजें" /></Btn>
            <Btn variant="ghost" onClick={() => setEditingT(null)}><T en="Cancel" bn="বাতিল" hi="रद्द करें" /></Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
