import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck, ShieldAlert, Award, Sparkles, Flame, CheckCircle2,
  Clock, Calendar, MapPin, Phone, Mail, Building2, User, Users,
  ChevronRight, X, Plus, Filter, Search, Coins, TrendingUp,
  Lock, Unlock, FileText, Upload, AlertTriangle, ArrowRight,
  Eye, RefreshCw, Send, Check, Star, ArrowLeftRight, Activity,
  Briefcase, Landmark, CheckSquare, MessageSquare, AlertCircle,
  HelpCircle, ChevronDown, Download, Zap, ExternalLink
} from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { DevoteeAccountPortal } from '../domain5/DevoteeAccountPortal';
import { PurohitProfile, PoojaBooking } from '../../types';

// Dual-Identity Mode
export type UnifiedPortalMode = 'DEVOTEE_SPACE' | 'PUROHIT_PRO';

// Pro Sub-Tabs
export type PurohitProTab =
  | 'OVERVIEW'
  | 'MARKETPLACE_GIGS'
  | 'LONG_TERM_CONTRACTS'
  | 'ESCROW_LEDGER'
  | 'GOD_MODE_QUEUE';

// Verification Status Lifecycle
export type VerificationStage =
  | 'NOT_APPLIED'
  | 'STAGE_1_SUBMITTED'
  | 'STAGE_2_TEMPLE_APPROVED'
  | 'VERIFIED_MASTER';

export interface PurohitApplicationRecord {
  id: string;
  applicantId: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  gotra: string;
  vedicBranch: 'Rigveda' | 'Yajurveda' | 'Samaveda' | 'Atharvaveda' | 'Smartha' | 'Tantrik';
  vidwatTitle: string;
  vedicQualification: string;
  gurukulAffiliation: string;
  experienceYears: number;
  specializations: string[];
  certificateRef: string;
  aadhaarOrParishadId: string;
  stage: VerificationStage;
  submittedAt: string;
  templeApprovedAt?: string;
  templeApproverName?: string;
  godModeApprovedAt?: string;
  rejectionReason?: string;
}

export interface RitualGig {
  id: string;
  title: string;
  category: 'Havan & Yajna' | 'Samskara & Vivah' | 'Mandir Sanctum' | 'Katha & Shanti' | 'Vastu & Grihapravesh';
  hostName: string;
  hostType: 'Temple Trust' | 'Devotee Family' | 'Ashram Samiti';
  city: string;
  locationDetails: string;
  date: string;
  timeSlot: string;
  escrowDakshina: number;
  vedicBranchPreferred?: string;
  samagriProvided: boolean;
  status: 'OPEN' | 'PROPOSAL_SUBMITTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'ESCROW_RELEASED';
  proposalsCount: number;
  description: string;
  sankalpIntention: string;
}

export interface LongTermContract {
  id: string;
  contractTitle: string;
  templeName: string;
  sanctumLocation: string;
  durationMonths: number;
  startDate: string;
  endDate: string;
  monthlyHonorarium: number;
  status: 'ACTIVE' | 'UPCOMING' | 'COMPLETED';
  kutirRoomNo?: string;
  foodAllowanceIncluded: boolean;
  shiftsDescription: string;
  totalLeaveDays: number;
  usedLeaveDays: number;
}

export interface EscrowTransaction {
  id: string;
  gigId: string;
  title: string;
  payerName: string;
  grossDakshina: number;
  platformTakeRate: number; // e.g. 5%
  netHonorarium: number;
  status: 'ESCROW_LOCKED' | 'PROCESSING' | 'RELEASED_TO_UPI';
  date: string;
  payoutTxRef?: string;
}

// Initial Mock Seed Data for Enterprise Simulation
const SEED_APPLICATIONS: PurohitApplicationRecord[] = [
  {
    id: 'app-seed-01',
    applicantId: 'usr-purohit-101',
    name: 'Pt. Radheshyam Dwivedi',
    phone: '+91 98391 24501',
    email: 'radheshyam.dwivedi@kashipriests.org',
    city: 'Varanasi',
    gotra: 'Bharadwaja',
    vedicBranch: 'Yajurveda',
    vidwatTitle: 'Veda Vibhushan & Karmakanda Shiromani',
    vedicQualification: 'Acharya in Shukla Yajurveda (Sampurnanand Sanskrit Univ.)',
    gurukulAffiliation: 'Sampurnanand Sanskrit Vishwavidyalaya, Kashi',
    experienceYears: 24,
    specializations: ['Maharudrabhishek', 'Vastu Shanti', 'Navagraha Havan', 'Vivah Samskara'],
    certificateRef: 'DOC-VEDA-YV-9921.pdf',
    aadhaarOrParishadId: 'UP-PV-881204',
    stage: 'VERIFIED_MASTER',
    submittedAt: '2026-08-10',
    templeApprovedAt: '2026-08-12',
    templeApproverName: 'Sri Kashi Vishwanath Mandir Trust',
    godModeApprovedAt: '2026-08-15',
  },
  {
    id: 'app-seed-02',
    applicantId: 'usr-purohit-102',
    name: 'Acharya Mukund Mohan Goswami',
    phone: '+91 98302 88412',
    email: 'mukund.goswami@sanatanvidwat.org',
    city: 'Kolkata / Nabadwip',
    gotra: 'Kashyapa',
    vedicBranch: 'Samaveda',
    vidwatTitle: 'Bhagavat Bhushan & Jyotish Ratna',
    vedicQualification: 'Acharya in Jyotish & Karmakanda (Kashi Vidyapeeth)',
    gurukulAffiliation: 'Nabadwip Dham Gaudiya Veda Parishad',
    experienceYears: 18,
    specializations: ['Bhagavatam Katha', 'Satyanarayan Vrat Katha', 'Nama Samskar', 'Sudharshana Homam'],
    certificateRef: 'DOC-JYOTISH-KV-4412.pdf',
    aadhaarOrParishadId: 'WB-SP-550921',
    stage: 'STAGE_2_TEMPLE_APPROVED',
    submittedAt: '2026-09-02',
    templeApprovedAt: '2026-09-08',
    templeApproverName: 'Sri Radha Govind Mandir Samiti',
  },
  {
    id: 'app-seed-03',
    applicantId: 'usr-purohit-103',
    name: 'Pt. Vidyadhar Srikant Joshi',
    phone: '+91 94220 55198',
    email: 'vidyadhar.joshi@rigveda.org',
    city: 'Pune / Nashik',
    gotra: 'Vashistha',
    vedicBranch: 'Rigveda',
    vidwatTitle: 'Ghanapathi & Rigveda Rig-Bhaskara',
    vedicQualification: 'Rigveda Samhita Ghanapatha (Pune Veda Shastra Uttejak)',
    gurukulAffiliation: 'Pune Veda Pathashala',
    experienceYears: 29,
    specializations: ['Pavamana Sukta Homa', 'Soma Yajna Rituals', 'Upanayanam', 'Griha Pravesha'],
    certificateRef: 'DOC-RIGVEDA-GHANA-108.pdf',
    aadhaarOrParishadId: 'MH-RP-331094',
    stage: 'STAGE_1_SUBMITTED',
    submittedAt: '2026-09-18',
  },
];

