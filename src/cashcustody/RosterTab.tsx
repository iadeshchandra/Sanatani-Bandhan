import React, { useState } from 'react';
import { useCashCustody, uid, todayISO } from './cashCustodyStore';
import { CountingStaff, StaffRole } from './types';
import { T, Card, Btn, Field, inputCls, fmtDateTime } from './ui';
import { useToast } from '../context/ToastContext';

/* ------------------------------------------------------------------ */
/* Counting-staff roster — who counted what, when. The 2026 scandal's  */
/* 23 resignations showed why staff accountability needs a record:      */
/* shifts, check-ins, and per-session attribution live here.           */
/* ------------------------------------------------------------------ */

const ROLES: StaffRole[] = ['counter', 'checker', 'supervisor'];

export const RosterTab: React.FC = () => {
  const { state, add, update, logEvent } = useCashCustody();
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [f, setF] = useState({ name: '', phone: '', role: 'counter' as StaffRole, idProofRef: '', notes: '' });
  const [date, setDate] = useState(todayISO());

  const addStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) { showToast('Name is required.', 'warning'); return; }
    const s: CountingStaff = {
      id: uid('st'), name: f.name.trim(), phone: f.phone.trim() || undefined,
      role: f.role, idProofRef: f.idProofRef.trim() || undefined,
      active: true, joinedDate: todayISO(), notes: f.notes.trim() || undefined,
    };
    add('staff', s);
    logEvent('staff_checkin', 'Trustee', `Staff registered: ${s.name} (${s.role})`);
    showToast(`${s.name} added to the counting roster.`, 'success');
    setF({ name: '', phone: '', role: 'counter', idProofRef: '', notes: '' });
    setShowForm(false);
  };

  const toggleAttendance = (staffId: string) => {
    const existing = state.attendance.find((a) => a.staffId === staffId && a.date === date);
    const staff = state.staff.find((s) => s.id === staffId);
    if (existing) {
      update('attendance', existing.id, { present: !existing.present, checkOutTs: existing.present ? Date.now() : undefined, checkInTs: !existing.present ? Date.now() : existing.checkInTs });
      logEvent(existing.present ? 'staff_checkout' : 'staff_checkin', staff?.name || '', `${staff?.name} ${existing.present ? 'checked out' : 'checked in'} — ${date}`);
    } else {
      add('attendance', { id: uid('at'), staffId, date, present: true, checkInTs: Date.now() });
      logEvent('staff_checkin', staff?.name || '', `${staff?.name} checked in — ${date}`);
    }
  };

  const activeStaff = state.staff.filter((s) => s.active);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-extrabold text-stone-800">
          <T en="Counting staff" bn="গণনা কর্মী" hi="गणना कर्मचारी" /> ({activeStaff.length})
        </h2>
        <div className="flex items-center gap-2 no-print">
          <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} style={{ width: 'auto' }} />
          <Btn onClick={() => setShowForm((v) => !v)}>+ <T en="Add staff" bn="কর্মী যোগ" hi="कर्मचारी जोड़ें" /></Btn>
        </div>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={addStaff} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={<T en="Full name" bn="পুরো নাম" hi="पूरा नाम" />}>
              <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Full name" />
            </Field>
            <Field label={<T en="Phone (optional)" bn="ফোন" hi="फोन" />}>
              <input className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+91 …" />
            </Field>
            <Field label={<T en="Role" bn="ভূমিকা" hi="भूमिका" />}>
              <select className={inputCls} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as StaffRole })}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label={<T en="ID proof ref (optional)" bn="পরিচয়পত্র" hi="पहचान प्रमाण" />}>
              <input className={inputCls} value={f.idProofRef} onChange={(e) => setF({ ...f, idProofRef: e.target.value })} placeholder="Aadhaar last 4 / staff ID" />
            </Field>
            <div className="sm:col-span-2">
              <Btn type="submit" variant="emerald"><T en="Add to roster" bn="তালিকায় যোগ" hi="सूची में जोड़ें" /></Btn>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeStaff.map((s) => {
          const att = state.attendance.find((a) => a.staffId === s.id && a.date === date);
          const sessionsCounted = state.sessions.filter((x) => x.makerName === s.name || x.checkerName === s.name).length;
          return (
            <Card key={s.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-extrabold text-stone-800">👷 {s.name}</div>
                  <div className="text-xs text-stone-500 mt-0.5 capitalize">{s.role}{s.phone ? ` · ${s.phone}` : ''}</div>
                  <div className="text-xs text-stone-400 mt-0.5"><T en="Sessions handled" bn="সেশন" hi="सत्र" />: {sessionsCounted}</div>
                </div>
                <Btn variant={att?.present ? 'emerald' : 'ghost'} onClick={() => toggleAttendance(s.id)}>
                  {att?.present ? `✓ ${fmtDateTime(att.checkInTs || Date.now())}` : <T en="Check in" bn="চেক-ইন" hi="चेक-इन" />}
                </Btn>
              </div>
              <div className="mt-2 no-print">
                <Btn variant="ghost" className="text-xs" onClick={() => update('staff', s.id, { active: false })}>
                  <T en="Deactivate" bn="নিষ্ক্রিয়" hi="निष्क्रिय करें" />
                </Btn>
              </div>
            </Card>
          );
        })}
        {activeStaff.length === 0 && (
          <Card><p className="text-sm text-stone-500"><T en="No staff on the roster yet." bn="এখনও কেউ নেই।" hi="अभी कोई नहीं।" /></p></Card>
        )}
      </div>
    </div>
  );
};
