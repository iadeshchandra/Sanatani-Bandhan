import React, { useState } from 'react';
import { useInr, useWorkspaceCurrency } from '../hooks/useWorkspaceInr';
import { useAshram, uid, todayISO, roomLoadOn } from './ashramStore';
import { Room, ROOM_TYPES, RoomType } from './types';
import { Card, Btn, Field, inputCls, Empty, Modal, T, useLocaleText, StatusPill } from './ui';
import { useToast } from '../context/ToastContext';

/* Ashram One — room registry: numbers, type, capacity, facilities,
 * daily suggested donation, maintenance flag. Live occupancy shown
 * per room (computed from stays + bookings, never stored). */

const TYPE_META: Record<RoomType, { icon: string }> = {
  single: { icon: '🛏️' },
  double: { icon: '🛏️🛏️' },
  dormitory: { icon: '🏕️' },
  family: { icon: '🏠' },
};

export const RoomsTab: React.FC = () => {
  const inr = useInr();
  const wsCurrency = useWorkspaceCurrency();
  const { state, add, update, remove } = useAshram();
  const { tr } = useLocaleText();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const today = todayISO();

  const [f, setF] = useState({
    number: '', type: 'double' as RoomType, capacity: 2,
    facilities: '', suggestedDonation: 351, status: 'available' as Room['status'],
    floor: '', notes: '',
  });

  const startAdd = () => {
    setEditing(null);
    setF({
      number: '', type: 'double', capacity: 2, facilities: '',
      suggestedDonation: state.settings.defaultSuggestedDonation,
      status: 'available', floor: '', notes: '',
    });
    setOpen(true);
  };
  const startEdit = (r: Room) => {
    setEditing(r);
    setF({
      number: r.number, type: r.type, capacity: r.capacity,
      facilities: r.facilities.join(', '), suggestedDonation: r.suggestedDonation,
      status: r.status, floor: r.floor || '', notes: r.notes || '',
    });
    setOpen(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.number.trim()) { showToast(tr('ashram.rooms.needNo', 'Room number is required.', 'কক্ষ নম্বর আবশ্যক।', 'कमरा नंबर आवश्यक है।'), 'warning'); return; }
    const dup = state.rooms.some((r) => r.number.trim().toLowerCase() === f.number.trim().toLowerCase() && r.id !== editing?.id);
    if (dup) { showToast(tr('ashram.rooms.dup', 'A room with this number already exists.', 'এই নম্বরের কক্ষ আছে।', 'इस नंबर का कमरा पहले से है।'), 'warning'); return; }
    if (!(f.capacity >= 1)) { showToast(tr('ashram.rooms.needCap', 'Capacity must be at least 1.', 'ধারণক্ষমতা কমপক্ষে ১।', 'क्षमता कम से कम 1 हो।'), 'warning'); return; }
    const payload = {
      number: f.number.trim(), type: f.type, capacity: Math.floor(f.capacity),
      facilities: f.facilities.split(',').map((s) => s.trim()).filter(Boolean),
      suggestedDonation: Math.max(0, Math.round(f.suggestedDonation)),
      status: f.status, floor: f.floor.trim() || undefined, notes: f.notes.trim() || undefined,
    };
    if (editing) {
      update('rooms', editing.id, payload);
      showToast(tr('ashram.rooms.updated', 'Room updated.', 'কক্ষ হালনাগাদ।', 'कमरा अद्यतन।'), 'success');
    } else {
      add('rooms', { id: uid('r'), ...payload });
      showToast(tr('ashram.rooms.added', 'Room registered.', 'কক্ষ নথিভুক্ত।', 'कमरा पंजीकृत।'), 'success');
    }
    setOpen(false);
  };

  const toggleMaintenance = (r: Room) => {
    const next = r.status === 'maintenance' ? 'available' : 'maintenance';
    update('rooms', r.id, { status: next });
    showToast(
      next === 'maintenance'
        ? tr('ashram.rooms.toMaint', `Room ${r.number} marked for maintenance — no new bookings.`, `কক্ষ ${r.number} মেরামতাধীন।`, `कमरा ${r.number} रखरखाव में।`)
        : tr('ashram.rooms.toAvail', `Room ${r.number} back in service.`, `কক্ষ ${r.number} সেবায় ফিরেছে।`, `कमरा ${r.number} सेवा में वापस।`),
      'info',
    );
  };

  const sorted = [...state.rooms].sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between no-print">
        <h3 className="font-bold text-stone-800">
          <T en="Room registry" bn="কক্ষ নথি" hi="कमरा पंजी" />{' '}
          <span className="text-xs font-normal text-stone-500">({state.rooms.length})</span>
        </h3>
        <Btn onClick={startAdd}>＋ {tr('ashram.rooms.add', 'Add room', 'কক্ষ যোগ', 'कमरा जोड़ें')}</Btn>
      </div>

      {sorted.length === 0 ? (
        <Empty text={tr('ashram.rooms.empty', 'No rooms yet — register your first room.', 'কোনো কক্ষ নেই।', 'अभी कोई कमरा नहीं।')} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sorted.map((r) => {
            const load = roomLoadOn(r, today, state);
            const occupied = load.used > 0;
            return (
              <Card key={r.id} className={r.status === 'maintenance' ? 'opacity-80 border-red-200' : ''}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center text-xl shrink-0">
                      {TYPE_META[r.type].icon}
                    </div>
                    <div>
                      <div className="font-extrabold text-stone-800 text-lg leading-tight">
                        {tr('ashram.rooms.room', 'Room', 'কক্ষ', 'कमरा')} {r.number}
                      </div>
                      <div className="text-xs text-stone-500 capitalize">
                        {r.type} · {r.capacity} {tr('ashram.rooms.beds', 'beds', 'শয্যা', 'बिस्तर')}
                        {r.floor ? ` · ${r.floor}` : ''}
                      </div>
                    </div>
                  </div>
                  <StatusPill status={r.status === 'maintenance' ? 'maintenance' : occupied ? 'occupied' : 'available'} />
                </div>

                {r.type === 'dormitory' && (
                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] text-stone-500 mb-1">
                      <span>{tr('ashram.rooms.todayUse', "Today's occupancy", 'আজকের দখল', 'आज की अधिभोग')}</span>
                      <span className="font-bold">{load.used}/{load.capacity}</span>
                    </div>
                    <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, (load.used / load.capacity) * 100)}%` }} />
                    </div>
                  </div>
                )}
                {occupied && r.type !== 'dormitory' && load.by[0] && (
                  <p className="text-xs text-amber-700 mt-2">🧑‍🤝‍🧑 {load.by[0]}</p>
                )}

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-100">
                  <div className="text-sm">
                    <span className="font-extrabold text-stone-800">{inr(r.suggestedDonation)}</span>
                    <span className="text-xs text-stone-500"> / {tr('ashram.rooms.night', 'night', 'রাত', 'रात')}</span>
                  </div>
                  <div className="text-xs text-stone-500 truncate max-w-[45%]">{r.facilities.slice(0, 2).join(' · ')}</div>
                </div>
                {r.notes && <p className="text-xs text-stone-500 mt-1.5 italic">{r.notes}</p>}

                <div className="flex gap-2 mt-3 no-print">
                  <Btn variant="ghost" className="flex-1 !py-2 !min-h-0 text-xs" onClick={() => startEdit(r)}>
                    {tr('ashram.common.edit', 'Edit', 'সম্পাদনা', 'संपादित')}
                  </Btn>
                  <Btn variant="ghost" className="flex-1 !py-2 !min-h-0 text-xs" onClick={() => toggleMaintenance(r)}>
                    {r.status === 'maintenance'
                      ? tr('ashram.rooms.backService', 'Back in service', 'সেবায় ফেরত', 'सेवा में वापस')
                      : tr('ashram.rooms.maintenance', 'Maintenance', 'মেরামত', 'रखरखाव')}
                  </Btn>
                  <Btn
                    variant="danger" className="!py-2 !min-h-0 text-xs !px-3"
                    onClick={() => {
                      const hasActive = state.stays.some((s) => s.roomId === r.id && s.status === 'checked-in');
                      if (hasActive) { showToast(tr('ashram.rooms.cantDel', 'Cannot delete — guests are staying in this room.', 'মুছা যাবে না।', 'हटाया नहीं जा सकता।'), 'warning'); return; }
                      if (window.confirm(tr('ashram.rooms.confirmDel', `Delete room ${r.number}?`, `কক্ষ ${r.number} মুছবেন?`, `कमरा ${r.number} हटाएं?`))) remove('rooms', r.id);
                    }}
                  >
                    {tr('ashram.common.delete', 'Delete', 'মুছুন', 'हटाएं')}
                  </Btn>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {open && (
        <Modal title={editing ? tr('ashram.rooms.editTitle', 'Edit room', 'কক্ষ সম্পাদনা', 'कमरा संपादित') : tr('ashram.rooms.addTitle', 'Register room', 'কক্ষ নথিভুক্ত', 'कमरा पंजीकृत')} onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label={tr('ashram.rooms.number', 'Room number', 'কক্ষ নম্বর', 'कमरा नंबर')}>
                <input className={inputCls} value={f.number} onChange={(e) => setF({ ...f, number: e.target.value })} placeholder="101" />
              </Field>
              <Field label={tr('ashram.rooms.type', 'Room type', 'কক্ষের ধরন', 'कमरे का प्रकार')}>
                <select className={inputCls} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as RoomType, capacity: e.target.value === 'single' ? 1 : e.target.value === 'double' ? 2 : e.target.value === 'family' ? 4 : 10 })}>
                  {ROOM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label={tr('ashram.rooms.capacity', 'Capacity (beds/persons)', 'ধারণক্ষমতা', 'क्षमता')}>
                <input type="number" min={1} className={inputCls} value={f.capacity} onChange={(e) => setF({ ...f, capacity: Number(e.target.value) })} />
              </Field>
              <Field label={tr('ashram.rooms.donation', `Suggested donation / night (${wsCurrency.symbol})`, `প্রতি রাতে প্রস্তাবিত দান (${wsCurrency.symbol})`, `प्रति रात सुझाया दान (${wsCurrency.symbol})`)}>
                <input type="number" min={0} className={inputCls} value={f.suggestedDonation} onChange={(e) => setF({ ...f, suggestedDonation: Number(e.target.value) })} />
              </Field>
              <Field label={tr('ashram.rooms.floor', 'Floor / block (optional)', 'তলা (ঐচ্ছিক)', 'मंजिल (वैकल्पिक)')}>
                <input className={inputCls} value={f.floor} onChange={(e) => setF({ ...f, floor: e.target.value })} placeholder={tr('ashram.rooms.floorPh', 'Ground', 'নিচতলা', 'भूतल')} />
              </Field>
              <Field label={tr('ashram.rooms.status', 'Status', 'অবস্থা', 'स्थिति')}>
                <select className={inputCls} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as Room['status'] })}>
                  <option value="available">{tr('ashram.rooms.available', 'Available', 'উপলব্ধ', 'उपलब्ध')}</option>
                  <option value="maintenance">{tr('ashram.rooms.maintenanceSt', 'Maintenance', 'মেরামতাধীন', 'रखरखाव')}</option>
                </select>
              </Field>
            </div>
            <Field label={tr('ashram.rooms.facilities', 'Facilities (comma-separated)', 'সুবিধা (কমা দিয়ে)', 'सुविधाएं (अल्पविराम से)')}>
              <input className={inputCls} value={f.facilities} onChange={(e) => setF({ ...f, facilities: e.target.value })} placeholder={tr('ashram.rooms.facPh', 'Attached bath, Geyser', 'সংযুক্ত স্নানঘর, গিজার', 'अटैच बाथ, गीजर')} />
            </Field>
            <Field label={tr('ashram.rooms.notes', 'Notes (optional)', 'মন্তব্য (ঐচ্ছিক)', 'टिप्पणी (वैकल्पिक)')}>
              <input className={inputCls} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
            </Field>
            <div className="flex gap-2 pt-1">
              <Btn type="submit" className="flex-1">{editing ? tr('ashram.common.save', 'Save', 'সংরক্ষণ', 'सहेजें') : tr('ashram.rooms.register', 'Register room', 'নথিভুক্ত করুন', 'पंजीकृत करें')}</Btn>
              <Btn variant="ghost" type="button" onClick={() => setOpen(false)}>{tr('ashram.common.cancel', 'Cancel', 'বাতিল', 'रद्द')}</Btn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
