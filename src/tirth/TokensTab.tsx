import React, { useState } from 'react';
import { useTirth, uid, todayISO, nextToken, slotIssued, slotHasRoom, tokensFor, estWaitMins } from './tirthStore';
import { DarshanToken, TokenKind } from './types';
import { T, Card, Btn, Field, inputCls, StatusPill, Empty, fmtTime } from './ui';
import { useToast } from '../context/ToastContext';

/* Tirth One — token counter: issue walk-in / advance tokens, print slips.
 * Issuance is blocked past slot capacity; the operator is offered the
 * next slot with room instead of silently over-issuing. */

export const TokensTab: React.FC = () => {
  const { state, add } = useTirth();
  const { showToast } = useToast();
  const [date, setDate] = useState(todayISO());
  const [slotId, setSlotId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [kind, setKind] = useState<TokenKind>('walk-in');
  const [printing, setPrinting] = useState<string | null>(null);

  const activeSlots = state.slots.filter((s) => s.active);
  const slot = activeSlots.find((s) => s.id === slotId) || activeSlots[0];
  if (!activeSlots.length) return <Card><Empty text="Add darshan slots first — then issue tokens here." /></Card>;

  const todays = tokensFor(state, date);
  const issued = slot ? slotIssued(state, slot.id, date) : 0;
  const hasRoom = slot ? slotHasRoom(state, slot, date) : false;
  const nextSlot = activeSlots.find((s) => s.id !== slot?.id && slotHasRoom(state, s, date));

  const issue = () => {
    if (!slot) return;
    if (!slotHasRoom(state, slot, date)) {
      showToast(nextSlot
        ? `Slot full — ${nextSlot.name} has room. Switch slots to continue.`
        : 'All slots are full for this date.', 'warning');
      return;
    }
    const { no, seq } = nextToken(state, date);
    const token: DarshanToken = {
      id: uid('tk'), date, slotId: slot.id, no, seq,
      name: name.trim() || undefined, phone: phone.trim() || undefined,
      kind, status: 'waiting', issuedAt: new Date().toISOString(),
    };
    add('tokens', token);
    const wait = estWaitMins(state, slot.id, date, seq);
    showToast(`Token ${no} issued for ${slot.name} — est. wait ~${wait} min.`, 'success');
    setName(''); setPhone('');
  };

  const printSlip = (id: string) => {
    setPrinting(id);
    setTimeout(() => { window.print(); setPrinting(null); }, 150);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-extrabold text-stone-800"><T en="Token counter" bn="টোকেন কাউন্টার" hi="टोकन काउंटर" /></h2>
        <Field label={<T en="Date" bn="তারিখ" hi="तिथि" />}>
          <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label={<T en="Slot" bn="স্লট" hi="स्लॉट" />}>
            <select className={inputCls} value={slot?.id || ''} onChange={(e) => setSlotId(e.target.value)}>
              {activeSlots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({fmtTime(s.startTime)}–{fmtTime(s.endTime)}) — {slotIssued(state, s.id, date)}/{s.capacity}
                </option>
              ))}
            </select>
          </Field>
          <Field label={<T en="Name (optional)" bn="নাম (ঐচ্ছিক)" hi="नाम (वैकल्पिक)" />}>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Yatri name" />
          </Field>
          <Field label={<T en="Phone (optional)" bn="ফোন (ঐচ্ছিক)" hi="फोन (वैकल्पिक)" />}>
            <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 …" />
          </Field>
          <Field label={<T en="Kind" bn="ধরন" hi="प्रकार" />}>
            <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value as TokenKind)}>
              <option value="walk-in">Walk-in</option>
              <option value="advance">Advance</option>
            </select>
          </Field>
        </div>
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <Btn onClick={issue} disabled={!hasRoom}>🎫 <T en="Issue token" bn="টোকেন দিন" hi="टोकन जारी करें" /></Btn>
          {slot && (
            <span className={`text-sm font-bold ${hasRoom ? 'text-teal-700' : 'text-red-700'}`}>
              {issued}/{slot.capacity} issued
              {!hasRoom && nextSlot && <span className="text-stone-500 font-normal"> — try {nextSlot.name}</span>}
            </span>
          )}
        </div>
      </Card>

      <h3 className="font-extrabold text-stone-800"><T en="Today's tokens" bn="আজকের টোকেন" hi="आज के टोकन" /> <span className="text-stone-400 font-normal">({todays.length})</span></h3>
      {todays.length === 0 && <Card><Empty text="No tokens issued for this date yet." /></Card>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {todays.map((t) => {
          const s = state.slots.find((x) => x.id === t.slotId);
          const isPrinting = printing === t.id;
          return (
            <Card key={t.id} className={isPrinting ? 'print-token' : ''}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-mono font-extrabold text-xl text-teal-800">{t.no}</div>
                  <div className="text-xs text-stone-500">{s?.name || '—'}{t.name ? ` · ${t.name}` : ''}</div>
                </div>
                <StatusPill status={t.status} />
              </div>
              <div className="flex items-center gap-2 mt-2 no-print">
                <StatusPill status={t.kind} />
                {t.status === 'waiting' && (
                  <span className="text-xs text-stone-500">est. wait ~{estWaitMins(state, t.slotId, t.date, t.seq)} min</span>
                )}
                <button onClick={() => printSlip(t.id)} className="ml-auto text-xs font-bold text-teal-700 underline min-h-[44px] px-2">
                  <T en="Print slip" bn="স্লিপ প্রিন্ট" hi="पर्ची प्रिंट करें" />
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
