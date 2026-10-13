import React, { useState } from 'react';
import { useCashCustody, uid, emptyCounts } from './cashCustodyStore';
import { HundiBox } from './types';
import { T, Card, Btn, Field, inputCls, StatusPill, fmtDateTime, inr } from './ui';
import { useToast } from '../context/ToastContext';

/* ------------------------------------------------------------------ */
/* Hundi registry + dual-custody box-opening ceremony. Two authorised  */
/* persons confirm, the seal number is verified against the registry,  */
/* both sign digitally (name + role). Every step hits the hash chain.  */
/* ------------------------------------------------------------------ */

const LOCATIONS = ['sanctum', 'gate', 'annakshetra', 'corridor', 'office', 'other'];

export const HundiTab: React.FC = () => {
  const { state, add, update, logEvent } = useCashCustody();
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [opening, setOpening] = useState<HundiBox | null>(null);
  const [f, setF] = useState({ boxCode: '', name: '', location: 'sanctum', sealNumber: '', custodian1: '', custodian2: '', notes: '' });
  const [o, setO] = useState({ by1: '', by2: '', seal: '', note: '' });

  const registerBox = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.boxCode.trim() || !f.name.trim() || !f.sealNumber.trim() || !f.custodian1.trim() || !f.custodian2.trim()) {
      showToast('Box code, name, seal number and both custodians are required.', 'warning'); return;
    }
    if (state.boxes.some((b) => b.boxCode.toLowerCase() === f.boxCode.trim().toLowerCase())) {
      showToast('That box code is already registered.', 'warning'); return;
    }
    const box: HundiBox = {
      id: uid('bx'), boxCode: f.boxCode.trim().toUpperCase(), name: f.name.trim(),
      location: f.location, sealNumber: f.sealNumber.trim(),
      custodian1: f.custodian1.trim(), custodian2: f.custodian2.trim(),
      status: 'sealed', notes: f.notes.trim() || undefined, createdAt: Date.now(),
    };
    add('boxes', box);
    logEvent('box_registered', 'Trustee', `${box.boxCode} — ${box.name} (${box.location}), seal ${box.sealNumber}`);
    showToast(`${box.boxCode} registered and sealed.`, 'success');
    setF({ boxCode: '', name: '', location: 'sanctum', sealNumber: '', custodian1: '', custodian2: '', notes: '' });
    setShowForm(false);
  };

  const startOpen = (box: HundiBox) => {
    setO({ by1: box.custodian1, by2: box.custodian2, seal: '', note: '' });
    setOpening(box);
  };

  const confirmOpen = () => {
    if (!opening) return;
    if (!o.by1.trim() || !o.by2.trim()) { showToast('Both custodians must confirm by name.', 'warning'); return; }
    if (o.by1.trim().toLowerCase() === o.by2.trim().toLowerCase()) {
      showToast('Dual custody requires TWO different persons — the same name cannot sign twice.', 'error'); return;
    }
    if (o.seal.trim() !== opening.sealNumber) {
      showToast(`Seal mismatch — registry says ${opening.sealNumber}. Do not open; escalate to the trustee.`, 'error'); return;
    }
    const session = {
      id: uid('cs'), boxId: opening.id, openedAt: Date.now(),
      openedBy1: o.by1.trim(), openedBy2: o.by2.trim(),
      sealNumberVerified: o.seal.trim(), photoNote: o.note.trim() || undefined,
      status: 'open' as const, makerCounts: emptyCounts(), makerName: '',
      discrepancyResolved: false, total: 0, createdAt: Date.now(),
    };
    add('sessions', session);
    update('boxes', opening.id, { status: 'open', lastOpenedAt: Date.now(), lastOpenedBy: `${o.by1.trim()} + ${o.by2.trim()}` });
    logEvent('box_opened', `${o.by1.trim()} + ${o.by2.trim()}`, `${opening.boxCode} opened — seal ${o.seal.trim()} verified${o.note.trim() ? `; note: ${o.note.trim()}` : ''}`);
    showToast(`${opening.boxCode} opened under dual custody. Proceed to Counting.`, 'success');
    setOpening(null);
  };

  const changeSeal = (box: HundiBox) => {
    const next = window.prompt(`New seal number for ${box.boxCode} (current: ${box.sealNumber}):`, '');
    if (!next || !next.trim()) return;
    update('boxes', box.id, { sealNumber: next.trim() });
    logEvent('seal_changed', 'Trustee', `${box.boxCode} seal changed ${box.sealNumber} → ${next.trim()}`);
    showToast('Seal number updated and logged.', 'success');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between no-print">
        <h2 className="text-lg font-extrabold text-stone-800">
          <T en="Hundi Boxes" bn="হুন্ডি বাক্স" hi="हुंडी पेटी" />
        </h2>
        <Btn onClick={() => setShowForm((v) => !v)}>+ <T en="Register box" bn="বাক্স নিবন্ধন" hi="पेटी पंजीकृत करें" /></Btn>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={registerBox} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={<T en="Box code" bn="বাক্স কোড" hi="पेटी कोड" />}>
              <input className={inputCls} value={f.boxCode} onChange={(e) => setF({ ...f, boxCode: e.target.value })} placeholder="HND-004" />
            </Field>
            <Field label={<T en="Box name" bn="বাক্সের নাম" hi="पेटी का नाम" />}>
              <input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Corridor donation box" />
            </Field>
            <Field label={<T en="Location" bn="অবস্থান" hi="स्थान" />}>
              <select className={inputCls} value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })}>
                {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
            <Field label={<T en="Seal number" bn="সিল নম্বর" hi="सील संख्या" />}>
              <input className={inputCls} value={f.sealNumber} onChange={(e) => setF({ ...f, sealNumber: e.target.value })} placeholder="SL-2026-0145" />
            </Field>
            <Field label={<T en="Custodian 1" bn="হেফাজতকারী ১" hi="अभिरक्षक १" />}>
              <input className={inputCls} value={f.custodian1} onChange={(e) => setF({ ...f, custodian1: e.target.value })} placeholder="Full name" />
            </Field>
            <Field label={<T en="Custodian 2" bn="হেফাজতকারী ২" hi="अभिरक्षक २" />}>
              <input className={inputCls} value={f.custodian2} onChange={(e) => setF({ ...f, custodian2: e.target.value })} placeholder="Full name" />
            </Field>
            <div className="sm:col-span-2">
              <Btn type="submit" variant="emerald"><T en="Register & seal" bn="নিবন্ধন ও সিল" hi="पंजीकृत व सील करें" /></Btn>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {state.boxes.map((b) => {
          const openSession = state.sessions.find((s) => s.boxId === b.id && s.status !== 'closed');
          return (
            <Card key={b.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-extrabold text-stone-800">{b.boxCode} — {b.name}</div>
                  <div className="text-xs text-stone-500 mt-0.5 capitalize">{b.location} · seal {b.sealNumber}</div>
                  <div className="text-xs text-stone-500 mt-1">🔑 {b.custodian1} + {b.custodian2}</div>
                  {b.lastOpenedAt && (
                    <div className="text-xs text-stone-400 mt-1">Last opened {fmtDateTime(b.lastOpenedAt)} by {b.lastOpenedBy}</div>
                  )}
                </div>
                <StatusPill status={b.status} />
              </div>
              <div className="flex flex-wrap gap-2 mt-3 no-print">
                {b.status === 'sealed' && !openSession && (
                  <Btn onClick={() => startOpen(b)}>🔓 <T en="Open (dual custody)" bn="খুলুন (দ্বৈত)" hi="खोलें (द्वि-अभिरक्षा)" /></Btn>
                )}
                {openSession && (
                  <span className="text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 rounded-xl px-3 py-2.5">
                    <T en="Session in progress" bn="সেশন চলছে" hi="सत्र जारी" /> — {inr(openSession.total)}
                  </span>
                )}
                <Btn variant="ghost" onClick={() => changeSeal(b)}><T en="Change seal" bn="সিল বদলান" hi="सील बदलें" /></Btn>
              </div>
            </Card>
          );
        })}
        {state.boxes.length === 0 && (
          <Card><p className="text-sm text-stone-500"><T en="No boxes registered yet." bn="এখনও কোনো বাক্স নেই।" hi="अभी कोई पेटी नहीं।" /></p></Card>
        )}
      </div>

      {opening && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <h3 className="font-extrabold text-stone-800 text-lg">🔓 <T en="Dual-custody opening" bn="দ্বৈত-হেফাজতে খোলা" hi="द्वि-अभिरक्षा उद्घाटन" /> — {opening.boxCode}</h3>
            <p className="text-xs text-stone-500 mt-1">
              <T en="Both custodians must be physically present. The seal number is verified against the registry before the box may be opened."
                bn="উভয় হেফাজতকারীকে উপস্থিত থাকতে হবে। খোলার আগে সিল নম্বর যাচাই করা হবে।"
                hi="दोनों अभिरक्षक उपस्थित होने चाहिए। खोलने से पहले सील संख्या सत्यापित होगी।" />
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <Field label={<T en="Custodian 1 confirms" bn="হেফাজতকারী ১" hi="अभिरक्षक १" />}>
                <input className={inputCls} value={o.by1} onChange={(e) => setO({ ...o, by1: e.target.value })} placeholder="Full name" />
              </Field>
              <Field label={<T en="Custodian 2 confirms" bn="হেফাজতকারী ২" hi="अभिरक्षक २" />}>
                <input className={inputCls} value={o.by2} onChange={(e) => setO({ ...o, by2: e.target.value })} placeholder="Full name" />
              </Field>
              <Field label={<T en="Seal number on the box" bn="বাক্সের সিল নম্বর" hi="पेटी पर सील संख्या" />}>
                <input className={inputCls} value={o.seal} onChange={(e) => setO({ ...o, seal: e.target.value })} placeholder={`Registry: ${opening.sealNumber}`} />
              </Field>
              <Field label={<T en="Photo / condition note (optional)" bn="ছবি/অবস্থা নোট" hi="फोटो/स्थिति नोट" />}>
                <input className={inputCls} value={o.note} onChange={(e) => setO({ ...o, note: e.target.value })} placeholder="Seal intact, box undamaged…" />
              </Field>
            </div>
            <div className="flex gap-2 mt-4">
              <Btn variant="emerald" onClick={confirmOpen}><T en="Verify seal & open" bn="সিল যাচাই ও খুলুন" hi="सील सत्यापित कर खोलें" /></Btn>
              <Btn variant="ghost" onClick={() => setOpening(null)}><T en="Cancel" bn="বাতিল" hi="रद्द करें" /></Btn>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
