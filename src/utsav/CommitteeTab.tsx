import React, { useState } from 'react';
import { useUtsav, uid, todayISO } from './utsavStore';
import { CommitteeMember, Task, TaskStatus, COMMITTEE_ROLES } from './types';
import { T, Card, Btn, Field, Modal, inputCls, StatusPill, Empty, fmtDate } from './ui';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

/* Utsav One — committee & volunteer roster + task assignments. */

const blankMember: Omit<CommitteeMember, 'id' | 'festivalId'> = {
  name: '', phone: '', role: COMMITTEE_ROLES[4], responsibilities: '',
};

const blankTask: Omit<Task, 'id' | 'festivalId'> = {
  title: '', assignedTo: '', dueDate: todayISO(), status: 'todo', notes: '',
};

export const CommitteeTab: React.FC = () => {
  const { t } = useLanguage();
  const { state, add, update, remove } = useUtsav();
  const { showToast } = useToast();
  const [festivalId, setFestivalId] = useState(state.festivals[0]?.id || '');
  const [editingM, setEditingM] = useState<CommitteeMember | null>(null);
  const [formM, setFormM] = useState(blankMember);
  const [editingT, setEditingT] = useState<Task | null>(null);
  const [formT, setFormT] = useState(blankTask);

  const fest = state.festivals.find((f) => f.id === festivalId) || state.festivals[0];
  if (!fest) return <Card><Empty text={t('ritual.utsav.committee.empty_add_a_festival_first_then_build')} /></Card>;

  const members = state.members.filter((m) => m.festivalId === fest.id);
  const tasks = state.tasks.filter((task) => task.festivalId === fest.id).sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));

  const saveMember = () => {
    if (!formM.name.trim()) { showToast(t('ritual.utsav.committee.toastNameRequired'), 'error'); return; }
    if (editingM && editingM.id) { update('members', editingM.id, { ...formM }); showToast(t('ritual.utsav.committee.toastMemberUpdated'), 'success'); }
    else { add('members', { ...formM, id: uid('cm'), festivalId: fest.id }); showToast(t('ritual.utsav.committee.toastMemberAdded'), 'success'); }
    setEditingM(null);
  };

  const saveTask = () => {
    if (!formT.title.trim()) { showToast(t('ritual.utsav.committee.toastTaskRequired'), 'error'); return; }
    if (editingT && editingT.id) { update('tasks', editingT.id, { ...formT }); showToast(t('ritual.utsav.committee.toastTaskUpdated'), 'success'); }
    else { add('tasks', { ...formT, id: uid('tk'), festivalId: fest.id }); showToast(t('ritual.utsav.committee.toastTaskAssigned'), 'success'); }
    setEditingT(null);
  };

  const cycleTask = (task: Task) => {
    const next: TaskStatus = task.status === 'todo' ? 'doing' : task.status === 'doing' ? 'done' : 'todo';
    update('tasks', task.id, { status: next });
  };

  return (
    <div className="space-y-4">
      <Field label={t('ritual.common.festival')}>
        <select className="w-full sm:w-80 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm min-h-[44px]"
          value={fest.id} onChange={(e) => setFestivalId(e.target.value)}>
          {state.festivals.map((f) => <option key={f.id} value={f.id}>{f.name} · {fmtDate(f.startDate)}</option>)}
        </select>
      </Field>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-extrabold text-stone-800">{t('ritual.utsav.committee.committee_volunteers')} <span className="text-xs font-normal text-stone-500">({members.length})</span></h3>
            <Btn onClick={() => { setFormM(blankMember); setEditingM({ ...blankMember, id: '', festivalId: fest.id } as CommitteeMember); }}>＋ {t('ritual.common.add')}</Btn>
          </div>
          {members.length === 0 && <Empty text={t('ritual.utsav.committee.empty_no_committee_members_yet')} />}
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
                    <Btn variant="danger" onClick={() => { remove('members', m.id); showToast(t('ritual.utsav.committee.toastMemberRemoved'), 'success'); }}>🗑</Btn>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-extrabold text-stone-800">{t('ritual.utsav.committee.tasks')} <span className="text-xs font-normal text-stone-500">({tasks.filter((task) => task.status === 'done').length}/{tasks.length} {t('ritual.utsav.committee.done')})</span></h3>
            <Btn onClick={() => { setFormT(blankTask); setEditingT({ ...blankTask, id: '', festivalId: fest.id } as Task); }}>＋ {t('ritual.common.assign')}</Btn>
          </div>
          {tasks.length === 0 && <Empty text={t('ritual.utsav.committee.empty_no_tasks_yet_break_the_festival')} />}
          <div className="space-y-2">
            {tasks.map((task) => (
              <div key={task.id} className="rounded-xl border border-stone-100 p-3">
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => cycleTask(task)} className="text-left flex-1 no-print" aria-label={t('ritual.utsav.committee.toggleTask')}>
                    <div className={`font-bold ${task.status === 'done' ? 'line-through text-stone-400' : 'text-stone-800'}`}>{task.title}</div>
                    <div className="text-xs text-stone-500 mt-0.5">
                      {task.assignedTo && <>{t('ritual.utsav.committee.assigned_to')}: <span className="font-semibold">{task.assignedTo}</span> · </>}
                      {task.dueDate && <>{t('ritual.utsav.committee.due')}: {fmtDate(task.dueDate)}</>}
                    </div>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <StatusPill status={task.status} />
                    <div className="no-print flex gap-1">
                      <Btn variant="ghost" onClick={() => { setFormT({ title: task.title, assignedTo: task.assignedTo || '', dueDate: task.dueDate || todayISO(), status: task.status, notes: task.notes || '' }); setEditingT(task); }}>✎</Btn>
                      <Btn variant="danger" onClick={() => { remove('tasks', task.id); showToast(t('ritual.utsav.committee.toastTaskRemoved'), 'success'); }}>🗑</Btn>
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-stone-400 mt-1 no-print">{t('ritual.utsav.committee.tap_the_task_to_cycle_todo_doing')}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {editingM && (
        <Modal title={editingM.id ? t('ritual.utsav.committee.editMember') : t('ritual.common.add')} onClose={() => setEditingM(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t('ritual.common.nameRequired')}>
              <input className={inputCls} value={formM.name} onChange={(e) => setFormM({ ...formM, name: e.target.value })} placeholder="Shri Ramesh Sharma" />
            </Field>
            <Field label={t('ritual.common.phone')}>
              <input className={inputCls} value={formM.phone || ''} onChange={(e) => setFormM({ ...formM, phone: e.target.value })} placeholder="+91 …" />
            </Field>
            <Field label={t('ritual.utsav.committee.role')}>
              <select className={inputCls} value={formM.role} onChange={(e) => setFormM({ ...formM, role: e.target.value })}>
                {COMMITTEE_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label={t('ritual.utsav.committee.responsibilities')}>
              <input className={inputCls} value={formM.responsibilities || ''} onChange={(e) => setFormM({ ...formM, responsibilities: e.target.value })} placeholder="e.g. Pandal + vendors" />
            </Field>
          </div>
          <div className="flex gap-2 mt-4">
            <Btn onClick={saveMember}>{t('ritual.common.save')}</Btn>
            <Btn variant="ghost" onClick={() => setEditingM(null)}>{t('ritual.common.cancel')}</Btn>
          </div>
        </Modal>
      )}

      {editingT && (
        <Modal title={editingT.id ? t('ritual.utsav.committee.editTask') : t('ritual.utsav.committee.assignTask')} onClose={() => setEditingT(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t('ritual.utsav.committee.task_title')} className="sm:col-span-2">
              <input className={inputCls} value={formT.title} onChange={(e) => setFormT({ ...formT, title: e.target.value })} placeholder="Book pandal vendor" />
            </Field>
            <Field label={t('ritual.utsav.committee.assigned_to')}>
              <input className={inputCls} value={formT.assignedTo || ''} onChange={(e) => setFormT({ ...formT, assignedTo: e.target.value })} placeholder="Member name" list="utsav-members" />
              <datalist id="utsav-members">{members.map((m) => <option key={m.id} value={m.name} />)}</datalist>
            </Field>
            <Field label={t('ritual.utsav.committee.due_date')}>
              <input type="date" className={inputCls} value={formT.dueDate || ''} onChange={(e) => setFormT({ ...formT, dueDate: e.target.value })} />
            </Field>
            <Field label={t('ritual.common.status')}>
              <select className={inputCls} value={formT.status} onChange={(e) => setFormT({ ...formT, status: e.target.value as TaskStatus })}>
                <option value="todo">{t('ritual.utsav.committee.statusTodo')}</option>
                <option value="doing">{t('ritual.utsav.committee.statusDoing')}</option>
                <option value="done">{t('ritual.utsav.committee.done')}</option>
              </select>
            </Field>
            <Field label={t('ritual.common.notes')}>
              <input className={inputCls} value={formT.notes || ''} onChange={(e) => setFormT({ ...formT, notes: e.target.value })} />
            </Field>
          </div>
          <div className="flex gap-2 mt-4">
            <Btn onClick={saveTask}>{t('ritual.common.save')}</Btn>
            <Btn variant="ghost" onClick={() => setEditingT(null)}>{t('ritual.common.cancel')}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};
