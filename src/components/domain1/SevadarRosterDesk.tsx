import React, { useState, useMemo } from 'react';
import {
  UserCheck,
  Users,
  ShieldCheck,
  Clock,
  Printer,
  Plus,
  Search,
  Filter,
  Sparkles,
  MapPin,
  Flame,
  Shield,
  HeartHandshake,
  Radio,
  Utensils,
  CheckCircle2,
  AlertCircle,
  Phone,
  Heart,
  X,
  ChevronDown,
  Calendar,
  Award,
  IdCard,
  QrCode,
  Check,
  Sun,
  Moon,
  RefreshCw,
} from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useQuickGuide } from '../../context/QuickGuideContext';
import { useToast } from '../../context/ToastContext';

// ----------------------------------------------------------------------------
// DATA TYPES
// ----------------------------------------------------------------------------

export type KycStatus = 'VERIFIED' | 'PENDING';

export interface Sevadar {
  id: string;
  name: string;
  phone: string;
  emergencyContact: string;
  bloodGroup: string;
  kycStatus: KycStatus;
  assignedSector: string;
  shiftTime: string;
  idProofType: string;
  idProofNumber: string;
  badgeNumber: string;
  gotra?: string;
  joinedDate: string;
  verifiedAt?: string;
  verifiedBy?: string;
  nishkamSevaPledge: boolean;
}

export interface YatraSectorConfig {
  id: string;
  name: string;
  code: string;
  description: string;
  capacity: number;
  icon: React.ElementType;
  badgeColor: string;
}

// ----------------------------------------------------------------------------
// YATRANET SECTORS & SHIFT CONFIGURATION
// ----------------------------------------------------------------------------

export const YATRANET_SECTORS: YatraSectorConfig[] = [
  {
    id: 'Garbhagriha',
    name: 'Garbhagriha (Sanctum Queue)',
    code: 'SEC-GARBHA',
    description: 'Inner sanctum queue line cadence, silent darshan regulation & elder devotee assistance',
    capacity: 6,
    icon: Flame,
    badgeColor: 'border-amber-500/40 text-amber-400 bg-amber-500/10',
  },
  {
    id: 'Joota Ghar',
    name: 'Joota Ghar (Footwear Storage)',
    code: 'SEC-JOOTA',
    description: 'Footwear token ticketing, orderly racks & swift retrieval at entry/exit portals',
    capacity: 4,
    icon: Shield,
    badgeColor: 'border-blue-500/40 text-blue-400 bg-blue-500/10',
  },
  {
    id: 'Prasadam',
    name: 'Prasadam Distribution',
    code: 'SEC-PRASAD',
    description: 'Mahaprasad packet distribution, queue order & Anna-dana counter seva',
    capacity: 5,
    icon: HeartHandshake,
    badgeColor: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
  },
  {
    id: 'YatraNet Gate 1',
    name: 'YatraNet Main Gate & Screening',
    code: 'SEC-YATRA',
    description: 'Perimeter entry screening, metal detector monitoring & pilgrim welcome desk',
    capacity: 4,
    icon: Radio,
    badgeColor: 'border-purple-500/40 text-purple-400 bg-purple-500/10',
  },
  {
    id: 'Annakshetra',
    name: 'Annakshetra Dining Hall',
    code: 'SEC-ANNA',
    description: 'Community dining hall meal seating, clean water supply & elder care',
    capacity: 5,
    icon: Utensils,
    badgeColor: 'border-rose-500/40 text-rose-400 bg-rose-500/10',
  },
];

export const SHIFT_OPTIONS = [
  { id: 'Morning (05:00 - 12:00)', label: 'Morning Shift (05:00 - 12:00)', icon: Sun },
  { id: 'Afternoon (12:00 - 18:00)', label: 'Afternoon Shift (12:00 - 18:00)', icon: Clock },
  { id: 'Evening (18:00 - 22:00)', label: 'Evening Shift (18:00 - 22:00)', icon: Moon },
];

export const BLOOD_GROUPS = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'];

// ----------------------------------------------------------------------------
// INITIAL MOCK SEVADAR ROSTER
// ----------------------------------------------------------------------------

