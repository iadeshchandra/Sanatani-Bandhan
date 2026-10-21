import React, { useState } from 'react';
import { useInr, useWorkspaceCurrency } from '../hooks/useWorkspaceInr';
import { useAshram, uid, todayISO, isRoomFreeForRange, findFreeRoom, nightsBetween } from './ashramStore';
import { Booking, RoomType, Stay } from './types';
import { Card, Btn, Field, inputCls, Empty, Modal, T, useLocaleText, StatusPill } from './ui';
import { useToast } from '../context/ToastContext';
import { useData } from '../context/DataContext';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';

/* Ashram One — guest check-in / check-out.
 *
 * CHECK-IN: walk-in or convert a held/confirmed booking. Room assignment
 * is validated against the overbooking engine (bed-level for
 * dormitories); clashes are refused with the exact clash date.
 *
 * CHECK-OUT: settles the stay donation (suggested vs actual). The
 * donation posts to treasury as Income with is80GEligible:false —
 * accommodation donations are generally not 80G-eligible, and the UI
 * says so plainly. Stay records themselves stay device-local.
 */

const ID_TYPES = ['Aadhaar', 'Voter ID', 'Passport', 'Driving Licence', 'Other'];

export const StaysTab: React.FC = () => {
  const inr = useInr();
  const wsCurrency = useWorkspaceCurrency();
  const { state, add, update } = useAshram();
  const { tr } = useLocaleText();
  const { showToast } = useToast();
  const { activeWorkspace } = useAuthWorkspace();
  const { addTreasuryTransaction } = useData();
  const today = todayISO();

  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkoutStay, setCheckoutStay] = useState<Stay | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const [f, setF] = useState({
    guestName: '', phone: '', idType: '', idNumber: '', purpose: '',
    partySize: 1, roomType: 'double' as RoomType, roomId: '',
    expectedCheckout: today,
  });
  const [co, setCo] = useState({ actual: 0, paymentMode: 'Cash', notes: '' });

  const roomName = (id: string) => state.rooms.find((r) => r.id === id)?.number || '—';
  const roomOf = (id: string) => state.rooms.find((r) => r.id === id);

  const openWalkin = () => {
    setSelectedBooking(null);
    setF({ guestName: '', phone: '', idType: '', idNumber: '', purpose: '', partySize: 1, roomType: 'double', roomId: '', expectedCheckout: today });
    setCheckinOpen(true);
  };
  const openFromBooking = (b: Booking) => {
    setSelectedBooking(b);
    setF({
      guestName: b.guestName, phone: b.phone, idType: '', idNumber: '',
      purpose: b.purpose || '', partySize: b.partySize,
      roomType: (b.roomType || roomOf(b.roomId || '')?.type || 'double') as RoomType,
      roomId: b.roomId || '', expectedCheckout: b.checkOut,
    });
    setCheckinOpen(true);
  };

  const doCheckin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.guestName.trim() || !f.phone.trim()) { showToast(tr('ashram.stay.need', 'Guest name and phone are required.', 'নাম ও ফোন আবশ্যক।', 'नाम और फोन आवश्यक है।'), 'warning'); return; }
    if (!f.expectedCheckout || f.expectedCheckout <= today) { showToast(tr('ashram.stay.expCo', 'Expected checkout must be after today.', 'ভুল তারিখ।', 'तिथि गलत है।'), 'warning'); return; }
    if (!(f.partySize >= 1)) { showToast(tr('ashram.stay.party', 'Party size must be at least 1.', 'কমপক্ষে ১ জন।', 'कम से कम 1 व्यक्ति।'), 'warning'); return; }

    // Resolve room: explicit hold first, else auto-assign by type.
    let room = f.roomId ? roomOf(f.roomId) : undefined;
    if (!room) {
      room = findFreeRoom(state.rooms, f.roomType, today, f.expectedCheckout, f.partySize, state) || undefined;
    }
    if (!room) { showToast(tr('ashram.stay.noRoom', 'No room with space for these dates — overbooking blocked.', 'জায়গা নেই — ডাবল বুকিং আটকানো।', 'जगह नहीं — डबल बुकिंग रोकी गई।'), 'error'); return; }
    const chk = isRoomFreeForRange(room, today, f.expectedCheckout, f.partySize, state);
    if (!chk.ok) { showToast(tr('ashram.stay.clash', `Room ${room.number} is full on ${chk.clashDate} — overbooking blocked.`, 'ডাবল বুকিং আটকানো।', 'डबल बुकिंग रोकी गई।'), 'error'); return; }

    const nights = nightsBetween(today, f.expectedCheckout);
    const stay: Stay = {
      id: uid('s'),
      bookingId: selectedBooking?.id,
      guestName: f.guestName.trim(), phone: f.phone.trim(),
      idType: f.idType || undefined, idNumber: f.idNumber.trim() || undefined,
      purpose: f.purpose.trim() || undefined,
      partySize: Math.floor(f.partySize), roomId: room.id,
      checkIn: new Date().toISOString(), expectedCheckout: f.expectedCheckout,
      status: 'checked-in',
      suggestedTotal: nights * room.suggestedDonation,
    };
    add('stays', stay);
    if (selectedBooking) update('bookings', selectedBooking.id, { status: 'checked-in', roomId: room.id });
    showToast(tr('ashram.stay.inOk', `${stay.guestName} checked in — room ${room.number}.`, 'চেক-ইন সম্পন্ন।', 'चेक-इन पूर्ण।'), 'success');
    setCheckinOpen(false);
  };

  const openCheckout = (s: Stay) => {
    setCheckoutStay(s);
    setCo({ actual: s.suggestedTotal, paymentMode: 'Cash', notes: '' });
  };

  const doCheckout = () => {
    const s = checkoutStay;
    if (!s) return;
    const room = roomOf(s.roomId);
    const nights = nightsBetween(s.checkIn.slice(0, 10), today);
    const actual = Math.max(0, Math.round(co.actual || 0));
    const yyyymm = today.slice(0, 7).replace('-', '');
    const seq = String(state.stays.filter((x) => x.status === 'checked-out').length + 1).padStart(4, '0');
    const receiptNo = `STAY-${yyyymm}-${seq}`;

    const ok = addTreasuryTransaction({
      workspaceId: activeWorkspace.id,
      date: new Date().toISOString(),
      type: 'Income',
      category: 'Yatri Stay (Donation)',
      subcategory: 'Ashram One — Stay donation',
      amount: actual,
      handledBy: 'Ashram Karyalaya',
      paymentMode: co.paymentMode,
      referenceNo: receiptNo,
      purpose: `Stay donation — ${s.guestName}, room ${room?.number || '—'}, ${nights} night(s) (${receiptNo}). Not 80G-eligible (accommodation).`,
      // Honest: accommodation donations are generally not 80G-eligible.
      is80GEligible: false,
      taxReceiptIssued: false,
      devoteeName: s.guestName,
    });

    update('stays', s.id, {
      status: 'checked-out', checkoutAt: new Date().toISOString(),
      actualDonation: actual, paymentMode: co.paymentMode,
      receiptNo, treasuryTxId: ok ? 'posted' : undefined,
      notes: co.notes.trim() || undefined,
    });
    if (ok) {
      showToast(tr('ashram.stay.outOk', `Checked out — ${inr(actual)} posted to treasury (non-80G).`, 'চেক-আউট — ট্রেজারিতে পোস্ট।', 'चेक-आउट — ट्रेजरी में पोस्ट।'), 'success');
    } else {
      showToast(tr('ashram.stay.outLocal', 'Checked out locally — treasury posting failed, retry from Reports.', 'ট্রেজারি পোস্ট ব্যর্থ।', 'ट्रेजरी पोस्ट विफल।'), 'warning');
    }
    setCheckoutStay(null);
  };

  const active = state.stays.filter((s) => s.status === 'checked-in')
    .sort((a, b) => a.expectedCheckout.localeCompare(b.expectedCheckout));
  const recentOut = state.stays.filter((s) => s.status === 'checked-out')
    .sort((a, b) => (b.checkoutAt || '').localeCompare(a.checkoutAt || '')).slice(0, 8);
  const convertible = state.bookings.filter(
    (b) => (b.status === 'held' || b.status === 'confirmed') && b.checkIn <= today && today < b.checkOut,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between no-print">
        <h3 className="font-bold text-stone-800">
          <T en="Guest stays" bn="অতিথি নিবাস" hi="अतिथि निवास" />{' '}
          <span className="text-xs font-normal text-stone-500">({active.length} {tr('ashram.stay.inHouse', 'in-house', 'ভিতরে', 'अंदर')})</span>
        </h3>
        <Btn onClick={openWalkin}>＋ {tr('ashram.stay.checkin', 'Check-in', 'চেক-ইন', 'चेक-इन')}</Btn>
      </div>

      {convertible.length > 0 && (
        <Card className="border-sky-200 bg-sky-50/50">
          <h4 className="text-sm font-bold text-sky-900 mb-2">
            {tr('ashram.stay.arriving', 'Arriving bookings — convert to check-in', 'আগত বুকিং', 'आगामी बुकिंग')}
          </h4>
          <div className="flex flex-wrap gap-2">
            {convertible.map((b) => (
              <button
                key={b.id}
                onClick={() => openFromBooking(b)}
                className="rounded-xl bg-white border border-sky-200 px-3 py-2 text-sm font-semibold text-sky-900 hover:border-sky-400 transition min-h-[44px]"
              >
                {b.guestName} · {b.partySize} · {b.checkIn}→{b.checkOut}
              </button>
            ))}
          </div>
        </Card>
      )}

      {active.length === 0 ? (
        <Empty text={tr('ashram.stay.empty', 'No guests in-house right now.', 'কোনো অতিথি নেই।', 'अभी कोई अतिथि नहीं।')} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {active.map((s) => (
            <Card key={s.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-stone-800 truncate">{s.guestName}</div>
                  <div className="text-xs text-stone-500">{s.phone} · {s.partySize} {tr('ashram.stay.persons', 'persons', 'জন', 'व्यक्ति')}</div>
                  <div className="text-xs text-stone-500 mt-1">
                    🏠 {tr('ashram.stay.room', 'Room', 'কক্ষ', 'कमरा')} <b>{roomName(s.roomId)}</b>
                    {' '}· {tr('ashram.stay.out', 'out', 'প্রস্থান', 'प्रस्थान')}: {s.expectedCheckout}
                  </div>
                  {s.purpose && <div className="text-xs text-stone-500 italic mt-0.5">{s.purpose}</div>}
                </div>
                <StatusPill status="checked-in" />
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-100">
                <div className="text-xs text-stone-500">
                  {tr('ashram.stay.suggested', 'Suggested', 'প্রস্তাবিত', 'सुझाया')}: <b className="text-stone-700">{inr(s.suggestedTotal)}</b>
                </div>
                <Btn className="!py-2 !min-h-0 text-xs" onClick={() => openCheckout(s)}>
                  {tr('ashram.stay.checkout', 'Check-out', 'চেক-আউট', 'चेक-आउट')}
                </Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {recentOut.length > 0 && (
        <>
          <h4 className="text-sm font-bold text-stone-500 pt-2">
            <T en="Recent check-outs" bn="সাম্প্রতিক চেক-আউট" hi="हाल के चेक-आउट" />
          </h4>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 opacity-80">
            {recentOut.map((s) => (
              <Card key={s.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-stone-700 text-sm truncate">{s.guestName}</div>
                    <div className="text-xs text-stone-500">
                      {s.checkIn.slice(0, 10)} → {(s.checkoutAt || '').slice(0, 10)} · 🏠 {roomName(s.roomId)}
                    </div>
                  </div>
                  <StatusPill status="checked-out" />
                </div>
                <div className="text-xs text-stone-500 mt-2">
                  {tr('ashram.stay.received', 'Received', 'প্রাপ্ত', 'प्राप्त')}: <b className="text-emerald-700">{inr(s.actualDonation || 0)}</b>
                  {' '}· {s.receiptNo}
                  {s.treasuryTxId ? ' · ✓ treasury' : ' · ⚠ local only'}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {checkinOpen && (
        <Modal wide title={tr('ashram.stay.ciTitle', 'Guest check-in', 'অতিথি চেক-ইন', 'अतिथि चेक-इन')} onClose={() => setCheckinOpen(false)}>
          <form onSubmit={doCheckin} className="space-y-3">
            {selectedBooking && (
              <div className="rounded-xl bg-sky-50 border border-sky-200 px-3 py-2 text-sm text-sky-900">
                📅 {tr('ashram.stay.fromBooking', 'From booking', 'বুকিং থেকে', 'बुकिंग से')}: <b>{selectedBooking.guestName}</b> ({selectedBooking.checkIn} → {selectedBooking.checkOut})
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label={tr('ashram.stay.name', 'Guest name', 'অতিথির নাম', 'अतिथि का नाम')}>
                <input className={inputCls} value={f.guestName} onChange={(e) => setF({ ...f, guestName: e.target.value })} />
              </Field>
              <Field label={tr('ashram.stay.phone', 'Phone', 'ফোন', 'फोन')}>
                <input className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+91 …" />
              </Field>
              <Field label={tr('ashram.stay.idType', 'ID type (optional, device-local)', 'পরিচয়পত্র (ঐচ্ছিক)', 'पहचान पत्र (वैकल्पिक)')}>
                <select className={inputCls} value={f.idType} onChange={(e) => setF({ ...f, idType: e.target.value })}>
                  <option value="">—</option>
                  {ID_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label={tr('ashram.stay.idNumber', 'ID number (optional, device-local)', 'পরিচয় নম্বর', 'पहचान संख्या')}>
                <input className={inputCls} value={f.idNumber} onChange={(e) => setF({ ...f, idNumber: e.target.value })} placeholder="XXXX-XXXX-…" />
              </Field>
              <Field label={tr('ashram.stay.purpose', 'Purpose of visit', 'আগমনের উদ্দেশ্য', 'आगमन का उद्देश्य')}>
                <input className={inputCls} value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })} placeholder={tr('ashram.stay.purposePh', 'Darshan, shivir…', 'দর্শন…', 'दर्शन…')} />
              </Field>
              <Field label={tr('ashram.stay.party', 'Party size', 'দলের আকার', 'दल का आकार')}>
                <input type="number" min={1} className={inputCls} value={f.partySize} onChange={(e) => setF({ ...f, partySize: Number(e.target.value) })} />
              </Field>
              <Field label={tr('ashram.stay.roomType', 'Room type', 'কক্ষের ধরন', 'कमरे का प्रकार')}>
                <select className={inputCls} value={f.roomType} onChange={(e) => setF({ ...f, roomType: e.target.value as RoomType, roomId: '' })}>
                  {(['single', 'double', 'dormitory', 'family'] as RoomType[]).map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label={tr('ashram.stay.roomPick', 'Specific room (optional)', 'নির্দিষ্ট কক্ষ', 'विशिष्ट कमरा')}>
                <select className={inputCls} value={f.roomId} onChange={(e) => setF({ ...f, roomId: e.target.value })}>
                  <option value="">{tr('ashram.stay.autoAssign', 'Auto-assign with space', 'স্বয়ংক্রিয়', 'स्वतः आवंटन')}</option>
                  {state.rooms.filter((r) => r.status !== 'maintenance' && (f.roomType ? r.type === f.roomType : true)).map((r) => (
                    <option key={r.id} value={r.id}>{r.number} ({r.type}, cap {r.capacity})</option>
                  ))}
                </select>
              </Field>
              <Field label={tr('ashram.stay.expCo2', 'Expected checkout', 'প্রত্যাশিত প্রস্থান', 'अपेक्षित प्रस्थान')}>
                <input type="date" className={inputCls} value={f.expectedCheckout} min={today} onChange={(e) => setF({ ...f, expectedCheckout: e.target.value })} />
              </Field>
            </div>
            <p className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2">
              🔒 {tr('ashram.stay.idNote', 'ID details stay on this device only — used for the printed guest register.', 'পরিচয় বিবরণ শুধু এই ডিভাইসে থাকে।', 'पहचान विवरण केवल इसी डिवाइस पर रहता है।')}
            </p>
            <div className="flex gap-2 pt-1">
              <Btn type="submit" className="flex-1">{tr('ashram.stay.checkinBtn', 'Check in', 'চেক-ইন', 'चेक-इन')}</Btn>
              <Btn variant="ghost" type="button" onClick={() => setCheckinOpen(false)}>{tr('ashram.common.cancel', 'Cancel', 'বাতিল', 'रद्द')}</Btn>
            </div>
          </form>
        </Modal>
      )}

      {checkoutStay && (() => {
        const s = checkoutStay;
        const room = roomOf(s.roomId);
        const nights = nightsBetween(s.checkIn.slice(0, 10), today);
        return (
          <Modal title={tr('ashram.stay.coTitle', 'Check-out & settle donation', 'চেক-আউট ও দান', 'चेक-आउट व दान')} onClose={() => setCheckoutStay(null)}>
            <div className="space-y-3">
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm">
                <b>{s.guestName}</b> · 🏠 {room?.number} · {nights} {tr('ashram.stay.nights', 'night(s)', 'রাত', 'रात')}<br />
                <span className="text-stone-600">{tr('ashram.stay.suggested', 'Suggested', 'প্রস্তাবিত', 'सुझाया')}: {inr(s.suggestedTotal)}</span>
              </div>
              <Field label={tr('ashram.stay.actual', `Actual donation received (${wsCurrency.symbol})`, `প্রাপ্ত দান (${wsCurrency.symbol})`, `प्राप्त दान (${wsCurrency.symbol})`)}>
                <input type="number" min={0} className={inputCls} value={co.actual} onChange={(e) => setCo({ ...co, actual: Number(e.target.value) })} />
              </Field>
              <Field label={tr('ashram.stay.payMode', 'Payment mode', 'প্রদানের মাধ্যম', 'भुगतान माध्यम')}>
                <select className={inputCls} value={co.paymentMode} onChange={(e) => setCo({ ...co, paymentMode: e.target.value })}>
                  {['Cash', 'UPI', 'Bank', 'Card'].map((m2) => <option key={m2} value={m2}>{m2}</option>)}
                </select>
              </Field>
              <Field label={tr('ashram.stay.notes', 'Notes (optional)', 'মন্তব্য', 'टिप्पणी')}>
                <input className={inputCls} value={co.notes} onChange={(e) => setCo({ ...co, notes: e.target.value })} />
              </Field>
              <p className="text-xs text-stone-600 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2">
                ℹ️ {tr('ashram.stay.eightyG', 'Accommodation donations are generally not 80G-eligible. This posts to treasury as non-80G income — no tax receipt is issued.', 'আবাসন দান সাধারণত 80G-যোগ্য নয়।', 'आवास दान सामान्यतः 80G-योग्य नहीं है।')}
              </p>
              <div className="flex gap-2 pt-1">
                <Btn className="flex-1" onClick={doCheckout}>{tr('ashram.stay.settle', 'Check out & post to treasury', 'চেক-আউট', 'चेक-आउट')}</Btn>
                <Btn variant="ghost" onClick={() => setCheckoutStay(null)}>{tr('ashram.common.cancel', 'Cancel', 'বাতিল', 'रद्द')}</Btn>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};
