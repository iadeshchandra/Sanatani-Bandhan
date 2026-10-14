import React, { useState } from 'react';
import { useAshram, uid, todayISO, isRoomFreeForRange, findFreeRoom } from './ashramStore';
import { Booking, ROOM_TYPES, RoomType } from './types';
import { Card, Btn, Field, inputCls, Empty, Modal, T, useLocaleText, StatusPill } from './ui';
import { useToast } from '../context/ToastContext';

/* Ashram One — advance bookings: date-range reservations with room
 * hold, automatic overbooking protection (bed-level for dormitories),
 * waitlist when full, and no-show handling. A confirmed booking
 * converts to a stay with one tap on arrival. */

export const BookingsTab: React.FC = () => {
  const { state, add, update } = useAshram();
  const { tr } = useLocaleText();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const today = todayISO();

  const [f, setF] = useState({
    guestName: '', phone: '', roomType: 'double' as RoomType | '',
    roomId: '', partySize: 2, checkIn: today, checkOut: today,
    purpose: '', notes: '',
  });

  const startAdd = () => {
    setF({ guestName: '', phone: '', roomType: 'double', roomId: '', partySize: 2, checkIn: today, checkOut: today, purpose: '', notes: '' });
    setOpen(true);
  };

  /** Availability probe for the current form values. */
  const probe = () => {
    if (!f.checkIn || !f.checkOut || f.checkOut <= f.checkIn) return { ok: false, reason: 'dates' as const };
    if (f.roomId) {
      const room = state.rooms.find((r) => r.id === f.roomId);
      if (!room) return { ok: false, reason: 'noroom' as const };
      const r = isRoomFreeForRange(room, f.checkIn, f.checkOut, f.partySize, state);
      return r.ok ? { ok: true as const, room } : { ok: false as const, reason: 'clash' as const, clashDate: r.clashDate };
    }
    if (f.roomType) {
      const room = findFreeRoom(state.rooms, f.roomType, f.checkIn, f.checkOut, f.partySize, state);
      return room ? { ok: true as const, room } : { ok: false as const, reason: 'full' as const };
    }
    return { ok: false as const, reason: 'noroom' as const };
  };

  const submit = (e: React.FormEvent, asWaitlist: boolean) => {
    e.preventDefault();
    if (!f.guestName.trim() || !f.phone.trim()) { showToast(tr('ashram.book.need', 'Guest name and phone are required.', 'নাম ও ফোন আবশ্যক।', 'नाम और फोन आवश्यक है।'), 'warning'); return; }
    if (!f.checkIn || !f.checkOut || f.checkOut <= f.checkIn) { showToast(tr('ashram.book.dates', 'Check-out must be after check-in.', 'ভুল তারিখ।', 'तिथियां गलत हैं।'), 'warning'); return; }
    if (!(f.partySize >= 1)) { showToast(tr('ashram.book.party', 'Party size must be at least 1.', 'কমপক্ষে ১ জন।', 'कम से कम 1 व्यक्ति।'), 'warning'); return; }

    const p = probe();
    let status: Booking['status'];
    let roomId: string | undefined;
    if (asWaitlist || !p.ok) {
      status = 'waitlist';
    } else {
      status = 'confirmed';
      roomId = (p as { room: { id: string } }).room.id;
      if (f.roomId) roomId = f.roomId;
    }
    if (!asWaitlist && !p.ok && p.reason === 'clash') {
      showToast(tr('ashram.book.clash', `Overbooking blocked — no space on ${p.clashDate}. Added to waitlist instead.`, 'ডাবল বুকিং আটকানো হয়েছে।', 'डबल बुकिंग रोकी गई।'), 'warning');
      status = 'waitlist';
    }

    add('bookings', {
      id: uid('b'), guestName: f.guestName.trim(), phone: f.phone.trim(),
      roomId, roomType: f.roomType || undefined, partySize: Math.floor(f.partySize),
      checkIn: f.checkIn, checkOut: f.checkOut,
      purpose: f.purpose.trim() || undefined, status,
      notes: f.notes.trim() || undefined, createdAt: Date.now(),
    });
    showToast(
      status === 'waitlist'
        ? tr('ashram.book.waitlisted', 'No space — added to waitlist.', 'জায়গা নেই — অপেক্ষা তালিকায়।', 'जगह नहीं — प्रतीक्षा सूची में।')
        : tr('ashram.book.confirmed', `Booking confirmed${roomId ? ` — room ${state.rooms.find((r) => r.id === roomId)?.number}` : ''}.`, 'বুকিং নিশ্চিত।', 'बुकिंग पक्की।'),
      status === 'waitlist' ? 'info' : 'success',
    );
    setOpen(false);
  };

  const setStatus = (b: Booking, status: Booking['status']) => {
    // Re-check availability when confirming / moving off waitlist.
    if ((status === 'confirmed' || status === 'held') && b.status === 'waitlist') {
      const type = b.roomType || state.rooms.find((r) => r.id === b.roomId)?.type;
      let roomId = b.roomId;
      if (!roomId && type) {
        const free = findFreeRoom(state.rooms, type, b.checkIn, b.checkOut, b.partySize, state);
        if (!free) { showToast(tr('ashram.book.stillFull', 'Still no space for these dates — stays on waitlist.', 'এখনও জায়গা নেই।', 'अभी भी जगह नहीं है।'), 'warning'); return; }
        roomId = free.id;
      } else if (roomId) {
        const room = state.rooms.find((r) => r.id === roomId);
        if (room && !isRoomFreeForRange(room, b.checkIn, b.checkOut, b.partySize, state, { bookingId: b.id }).ok) {
          showToast(tr('ashram.book.stillFull', 'Still no space for these dates — stays on waitlist.', 'এখনও জায়গা নেই।', 'अभी भी जगह नहीं है।'), 'warning'); return;
        }
      }
      update('bookings', b.id, { status, roomId });
    } else {
      update('bookings', b.id, { status });
    }
    showToast(tr('ashram.book.statusSet', `Booking → ${status}.`, 'অবস্থা হালনাগাদ।', 'स्थिति अद्यतन।'), 'success');
  };

  const live = state.bookings
    .filter((b) => !['cancelled', 'no-show', 'checked-in'].includes(b.status))
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  const past = state.bookings
    .filter((b) => ['cancelled', 'no-show', 'checked-in'].includes(b.status))
    .sort((a, b) => b.checkIn.localeCompare(a.checkIn));

  const roomName = (id?: string) => state.rooms.find((r) => r.id === id)?.number || '—';

  const bookingCard = (b: Booking) => (
    <Card key={b.id}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-bold text-stone-800 truncate">{b.guestName}</div>
          <div className="text-xs text-stone-500">{b.phone} · {b.partySize} {tr('ashram.book.persons', 'persons', 'জন', 'व्यक्ति')}</div>
          <div className="text-xs text-stone-500 mt-1">
            📅 {b.checkIn} → {b.checkOut}
            {b.roomId ? ` · ${tr('ashram.book.room', 'room', 'কক্ষ', 'कमरा')} ${roomName(b.roomId)}` : b.roomType ? ` · ${b.roomType}` : ''}
          </div>
          {b.purpose && <div className="text-xs text-stone-500 italic mt-0.5">{b.purpose}</div>}
          {b.notes && <div className="text-xs text-amber-700 mt-0.5">📝 {b.notes}</div>}
        </div>
        <StatusPill status={b.status} />
      </div>
      {!['cancelled', 'no-show', 'checked-in'].includes(b.status) && (
        <div className="flex flex-wrap gap-2 mt-3 no-print">
          {b.status === 'waitlist' && (
            <Btn variant="ghost" className="!py-1.5 !min-h-0 text-xs" onClick={() => setStatus(b, 'confirmed')}>
              {tr('ashram.book.confirm', 'Confirm', 'নিশ্চিত', 'पक्का करें')}
            </Btn>
          )}
          {(b.status === 'held' || b.status === 'confirmed') && (
            <Btn variant="ghost" className="!py-1.5 !min-h-0 text-xs" onClick={() => setStatus(b, 'waitlist')}>
              {tr('ashram.book.toWaitlist', 'To waitlist', 'অপেক্ষায়', 'प्रतीक्षा में')}
            </Btn>
          )}
          <Btn variant="ghost" className="!py-1.5 !min-h-0 text-xs" onClick={() => setStatus(b, 'no-show')}>
            {tr('ashram.book.noShow', 'No-show', 'আসেনি', 'नहीं आया')}
          </Btn>
          <Btn variant="danger" className="!py-1.5 !min-h-0 text-xs" onClick={() => { if (window.confirm(tr('ashram.book.cancelQ', 'Cancel this booking?', 'বাতিল করবেন?', 'रद्द करें?'))) setStatus(b, 'cancelled'); }}>
            {tr('ashram.common.cancel', 'Cancel', 'বাতিল', 'रद्द')}
          </Btn>
        </div>
      )}
    </Card>
  );

  const p = open ? probe() : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between no-print">
        <h3 className="font-bold text-stone-800">
          <T en="Advance bookings" bn="অগ্রিম বুকিং" hi="अग्रिम बुकिंग" />{' '}
          <span className="text-xs font-normal text-stone-500">({live.length} {tr('ashram.book.live', 'live', 'চলমান', 'सक्रिय')})</span>
        </h3>
        <Btn onClick={startAdd}>＋ {tr('ashram.book.new', 'New booking', 'নতুন বুকিং', 'नई बुकिंग')}</Btn>
      </div>

      {live.length === 0 ? (
        <Empty text={tr('ashram.book.empty', 'No live bookings.', 'কোনো বুকিং নেই।', 'कोई बुकिंग नहीं।')} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{live.map(bookingCard)}</div>
      )}

      {past.length > 0 && (
        <>
          <h4 className="text-sm font-bold text-stone-500 pt-2">
            <T en="History" bn="ইতিহাস" hi="इतिहास" />
          </h4>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 opacity-75">{past.slice(0, 9).map(bookingCard)}</div>
        </>
      )}

      {open && (
        <Modal wide title={tr('ashram.book.title', 'New booking', 'নতুন বুকিং', 'नई बुकिंग')} onClose={() => setOpen(false)}>
          <form onSubmit={(e) => submit(e, false)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label={tr('ashram.book.name', 'Guest name', 'অতিথির নাম', 'अतिथि का नाम')}>
                <input className={inputCls} value={f.guestName} onChange={(e) => setF({ ...f, guestName: e.target.value })} />
              </Field>
              <Field label={tr('ashram.book.phone', 'Phone', 'ফোন', 'फोन')}>
                <input className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+91 …" />
              </Field>
              <Field label={tr('ashram.book.in', 'Check-in', 'আগমন', 'आगमन')}>
                <input type="date" className={inputCls} value={f.checkIn} min={today} onChange={(e) => setF({ ...f, checkIn: e.target.value })} />
              </Field>
              <Field label={tr('ashram.book.out', 'Check-out', 'প্রস্থান', 'प्रस्थान')}>
                <input type="date" className={inputCls} value={f.checkOut} min={f.checkIn} onChange={(e) => setF({ ...f, checkOut: e.target.value })} />
              </Field>
              <Field label={tr('ashram.book.roomType', 'Room type preference', 'কক্ষের ধরন', 'कमरे का प्रकार')}>
                <select className={inputCls} value={f.roomType} onChange={(e) => setF({ ...f, roomType: e.target.value as RoomType | '', roomId: '' })}>
                  <option value="">{tr('ashram.book.any', 'Any available', 'যেকোনো', 'कोई भी')}</option>
                  {ROOM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label={tr('ashram.book.roomHold', 'Hold specific room (optional)', 'নির্দিষ্ট কক্ষ (ঐচ্ছিক)', 'विशिष्ट कमरा (वैकल्पिक)')}>
                <select className={inputCls} value={f.roomId} onChange={(e) => setF({ ...f, roomId: e.target.value })}>
                  <option value="">{tr('ashram.book.auto', 'Auto-assign', 'স্বয়ংক্রিয়', 'स्वतः')}</option>
                  {state.rooms.filter((r) => r.status !== 'maintenance').map((r) => (
                    <option key={r.id} value={r.id}>{r.number} ({r.type}, {r.capacity})</option>
                  ))}
                </select>
              </Field>
              <Field label={tr('ashram.book.party', 'Party size', 'দলের আকার', 'दल का आकार')}>
                <input type="number" min={1} className={inputCls} value={f.partySize} onChange={(e) => setF({ ...f, partySize: Number(e.target.value) })} />
              </Field>
              <Field label={tr('ashram.book.purpose', 'Purpose of visit (optional)', 'আগমনের উদ্দেশ্য', 'आगमन का उद्देश्य')}>
                <input className={inputCls} value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })} placeholder={tr('ashram.book.purposePh', 'Darshan, shivir…', 'দর্শন…', 'दर्शन…')} />
              </Field>
            </div>

            {p && (
              <div className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${p.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                {p.ok
                  ? tr('ashram.book.availOk', `✓ Space available${(p as any).room ? ` — room ${(p as any).room.number}` : ''}.`, '✓ জায়গা আছে।', '✓ जगह उपलब्ध है।')
                  : p.reason === 'dates'
                    ? tr('ashram.book.availDates', 'Pick valid check-in / check-out dates.', 'সঠিক তারিখ দিন।', 'सही तिथियां चुनें।')
                    : tr('ashram.book.availFull', '⚠ No space for these dates — the booking will go to the waitlist (no double-booking).', '⚠ জায়গা নেই — অপেক্ষা তালিকায় যাবে।', '⚠ जगह नहीं — प्रतीक्षा सूची में जाएगा।')}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Btn type="submit" className="flex-1">{tr('ashram.book.confirmBook', 'Confirm booking', 'বুকিং নিশ্চিত', 'बुकिंग पक्की')}</Btn>
              <Btn variant="ghost" type="button" onClick={(e) => submit(e as any, true)}>{tr('ashram.book.waitlistBtn', 'Waitlist', 'অপেক্ষা', 'प्रतीक्षा')}</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
