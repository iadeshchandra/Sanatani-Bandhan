import React, { useState, useMemo, useEffect } from 'react';
import {
  Users, Award, Sparkles, BookOpen, Flame, Calendar, Clock, Banknote,
  Search, Filter, Plus, Check, CheckCircle2, AlertCircle, Phone, Mail,
  MapPin, Star, ShieldCheck, ChevronRight, X, UserCheck, RefreshCw,
  Download, ArrowRight, Zap, BadgeCheck, SlidersHorizontal, Eye,
  FileText, CheckSquare, MessageSquare, Send, Printer, UserPlus,
  Compass, Landmark, Coins, TrendingUp, Info
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { PurohitProfile, PoojaBooking, ResidentPujaSchedule } from '../../types';

// Tab Identifiers
export type PurohitDeskTab = 'DIRECTORY' | 'ASSIGNMENT' | 'ROSTER' | 'DAKSHINA';

interface ShiftItem {
  id: string;
  pujaName: string;
  timings: string;
  sanctum: string;
  deity: string;
  leadPurohit: string;
  assistantPurohit?: string;
  status: 'Scheduled' | 'In Progress' | 'Completed';
  dressCode?: string;
  dailyAttendanceAvg?: number;
}

// Initial enriched directory fallback so the grid is lively and robust
const DEFAULT_EXPANDED_PUROHITS: PurohitProfile[] = [
  {
    id: 'pur-01',
    name: 'Pt. Radheshyam Dwivedi',
    fullName: 'Pt. Radheshyam Dwivedi',
    vidwatTitle: 'Veda Vibhushan & Karmakanda Shiromani',
    vedicQualification: 'Acharya in Shukla Yajurveda (Sampurnanand Sanskrit Univ.)',
    vedicBranch: 'Yajurveda',
    sampradaya: 'Shaiva / Smartha',
    gotra: 'Bharadwaja',
    languages: ['Sanskrit', 'Hindi', 'Bhojpuri', 'English'],
    city: 'Varanasi',
    experienceYears: 24,
    rating: 4.95,
    reviewCount: 310,
    suggestedDakshina: 5100,
    dakshinaRange: '₹3,100 - ₹11,000',
    specializations: ['Maharudrabhishek', 'Vastu Shanti', 'Navagraha Havan', 'Vivah Samskara', 'Chandi Path'],
    verifiedByMandirTrust: true,
    isKycVerified: true,
    availability: 'Available',
    phone: '+91 98391 24501',
    email: 'radheshyam.dwivedi@kashipriests.org',
  },
  {
    id: 'pur-02',
    name: 'Acharya Mukund Mohan Goswami',
    fullName: 'Acharya Mukund Mohan Goswami',
    vidwatTitle: 'Bhagavat Bhushan & Jyotish Ratna',
    vedicQualification: 'Acharya in Jyotish & Karmakanda (Kashi Vidyapeeth)',
    vedicBranch: 'Samaveda',
    sampradaya: 'Gaudiya Vaishnava',
    gotra: 'Kashyapa',
    languages: ['Bengali', 'Hindi', 'Sanskrit', 'English'],
    city: 'Kolkata / Nabadwip',
    experienceYears: 18,
    rating: 4.9,
    reviewCount: 240,
    suggestedDakshina: 4500,
    dakshinaRange: '₹2,500 - ₹7,500',
    specializations: ['Bhagavatam Katha', 'Satyanarayan Vrat Katha', 'Nama Samskar', 'Sudharshana Homam'],
    verifiedByMandirTrust: true,
    isKycVerified: true,
    availability: 'Available',
    phone: '+91 98302 88412',
    email: 'mukund.goswami@sanatanvidwat.org',
  },
  {
    id: 'pur-03',
    name: 'Pt. Vidyadhar Srikant Joshi',
    fullName: 'Pt. Vidyadhar Srikant Joshi',
    vidwatTitle: 'Ghanapathi & Rigveda Rig-Bhaskara',
    vedicQualification: 'Rigveda Samhita Ghanapatha (Pune Veda Shastra Uttejak)',
    vedicBranch: 'Rigveda',
    sampradaya: 'Smartha Advaita',
    gotra: 'Vashistha',
    languages: ['Marathi', 'Sanskrit', 'Hindi', 'English'],
    city: 'Pune / Nashik',
    experienceYears: 29,
    rating: 4.98,
    reviewCount: 420,
    suggestedDakshina: 7500,
    dakshinaRange: '₹5,100 - ₹21,000',
    specializations: ['Pavamana Sukta Homa', 'Soma Yajna Rituals', 'Upanayanam', 'Griha Pravesha', 'Navagraha Shanti'],
    verifiedByMandirTrust: true,
    isKycVerified: true,
    availability: 'Available',
    phone: '+91 94220 55198',
    email: 'vidyadhar.joshi@rigveda.org',
  },
  {
    id: 'pur-04',
    name: 'Acharya Sundararama Dikshitar',
    fullName: 'Acharya Sundararama Dikshitar',
    vidwatTitle: 'Veda Bhashya Ratnakara & Agamacharya',
    vedicQualification: 'Krishna Yajurveda & Pancharatra Agama (Kanchi Veda Pathashala)',
    vedicBranch: 'Yajurveda',
    sampradaya: 'Sri Vaishnava',
    gotra: 'Atreya',
    languages: ['Tamil', 'Telugu', 'Sanskrit', 'English'],
    city: 'Chennai / Kanchipuram',
    experienceYears: 22,
    rating: 4.92,
    reviewCount: 195,
    suggestedDakshina: 6100,
    dakshinaRange: '₹4,500 - ₹15,000',
    specializations: ['Sudarshana Homam', 'Lakshmi Narayana Hridaya', 'Kalyanotsavam', 'Vastu Puja'],
    verifiedByMandirTrust: true,
    isKycVerified: true,
    availability: 'On Call',
    phone: '+91 98401 77332',
    email: 'sundararama.dikshitar@agamaveda.in',
  },
  {
    id: 'pur-05',
    name: 'Tantrik Acharya Devratan Bhattacharya',
    fullName: 'Acharya Devratan Bhattacharya',
    vidwatTitle: 'Shakta Agama & Tantra Nishnata',
    vedicQualification: 'Navavarana Puja Vidhi & Shakta Tantra (Tarapith Mahapeeth)',
    vedicBranch: 'Tantrik',
    sampradaya: 'Shakta',
    gotra: 'Sandilya',
    languages: ['Bengali', 'Hindi', 'Sanskrit'],
    city: 'Tarapith / Guwahati',
    experienceYears: 26,
    rating: 4.88,
    reviewCount: 178,
    suggestedDakshina: 8100,
    dakshinaRange: '₹5,100 - ₹25,000',
    specializations: ['Chandi Yajna', 'Bagalamukhi Anushthan', 'Katyayani Vrata', 'Grahadosha Nivarana'],
    verifiedByMandirTrust: true,
    isKycVerified: true,
    availability: 'Traveling',
    phone: '+91 97331 44029',
    email: 'devratan.shakta@tarapith.org',
  },
  {
    id: 'pur-06',
    name: 'Pt. Ananta Narayan Somayaji',
    fullName: 'Pt. Ananta Narayan Somayaji',
    vidwatTitle: 'Atharvaveda Acharya & Bhaishajya Sukta Specialist',
    vedicQualification: 'Shaunaka Shakha Atharvaveda (Puri Govardhan Matha)',
    vedicBranch: 'Atharvaveda',
    sampradaya: 'Smartha',
    gotra: 'Gautama',
    languages: ['Odia', 'Hindi', 'Sanskrit', 'English'],
    city: 'Puri Kshetra',
    experienceYears: 16,
    rating: 4.86,
    reviewCount: 142,
    suggestedDakshina: 5100,
    dakshinaRange: '₹3,500 - ₹9,500',
    specializations: ['Mrityunjaya Japa', 'Bhaishajya Shanti', 'Navagraha Havan', 'Santana Gopala Homa'],
    verifiedByMandirTrust: true,
    isKycVerified: true,
    availability: 'Available',
    phone: '+91 94370 12890',
    email: 'ananta.somayaji@puriypith.org',
  },
];

export const PurohitManagementDesk: React.FC = () => {
  const { purohits: contextPurohits, poojaBookings, residentPujas, updatePoojaStatus } = useData();
  const { currentUser, currentRole, activeWorkspace } = useAuthWorkspace();
  const { showToast } = useToast();
  const { t } = useLanguage();

  // Active Tab
  const [activeTab, setActiveTab] = useState<PurohitDeskTab>('DIRECTORY');

  // RBAC Checks
  const userRoleUpper = (currentRole || '').toUpperCase();
  const isAdminOrTrustee = useMemo(() => {
    return (
      userRoleUpper.includes('ADMIN') ||
      userRoleUpper.includes('TRUSTEE') ||
      userRoleUpper.includes('MANAGER') ||
      userRoleUpper === 'SUPER_ADMIN'
    );
  }, [userRoleUpper]);

  const isPriest = useMemo(() => {
    return userRoleUpper.includes('PUROHIT') || userRoleUpper.includes('PRIEST');
  }, [userRoleUpper]);

  // Combined Purohit Directory with Local Storage Fallback
  const storagePurohitKey = `sb_purohits_custom_${activeWorkspace?.id || 'main'}`;
  const [localCustomPurohits, setLocalCustomPurohits] = useState<PurohitProfile[]>(() => {
    try {
      const saved = localStorage.getItem(storagePurohitKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const allPurohits = useMemo(() => {
    const combinedMap = new Map<string, PurohitProfile>();
    // First default expanded
    DEFAULT_EXPANDED_PUROHITS.forEach((p) => combinedMap.set(p.id, p));
    // Context purohits (from DataContext/Firebase)
    (contextPurohits || []).forEach((p) => {
      combinedMap.set(p.id, { ...combinedMap.get(p.id), ...p });
    });
    // Local additions
    localCustomPurohits.forEach((p) => combinedMap.set(p.id, p));
    return Array.from(combinedMap.values());
  }, [contextPurohits, localCustomPurohits]);

  // Current Priest identity match (if logged-in user is a priest)
  const currentPriestProfile = useMemo(() => {
    if (!isPriest) return null;
    return allPurohits.find(
      (p) =>
        p.phone === currentUser?.phone ||
        p.email === currentUser?.email ||
        (p.name && currentUser?.name && p.name.toLowerCase().includes(currentUser.name.toLowerCase()))
    ) || allPurohits[0];
  }, [isPriest, allPurohits, currentUser]);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVedaBranch, setSelectedVedaBranch] = useState<string>('ALL');
  const [selectedAvailability, setSelectedAvailability] = useState<string>('ALL');
  const [selectedPriestModal, setSelectedPriestModal] = useState<PurohitProfile | null>(null);

  // New Purohit Modal Form
  const [isAddPriestOpen, setIsAddPriestOpen] = useState(false);
  const [newPriestForm, setNewPriestForm] = useState({
    name: '',
    vidwatTitle: 'Acharya',
    vedicQualification: '',
    vedicBranch: 'Yajurveda' as const,
    sampradaya: 'Shaiva / Smartha',
    gotra: 'Kashyapa',
    city: activeWorkspace?.city || 'Varanasi',
    phone: '',
    email: '',
    experienceYears: 10,
    suggestedDakshina: 5100,
    specializations: 'Rudrabhishek, Navagraha Havan, Vivah Samskara',
    languages: 'Sanskrit, Hindi, English',
  });

  const handleRegisterPurohit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPriestForm.name.trim() || !newPriestForm.phone.trim()) {
      showToast('Please enter Acharya name and contact phone.', 'error');
      return;
    }

    const newPurohit: PurohitProfile = {
      id: `pur-local-${Date.now()}`,
      workspaceId: activeWorkspace?.id || 'ws-main',
      name: newPriestForm.name,
      fullName: newPriestForm.name,
      vidwatTitle: newPriestForm.vidwatTitle,
      vedicQualification: newPriestForm.vedicQualification || 'Vedic Acharya',
      vedicBranch: newPriestForm.vedicBranch as any,
      sampradaya: newPriestForm.sampradaya,
      gotra: newPriestForm.gotra,
      city: newPriestForm.city,
      phone: newPriestForm.phone,
      email: newPriestForm.email,
      languages: newPriestForm.languages.split(',').map((s) => s.trim()).filter(Boolean),
      experienceYears: Number(newPriestForm.experienceYears) || 5,
      rating: 5.0,
      reviewCount: 1,
      suggestedDakshina: Number(newPriestForm.suggestedDakshina) || 5100,
      dakshinaRange: `₹${(Number(newPriestForm.suggestedDakshina) * 0.7).toFixed(0)} - ₹${(Number(newPriestForm.suggestedDakshina) * 1.5).toFixed(0)}`,
      specializations: newPriestForm.specializations.split(',').map((s) => s.trim()).filter(Boolean),
      verifiedByMandirTrust: true,
      isKycVerified: true,
      availability: 'Available',
    };

    const updated = [newPurohit, ...localCustomPurohits];
    setLocalCustomPurohits(updated);
    try {
      localStorage.setItem(storagePurohitKey, JSON.stringify(updated));
    } catch (err) {}

    showToast(`Acharya ${newPriestForm.name} registered into Temple Parishad! 🙏`, 'success', 'Priest Enrolled');
    setIsAddPriestOpen(false);
    setNewPriestForm({
      name: '',
      vidwatTitle: 'Acharya',
      vedicQualification: '',
      vedicBranch: 'Yajurveda',
      sampradaya: 'Shaiva / Smartha',
      gotra: 'Kashyapa',
      city: activeWorkspace?.city || 'Varanasi',
      phone: '',
      email: '',
      experienceYears: 10,
      suggestedDakshina: 5100,
      specializations: 'Rudrabhishek, Navagraha Havan, Vivah Samskara',
      languages: 'Sanskrit, Hindi, English',
    });
  };

  // Filtered Purohits
  const filteredPurohits = useMemo(() => {
    return allPurohits.filter((p) => {
      const pName = (p.name || p.fullName || '').toLowerCase();
      const pCity = (p.city || '').toLowerCase();
      const pGotra = (p.gotra || '').toLowerCase();
      const pQual = (p.vedicQualification || '').toLowerCase();
      const pSpecs = (p.specializations || []).join(' ').toLowerCase();
      const q = searchQuery.toLowerCase();

      const matchesSearch =
        !q ||
        pName.includes(q) ||
        pCity.includes(q) ||
        pGotra.includes(q) ||
        pQual.includes(q) ||
        pSpecs.includes(q);

      const matchesVeda =
        selectedVedaBranch === 'ALL' ||
        (p.vedicBranch && p.vedicBranch.toUpperCase() === selectedVedaBranch.toUpperCase());

      const matchesAvail =
        selectedAvailability === 'ALL' ||
        (p.availability && p.availability.toUpperCase() === selectedAvailability.toUpperCase());

      return matchesSearch && matchesVeda && matchesAvail;
    });
  }, [allPurohits, searchQuery, selectedVedaBranch, selectedAvailability]);

  // =========================================================================
  // TAB 2: SMART RITUAL ASSIGNMENT ENGINE
  // =========================================================================
  const [assignmentBookingFilter, setAssignmentBookingFilter] = useState<'ALL' | 'UNASSIGNED' | 'ASSIGNED'>('UNASSIGNED');
  const [selectedBookingForMatch, setSelectedBookingForMatch] = useState<PoojaBooking | null>(null);

  // Filter bookings (if priest, can filter to personal)
  const displayBookings = useMemo(() => {
    return poojaBookings.filter((b) => {
      const assigned = b.assignedPurohit || b.purohitAssigned || b.priestAssigned;
      if (isPriest && currentPriestProfile) {
        // Priest views their assigned rituals or open ones
        return assigned === currentPriestProfile.name || !assigned;
      }
      if (assignmentBookingFilter === 'UNASSIGNED') return !assigned || b.status === 'Standby';
      if (assignmentBookingFilter === 'ASSIGNED') return !!assigned;
      return true;
    });
  }, [poojaBookings, assignmentBookingFilter, isPriest, currentPriestProfile]);

  // Smart Match Calculator
  const computeMatchScore = (booking: PoojaBooking, priest: PurohitProfile) => {
    let score = 50; // base score
    const bName = (booking.poojaName || '').toLowerCase();
    const specs = (priest.specializations || []).map((s) => s.toLowerCase());

    // Check direct specialization match
    const foundDirect = specs.some((s) => {
      const words = s.split(' ');
      return words.some((w) => w.length > 3 && bName.includes(w));
    });
    if (foundDirect) score += 35;

    // Check Veda alignment
    if (bName.includes('rudra') || bName.includes('shiva') || bName.includes('havan')) {
      if (priest.vedicBranch === 'Yajurveda' || priest.vedicBranch === 'Rigveda') score += 10;
    }
    if (bName.includes('chandi') || bName.includes('durga') || bName.includes('tantra')) {
      if (priest.vedicBranch === 'Tantrik') score += 12;
    }
    if (bName.includes('katha') || bName.includes('satyanarayan') || bName.includes('bhagavat')) {
      if (priest.vedicBranch === 'Samaveda' || priest.sampradaya?.includes('Vaishnava')) score += 10;
    }

    // Availability bonus
    if (priest.availability === 'Available') score += 5;
    else if (priest.availability === 'Traveling') score -= 20;

    // Rating multiplier
    if (priest.rating >= 4.9) score += 5;

    return Math.min(Math.max(score, 40), 99);
  };

  // Ranked priests for currently selected booking in Smart Match modal
  const rankedPriestsForBooking = useMemo(() => {
    if (!selectedBookingForMatch) return [];
    return allPurohits
      .map((priest) => ({
        priest,
        score: computeMatchScore(selectedBookingForMatch, priest),
      }))
      .sort((a, b) => b.score - a.score);
  }, [selectedBookingForMatch, allPurohits]);

  const handleAssignPriestToBooking = (bookingId: string, priestName: string) => {
    updatePoojaStatus(bookingId, 'Confirmed', {
      assignedPurohit: priestName,
      purohitAssigned: priestName,
      priestAssigned: priestName,
    });
    showToast(`Assigned ${priestName} to the Vedic ceremony! 🪔`, 'success', 'Priest Assigned');
    setSelectedBookingForMatch(null);
  };

  // =========================================================================
  // TAB 3: DUTY ROSTER & SHIFT CALENDAR
  // =========================================================================
  const rosterStorageKey = `sb_roster_shifts_${activeWorkspace?.id || 'main'}`;
  const DEFAULT_SHIFTS: ShiftItem[] = [
    {
      id: 'shift-01',
      pujaName: 'Mangala Aarti & Suprabhatam',
      timings: '04:30 AM - 05:30 AM',
      sanctum: 'Mukhya Shiva Sanctum',
      deity: 'Lord Shiva & Parvati',
      leadPurohit: 'Pt. Radheshyam Dwivedi',
      assistantPurohit: 'Pt. Vidyadhar Srikant Joshi',
      status: 'Completed',
      dressCode: 'Pure Unstitched Silk Dhoti & Angavastram',
      dailyAttendanceAvg: 180,
    },
    {
      id: 'shift-02',
      pujaName: 'Shringaar Aarti & Balabhishek',
      timings: '07:30 AM - 08:30 AM',
      sanctum: 'Sri Radha Krishna Garbhagriha',
      deity: 'Radha Govindaji',
      leadPurohit: 'Acharya Mukund Mohan Goswami',
      assistantPurohit: 'Pt. Radheshyam Dwivedi',
      status: 'In Progress',
      dressCode: 'Vedic Peethambaram',
      dailyAttendanceAvg: 320,
    },
    {
      id: 'shift-03',
      pujaName: 'Madhyahna Bhoga & Rajbhog Aarti',
      timings: '12:00 PM - 01:00 PM',
      sanctum: 'All Temple Mandapams',
      deity: 'Temple Kuladevata',
      leadPurohit: 'Pt. Vidyadhar Srikant Joshi',
      assistantPurohit: 'Pt. Ananta Narayan Somayaji',
      status: 'Scheduled',
      dressCode: 'Traditional Indian Dhoti',
      dailyAttendanceAvg: 450,
    },
    {
      id: 'shift-04',
      pujaName: 'Sandhya Maha Aarti with Shankhanaad',
      timings: '06:30 PM - 07:30 PM',
      sanctum: 'Ganga Ghat / Main Courtyard',
      deity: 'Maha Tripurasundari',
      leadPurohit: 'Acharya Sundararama Dikshitar',
      assistantPurohit: 'Acharya Devratan Bhattacharya',
      status: 'Scheduled',
      dressCode: 'Traditional Temple Robes',
      dailyAttendanceAvg: 600,
    },
    {
      id: 'shift-05',
      pujaName: 'Shayan Aarti & Ekanta Seva',
      timings: '08:45 PM - 09:30 PM',
      sanctum: 'Shayan Mandapam',
      deity: 'Sri Venkateswara Swamy',
      leadPurohit: 'Pt. Radheshyam Dwivedi',
      assistantPurohit: 'Acharya Mukund Mohan Goswami',
      status: 'Scheduled',
      dressCode: 'White Khadi Dhoti',
      dailyAttendanceAvg: 140,
    },
  ];

  const [rosterShifts, setRosterShifts] = useState<ShiftItem[]>(() => {
    try {
      const saved = localStorage.getItem(rosterStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_SHIFTS;
  });

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [shiftEditModal, setShiftEditModal] = useState<ShiftItem | null>(null);
  const [newLeadPurohit, setNewLeadPurohit] = useState('');

  const handleUpdateShiftAssignment = () => {
    if (!shiftEditModal || !newLeadPurohit) return;
    const updated = rosterShifts.map((s) =>
      s.id === shiftEditModal.id ? { ...s, leadPurohit: newLeadPurohit } : s
    );
    setRosterShifts(updated);
    try {
      localStorage.setItem(rosterStorageKey, JSON.stringify(updated));
    } catch (e) {}
    showToast(`Updated duty roster for ${shiftEditModal.pujaName} to ${newLeadPurohit} 🙏`, 'success');
    setShiftEditModal(null);
  };

  // =========================================================================
  // TAB 4: DAKSHINA & HONORARIUM LEDGER
  // =========================================================================
  const dakshinaStorageKey = `sb_dakshina_settlements_${activeWorkspace?.id || 'main'}`;
  const [settledTxIds, setSettledTxIds] = useState<Record<string, { settledAt: string; ref: string }>>(() => {
    try {
      const saved = localStorage.getItem(dakshinaStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      'tx-demo-1': { settledAt: '2026-09-20', ref: 'UPI-SB-9011' },
      'tx-demo-2': { settledAt: '2026-09-22', ref: 'IMPS-HDFC-4410' },
    };
  });

  const [settlingBooking, setSettlingBooking] = useState<PoojaBooking | null>(null);
  const [settlementRefInput, setSettlementRefInput] = useState('');

  const handleConfirmDisbursal = () => {
    if (!settlingBooking) return;
    const ref = settlementRefInput || `SB-DAKSHINA-${Date.now().toString().slice(-6)}`;
    const updated = {
      ...settledTxIds,
      [settlingBooking.id]: {
        settledAt: new Date().toISOString().split('T')[0],
        ref,
      },
    };
    setSettledTxIds(updated);
    try {
      localStorage.setItem(dakshinaStorageKey, JSON.stringify(updated));
    } catch (e) {}
    showToast(`Dakshina honorarium of ₹${settlingBooking.dakshinaAmount} marked Disbursed (Ref: ${ref}) 💰`, 'success', 'Honorarium Settled');
    setSettlingBooking(null);
    setSettlementRefInput('');
  };

  // Compute Priest Honorarium Stats
  const priestHonorariumStats = useMemo(() => {
    const stats: Record<
      string,
      {
        priestName: string;
        totalPujas: number;
        grossDakshina: number;
        trustShare: number;
        netPayable: number;
        settledAmount: number;
        pendingAmount: number;
      }
    > = {};

    allPurohits.forEach((p) => {
      const pName = p.name || p.fullName || 'Acharya';
      stats[pName] = {
        priestName: pName,
        totalPujas: 0,
        grossDakshina: 0,
        trustShare: 0,
        netPayable: 0,
        settledAmount: 0,
        pendingAmount: 0,
      };
    });

    poojaBookings.forEach((b) => {
      const assigned = b.assignedPurohit || b.purohitAssigned || b.priestAssigned;
      if (!assigned) return;

      if (!stats[assigned]) {
        stats[assigned] = {
          priestName: assigned,
          totalPujas: 0,
          grossDakshina: 0,
          trustShare: 0,
          netPayable: 0,
          settledAmount: 0,
          pendingAmount: 0,
        };
      }

      const gross = b.dakshinaAmount || 2100;
      const trustDed = Math.round(gross * 0.15); // 15% mandir kalyan nidhi
      const net = gross - trustDed;

      stats[assigned].totalPujas += 1;
      stats[assigned].grossDakshina += gross;
      stats[assigned].trustShare += trustDed;
      stats[assigned].netPayable += net;

      if (settledTxIds[b.id]) {
        stats[assigned].settledAmount += net;
      } else {
        stats[assigned].pendingAmount += net;
      }
    });

    return Object.values(stats);
  }, [allPurohits, poojaBookings, settledTxIds]);

  // Overall Financial Totals
  const financialTotals = useMemo(() => {
    let gross = 0;
    let net = 0;
    let settled = 0;
    let pending = 0;
    let totalPujas = 0;

    priestHonorariumStats.forEach((s) => {
      gross += s.grossDakshina;
      net += s.netPayable;
      settled += s.settledAmount;
      pending += s.pendingAmount;
      totalPujas += s.totalPujas;
    });

    return {
      gross,
      net,
      settled,
      pending,
      totalPujas,
      avgPerPuja: totalPujas > 0 ? Math.round(gross / totalPujas) : 0,
    };
  }, [priestHonorariumStats]);

  // Print Roster Function
  const handlePrintRoster = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col font-sans pb-20 selection:bg-amber-500 selection:text-stone-950">
      
      {/* ========================================================
          1. HEADER & TOP CONTROLS
      ======================================================== */}
      <header className="sticky top-0 z-30 bg-stone-950/95 backdrop-blur-md border-b border-amber-900/40 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          
          {/* Left Title & Temple Identity */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-800 p-0.5 shadow-lg shadow-amber-950/60 flex items-center justify-center">
              <div className="w-full h-full bg-stone-950 rounded-[14px] flex items-center justify-center text-amber-400 font-black text-xl">
                🪔
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-amber-100 tracking-tight leading-none">
                  Purohit & Vedic Rituals Management Desk
                </h1>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Vedic Parishad
                </span>
              </div>
              <p className="text-xs text-amber-400/80 font-medium mt-0.5">
                {activeWorkspace?.name || 'Sanatani Bandhan'} • Acharya Accreditation, Smart Dispatch & Aarti Rotations
              </p>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            {isPriest && currentPriestProfile && (
              <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Namaskar, {currentPriestProfile.name}</span>
              </div>
            )}

            {isAdminOrTrustee && (
              <button
                type="button"
                onClick={() => setIsAddPriestOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 text-xs font-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-stone-950" />
                <span className="hidden sm:inline">Register Acharya</span>
                <span className="sm:hidden">Add</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrintRoster}
              className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 hover:text-white transition-colors cursor-pointer"
              title="Print Current Desk View"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-2 overflow-x-auto custom-scrollbar border-t border-stone-800/80 pt-2 pb-2">
          {[
            { id: 'DIRECTORY', label: '1. Purohit Directory', icon: Users, badge: `${allPurohits.length} Acharyas` },
            { id: 'ASSIGNMENT', label: '2. Smart Ritual Assignment', icon: Flame, badge: `${displayBookings.length} Bookings` },
            { id: 'ROSTER', label: '3. Duty Roster & Aarti Shifts', icon: Calendar, badge: 'Daily Rotations' },
            { id: 'DAKSHINA', label: '4. Dakshina & Honorarium', icon: Coins, badge: `₹${financialTotals.gross.toLocaleString('en-IN')}` },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as PurohitDeskTab)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/10 text-amber-300 border border-amber-500/50 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-stone-500'}`} />
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black uppercase ${
                  isActive ? 'bg-amber-400 text-stone-950' : 'bg-stone-800 text-stone-400'
                }`}>
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {/* ========================================================
          MAIN VIEW CONTAINER
      ======================================================== */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1">
        
        {/* ========================================================
            TAB 1: PUROHIT DIRECTORY
        ======================================================== */}
        {activeTab === 'DIRECTORY' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Search & Veda Filters Bar */}
            <div className="bg-stone-950/70 p-4 rounded-3xl border border-stone-800 space-y-3">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Acharya name, city, gotra, qualification, or ritual (e.g. Rudrabhishek, Vastu)..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-stone-900 border border-stone-800 text-xs sm:text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Availability Filter */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-stone-400 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-amber-500" />
                    Status:
                  </span>
                  <select
                    value={selectedAvailability}
                    onChange={(e) => setSelectedAvailability(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-xs font-bold text-stone-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="ALL">All Status</option>
                    <option value="AVAILABLE">Available</option>
                    <option value="ON CALL">On Call</option>
                    <option value="TRAVELING">Traveling</option>
                  </select>
                </div>

              </div>

              {/* Veda Shakha Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pt-1">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider shrink-0 mr-1">
                  Veda Shakha:
                </span>
                {['ALL', 'Rigveda', 'Yajurveda', 'Samaveda', 'Atharvaveda', 'Smartha', 'Tantrik'].map((veda) => {
                  const isSel = selectedVedaBranch.toUpperCase() === veda.toUpperCase();
                  return (
                    <button
                      key={veda}
                      type="button"
                      onClick={() => setSelectedVedaBranch(veda)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                        isSel
                          ? 'bg-amber-500 text-stone-950 shadow-md font-black'
                          : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800'
                      }`}
                    >
                      {veda === 'ALL' ? 'All Traditions' : veda}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Purohit Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPurohits.map((priest) => {
                const isAvail = priest.availability === 'Available';
                const isOnCall = priest.availability === 'On Call';

                return (
                  <div
                    key={priest.id}
                    className="bg-stone-950/80 border border-stone-800 hover:border-amber-500/40 rounded-3xl p-5 shadow-xl hover:shadow-2xl hover:shadow-amber-950/30 transition-all flex flex-col justify-between group relative overflow-hidden"
                  >
                    {/* Top Glow Accent */}
                    <div className="absolute -top-12 -right-12 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all pointer-events-none" />

                    <div>
                      {/* Header: Photo & Title */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-300 p-0.5 shadow-md flex items-center justify-center shrink-0">
                            <div className="w-full h-full bg-stone-950 rounded-[14px] flex items-center justify-center text-amber-400 font-black text-xl">
                              {priest.name ? priest.name.charAt(0) : '🕉️'}
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h3 className="text-base font-black text-white group-hover:text-amber-200 transition-colors leading-tight">
                                {priest.name || priest.fullName}
                              </h3>
                              {priest.verifiedByMandirTrust && (
                                <span title="Parishad Verified">
                                  <BadgeCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-amber-400 font-semibold line-clamp-1 mt-0.5">
                              {priest.vidwatTitle || 'Vedic Acharya'}
                            </p>
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {priest.vedicBranch || 'Yajurveda'} • {priest.gotra || 'Kashyapa'} Gotra
                            </span>
                          </div>
                        </div>

                        {/* Availability Pill */}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                            isAvail
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : isOnCall
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          {priest.availability || 'Available'}
                        </span>
                      </div>

                      {/* Qualification & Experience */}
                      <p className="text-xs text-stone-300 line-clamp-2 bg-stone-900/60 p-2.5 rounded-2xl border border-stone-800/80 mb-3">
                        <span className="text-amber-400 font-bold block text-[11px] mb-0.5">Vedic Qualification:</span>
                        {priest.vedicQualification || 'Rig-Yajur Veda Samhita Adhyayan'}
                      </p>

                      {/* Rating & Location Meta */}
                      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                        <div className="bg-stone-900/90 p-2 rounded-xl border border-stone-800 flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-stone-400">Rating</span>
                          <span className="font-extrabold text-amber-400 flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {priest.rating} ({priest.reviewCount || 100}+)
                          </span>
                        </div>
                        <div className="bg-stone-900/90 p-2 rounded-xl border border-stone-800 flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-stone-400">Experience</span>
                          <span className="font-bold text-stone-200">{priest.experienceYears} Years</span>
                        </div>
                      </div>

                      {/* Specializations Badges */}
                      <div className="space-y-1 mb-4">
                        <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
                          Specializations:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {(priest.specializations || []).slice(0, 3).map((spec, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-lg bg-stone-900 text-stone-300 border border-stone-800 text-[11px] font-medium"
                            >
                              {spec}
                            </span>
                          ))}
                          {(priest.specializations || []).length > 3 && (
                            <span className="px-1.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 text-[10px] font-bold">
                              +{(priest.specializations || []).length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer Contact & Actions */}
                    <div className="pt-3 border-t border-stone-800 flex items-center justify-between gap-2">
                      <div className="text-left">
                        <span className="text-[10px] uppercase font-bold text-stone-400 block">Dakshina</span>
                        <span className="text-xs font-black text-amber-300">
                          {priest.dakshinaRange || `₹${priest.suggestedDakshina?.toLocaleString('en-IN') || 5100}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {priest.phone && (
                          <a
                            href={`tel:${priest.phone}`}
                            className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-emerald-400 border border-stone-800 transition-colors"
                            title="Call Acharya"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedPriestModal(priest)}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-black text-xs shadow-md flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-stone-950" />
                          <span>Dossier</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredPurohits.length === 0 && (
              <div className="text-center py-12 bg-stone-950/40 rounded-3xl border border-stone-800">
                <Users className="w-10 h-10 text-stone-600 mx-auto mb-2" />
                <h4 className="text-base font-bold text-stone-300">No Purohits matching filter criteria</h4>
                <p className="text-xs text-stone-500 mt-1">Try resetting your search query or Veda Shakha filter.</p>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 2: SMART RITUAL ASSIGNMENT ENGINE
        ======================================================== */}
        {activeTab === 'ASSIGNMENT' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Top Overview & Filter */}
            <div className="bg-stone-950/70 p-5 rounded-3xl border border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-amber-100 flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-400" />
                  <span>Smart Ritual & Puja Assignment Engine</span>
                </h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  Algorithmic matching of pending devotee sankalpa bookings with accredited Purohits based on Veda Shakha, specialization, and availability.
                </p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-400">View:</span>
                <div className="flex items-center bg-stone-900 p-1 rounded-2xl border border-stone-800">
                  {(['UNASSIGNED', 'ASSIGNED', 'ALL'] as const).map((filterOpt) => (
                    <button
                      key={filterOpt}
                      type="button"
                      onClick={() => setAssignmentBookingFilter(filterOpt)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        assignmentBookingFilter === filterOpt
                          ? 'bg-amber-500 text-stone-950 font-black'
                          : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      {filterOpt === 'UNASSIGNED' ? 'Pending Priest' : filterOpt === 'ASSIGNED' ? 'Assigned' : 'All'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bookings List */}
            <div className="space-y-4">
              {displayBookings.map((booking) => {
                const assigned = booking.assignedPurohit || booking.purohitAssigned || booking.priestAssigned;
                const isPending = !assigned;

                return (
                  <div
                    key={booking.id}
                    className={`p-5 rounded-3xl border transition-all ${
                      isPending
                        ? 'bg-stone-950/90 border-amber-500/40 hover:border-amber-400 shadow-lg shadow-amber-950/20'
                        : 'bg-stone-950/60 border-stone-800'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      
                      {/* Left: Puja & Devotee Details */}
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {booking.receiptRef || booking.id}
                          </span>
                          <h3 className="text-base font-black text-white">
                            {booking.poojaName}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              isPending
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            }`}
                          >
                            {isPending ? 'Needs Acharya' : 'Priest Assigned'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-stone-300">
                          <div>
                            <span className="text-[10px] text-stone-400 uppercase font-bold block">Yajamana</span>
                            <span className="font-bold text-white">{booking.devoteeName}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-stone-400 uppercase font-bold block">Gotra / Nakshatra</span>
                            <span className="font-semibold text-amber-300">
                              {booking.gotra} {booking.nakshatra ? `• ${booking.nakshatra}` : ''}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-stone-400 uppercase font-bold block">Date & Muhurat</span>
                            <span className="font-semibold text-stone-200">
                              {booking.bookingDate || booking.tithiDate || 'Upcoming'} ({booking.timeSlot})
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-stone-400 uppercase font-bold block">Dakshina</span>
                            <span className="font-black text-amber-400">
                              ₹{booking.dakshinaAmount?.toLocaleString('en-IN') || 2100}
                            </span>
                          </div>
                        </div>

                        {booking.sankalpDescription && (
                          <p className="text-xs text-stone-400 italic bg-stone-900/60 p-2 rounded-xl border border-stone-800">
                            " {booking.sankalpDescription} "
                          </p>
                        )}
                      </div>

                      {/* Right: Assigned Status & Action */}
                      <div className="flex sm:items-center justify-between lg:justify-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-stone-800 shrink-0">
                        {assigned ? (
                          <div className="flex items-center gap-2 bg-stone-900/90 px-3.5 py-2 rounded-2xl border border-emerald-500/30">
                            <UserCheck className="w-4 h-4 text-emerald-400" />
                            <div>
                              <span className="text-[10px] text-stone-400 uppercase font-bold block">Lead Purohit</span>
                              <span className="text-xs font-black text-emerald-300">{assigned}</span>
                            </div>
                            {isAdminOrTrustee && (
                              <button
                                type="button"
                                onClick={() => setSelectedBookingForMatch(booking)}
                                className="ml-2 text-stone-400 hover:text-amber-400 text-xs font-bold underline cursor-pointer"
                              >
                                Reassign
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedBookingForMatch(booking)}
                            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-black text-xs shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Zap className="w-4 h-4 text-stone-950 fill-stone-950" />
                            <span>Auto-Match & Assign Purohit</span>
                          </button>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}

              {displayBookings.length === 0 && (
                <div className="text-center py-12 bg-stone-950/40 rounded-3xl border border-stone-800">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <h4 className="text-base font-bold text-stone-300">All Ritual Bookings are Assigned!</h4>
                  <p className="text-xs text-stone-500 mt-1">There are no pending rituals waiting for Purohit allocation.</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ========================================================
            TAB 3: DUTY ROSTER & AARTI ROTATIONS
        ======================================================== */}
        {activeTab === 'ROSTER' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Date Switcher & Header */}
            <div className="bg-stone-950/70 p-4 sm:p-5 rounded-3xl border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-amber-100 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <span>Sanctum Aarti & Daily Duty Rotations</span>
                </h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  Official shift ledger for temple Sanctum Sanctorum, Bhoga preparations, and evening Ganga Aarti rotations.
                </p>
              </div>

              {/* Date Selector */}
              <div className="flex items-center gap-2 bg-stone-900 p-1.5 rounded-2xl border border-stone-800">
                <Calendar className="w-4 h-4 text-amber-400 ml-2" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs sm:text-sm font-bold text-white focus:outline-none pr-2 cursor-pointer"
                />
              </div>
            </div>

            {/* Timeline Shift Cards */}
            <div className="space-y-4">
              {rosterShifts.map((shift, idx) => {
                const isCompleted = shift.status === 'Completed';
                const isInProgress = shift.status === 'In Progress';

                return (
                  <div
                    key={shift.id}
                    className="bg-stone-950/80 border border-stone-800 hover:border-amber-500/30 rounded-3xl p-5 shadow-xl transition-all relative overflow-hidden"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      
                      {/* Left: Timing & Shift Details */}
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 font-black text-lg shrink-0">
                          {idx + 1}
                        </div>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-black text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20">
                              {shift.timings}
                            </span>
                            <h3 className="text-base font-black text-white">{shift.pujaName}</h3>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                isCompleted
                                  ? 'bg-stone-800 text-stone-400'
                                  : isInProgress
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              }`}
                            >
                              {shift.status}
                            </span>
                          </div>

                          <p className="text-xs text-stone-400 flex items-center gap-2">
                            <span>Sanctum: <strong className="text-stone-200">{shift.sanctum}</strong></span>
                            <span>•</span>
                            <span>Deity: <strong className="text-amber-300">{shift.deity}</strong></span>
                          </p>

                          {shift.dressCode && (
                            <p className="text-[11px] text-stone-500">
                              👗 Roster Vastra: {shift.dressCode}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: On-Duty Priests & Swap Action */}
                      <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-stone-800 shrink-0">
                        <div className="text-left md:text-right">
                          <span className="text-[10px] uppercase font-bold text-stone-400 block">Lead Acharya</span>
                          <span className="text-xs font-black text-amber-300">{shift.leadPurohit}</span>
                          {shift.assistantPurohit && (
                            <span className="text-[10px] text-stone-400 block mt-0.5">
                              Sahayaka: {shift.assistantPurohit}
                            </span>
                          )}
                        </div>

                        {isAdminOrTrustee && (
                          <button
                            type="button"
                            onClick={() => {
                              setShiftEditModal(shift);
                              setNewLeadPurohit(shift.leadPurohit);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-300 border border-stone-800 text-xs font-bold transition-colors cursor-pointer"
                          >
                            Reassign Shift
                          </button>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* ========================================================
            TAB 4: DAKSHINA & HONORARIUM TRACKER
        ======================================================== */}
        {activeTab === 'DAKSHINA' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-stone-950/80 p-5 rounded-3xl border border-stone-800 shadow-xl">
                <div className="flex items-center justify-between text-stone-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Gross Dakshina Volume</span>
                  <Coins className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-white">
                  ₹{financialTotals.gross.toLocaleString('en-IN')}
                </div>
                <p className="text-[11px] text-stone-500 mt-1">From all scheduled temple rituals</p>
              </div>

              <div className="bg-stone-950/80 p-5 rounded-3xl border border-stone-800 shadow-xl">
                <div className="flex items-center justify-between text-stone-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Disbursed to Acharyas</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-emerald-400">
                  ₹{financialTotals.settled.toLocaleString('en-IN')}
                </div>
                <p className="text-[11px] text-stone-500 mt-1">Successfully settled via direct transfer</p>
              </div>

              <div className="bg-stone-950/80 p-5 rounded-3xl border border-stone-800 shadow-xl">
                <div className="flex items-center justify-between text-stone-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Pending Disbursals</span>
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                </div>
                <div className="text-2xl font-black text-rose-400">
                  ₹{financialTotals.pending.toLocaleString('en-IN')}
                </div>
                <p className="text-[11px] text-stone-500 mt-1">Awaiting trust approval & disbursement</p>
              </div>

              <div className="bg-stone-950/80 p-5 rounded-3xl border border-stone-800 shadow-xl">
                <div className="flex items-center justify-between text-stone-400 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider">Average Honorarium</span>
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-amber-300">
                  ₹{financialTotals.avgPerPuja.toLocaleString('en-IN')}
                </div>
                <p className="text-[11px] text-stone-500 mt-1">Per ritual ceremony completed</p>
              </div>
            </div>

            {/* Per-Priest Honorarium Breakdown Table */}
            <div className="bg-stone-950/80 rounded-3xl border border-stone-800 p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-amber-100">
                    Acharya Honorarium & Welfare Reconciliation
                  </h3>
                  <p className="text-xs text-stone-400">
                    Net priest dakshina reflects 85% payable honorarium after 15% Mandir Kalyan Nidhi deduction.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-stone-800 text-stone-400 uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-3">Acharya Name</th>
                      <th className="py-3 px-3">Pujas</th>
                      <th className="py-3 px-3">Gross Dakshina</th>
                      <th className="py-3 px-3">Trust Nidhi (15%)</th>
                      <th className="py-3 px-3">Net Payable</th>
                      <th className="py-3 px-3">Disbursed</th>
                      <th className="py-3 px-3">Pending</th>
                      <th className="py-3 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60">
                    {priestHonorariumStats.map((stat, idx) => (
                      <tr key={idx} className="hover:bg-stone-900/50 transition-colors">
                        <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-black">
                            🕉️
                          </span>
                          <span>{stat.priestName}</span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-stone-300">{stat.totalPujas}</td>
                        <td className="py-3 px-3 font-semibold text-stone-300">₹{stat.grossDakshina.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 font-semibold text-stone-400">₹{stat.trustShare.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 font-black text-amber-400">₹{stat.netPayable.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 font-bold text-emerald-400">₹{stat.settledAmount.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 font-bold text-rose-400">₹{stat.pendingAmount.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              stat.pendingAmount === 0 && stat.netPayable > 0
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : stat.pendingAmount > 0
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-stone-800 text-stone-400'
                            }`}
                          >
                            {stat.pendingAmount === 0 && stat.netPayable > 0 ? 'All Settled' : stat.pendingAmount > 0 ? 'Pending' : 'No Dues'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Individual Rituals Disbursal Ledger */}
            <div className="bg-stone-950/80 rounded-3xl border border-stone-800 p-5 shadow-xl space-y-4">
              <h3 className="text-base font-black text-amber-100">
                Individual Ritual Disbursal Approvals
              </h3>

              <div className="space-y-3">
                {poojaBookings.slice(0, 10).map((booking) => {
                  const assigned = booking.assignedPurohit || booking.purohitAssigned || booking.priestAssigned;
                  const isSettled = !!settledTxIds[booking.id];
                  const settlementData = settledTxIds[booking.id];
                  const netAmount = Math.round((booking.dakshinaAmount || 2100) * 0.85);

                  return (
                    <div
                      key={booking.id}
                      className="p-3.5 bg-stone-900/70 rounded-2xl border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{booking.poojaName}</span>
                          <span className="text-stone-500">•</span>
                          <span className="text-stone-300">Yajamana: {booking.devoteeName}</span>
                        </div>
                        <p className="text-[11px] text-stone-400">
                          Acharya: <strong className="text-amber-300">{assigned || 'Unassigned'}</strong> • Dakshina: ₹{booking.dakshinaAmount} • Net Honorarium: <strong className="text-emerald-400">₹{netAmount}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isSettled ? (
                          <div className="text-right">
                            <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Settled ({settlementData?.ref || 'Direct'})</span>
                            </span>
                          </div>
                        ) : (
                          isAdminOrTrustee && (
                            <button
                              type="button"
                              onClick={() => {
                                setSettlingBooking(booking);
                                setSettlementRefInput(`UPI-SB-${Date.now().toString().slice(-4)}`);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                            >
                              Disburse Honorarium
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

      </main>

      {/* ========================================================
          MODAL 1: SMART MATCH PUROHIT ASSIGNMENT
      ======================================================== */}
      {selectedBookingForMatch && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-stone-950 border border-amber-500/40 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-stone-800 pb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Smart Match Engine
                </span>
                <h3 className="text-lg font-black text-amber-100 mt-1">
                  Assign Acharya to: {selectedBookingForMatch.poojaName}
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Yajamana: {selectedBookingForMatch.devoteeName} ({selectedBookingForMatch.gotra} Gotra) • Date: {selectedBookingForMatch.bookingDate || 'Upcoming'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBookingForMatch(null)}
                className="p-1 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ranked Acharyas List */}
            <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-1">
              {rankedPriestsForBooking.map(({ priest, score }) => (
                <div
                  key={priest.id}
                  className="bg-stone-900/90 border border-stone-800 hover:border-amber-500/40 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-white">{priest.name || priest.fullName}</h4>
                      <span className="px-2 py-0.2 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        {score}% Match
                      </span>
                    </div>

                    <p className="text-xs text-amber-400 font-semibold">
                      {priest.vedicBranch} Shakha • {priest.vidwatTitle}
                    </p>

                    <div className="flex flex-wrap gap-1 pt-1">
                      {(priest.specializations || []).slice(0, 3).map((s, idx) => (
                        <span key={idx} className="text-[10px] px-1.5 py-0.2 bg-stone-950 text-stone-400 rounded">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-800">
                    <div className="text-right">
                      <span className="text-[10px] text-stone-400 block">Suggested Dakshina</span>
                      <span className="text-xs font-bold text-amber-300">
                        ₹{priest.suggestedDakshina?.toLocaleString('en-IN') || 5100}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAssignPriestToBooking(selectedBookingForMatch.id, priest.name || priest.fullName || 'Acharya')}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-black text-xs shadow-md transition-all cursor-pointer"
                    >
                      Assign
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: REGISTER NEW PUROHIT
      ======================================================== */}
      {isAddPriestOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-stone-950 border border-amber-500/40 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8">
            
            <div className="flex items-start justify-between border-b border-stone-800 pb-3">
              <div>
                <h3 className="text-lg font-black text-amber-100">
                  Register Vedic Acharya into Parishad
                </h3>
                <p className="text-xs text-stone-400">
                  Accredit a qualified Purohit for temple duty rosters and devotee private rituals.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddPriestOpen(false)}
                className="p-1 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterPurohit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-400 font-bold block mb-1">Acharya Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newPriestForm.name}
                    onChange={(e) => setNewPriestForm({ ...newPriestForm, name: e.target.value })}
                    placeholder="Pt. Devendra Shastri"
                    className="w-full p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-stone-400 font-bold block mb-1">Vidwat Title</label>
                  <input
                    type="text"
                    value={newPriestForm.vidwatTitle}
                    onChange={(e) => setNewPriestForm({ ...newPriestForm, vidwatTitle: e.target.value })}
                    placeholder="Veda Vibhushan / Acharya"
                    className="w-full p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-400 font-bold block mb-1">Veda Shakha *</label>
                  <select
                    value={newPriestForm.vedicBranch}
                    onChange={(e) => setNewPriestForm({ ...newPriestForm, vedicBranch: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Rigveda">Rigveda</option>
                    <option value="Yajurveda">Yajurveda (Shukla / Krishna)</option>
                    <option value="Samaveda">Samaveda</option>
                    <option value="Atharvaveda">Atharvaveda</option>
                    <option value="Smartha">Smartha Advaita</option>
                    <option value="Tantrik">Tantrik / Shakta</option>
                  </select>
                </div>

                <div>
                  <label className="text-stone-400 font-bold block mb-1">Gotra</label>
                  <input
                    type="text"
                    value={newPriestForm.gotra}
                    onChange={(e) => setNewPriestForm({ ...newPriestForm, gotra: e.target.value })}
                    placeholder="Bharadwaja / Kashyapa"
                    className="w-full p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-400 font-bold block mb-1">Contact Phone *</label>
                  <input
                    type="tel"
                    required
                    value={newPriestForm.phone}
                    onChange={(e) => setNewPriestForm({ ...newPriestForm, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-stone-400 font-bold block mb-1">Email</label>
                  <input
                    type="email"
                    value={newPriestForm.email}
                    onChange={(e) => setNewPriestForm({ ...newPriestForm, email: e.target.value })}
                    placeholder="acharya@mandir.org"
                    className="w-full p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-stone-400 font-bold block mb-1">Vedic Qualifications & Gurukul</label>
                <input
                  type="text"
                  value={newPriestForm.vedicQualification}
                  onChange={(e) => setNewPriestForm({ ...newPriestForm, vedicQualification: e.target.value })}
                  placeholder="Acharya in Shukla Yajurveda (Sampurnanand Sanskrit Univ.)"
                  className="w-full p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-stone-400 font-bold block mb-1">Ritual Specializations (comma separated)</label>
                <input
                  type="text"
                  value={newPriestForm.specializations}
                  onChange={(e) => setNewPriestForm({ ...newPriestForm, specializations: e.target.value })}
                  placeholder="Rudrabhishek, Navagraha Havan, Vivah Samskara, Vastu Shanti"
                  className="w-full p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-400 font-bold block mb-1">Years of Experience</label>
                  <input
                    type="number"
                    value={newPriestForm.experienceYears}
                    onChange={(e) => setNewPriestForm({ ...newPriestForm, experienceYears: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-stone-400 font-bold block mb-1">Suggested Dakshina (₹)</label>
                  <input
                    type="number"
                    value={newPriestForm.suggestedDakshina}
                    onChange={(e) => setNewPriestForm({ ...newPriestForm, suggestedDakshina: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-stone-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddPriestOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-black shadow-lg"
                >
                  Complete Accreditation
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: ACHARYA DOSSIER VIEWER
      ======================================================== */}
      {selectedPriestModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-stone-950 border border-amber-500/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-start justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 font-black text-xl">
                  🕉️
                </div>
                <div>
                  <h3 className="text-base font-black text-white">{selectedPriestModal.name || selectedPriestModal.fullName}</h3>
                  <p className="text-xs text-amber-400 font-semibold">{selectedPriestModal.vidwatTitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPriestModal(null)}
                className="p-1 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800">
                  <span className="text-[10px] text-stone-400 uppercase font-bold block">Veda Shakha</span>
                  <span className="font-extrabold text-amber-300">{selectedPriestModal.vedicBranch}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800">
                  <span className="text-[10px] text-stone-400 uppercase font-bold block">Gotra / Sampradaya</span>
                  <span className="font-bold text-stone-200">{selectedPriestModal.gotra} Gotra</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-stone-900 border border-stone-800 space-y-1">
                <span className="text-[10px] text-stone-400 uppercase font-bold block">Academic Qualification</span>
                <p className="text-stone-300">{selectedPriestModal.vedicQualification}</p>
              </div>

              <div className="p-3 rounded-2xl bg-stone-900 border border-stone-800 space-y-1.5">
                <span className="text-[10px] text-stone-400 uppercase font-bold block">Specialized Rituals</span>
                <div className="flex flex-wrap gap-1">
                  {(selectedPriestModal.specializations || []).map((s, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded-lg bg-stone-950 text-amber-300 border border-stone-800 text-[11px]">
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-900 border border-stone-800">
                <div>
                  <span className="text-[10px] text-stone-400 uppercase font-bold block">Honorarium Range</span>
                  <span className="font-black text-amber-400">
                    {selectedPriestModal.dakshinaRange || `₹${selectedPriestModal.suggestedDakshina}`}
                  </span>
                </div>
                {selectedPriestModal.phone && (
                  <a
                    href={`tel:${selectedPriestModal.phone}`}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Acharya</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 4: DISBURSE DAKSHINA SETTLEMENT
      ======================================================== */}
      {settlingBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-stone-950 border border-amber-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-start justify-between border-b border-stone-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white">Disburse Priest Honorarium</h3>
                <p className="text-xs text-stone-400">{settlingBooking.poojaName}</p>
              </div>
              <button
                type="button"
                onClick={() => setSettlingBooking(null)}
                className="p-1 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-stone-900 rounded-2xl border border-stone-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-400">Gross Dakshina:</span>
                  <span className="font-bold text-white">₹{settlingBooking.dakshinaAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Mandir Kalyan Nidhi (15%):</span>
                  <span className="font-bold text-stone-400">
                    -₹{Math.round((settlingBooking.dakshinaAmount || 2100) * 0.15)}
                  </span>
                </div>
                <div className="border-t border-stone-800 pt-1 flex justify-between text-sm font-black">
                  <span className="text-amber-400">Net Payable:</span>
                  <span className="text-emerald-400">
                    ₹{Math.round((settlingBooking.dakshinaAmount || 2100) * 0.85)}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-stone-400 font-bold block mb-1">
                  Payment Reference / Transaction ID
                </label>
                <input
                  type="text"
                  value={settlementRefInput}
                  onChange={(e) => setSettlementRefInput(e.target.value)}
                  placeholder="UPI-SB-8821 or Bank Tx Ref"
                  className="w-full p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSettlingBooking(null)}
                  className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDisbursal}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black shadow-md cursor-pointer"
                >
                  Confirm Settlement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 5: REASSIGN SHIFT IN ROSTER
      ======================================================== */}
      {shiftEditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-stone-950 border border-amber-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-start justify-between border-b border-stone-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white">Reassign Aarti Duty Shift</h3>
                <p className="text-xs text-amber-400 font-medium">{shiftEditModal.pujaName} ({shiftEditModal.timings})</p>
              </div>
              <button
                type="button"
                onClick={() => setShiftEditModal(null)}
                className="p-1 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-stone-400 font-bold block mb-1">Select Lead Acharya</label>
                <select
                  value={newLeadPurohit}
                  onChange={(e) => setNewLeadPurohit(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 focus:outline-none focus:border-amber-500"
                >
                  {allPurohits.map((p) => (
                    <option key={p.id} value={p.name || p.fullName}>
                      {p.name || p.fullName} ({p.vedicBranch || 'Acharya'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShiftEditModal(null)}
                  className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateShiftAssignment}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-black shadow-md cursor-pointer"
                >
                  Update Duty Shift
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PurohitManagementDesk;
