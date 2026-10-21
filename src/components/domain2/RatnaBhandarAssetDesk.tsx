import React, { useState, useMemo, useEffect } from 'react';
import { useInr, useWorkspaceCurrency } from '../../hooks/useWorkspaceInr';
import {
  Sparkles,
  ShieldCheck,
  Lock,
  Unlock,
  KeyRound,
  Scale,
  Search,
  Filter,
  Plus,
  CheckCircle2,
  AlertTriangle,
  History,
  Calendar,
  Building,
  Coins,
  Printer,
  Download,
  Eye,
  EyeOff,
  Clock,
  ArrowRight,
  ChevronRight,
  ExternalLink,
  Layers,
  MapPin,
  Flame,
  Award,
  FileCheck,
  X,
  HelpCircle,
  Fingerprint,
  Scan
} from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { useQuickGuide } from '../../context/QuickGuideContext';
import { useBiometricAuth } from '../../hooks/useBiometricAuth';
import { useLanguage } from '../../context/LanguageContext';

export type AssetCategory = 'JEWELRY' | 'VIGRAHA' | 'SILVERWARE' | 'GEMSTONES';
export type MetalType = '24K Gold' | '22K Gold' | 'Silver' | 'Ashtadhatu' | 'Other';
export type AssetLocation = 'GARBHAGRIHA' | 'STRONG_ROOM' | 'BANK_LOCKER';

export interface SacredAsset {
  id: string;
  tagNumber: string; // e.g. "RB-GLD-001"
  assetName: string; // e.g., "Suvarna Mukut - Gold Crown"
  category: AssetCategory;
  metalType: MetalType;
  purityPercentage: number; // e.g. 99.9, 91.6, 92.5
  grossWeightGrams: number;
  netMetalWeightGrams: number;
  currentLocation: AssetLocation;
  lastAuditedDate: string; // YYYY-MM-DD
  auditedBy: string; // Trustee Name
  photoUrl: string; // Placeholder or consecrated ornament image
  deityAssigned: string; // e.g., "Bhagwan Ram Lalla", "Maa Janaki"
  approximateMarketValueINR: number;
  donorName?: string;
  consecrationYear?: number;
  condition: 'Pristine' | 'Worship Grade' | 'Needs Cleansing / Polishing';
  securitySealNo?: string;
  notes?: string;
}

export interface PhysicalAuditLog {
  id: string;
  assetId: string;
  assetTag: string;
  assetName: string;
  auditDate: string;
  auditorTrustee: string;
  auditorRole: string;
  verifiedGrossGrams: number;
  verifiedNetGrams: number;
  varianceGrams: number;
  locationAtAudit: AssetLocation;
  status: 'VERIFIED_MATCH' | 'DISCREPANCY_FLAGGED';
  authMethod?: 'PIN' | 'BIOMETRIC';
  notes?: string;
}

const PRESET_TRUSTEES = [
  // SECURITY: demo seeds only — real custodian PINs are provisioned per-trustee
  // server-side and never hardcoded. These values are inert placeholders.
  { name: 'Shri Rameshwar Sharma', role: 'Chief Managing Trustee', pin: '••••' },
  { name: 'Dr. Sunita Varma', role: 'Audit & Accounts Trustee', pin: '••••' },
  { name: 'Acharya Vidyadhar Shastri', role: 'Head Purohit & Trustee', pin: '••••' },
  { name: 'Pandit Radhakant Dixit', role: 'Honorary Treasurer', pin: '••••' },
];

const INITIAL_SACRED_ASSETS: SacredAsset[] = [
  {
    id: 'SA-01',
    tagNumber: 'RB-GLD-001',
    assetName: 'Suvarna Kireetam (24K Pure Gold Crown with Navaratna Gemstones)',
    category: 'JEWELRY',
    metalType: '24K Gold',
    purityPercentage: 99.9,
    grossWeightGrams: 2450.50,
    netMetalWeightGrams: 2150.00,
    currentLocation: 'GARBHAGRIHA',
    lastAuditedDate: '2026-09-20',
    auditedBy: 'Shri Rameshwar Sharma (Chief Managing Trustee)',
    photoUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80',
    deityAssigned: 'Bhagwan Ram Lalla',
    approximateMarketValueINR: 16500000,
    donorName: 'Gupta Rajvansh Family Endowment',
    consecrationYear: 1982,
    condition: 'Pristine',
    securitySealNo: 'RB-SEAL-8821',
    notes: 'Preserved with 9 consecrated Vedic gemstones. Adorns the deity during Rajbhog Aarti.',
  },
  {
    id: 'SA-02',
    tagNumber: 'RB-VIG-002',
    assetName: 'Prachina Ashtadhatu Radha Krishna Utsav Vigraha (8-Metal Sacred Murtis)',
    category: 'VIGRAHA',
    metalType: 'Ashtadhatu',
    purityPercentage: 95.0,
    grossWeightGrams: 8400.00,
    netMetalWeightGrams: 8400.00,
    currentLocation: 'GARBHAGRIHA',
    lastAuditedDate: '2026-09-22',
    auditedBy: 'Acharya Vidyadhar Shastri (Head Purohit & Trustee)',
    photoUrl: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=600&q=80',
    deityAssigned: 'Shri Radha Krishna',
    approximateMarketValueINR: 4500000,
    donorName: 'Maharaja Kashi Naresh Trust (Historical)',
    consecrationYear: 1895,
    condition: 'Worship Grade',
    securitySealNo: 'RB-SEAL-1002',
    notes: 'Consecrated ancient Ashtadhatu deity pair with classical Shilpa Shastra proportions.',
  },
  {
    id: 'SA-03',
    tagNumber: 'RB-SLV-003',
    assetName: 'Maha Chandi Simhasan & Chhatra (Hallmarked Silver Throne & Royal Umbrella)',
    category: 'SILVERWARE',
    metalType: 'Silver',
    purityPercentage: 92.5,
    grossWeightGrams: 18500.00,
    netMetalWeightGrams: 17800.00,
    currentLocation: 'GARBHAGRIHA',
    lastAuditedDate: '2026-09-18',
    auditedBy: 'Dr. Sunita Varma (Audit & Accounts Trustee)',
    photoUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80',
    deityAssigned: 'Bhagwan Ram Lalla',
    approximateMarketValueINR: 1692000,
    donorName: 'Sarvajanik Ramotsav Committee',
    consecrationYear: 2005,
    condition: 'Pristine',
    securitySealNo: 'RB-SEAL-4491',
    notes: 'Masterfully carved silver simhasan depicting Dashavatara panels and engraved lotus crest.',
  },
  {
    id: 'SA-04',
    tagNumber: 'RB-GLD-004',
    assetName: 'Navaratna Haram & Padakkam (22K Gold Temple Necklace with Burmese Rubies)',
    category: 'JEWELRY',
    metalType: '22K Gold',
    purityPercentage: 91.6,
    grossWeightGrams: 980.20,
    netMetalWeightGrams: 820.00,
    currentLocation: 'STRONG_ROOM',
    lastAuditedDate: '2026-08-28',
    auditedBy: 'Pandit Radhakant Dixit (Honorary Treasurer)',
    photoUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=600&q=80',
    deityAssigned: 'Maa Janaki',
    approximateMarketValueINR: 5945000,
    donorName: 'Anonymous Bhakt (Vivah Sankalp Offering)',
    consecrationYear: 2012,
    condition: 'Pristine',
    securitySealNo: 'RB-SEAL-9014',
    notes: 'Vaulted in Strong Room Safe #A-14. Escorted to Garbhagriha exclusively during Sita Vivah Mahotsav.',
  },
  {
    id: 'SA-05',
    tagNumber: 'RB-SLV-005',
    assetName: 'Shodashopachara Chandi Arghya & Kalash Set (16-Piece Pure Silver Ritual Vessels)',
    category: 'SILVERWARE',
    metalType: 'Silver',
    purityPercentage: 99.0,
    grossWeightGrams: 6250.00,
    netMetalWeightGrams: 6250.00,
    currentLocation: 'STRONG_ROOM',
    lastAuditedDate: '2026-09-15',
    auditedBy: 'Shri Rameshwar Sharma (Chief Managing Trustee)',
    photoUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80',
    deityAssigned: 'Sanctum Daily Nitya Puja',
    approximateMarketValueINR: 575000,
    donorName: 'Mathura Seva Mandal',
    consecrationYear: 2016,
    condition: 'Pristine',
    securitySealNo: 'RB-SEAL-7711',
    notes: 'Includes Panchamrita Snana Patra, Shankha stand, and Karpura Arati dipa in pure 990 fine silver.',
  },
  {
    id: 'SA-06',
    tagNumber: 'RB-GLD-006',
    assetName: 'Suvarna Kolusu / Golden Nupur (Pair of 22K Gold Anklets with Sacred Ghungroos)',
    category: 'JEWELRY',
    metalType: '22K Gold',
    purityPercentage: 91.6,
    grossWeightGrams: 640.00,
    netMetalWeightGrams: 640.00,
    currentLocation: 'BANK_LOCKER',
    lastAuditedDate: '2026-07-10',
    auditedBy: 'Dr. Sunita Varma (Audit & Accounts Trustee)',
    photoUrl: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=600&q=80',
    deityAssigned: 'Maa Radharani',
    approximateMarketValueINR: 4480000,
    donorName: 'Vrindavan Dham Parikrama Sangha',
    consecrationYear: 2018,
    condition: 'Pristine',
    securitySealNo: 'RB-SEAL-3120',
    notes: 'Deposited in State Bank of India Temple Trust Joint Locker #402. Requires dual-trustee sign-off to retrieve.',
  },
  {
    id: 'SA-07',
    tagNumber: 'RB-GEM-007',
    assetName: 'Padmaraga Manikya & Nilam Padakkam (Natural Ceylonese Ruby & Sapphire Medallion)',
    category: 'GEMSTONES',
    metalType: '24K Gold',
    purityPercentage: 99.9,
    grossWeightGrams: 320.00,
    netMetalWeightGrams: 210.00,
    currentLocation: 'STRONG_ROOM',
    lastAuditedDate: '2026-09-02',
    auditedBy: 'Acharya Vidyadhar Shastri (Head Purohit & Trustee)',
    photoUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=600&q=80',
    deityAssigned: 'Lord Venkateswara',
    approximateMarketValueINR: 3800000,
    donorName: 'Tirumala Darshan Devotees Mandal',
    consecrationYear: 2021,
    condition: 'Pristine',
    securitySealNo: 'RB-SEAL-9932',
    notes: 'Certified unheated natural pigeon blood ruby (14.2 carats) and royal blue sapphire (11.8 carats).',
  },
];

