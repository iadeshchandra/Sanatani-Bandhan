import React, { useState, useMemo, useEffect } from 'react';
import {
  Flame,
  Plus,
  Search,
  Calendar as CalendarIcon,
  User,
  Video,
  CheckCircle2,
  Clock,
  X,
  Scan,
  List,
  Printer,
  XCircle,
  Building2,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Sun,
  Moon,
  Users,
  Compass,
  FileText,
  BadgeCheck,
  Phone,
  RefreshCw,
} from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useData } from '../../context/DataContext';
import { PoojaBooking, PurohitProfile } from '../../types';
import { useToast } from '../../context/ToastContext';
import { usePlanGate } from '../../hooks/usePlanGate';
import { UpsellModal } from '../common/UpsellModal';
import { CameraScanner } from '../common/CameraScanner';
import { calculateDailyPanchang, PanchangData } from '../../utils/panchang';
import { generatePoojaSankalpPDF } from '../../utils/pdfGenerator';

// Default Temple Coordinates (Kashi Vishwanath / Varanasi)
const DEFAULT_TEMPLE_LAT = 25.3176;
const DEFAULT_TEMPLE_LON = 82.9739;

// Vedic Nakshatras
const VEDIC_NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashirsha', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
];

// Common Vedic Gotras
const COMMON_GOTRAS = [
  'Kashyapa', 'Bharadwaja', 'Vashistha', 'Vishwamitra', 'Gautama',
  'Jamadagni', 'Atri', 'Agastya', 'Sandilya', 'Parashara', 'Garg', 'Kaushika'
];

// Prescribed Pujas and Suggested Dakshina
const POPULAR_PUJAS = [
  { name: 'Maha Rudrabhishek', dakshina: 3100, desc: 'Lord Shiva ritual with sacred bilva patra, panchamrit & Vedic chanting.' },
  { name: 'Satyanarayan Vrat Katha', dakshina: 2100, desc: 'Lord Vishnu Puja for family peace, harmony, and prosperity.' },
  { name: 'Maha Ganapati Homa', dakshina: 5100, desc: 'Remover of all obstacles and harbinger of auspicious beginnings.' },
  { name: 'Navagraha Shanti Homa', dakshina: 7500, desc: 'Pacification of nine celestial grahas to eliminate planetary afflictions.' },
  { name: 'Durga Saptashati Chandi Path', dakshina: 11000, desc: 'Powerful Shakti recitation for protection, health, and victory.' },
  { name: 'Sundarkand Path', dakshina: 2500, desc: 'Devotional recitation invoking Lord Hanuman for courage and relief.' },
  { name: 'Pitru Tarpana & Shradh Vidhi', dakshina: 3500, desc: 'Ancestral peace ritual performed on sacred banks or temple grounds.' },
  { name: 'Gau Seva Maha Yajna', dakshina: 5000, desc: 'Sacred cow adoration and Vedic havan for boundless spiritual merit.' },
  { name: 'Maha Mrityunjaya Japa & Homa', dakshina: 9100, desc: 'Longevity, health rejuvenation, and liberation from untimely distress.' },
];

// Recommended Time Slots
const STANDARD_TIME_SLOTS = [
  '06:30 AM - 08:30 AM',
  '08:30 AM - 10:30 AM',
  '10:30 AM - 12:30 PM',
  '12:30 PM - 02:30 PM',
  '03:00 PM - 05:00 PM',
  '05:30 PM - 07:30 PM',
  '07:30 PM - 09:30 PM',
];

/**
 * Astrological Overlap Helper:
 * Parses standard 12-hour time strings or intervals into minutes from midnight,
 * and detects if two time intervals intersect.
 */
export const parseTimeToMinutes = (t: string): number | null => {
  if (!t) return null;
  const match = t.trim().match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const modifier = match[3] ? match[3].toLowerCase() : null;
  if (modifier === 'pm' && h < 12) h += 12;
  if (modifier === 'am' && h === 12) h = 0;
  return h * 60 + m;
};

export const parseRangeToMinutes = (rangeStr: string): [number, number] | null => {
  if (!rangeStr) return null;
  const parts = rangeStr.split(/\s*[-–—]|to\s*/i);
  if (parts.length < 2) {
    const single = parseTimeToMinutes(rangeStr);
    if (single !== null) return [single, single + 60];
    return null;
  }
  const s = parseTimeToMinutes(parts[0]);
  const e = parseTimeToMinutes(parts[1]);
  if (s === null || e === null) return null;
  return [s, e];
};

export const checkRahuKaalOverlap = (timeSlotStr: string, rahuKaalStr: string): boolean => {
  const slot = parseRangeToMinutes(timeSlotStr);
  const rahu = parseRangeToMinutes(rahuKaalStr);
  if (!slot || !rahu) return false;
  return Math.max(slot[0], rahu[0]) < Math.min(slot[1], rahu[1]);
};