const SEED_GIGS: RitualGig[] = [
  {
    id: 'gig-01',
    title: 'Maha Rudrabhisheka & Laghurudra with 11 Brahmin Chanting',
    category: 'Havan & Yajna',
    hostName: 'Sri Kashi Shiva Bhakta Mandal',
    hostType: 'Temple Trust',
    city: 'Varanasi',
    locationDetails: 'Dashashwamedh Ghat Mandapam',
    date: '2026-10-05',
    timeSlot: '05:30 AM - 11:30 AM',
    escrowDakshina: 21000,
    vedicBranchPreferred: 'Yajurveda / Rigveda',
    samagriProvided: true,
    status: 'OPEN',
    proposalsCount: 3,
    description: 'Annual Shravana-Kartika Transition Laghurudra Anushthan. Seeking lead Ghanapathi to chant Namaka & Chamaka hymns.',
    sankalpIntention: 'Loka Kalyana & Spiritual Prosperity of Devotee Parishad',
  },
  {
    id: 'gig-02',
    title: 'Griha Pravesha, Vastu Shanti & Navagraha Homam',
    category: 'Vastu & Grihapravesh',
    hostName: 'Dr. Alok & Meenakshi Trivedi',
    hostType: 'Devotee Family',
    city: 'Bengaluru',
    locationDetails: 'Indiranagar 2nd Stage, Residence',
    date: '2026-10-12',
    timeSlot: '06:00 AM - 10:00 AM',
    escrowDakshina: 8500,
    vedicBranchPreferred: 'Smartha / Shukla Yajurveda',
    samagriProvided: false,
    status: 'OPEN',
    proposalsCount: 2,
    description: 'New eco-friendly residence entry ceremony. Seeking Acharya with deep knowledge of Vastu Purusha Mandala.',
    sankalpIntention: 'Family Health, Peace, and Removal of Vastu Doshas',
  },
  {
    id: 'gig-03',
    title: 'Navratri Shardiya Chandi Homa & Durga Saptashati Path',
    category: 'Havan & Yajna',
    hostName: 'Maha Shakti Peeth Seva Samiti',
    hostType: 'Temple Trust',
    city: 'Kolkata',
    locationDetails: 'Kalighat Regional Satsang Mandap',
    date: '2026-10-18',
    timeSlot: '08:00 AM - 02:00 PM',
    escrowDakshina: 15000,
    vedicBranchPreferred: 'Tantrik / Shakta Agama',
    samagriProvided: true,
    status: 'OPEN',
    proposalsCount: 5,
    description: 'Maha Ashtami Chandi Yajna with complete Samputita Chandi and Bali-daan Vidhi according to Kalika Purana.',
    sankalpIntention: 'Victory over adversities and divine protection',
  },
  {
    id: 'gig-04',
    title: 'Vedic Vivaha Samskara 2-Day Complete Solemnization',
    category: 'Samskara & Vivah',
    hostName: 'Chaturvedi Parivar',
    hostType: 'Devotee Family',
    city: 'Lucknow',
    locationDetails: 'Gomti Nagar Kalyana Mandapam',
    date: '2026-11-04',
    timeSlot: 'All Day (Vedic Vivaha Timings)',
    escrowDakshina: 25000,
    vedicBranchPreferred: 'Yajurveda',
    samagriProvided: true,
    status: 'OPEN',
    proposalsCount: 4,
    description: 'Complete Shastriya Vivaha following Rig-Yajur traditions: Saptapadi, Laja Homa, Ashmarohana, and Dhruva Darshana.',
    sankalpIntention: 'Sacred union and marital longevity',
  },
];

const SEED_CONTRACTS: LongTermContract[] = [
  {
    id: 'ct-01',
    contractTitle: '3-Month Shravan-Bhadrapada Resident Mukhya Pujari',
    templeName: 'Sri Somnath Mahadev Mandir Trust',
    sanctumLocation: 'Main Jyotirlinga Sanctum Sanctorum',
    durationMonths: 3,
    startDate: '2026-07-15',
    endDate: '2026-10-15',
    monthlyHonorarium: 45000,
    status: 'ACTIVE',
    kutirRoomNo: 'Ashram Kutir #108 (Brahmachari Block)',
    foodAllowanceIncluded: true,
    shiftsDescription: 'Mangala Aarti (04:30 AM) & Madhyahna Bhoga Aarti (12:00 PM)',
    totalLeaveDays: 6,
    usedLeaveDays: 2,
  },
  {
    id: 'ct-02',
    contractTitle: '6-Month Vaishnava Garbhagriha Archaka Deployment',
    templeName: 'Sri Radha Govind Mandir Trust',
    sanctumLocation: 'Sri Govindaji Garbhagriha',
    durationMonths: 6,
    startDate: '2026-11-01',
    endDate: '2027-04-30',
    monthlyHonorarium: 38000,
    status: 'UPCOMING',
    kutirRoomNo: 'Seva Kutir #204',
    foodAllowanceIncluded: true,
    shiftsDescription: 'Shringaar Aarti (07:30 AM) & Shayan Aarti (09:00 PM)',
    totalLeaveDays: 12,
    usedLeaveDays: 0,
  },
];

const SEED_ESCROW_TXS: EscrowTransaction[] = [
  {
    id: 'tx-escrow-01',
    gigId: 'gig-prev-1',
    title: 'Satyanarayan Vrat Katha & Havan',
    payerName: 'Rameshwaram Bhakta Samaj',
    grossDakshina: 5100,
    platformTakeRate: 255, // 5%
    netHonorarium: 4845,
    status: 'RELEASED_TO_UPI',
    date: '2026-09-12',
    payoutTxRef: 'UPI-SB-984421',
  },
  {
    id: 'tx-escrow-02',
    gigId: 'gig-prev-2',
    title: 'Mrityunjaya Japa Anushthan (10,000 Chants)',
    payerName: 'Verma Parivar',
    grossDakshina: 11000,
    platformTakeRate: 550,
    netHonorarium: 10450,
    status: 'RELEASED_TO_UPI',
    date: '2026-09-18',
    payoutTxRef: 'IMPS-SB-110293',
  },
  {
    id: 'tx-escrow-03',
    gigId: 'gig-01',
    title: 'Maha Rudrabhisheka Advance Escrow Deposit',
    payerName: 'Sri Kashi Shiva Bhakta Mandal',
    grossDakshina: 21000,
    platformTakeRate: 1050,
    netHonorarium: 19950,
    status: 'ESCROW_LOCKED',
    date: '2026-09-22',
  },
];

