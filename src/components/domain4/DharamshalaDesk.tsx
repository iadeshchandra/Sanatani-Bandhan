import React, { useState, useMemo } from 'react';
import { Building, Users, Clock, CheckCircle2, Plus, Calendar as CalendarIcon, MapPin, Tag, X, Phone } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { isValidPhoneIN, isValidDateRange, rangesOverlap, sanitizeName } from '../../utils/validation';
import { formatDateIST } from '../../utils/format';
import { EmptyState } from '../common/EmptyState';
import { DataExportButton } from '../common/DataExportButton';
import { PreviewDataBadge } from '../common/PreviewDataBadge';

type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'CLEANING';
type BookingStatus = 'Confirmed' | 'CheckedIn' | 'CheckedOut' | 'Cancelled';

interface Room {
  id: string;
  type: string;
  capacity: number;
  price: number;
  floor: string;
  status: RoomStatus;
}

interface Booking {
  id: string;
  roomId: string;
  guestName: string;
  phone: string;
  checkIn: string;
  checkOut: string;
  status: BookingStatus;
  createdAt: number;
}

const INITIAL_ROOMS: Room[] = [
  { id: '101', type: 'Standard (Non-AC)', capacity: 2, price: 500, floor: 'Ground', status: 'AVAILABLE' },
  { id: '102', type: 'Standard (Non-AC)', capacity: 2, price: 500, floor: 'Ground', status: 'OCCUPIED' },
  { id: '201', type: 'Deluxe (AC)', capacity: 4, price: 1200, floor: '1st Floor', status: 'CLEANING' },
  { id: '202', type: 'Deluxe (AC)', capacity: 4, price: 1200, floor: '1st Floor', status: 'AVAILABLE' },
  { id: '301', type: 'Dormitory', capacity: 10, price: 150, floor: '2nd Floor', status: 'AVAILABLE' },
];

const todayStr = () => new Date().toISOString().slice(0, 10);