export const PoojaBookingDesk: React.FC = () => {
  const { activeWorkspace, role, currentRole, currentDevotee, user } = useAuthWorkspace();
  const { puja_bookings, purohits, devotees, addPoojaBooking, updatePoojaStatus } = useData();
  const { checkGate, showUpsell, upsellModule, closeUpsell } = usePlanGate();
  const { showToast } = useToast();

  // Determine user role
  const effectiveRole = (role || currentRole || 'Devotee') as string;
  const isDevotee = effectiveRole.toLowerCase() === 'devotee';
  const isPriestOrAdmin =
    effectiveRole.toLowerCase().includes('priest') ||
    effectiveRole.toLowerCase().includes('purohit') ||
    effectiveRole.toLowerCase().includes('trustee') ||
    effectiveRole.toLowerCase().includes('admin');

  // Top View Toggle: If user is Devotee, default to devotee view; admins/priests can toggle between Master Roster and Booking Form
  const [activeTab, setActiveTab] = useState<'roster' | 'book' | 'history'>(() => {
    return isDevotee ? 'book' : 'roster';
  });

  // Master Roster Controls
  const [rosterDate, setRosterDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [groupBy, setGroupBy] = useState<'priest' | 'time' | 'none'>('priest');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Cancellation Modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancellingId, setCancellingId] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');

  // Devotee Booking Form state
  const [poojaName, setPoojaName] = useState<string>('Maha Rudrabhishek');
  const [bookingDate, setBookingDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [timeSlot, setTimeSlot] = useState<string>('08:30 AM - 10:30 AM');
  const [customTimeInput, setCustomTimeInput] = useState<string>('');
  const [isCustomSlot, setIsCustomSlot] = useState<boolean>(false);
  const [devoteeName, setDevoteeName] = useState<string>(() => currentDevotee?.fullName || user?.displayName || '');
  const [phone, setPhone] = useState<string>(() => currentDevotee?.phone || '');
  const [gotra, setGotra] = useState<string>(() => currentDevotee?.gotra || 'Kashyapa');
  const [nakshatra, setNakshatra] = useState<string>('Rohini');
  const [sankalpDescription, setSankalpDescription] = useState<string>(
    'Family health, peace, prosperity, and removal of obstacles.'
  );
  const [priestAssigned, setPriestAssigned] = useState<string>(() => {
    return purohits?.[0]?.fullName || purohits?.[0]?.name || 'Acharya Vidyadhar Shastri';
  });
  const [dakshinaAmount, setDakshinaAmount] = useState<number>(3100);
  const [bookingType, setBookingType] = useState<'Individual' | 'Organization'>('Individual');
  const [organizationName, setOrganizationName] = useState<string>('');
  const [liveStreamRequested, setLiveStreamRequested] = useState<boolean>(false);
  const [liveStreamUrl, setLiveStreamUrl] = useState<string>('');

  // Sync priest default if list loads
  useEffect(() => {
    if (purohits && purohits.length > 0 && !priestAssigned) {
      setPriestAssigned(purohits[0].fullName || purohits[0].name || '');
    }
  }, [purohits, priestAssigned]);

  // Update dakshina suggestion when puja changes
  const handlePujaChange = (name: string) => {
    setPoojaName(name);
    const found = POPULAR_PUJAS.find((p) => p.name === name);
    if (found) {
      setDakshinaAmount(found.dakshina);
    }
  };

  // Active time slot used for calculations
  const effectiveTimeSlot = isCustomSlot ? customTimeInput : timeSlot;

  // Astrological Panchang Calculation for the selected date
  const parsedSelectedDate = useMemo(() => {
    if (!bookingDate) return new Date();
    const [y, m, d] = bookingDate.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  }, [bookingDate]);

  const dailyPanchang: PanchangData = useMemo(() => {
    return calculateDailyPanchang(parsedSelectedDate, DEFAULT_TEMPLE_LAT, DEFAULT_TEMPLE_LON);
  }, [parsedSelectedDate]);

  // Detect Rahu Kaal Overlap
  const isRahuKaalClash = useMemo(() => {
    if (!effectiveTimeSlot || !dailyPanchang?.rahuKaal) return false;
    return checkRahuKaalOverlap(effectiveTimeSlot, dailyPanchang.rahuKaal);
  }, [effectiveTimeSlot, dailyPanchang]);

  // Handle Sankalp Slip PDF Generation
  const handlePrintSankalp = async (booking: PoojaBooking) => {
    try {
      await generatePoojaSankalpPDF(booking, activeWorkspace);
      showToast(`Sankalp Slip generated for ${booking.devoteeName}`, 'success');
    } catch (err) {
      console.error('Error generating Sankalp PDF:', err);
      showToast('Failed to generate Sankalp slip. Please try again.', 'error');
    }
  };

  // Handle QR Check-in scan
  const handleScan = async (data: string): Promise<boolean> => {
    try {
      const parsed = JSON.parse(data);
      const bookingId = parsed.bookingId;
      if (bookingId) {
        const booking = puja_bookings.find((p) => p.id === bookingId);
        if (booking) {
          showToast(`Devotee ${booking.devoteeName} checked in for ${booking.poojaName}`, 'success');
          updatePoojaStatus(booking.id, 'In-Progress');
          return true;
        } else {
          showToast('Invalid Digital Puja Pass. Booking not found.', 'error');
          return false;
        }
      }
      showToast('Invalid QR Code format.', 'error');
      return false;
    } catch {
      showToast('Error reading Digital Puja Pass.', 'error');
      return false;
    }
  };

  // Handle Booking Form Submission
  const handleSubmitBooking = (e: React.FormEvent) => {
    e.preventDefault();

    if (!devoteeName.trim()) {
      showToast('Please enter Devotee Name', 'warning');
      return;
    }

    if (!effectiveTimeSlot.trim()) {
      showToast('Please select or specify a Time Slot', 'warning');
      return;
    }

    if (!checkGate('events', puja_bookings.length)) {
      return;
    }

    const newBookingData = {
      workspaceId: activeWorkspace.id,
      devoteeId: currentDevotee?.id || undefined,
      devoteeName: devoteeName.trim(),
      phone: phone.trim() || undefined,
      poojaName,
      tithiDate: bookingDate,
      bookingDate,
      timeSlot: effectiveTimeSlot.trim(),
      gotra: gotra.trim(),
      nakshatra: nakshatra.trim() || undefined,
      sankalpDescription: sankalpDescription.trim(),
      sankalpText: sankalpDescription.trim(),
      priestAssigned: priestAssigned.trim() || undefined,
      purohitAssigned: priestAssigned.trim() || undefined,
      dakshinaAmount: Number(dakshinaAmount) || 0,
      liveStreamRequested,
      liveStreamUrl: liveStreamUrl.trim() || undefined,
      bookingType,
      organizationName: bookingType === 'Organization' ? organizationName.trim() : undefined,
    };

    const success = addPoojaBooking(newBookingData);
    if (success) {
      showToast(`Pooja "${poojaName}" booked successfully for ${devoteeName}!`, 'success');
      // If devotee, switch to history; if priest, switch to roster
      if (isDevotee) {
        setActiveTab('history');
      } else {
        setActiveTab('roster');
      }
    }
  };

  // Handle Cancellation Confirmation
  const confirmCancel = () => {
    if (!cancellationReason.trim()) {
      showToast('Please provide a reason for cancellation', 'warning');
      return;
    }
    updatePoojaStatus(cancellingId, 'Cancelled', { cancellationReason });
    showToast('Booking cancelled.', 'info');
    setCancelModalOpen(false);
  };

  // Filter Bookings for Master Roster
  const filteredRosterBookings = useMemo(() => {
    return puja_bookings.filter((b) => {
      // Date matching (bookingDate or tithiDate)
      const bDate = b.bookingDate || b.tithiDate || '';
      const matchesDate = !rosterDate || bDate === rosterDate;

      // Status matching
      const matchesStatus =
        statusFilter === 'all' ||
        (b.status && b.status.toLowerCase() === statusFilter.toLowerCase());

      // Search query matching
      const matchesSearch =
        !searchTerm.trim() ||
        b.poojaName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.devoteeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.gotra?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.priestAssigned?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.id?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesDate && matchesStatus && matchesSearch;
    });
  }, [puja_bookings, rosterDate, statusFilter, searchTerm]);

  // Devotee Personal History Bookings
  const personalBookings = useMemo(() => {
    const curDevoteeId = currentDevotee?.id;
    const curDevoteeName = currentDevotee?.fullName?.toLowerCase();
    const curUserName = user?.displayName?.toLowerCase();

    return puja_bookings.filter((b) => {
      if (curDevoteeId && b.devoteeId === curDevoteeId) return true;
      if (curDevoteeName && b.devoteeName?.toLowerCase() === curDevoteeName) return true;
      if (curUserName && b.devoteeName?.toLowerCase() === curUserName) return true;
      // If user is Devotee but no strict match, show their recent submissions
      return isDevotee;
    });
  }, [puja_bookings, currentDevotee, user, isDevotee]);

  // Groupings for Master Roster
  const groupedByPriest = useMemo(() => {
    const map = new Map<string, PoojaBooking[]>();
    filteredRosterBookings.forEach((b) => {
      const priest = b.priestAssigned || b.purohitAssigned || 'Unassigned / Temple Pool';
      if (!map.has(priest)) {
        map.set(priest, []);
      }
      map.get(priest)!.push(b);
    });
    return Array.from(map.entries());
  }, [filteredRosterBookings]);

  const groupedByTime = useMemo(() => {
    const map = new Map<string, PoojaBooking[]>();
    filteredRosterBookings.forEach((b) => {
      const slot = b.timeSlot || 'Anytime / General';
      if (!map.has(slot)) {
        map.set(slot, []);
      }
      map.get(slot)!.push(b);
    });
    // Sort timeslots chronologically
    return Array.from(map.entries()).sort((a, b) => {
      const minA = parseTimeToMinutes(a[0].split('-')[0]) ?? 9999;
      const minB = parseTimeToMinutes(b[0].split('-')[0]) ?? 9999;
      return minA - minB;
    });
  }, [filteredRosterBookings]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner & Mode Switcher */}
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-950 via-temple-950 to-saffron-950 border border-amber-500/40 p-6 sm:p-8 rounded-3xl shadow-2xl">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-saffron-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-saffron-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                Vedic Sankalp & Ritual Command
              </span>
              <span className="text-xs text-amber-200/80 font-mono bg-temple-950/80 px-2.5 py-0.5 rounded-lg border border-amber-500/20">
                RBAC: {effectiveRole}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-saffron-300">
              Sanatani Bandhan Puja & Acharya Desk
            </h1>

            <p className="text-xs sm:text-sm text-amber-200/70 max-w-2xl leading-relaxed">
              Intelligent ritual scheduling synchronized with real-time Vedic Panjika, Rahu Kaal collision defense, consecrated Sankalp slips, and sanctum master rosters.
            </p>
          </div>

          {/* Role Navigation Pills */}
          <div className="flex flex-wrap items-center gap-2 bg-temple-950/90 p-1.5 rounded-2xl border border-amber-500/30 shadow-inner self-start md:self-auto">
            {isPriestOrAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab('roster')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'roster'
                    ? 'bg-gradient-to-r from-amber-500 to-saffron-500 text-temple-950 shadow-md font-extrabold'
                    : 'text-amber-200/80 hover:text-amber-100 hover:bg-temple-900'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Priest Master Roster</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('book')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'book'
                  ? 'bg-gradient-to-r from-amber-500 to-saffron-500 text-temple-950 shadow-md font-extrabold'
                  : 'text-amber-200/80 hover:text-amber-100 hover:bg-temple-900'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Book Sacred Puja</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-gradient-to-r from-amber-500 to-saffron-500 text-temple-950 shadow-md font-extrabold'
                  : 'text-amber-200/80 hover:text-amber-100 hover:bg-temple-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>{isDevotee ? 'My Bookings' : 'Personal Records'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. PRIEST / ADMIN MASTER ROSTER VIEW                                     */}
      {/* ========================================================================= */}
      {activeTab === 'roster' && (
        <div className="space-y-6">
          {/* Controls Bar: Date Picker, Quick Today/Tomorrow, Grouping, Filter */}
          <div className="bg-gradient-to-b from-temple-900/90 to-temple-950 border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-temple-800">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-amber-400" />
                  <span className="text-xs font-black text-amber-200 uppercase tracking-wider">
                    Roster Date:
                  </span>
                </div>
                <input
                  type="date"
                  value={rosterDate}
                  onChange={(e) => setRosterDate(e.target.value)}
                  className="bg-temple-950 border border-amber-500/40 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-amber-100 focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={() => setRosterDate(new Date().toISOString().slice(0, 10))}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold cursor-pointer"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const tom = new Date();
                    tom.setDate(tom.getDate() + 1);
                    setRosterDate(tom.toISOString().slice(0, 10));
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-temple-900 hover:bg-temple-800 text-amber-200 border border-temple-700 text-xs font-medium cursor-pointer"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => setRosterDate('')}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium cursor-pointer ${
                    !rosterDate
                      ? 'bg-amber-500 text-temple-950 border-amber-400 font-bold'
                      : 'bg-temple-900 text-temple-400 border-temple-700 hover:text-amber-200'
                  }`}
                >
                  All Dates
                </button>
              </div>

              {/* Action Buttons: Scan Pass & New Booking */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="px-3 py-2 rounded-xl bg-temple-900 hover:bg-temple-800 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Scan className="w-4 h-4 text-amber-400" />
                  <span>Scan Digital Pass</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('book')}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-saffron-500 hover:from-amber-400 hover:to-saffron-400 text-temple-950 font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Schedule Puja</span>
                </button>
              </div>
            </div>

            {/* Filter Row: Search, Group By, Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="relative flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 text-temple-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by devotee, puja, gotra, or priest..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-temple-950 border border-temple-800 rounded-xl pl-9 pr-3 py-2 text-xs text-amber-100 placeholder-temple-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Group By Selector */}
                <div className="flex items-center gap-1 bg-temple-950 p-1 rounded-xl border border-temple-800">
                  <span className="text-[10px] text-temple-400 font-bold uppercase px-2">Group:</span>
                  <button
                    type="button"
                    onClick={() => setGroupBy('priest')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      groupBy === 'priest' ? 'bg-amber-500 text-temple-950' : 'text-temple-400 hover:text-amber-200'
                    }`}
                  >
                    By Priest
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroupBy('time')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      groupBy === 'time' ? 'bg-amber-500 text-temple-950' : 'text-temple-400 hover:text-amber-200'
                    }`}
                  >
                    By Time Slot
                  </button>
                  <button
                    type="button"
                    onClick={() => setGroupBy('none')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      groupBy === 'none' ? 'bg-amber-500 text-temple-950' : 'text-temple-400 hover:text-amber-200'
                    }`}
                  >
                    Flat Grid
                  </button>
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-temple-950 border border-temple-800 rounded-xl px-3 py-1.5 text-xs text-amber-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Completed">Completed</option>
                  <option value="In-Progress">In-Progress</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Roster Listing */}
          {filteredRosterBookings.length === 0 ? (
            <div className="bg-temple-900/60 border border-temple-800/80 rounded-3xl p-12 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Flame className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-amber-200">No Ritual Bookings Scheduled</h3>
              <p className="text-xs text-temple-400 max-w-md mx-auto">
                No bookings match your selected date ({rosterDate || 'All'}) and filter criteria. You can schedule a new sacred ritual above.
              </p>
            </div>
          ) : groupBy === 'priest' ? (
            /* Grouped by Priest */
            <div className="space-y-6">
              {groupedByPriest.map(([priestNameGroup, bookings]) => {
                const matchedPurohit = purohits.find(
                  (p) => (p.fullName || p.name) === priestNameGroup
                );

                return (
                  <div
                    key={priestNameGroup}
                    className="bg-temple-900/90 border border-amber-500/30 rounded-3xl p-6 shadow-xl space-y-4"
                  >
                    {/* Priest Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-temple-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-saffron-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 font-bold text-base shadow-sm">
                          <User className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-base text-amber-200">
                              {priestNameGroup}
                            </h3>
                            {matchedPurohit?.vidwatTitle && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                                {matchedPurohit.vidwatTitle}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-temple-400">
                            {matchedPurohit?.vedicBranch ? `${matchedPurohit.vedicBranch} Branch • ` : ''}
                            {bookings.length} Ritual{bookings.length > 1 ? 's' : ''} Allocated
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-temple-400">Total Dakshina:</span>
                        <span className="font-mono font-bold text-amber-300">
                          ₹{bookings.reduce((acc, cur) => acc + (cur.dakshinaAmount || 0), 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Bookings under this Priest */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {bookings.map((booking) => (
                        <RosterBookingCard
                          key={booking.id}
                          booking={booking}
                          onPrintSankalp={() => handlePrintSankalp(booking)}
                          onUpdateStatus={(status) => updatePoojaStatus(booking.id, status)}
                          onCancel={() => {
                            setCancellingId(booking.id);
                            setCancellationReason('');
                            setCancelModalOpen(true);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : groupBy === 'time' ? (
            /* Grouped by Time Slot */
            <div className="space-y-6">
              {groupedByTime.map(([slotGroup, bookings]) => (
                <div
                  key={slotGroup}
                  className="bg-temple-900/90 border border-amber-500/30 rounded-3xl p-6 shadow-xl space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-temple-800">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-black text-base text-amber-200 font-mono">
                          {slotGroup}
                        </h3>
                        <p className="text-xs text-temple-400">
                          {bookings.length} Ritual{bookings.length > 1 ? 's' : ''} in this window
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bookings.map((booking) => (
                      <RosterBookingCard
                        key={booking.id}
                        booking={booking}
                        onPrintSankalp={() => handlePrintSankalp(booking)}
                        onUpdateStatus={(status) => updatePoojaStatus(booking.id, status)}
                        onCancel={() => {
                          setCancellingId(booking.id);
                          setCancellationReason('');
                          setCancelModalOpen(true);
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Flat Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRosterBookings.map((booking) => (
                <RosterBookingCard
                  key={booking.id}
                  booking={booking}
                  onPrintSankalp={() => handlePrintSankalp(booking)}
                  onUpdateStatus={(status) => updatePoojaStatus(booking.id, status)}
                  onCancel={() => {
                    setCancellingId(booking.id);
                    setCancellationReason('');
                    setCancelModalOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. DEVOTEE / INITIATION BOOKING FORM (WITH ASTROLOGICAL DEFENSE)         */}
      {/* ========================================================================= */}
      {activeTab === 'book' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Booking Form (8 Columns) */}
          <div className="lg:col-span-8 bg-gradient-to-b from-temple-900/90 to-temple-950 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="pb-4 border-b border-temple-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                  Devotee Ritual Initiation
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-amber-100">
                  Book Sacred Puja / Sankalp
                </h2>
                <p className="text-xs text-temple-400 mt-0.5">
                  Configure ritual parameters, gotra, nakshatra, and sanctum offering with automatic Vedic ephemeris alignment.
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Sparkles className="w-6 h-6 text-amber-400" />
              </div>
            </div>

            <form onSubmit={handleSubmitBooking} className="space-y-5 text-xs">
              {/* Puja Type */}
              <div>
                <label className="block text-amber-300 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                  Sacred Ritual / Puja Type *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {POPULAR_PUJAS.map((p) => {
                    const isSelected = poojaName === p.name;
                    return (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => handlePujaChange(p.name)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-gradient-to-br from-amber-500/20 to-saffron-500/20 border-amber-400 shadow-md ring-1 ring-amber-400'
                            : 'bg-temple-950/70 border-temple-800 hover:border-amber-500/40 text-temple-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className={`font-bold text-xs ${isSelected ? 'text-amber-200' : 'text-temple-200'}`}>
                            {p.name}
                          </span>
                          <span className="font-mono font-bold text-amber-400 text-[11px]">
                            ₹{p.dakshina.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-[10px] text-temple-400 line-clamp-2 leading-relaxed">
                          {p.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date & Time Slot Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-temple-800">
                <div>
                  <label className="block text-amber-300 font-bold uppercase tracking-wider text-[11px] mb-1.5 flex items-center justify-between">
                    <span>Ritual Date *</span>
                    <span className="text-[10px] font-mono text-temple-400">
                      {dailyPanchang.vaara}
                    </span>
                  </label>
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full bg-temple-950 border border-amber-500/40 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-amber-100 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-amber-300 font-bold uppercase tracking-wider text-[11px]">
                      Time Slot *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomSlot(!isCustomSlot)}
                      className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                    >
                      {isCustomSlot ? 'Pick Standard Slot' : 'Custom Time Slot'}
                    </button>
                  </div>

                  {!isCustomSlot ? (
                    <select
                      value={timeSlot}
                      onChange={(e) => setTimeSlot(e.target.value)}
                      className="w-full bg-temple-950 border border-amber-500/40 rounded-xl px-3.5 py-2.5 text-xs text-amber-100 focus:outline-none focus:border-amber-400 cursor-pointer font-mono"
                    >
                      {STANDARD_TIME_SLOTS.map((slot) => {
                        const clash = checkRahuKaalOverlap(slot, dailyPanchang?.rahuKaal || '');
                        return (
                          <option key={slot} value={slot}>
                            {slot} {clash ? '(⚠️ Rahu Kaal overlap)' : '(Shubh)'}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="e.g. 09:00 AM - 11:00 AM"
                      value={customTimeInput}
                      onChange={(e) => setCustomTimeInput(e.target.value)}
                      className="w-full bg-temple-950 border border-amber-500/40 rounded-xl px-3.5 py-2.5 text-xs font-mono text-amber-100 focus:outline-none focus:border-amber-400"
                    />
                  )}
                </div>
              </div>

              {/* PROMINENT RAHU KAAL WARNING BANNER */}
              {isRahuKaalClash && (
                <div className="p-4 rounded-2xl bg-rose-950/80 border-2 border-rose-500 text-rose-200 shadow-xl flex items-start gap-3.5 animate-pulse">
                  <div className="p-2 rounded-xl bg-rose-600 text-white shrink-0 shadow-md">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-black text-sm text-rose-100 tracking-wide uppercase">
                      ⚠️ Astrological Warning: Selected Time Overlaps with Rahu Kaal!
                    </h4>
                    <p className="text-xs text-rose-200/90 leading-relaxed">
                      Rahu Kaal for {dailyPanchang.gregorianDate} is calculated as <strong className="font-mono text-white underline">{dailyPanchang.rahuKaal}</strong>. Vedic scriptures strictly advise against initiating auspicious rituals, yajnas, or sankalpas during this period.
                    </p>
                    <p className="text-[11px] text-rose-300 font-semibold pt-1">
                      Recommended Auspicious Alternative: <span className="font-mono text-amber-300 underline font-bold">Abhijit Muhurat ({dailyPanchang.abhijitMuhurat})</span> or an early morning pratahkaal slot.
                    </p>
                  </div>
                </div>
              )}

              {/* Devotee Info: Individual vs Organization, Name, Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-temple-800">
                <div>
                  <label className="block text-amber-300 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                    Devotee / Yajamana Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={devoteeName}
                    onChange={(e) => setDevoteeName(e.target.value)}
                    placeholder="e.g. Pt. Raghunath Sharma"
                    className="w-full bg-temple-950 border border-amber-500/40 rounded-xl px-3.5 py-2.5 text-xs text-amber-100 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-amber-300 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                    Contact Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-temple-950 border border-amber-500/40 rounded-xl px-3.5 py-2.5 text-xs font-mono text-amber-100 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Gotra & Nakshatra */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-amber-300 font-bold uppercase tracking-wider text-[11px] mb-1.5 flex items-center justify-between">
                    <span>Vedic Gotra *</span>
                    <span className="text-[10px] text-temple-400">Yajamana lineage</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={gotra}
                      onChange={(e) => setGotra(e.target.value)}
                      placeholder="e.g. Kashyapa, Bharadwaja"
                      className="w-full bg-temple-950 border border-amber-500/40 rounded-xl px-3.5 py-2.5 text-xs text-amber-100 focus:outline-none focus:border-amber-400"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {COMMON_GOTRAS.slice(0, 6).map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setGotra(g)}
                          className="px-2 py-0.5 rounded-md bg-temple-950 text-[10px] text-amber-300/80 border border-temple-800 hover:border-amber-500/50 cursor-pointer"
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-amber-300 font-bold uppercase tracking-wider text-[11px] mb-1.5 flex items-center justify-between">
                    <span>Janma Nakshatra</span>
                    <span className="text-[10px] text-amber-400 font-mono">Today: {dailyPanchang.nakshatra}</span>
                  </label>
                  <select
                    value={nakshatra}
                    onChange={(e) => setNakshatra(e.target.value)}
                    className="w-full bg-temple-950 border border-amber-500/40 rounded-xl px-3.5 py-2.5 text-xs text-amber-100 focus:outline-none focus:border-amber-400 cursor-pointer font-mono"
                  >
                    {VEDIC_NAKSHATRAS.map((nak) => (
                      <option key={nak} value={nak}>
                        {nak}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sankalp Description */}
              <div>
                <label className="block text-amber-300 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                  Sacred Sankalp Description & Divine Intention *
                </label>
                <textarea
                  required
                  rows={3}
                  value={sankalpDescription}
                  onChange={(e) => setSankalpDescription(e.target.value)}
                  placeholder="State the family purpose, health recovery, child protection, or spiritual upliftment to be voiced by the Purohit in the sanctum..."
                  className="w-full bg-temple-950 border border-amber-500/40 rounded-xl px-3.5 py-2.5 text-xs text-amber-100 focus:outline-none focus:border-amber-400 leading-relaxed"
                />
              </div>

              {/* Priest Assignment & Dakshina Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-temple-800">
                <div>
                  <label className="block text-amber-300 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                    Lead Purohit / Acharya
                  </label>
                  <select
                    value={priestAssigned}
                    onChange={(e) => setPriestAssigned(e.target.value)}
                    className="w-full bg-temple-950 border border-amber-500/40 rounded-xl px-3.5 py-2.5 text-xs text-amber-100 focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    {purohits && purohits.length > 0 ? (
                      purohits.map((p) => {
                        const pName = p.fullName || p.name || 'Acharya';
                        return (
                          <option key={p.id} value={pName}>
                            {pName} {p.vidwatTitle ? `(${p.vidwatTitle})` : ''}
                          </option>
                        );
                      })
                    ) : (
                      <>
                        <option value="Acharya Vidyadhar Shastri">Acharya Vidyadhar Shastri (Rigveda)</option>
                        <option value="Pandit Ramkrishna Dikshit">Pandit Ramkrishna Dikshit (Yajurveda)</option>
                        <option value="Pt. Gangadhar Bhatt">Pt. Gangadhar Bhatt (Smartha)</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-amber-300 font-bold uppercase tracking-wider text-[11px] mb-1.5">
                    Dakshina / Ritual Offering (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min={101}
                    value={dakshinaAmount}
                    onChange={(e) => setDakshinaAmount(Number(e.target.value))}
                    className="w-full bg-temple-950 border border-amber-500/40 rounded-xl px-3.5 py-2.5 text-xs font-mono font-black text-amber-300 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Optional Live Stream Field */}
              <div className="p-3.5 rounded-2xl bg-temple-950/60 border border-temple-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-200 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-amber-400" />
                    Online Darshan / Sanctum Live Stream
                  </span>
                  <input
                    type="checkbox"
                    checked={liveStreamRequested}
                    onChange={(e) => setLiveStreamRequested(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 bg-temple-900 border-temple-700 cursor-pointer"
                  />
                </div>
                {liveStreamRequested && (
                  <input
                    type="url"
                    value={liveStreamUrl}
                    onChange={(e) => setLiveStreamUrl(e.target.value)}
                    placeholder="https://temple.stream/darshan-live..."
                    className="w-full bg-temple-950 border border-amber-500/40 rounded-xl px-3 py-2 text-xs font-mono text-amber-100 focus:outline-none focus:border-amber-400"
                  />
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-temple-800 flex items-center justify-between gap-4">
                <div className="text-[11px] text-temple-400">
                  Total Dakshina: <span className="font-mono font-black text-amber-300 text-sm">₹{Number(dakshinaAmount || 0).toLocaleString()}</span>
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-saffron-500 hover:from-amber-400 hover:to-saffron-400 text-temple-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer transition-all"
                >
                  <Flame className="w-4 h-4" />
                  <span>Confirm & Register Sacred Booking</span>
                </button>
              </div>
            </form>
          </div>

          {/* Astrological Validation & Panchang Preview Sidebar (4 Columns) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Live Panchang Card for the Date */}
            <div className="bg-gradient-to-b from-temple-900 to-temple-950 border border-amber-500/30 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-temple-800">
                <div className="flex items-center gap-2">
                  <Compass className="w-5 h-5 text-amber-400 animate-spin-slow" />
                  <h3 className="font-black text-sm text-amber-200 uppercase tracking-wider">
                    Vedic Ephemeris
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-temple-400">
                  {dailyPanchang.gregorianDate.split(',')[0]}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-2xl bg-temple-950/80 border border-temple-800 flex items-center justify-between">
                  <span className="text-temple-400 font-bold">Tithi:</span>
                  <span className="font-bold text-amber-200">{dailyPanchang.tithi}</span>
                </div>

                <div className="p-3 rounded-2xl bg-temple-950/80 border border-temple-800 flex items-center justify-between">
                  <span className="text-temple-400 font-bold">Nakshatra:</span>
                  <span className="font-bold text-amber-200">{dailyPanchang.nakshatra}</span>
                </div>

                <div className="p-3 rounded-2xl bg-temple-950/80 border border-temple-800 flex items-center justify-between">
                  <span className="text-temple-400 font-bold">Surya Udaya / Astha:</span>
                  <span className="font-mono text-amber-200">{dailyPanchang.sunrise} - {dailyPanchang.sunset}</span>
                </div>

                {/* Rahu Kaal Highlight Card */}
                <div className={`p-3.5 rounded-2xl border transition-all ${
                  isRahuKaalClash
                    ? 'bg-rose-950/90 border-rose-500 ring-2 ring-rose-500/50'
                    : 'bg-temple-950/80 border-rose-500/40'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase text-rose-400 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      Rahu Kaal (Avoid)
                    </span>
                    <span className="text-[10px] font-mono text-rose-300">
                      8-Part Daylight Segment
                    </span>
                  </div>
                  <p className="text-base font-black font-mono text-rose-200">
                    {dailyPanchang.rahuKaal}
                  </p>
                  <p className="text-[10px] text-rose-300/80 mt-1">
                    Inauspicious for initiating yajnas or vow commitments.
                  </p>
                </div>

                {/* Abhijit Muhurat Highlight Card */}
                <div className="p-3.5 rounded-2xl bg-temple-950/80 border border-emerald-500/40">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Abhijit Muhurat (Highest Merit)
                    </span>
                  </div>
                  <p className="text-base font-black font-mono text-emerald-300">
                    {dailyPanchang.abhijitMuhurat}
                  </p>
                  <p className="text-[10px] text-emerald-300/80 mt-1">
                    Universal dosha nullifier; ideal for midday sankalpas.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Sanctuary Notice */}
            <div className="bg-temple-900/60 border border-temple-800 rounded-3xl p-5 text-xs text-temple-400 space-y-2">
              <h4 className="font-bold text-amber-200 flex items-center gap-1.5">
                <BadgeCheck className="w-4 h-4 text-amber-400" />
                Sanctum Consecration Protocol
              </h4>
              <p className="leading-relaxed">
                Upon submitting, a unique Sankalp cryptographic ID is generated. The designated Purohit receives this in their Master Daily Roster to print the sacred slip for sanctum recitation.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DEVOTEE PERSONAL BOOKING HISTORY VIEW                                 */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-b from-temple-900/90 to-temple-950 border border-amber-500/30 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                Personal Sanctuary Ledger
              </span>
              <h2 className="text-xl font-black text-amber-100">
                {isDevotee ? 'My Sacred Ritual Bookings' : 'Devotee Bookings Registry'}
              </h2>
              <p className="text-xs text-temple-400">
                Review your active and completed pujas, download physical Sankalp slips, and access livestream darshan.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('book')}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-saffron-500 text-temple-950 font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Book Another Ritual</span>
            </button>
          </div>

          {personalBookings.length === 0 ? (
            <div className="bg-temple-900/60 border border-temple-800/80 rounded-3xl p-12 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <FileText className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-amber-200">No Personal Bookings Recorded</h3>
              <p className="text-xs text-temple-400 max-w-md mx-auto">
                You haven't initiated any pujas or sankalpas yet. Click above to schedule your first sacred ritual.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {personalBookings.map((b) => (
                <div
                  key={b.id}
                  className="bg-temple-900/90 border border-amber-500/30 rounded-3xl p-5 shadow-xl flex flex-col justify-between space-y-4 hover:border-amber-400 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2 pb-3 border-b border-temple-800">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                          <Flame className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-black text-sm text-amber-200">{b.poojaName}</h4>
                          <p className="text-xs text-temple-400">{b.devoteeName} ({b.gotra})</p>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          b.status === 'Completed'
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-800/50'
                            : b.status === 'Confirmed'
                            ? 'bg-blue-950 text-blue-400 border-blue-800/50'
                            : b.status === 'In-Progress'
                            ? 'bg-amber-950 text-amber-400 border-amber-800/50 animate-pulse'
                            : 'bg-temple-800 text-temple-400 border-temple-700'
                        }`}
                      >
                        {b.status || 'Pending'}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-temple-300">
                      <div className="flex items-center justify-between">
                        <span className="text-temple-400">Date & Slot:</span>
                        <span className="font-mono text-amber-200 font-bold">{b.bookingDate} • {b.timeSlot}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-temple-400">Purohit:</span>
                        <span className="text-temple-200">{b.priestAssigned || 'Sansthan Acharya'}</span>
                      </div>
                      {b.nakshatra && (
                        <div className="flex items-center justify-between">
                          <span className="text-temple-400">Nakshatra:</span>
                          <span className="text-temple-200">{b.nakshatra}</span>
                        </div>
                      )}
                      {b.sankalpText && (
                        <div className="pt-2 border-t border-temple-800 text-[11px] text-amber-200/80 italic line-clamp-2">
                          "{b.sankalpText}"
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-temple-800 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-temple-400 font-mono">₹{b.dakshinaAmount || 0}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handlePrintSankalp(b)}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Sankalp Slip</span>
                      </button>
                      {b.liveStreamUrl && (
                        <a
                          href={b.liveStreamUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center gap-1"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Watch</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cancellation Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-temple-950/80 backdrop-blur-md">
          <div className="bg-temple-900 border border-rose-500/40 rounded-3xl max-w-md w-full p-6 text-temple-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-temple-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <h3 className="font-black text-sm text-rose-200 uppercase tracking-wider">
                  Cancel Ritual Booking
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="text-temple-400 hover:text-temple-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-temple-300 leading-relaxed">
              Please enter the reason for cancellation. The devotee and priest will be updated accordingly.
            </p>

            <textarea
              required
              rows={3}
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="e.g. Yajamana unavailable / rescheduled / unfavorable tithi..."
              className="w-full bg-temple-950 border border-temple-700 rounded-xl px-3 py-2 text-xs text-temple-200 focus:outline-none focus:border-rose-400"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-temple-800 text-temple-300 font-bold text-xs cursor-pointer"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={confirmCancel}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs cursor-pointer"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner */}
      {isScannerOpen && (
        <CameraScanner onScan={handleScan} onClose={() => setIsScannerOpen(false)} />
      )}

      {/* Upsell Gate Modal */}
      <UpsellModal
        isOpen={showUpsell}
        onClose={closeUpsell}
        onUpgrade={() => {
          window.location.href = '/?action=signup';
        }}
        module={upsellModule}
      />
    </div>
  );
};

/**
 * Subcomponent: Roster Booking Card for Priests & Admins
 */
const RosterBookingCard: React.FC<{
  booking: PoojaBooking;
  onPrintSankalp: () => void;
  onUpdateStatus: (status: 'Confirmed' | 'Completed' | 'In-Progress') => void;
  onCancel: () => void;
}> = ({ booking, onPrintSankalp, onUpdateStatus, onCancel }) => {
  return (
    <div className="bg-temple-950/80 border border-temple-800 hover:border-amber-500/50 rounded-2xl p-4 shadow-lg flex flex-col justify-between space-y-3 transition-colors">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-temple-800/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Flame className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h4 className="font-black text-sm text-amber-100 truncate">
                {booking.poojaName}
              </h4>
              <p className="text-xs text-amber-300 font-semibold truncate">
                {booking.devoteeName}
              </p>
            </div>
          </div>

          <span
            className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
              booking.status === 'Completed'
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                : booking.status === 'Confirmed'
                ? 'bg-blue-950 text-blue-400 border border-blue-800/50'
                : booking.status === 'In-Progress'
                ? 'bg-amber-950 text-amber-400 border border-amber-800/50 animate-pulse'
                : booking.status === 'Cancelled'
                ? 'bg-rose-950 text-rose-400 border border-rose-800/50'
                : 'bg-temple-800 text-temple-400 border border-temple-700'
            }`}
          >
            {booking.status || 'Pending'}
          </span>
        </div>

        {/* Details */}
        <div className="py-2 space-y-1.5 text-xs text-temple-300">
          <div className="flex items-center justify-between">
            <span className="text-temple-400">Gotra & Nakshatra:</span>
            <span className="font-semibold text-amber-200">
              {booking.gotra} {booking.nakshatra ? `(${booking.nakshatra})` : ''}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-temple-400">Date & Slot:</span>
            <span className="font-mono text-amber-200 font-bold">
              {booking.bookingDate} | {booking.timeSlot}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-temple-400">Acharya:</span>
            <span className="text-temple-200">
              {booking.priestAssigned || booking.purohitAssigned || 'Sansthan Pool'}
            </span>
          </div>

          {booking.sankalpText && (
            <div className="pt-2 border-t border-temple-800/80">
              <span className="text-[10px] text-amber-400 uppercase font-black tracking-wider block">
                Sankalp Purpose:
              </span>
              <p className="text-[11px] text-amber-200/80 italic line-clamp-2">
                "{booking.sankalpText}"
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-temple-800 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] font-mono font-bold text-amber-400">
          ₹{(booking.dakshinaAmount || 0).toLocaleString()}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Print Sankalp Slip Button for Sanctum */}
          <button
            type="button"
            onClick={onPrintSankalp}
            title="Generate & print physical Sankalp Slip for the Sanctum Sanctorum"
            className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-black flex items-center gap-1 shadow-sm cursor-pointer transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Sankalp Slip</span>
          </button>

          {/* Status Progression */}
          {booking.status !== 'Completed' && booking.status !== 'Cancelled' && (
            <>
              {booking.status !== 'Confirmed' && (
                <button
                  type="button"
                  onClick={() => onUpdateStatus('Confirmed')}
                  className="px-2 py-1.5 rounded-xl bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-800 text-[10px] font-bold cursor-pointer"
                >
                  Confirm
                </button>
              )}
              <button
                type="button"
                onClick={() => onUpdateStatus('Completed')}
                className="px-2 py-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Done</span>
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="p-1.5 rounded-xl bg-temple-900 hover:bg-rose-950 text-temple-400 hover:text-rose-400 border border-temple-800 cursor-pointer"
                title="Cancel Booking"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
