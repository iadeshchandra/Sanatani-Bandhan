import React, { useState } from 'react';
import { useNyas, uid, daysUntil, currentFY, todayISO } from './nyasStore';
import { COMPLIANCE_KINDS, ComplianceItem } from './types';
import { T, Card, Btn, Field, Modal, inputCls, StatusPill, Empty, fmtDate } from './ui';
import { useToast } from '../context/ToastContext';

/* Nyas One — compliance calendar: ITR-7, 10BD/10BE, audit, FCRA return, board meetings. */

const blank: Omit<ComplianceItem, 'id'> = {
  kind: 'ITR-7', fy: currentFY(), dueDate: todayISO(), owner: '', status: 'pending', notes: '',
};

export const ComplianceTab: React.FC = () => {
  const { state, add, update, remove } = useNyas();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<ComplianceItem | null>(null);
  const [form, setForm] = useState(blank);
  const [fyFilter, setFyFilter] = useState<string>('all');

  const fys = [...new Set(state.compliance.map((c) => c.fy))].sort().reverse();

  const openNew = () => { setForm(blank); setEditing({ ...blank, id: '' } as ComplianceItem); };
  const openEdit = (c: ComplianceItem) => {
    setForm({ kind: c.kind, customName: c.customName, fy: c.fy, dueDate: c.dueDate, owner: c.owner || '', status: c.status, notes: c.notes || '' });
    setEditing(c);
  };

  const save = () => {
    if (editing && editing.id) {
      update('compliance', editing.id, { ...form });
      showToast('Compliance item updated.', 'success');
    } else {
      add('compliance', { ...form, id: uid('cp') });
      showToast('Compliance item added.', 'success');
    }
    setEditing(null);
  };

  const markDone = (c: ComplianceItem) => {
    update('compliance', c.id, { status: 'done', completedAt: todayISO() });
    showToast(`"${c.customName || c.kind}" marked done.`, 'success');
  };

  const reopen = (c: ComplianceItem) => {
    update('compliance', c.id, { status: 'pending', completedAt: undefined });
  };

  const effStatus = (c: ComplianceItem) => (c.status === 'done' ? 'done' : daysUntil(c.dueDate) < 0 ? 'overdue' : 'pending');

  const list = state.compliance
    .filter((c) => fyFilter === 'all' || c.fy === fyFilter)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-extrabold text-stone-800"><T en="Compliance calendar" bn="অনুপালন ক্যালেন্ডার" hi="अनुपालन कैलेंडर" /></h2>
        <div className="flex gap-2 items-center no-print">
          <select className={inputCls} style={{ width: 'auto' }} value={fyFilter} onChange={(e) => setFyFilter(e.target.value)}>
            <option value="all"><T en="All FYs" bn="সব অর্থবছর" hi="सभी वि.व." /></option>
            {fys.map((f) => <option key={f} value={f}>FY {f}</option>)}
          </select>
          <Btn onClick={openNew}>＋ <T en="Add item" bn="যোগ করুন" hi="जोड़ें" /></Btn>
        </div>
      </div>

      {list.length === 0 && <Card><Empty text="No compliance items for this view. Add filings, audits and meetings." /></Card>}

      <div className="space-y-2">
        {list.map((c) => {
          const st = effStatus(c);
          const d = daysUntil(c.dueDate);
          const kind = COMPLIANCE_KINDS.find((k) => k.id === c.kind);
          return (
            <Card key={c.id} className="py-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <div className="font-bold text-stone-800 text-sm">{c.customName || kind?.en || c.kind}</div>
                  <div className="text-xs text-stone-500">
                    FY {c.fy} · <T en="due" bn="বকেয়া" hi="देय" /> {fmtDate(c.dueDate)}
                    {st === 'overdue' && <span className="text-red-700 font-bold"> · <T en={`${-d} days overdue`} bn={`${-d} দিন বকেয়া`} hi={`${-d} दिन बकाया`} /></span>}
                    {st === 'pending' && d >= 0 && <span> · <T en={`${d} days left`} bn={`${d} দিন বাকি`} hi={`${d} दिन शेष`} /></span>}
                    {c.owner ? ` · ${c.owner}` : ''}
                  </div>
                  {c.notes && <div className="text-xs text-stone-400 mt-0.5">{c.notes}</div>}
                </div>
                <div className="flex items-center gap-2 no-print">
                  <StatusPill status={st} />
                  {c.status !== 'done' && <Btn variant="ghost" onClick={() => markDone(c)}><T en="Mark done" bn="সম্পন্ন চিহ্নিত" hi="पूर्ण चिह्नित करें" /></Btn>}
                  {c.status === 'done' && <Btn variant="ghost" onClick={() => reopen(c)}><T en="Reopen" bn="পুনরায় খুলুন" hi="पुनः खोलें" /></Btn>}
                  <Btn variant="ghost" onClick={() => openEdit(c)}><T en="Edit" bn="সম্পাদনা" hi="संपादित" /></Btn>
                  <button onClick={() => { remove('compliance', c.id); showToast('Removed.', 'success'); }} className="w-9 h-9 rounded-full bg-stone-100 hover:bg-red-100 text-stone-500 hover:text-red-600 font-bold min-w-[44px] min-h-[44px]" aria-label="Delete">✕</button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {editing && (
        <Modal title={<T en={editing.id ? 'Edit compliance item' : 'Add compliance item'} bn="অনুপালন আইটেম" hi="अनुपालन आइटम" />} onClose={() => setEditing(null)}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={<T en="Type" bn="ধরন" hi="प्रकार" />}>
              <select className={inputCls} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as ComplianceItem['kind'] })}>
                {COMPLIANCE_KINDS.map((k) => <option key={k.id} value={k.id}>{k.en}</option>)}
              </select>
            </Field>
            <Field label={<T en="Custom name (optional)" bn="নিজস্ব নাম" hi="कस्टम नाम" />}>
              <input className={inputCls} value={form.customName || ''} onChange={(e) => setForm({ ...form, customName: e.target.value })} />
            </Field>
            <Field label={<T en="Financial year" bn="অর্থবছর" hi="वित्तीय वर्ष" />}>
              <input className={inputCls} value={form.fy} onChange={(e) => setForm({ ...form, fy: e.target.value })} placeholder="2026-27" />
            </Field>
            <Field label={<T en="Due date" bn="বকেয়ার তারিখ" hi="देय तिथि" />}>
              <input type="date" className={inputCls} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </Field>
            <Field label={<T en="Owner" bn="দায়িত্বপ্রাপ্ত" hi="उत्तरदायी" />} className="sm:col-span-2">
              <input className={inputCls} value={form.owner || ''} onChange={(e) => setForm({ ...form, owner: e.target.value })} placeholder="Trustee / CA name" />
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