export const PurohitPortalUnified: React.FC = () => {
  const { currentUser, currentRole, activeWorkspace } = useAuthWorkspace();
  const { poojaBookings } = useData();
  const { showToast } = useToast();
  const { t } = useLanguage();

  // Mode Switcher: Devotee Space vs Purohit Pro
  const [portalMode, setPortalMode] = useState<UnifiedPortalMode>('PUROHIT_PRO');
  const [proTab, setProTab] = useState<PurohitProTab>('OVERVIEW');

  // Multi-Tenant Storage Keys
  const wsId = activeWorkspace?.id || 'main';
  const appsStorageKey = `sb_unified_purohit_apps_${wsId}`;
  const gigsStorageKey = `sb_unified_purohit_gigs_${wsId}`;
  const contractsStorageKey = `sb_unified_purohit_contracts_${wsId}`;
  const escrowStorageKey = `sb_unified_purohit_escrow_${wsId}`;
  const userVerifKey = `sb_purohit_verif_state_${currentUser?.id || 'demo_user'}`;

  // Applications Store
  const [applications, setApplications] = useState<PurohitApplicationRecord[]>(() => {
    try {
      const saved = localStorage.getItem(appsStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return SEED_APPLICATIONS;
  });

  // Gigs Store
  const [gigs, setGigs] = useState<RitualGig[]>(() => {
    try {
      const saved = localStorage.getItem(gigsStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return SEED_GIGS;
  });

  // Contracts Store
  const [contracts, setContracts] = useState<LongTermContract[]>(() => {
    try {
      const saved = localStorage.getItem(contractsStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return SEED_CONTRACTS;
  });

  // Escrow Ledger Store
  const [escrowTxs, setEscrowTxs] = useState<EscrowTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(escrowStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return SEED_ESCROW_TXS;
  });

  // Current User Verification State
  // Can be simulated or derived
  const isGlobalSuperAdmin = useMemo(() => {
    const roleUpper = (currentRole || '').toUpperCase();
    return (
      roleUpper.includes('ADMIN') ||
      roleUpper.includes('TRUSTEE') ||
      roleUpper === 'SUPER_ADMIN' ||
      roleUpper.includes('MANAGER')
    );
  }, [currentRole]);

  const [currentVerificationStage, setCurrentVerificationStage] = useState<VerificationStage>(() => {
    try {
      const saved = localStorage.getItem(userVerifKey);
      if (saved) return saved as VerificationStage;
    } catch (e) {}
    return 'STAGE_2_TEMPLE_APPROVED'; // Default high-tier state for instant usability
  });

  const updateVerificationStage = (stage: VerificationStage) => {
    setCurrentVerificationStage(stage);
    try {
      localStorage.setItem(userVerifKey, stage);
    } catch (e) {}
  };

  // =========================================================================
  // ONBOARDING & APPLICATION WIZARD STATE
  // =========================================================================
  const [isApplyWizardOpen, setIsApplyWizardOpen] = useState(false);
  const [wizardForm, setWizardForm] = useState({
    name: currentUser?.name || 'Pt. Vidyadhar Shastri',
    phone: currentUser?.phone || '+91 98765 43210',
    email: currentUser?.email || 'purohit@sanatanibandhan.org',
    city: activeWorkspace?.city || 'Varanasi',
    gotra: 'Bharadwaja',
    vedicBranch: 'Yajurveda' as const,
    vidwatTitle: 'Veda Vibhushan & Acharya',
    vedicQualification: 'Acharya in Shukla Yajurveda (Sampurnanand Sanskrit Univ.)',
    gurukulAffiliation: 'Sampurnanand Sanskrit Vishwavidyalaya, Kashi',
    experienceYears: 15,
    specializations: 'Rudrabhishek, Navagraha Havan, Vastu Shanti, Vivah Samskara',
    certificateRef: 'VEDA-CERT-2026.pdf',
    aadhaarOrParishadId: 'PARISHAD-REG-77012',
  });

  const handleCompleteApplication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wizardForm.name.trim() || !wizardForm.phone.trim()) {
      showToast('Please enter your full name and contact phone.', 'error');
      return;
    }

    const newApp: PurohitApplicationRecord = {
      id: `app-${Date.now()}`,
      applicantId: currentUser?.id || `usr-${Date.now()}`,
      name: wizardForm.name,
      phone: wizardForm.phone,
      email: wizardForm.email,
      city: wizardForm.city,
      gotra: wizardForm.gotra,
      vedicBranch: wizardForm.vedicBranch,
      vidwatTitle: wizardForm.vidwatTitle,
      vedicQualification: wizardForm.vedicQualification,
      gurukulAffiliation: wizardForm.gurukulAffiliation,
      experienceYears: Number(wizardForm.experienceYears) || 5,
      specializations: wizardForm.specializations.split(',').map((s) => s.trim()).filter(Boolean),
      certificateRef: wizardForm.certificateRef,
      aadhaarOrParishadId: wizardForm.aadhaarOrParishadId,
      stage: 'STAGE_1_SUBMITTED',
      submittedAt: new Date().toISOString().split('T')[0],
    };

    const updated = [newApp, ...applications];
    setApplications(updated);
    try {
      localStorage.setItem(appsStorageKey, JSON.stringify(updated));
    } catch (e) {}

    updateVerificationStage('STAGE_1_SUBMITTED');
    setIsApplyWizardOpen(false);
    showToast(
      'Application submitted successfully! Sent to Local Temple Trust for Tier-1 verification. 🙏',
      'success',
      'Credentials Submitted'
    );
  };

  // =========================================================================
  // GOD-MODE MASTER VERIFICATION QUEUE ACTIONS
  // =========================================================================
  const handleApproveTier1Temple = (appId: string) => {
    const updated = applications.map((app) =>
      app.id === appId
        ? {
            ...app,
            stage: 'STAGE_2_TEMPLE_APPROVED' as VerificationStage,
            templeApprovedAt: new Date().toISOString().split('T')[0],
            templeApproverName: activeWorkspace?.name || 'Local Mandir Trust',
          }
        : app
    );
    setApplications(updated);
    try {
      localStorage.setItem(appsStorageKey, JSON.stringify(updated));
    } catch (e) {}

    // If matches current user
    if (applications.find((a) => a.id === appId)?.applicantId === currentUser?.id) {
      updateVerificationStage('STAGE_2_TEMPLE_APPROVED');
    }
    showToast('Tier 1: Approved by Local Mandir Trust! Awaiting App Owner God-Mode signoff. 🏛️', 'success');
  };

  const handleApproveTier2GodMode = (appId: string) => {
    const updated = applications.map((app) =>
      app.id === appId
        ? {
            ...app,
            stage: 'VERIFIED_MASTER' as VerificationStage,
            godModeApprovedAt: new Date().toISOString().split('T')[0],
          }
        : app
    );
    setApplications(updated);
    try {
      localStorage.setItem(appsStorageKey, JSON.stringify(updated));
    } catch (e) {}

    // If matches current user
    if (applications.find((a) => a.id === appId)?.applicantId === currentUser?.id) {
      updateVerificationStage('VERIFIED_MASTER');
    }
    showToast(
      'Tier 2: Granted Master Platform Certification & Gold Parishad Badge! 🌟',
      'success',
      'Acharya Accredited'
    );
  };

  // =========================================================================
  // GIGS MARKETPLACE ACTIONS & BIDDING MODAL
  // =========================================================================
  const [selectedGigForBid, setSelectedGigForBid] = useState<RitualGig | null>(null);
  const [bidDakshinaInput, setBidDakshinaInput] = useState<number>(0);
  const [bidNoteInput, setBidNoteInput] = useState('');
  const [isSubmittingBid, setIsSubmittingBid] = useState(false);

  const handleOpenBidModal = (gig: RitualGig) => {
    setSelectedGigForBid(gig);
    setBidDakshinaInput(gig.escrowDakshina);
    setBidNoteInput(`Namaskar. I am specialized in this ritual vidhi according to ${gig.vedicBranchPreferred || 'Vedic tradition'} with complete Shastriya sankalpa.`);
  };

  const handleConfirmBidProposal = () => {
    if (!selectedGigForBid) return;
    setIsSubmittingBid(true);

    setTimeout(() => {
      const updatedGigs = gigs.map((g) =>
        g.id === selectedGigForBid.id
          ? { ...g, status: 'PROPOSAL_SUBMITTED' as const, proposalsCount: g.proposalsCount + 1 }
          : g
      );
      setGigs(updatedGigs);
      try {
        localStorage.setItem(gigsStorageKey, JSON.stringify(updatedGigs));
      } catch (e) {}

      showToast(
        `Proposal submitted for "${selectedGigForBid.title}" with Dakshina ₹${bidDakshinaInput.toLocaleString('en-IN')}! 🪔`,
        'success',
        'Bid Registered'
      );
      setIsSubmittingBid(false);
      setSelectedGigForBid(null);
    }, 400);
  };

  const handleDirectAcceptGig = (gig: RitualGig) => {
    const updatedGigs = gigs.map((g) =>
      g.id === gig.id ? { ...g, status: 'ASSIGNED' as const } : g
    );
    setGigs(updatedGigs);
    try {
      localStorage.setItem(gigsStorageKey, JSON.stringify(updatedGigs));
    } catch (e) {}

    // Add to Escrow Ledger
    const newTx: EscrowTransaction = {
      id: `tx-escrow-${Date.now()}`,
      gigId: gig.id,
      title: gig.title,
      payerName: gig.hostName,
      grossDakshina: gig.escrowDakshina,
      platformTakeRate: Math.round(gig.escrowDakshina * 0.05),
      netHonorarium: Math.round(gig.escrowDakshina * 0.95),
      status: 'ESCROW_LOCKED',
      date: new Date().toISOString().split('T')[0],
    };

    const updatedTxs = [newTx, ...escrowTxs];
    setEscrowTxs(updatedTxs);
    try {
      localStorage.setItem(escrowStorageKey, JSON.stringify(updatedTxs));
    } catch (e) {}

    showToast(
      `Accepted gig "${gig.title}". ₹${gig.escrowDakshina.toLocaleString('en-IN')} locked in Platform Escrow Vault! 🔒`,
      'success',
      'Escrow Gig Assigned'
    );
  };

  // =========================================================================
  // LEAVE REQUEST MODAL (FOR LONG-TERM CONTRACTS)
  // =========================================================================
  const [selectedContractForLeave, setSelectedContractForLeave] = useState<LongTermContract | null>(null);
  const [leaveDaysInput, setLeaveDaysInput] = useState(1);
  const [leaveReasonInput, setLeaveReasonInput] = useState('');

  const handleSubmitLeaveRequest = () => {
    if (!selectedContractForLeave) return;
    if (leaveDaysInput <= 0) {
      showToast('Please enter a valid number of leave days.', 'error');
      return;
    }

    const updated = contracts.map((c) =>
      c.id === selectedContractForLeave.id
        ? { ...c, usedLeaveDays: c.usedLeaveDays + leaveDaysInput }
        : c
    );
    setContracts(updated);
    try {
      localStorage.setItem(contractsStorageKey, JSON.stringify(updated));
    } catch (e) {}

    showToast(
      `Submitted ${leaveDaysInput}-day Seva Leave Request for ${selectedContractForLeave.contractTitle}. Mandir Adhyaksha notified! 📜`,
      'success',
      'Leave Approved'
    );
    setSelectedContractForLeave(null);
    setLeaveReasonInput('');
  };

  // =========================================================================
  // PAYOUT REQUEST (ESCROW LEDGER)
  // =========================================================================
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutUpiId, setPayoutUpiId] = useState('acharya.shastri@okhdfcbank');

  const handleRequestEscrowDisbursal = () => {
    const updated = escrowTxs.map((tx) =>
      tx.status === 'ESCROW_LOCKED'
        ? {
            ...tx,
            status: 'RELEASED_TO_UPI' as const,
            payoutTxRef: `UPI-SB-${Date.now().toString().slice(-6)}`,
          }
        : tx
    );
    setEscrowTxs(updated);
    try {
      localStorage.setItem(escrowStorageKey, JSON.stringify(updated));
    } catch (e) {}

    setIsPayoutModalOpen(false);
    showToast(
      `Escrow payout processed to ${payoutUpiId}! Immediate IMPS settlement initiated. 💰`,
      'success',
      'Dakshina Disbursed'
    );
  };

  // Escrow Calculations
  const escrowMetrics = useMemo(() => {
    let locked = 0;
    let released = 0;
    let platformFees = 0;

    escrowTxs.forEach((tx) => {
      platformFees += tx.platformTakeRate;
      if (tx.status === 'ESCROW_LOCKED' || tx.status === 'PROCESSING') {
        locked += tx.netHonorarium;
      } else {
        released += tx.netHonorarium;
      }
    });

    return {
      locked,
      released,
      platformFees,
      totalVolume: locked + released + platformFees,
    };
  }, [escrowTxs]);

  // =========================================================================
  // RENDER DUAL-IDENTITY HEADER & SWITCHER
  // =========================================================================
  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-950">
      
      {/* Top Dual-Identity Switcher Banner */}
      <section className="bg-gradient-to-r from-stone-950 via-amber-950/40 to-stone-950 border-b border-amber-900/50 sticky top-0 z-40 backdrop-blur-md shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          
          {/* Identity Title & Verification Pill */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-800 p-0.5 shadow-lg shadow-amber-950/60 flex items-center justify-center">
              <div className="w-full h-full bg-stone-950 rounded-[14px] flex items-center justify-center text-amber-400 font-black text-xl">
                {portalMode === 'PUROHIT_PRO' ? '🪔' : '🙏'}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-amber-100 tracking-tight leading-none">
                  {portalMode === 'PUROHIT_PRO' ? 'Purohit Professional Workspace' : 'Personal Devotee Space'}
                </h1>
                
                {/* Real-Time Verification Badge */}
                {portalMode === 'PUROHIT_PRO' && (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      currentVerificationStage === 'VERIFIED_MASTER'
                        ? 'bg-amber-400 text-stone-950 shadow-md shadow-amber-500/30'
                        : currentVerificationStage === 'STAGE_2_TEMPLE_APPROVED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : currentVerificationStage === 'STAGE_1_SUBMITTED'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {currentVerificationStage === 'VERIFIED_MASTER' ? (
                      <>
                        <Award className="w-3 h-3 text-stone-950 fill-stone-950" />
                        <span>Parishad Master Verified</span>
                      </>
                    ) : currentVerificationStage === 'STAGE_2_TEMPLE_APPROVED' ? (
                      <>
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        <span>Temple Tier Approved</span>
                      </>
                    ) : currentVerificationStage === 'STAGE_1_SUBMITTED' ? (
                      <>
                        <Clock className="w-3 h-3 text-sky-400" />
                        <span>In Review (Tier 1)</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        <span>Not Verified</span>
                      </>
                    )}
                  </span>
                )}
              </div>

              <p className="text-xs text-amber-400/80 font-medium mt-0.5">
                {currentUser?.name || 'Sanatani Member'} • {activeWorkspace?.name || 'Sanatan Ecosystem'}
              </p>
            </div>
          </div>

          {/* Quick Dual-Space Switcher & Simulation Pill */}
          <div className="flex items-center gap-2">
            
            {/* Mode Toggle Button */}
            <div className="bg-stone-900/90 p-1 rounded-2xl border border-stone-800 flex items-center shadow-inner">
              <button
                type="button"
                onClick={() => setPortalMode('DEVOTEE_SPACE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  portalMode === 'DEVOTEE_SPACE'
                    ? 'bg-amber-500 text-stone-950 shadow-md font-black'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <span>🙏 Devotee Space</span>
              </button>

              <button
                type="button"
                onClick={() => setPortalMode('PUROHIT_PRO')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  portalMode === 'PUROHIT_PRO'
                    ? 'bg-amber-500 text-stone-950 shadow-md font-black'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <span>🪔 Purohit Pro</span>
              </button>
            </div>

            {/* Test Simulation Controls (For Easy Testing & Demonstration) */}
            <div className="hidden lg:flex items-center gap-1.5 bg-stone-900/80 px-2.5 py-1 rounded-2xl border border-amber-500/20 text-[11px]">
              <span className="text-stone-400 font-bold">Simulate Stage:</span>
              <button
                type="button"
                onClick={() => updateVerificationStage('NOT_APPLIED')}
                className={`px-2 py-0.5 rounded-lg font-bold ${
                  currentVerificationStage === 'NOT_APPLIED'
                    ? 'bg-rose-500 text-white'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                Unapplied
              </button>
              <button
                type="button"
                onClick={() => updateVerificationStage('STAGE_1_SUBMITTED')}
                className={`px-2 py-0.5 rounded-lg font-bold ${
                  currentVerificationStage === 'STAGE_1_SUBMITTED'
                    ? 'bg-sky-500 text-stone-950'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                Tier 1
              </button>
              <button
                type="button"
                onClick={() => updateVerificationStage('STAGE_2_TEMPLE_APPROVED')}
                className={`px-2 py-0.5 rounded-lg font-bold ${
                  currentVerificationStage === 'STAGE_2_TEMPLE_APPROVED'
                    ? 'bg-emerald-500 text-stone-950'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                Tier 2
              </button>
              <button
                type="button"
                onClick={() => updateVerificationStage('VERIFIED_MASTER')}
                className={`px-2 py-0.5 rounded-lg font-bold ${
                  currentVerificationStage === 'VERIFIED_MASTER'
                    ? 'bg-amber-400 text-stone-950 font-black'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                Master Gold
              </button>
            </div>

          </div>

        </div>

        {/* Pro Sub-Navigation (Visible when in PUROHIT_PRO mode) */}
        {portalMode === 'PUROHIT_PRO' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-2 overflow-x-auto custom-scrollbar border-t border-stone-800/80 py-2">
            {[
              { id: 'OVERVIEW', label: 'Acharya Profile & Verification', icon: Award },
              { id: 'MARKETPLACE_GIGS', label: 'Sanatani Ritual Gigs', icon: Flame, badge: `${gigs.length} Open` },
              { id: 'LONG_TERM_CONTRACTS', label: 'Long-Term Contracts & Kutir', icon: Building2, badge: `${contracts.length} Active` },
              { id: 'ESCROW_LEDGER', label: 'Escrow Vault & Dakshina Ledger', icon: Coins, badge: `₹${escrowMetrics.locked.toLocaleString('en-IN')}` },
              { id: 'GOD_MODE_QUEUE', label: 'God Mode Master Queue', icon: ShieldCheck, badge: `${applications.filter(a => a.stage !== 'VERIFIED_MASTER').length} Pending` },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = proTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setProTab(tab.id as PurohitProTab)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/10 text-amber-300 border border-amber-500/50 shadow-sm'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-stone-500'}`} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black uppercase ${
                      isActive ? 'bg-amber-400 text-stone-950' : 'bg-stone-800 text-stone-400'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* =====================================================================
          MAIN BODY CONTAINER
      ===================================================================== */}
      <main className="flex-1 w-full">
        
        {/* ===================================================================
            VIEW 1: PERSONAL DEVOTEE SPACE (DELEGATED TO DEVOTEE ACCOUNT PORTAL)
        =================================================================== */}
        {portalMode === 'DEVOTEE_SPACE' && (
          <div className="animate-fadeIn">
            {/* Embedded Devotee Account Portal */}
            <DevoteeAccountPortal initialTab="PASS" />
          </div>
        )}

        {/* ===================================================================
            VIEW 2: PUROHIT PROFESSIONAL WORKSPACE
        =================================================================== */}
        {portalMode === 'PUROHIT_PRO' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fadeIn">
            
            {/* =================================================================
                PRO TAB 1: OVERVIEW & TWO-TIER VERIFICATION WIZARD / STATUS TRACKER
            ================================================================= */}
            {proTab === 'OVERVIEW' && (
              <div className="space-y-6">
                
                {/* Verification Stepper Card */}
                <div className="bg-stone-950/80 border border-amber-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                        Sanatani Bandhan National Parishad
                      </span>
                      <h2 className="text-xl font-black text-white mt-1">
                        Two-Tier Acharya Accreditation & Status Tracker
                      </h2>
                      <p className="text-xs text-stone-400 mt-0.5">
                        High-security verification pipeline ensuring only authenticated Vedic scholars conduct sacred sanctum rituals and receive Escrow Dakshina.
                      </p>
                    </div>

                    {currentVerificationStage === 'NOT_APPLIED' ? (
                      <button
                        type="button"
                        onClick={() => setIsApplyWizardOpen(true)}
                        className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-black text-xs shadow-lg flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                      >
                        <Zap className="w-4 h-4 fill-stone-950" />
                        <span>Start Onboarding Wizard</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsApplyWizardOpen(true)}
                          className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 text-xs font-bold transition-colors cursor-pointer"
                        >
                          Update Application Dossier
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Visual Stepper */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
                    
                    {/* Step 1: Submission */}
                    <div
                      className={`p-4 rounded-2xl border transition-all ${
                        currentVerificationStage !== 'NOT_APPLIED'
                          ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                          : 'bg-stone-900/60 border-stone-800 text-stone-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black uppercase tracking-wider">Step 1</span>
                        {currentVerificationStage !== 'NOT_APPLIED' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <Clock className="w-5 h-5 text-stone-500" />
                        )}
                      </div>
                      <h4 className="text-sm font-black text-white">Veda Shakha Application</h4>
                      <p className="text-[11px] text-stone-400 mt-1">
                        Credentials, Gurukul certification, gotra, and specialization submitted.
                      </p>
                      <span className="inline-block mt-2 text-[10px] font-bold text-emerald-400">
                        {currentVerificationStage !== 'NOT_APPLIED' ? '✓ Completed' : 'Pending Submission'}
                      </span>
                    </div>

                    {/* Step 2: Tier 1 - Local Mandir Trust Verification */}
                    <div
                      className={`p-4 rounded-2xl border transition-all ${
                        currentVerificationStage === 'STAGE_2_TEMPLE_APPROVED' || currentVerificationStage === 'VERIFIED_MASTER'
                          ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                          : currentVerificationStage === 'STAGE_1_SUBMITTED'
                          ? 'bg-sky-950/30 border-sky-500/40 text-sky-200 animate-pulse'
                          : 'bg-stone-900/60 border-stone-800 text-stone-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black uppercase tracking-wider">Tier 1 Verification</span>
                        {currentVerificationStage === 'STAGE_2_TEMPLE_APPROVED' || currentVerificationStage === 'VERIFIED_MASTER' ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <Clock className="w-5 h-5 text-sky-400" />
                        )}
                      </div>
                      <h4 className="text-sm font-black text-white">Local Mandir Trust Audit</h4>
                      <p className="text-[11px] text-stone-400 mt-1">
                        Temple Sevadars and Trustees inspect physical lineage and karmakanda practice.
                      </p>
                      <span className="inline-block mt-2 text-[10px] font-bold">
                        {currentVerificationStage === 'STAGE_2_TEMPLE_APPROVED' || currentVerificationStage === 'VERIFIED_MASTER' ? (
                          <span className="text-emerald-400">✓ Temple Approved</span>
                        ) : currentVerificationStage === 'STAGE_1_SUBMITTED' ? (
                          <span className="text-sky-300">⏳ In Review by Mandir Trust</span>
                        ) : (
                          <span className="text-stone-500">Waiting for Step 1</span>
                        )}
                      </span>
                    </div>

                    {/* Step 3: Tier 2 - App Owner God-Mode Master Verification */}
                    <div
                      className={`p-4 rounded-2xl border transition-all ${
                        currentVerificationStage === 'VERIFIED_MASTER'
                          ? 'bg-amber-950/30 border-amber-500/50 text-amber-200 shadow-lg shadow-amber-950/40'
                          : currentVerificationStage === 'STAGE_2_TEMPLE_APPROVED'
                          ? 'bg-amber-950/20 border-amber-500/30 text-amber-300 animate-pulse'
                          : 'bg-stone-900/60 border-stone-800 text-stone-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black uppercase tracking-wider">Tier 2 Master</span>
                        {currentVerificationStage === 'VERIFIED_MASTER' ? (
                          <Award className="w-5 h-5 text-amber-400 fill-amber-400" />
                        ) : (
                          <Lock className="w-5 h-5 text-stone-500" />
                        )}
                      </div>
                      <h4 className="text-sm font-black text-white">God-Mode Master Badge</h4>
                      <p className="text-[11px] text-stone-400 mt-1">
                        National Parishad accreditation unlocking Escrow ritual marketplace & long-term Kutir contracts.
                      </p>
                      <span className="inline-block mt-2 text-[10px] font-bold">
                        {currentVerificationStage === 'VERIFIED_MASTER' ? (
                          <span className="text-amber-300 font-black">🌟 Master Gold Certified</span>
                        ) : currentVerificationStage === 'STAGE_2_TEMPLE_APPROVED' ? (
                          <span className="text-amber-400">⏳ Ready for God-Mode Signoff</span>
                        ) : (
                          <span className="text-stone-500">Locked</span>
                        )}
                      </span>
                    </div>

                  </div>
                </div>

                {/* Acharya Professional Profile Card & Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Column: Certified Identity Dossier */}
                  <div className="bg-stone-950/80 border border-stone-800 rounded-3xl p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-300 p-0.5 shadow-lg flex items-center justify-center">
                        <div className="w-full h-full bg-stone-950 rounded-[14px] flex items-center justify-center text-amber-400 font-black text-2xl">
                          🕉️
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-base font-black text-white">
                            Pt. Radheshyam Dwivedi
                          </h3>
                          {currentVerificationStage === 'VERIFIED_MASTER' && (
                            <span title="Parishad Gold Certified">
                              <Award className="w-4 h-4 text-amber-400 fill-amber-400" />
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-amber-400 font-bold">Veda Vibhushan & Acharya</p>
                        <span className="inline-block text-[10px] text-stone-400 mt-0.5">
                          Shukla Yajurveda • Bharadwaja Gotra
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="p-3 bg-stone-900/80 rounded-2xl border border-stone-800/80 space-y-1">
                        <span className="text-[10px] text-stone-400 uppercase font-bold block">Accreditation</span>
                        <p className="text-stone-200">Sampurnanand Sanskrit Vishwavidyalaya, Kashi</p>
                        <p className="text-[11px] text-emerald-400 font-mono">Reg ID: UP-PV-881204</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2.5 bg-stone-900/80 rounded-xl border border-stone-800">
                          <span className="text-[10px] text-stone-400 uppercase font-bold block">Experience</span>
                          <span className="font-black text-white">24 Years</span>
                        </div>
                        <div className="p-2.5 bg-stone-900/80 rounded-xl border border-stone-800">
                          <span className="text-[10px] text-stone-400 uppercase font-bold block">Rating</span>
                          <span className="font-black text-amber-400 flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            4.98 (310+)
                          </span>
                        </div>
                      </div>

                      <div className="p-3 bg-stone-900/80 rounded-2xl border border-stone-800/80 space-y-1">
                        <span className="text-[10px] text-stone-400 uppercase font-bold block">Specializations</span>
                        <div className="flex flex-wrap gap-1">
                          {['Maharudrabhishek', 'Vastu Shanti', 'Navagraha Havan', 'Vivah Samskara'].map((spec, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-lg bg-stone-950 text-amber-300 text-[10px] font-medium border border-stone-800">
                              {spec}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Middle & Right Column: Quick Status & Quick Actions */}
                  <div className="lg:col-span-2 space-y-4">
                    
                    {/* Escrow & Contract Highlights */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-stone-950/80 p-4 rounded-2xl border border-stone-800">
                        <span className="text-[10px] text-stone-400 uppercase font-bold block">Escrow Protected Dakshina</span>
                        <div className="text-xl font-black text-amber-300 mt-1">
                          ₹{escrowMetrics.locked.toLocaleString('en-IN')}
                        </div>
                        <p className="text-[10px] text-stone-500 mt-0.5">Held safely in platform vault</p>
                      </div>

                      <div className="bg-stone-950/80 p-4 rounded-2xl border border-stone-800">
                        <span className="text-[10px] text-stone-400 uppercase font-bold block">Active Sanctum Contracts</span>
                        <div className="text-xl font-black text-emerald-400 mt-1">
                          {contracts.filter(c => c.status === 'ACTIVE').length} Long-Term
                        </div>
                        <p className="text-[10px] text-stone-500 mt-0.5">With Kutir & Ashram stay</p>
                      </div>

                      <div className="bg-stone-950/80 p-4 rounded-2xl border border-stone-800">
                        <span className="text-[10px] text-stone-400 uppercase font-bold block">Total Disbursed Earnings</span>
                        <div className="text-xl font-black text-white mt-1">
                          ₹{escrowMetrics.released.toLocaleString('en-IN')}
                        </div>
                        <p className="text-[10px] text-stone-500 mt-0.5">Net direct-to-bank settlements</p>
                      </div>
                    </div>

                    {/* Notice & Welcome Banner */}
                    <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-950/30 via-stone-950 to-stone-950 border border-amber-500/20 space-y-3">
                      <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span>Vedic Scholar Marketplace & Escrow Protocol</span>
                      </div>
                      <p className="text-xs text-stone-300 leading-relaxed">
                        Sanatani Bandhan protects both Yajamanas and Acharyas. All Dakshina is funded into Platform Escrow before the ritual commences and automatically disbursed upon completion with zero payment risk.
                      </p>
                      
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setProTab('MARKETPLACE_GIGS')}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Flame className="w-3.5 h-3.5" />
                          <span>Browse Open Ritual Gigs ({gigs.length})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setProTab('LONG_TERM_CONTRACTS')}
                          className="px-3.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-300 border border-stone-800 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          <span>Sanctum Contracts & Kutir</span>
                        </button>
                      </div>
                    </div>

                  </div>

                </div>

              </div>
            )}

            {/* =================================================================
                PRO TAB 2: SANATANI RITUAL GIGS (UPWORK/FIVERR STYLE MARKETPLACE)
            ================================================================= */}
            {proTab === 'MARKETPLACE_GIGS' && (
              <div className="space-y-6">
                
                {/* Marketplace Header */}
                <div className="bg-stone-950/80 p-5 rounded-3xl border border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-black text-amber-100 flex items-center gap-2">
                      <Flame className="w-5 h-5 text-amber-400" />
                      <span>Sanatani Ritual Gigs & Escrow Marketplace</span>
                    </h3>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Devotees and Mandir Trusts post sacred ceremonies with 100% upfront Dakshina secured in Platform Escrow.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>100% Escrow Protected</span>
                    </span>
                  </div>
                </div>

                {/* Gigs Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {gigs.map((gig) => {
                    const isAssigned = gig.status === 'ASSIGNED';
                    const isProposalSubmitted = gig.status === 'PROPOSAL_SUBMITTED';

                    return (
                      <div
                        key={gig.id}
                        className="bg-stone-950/85 border border-stone-800 hover:border-amber-500/40 rounded-3xl p-5 shadow-xl transition-all flex flex-col justify-between group"
                      >
                        <div className="space-y-3">
                          {/* Top Badges */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {gig.category}
                            </span>
                            
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                isAssigned
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : isProposalSubmitted
                                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                                  : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                              }`}
                            >
                              {isAssigned ? 'Assigned' : isProposalSubmitted ? 'Proposal Active' : 'Open for Bids'}
                            </span>
                          </div>

                          {/* Title & Host */}
                          <div>
                            <h4 className="text-base font-black text-white group-hover:text-amber-200 transition-colors">
                              {gig.title}
                            </h4>
                            <p className="text-xs text-stone-400 mt-0.5">
                              Host: <strong className="text-stone-200">{gig.hostName}</strong> ({gig.hostType})
                            </p>
                          </div>

                          {/* Location, Date, Time */}
                          <div className="grid grid-cols-2 gap-2 text-xs text-stone-300 bg-stone-900/60 p-3 rounded-2xl border border-stone-800/80">
                            <div>
                              <span className="text-[10px] text-stone-500 uppercase font-bold block">Location</span>
                              <span className="font-semibold text-stone-200">{gig.city}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-stone-500 uppercase font-bold block">Ceremony Date</span>
                              <span className="font-semibold text-stone-200">{gig.date}</span>
                            </div>
                            <div className="col-span-2 pt-1 border-t border-stone-800/60 flex items-center justify-between text-[11px]">
                              <span className="text-stone-400">Timings: {gig.timeSlot}</span>
                              <span className="text-amber-400 font-bold">
                                {gig.samagriProvided ? '✓ Samagri Provided' : 'Priest to Bring Samagri'}
                              </span>
                            </div>
                          </div>

                          {/* Description */}
                          <p className="text-xs text-stone-400 line-clamp-2">
                            {gig.description}
                          </p>

                          {/* Sankalpa Note */}
                          <div className="text-[11px] text-amber-300/90 italic bg-amber-950/20 p-2 rounded-xl border border-amber-900/30">
                            Sankalpa: "{gig.sankalpIntention}"
                          </div>
                        </div>

                        {/* Footer Escrow Dakshina & Actions */}
                        <div className="pt-4 mt-4 border-t border-stone-800 flex items-center justify-between gap-3">
                          <div>
                            <span className="text-[10px] text-stone-500 uppercase font-bold block">
                              Escrow Locked Dakshina
                            </span>
                            <span className="text-base font-black text-amber-300">
                              ₹{gig.escrowDakshina.toLocaleString('en-IN')}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {isAssigned ? (
                              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>You are Assigned</span>
                              </span>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenBidModal(gig)}
                                  className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-800 text-xs font-bold transition-colors cursor-pointer"
                                >
                                  Submit Proposal
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDirectAcceptGig(gig)}
                                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-black text-xs shadow-md transition-all cursor-pointer"
                                >
                                  Accept Now
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>

              </div>
            )}

            {/* =================================================================
                PRO TAB 3: LONG-TERM CONTRACTS & SEASONAL KUTIR DEPLOYMENTS
            ================================================================= */}
            {proTab === 'LONG_TERM_CONTRACTS' && (
              <div className="space-y-6">
                
                <div className="bg-stone-950/80 p-5 rounded-3xl border border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-black text-amber-100 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-amber-400" />
                      <span>Long-Term Temple Contracts & Ashram Kutir Deployments</span>
                    </h3>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Official 3-month and 6-month resident priest appointments with monthly honorariums, dedicated Ashram Kutir stay, and aarti rotations.
                    </p>
                  </div>
                </div>

                {/* Contracts List */}
                <div className="space-y-4">
                  {contracts.map((contract) => {
                    const isActive = contract.status === 'ACTIVE';
                    const remainingLeave = contract.totalLeaveDays - contract.usedLeaveDays;

                    return (
                      <div
                        key={contract.id}
                        className={`p-5 rounded-3xl border transition-all ${
                          isActive
                            ? 'bg-stone-950/90 border-amber-500/40 shadow-xl'
                            : 'bg-stone-950/60 border-stone-800'
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          
                          <div className="space-y-2 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                {contract.durationMonths}-Month Residency
                              </span>
                              <h4 className="text-base font-black text-white">
                                {contract.contractTitle}
                              </h4>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  isActive
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                }`}
                              >
                                {contract.status}
                              </span>
                            </div>

                            <p className="text-xs text-amber-400 font-semibold">
                              🏛️ {contract.templeName} • Sanctum: {contract.sanctumLocation}
                            </p>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-stone-300">
                              <div>
                                <span className="text-[10px] text-stone-500 uppercase font-bold block">Tenure Dates</span>
                                <span className="font-semibold text-stone-200">
                                  {contract.startDate} to {contract.endDate}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-stone-500 uppercase font-bold block">Monthly Honorarium</span>
                                <span className="font-black text-amber-400">
                                  ₹{contract.monthlyHonorarium.toLocaleString('en-IN')} / mo
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-stone-500 uppercase font-bold block">Ashram Kutir Stay</span>
                                <span className="font-semibold text-emerald-300">
                                  {contract.kutirRoomNo || 'Assigned on Arrival'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-stone-500 uppercase font-bold block">Leave Balance</span>
                                <span className="font-bold text-stone-200">
                                  {remainingLeave} Days Available (of {contract.totalLeaveDays})
                                </span>
                              </div>
                            </div>

                            <div className="p-2.5 bg-stone-900/60 rounded-xl border border-stone-800 text-[11px] text-stone-400">
                              🕒 <strong>Mandir Duty Shifts:</strong> {contract.shiftsDescription} • {contract.foodAllowanceIncluded ? '✓ Satvik Prasadam & Bhog Included' : 'Self Arranged'}
                            </div>
                          </div>

                          {/* Action to Request Leave */}
                          <div className="flex sm:items-center justify-end gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-stone-800 shrink-0">
                            <button
                              type="button"
                              onClick={() => setSelectedContractForLeave(contract)}
                              className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-amber-300 border border-stone-800 text-xs font-bold transition-colors cursor-pointer"
                            >
                              Request Seva Leave
                            </button>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            )}

            {/* =================================================================
                PRO TAB 4: ESCROW VAULT & DAKSHINA LEDGER
            ================================================================= */}
            {proTab === 'ESCROW_LEDGER' && (
              <div className="space-y-6">
                
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-stone-950/80 p-5 rounded-3xl border border-stone-800 shadow-xl">
                    <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">
                      Escrow Vault Held
                    </span>
                    <div className="text-2xl font-black text-amber-400 mt-1">
                      ₹{escrowMetrics.locked.toLocaleString('en-IN')}
                    </div>
                    <p className="text-[11px] text-stone-500 mt-0.5">Secure funds pending ceremony completion</p>
                  </div>

                  <div className="bg-stone-950/80 p-5 rounded-3xl border border-stone-800 shadow-xl">
                    <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">
                      Total Disbursed Net
                    </span>
                    <div className="text-2xl font-black text-emerald-400 mt-1">
                      ₹{escrowMetrics.released.toLocaleString('en-IN')}
                    </div>
                    <p className="text-[11px] text-stone-500 mt-0.5">Settled directly to Bank / UPI</p>
                  </div>

                  <div className="bg-stone-950/80 p-5 rounded-3xl border border-stone-800 shadow-xl">
                    <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">
                      Platform Fee (Take Rate)
                    </span>
                    <div className="text-2xl font-black text-stone-300 mt-1">
                      ₹{escrowMetrics.platformFees.toLocaleString('en-IN')}
                    </div>
                    <p className="text-[11px] text-stone-500 mt-0.5">5% temple software & insurance levy</p>
                  </div>

                  <div className="bg-stone-950/80 p-5 rounded-3xl border border-stone-800 shadow-xl flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">
                        Instant Payout
                      </span>
                      <p className="text-[11px] text-stone-500 mt-0.5">Disburse locked escrow to your UPI handle</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPayoutModalOpen(true)}
                      className="mt-2 w-full py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                    >
                      Withdraw Escrow Dakshina
                    </button>
                  </div>
                </div>

                {/* Ledger Transactions Table */}
                <div className="bg-stone-950/80 rounded-3xl border border-stone-800 p-5 shadow-xl space-y-4">
                  <h3 className="text-base font-black text-amber-100">
                    Escrow Transactions & Payout Ledger
                  </h3>

                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-stone-800 text-stone-400 uppercase text-[10px] tracking-wider">
                          <th className="py-3 px-3">Ritual / Gig</th>
                          <th className="py-3 px-3">Yajamana / Mandir</th>
                          <th className="py-3 px-3">Gross Dakshina</th>
                          <th className="py-3 px-3">Platform Fee (5%)</th>
                          <th className="py-3 px-3">Net Honorarium</th>
                          <th className="py-3 px-3">Status</th>
                          <th className="py-3 px-3 text-right">Settlement Reference</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-800/60">
                        {escrowTxs.map((tx) => (
                          <tr key={tx.id} className="hover:bg-stone-900/50 transition-colors">
                            <td className="py-3 px-3 font-bold text-white">{tx.title}</td>
                            <td className="py-3 px-3 text-stone-300">{tx.payerName}</td>
                            <td className="py-3 px-3 text-stone-200">₹{tx.grossDakshina.toLocaleString('en-IN')}</td>
                            <td className="py-3 px-3 text-stone-400 font-mono">-₹{tx.platformTakeRate}</td>
                            <td className="py-3 px-3 font-black text-amber-400">₹{tx.netHonorarium.toLocaleString('en-IN')}</td>
                            <td className="py-3 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  tx.status === 'RELEASED_TO_UPI'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                }`}
                              >
                                {tx.status === 'RELEASED_TO_UPI' ? 'Released to UPI' : 'Escrow Vault Locked'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-stone-400">
                              {tx.payoutTxRef || 'Pending Release'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* =================================================================
                PRO TAB 5: GOD MODE MASTER VERIFICATION QUEUE
            ================================================================= */}
            {proTab === 'GOD_MODE_QUEUE' && (
              <div className="space-y-6">
                
                <div className="bg-stone-950/80 p-5 rounded-3xl border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                      SuperAdmin & App Owner God Mode
                    </span>
                    <h3 className="text-lg font-black text-amber-100 mt-1 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-amber-400" />
                      <span>National Parishad Master Verification Queue</span>
                    </h3>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Review credentials submitted by Acharyas across all mandir tenancies and issue final Master Gold Badges.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {applications.map((app) => (
                    <div
                      key={app.id}
                      className="bg-stone-950/80 border border-stone-800 rounded-3xl p-5 shadow-xl space-y-4"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-black text-white">{app.name}</h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              {app.vedicBranch} Shakha
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                app.stage === 'VERIFIED_MASTER'
                                  ? 'bg-amber-400 text-stone-950 font-black'
                                  : app.stage === 'STAGE_2_TEMPLE_APPROVED'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-sky-500/20 text-sky-300'
                              }`}
                            >
                              {app.stage}
                            </span>
                          </div>

                          <p className="text-xs text-amber-400 font-semibold">{app.vidwatTitle}</p>
                          <p className="text-xs text-stone-400">
                            {app.vedicQualification} • {app.gurukulAffiliation} • {app.experienceYears} Years Exp
                          </p>
                          <p className="text-[11px] text-stone-500">
                            Gotra: <strong>{app.gotra}</strong> • Contact: <strong>{app.phone}</strong> • Certificate Ref: <strong className="font-mono text-stone-400">{app.certificateRef}</strong>
                          </p>
                        </div>

                        {/* Actions for God-Mode */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {app.stage === 'STAGE_1_SUBMITTED' && (
                            <button
                              type="button"
                              onClick={() => handleApproveTier1Temple(app.id)}
                              className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                            >
                              Approve Tier 1 (Temple)
                            </button>
                          )}

                          {app.stage !== 'VERIFIED_MASTER' && (
                            <button
                              type="button"
                              onClick={() => handleApproveTier2GodMode(app.id)}
                              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs shadow-md transition-all cursor-pointer"
                            >
                              Grant Master Gold Badge
                            </button>
                          )}

                          {app.stage === 'VERIFIED_MASTER' && (
                            <span className="px-3 py-1.5 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-black flex items-center gap-1">
                              <Award className="w-3.5 h-3.5 text-amber-400" />
                              <span>Master Certified Acharya</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}

          </div>
        )}

      </main>

      {/* =====================================================================
          MODAL 1: ONBOARDING & APPLICATION WIZARD
      ===================================================================== */}
      {isApplyWizardOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-stone-950 border border-amber-500/40 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-start justify-between border-b border-stone-800 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                  National Parishad Accreditation
                </span>
                <h3 className="text-lg font-black text-amber-100 mt-1">
                  Purohit Onboarding & Vedic Accreditation
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsApplyWizardOpen(false)}
                className="p-1 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteApplication} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-400 font-bold block mb-1">Full Legal & Vedic Name *</label>
                  <input
                    type="text"
                    required
                    value={wizardForm.name}
                    onChange={(e) => setWizardForm({ ...wizardForm, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-stone-400 font-bold block mb-1">Phone (WhatsApp) *</label>
                  <input
                    type="tel"
                    required
                    value={wizardForm.phone}
                    onChange={(e) => setWizardForm({ ...wizardForm, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-400 font-bold block mb-1">Veda Shakha *</label>
                  <select
                    value={wizardForm.vedicBranch}
                    onChange={(e) => setWizardForm({ ...wizardForm, vedicBranch: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Rigveda">Rigveda</option>
                    <option value="Yajurveda">Yajurveda (Shukla / Krishna)</option>
                    <option value="Samaveda">Samaveda</option>
                    <option value="Atharvaveda">Atharvaveda</option>
                    <option value="Smartha">Smartha Advaita</option>
                    <option value="Tantrik">Tantrik / Shakta Agama</option>
                  </select>
                </div>
                <div>
                  <label className="text-stone-400 font-bold block mb-1">Gotra</label>
                  <input
                    type="text"
                    value={wizardForm.gotra}
                    onChange={(e) => setWizardForm({ ...wizardForm, gotra: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-stone-400 font-bold block mb-1">Gurukul / University Affiliation</label>
                <input
                  type="text"
                  value={wizardForm.gurukulAffiliation}
                  onChange={(e) => setWizardForm({ ...wizardForm, gurukulAffiliation: e.target.value })}
                  placeholder="Sampurnanand Sanskrit Vishwavidyalaya, Kashi"
                  className="w-full p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-stone-400 font-bold block mb-1">Vedic Qualifications & Title</label>
                <input
                  type="text"
                  value={wizardForm.vedicQualification}
                  onChange={(e) => setWizardForm({ ...wizardForm, vedicQualification: e.target.value })}
                  placeholder="Acharya in Shukla Yajurveda & Karmakanda"
                  className="w-full p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-stone-400 font-bold block mb-1">Ritual Specializations (comma-separated)</label>
                <input
                  type="text"
                  value={wizardForm.specializations}
                  onChange={(e) => setWizardForm({ ...wizardForm, specializations: e.target.value })}
                  placeholder="Maharudrabhishek, Vastu Shanti, Navagraha Havan, Vivah"
                  className="w-full p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-400 font-bold block mb-1">Years of Karmakanda Practice</label>
                  <input
                    type="number"
                    value={wizardForm.experienceYears}
                    onChange={(e) => setWizardForm({ ...wizardForm, experienceYears: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-stone-400 font-bold block mb-1">Aadhaar or Parishad Reg #</label>
                  <input
                    type="text"
                    value={wizardForm.aadhaarOrParishadId}
                    onChange={(e) => setWizardForm({ ...wizardForm, aadhaarOrParishadId: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-stone-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsApplyWizardOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-black shadow-lg"
                >
                  Submit for Two-Tier Verification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: GIG PROPOSAL & BIDDING MODAL
      ===================================================================== */}
      {selectedGigForBid && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-stone-950 border border-amber-500/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-start justify-between border-b border-stone-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white">Submit Proposal for Ritual Gig</h3>
                <p className="text-xs text-amber-400">{selectedGigForBid.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGigForBid(null)}
                className="p-1 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-stone-900 rounded-2xl border border-stone-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-400">Host Escrow Budget:</span>
                  <span className="font-bold text-white">₹{selectedGigForBid.escrowDakshina.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Date & Slot:</span>
                  <span className="font-semibold text-stone-300">{selectedGigForBid.date} ({selectedGigForBid.timeSlot})</span>
                </div>
              </div>

              <div>
                <label className="text-stone-400 font-bold block mb-1">Your Proposed Dakshina (₹)</label>
                <input
                  type="number"
                  value={bidDakshinaInput}
                  onChange={(e) => setBidDakshinaInput(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 focus:outline-none focus:border-amber-500 font-bold"
                />
              </div>

              <div>
                <label className="text-stone-400 font-bold block mb-1">Acharya Note to Yajamana</label>
                <textarea
                  rows={3}
                  value={bidNoteInput}
                  onChange={(e) => setBidNoteInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedGigForBid(null)}
                  className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmittingBid}
                  onClick={handleConfirmBidProposal}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-black shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingBid ? 'Submitting...' : 'Send Sacred Proposal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: SEVA LEAVE REQUEST MODAL
      ===================================================================== */}
      {selectedContractForLeave && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-stone-950 border border-amber-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-start justify-between border-b border-stone-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white">Apply for Seva Leave</h3>
                <p className="text-xs text-amber-400">{selectedContractForLeave.contractTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedContractForLeave(null)}
                className="p-1 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-stone-900 rounded-2xl border border-stone-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-400">Available Leave Balance:</span>
                  <span className="font-bold text-emerald-400">
                    {selectedContractForLeave.totalLeaveDays - selectedContractForLeave.usedLeaveDays} Days
                  </span>
                </div>
              </div>

              <div>
                <label className="text-stone-400 font-bold block mb-1">Number of Days</label>
                <input
                  type="number"
                  min={1}
                  max={selectedContractForLeave.totalLeaveDays - selectedContractForLeave.usedLeaveDays}
                  value={leaveDaysInput}
                  onChange={(e) => setLeaveDaysInput(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-stone-400 font-bold block mb-1">Reason (Tirth Yatra / Family Ceremony)</label>
                <input
                  type="text"
                  value={leaveReasonInput}
                  onChange={(e) => setLeaveReasonInput(e.target.value)}
                  placeholder="e.g. Ganga Snan pilgrimage or Pitru Shradh"
                  className="w-full p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedContractForLeave(null)}
                  className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitLeaveRequest}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-black shadow-md cursor-pointer"
                >
                  Submit to Mandir Trustee
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 4: ESCROW PAYOUT REQUEST
      ===================================================================== */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-stone-950 border border-amber-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-start justify-between border-b border-stone-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white">Disburse Escrow Dakshina</h3>
                <p className="text-xs text-stone-400">Withdraw available escrow honorarium to UPI</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPayoutModalOpen(false)}
                className="p-1 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-stone-900 rounded-2xl border border-stone-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-400">Available Escrow:</span>
                  <span className="font-bold text-amber-300">₹{escrowMetrics.locked.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Instant IMPS Fee:</span>
                  <span className="font-bold text-emerald-400">₹0 (Waived)</span>
                </div>
              </div>

              <div>
                <label className="text-stone-400 font-bold block mb-1">Your UPI ID or Bank VPA</label>
                <input
                  type="text"
                  value={payoutUpiId}
                  onChange={(e) => setPayoutUpiId(e.target.value)}
                  placeholder="acharya@okhdfcbank"
                  className="w-full p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRequestEscrowDisbursal}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black shadow-md cursor-pointer"
                >
                  Confirm Instant Payout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PurohitPortalUnified;