const INITIAL_AUDIT_LOGS: PhysicalAuditLog[] = [
  {
    id: 'AUD-901',
    assetId: 'SA-01',
    assetTag: 'RB-GLD-001',
    assetName: 'Suvarna Kireetam (24K Pure Gold Crown)',
    auditDate: '2026-09-20',
    auditorTrustee: 'Shri Rameshwar Sharma',
    auditorRole: 'Chief Managing Trustee',
    verifiedGrossGrams: 2450.50,
    verifiedNetGrams: 2150.00,
    varianceGrams: 0.00,
    locationAtAudit: 'GARBHAGRIHA',
    status: 'VERIFIED_MATCH',
    notes: 'Physical digital weighing matched master register perfectly. Gemstone prongs intact.',
  },
  {
    id: 'AUD-902',
    assetId: 'SA-02',
    assetTag: 'RB-VIG-002',
    assetName: 'Prachina Ashtadhatu Radha Krishna Utsav Vigraha',
    auditDate: '2026-09-22',
    auditorTrustee: 'Acharya Vidyadhar Shastri',
    auditorRole: 'Head Purohit & Trustee',
    verifiedGrossGrams: 8400.00,
    verifiedNetGrams: 8400.00,
    varianceGrams: 0.00,
    locationAtAudit: 'GARBHAGRIHA',
    status: 'VERIFIED_MATCH',
    notes: 'Garbhagriha sanctum inspection. Sanctified patina observed; no metal degradation.',
  },
];

const ASSETS_STORAGE_KEY = 'sanatani_ratna_bhandar_assets';
const AUDITS_STORAGE_KEY = 'sanatani_ratna_bhandar_audit_logs';