const INITIAL_SEVADARS: Sevadar[] = [
  {
    id: 'sev-001',
    name: 'Raghav Sharma',
    phone: '+91 98765 43210',
    emergencyContact: '+91 98111 22334',
    bloodGroup: 'O+',
    kycStatus: 'VERIFIED',
    assignedSector: 'Garbhagriha',
    shiftTime: 'Morning (05:00 - 12:00)',
    idProofType: 'Aadhaar Card',
    idProofNumber: 'XXXX-XXXX-8921',
    badgeNumber: 'SEVA-2026-001',
    gotra: 'Kashyapa',
    joinedDate: '2026-08-15',
    verifiedAt: '2026-09-10',
    verifiedBy: 'Trustee Board',
    nishkamSevaPledge: true,
  },
  {
    id: 'sev-002',
    name: 'Sunita Das',
    phone: '+91 98222 34567',
    emergencyContact: '+91 98222 99887',
    bloodGroup: 'B+',
    kycStatus: 'VERIFIED',
    assignedSector: 'Joota Ghar',
    shiftTime: 'Morning (05:00 - 12:00)',
    idProofType: 'Voter ID',
    idProofNumber: 'WBL-8871234',
    badgeNumber: 'SEVA-2026-002',
    gotra: 'Bharadwaja',
    joinedDate: '2026-08-20',
    verifiedAt: '2026-09-12',
    verifiedBy: 'Ops Manager',
    nishkamSevaPledge: true,
  },
  {
    id: 'sev-003',
    name: 'Amitabh Joshi',
    phone: '+91 98444 56789',
    emergencyContact: '+91 98333 44556',
    bloodGroup: 'A+',
    kycStatus: 'PENDING',
    assignedSector: 'Prasadam',
    shiftTime: 'Afternoon (12:00 - 18:00)',
    idProofType: 'Aadhaar Card',
    idProofNumber: 'XXXX-XXXX-5512',
    badgeNumber: 'SEVA-2026-003',
    gotra: 'Vashistha',
    joinedDate: '2026-09-22',
    nishkamSevaPledge: true,
  },
  {
    id: 'sev-004',
    name: 'Kavita Rao',
    phone: '+91 98666 78901',
    emergencyContact: '+91 98777 88990',
    bloodGroup: 'AB+',
    kycStatus: 'VERIFIED',
    assignedSector: 'Prasadam',
    shiftTime: 'Evening (18:00 - 22:00)',
    idProofType: 'Passport',
    idProofNumber: 'Z8819201',
    badgeNumber: 'SEVA-2026-004',
    gotra: 'Sandilya',
    joinedDate: '2026-08-28',
    verifiedAt: '2026-09-15',
    verifiedBy: 'Trustee Board',
    nishkamSevaPledge: true,
  },
  {
    id: 'sev-005',
    name: 'Manoj Tiwary',
    phone: '+91 98999 12345',
    emergencyContact: '+91 98888 23456',
    bloodGroup: 'O-',
    kycStatus: 'PENDING',
    assignedSector: 'Joota Ghar',
    shiftTime: 'Evening (18:00 - 22:00)',
    idProofType: 'Aadhaar Card',
    idProofNumber: 'XXXX-XXXX-3341',
    badgeNumber: 'SEVA-2026-005',
    gotra: 'Gautama',
    joinedDate: '2026-09-24',
    nishkamSevaPledge: true,
  },
  {
    id: 'sev-006',
    name: 'Pooja Varma',
    phone: '+91 97111 34567',
    emergencyContact: '+91 97222 45678',
    bloodGroup: 'A-',
    kycStatus: 'VERIFIED',
    assignedSector: 'Garbhagriha',
    shiftTime: 'Afternoon (12:00 - 18:00)',
    idProofType: 'Aadhaar Card',
    idProofNumber: 'XXXX-XXXX-1988',
    badgeNumber: 'SEVA-2026-006',
    gotra: 'Garg',
    joinedDate: '2026-09-01',
    verifiedAt: '2026-09-18',
    verifiedBy: 'Ops Manager',
    nishkamSevaPledge: true,
  },
];

// ----------------------------------------------------------------------------
// COMPONENT: SEVADAR ROSTER DESK (DOMAIN 1)
// ----------------------------------------------------------------------------