export const DharamshalaDesk: React.FC = () => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'rooms' | 'bookings'>('rooms');

  const [rooms, setRooms] = useState<Room[]>(INITIAL_ROOMS);
  const [bookings, setBookings] = useState<Booking[]>([
    {
      id: 'bk-seed-1',
      roomId: '102',
      guestName: 'Rahul Sharma',
      phone: '9876543210',
      checkIn: todayStr(),
      checkOut: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
      status: 'CheckedIn',
      createdAt: Date.now() - 86400000,
    },
  ]);

  // Booking modal state
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bkRoomId, setBkRoomId] = useState('');
  const [bkGuest, setBkGuest] = useState('');
  const [bkPhone, setBkPhone] = useState('');
  const [bkCheckIn, setBkCheckIn] = useState(todayStr());
  const [bkCheckOut, setBkCheckOut] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10));

  const activeBookings = useMemo(
    () => bookings.filter((b) => b.status === 'Confirmed' || b.status === 'CheckedIn'),
    [bookings]
  );

  // Rooms with a live conflict for the modal's chosen dates
  const roomConflict = (roomId: string, checkIn: string, checkOut: string, excludeId?: string): Booking | null => {
    for (const b of activeBookings) {
      if (b.roomId !== roomId || b.id === excludeId) continue;
      if (rangesOverlap(checkIn, checkOut, b.checkIn, b.checkOut)) return b;
    }
    return null;
  };

  const stats = useMemo(() => {
    const total = rooms.length;
    const occupied = rooms.filter((r) => r.status === 'OCCUPIED').length;
    const cleaning = rooms.filter((r) => r.status === 'CLEANING').length;
    return { total, occupied, cleaning, available: total - occupied - cleaning };
  }, [rooms]);

  const openBookingModal = (roomId?: string) => {
    setBkRoomId(roomId || rooms.find((r) => r.status === 'AVAILABLE')?.id || '');
    setBkGuest('');
    setBkPhone('');
    setBkCheckIn(todayStr());
    setBkCheckOut(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
    setIsBookingOpen(true);
  };

  const handleSaveBooking = (e: React.FormEvent) => {
    e.preventDefault();
    const guest = sanitizeName(bkGuest);
    if (!guest) {
      showToast('Guest name is required', 'error', 'Missing Details');
      return;
    }
    if (!isValidPhoneIN(bkPhone)) {
      showToast('Please enter a valid 10-digit Indian mobile number', 'error', 'Invalid Phone');
      return;
    }
    if (!bkRoomId) {
      showToast('Please select a room', 'error', 'No Room');
      return;
    }
    if (!isValidDateRange(bkCheckIn, bkCheckOut)) {
      showToast('Check-in date must be before check-out date', 'error', 'Invalid Dates');
      return;
    }
    if (bkCheckIn < todayStr()) {
      showToast('Check-in cannot be in the past', 'error', 'Invalid Date');
      return;
    }
    const nights = Math.round(
      (new Date(bkCheckOut).getTime() - new Date(bkCheckIn).getTime()) / 86400000
    );
    if (nights > 30) {
      showToast('A single booking cannot exceed 30 nights — please split long stays', 'error', 'Stay Too Long');
      return;
    }

    // Overlap detection: same room, overlapping dates → block with details
    const conflict = roomConflict(bkRoomId, bkCheckIn, bkCheckOut);
    if (conflict) {
      showToast(
        `Room ${bkRoomId} is already booked by ${conflict.guestName} (${formatDateIST(conflict.checkIn)} → ${formatDateIST(conflict.checkOut)}). Please choose another room or dates.`,
        'error',
        'Booking Conflict'
      );
      return;
    }

    const booking: Booking = {
      id: `bk-${Date.now()}`,
      roomId: bkRoomId,
      guestName: guest,
      phone: bkPhone.replace(/\D/g, '').replace(/^(91|0)/, ''),
      checkIn: bkCheckIn,
      checkOut: bkCheckOut,
      status: bkCheckIn === todayStr() ? 'CheckedIn' : 'Confirmed',
      createdAt: Date.now(),
    };
    setBookings((prev) => [booking, ...prev]);
    if (booking.status === 'CheckedIn') {
      setRooms((prev) => prev.map((r) => (r.id === bkRoomId ? { ...r, status: 'OCCUPIED' } : r)));
    }
    setIsBookingOpen(false);
    showToast(`Room ${bkRoomId} booked for ${guest} (${nights} night${nights === 1 ? '' : 's'})`, 'success', 'Booking Confirmed');
  };

  const handleCheckout = (roomId: string) => {
    setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, status: 'CLEANING' } : r)));
    setBookings((prev) =>
      prev.map((b) =>
        b.roomId === roomId && b.status === 'CheckedIn' ? { ...b, status: 'CheckedOut' } : b
      )
    );
    showToast(`Room ${roomId} checked out — marked for cleaning`, 'info', 'Checkout Complete');
  };

  const handleMarkClean = (roomId: string) => {
    setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, status: 'AVAILABLE' } : r)));
    showToast(`Room ${roomId} is now available`, 'success', 'Housekeeping');
  };

  const handleCancelBooking = (id: string) => {
    const b = bookings.find((x) => x.id === id);
    setBookings((prev) => prev.map((x) => (x.id === id ? { ...x, status: 'Cancelled' as BookingStatus } : x)));
    if (b && b.status === 'CheckedIn') {
      setRooms((prev) => prev.map((r) => (r.id === b.roomId ? { ...r, status: 'CLEANING' as RoomStatus } : r)));
    }
    showToast('Booking cancelled', 'info');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'OCCUPIED': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CLEANING': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const currentGuestFor = (roomId: string): Booking | undefined =>
    activeBookings.find((b) => b.roomId === roomId && b.status === 'CheckedIn');

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building className="w-6 h-6 text-indigo-600" />
            {t('nav.dharamshala') || 'Yatri Niwas & Dharamshala'}
          </h1>
          <div className="mt-2"><PreviewDataBadge /></div>
          <p className="text-slate-500 text-sm mt-1">Manage pilgrim accommodations, bookings, and housekeeping.</p>
        </div>
        <button
          type="button"
          onClick={() => openBookingModal()}
          className="min-h-[44px] flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New Booking
        </button>
      </div>

      {/* Stats (computed from live state) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 font-bold text-xs uppercase">Total Rooms</span>
            <Building className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-800">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-emerald-600 font-bold text-xs uppercase">Available</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-700">{stats.available}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-600 font-bold text-xs uppercase">Occupied</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-blue-700">{stats.occupied}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-amber-600 font-bold text-xs uppercase">Needs Cleaning</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-700">{stats.cleaning}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl inline-flex">
        <button
          type="button"
          onClick={() => setActiveTab('rooms')}
          className={`min-h-[44px] px-4 py-2 rounded-lg font-bold text-sm transition-colors cursor-pointer ${activeTab === 'rooms' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Room Status
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('bookings')}
          className={`min-h-[44px] px-4 py-2 rounded-lg font-bold text-sm transition-colors cursor-pointer ${activeTab === 'bookings' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Active Bookings ({activeBookings.length})
        </button>
      </div>

      {/* Room Grid */}
      {activeTab === 'rooms' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => {
            const guest = currentGuestFor(room.id);
            return (
              <div key={room.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-slate-800">Room {room.id}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(room.status)}`}>
                      {room.status}
                    </span>
                  </div>
                  <span className="text-sm font-black text-indigo-600">₹{room.price}/night</span>
                </div>

                <div className="space-y-2 mb-4 grow">
                  <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                    <Tag className="w-4 h-4 text-slate-400" />
                    {room.type}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                    <Users className="w-4 h-4 text-slate-400" />
                    Capacity: {room.capacity} Persons
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {room.floor}
                  </div>
                </div>

                {guest && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4">
                    <p className="text-xs font-bold text-slate-500 mb-1">Current Guest</p>
                    <p className="text-sm font-bold text-slate-800">{guest.guestName}</p>
                    <p className="text-xs text-slate-500 font-mono">
                      {formatDateIST(guest.checkIn)} → {formatDateIST(guest.checkOut)}
                    </p>
                  </div>
                )}

                <div className="mt-auto flex gap-2">
                  {room.status === 'AVAILABLE' && (
                    <button
                      type="button"
                      onClick={() => openBookingModal(room.id)}
                      className="min-h-[44px] flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-2 rounded-xl text-sm transition-colors border border-indigo-200 cursor-pointer"
                    >
                      Check-in Guest
                    </button>
                  )}
                  {room.status === 'OCCUPIED' && (
                    <button
                      type="button"
                      onClick={() => handleCheckout(room.id)}
                      className="min-h-[44px] flex-1 bg-white hover:bg-slate-50 text-slate-700 font-bold py-2 rounded-xl text-sm transition-colors border border-slate-200 cursor-pointer"
                    >
                      Checkout
                    </button>
                  )}
                  {room.status === 'CLEANING' && (
                    <button
                      type="button"
                      onClick={() => handleMarkClean(room.id)}
                      className="min-h-[44px] flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-2 rounded-xl text-sm transition-colors border border-emerald-200 cursor-pointer"
                    >
                      Mark as Clean
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bookings tab */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-800">Pilgrim Bookings</h3>
            <DataExportButton
              filename={`dharamshala_bookings_${todayStr()}.csv`}
              label="Export Bookings"
              records={bookings.map((b) => ({
                bookingId: b.id,
                roomId: b.roomId,
                guestName: b.guestName,
                phone: b.phone,
                checkIn: b.checkIn,
                checkOut: b.checkOut,
                status: b.status,
              }))}
            />
          </div>
          {activeBookings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <EmptyState
                icon={CalendarIcon}
                title="No active bookings"
                description="Create the first pilgrim booking to fill the yatri niwas calendar."
                actionLabel="New Booking"
                onAction={() => openBookingModal()}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeBookings.map((b) => (
                <div key={b.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-start justify-between gap-3">
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-800">Room {b.roomId}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${b.status === 'CheckedIn' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-amber-100 text-amber-800 border-amber-200'}`}>
                        {b.status}
                      </span>
                    </div>
                    <p className="font-bold text-slate-700">{b.guestName}</p>
                    <p className="text-xs text-slate-500 font-mono flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {b.phone} · {formatDateIST(b.checkIn)} → {formatDateIST(b.checkOut)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCancelBooking(b.id)}
                    className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Booking Modal */}
      {isBookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="font-black text-slate-800">New Pilgrim Booking</h3>
              <button type="button" onClick={() => setIsBookingOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveBooking} className="space-y-3 text-sm">
              <div>
                <label className="block text-slate-600 font-bold mb-1 text-xs">Guest Name *</label>
                <input
                  type="text"
                  required
                  value={bkGuest}
                  onChange={(e) => setBkGuest(e.target.value)}
                  placeholder="e.g. Smt. Meera Devi"
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1 text-xs">Mobile *</label>
                <input
                  type="tel"
                  required
                  value={bkPhone}
                  onChange={(e) => setBkPhone(e.target.value.replace(/[^\d+\s-]/g, ''))}
                  placeholder="10-digit mobile"
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1 text-xs">Room *</label>
                <select
                  value={bkRoomId}
                  onChange={(e) => setBkRoomId(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 focus:border-indigo-500 focus:outline-none cursor-pointer"
                >
                  <option value="">Select room…</option>
                  {rooms.map((r) => {
                    const conflict = bkCheckIn && bkCheckOut ? roomConflict(r.id, bkCheckIn, bkCheckOut) : null;
                    return (
                      <option key={r.id} value={r.id} disabled={!!conflict}>
                        Room {r.id} — {r.type} (₹{r.price}/night){conflict ? ' — BOOKED for these dates' : ''}
                      </option>
                    );
                  })}
                </select>
                {bkRoomId && bkCheckIn && bkCheckOut && roomConflict(bkRoomId, bkCheckIn, bkCheckOut) && (
                  <p className="text-xs text-red-600 font-bold mt-1">
                    ⚠ This room is already booked for the selected dates.
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1 text-xs">Check-in *</label>
                  <input
                    type="date"
                    required
                    value={bkCheckIn}
                    min={todayStr()}
                    onChange={(e) => setBkCheckIn(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1 text-xs">Check-out *</label>
                  <input
                    type="date"
                    required
                    value={bkCheckOut}
                    min={bkCheckIn || todayStr()}
                    onChange={(e) => setBkCheckOut(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsBookingOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
                >
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