export const RatnaBhandarAssetDesk: React.FC = () => {
  const inr = useInr();
  const wsCurrency = useWorkspaceCurrency();
  const { t } = useLanguage();
  const { activeWorkspace, currentUser, currentRole } = useAuthWorkspace();
  const { showToast } = useToast();
  const { openGuide } = useQuickGuide();
  const { promptBiometric, BiometricPromptModal } = useBiometricAuth();

  // Active View: 'GRID' | 'AUDIT_LOGS'
  const [activeTab, setActiveTab] = useState<'GRID' | 'AUDIT_LOGS'>('GRID');

  // Sacred Assets List (persisted in localStorage)
  const [assets, setAssets] = useState<SacredAsset[]>(() => {
    try {
      const saved = localStorage.getItem(ASSETS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_SACRED_ASSETS;
  });

  // Audit Logs (persisted in localStorage)
  const [auditLogs, setAuditLogs] = useState<PhysicalAuditLog[]>(() => {
    try {
      const saved = localStorage.getItem(AUDITS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_AUDIT_LOGS;
  });

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(ASSETS_STORAGE_KEY, JSON.stringify(assets));
    } catch (e) {}
  }, [assets]);

  useEffect(() => {
    try {
      localStorage.setItem(AUDITS_STORAGE_KEY, JSON.stringify(auditLogs));
    } catch (e) {}
  }, [auditLogs]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | 'ALL'>('ALL');
  const [selectedLocation, setSelectedLocation] = useState<AssetLocation | 'ALL'>('ALL');
  const [selectedMetal, setSelectedMetal] = useState<MetalType | 'ALL'>('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [auditTargetAsset, setAuditTargetAsset] = useState<SacredAsset | null>(null);
  const [relocateTargetAsset, setRelocateTargetAsset] = useState<SacredAsset | null>(null);
  const [inspectTargetAsset, setInspectTargetAsset] = useState<SacredAsset | null>(null);

  // Physical Audit Modal Form State
  const [auditTrusteeName, setAuditTrusteeName] = useState(PRESET_TRUSTEES[0].name);
  const [auditTrusteePin, setAuditTrusteePin] = useState('');
  const [showAuditPin, setShowAuditPin] = useState(false);
  const [auditGrossWeight, setAuditGrossWeight] = useState<number>(0);
  const [auditNetWeight, setAuditNetWeight] = useState<number>(0);
  const [auditAttestationChecked, setAuditAttestationChecked] = useState(false);
  const [auditNotesInput, setAuditNotesInput] = useState('');
  const [isSubmittingAudit, setIsSubmittingAudit] = useState(false);

  // Relocate Modal State
  const [newLocation, setNewLocation] = useState<AssetLocation>('GARBHAGRIHA');
  const [relocateReason, setRelocateReason] = useState('Festive Alankara Puja in Sanctum');
  const [relocateEscort, setRelocateEscort] = useState('Head Purohit & 2 Security Guards');

  // Add Asset Modal State
  const [newAssetName, setNewAssetName] = useState('');
  const [newTagNumber, setNewTagNumber] = useState('');
  const [newCategory, setNewCategory] = useState<AssetCategory>('JEWELRY');
  const [newMetalType, setNewMetalType] = useState<MetalType>('24K Gold');
  const [newPurity, setNewPurity] = useState<number>(99.9);
  const [newGrossGrams, setNewGrossGrams] = useState<number | ''>(500);
  const [newNetGrams, setNewNetGrams] = useState<number | ''>(480);
  const [newLocationVal, setNewLocationVal] = useState<AssetLocation>('STRONG_ROOM');
  const [newDeity, setNewDeity] = useState('Bhagwan Ram Lalla');
  const [newDonor, setNewDonor] = useState('');
  const [newConsecrationYear, setNewConsecrationYear] = useState<number>(2026);
  const [newEstimatedValue, setNewEstimatedValue] = useState<number | ''>(3500000);
  const [newCondition, setNewCondition] = useState<'Pristine' | 'Worship Grade' | 'Needs Cleansing / Polishing'>('Pristine');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Auto-generate tag when category/metal changes in Add Modal
  const generateSuggestedTag = (cat: AssetCategory, metal: MetalType) => {
    const prefix = cat === 'VIGRAHA' ? 'VIG' : metal.includes('Gold') ? 'GLD' : metal === 'Silver' ? 'SLV' : 'GEM';
    const rand = Math.floor(100 + Math.random() * 900);
    return `RB-${prefix}-${rand}`;
  };

  const handleOpenAddModal = () => {
    setNewTagNumber(generateSuggestedTag(newCategory, newMetalType));
    setIsAddModalOpen(true);
  };

  // Open Physical Audit Modal
  const handleOpenAuditModal = (asset: SacredAsset) => {
    setAuditTargetAsset(asset);
    setAuditGrossWeight(asset.grossWeightGrams);
    setAuditNetWeight(asset.netMetalWeightGrams);
    setAuditTrusteePin('');
    setShowAuditPin(false);
    setAuditAttestationChecked(false);
    setAuditNotesInput('Physical weight verified on certified calibrated scale. Ornaments inspected in pristine condition.');
  };

  // Open Relocate Modal
  const handleOpenRelocateModal = (asset: SacredAsset) => {
    setRelocateTargetAsset(asset);
    setNewLocation(asset.currentLocation === 'GARBHAGRIHA' ? 'STRONG_ROOM' : 'GARBHAGRIHA');
    setRelocateReason('Ritual adornment schedule authorization');
    setRelocateEscort('Head Priest & Mandir Security Guard');
  };

  // =========================================================================
  // TOP METRICS CALCULATIONS
  // =========================================================================
  const metrics = useMemo(() => {
    let totalGoldGrams = 0;
    let totalSilverGrams = 0;
    let totalAshtadhatuGrams = 0;
    let totalValuation = 0;

    assets.forEach((a) => {
      totalValuation += a.approximateMarketValueINR || 0;
      if (a.metalType.includes('Gold')) {
        totalGoldGrams += a.netMetalWeightGrams;
      } else if (a.metalType === 'Silver') {
        totalSilverGrams += a.netMetalWeightGrams;
      } else if (a.metalType === 'Ashtadhatu') {
        totalAshtadhatuGrams += a.netMetalWeightGrams;
      }
    });

    const totalGoldKg = totalGoldGrams / 1000;
    const totalSilverKg = totalSilverGrams / 1000;
    const totalAssetsCount = assets.length;

    // Check audits completed today (current date YYYY-MM-DD: 2026-09-24)
    const todayStr = new Date().toISOString().slice(0, 10);
    const auditedTodayCount = assets.filter((a) => a.lastAuditedDate === todayStr).length;

    return {
      totalGoldGrams,
      totalGoldKg,
      totalSilverGrams,
      totalSilverKg,
      totalAshtadhatuGrams,
      totalValuation,
      totalAssetsCount,
      auditedTodayCount,
    };
  }, [assets]);

  // =========================================================================
  // FILTERED ASSETS
  // =========================================================================
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        asset.assetName.toLowerCase().includes(q) ||
        asset.tagNumber.toLowerCase().includes(q) ||
        asset.deityAssigned.toLowerCase().includes(q) ||
        asset.metalType.toLowerCase().includes(q) ||
        (asset.donorName && asset.donorName.toLowerCase().includes(q));

      const matchCategory = selectedCategory === 'ALL' || asset.category === selectedCategory;
      const matchLocation = selectedLocation === 'ALL' || asset.currentLocation === selectedLocation;
      const matchMetal = selectedMetal === 'ALL' || asset.metalType === selectedMetal;

      return matchQuery && matchCategory && matchLocation && matchMetal;
    });
  }, [assets, searchQuery, selectedCategory, selectedLocation, selectedMetal]);

  // =========================================================================
  // PHYSICAL AUDIT SUBMISSION WITH TRUSTEE PIN VERIFICATION
  // =========================================================================
  const handleExecutePhysicalAudit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditTargetAsset) return;

    if (!auditAttestationChecked) {
      showToast('Please check the solemn physical attestation oath declaration.', 'error');
      return;
    }

    // PIN Verification
    const matchedTrustee = PRESET_TRUSTEES.find((t) => t.name === auditTrusteeName);
    const expectedPin = matchedTrustee?.pin || '';
    // Fail closed: no configured PIN means no access (never fall back to a default).

    if (auditTrusteePin.trim() !== expectedPin) {
      showToast('Invalid Trustee Security PIN! Physical audit authorization denied.', 'error');
      return;
    }

    setIsSubmittingAudit(true);

    try {
      const todayDate = new Date().toISOString().slice(0, 10); // '2026-09-24'
      const variance = Number((auditGrossWeight - auditTargetAsset.grossWeightGrams).toFixed(2));

      // 1. Update Asset in State
      setAssets((prev) =>
        prev.map((item) =>
          item.id === auditTargetAsset.id
            ? {
                ...item,
                lastAuditedDate: todayDate,
                auditedBy: `${auditTrusteeName} (${matchedTrustee?.role || 'Trustee'})`,
                grossWeightGrams: auditGrossWeight,
                netMetalWeightGrams: auditNetWeight,
              }
            : item
        )
      );

      // 2. Append Physical Audit Log
      const newLog: PhysicalAuditLog = {
        id: `AUD-${Date.now().toString().slice(-6)}`,
        assetId: auditTargetAsset.id,
        assetTag: auditTargetAsset.tagNumber,
        assetName: auditTargetAsset.assetName,
        auditDate: todayDate,
        auditorTrustee: auditTrusteeName,
        auditorRole: matchedTrustee?.role || 'Custodian Trustee',
        verifiedGrossGrams: auditGrossWeight,
        verifiedNetGrams: auditNetWeight,
        varianceGrams: variance,
        locationAtAudit: auditTargetAsset.currentLocation,
        status: Math.abs(variance) <= 0.05 ? 'VERIFIED_MATCH' : 'DISCREPANCY_FLAGGED',
        authMethod: 'PIN',
        notes: auditNotesInput.trim() || 'Physical audit confirmed with calibrated digital scale.',
      };

      setAuditLogs((prev) => [newLog, ...prev]);

      showToast(
        `Physical Audit verified for ${auditTargetAsset.tagNumber}! Signed by ${auditTrusteeName} via Security PIN.`,
        'success'
      );

      setAuditTargetAsset(null);
    } catch (err) {
      console.error(err);
      showToast('Error recording audit verification.', 'error');
    } finally {
      setIsSubmittingAudit(false);
    }
  };

  // BIOMETRIC AUDIT VERIFICATION (FaceID / TouchID Bypass)
  const handleBiometricAuditVerify = async () => {
    if (!auditTargetAsset) return;

    if (!auditAttestationChecked) {
      showToast('Please check the solemn physical attestation oath declaration before biometric signing.', 'error');
      return;
    }

    try {
      const verified = await promptBiometric('Asset Audit');
      if (!verified) {
        showToast('Biometric verification cancelled or unavailable.', 'error');
        return;
      }

      setIsSubmittingAudit(true);
      const matchedTrustee = PRESET_TRUSTEES.find((t) => t.name === auditTrusteeName);
      const todayDate = new Date().toISOString().slice(0, 10);
      const variance = Number((auditGrossWeight - auditTargetAsset.grossWeightGrams).toFixed(2));

      // 1. Update Asset in State
      setAssets((prev) =>
        prev.map((item) =>
          item.id === auditTargetAsset.id
            ? {
                ...item,
                lastAuditedDate: todayDate,
                auditedBy: `${auditTrusteeName} (${matchedTrustee?.role || 'Trustee'}) [Biometric]`,
                grossWeightGrams: auditGrossWeight,
                netMetalWeightGrams: auditNetWeight,
              }
            : item
        )
      );

      // 2. Append Physical Audit Log with explicit authMethod: 'BIOMETRIC'
      const newLog: PhysicalAuditLog = {
        id: `AUD-${Date.now().toString().slice(-6)}`,
        assetId: auditTargetAsset.id,
        assetTag: auditTargetAsset.tagNumber,
        assetName: auditTargetAsset.assetName,
        auditDate: todayDate,
        auditorTrustee: auditTrusteeName,
        auditorRole: matchedTrustee?.role || 'Custodian Trustee',
        verifiedGrossGrams: auditGrossWeight,
        verifiedNetGrams: auditNetWeight,
        varianceGrams: variance,
        locationAtAudit: auditTargetAsset.currentLocation,
        status: Math.abs(variance) <= 0.05 ? 'VERIFIED_MATCH' : 'DISCREPANCY_FLAGGED',
        authMethod: 'BIOMETRIC',
        notes: auditNotesInput.trim()
          ? `${auditNotesInput.trim()} (Biometric Verified)`
          : 'Physical audit confirmed with calibrated digital scale under WebAuthn FaceID/TouchID cryptographic attestation.',
      };

      setAuditLogs((prev) => [newLog, ...prev]);

      showToast(
        `Physical Audit verified for ${auditTargetAsset.tagNumber}! Cryptographically signed by ${auditTrusteeName} via Biometrics (FaceID/TouchID).`,
        'success'
      );

      setAuditTargetAsset(null);
    } catch (err) {
      console.error(err);
      showToast('Biometric verification encountered an error.', 'error');
    } finally {
      setIsSubmittingAudit(false);
    }
  };

  // =========================================================================
  // RELOCATE ASSET SUBMISSION
  // =========================================================================
  const handleExecuteRelocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!relocateTargetAsset) return;

    const oldLoc = relocateTargetAsset.currentLocation;
    setAssets((prev) =>
      prev.map((item) =>
        item.id === relocateTargetAsset.id
          ? {
              ...item,
              currentLocation: newLocation,
              notes: `${item.notes || ''} [Relocated from ${oldLoc} to ${newLocation} on ${new Date().toISOString().slice(0, 10)}: ${relocateReason}]`.trim(),
            }
          : item
      )
    );

    showToast(`Relocated ${relocateTargetAsset.tagNumber} to ${newLocation}!`, 'success');
    setRelocateTargetAsset(null);
  };

  // =========================================================================
  // ADD NEW ASSET SUBMISSION
  // =========================================================================
  const handleCreateAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetName.trim() || !newGrossGrams || !newNetGrams) {
      showToast('Please provide Asset Name, Gross Weight and Net Weight.', 'error');
      return;
    }

    const todayDate = new Date().toISOString().slice(0, 10);
    const newRecord: SacredAsset = {
      id: `SA-${Date.now().toString().slice(-4)}`,
      tagNumber: newTagNumber.trim() || generateSuggestedTag(newCategory, newMetalType),
      assetName: newAssetName.trim(),
      category: newCategory,
      metalType: newMetalType,
      purityPercentage: Number(newPurity) || 99.9,
      grossWeightGrams: Number(newGrossGrams),
      netMetalWeightGrams: Number(newNetGrams),
      currentLocation: newLocationVal,
      lastAuditedDate: todayDate,
      auditedBy: `${currentUser?.name || 'Chief Managing Trustee'} (Initial Inward Record)`,
      photoUrl:
        newPhotoUrl.trim() ||
        (newCategory === 'VIGRAHA'
          ? 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=600&q=80'
          : newMetalType === 'Silver'
          ? 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=600&q=80'
          : 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80'),
      deityAssigned: newDeity.trim() || 'Presiding Deity Altar',
      approximateMarketValueINR: Number(newEstimatedValue) || 100000,
      donorName: newDonor.trim() || undefined,
      consecrationYear: Number(newConsecrationYear) || 2026,
      condition: newCondition,
      securitySealNo: `RB-SEAL-${Math.floor(1000 + Math.random() * 9000)}`,
      notes: newNotes.trim() || 'Inward consecrated offering added to Ratna Bhandar Sacred Asset Register.',
    };

    setAssets((prev) => [newRecord, ...prev]);
    setIsAddModalOpen(false);

    // Reset Form
    setNewAssetName('');
    setNewGrossGrams(500);
    setNewNetGrams(480);
    setNewDonor('');
    setNewNotes('');

    showToast(`New Sacred Asset ${newRecord.tagNumber} registered in Ratna Bhandar Vault!`, 'success');
  };

  // Helper for Location Badge Styling
  const getLocationBadge = (loc: AssetLocation) => {
    switch (loc) {
      case 'GARBHAGRIHA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 border border-amber-500/40 text-amber-300 shadow-sm">
            <Flame className="w-3 h-3 text-amber-400" />
            <span>Garbhagriha (Sanctum Altar)</span>
          </span>
        );
      case 'STRONG_ROOM':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/15 border border-blue-500/40 text-blue-300 shadow-sm">
            <Lock className="w-3 h-3 text-blue-400" />
            <span>Temple Strong Room Safe</span>
          </span>
        );
      case 'BANK_LOCKER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 shadow-sm">
            <Building className="w-3 h-3 text-emerald-400" />
            <span>Bank Custody Locker</span>
          </span>
        );
    }
  };

  // Helper for Category Badge Styling
  const getCategoryBadge = (cat: AssetCategory) => {
    switch (cat) {
      case 'JEWELRY':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-400/10 text-amber-300 border border-amber-400/20">Jewellery</span>;
      case 'VIGRAHA':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-400/10 text-purple-300 border border-purple-400/20">{t('org.finance.ratnaBhandar.sacredVigraha')}</span>;
      case 'SILVERWARE':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-300/15 text-slate-200 border border-slate-300/30">Silverware</span>;
      case 'GEMSTONES':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-400/10 text-rose-300 border border-rose-400/20">Gemstones</span>;
    }
  };

  // Check if audited today
  const isAuditedToday = (dateStr: string) => {
    const today = new Date().toISOString().slice(0, 10);
    return dateStr === today;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
      {/* =====================================================================
          VAULT DESK HEADER BANNER
      ===================================================================== */}
      <div className="bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 p-6 sm:p-7 rounded-3xl border border-amber-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-yellow-600/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-400/10 to-transparent border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
              <Sparkles className="w-8 h-8 text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1.5 shadow-sm">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  RATNA BHANDAR VAULT • DUAL CUSTODY
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  STRONG ROOM SECURE • TRUSTEE VERIFIED
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-amber-100 tracking-tight mt-1 flex items-center gap-2">
                <span>{t('org.finance.ratnaBhandar.ratnaBhandarSacredAssetDesk')}</span>
                <span className="text-xs font-normal text-amber-400/80 font-mono hidden sm:inline">(रत्नभाण्डागारम्)</span>
              </h1>
              <p className="text-xs text-stone-400 mt-0.5">
                Custody of Consecrated Deity Crowns, Sacred Vigrahas & Bullion • Physical Weighing & Trustee PIN Verification
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto justify-start lg:justify-end">
            {/* Quick Guide / SOP Button */}
            <button
              type="button"
              onClick={() => openGuide('RATNA_BHANDAR')}
              className="px-3.5 py-2.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
              title="Open Shastric & Statutory Quick Guide (SOP) for Ratna Bhandar"
            >
              <span className="text-sm">💡</span>
              <span>Quick Guide / SOP</span>
            </button>

            {/* Add Asset Button */}
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-lg active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{t('org.finance.ratnaBhandar.addSacredAsset')}</span>
            </button>

            {/* Print Register Button */}
            <button
              type="button"
              onClick={() => window.print()}
              className="p-2.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-800 text-xs font-bold transition-colors cursor-pointer"
              title="Print Sacred Asset Register"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* View Switcher Tabs: Grid vs Audit Logs */}
        <div className="mt-6 pt-5 border-t border-stone-800/80 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 bg-stone-900/90 p-1 rounded-2xl border border-stone-800">
            <button
              type="button"
              onClick={() => setActiveTab('GRID')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'GRID'
                  ? 'bg-amber-500 text-stone-950 font-black shadow'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>{t('org.finance.ratnaBhandar.sacredAssetsVaultGrid')}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-stone-950/40 text-[10px] text-stone-900 font-mono font-bold">
                {assets.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('AUDIT_LOGS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'AUDIT_LOGS'
                  ? 'bg-amber-500 text-stone-950 font-black shadow'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <History className="w-4 h-4" />
              <span>{t('org.finance.ratnaBhandar.physicalAuditRegisterLogs')}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-stone-800 text-[10px] text-amber-300 font-mono">
                {auditLogs.length}
              </span>
            </button>
          </div>

          <div className="text-xs text-stone-400 flex items-center gap-2">
            <span className="text-[11px] font-mono bg-stone-900 px-3 py-1 rounded-xl border border-stone-800">
              Gold Ref Rate: <strong className="text-amber-300 font-bold">₹7,450/g (24K)</strong>
            </span>
            <span className="text-[11px] font-mono bg-stone-900 px-3 py-1 rounded-xl border border-stone-800">
              Silver Ref: <strong className="text-slate-200 font-bold">₹94/g</strong>
            </span>
          </div>
        </div>
      </div>

      {/* =====================================================================
          TOP METRICS SUMMARY CARDS
      ===================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Total Gold Weight */}
        <div className="bg-stone-900/90 border border-amber-500/25 p-4 sm:p-5 rounded-3xl relative overflow-hidden shadow-lg group hover:border-amber-400/50 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none group-hover:bg-amber-500/20 transition-all" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-400" />{t('org.finance.ratnaBhandar.totalGoldWeight')}</span>
            <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              24K + 22K
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-200 font-mono tracking-tight">
              {metrics.totalGoldKg.toFixed(3)}
            </span>
            <span className="text-sm font-bold text-amber-400">kg</span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1 font-mono">
            {metrics.totalGoldGrams.toLocaleString('en-IN', { maximumFractionDigits: 1 })} grams net bullion
          </p>
        </div>

        {/* Metric 2: Total Silver Weight */}
        <div className="bg-stone-900/90 border border-slate-400/20 p-4 sm:p-5 rounded-3xl relative overflow-hidden shadow-lg group hover:border-slate-300/40 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-slate-300/10 rounded-full blur-xl pointer-events-none group-hover:bg-slate-300/20 transition-all" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-slate-300" />{t('org.finance.ratnaBhandar.totalSilverWeight')}</span>
            <span className="text-[10px] font-mono text-slate-300 bg-slate-500/10 px-2 py-0.5 rounded-full border border-slate-400/20">
              925 Fine
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-100 font-mono tracking-tight">
              {metrics.totalSilverKg.toFixed(3)}
            </span>
            <span className="text-sm font-bold text-slate-300">kg</span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1 font-mono">
            {metrics.totalSilverGrams.toLocaleString('en-IN', { maximumFractionDigits: 1 })} grams pure silver
          </p>
        </div>

        {/* Metric 3: Total Assets Count */}
        <div className="bg-stone-900/90 border border-stone-800 p-4 sm:p-5 rounded-3xl relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-400" />{t('org.finance.ratnaBhandar.totalSacredAssets')}</span>
            <span className="text-[10px] font-mono text-stone-400 bg-stone-800 px-2 py-0.5 rounded-full">
              Registered
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
              {metrics.totalAssetsCount}
            </span>
            <span className="text-sm font-bold text-stone-400">Items</span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            {assets.filter((a) => a.currentLocation === 'GARBHAGRIHA').length} in Sanctum • {assets.filter((a) => a.currentLocation === 'STRONG_ROOM').length} in Safe
          </p>
        </div>

        {/* Metric 4: Estimated Valuation */}
        <div className="bg-stone-900/90 border border-amber-500/25 p-4 sm:p-5 rounded-3xl relative overflow-hidden shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />{t('org.finance.ratnaBhandar.totalBullionValuation')}</span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              CBDT Insured
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-bold text-amber-400 font-mono">{wsCurrency.symbol}</span>
            <span className="text-2xl sm:text-3xl font-black text-amber-200 font-mono tracking-tight">
              {(metrics.totalValuation / 10000000).toFixed(2)}
            </span>
            <span className="text-sm font-bold text-amber-300">Cr</span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1 font-mono">
            {inr(metrics.totalValuation)} book value
          </p>
        </div>
      </div>

      {/* =====================================================================
          TAB 1: ASSETS GRID VIEW
      ===================================================================== */}
      {activeTab === 'GRID' && (
        <div className="space-y-6">
          {/* Search, Category & Location Filter Controls */}
          <div className="bg-stone-900/90 p-4 rounded-3xl border border-stone-800 space-y-3 shadow-md">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by asset name, tag number (e.g. RB-GLD-001), deity, metal or donor..."
                  className="w-full bg-stone-950 border border-stone-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 transition-colors shadow-inner"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Location Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                {(['ALL', 'GARBHAGRIHA', 'STRONG_ROOM', 'BANK_LOCKER'] as const).map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setSelectedLocation(loc)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      selectedLocation === loc
                        ? 'bg-amber-500 text-stone-950 font-black shadow'
                        : 'bg-stone-950 text-stone-400 hover:text-white border border-stone-800'
                    }`}
                  >
                    {loc === 'ALL'
                      ? 'All Locations'
                      : loc === 'GARBHAGRIHA'
                      ? 'Sanctum Altar'
                      : loc === 'STRONG_ROOM'
                      ? 'Strong Room'
                      : 'Bank Locker'}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-stone-800/80">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-stone-400 flex items-center gap-1 mr-1">
                  <Filter className="w-3.5 h-3.5 text-amber-400" />{t('org.finance.ratnaBhandar.category')}</span>
                {(['ALL', 'JEWELRY', 'VIGRAHA', 'SILVERWARE', 'GEMSTONES'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-amber-400/20 border border-amber-400/50 text-amber-300 font-bold'
                        : 'bg-stone-950 text-stone-400 hover:text-white border border-stone-800'
                    }`}
                  >
                    {cat === 'ALL' ? 'All Categories' : cat}
                  </button>
                ))}
              </div>

              {/* Result Count */}
              <span className="text-[11px] text-stone-400 font-mono">
                Showing <strong>{filteredAssets.length}</strong> of {assets.length} assets
              </span>
            </div>
          </div>

          {/* =================================================================
              GRID OF ASSET CARDS
          ================================================================= */}
          {filteredAssets.length === 0 ? (
            <div className="bg-stone-900/60 border border-stone-800 rounded-3xl p-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <Sparkles className="w-8 h-8 opacity-60" />
              </div>
              <h3 className="text-base font-bold text-white">{t('org.finance.ratnaBhandar.noSacredAssetsMatched')}</h3>
              <p className="text-xs text-stone-400 max-w-md mx-auto">
                Try modifying your search query or reset your category and location filters to inspect the vault assets.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('ALL');
                  setSelectedLocation('ALL');
                  setSelectedMetal('ALL');
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 text-stone-950 font-bold text-xs cursor-pointer inline-flex items-center gap-1.5 shadow"
              >{t('org.finance.ratnaBhandar.resetAllFilters')}</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredAssets.map((asset) => {
                const auditedToday = isAuditedToday(asset.lastAuditedDate);

                return (
                  <div
                    key={asset.id}
                    className="bg-stone-900/90 rounded-3xl border border-stone-800 hover:border-amber-500/40 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-xl group hover:shadow-2xl hover:shadow-amber-500/5 relative"
                  >
                    {/* Top Photo & Badges */}
                    <div className="relative h-48 w-full bg-stone-950 overflow-hidden">
                      <img
                        src={asset.photoUrl}
                        alt={asset.assetName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                        onError={(e) => {
                          // Fallback to placeholder if image fails
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />

                      {/* Floating Badges */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap z-10">
                        <span className="font-mono text-[10px] font-black tracking-wider bg-stone-950/90 text-amber-300 px-2.5 py-1 rounded-xl border border-amber-500/30 backdrop-blur-sm shadow">
                          {asset.tagNumber}
                        </span>
                        {getCategoryBadge(asset.category)}
                      </div>

                      {/* Location Badge on Top Right */}
                      <div className="absolute top-3 right-3 z-10">
                        {getLocationBadge(asset.currentLocation)}
                      </div>

                      {/* Deity Designation */}
                      <div className="absolute bottom-2.5 left-3.5 right-3.5 z-10">
                        <span className="text-[11px] font-black uppercase text-amber-300 flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-amber-400" />
                          {asset.deityAssigned}
                        </span>
                        <h3 className="text-sm font-black text-white leading-snug line-clamp-1 drop-shadow-md">
                          {asset.assetName}
                        </h3>
                      </div>
                    </div>

                    {/* Card Body: Metal Specs, Weights & Valuation */}
                    <div className="p-4 sm:p-5 space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-3">
                        {/* Gross Weight vs Net Metal Weight Matrix */}
                        <div className="grid grid-cols-2 gap-2 bg-stone-950/90 p-3 rounded-2xl border border-stone-800">
                          <div>
                            <span className="text-[10px] font-bold text-stone-400 block uppercase tracking-wider">
                              Gross Weight
                            </span>
                            <span className="text-base font-black text-amber-200 font-mono">
                              {asset.grossWeightGrams.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-stone-400 font-bold ml-1">g</span>
                          </div>
                          <div className="border-l border-stone-800 pl-2.5">
                            <span className="text-[10px] font-bold text-stone-400 block uppercase tracking-wider">
                              Net Metal ({asset.metalType})
                            </span>
                            <span className="text-base font-black text-white font-mono">
                              {asset.netMetalWeightGrams.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-stone-400 font-bold ml-1">g</span>
                          </div>
                        </div>

                        {/* Valuation & Purity */}
                        <div className="flex items-center justify-between text-xs px-1">
                          <span className="text-stone-400">
                            Purity: <strong className="text-amber-300 font-bold">{asset.purityPercentage}%</strong> ({asset.metalType})
                          </span>
                          <span className="text-stone-400">
                            Book Est: <strong className="text-emerald-400 font-mono font-bold">{inr(asset.approximateMarketValueINR)}</strong>
                          </span>
                        </div>

                        {/* Physical Audit Status Banner */}
                        <div
                          className={`p-2.5 rounded-2xl border text-xs flex items-center justify-between gap-2 ${
                            auditedToday
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                              : 'bg-stone-950 border-stone-800 text-stone-400'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            {auditedToday ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : (
                              <Clock className="w-4 h-4 text-amber-400/80 shrink-0" />
                            )}
                            <div className="min-w-0 truncate">
                              <span className="font-bold text-[11px] block truncate">
                                {auditedToday ? 'Physically Audited Today' : `Last Audit: ${asset.lastAuditedDate}`}
                              </span>
                              <span className="text-[10px] text-stone-400 truncate block">
                                By: {asset.auditedBy.split('(')[0].trim()}
                              </span>
                            </div>
                          </div>

                          {auditedToday && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold font-mono">
                              VERIFIED
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-2 border-t border-stone-800/80 flex items-center gap-2">
                        {/* Perform Physical Audit Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenAuditModal(asset)}
                          className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                        >
                          <Scale className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>{t('org.finance.ratnaBhandar.verifyAssetAudit')}</span>
                        </button>

                        {/* Relocate Location Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenRelocateModal(asset)}
                          className="p-2.5 rounded-xl bg-stone-950 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-800 transition-colors cursor-pointer"
                          title="Relocate Asset (Sanctum / Safe / Bank)"
                        >
                          <MapPin className="w-4 h-4 text-amber-400" />
                        </button>

                        {/* Inspect Details Button */}
                        <button
                          type="button"
                          onClick={() => setInspectTargetAsset(asset)}
                          className="p-2.5 rounded-xl bg-stone-950 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-800 transition-colors cursor-pointer"
                          title="Inspect Detailed Specifications"
                        >
                          <Eye className="w-4 h-4 text-stone-300" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 2: PHYSICAL AUDIT REGISTER LOGS
      ===================================================================== */}
      {activeTab === 'AUDIT_LOGS' && (
        <div className="bg-stone-900/90 rounded-3xl border border-stone-800 shadow-xl overflow-hidden space-y-4 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-amber-100 flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                <span>{t('org.finance.ratnaBhandar.physicalVaultVerificationAuditRegister')}</span>
              </h2>
              <p className="text-xs text-stone-400">
                Statutory audit log of physical weighing sessions co-signed by Mandir Trustees under Section 36 of Indian Trusts Act.
              </p>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 self-start"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>{t('org.finance.ratnaBhandar.printAuditRegister')}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-800 text-stone-400 uppercase text-[10px] font-black tracking-wider bg-stone-950/60">
                  <th className="py-3 px-4">{t('org.finance.ratnaBhandar.auditIdDate')}</th>
                  <th className="py-3 px-4">{t('org.finance.ratnaBhandar.assetTagName')}</th>
                  <th className="py-3 px-4">{t('org.finance.ratnaBhandar.auditorTrustee')}</th>
                  <th className="py-3 px-4">Verified Gross</th>
                  <th className="py-3 px-4">Verified Net</th>
                  <th className="py-3 px-4">Variance</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">{t('org.finance.ratnaBhandar.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 font-mono text-stone-300">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-800/30 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-bold text-white block">{log.id}</span>
                      <span className="text-[10px] text-stone-500">{log.auditDate}</span>
                    </td>
                    <td className="py-3 px-4 font-sans max-w-xs">
                      <span className="font-mono text-amber-300 font-bold text-[11px] block">{log.assetTag}</span>
                      <span className="text-white text-xs truncate block">{log.assetName}</span>
                    </td>
                    <td className="py-3 px-4 font-sans whitespace-nowrap">
                      <span className="font-bold text-stone-200 block">{log.auditorTrustee}</span>
                      <span className="text-[10px] text-amber-400/90">{log.auditorRole}</span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-amber-300 font-bold">
                      {log.verifiedGrossGrams.toFixed(2)}g
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-white">
                      {log.verifiedNetGrams.toFixed(2)}g
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`font-bold ${
                          log.varianceGrams === 0
                            ? 'text-emerald-400'
                            : log.varianceGrams > 0
                            ? 'text-blue-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {log.varianceGrams >= 0 ? `+${log.varianceGrams.toFixed(2)}` : log.varianceGrams.toFixed(2)}g
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans whitespace-nowrap">
                      {getLocationBadge(log.locationAtAudit)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          {log.status === 'VERIFIED_MATCH' ? 'MATCH' : 'FLAGGED'}
                        </span>
                        {log.authMethod === 'BIOMETRIC' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                            <Fingerprint className="w-2.5 h-2.5 text-amber-400" />
                            BIOMETRIC
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 1: PHYSICAL AUDIT WITH TRUSTEE PIN VERIFICATION
      ===================================================================== */}
      {auditTargetAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-stone-900 border border-amber-500/40 rounded-3xl p-6 sm:p-7 max-w-xl w-full shadow-2xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-stone-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Scale className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider font-bold">{t('org.finance.ratnaBhandar.physicalWeighingAuditVerification')}</span>
                  <h3 className="text-lg font-black text-white">
                    {auditTargetAsset.assetName}
                  </h3>
                  <span className="text-xs font-mono text-stone-400">
                    Tag: {auditTargetAsset.tagNumber} • Location: {auditTargetAsset.currentLocation}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAuditTargetAsset(null)}
                className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecutePhysicalAudit} className="space-y-4">
              {/* Recorded vs Today's Verified Scale Inputs */}
              <div className="grid grid-cols-2 gap-3 bg-stone-950 p-4 rounded-2xl border border-stone-800">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-amber-400 block mb-1">
                    Verified Gross Weight (g)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={auditGrossWeight}
                    onChange={(e) => setAuditGrossWeight(Number(e.target.value))}
                    className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-base font-black text-amber-200 font-mono focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-stone-400 block mt-1 font-mono">
                    Master Reg: {auditTargetAsset.grossWeightGrams.toFixed(2)}g
                  </span>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-amber-400 block mb-1">
                    Verified Net Metal (g)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={auditNetWeight}
                    onChange={(e) => setAuditNetWeight(Number(e.target.value))}
                    className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-base font-black text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-stone-400 block mt-1 font-mono">
                    Master Reg: {auditTargetAsset.netMetalWeightGrams.toFixed(2)}g
                  </span>
                </div>
              </div>

              {/* Variance Indicator */}
              <div className="flex items-center justify-between text-xs px-2">
                <span className="text-stone-400">Scale Variance:</span>
                <span
                  className={`font-mono font-bold ${
                    Math.abs(auditGrossWeight - auditTargetAsset.grossWeightGrams) <= 0.05
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}
                >
                  {(auditGrossWeight - auditTargetAsset.grossWeightGrams).toFixed(2)}g (
                  {Math.abs(auditGrossWeight - auditTargetAsset.grossWeightGrams) <= 0.05
                    ? 'Exact Weight Match'
                    : 'Discrepancy Detected'}
                  )
                </span>
              </div>

              {/* Trustee Selection & Security PIN */}
              <div className="space-y-3 bg-stone-950/70 p-4 rounded-2xl border border-stone-800">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block mb-1">{t('org.finance.ratnaBhandar.auditingTrusteeCustodian')}</label>
                  <select
                    value={auditTrusteeName}
                    onChange={(e) => setAuditTrusteeName(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    {PRESET_TRUSTEES.map((t) => (
                      <option key={t.name} value={t.name}>
                        {t.name} — {t.role}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                      <KeyRound className="w-3 h-3 text-amber-400" />{t('org.finance.ratnaBhandar.trusteeSecurityPin4digits')}</label>
                    <span className="text-[10px] text-stone-500 font-mono">Default: 1008 or 1234</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showAuditPin ? 'text' : 'password'}
                      maxLength={4}
                      placeholder="Enter 4-digit PIN..."
                      value={auditTrusteePin}
                      onChange={(e) => setAuditTrusteePin(e.target.value)}
                      className="w-full bg-stone-900 border border-amber-500/40 rounded-xl px-3 py-2.5 text-center font-mono text-lg font-black tracking-widest text-amber-300 focus:outline-none focus:border-amber-400 shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAuditPin(!showAuditPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white"
                    >
                      {showAuditPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* BIOMETRIC AUTHENTICATION OPTION */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-stone-900 to-emerald-950/40 border border-emerald-500/40 text-center space-y-2">
                <div className="flex items-center justify-between text-xs text-emerald-300">
                  <span className="font-bold flex items-center gap-1.5">
                    <Fingerprint className="w-4 h-4 text-emerald-400" />
                    Hardware Biometric Sign-off
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    TouchID / FaceID
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleBiometricAuditVerify}
                  disabled={isSubmittingAudit}
                  className="group relative w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs tracking-wider transition-all shadow-lg hover:shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 border border-emerald-400/40"
                >
                  <div className="relative flex items-center justify-center">
                    <Scan className="w-4 h-4 text-emerald-100 group-hover:scale-110 transition-transform" />
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-200"></span>
                    </span>
                  </div>
                  <span>👁️ / 👆 Verify with Biometrics (FaceID/TouchID)</span>
                </button>
                <p className="text-[10px] text-stone-400">
                  Bypasses manual PIN entry with cryptographically signed hardware verification.
                </p>
              </div>

              {/* Solemn Oath Checkbox */}
              <label className="flex items-start gap-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={auditAttestationChecked}
                  onChange={(e) => setAuditAttestationChecked(e.target.checked)}
                  className="mt-1 rounded border-stone-700 text-amber-500 focus:ring-amber-500 bg-stone-900 cursor-pointer"
                />
                <span className="text-xs text-amber-200 leading-snug">
                  <strong>Solemn Shastric Oath:</strong> I solemnly declare under temple witness that I have personally opened the vault/sanctum, inspected, and verified the physical presence and calibrated weight of this sacred asset today ({new Date().toISOString().slice(0, 10)}).
                </span>
              </label>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAuditTargetAsset(null)}
                  className="flex-1 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition-colors cursor-pointer"
                >{t('org.finance.ratnaBhandar.cancel')}</button>
                <button
                  type="submit"
                  disabled={isSubmittingAudit}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs transition-all shadow-lg cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                  <span>{isSubmittingAudit ? 'Signing Audit...' : 'Confirm Physical Audit'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: RELOCATE ASSET (GARBHAGRIHA / STRONG ROOM / BANK)
      ===================================================================== */}
      {relocateTargetAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-stone-900 border border-amber-500/40 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-stone-800 pb-4">
              <div>
                <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider font-bold">{t('org.finance.ratnaBhandar.custodyTransferRelocation')}</span>
                <h3 className="text-lg font-black text-white">
                  Move {relocateTargetAsset.assetName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRelocateTargetAsset(null)}
                className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteRelocation} className="space-y-4">
              <div className="bg-stone-950 p-3.5 rounded-2xl border border-stone-800 text-xs">
                <span className="text-stone-400 block mb-1">Current Location:</span>
                <div>{getLocationBadge(relocateTargetAsset.currentLocation)}</div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-amber-400 block mb-1.5">{t('org.finance.ratnaBhandar.selectDestinationCustodyLocation')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['GARBHAGRIHA', 'STRONG_ROOM', 'BANK_LOCKER'] as const).map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setNewLocation(loc)}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                        newLocation === loc
                          ? 'bg-amber-500/20 border-amber-500 text-amber-200 font-bold'
                          : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-white'
                      }`}
                    >
                      {loc === 'GARBHAGRIHA' && <Flame className="w-4 h-4 text-amber-400" />}
                      {loc === 'STRONG_ROOM' && <Lock className="w-4 h-4 text-blue-400" />}
                      {loc === 'BANK_LOCKER' && <Building className="w-4 h-4 text-emerald-400" />}
                      <span className="text-[11px] leading-tight">
                        {loc === 'GARBHAGRIHA'
                          ? 'Sanctum Altar'
                          : loc === 'STRONG_ROOM'
                          ? 'Strong Room Safe'
                          : 'Bank Locker'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block mb-1">
                  Reason for Movement / Religious Event
                </label>
                <input
                  type="text"
                  required
                  value={relocateReason}
                  onChange={(e) => setRelocateReason(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block mb-1">
                  Escort Personnel & Security Detail
                </label>
                <input
                  type="text"
                  required
                  value={relocateEscort}
                  onChange={(e) => setRelocateEscort(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRelocateTargetAsset(null)}
                  className="flex-1 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs transition-all shadow-md cursor-pointer"
                >
                  Authorize Relocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: ADD NEW SACRED ASSET
      ===================================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-stone-900 border border-amber-500/40 rounded-3xl p-6 sm:p-7 max-w-2xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-start justify-between gap-4 border-b border-stone-800 pb-4">
              <div>
                <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider font-bold">{t('org.finance.ratnaBhandar.sacredBullionAssetRegistration')}</span>
                <h3 className="text-xl font-black text-white">{t('org.finance.ratnaBhandar.addNewSacredAsset')}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAsset} className="space-y-4">
              {/* Asset Name & Tag */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-amber-400 block mb-1">
                    Asset Name & Description *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Suvarna Mukut - Gold Crown with Rubies"
                    value={newAssetName}
                    onChange={(e) => setNewAssetName(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block mb-1">{t('org.finance.ratnaBhandar.assetTagNumber')}</label>
                  <input
                    type="text"
                    required
                    value={newTagNumber}
                    onChange={(e) => setNewTagNumber(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Category & Metal Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block mb-1">
                    Category *
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as AssetCategory)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="JEWELRY">JEWELRY</option>
                    <option value="VIGRAHA">VIGRAHA</option>
                    <option value="SILVERWARE">SILVERWARE</option>
                    <option value="GEMSTONES">GEMSTONES</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block mb-1">
                    Metal Type *
                  </label>
                  <select
                    value={newMetalType}
                    onChange={(e) => {
                      const metal = e.target.value as MetalType;
                      setNewMetalType(metal);
                      setNewPurity(metal === '24K Gold' ? 99.9 : metal === '22K Gold' ? 91.6 : 92.5);
                    }}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="24K Gold">24K Gold</option>
                    <option value="22K Gold">22K Gold</option>
                    <option value="Silver">Silver</option>
                    <option value="Ashtadhatu">Ashtadhatu</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block mb-1">
                    Purity Percentage (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newPurity}
                    onChange={(e) => setNewPurity(Number(e.target.value))}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Weights & Initial Location */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-stone-950 p-4 rounded-2xl border border-stone-800">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-amber-400 block mb-1">
                    Gross Weight (g) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={newGrossGrams}
                    onChange={(e) => setNewGrossGrams(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-sm font-black text-amber-200 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-amber-400 block mb-1">
                    Net Metal Weight (g) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={newNetGrams}
                    onChange={(e) => setNewNetGrams(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-sm font-black text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-amber-400 block mb-1">
                    Initial Location *
                  </label>
                  <select
                    value={newLocationVal}
                    onChange={(e) => setNewLocationVal(e.target.value as AssetLocation)}
                    className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="GARBHAGRIHA">GARBHAGRIHA (Sanctum Altar)</option>
                    <option value="STRONG_ROOM">STRONG_ROOM (Temple Safe)</option>
                    <option value="BANK_LOCKER">BANK_LOCKER (Bank Vault)</option>
                  </select>
                </div>
              </div>

              {/* Deity, Donor & Value */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block mb-1">
                    Deity Assigned *
                  </label>
                  <input
                    type="text"
                    required
                    value={newDeity}
                    onChange={(e) => setNewDeity(e.target.value)}
                    placeholder="e.g. Bhagwan Ram Lalla"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block mb-1">{t('org.finance.ratnaBhandar.donorEndowmentBy')}</label>
                  <input
                    type="text"
                    value={newDonor}
                    onChange={(e) => setNewDonor(e.target.value)}
                    placeholder="e.g. Somani Family Trust"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block mb-1">
                    Estimated Market Value ({wsCurrency.symbol})
                  </label>
                  <input
                    type="number"
                    value={newEstimatedValue}
                    onChange={(e) => setNewEstimatedValue(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono text-emerald-400 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Photo URL & Condition */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block mb-1">
                    Photo URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={newPhotoUrl}
                    onChange={(e) => setNewPhotoUrl(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block mb-1">
                    Condition
                  </label>
                  <select
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value as any)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="Pristine">Pristine</option>
                    <option value="Worship Grade">Worship Grade</option>
                    <option value="Needs Cleansing / Polishing">Needs Cleansing / Polishing</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-stone-400 block mb-1">{t('org.finance.ratnaBhandar.consecrationNotesAstrologicalSpecificati')}</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Blessed during Ram Navami; engraved with Om and Gayatri mantra."
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs transition-all shadow-lg cursor-pointer"
                >{t('org.finance.ratnaBhandar.saveConsecrateInRegister')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 4: DETAILED ASSET INSPECTION
      ===================================================================== */}
      {inspectTargetAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-stone-900 border border-amber-500/40 rounded-3xl p-6 sm:p-7 max-w-xl w-full shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-stone-800 pb-4">
              <div>
                <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider font-bold">{t('org.finance.ratnaBhandar.sacredAssetDossier')}</span>
                <h3 className="text-xl font-black text-white">{inspectTargetAsset.assetName}</h3>
                <span className="text-xs font-mono text-stone-400">Tag: {inspectTargetAsset.tagNumber}</span>
              </div>
              <button
                type="button"
                onClick={() => setInspectTargetAsset(null)}
                className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="h-44 rounded-2xl overflow-hidden relative">
                <img
                  src={inspectTargetAsset.photoUrl}
                  alt={inspectTargetAsset.assetName}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2">{getLocationBadge(inspectTargetAsset.currentLocation)}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-stone-950 p-3.5 rounded-2xl border border-stone-800">
                <div>
                  <span className="text-stone-500 block uppercase font-bold text-[10px]">Deity</span>
                  <span className="font-bold text-amber-300 text-sm">{inspectTargetAsset.deityAssigned}</span>
                </div>
                <div>
                  <span className="text-stone-500 block uppercase font-bold text-[10px]">Metal & Purity</span>
                  <span className="font-bold text-white text-sm">{inspectTargetAsset.metalType} ({inspectTargetAsset.purityPercentage}%)</span>
                </div>
                <div>
                  <span className="text-stone-500 block uppercase font-bold text-[10px]">Gross Weight</span>
                  <span className="font-mono font-bold text-amber-200 text-sm">{inspectTargetAsset.grossWeightGrams.toFixed(2)}g</span>
                </div>
                <div>
                  <span className="text-stone-500 block uppercase font-bold text-[10px]">Net Metal</span>
                  <span className="font-mono font-bold text-white text-sm">{inspectTargetAsset.netMetalWeightGrams.toFixed(2)}g</span>
                </div>
                <div>
                  <span className="text-stone-500 block uppercase font-bold text-[10px]">Book Valuation</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">{inr(inspectTargetAsset.approximateMarketValueINR)}</span>
                </div>
                <div>
                  <span className="text-stone-500 block uppercase font-bold text-[10px]">Security Seal</span>
                  <span className="font-mono font-bold text-rose-300 text-sm">{inspectTargetAsset.securitySealNo || 'N/A'}</span>
                </div>
              </div>

              {inspectTargetAsset.donorName && (
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800">
                  <span className="text-stone-400 block text-[10px] uppercase font-bold">{t('org.finance.ratnaBhandar.endowmentDonor')}</span>
                  <span className="text-white font-bold">{inspectTargetAsset.donorName}</span>
                </div>
              )}

              {inspectTargetAsset.notes && (
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800">
                  <span className="text-stone-400 block text-[10px] uppercase font-bold">{t('org.finance.ratnaBhandar.auditHistoryNotes')}</span>
                  <p className="text-stone-300 leading-relaxed mt-0.5">{inspectTargetAsset.notes}</p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                const target = inspectTargetAsset;
                setInspectTargetAsset(null);
                handleOpenAuditModal(target);
              }}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs transition-all shadow cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Scale className="w-4 h-4 stroke-[2.5]" />
              <span>{t('org.finance.ratnaBhandar.performPhysicalWeighingAuditNow')}</span>
            </button>
          </div>
        </div>
      )}
      {/* FIDO2 / WebAuthn Biometric Modal */}
      <BiometricPromptModal />
    </div>
  );
};
export default RatnaBhandarAssetDesk;