export const SevadarRosterDesk: React.FC = () => {
  const { currentRole, activeWorkspace, currentUser } = useAuthWorkspace();
  const { openGuide } = useQuickGuide();
  const { showToast } = useToast();

  // State
  const [sevadars, setSevadars] = useState<Sevadar[]>(INITIAL_SEVADARS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VERIFIED' | 'PENDING'>('ALL');
  const [sectorFilter, setSectorFilter] = useState<string>('ALL');

  // Parichay Patra modal & print state
  const [selectedSevadarForId, setSelectedSevadarForId] = useState<Sevadar | null>(null);
  const [isIdModalOpen, setIsIdModalOpen] = useState(false);

  // Re-assignment modal state
  const [reassigningSevadar, setReassigningSevadar] = useState<Sevadar | null>(null);
  const [newSector, setNewSector] = useState('');
  const [newShift, setNewShift] = useState('');

  // Active panel tab for smaller viewports
  const [activePanelTab, setActivePanelTab] = useState<'directory' | 'roster' | 'register'>('directory');

  // New Sevadar Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    emergencyContact: '',
    bloodGroup: 'O+',
    gotra: '',
    idProofType: 'Aadhaar Card',
    idProofNumber: '',
    assignedSector: 'Joota Ghar',
    shiftTime: 'Morning (05:00 - 12:00)',
    initialStatus: 'PENDING' as KycStatus,
    nishkamSevaPledge: true,
  });

  // --------------------------------------------------------------------------
  // STATS CALCULATIONS
  // --------------------------------------------------------------------------
  const stats = useMemo(() => {
    const total = sevadars.length;
    const verified = sevadars.filter((s) => s.kycStatus === 'VERIFIED').length;
    const pending = sevadars.filter((s) => s.kycStatus === 'PENDING').length;
    const onDuty = sevadars.filter((s) => s.kycStatus === 'VERIFIED').length;
    return { total, verified, pending, onDuty };
  }, [sevadars]);

  // --------------------------------------------------------------------------
  // FILTERED SEVADARS
  // --------------------------------------------------------------------------
  const filteredSevadars = useMemo(() => {
    return sevadars.filter((s) => {
      const matchSearch =
        searchQuery.trim() === '' ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.phone.includes(searchQuery) ||
        s.badgeNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.assignedSector.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus =
        statusFilter === 'ALL' || s.kycStatus === statusFilter;

      const matchSector =
        sectorFilter === 'ALL' || s.assignedSector === sectorFilter;

      return matchSearch && matchStatus && matchSector;
    });
  }, [sevadars, searchQuery, statusFilter, sectorFilter]);

  // --------------------------------------------------------------------------
  // ACTIONS: APPROVE KYC
  // --------------------------------------------------------------------------
  const handleApproveKyc = (sevadarId: string) => {
    const target = sevadars.find((s) => s.id === sevadarId);
    if (!target) return;

    const verifier =
      currentUser?.fullName ||
      (currentRole ? `${currentRole} Official` : 'Trustee Board');

    setSevadars((prev) =>
      prev.map((s) =>
        s.id === sevadarId
          ? {
              ...s,
              kycStatus: 'VERIFIED',
              verifiedAt: new Date().toISOString().split('T')[0],
              verifiedBy: verifier,
            }
          : s
      )
    );

    showToast(
      `KYC Verified for ${target.name}! Eligible for official Parichay Patra and sector shift.`,
      'success',
      'Nishkam Seva KYC Approved'
    );
  };

  // --------------------------------------------------------------------------
  // ACTIONS: GENERATE PARICHAY PATRA (ID)
  // --------------------------------------------------------------------------
  const handleGenerateParichayPatra = (sevadar: Sevadar) => {
    setSelectedSevadarForId(sevadar);
    setIsIdModalOpen(true);
    // Instant print trigger per requirements
    setTimeout(() => {
      window.print();
    }, 300);
  };

  // --------------------------------------------------------------------------
  // ACTIONS: REASSIGN SHIFT / SECTOR
  // --------------------------------------------------------------------------
  const openReassignModal = (sevadar: Sevadar) => {
    setReassigningSevadar(sevadar);
    setNewSector(sevadar.assignedSector);
    setNewShift(sevadar.shiftTime);
  };

  const handleSaveReassignment = () => {
    if (!reassigningSevadar) return;

    setSevadars((prev) =>
      prev.map((s) =>
        s.id === reassigningSevadar.id
          ? { ...s, assignedSector: newSector, shiftTime: newShift }
          : s
      )
    );

    showToast(
      `${reassigningSevadar.name} reassigned to ${newSector} (${newShift})`,
      'success',
      'Shift Roster Updated'
    );
    setReassigningSevadar(null);
  };

  // --------------------------------------------------------------------------
  // ACTIONS: NEW REGISTRATION SUBMISSION
  // --------------------------------------------------------------------------
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.phone.trim()) {
      showToast('Please provide both full name and phone number.', 'error', 'Validation Error');
      return;
    }

    if (!formData.emergencyContact.trim()) {
      showToast('Emergency contact phone is strongly advised for temple safety protocol.', 'warning', 'Safety Required');
    }

    const nextIndex = sevadars.length + 1;
    const badgeNum = `SEVA-2026-${String(nextIndex).padStart(3, '0')}`;
    const newId = `sev-${Date.now()}`;

    const newSevadar: Sevadar = {
      id: newId,
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      emergencyContact: formData.emergencyContact.trim() || '+91 99999 00000',
      bloodGroup: formData.bloodGroup,
      kycStatus: formData.initialStatus,
      assignedSector: formData.assignedSector,
      shiftTime: formData.shiftTime,
      idProofType: formData.idProofType,
      idProofNumber: formData.idProofNumber.trim() || 'VERIFIED-DOC',
      badgeNumber: badgeNum,
      gotra: formData.gotra.trim() || 'Kashyapa',
      joinedDate: new Date().toISOString().split('T')[0],
      verifiedAt:
        formData.initialStatus === 'VERIFIED'
          ? new Date().toISOString().split('T')[0]
          : undefined,
      verifiedBy:
        formData.initialStatus === 'VERIFIED'
          ? currentUser?.fullName || 'Trustee Board'
          : undefined,
      nishkamSevaPledge: formData.nishkamSevaPledge,
    };

    setSevadars((prev) => [newSevadar, ...prev]);

    showToast(
      `${newSevadar.name} successfully enqueued into Sevadar Directory! ${
        newSevadar.kycStatus === 'VERIFIED'
          ? 'Parichay Patra ready to print.'
          : 'Pending KYC background review.'
      }`,
      'success',
      'Registration Complete'
    );

    // Reset form
    setFormData({
      name: '',
      phone: '',
      emergencyContact: '',
      bloodGroup: 'O+',
      gotra: '',
      idProofType: 'Aadhaar Card',
      idProofNumber: '',
      assignedSector: 'Joota Ghar',
      shiftTime: 'Morning (05:00 - 12:00)',
      initialStatus: 'PENDING',
      nishkamSevaPledge: true,
    });

    // Switch view to directory to view new addition
    setActivePanelTab('directory');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-stone-100 p-3 sm:p-6 space-y-6">
      {/* =====================================================================
          HEADER SECTION (Temple-Stone Slate-950 & Saffron Amber-500)
      ===================================================================== */}
      <header className="rounded-3xl bg-slate-900/90 border border-amber-500/20 p-5 sm:p-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
        {/* Subtle Decorative Background Mandala Accent */}
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black tracking-wider uppercase bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Domain 1 • Operations & HR Desk
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-stone-800 text-stone-300 font-mono border border-stone-700">
                {activeWorkspace?.name || 'Sanatani Mandir Samsthan'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <UserCheck className="w-8 h-8 text-amber-500" />
              <span>Sevadar HR Desk & Nishkam Seva Roster</span>
            </h1>

            <p className="text-sm text-stone-300 max-w-3xl leading-relaxed">
              Autonomous volunteer vetting, KYC background check clearance, YatraNet pilgrimage sector deployments
              (Joota Ghar, Garbhagriha, Prasadam), and official <span className="text-amber-400 font-semibold">Parichay Patra</span> credential issuance.
            </p>
          </div>

          {/* Action Header Button: [💡 Quick Guide / SOP] */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => openGuide('SEVADAR_ROSTER')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all transform hover:-translate-y-0.5 cursor-pointer min-h-[44px]"
              title="Open Role-Based SOP & Shastric Terminology for Sevadar Roster"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>[💡 Quick Guide / SOP]</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePanelTab('register')}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 hover:text-white font-bold text-sm transition-all min-h-[44px]"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Register Sevadar</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Stat Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-stone-800/80">
          <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-stone-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Total Volunteers</p>
              <p className="text-xl font-black text-white">{stats.total}</p>
            </div>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-stone-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">KYC Verified</p>
              <p className="text-xl font-black text-emerald-400">{stats.verified}</p>
            </div>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-stone-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Pending KYC</p>
              <p className="text-xl font-black text-amber-400">{stats.pending}</p>
            </div>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-stone-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
              <Radio className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">YatraNet Sectors</p>
              <p className="text-xl font-black text-blue-400">{YATRANET_SECTORS.length}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Responsive View Switcher for Tablet / Mobile */}
      <div className="flex lg:hidden bg-slate-900 p-1.5 rounded-2xl border border-stone-800">
        <button
          type="button"
          onClick={() => setActivePanelTab('directory')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
            activePanelTab === 'directory'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'text-stone-400 hover:text-white'
          }`}
        >
          Directory & KYC ({stats.total})
        </button>
        <button
          type="button"
          onClick={() => setActivePanelTab('roster')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
            activePanelTab === 'roster'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'text-stone-400 hover:text-white'
          }`}
        >
          Duty Roster
        </button>
        <button
          type="button"
          onClick={() => setActivePanelTab('register')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
            activePanelTab === 'register'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'text-stone-400 hover:text-white'
          }`}
        >
          New Sevadar
        </button>
      </div>

      {/* =====================================================================
          MAIN 3-PANEL LAYOUT ARCHITECTURE
      ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* -------------------------------------------------------------------
            PANEL 1: VOLUNTEER DIRECTORY & KYC (Cols: 5 on lg)
        ------------------------------------------------------------------- */}
        <section
          className={`lg:col-span-5 flex flex-col space-y-4 rounded-3xl bg-slate-900/80 border border-stone-800 p-5 shadow-xl ${
            activePanelTab === 'directory' ? 'block' : 'hidden lg:flex'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                <span>Panel 1: Volunteer Directory & KYC</span>
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Vetting status, emergency contacts, and Parichay Patra issuance
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-stone-800 text-amber-400 border border-stone-700">
              {filteredSevadars.length} / {stats.total}
            </span>
          </div>

          {/* Search & Filter Bar */}
          <div className="space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, phone, or badge..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-stone-700/80 rounded-2xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Status Pill Filters */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all min-h-[36px] ${
                  statusFilter === 'ALL'
                    ? 'bg-amber-500 text-slate-950 font-black shadow'
                    : 'bg-stone-800/80 text-stone-400 hover:text-white'
                }`}
              >
                All ({stats.total})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('VERIFIED')}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all min-h-[36px] flex items-center gap-1 ${
                  statusFilter === 'VERIFIED'
                    ? 'bg-emerald-500 text-slate-950 font-black shadow'
                    : 'bg-stone-800/80 text-emerald-400 hover:bg-stone-800'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified ({stats.verified})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('PENDING')}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all min-h-[36px] flex items-center gap-1 ${
                  statusFilter === 'PENDING'
                    ? 'bg-amber-500 text-slate-950 font-black shadow'
                    : 'bg-stone-800/80 text-amber-400 hover:bg-stone-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Pending KYC ({stats.pending})</span>
              </button>
            </div>
          </div>

          {/* Sevadar List Cards */}
          <div className="space-y-3 overflow-y-auto max-h-[640px] pr-1 custom-scrollbar">
            {filteredSevadars.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-2xl bg-slate-950/60 border border-stone-800 space-y-2">
                <AlertCircle className="w-8 h-8 text-stone-500 mx-auto" />
                <p className="text-xs text-stone-300 font-bold">No Sevadars Found</p>
                <p className="text-[11px] text-stone-500">
                  Try adjusting your search criteria or register a new volunteer.
                </p>
              </div>
            ) : (
              filteredSevadars.map((sevadar) => {
                const isVerified = sevadar.kycStatus === 'VERIFIED';

                return (
                  <div
                    key={sevadar.id}
                    className="p-4 rounded-2xl bg-slate-950/70 border border-stone-800 hover:border-amber-500/40 transition-all space-y-3 group"
                  >
                    {/* Top Row: Avatar, Name, Status Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm border shadow-sm ${
                            isVerified
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-stone-800 text-stone-400 border-stone-700'
                          }`}
                        >
                          {sevadar.name
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-black text-white group-hover:text-amber-400 transition-colors">
                              {sevadar.name}
                            </h3>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-800 text-stone-400">
                              {sevadar.badgeNumber}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-stone-400 mt-0.5">
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3 text-stone-500" />
                              {sevadar.phone}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                              {sevadar.bloodGroup}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border ${
                          isVerified
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                            : 'bg-amber-500/15 border-amber-500/30 text-amber-400 animate-pulse'
                        }`}
                      >
                        {isVerified ? (
                          <>
                            <ShieldCheck className="w-3 h-3" />
                            VERIFIED
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" />
                            PENDING KYC
                          </>
                        )}
                      </span>
                    </div>

                    {/* Duty Shift & Sector Chips */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-900 border border-stone-800 text-stone-300">
                        <MapPin className="w-3 h-3 text-amber-400" />
                        <strong className="text-white">{sevadar.assignedSector}</strong>
                      </span>

                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-900 border border-stone-800 text-stone-300">
                        <Clock className="w-3 h-3 text-blue-400" />
                        <span>{sevadar.shiftTime}</span>
                      </span>

                      <span className="text-[10px] text-stone-500 font-mono">
                        ICE: <strong className="text-stone-300">{sevadar.emergencyContact}</strong>
                      </span>
                    </div>

                    {/* Operational Action Row */}
                    <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between gap-2">
                      <div className="text-[10px] text-stone-400">
                        {isVerified ? (
                          <span>Vetted: {sevadar.verifiedAt} ({sevadar.verifiedBy || 'Trustee'})</span>
                        ) : (
                          <span className="text-amber-400/90 font-medium">Docs pending inspection</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* If status is PENDING: Show "Approve KYC" button */}
                        {!isVerified && (
                          <button
                            type="button"
                            onClick={() => handleApproveKyc(sevadar.id)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer min-h-[44px]"
                            title="Approve KYC background check and enlist for Nishkam Seva"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve KYC</span>
                          </button>
                        )}

                        {/* If status is VERIFIED: Show "Generate Parichay Patra (ID)" button that triggers window.print() */}
                        {isVerified && (
                          <button
                            type="button"
                            onClick={() => handleGenerateParichayPatra(sevadar)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 hover:shadow-amber-500/30 transition-all cursor-pointer min-h-[44px]"
                            title="Generate official laminated Parichay Patra ID and trigger window.print()"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-950" />
                            <span>Generate Parichay Patra (ID)</span>
                          </button>
                        )}

                        {/* Quick Reassign shift button */}
                        <button
                          type="button"
                          onClick={() => openReassignModal(sevadar)}
                          className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-400 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                          title="Reassign duty sector or shift timing"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* -------------------------------------------------------------------
            PANEL 2: DUTY ROSTER (Cols: 4 on lg)
        ------------------------------------------------------------------- */}
        <section
          className={`lg:col-span-4 flex flex-col space-y-4 rounded-3xl bg-slate-900/80 border border-stone-800 p-5 shadow-xl ${
            activePanelTab === 'roster' ? 'block' : 'hidden lg:flex'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Radio className="w-5 h-5 text-amber-500" />
                <span>Panel 2: Duty Roster</span>
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Active shifts deployed across YatraNet sectors
              </p>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
              Live Mesh
            </span>
          </div>

          {/* Sector Overview List */}
          <div className="space-y-4 overflow-y-auto max-h-[640px] pr-1 custom-scrollbar">
            {YATRANET_SECTORS.map((sector) => {
              const SectorIcon = sector.icon;
              const sectorSevadars = sevadars.filter(
                (s) => s.assignedSector === sector.id && s.kycStatus === 'VERIFIED'
              );
              const pendingInSector = sevadars.filter(
                (s) => s.assignedSector === sector.id && s.kycStatus === 'PENDING'
              );

              const morningCount = sectorSevadars.filter((s) => s.shiftTime.includes('Morning')).length;
              const afternoonCount = sectorSevadars.filter((s) => s.shiftTime.includes('Afternoon')).length;
              const eveningCount = sectorSevadars.filter((s) => s.shiftTime.includes('Evening')).length;

              const percentFilled = Math.min(
                100,
                Math.round((sectorSevadars.length / sector.capacity) * 100)
              );

              return (
                <div
                  key={sector.id}
                  className="p-4 rounded-2xl bg-slate-950/70 border border-stone-800 hover:border-stone-700 transition-all space-y-3"
                >
                  {/* Sector Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-center">
                        <SectorIcon className="w-4 h-4 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-white">{sector.name}</h3>
                        <span className="text-[10px] font-mono text-stone-500">{sector.code}</span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        sectorSevadars.length >= 2
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      }`}
                    >
                      {sectorSevadars.length}/{sector.capacity} Active
                    </span>
                  </div>

                  <p className="text-[11px] text-stone-400 leading-tight">
                    {sector.description}
                  </p>

                  {/* Capacity Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-stone-400">
                      <span>Staffing Level</span>
                      <span className="font-mono text-white font-bold">{percentFilled}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
                        style={{ width: `${percentFilled}%` }}
                      />
                    </div>
                  </div>

                  {/* Shift Time Distribution Pills */}
                  <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                    <div className="p-1.5 rounded-lg bg-stone-900 border border-stone-800">
                      <span className="text-stone-400 block text-[9px]">Morning</span>
                      <strong className="text-white text-xs">{morningCount}</strong>
                    </div>
                    <div className="p-1.5 rounded-lg bg-stone-900 border border-stone-800">
                      <span className="text-stone-400 block text-[9px]">Afternoon</span>
                      <strong className="text-white text-xs">{afternoonCount}</strong>
                    </div>
                    <div className="p-1.5 rounded-lg bg-stone-900 border border-stone-800">
                      <span className="text-stone-400 block text-[9px]">Evening</span>
                      <strong className="text-white text-xs">{eveningCount}</strong>
                    </div>
                  </div>

                  {/* Sevadars on duty in this sector */}
                  {sectorSevadars.length > 0 && (
                    <div className="pt-2 border-t border-stone-800/80 space-y-1.5">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                        Assigned Sevadars:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {sectorSevadars.map((s) => (
                          <span
                            key={s.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-900 border border-stone-700 text-stone-300 text-[11px]"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span>{s.name}</span>
                            <span className="text-[9px] text-stone-500">
                              ({s.shiftTime.split(' ')[0]})
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {pendingInSector.length > 0 && (
                    <div className="text-[10px] text-amber-400 bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>{pendingInSector.length} volunteer pending KYC clearance for this sector</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* -------------------------------------------------------------------
            PANEL 3: NEW REGISTRATION (Cols: 3 on lg)
        ------------------------------------------------------------------- */}
        <section
          className={`lg:col-span-3 flex flex-col space-y-4 rounded-3xl bg-slate-900/80 border border-stone-800 p-5 shadow-xl ${
            activePanelTab === 'register' ? 'block' : 'hidden lg:flex'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-500" />
                <span>Panel 3: New Registration</span>
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Register candidate for Nishkam Seva
              </p>
            </div>
          </div>

          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-stone-300 mb-1">
                Volunteer Full Name <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Ramesh Chandra"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-stone-700 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-stone-300 mb-1">
                Primary Phone (WhatsApp) <span className="text-amber-400">*</span>
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 00000"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-stone-700 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            {/* Emergency Contact */}
            <div>
              <label className="block text-xs font-bold text-stone-300 mb-1">
                Emergency Contact (ICE) <span className="text-amber-400">*</span>
              </label>
              <input
                type="tel"
                required
                value={formData.emergencyContact}
                onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                placeholder="+91 98111 22334"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-stone-700 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            {/* Blood Group & Gotra */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  Blood Group
                </label>
                <select
                  value={formData.bloodGroup}
                  onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-stone-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  Gotra (Lineage)
                </label>
                <input
                  type="text"
                  value={formData.gotra}
                  onChange={(e) => setFormData({ ...formData, gotra: e.target.value })}
                  placeholder="e.g. Kashyapa"
                  className="w-full px-3 py-2 bg-slate-950 border border-stone-700 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Identity Proof Document */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  KYC ID Proof
                </label>
                <select
                  value={formData.idProofType}
                  onChange={(e) => setFormData({ ...formData, idProofType: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-stone-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="Aadhaar Card">Aadhaar Card</option>
                  <option value="Voter ID">Voter ID</option>
                  <option value="Passport">Passport</option>
                  <option value="Driving License">Driving License</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  Doc Last 4 Digits
                </label>
                <input
                  type="text"
                  value={formData.idProofNumber}
                  onChange={(e) => setFormData({ ...formData, idProofNumber: e.target.value })}
                  placeholder="e.g. 8921"
                  className="w-full px-3 py-2 bg-slate-950 border border-stone-700 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            {/* Assigned Sector */}
            <div>
              <label className="block text-xs font-bold text-stone-300 mb-1">
                Assigned YatraNet Sector <span className="text-amber-400">*</span>
              </label>
              <select
                value={formData.assignedSector}
                onChange={(e) => setFormData({ ...formData, assignedSector: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-stone-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {YATRANET_SECTORS.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Shift Timing */}
            <div>
              <label className="block text-xs font-bold text-stone-300 mb-1">
                Duty Shift Time <span className="text-amber-400">*</span>
              </label>
              <select
                value={formData.shiftTime}
                onChange={(e) => setFormData({ ...formData, shiftTime: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-stone-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {SHIFT_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Initial KYC Verification Choice */}
            <div>
              <label className="block text-xs font-bold text-stone-300 mb-1">
                Initial KYC Clearance
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, initialStatus: 'PENDING' })}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                    formData.initialStatus === 'PENDING'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-slate-950 border-stone-800 text-stone-400 hover:text-white'
                  }`}
                >
                  Pending Audit
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, initialStatus: 'VERIFIED' })}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                    formData.initialStatus === 'VERIFIED'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950 border-stone-800 text-stone-400 hover:text-white'
                  }`}
                >
                  Pre-Verified
                </button>
              </div>
            </div>

            {/* Nishkam Seva Pledge Checkbox */}
            <div className="p-3 rounded-xl bg-slate-950 border border-stone-800 space-y-1.5">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.nishkamSevaPledge}
                  onChange={(e) =>
                    setFormData({ ...formData, nishkamSevaPledge: e.target.checked })
                  }
                  className="mt-0.5 rounded border-stone-700 text-amber-500 focus:ring-amber-500 w-4 h-4 bg-stone-900 cursor-pointer"
                />
                <span className="text-[11px] text-stone-300 leading-snug">
                  I confirm candidate's solemn dedication to{' '}
                  <strong className="text-amber-400">Nishkam Seva</strong> (selfless service)
                  and adherence to temple Shastric decorum.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm tracking-wide shadow-lg shadow-amber-500/20 transition-all cursor-pointer min-h-[44px] flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>Enlist Sevadar</span>
            </button>
          </form>
        </section>
      </div>

      {/* =====================================================================
          MODAL: OFFICIAL PARICHAY PATRA (PRINTABLE CREDENTIAL CARD)
      ===================================================================== */}
      {isIdModalOpen && selectedSevadarForId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 relative">
            <button
              type="button"
              onClick={() => setIsIdModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-stone-800 text-stone-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <IdCard className="w-4 h-4 text-amber-400" />
                Verified Credential Issuer
              </span>
              <h2 className="text-xl font-black text-white mt-1">
                Official Parichay Patra Preview
              </h2>
              <p className="text-xs text-stone-400">
                Official high-security identity badge with QR verification code and emergency contacts.
              </p>
            </div>

            {/* PRINTABLE BADGE CARD */}
            <div
              id="printable-parichay-patra"
              className="rounded-2xl bg-gradient-to-b from-stone-900 to-slate-950 border-2 border-amber-500 p-5 shadow-2xl relative overflow-hidden space-y-4"
            >
              {/* Gold Top Banner */}
              <div className="text-center pb-3 border-b border-amber-500/40 space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-amber-400 text-lg font-serif">ॐ</span>
                  <h3 className="text-sm font-black text-amber-400 tracking-wider uppercase">
                    {activeWorkspace?.name || 'SANATANI MANDIR SAMSTHAN'}
                  </h3>
                  <span className="text-amber-400 text-lg font-serif">ॐ</span>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white">
                  PARICHAY PATRA (परिचय पत्र) • NISHKAM SEVADAR
                </p>
              </div>

              {/* Sevadar Photo & Core Details */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500/30 to-amber-700/20 border-2 border-amber-400 flex flex-col items-center justify-center shrink-0 shadow-inner">
                  <span className="text-2xl font-black text-amber-300">
                    {selectedSevadarForId.name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')}
                  </span>
                  <span className="text-[9px] font-mono text-amber-200 mt-1 uppercase">
                    VERIFIED
                  </span>
                </div>

                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-black text-white">
                      {selectedSevadarForId.name}
                    </h4>
                    <span className="text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold">
                      {selectedSevadarForId.bloodGroup}
                    </span>
                  </div>

                  <p className="text-xs font-mono text-amber-400">
                    ID: {selectedSevadarForId.badgeNumber}
                  </p>

                  <div className="text-[11px] text-stone-300 space-y-0.5">
                    <p>Phone: <strong className="text-white font-mono">{selectedSevadarForId.phone}</strong></p>
                    <p className="text-amber-300">
                      Emergency (ICE):{' '}
                      <strong className="text-white font-mono">
                        {selectedSevadarForId.emergencyContact}
                      </strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Sector & Shift Authorization Strip */}
              <div className="p-2.5 rounded-xl bg-stone-900/90 border border-amber-500/30 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[9px] text-stone-400 block uppercase font-bold">Assigned Sector:</span>
                  <strong className="text-amber-400">{selectedSevadarForId.assignedSector}</strong>
                </div>

                <div className="text-right">
                  <span className="text-[9px] text-stone-400 block uppercase font-bold">Duty Shift:</span>
                  <strong className="text-white">{selectedSevadarForId.shiftTime}</strong>
                </div>
              </div>

              {/* Shastric Motto & Barcode / Security Footer */}
              <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-[9px] text-stone-400">
                <div className="flex items-center gap-2">
                  <QrCode className="w-8 h-8 text-amber-400 shrink-0" />
                  <div>
                    <span className="block font-mono text-[9px] text-stone-300">
                      YATRANET-SEC-PASS: {selectedSevadarForId.id}
                    </span>
                    <span className="italic text-stone-400">
                      परोपकाराय फलन्ति वृक्षाः • निष्काम सेवा
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="block text-[8px] text-stone-500">ISSUED BY</span>
                  <span className="font-serif text-[10px] text-amber-400 font-bold">Trustee Board</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsIdModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs transition-colors"
              >
                Close Preview
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-950" />
                <span>Print Parichay Patra</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: SHIFT & SECTOR REASSIGNMENT
      ===================================================================== */}
      {reassigningSevadar && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-stone-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-amber-400" />
                <span>Reassign Shift / Sector</span>
              </h3>
              <button
                type="button"
                onClick={() => setReassigningSevadar(null)}
                className="text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1 text-xs">
              <p className="text-stone-400">
                Sevadar:{' '}
                <strong className="text-white text-sm">
                  {reassigningSevadar.name} ({reassigningSevadar.badgeNumber})
                </strong>
              </p>
              <p className="text-stone-500">
                Currently at: {reassigningSevadar.assignedSector} • {reassigningSevadar.shiftTime}
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  Destination YatraNet Sector
                </label>
                <select
                  value={newSector}
                  onChange={(e) => setNewSector(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-stone-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  {YATRANET_SECTORS.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  Duty Shift Time
                </label>
                <select
                  value={newShift}
                  onChange={(e) => setNewShift(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-stone-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  {SHIFT_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setReassigningSevadar(null)}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveReassignment}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20"
              >
                Confirm Reassignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
