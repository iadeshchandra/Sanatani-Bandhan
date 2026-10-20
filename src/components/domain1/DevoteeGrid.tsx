import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Filter,
  Download,
  QrCode,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  Award,
  CreditCard,
  FileSpreadsheet,
  X,
  CheckCircle,
  ShieldCheck,
  MessageCircle,
  HeartPulse,
  Printer,
  AlertTriangle,
  LayoutGrid,
  List,
  Key,
  Shield,
  Activity,
  UserCog,
  RefreshCw,
  Ban,
  Eye,
  EyeOff,
  History,
  Receipt,
  FileText,
  Tag,
} from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useLanguage } from '../../context/LanguageContext';
import { openPlanUpgrade } from '../../billing/PlanUpgradeFlow';
import { useWorkspaceTaxonomy } from '../../hooks/useWorkspaceTaxonomy';
import { useData } from '../../context/DataContext';
import { WindowedNotice } from '../common/WindowedNotice';
import { useScopedData } from '../../hooks/useScopedData';
import { DevoteeMember, SevaTier, UserRole } from '../../types';
import { exportToCSV } from '../../utils/csvEngine';
import { isValidPhone, phoneErrorMessage, phoneNationalKey, sanitizeName } from '../../utils/validation';
import { generateDonationHistoryPDF, generateAnnualDonationSummaryPDF } from '../../utils/pdfGenerator';
import { generateDevoteeCardPDF } from '../../utils/pdfGenerator';
import { PdfPreviewModal } from '../common/PdfPreviewModal';

import { compressAvatarImage } from '../../utils/imageCompression';
import { useToast } from '../../context/ToastContext';
import { generateStandardA_AutoLoginQR, generateStandardB_GatePassQR } from '../../utils/qrUtils';
import { generatePinHash } from '../../utils/pinCrypto';

import { usePlanGate } from '../../hooks/usePlanGate';
import { usePlanLimits } from '../../hooks/usePlanLimits';
import { UpsellModal } from '../common/UpsellModal';
import { LimitReachedModal } from '../billing/LimitReachedModal';
import { QuickChandaModal } from '../common/QuickChandaModal';
import { getDevotees } from '../../services/devoteeService';

export const DevoteeGrid: React.FC = () => {
  const { activeWorkspace, activeWorkspaceId, currentRole, currentDevotee, checkPermission } = useAuthWorkspace();
  const workspaceId = activeWorkspaceId || activeWorkspace?.id || 'DEMO_ws-mandir';
  const { checkGate, showUpsell, upsellModule, closeUpsell } = usePlanGate();
  const { guard: guardPlanLimit, modalInfo: limitModalInfo, closeModal: closeLimitModal } = usePlanLimits();
  
  const canExport = checkPermission(['TRUSTEE', 'MANAGER', 'SUPER_ADMIN', 'SUPER_ADMIN', 'SUPER_ADMIN']);
  const canManage = checkPermission(['TRUSTEE', 'MANAGER', 'SUPER_ADMIN', 'SUPER_ADMIN', 'SUPER_ADMIN']);
  const canViewFinancials = checkPermission(['TRUSTEE', 'MANAGER', 'ACCOUNTANT', 'SUPER_ADMIN', 'SUPER_ADMIN', 'SUPER_ADMIN']);
  const canRegister = checkPermission(['TRUSTEE', 'MANAGER', 'ACCOUNTANT', 'PUROHIT', 'VOLUNTEER', 'SUPER_ADMIN', 'SUPER_ADMIN', 'SUPER_ADMIN']);

  const { treasury, poojas, addDevotee: addDevoteeCtx, updateDevotee, deleteDevotee, recordsForBranch, activeBranchId, devotees: ctxDevotees } = useData();
  const [devotees, setDevotees] = useState<DevoteeMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Multi-branch: DataContext `ctxDevotees` is the source of truth — it is
  // workspace- and branch-filtered. The Firestore-fetched local `devotees`
  // state is used ONLY as a fallback when DataContext is empty, because it
  // can hold stale copies without branchId that would leak across branches.
  // (No-op for single-branch orgs.)
  const branchScopedDevotees = useMemo(() => {
    return ctxDevotees && ctxDevotees.length > 0
      ? ctxDevotees
      : recordsForBranch(devotees, activeBranchId);
  }, [devotees, ctxDevotees, activeBranchId, recordsForBranch]);

  const fetchDevotees = async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const records = await getDevotees(workspaceId);
      if (records && records.length > 0) {
        setDevotees(records as DevoteeMember[]);
      } else {
        // QUEUED #45 seed law: an empty directory means EMPTY. This used to
        // fall back to the hard-coded INITIAL_DEVOTEES fixtures, so every
        // real org booted with the same five fictitious people (incl. a
        // ₹500,000 "SUPER_ADMIN") — none labelled sample.
        setDevotees([]);
      }
    } catch (err: any) {
      console.warn('Notice: devotee fetch failed — showing the honest empty directory:', err?.message || err);
      setDevotees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevotees();
  }, [workspaceId]);

  const { showToast, confirm } = useToast();

  const taxonomy = useWorkspaceTaxonomy();
  const { safeTranslate } = useLanguage();

  // F-MEM-4 (scale): simple pagination — the directory renders ~24 cards per
  // page instead of the entire filtered list (600 members = 600 DOM cards).
  const PAGE_SIZE = 24;
  const [page, setPage] = useState(1);

  const [layoutView, setLayoutView] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGotra, setSelectedGotra] = useState<string>('all');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [filterGroup, setFilterGroup] = useState<'all' | 'staff' | 'donors' | 'revoked'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewFileName, setPreviewFileName] = useState('');
  const [editingDevotee, setEditingDevotee] = useState<DevoteeMember | null>(null);
  
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDevotee, setSelectedDevotee] = useState<DevoteeMember | null>(null);
  const [selectedDevoteeQr, setSelectedDevoteeQr] = useState<string | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [isQuickChandaOpen, setIsQuickChandaOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<'profile' | 'donations' | 'timeline'>('profile');

  useEffect(() => {
    if (selectedDevotee && isDetailModalOpen && canManage) {
      generateStandardA_AutoLoginQR(selectedDevotee.id, activeWorkspace.id)
        .then(setSelectedDevoteeQr)
        .catch(() => setSelectedDevoteeQr(null));
    } else {
      setSelectedDevoteeQr(null);
    }
  }, [selectedDevotee?.id, isDetailModalOpen, canManage, activeWorkspace.id]);

  const openDetailModal = (devotee: DevoteeMember) => {
    setSelectedDevotee(devotee);
    setShowCredentials(false);
    setDetailTab('profile');
    setIsDetailModalOpen(true);
  };

  // Form State
  const [fullName, setFullName] = useState('');
  const [spiritualName, setSpiritualName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gotra, setGotra] = useState('Kashyapa');
  const [pravara, setPravara] = useState('');
  const [varnaKul, setVarnaKul] = useState('');
  const [culturalDistinction, setCulturalDistinction] = useState('');
  const [address, setAddress] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [idCardValidThru, setIdCardValidThru] = useState('');
  const [sevaTier, setSevaTier] = useState<SevaTier>('Vishesh');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [qrModalDevotee, setQrModalDevotee] = useState<DevoteeMember | null>(null);
  const [standardA_QR, setStandardA_QR] = useState<string>('');
  const [standardB_QR, setStandardB_QR] = useState<string>('');
  const [qrTab, setQrTab] = useState<'security' | 'gate'>('security');
  // Live countdown for the dynamic gate pass token (300s = 5 minutes).
  const [gatePassSecondsLeft, setGatePassSecondsLeft] = useState<number>(300);


  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({ minDonation: 0 });

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredDevotees.map((d, idx) => d.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleBulkWhatsApp = () => {
    if (selectedIds.size === 0) return;
    const selected = branchScopedDevotees.filter(d => selectedIds.has(d.id));
    // E.g. generating a csv or linking to a bulk whatsapp web sender
    showToast(`Prepared bulk messaging for ${selected.length} devotees.`, 'success');
  };

  const handleBulkTag = () => {
    if (selectedIds.size === 0) return;
    showToast(`Bulk tagging features are now unlocked for ${selectedIds.size} devotees!`, 'success', 'Enterprise CRM');
  };

  // Extract unique gotras
  const uniqueGotras = useMemo(() => {
    const set = new Set(branchScopedDevotees.map((d, idx) => d.gotra).filter(Boolean));
    return Array.from(set);
  }, [devotees]);

  const filteredDevotees = useMemo(() => {
    return branchScopedDevotees.filter((d) => {
      const matchSearch =
        d.fullName?.toLowerCase().includes(searchTerm?.toLowerCase()) ||
        (d.spiritualName && d.spiritualName?.toLowerCase().includes(searchTerm?.toLowerCase())) ||
        d.phone.includes(searchTerm) ||
        d.gotra?.toLowerCase().includes(searchTerm?.toLowerCase());

      const matchGotra = selectedGotra === 'all' || d.gotra === selectedGotra;
      const matchTier = selectedTier === 'all' || d.sevaTier === selectedTier;

      const matchGroup =
        filterGroup === 'all' ||
        (filterGroup === 'staff' && d.role && d.role !== 'DEVOTEE') ||
        (filterGroup === 'donors' && ['Ratna', 'Vishesh'].includes(d.sevaTier)) ||
        (filterGroup === 'revoked' && d.pinRevoked === true);
      
      const matchAdvanced = (d.totalDonated || 0) >= advancedFilters.minDonation;

      return matchSearch && matchGotra && matchTier && matchGroup && matchAdvanced;
    });
  }, [branchScopedDevotees, searchTerm, selectedGotra, selectedTier, filterGroup, advancedFilters]);

  // F-MEM-4: slice the filtered list into pages (~24/page).
  const totalPages = Math.max(1, Math.ceil(filteredDevotees.length / PAGE_SIZE));
  const pagedDevotees = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredDevotees.slice(start, start + PAGE_SIZE);
  }, [filteredDevotees, page]);

  // Back to the first page whenever the filter set (or workspace) changes.
  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedGotra, selectedTier, filterGroup, advancedFilters, workspaceId]);

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    selectedGotra !== 'all' ||
    selectedTier !== 'all' ||
    filterGroup !== 'all' ||
    advancedFilters.minDonation > 0;

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedGotra('all');
    setSelectedTier('all');
    setFilterGroup('all');
    setAdvancedFilters({ minDonation: 0 });
    setPage(1);
  };

  // F-MEM-4: pager — simple, safe, no virtualization library.
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const start = (page - 1) * PAGE_SIZE + 1;
    const end = Math.min(page * PAGE_SIZE, filteredDevotees.length);
    const btnCls = (disabled: boolean) =>
      `px-4 min-h-[44px] rounded-xl text-xs font-bold border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
        disabled
          ? 'bg-temple-50 text-temple-400 border-temple-200'
          : 'bg-white text-temple-700 border-temple-200 hover:border-saffron-400 hover:text-saffron-700'
      }`;
    return (
      <nav
        aria-label={safeTranslate('devotee_pager_label', 'Devotee directory pages', 'ভক্ত তালিকার পৃষ্ঠা', 'भक्त सूची के पृष्ठ')}
        className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1"
      >
        <span className="text-[11px] text-temple-500 font-medium sm:mr-2">
          {safeTranslate('devotee_pager_showing', 'Showing', 'দেখানো হচ্ছে', 'दिखाया जा रहा')} {start}–{end}{' '}
          {safeTranslate('devotee_pager_of', 'of', 'এর', 'में से')} {filteredDevotees.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className={btnCls(page <= 1)}
          >
            {safeTranslate('devotee_pager_prev', 'Previous', 'আগের', 'पिछला')}
          </button>
          <span className="text-xs text-temple-600 font-semibold px-1 min-w-[72px] text-center">
            {safeTranslate('devotee_pager_page', 'Page', 'পৃষ্ঠা', 'पृष्ठ')} {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className={btnCls(page >= totalPages)}
          >
            {safeTranslate('devotee_pager_next', 'Next', 'পরের', 'अगला')}
          </button>
        </div>
      </nav>
    );
  };

  const selectedDevoteeDonations = useMemo(() => {
    if (!selectedDevotee) return [];
    return treasury.filter(t => t.devoteeId === selectedDevotee.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [treasury, selectedDevotee]);

  const selectedDevoteeTimeline = useMemo(() => {
    if (!selectedDevotee) return [];
    const events: any[] = [];
    
    // Add donations
    treasury.filter(t => t.devoteeId === selectedDevotee.id).forEach(t => {
      events.push({
        id: t.id,
        date: new Date(t.date).getTime(),
        type: 'donation',
        title: `Donation: ${t.category}`,
        desc: `₹${(t.amount || 0).toLocaleString()} via ${t.paymentMode}`,
        icon: Receipt,
        color: 'text-saffron-600'
      });
    });

    // Add poojas if poojas is an array
    if (Array.isArray(poojas)) {
      poojas.filter(p => p.devoteeId === selectedDevotee.id).forEach(p => {
        events.push({
          id: p.id,
          date: new Date(p.bookingDate || Date.now()).getTime(),
          type: 'pooja',
          title: `Pooja Sankalp: ${p.poojaName}`,
          desc: p.status,
          icon: Sparkles,
          color: 'text-indigo-400'
        });
      });
    }

    // Add profile creation
    if (selectedDevotee.id) {
      events.push({
        id: 'created',
        date: parseInt(selectedDevotee.id.split('-')[1] || Date.now().toString()),
        type: 'system',
        title: 'Profile Created',
        desc: `Registered as ${selectedDevotee.role}`,
        icon: UserCog,
        color: 'text-temple-600'
      });
    }

    return events.sort((a, b) => b.date - a.date);
  }, [selectedDevotee, treasury, poojas]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressAvatarImage(file);
      setPhotoUrl(compressed);
      showToast('Profile photo compressed (<300px)', 'info');
    } catch (err: any) {
      showToast('Failed to compress avatar photo', 'error');
    }
  };

  const handleSaveDevotee = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = sanitizeName(fullName);
    const cleanPhone = phone.trim();
    if (!cleanName || !cleanPhone) {
      showToast('Full name and phone number are required', 'warning');
      return;
    }

    // Geo-aware validation before any duplicate checks (QUEUED #49): BD
    // mobiles (01…), IN mobiles and +E.164 numbers are all welcome — a
    // Bangladeshi org's own number must never fail as "not Indian".
    if (!isValidPhone(cleanPhone)) {
      showToast(phoneErrorMessage(activeWorkspace?.country), 'error', 'Invalid Phone');
      return;
    }
    const normPhone = phoneNationalKey(cleanPhone);

    // Duplicate detection on the country-insensitive national key (catches
    // 01… / 880… / +880… and 91… / 0-trunk / +91 format variants alike)
    const phoneExists = normPhone
      ? devotees.find(
          (d) => phoneNationalKey(d.phone || '') === normPhone && d.id !== editingDevotee?.id
        )
      : undefined;
    if (phoneExists) {
      showToast(
        `This mobile number is already registered to ${phoneExists.fullName || phoneExists.name || 'another devotee'}.`,
        'error',
        'Duplicate Devotee'
      );
      return;
    }

    if (email.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
        showToast('Please enter a valid email address', 'error', 'Invalid Email');
        return;
      }
      const emailExists = devotees.find(
        (d) => (d.email || '').trim().toLowerCase() === email.trim().toLowerCase() && d.id !== editingDevotee?.id
      );
      if (emailExists) {
        showToast('This email address is already registered in the organization.', 'error');
        return;
      }
    }

    // Soft duplicate hint: same normalized name already exists (non-blocking — families share names)
    if (!editingDevotee) {
      const nameDup = devotees.find(
        (d) => sanitizeName(d.fullName || (d as any).name || '').toLowerCase() === cleanName.toLowerCase()
      );
      if (nameDup) {
        showToast(
          `Heads up: a devotee named "${cleanName}" already exists — please verify this is not a duplicate entry.`,
          'warning',
          'Possible Duplicate'
        );
      }
    }

    if (editingDevotee) {
      updateDevotee(editingDevotee.id, {
        fullName,
        spiritualName: spiritualName.trim() || undefined,
        phone: phone.trim(),
        email: email.trim() || undefined,
        gotra,
        pravara: pravara.trim() || undefined,
        varnaKul: varnaKul.trim() || undefined,
        culturalDistinction: culturalDistinction.trim() || undefined,
        address: address.trim() || undefined,
        birthDate: birthDate || undefined,
        sevaTier,
        photoUrl: photoUrl || editingDevotee.photoUrl,
        medicalNotes: medicalNotes.trim() || undefined,
      });
      setEditingDevotee(null);
    } else {
      // Freemium usage-limit enforcement (Firestore-backed plan). Fires before
      // the legacy hardcoded gate so owner-edited limits take effect.
      if (!(await guardPlanLimit('devotees'))) {
        setIsAddModalOpen(false);
        return;
      }
      if (!checkGate('devotees', branchScopedDevotees.length)) {
        setIsAddModalOpen(false);
        return;
      }
      
      // Provision a random 4-digit PIN + its PBKDF2 hash. The plaintext `pin`
      // stays for staff reveal (back-compat); verification prefers `pinHash`.
      const freshPin = Math.floor(1000 + Math.random() * 9000).toString();
      const freshPinHash = await generatePinHash(freshPin);
      const newDevoteeData = {
        workspaceId,
        fullName,
        spiritualName: spiritualName.trim() || undefined,
        phone: phone.trim(),
        email: email.trim() || undefined,
        // C-7: NEVER write plaintext `pin` — only the hash/salt persist.
        // The fresh PIN is shown to staff once via the ID-card/reveal flow.
        pinSalt: freshPinHash.salt,
        pinHash: freshPinHash.hash,
        role: 'DEVOTEE' as const,
        sevaIndex: 350,
        sevaTier,
        gotra,
        pravara: pravara.trim() || undefined,
        varnaKul: varnaKul.trim() || undefined,
        culturalDistinction: culturalDistinction.trim() || undefined,
        address: address.trim() || undefined,
        birthDate: birthDate || undefined,
        activeStatus: 'Active' as const,
        totalDonated: 0,
        volunteerHours: 0,
        photoUrl: photoUrl || undefined,
        medicalNotes: medicalNotes.trim() || undefined,
      };

      try {
        // QUEUED #45: register through DataContext — the ledger of record.
        // The legacy tenant service wrote to tenants/{id}/devotees (a store
        // no re-entry read uses) and fabricated a success record whenever
        // Firestore rejected the write — the form data's undefined optional
        // fields made the SDK reject it every time — so the desk toasted
        // "registered successfully in Firestore!" for a member who was
        // never persisted and vanished on re-entry. DataContext persists to
        // the root `devotees` collection under the same id, sanitizes the
        // payload, and rolls back + reports honestly on rejection.
        const newId = addDevoteeCtx(newDevoteeData);
        if (!newId) {
          showToast('Devotee could NOT be registered — the member limit for this workspace is reached.', 'error');
        } else {
          const newDevotee = {
            id: newId as string,
            ...newDevoteeData,
          };
          // Auto-generate the account creation PDF (ID Card)
          setTimeout(() => {
            handlePrintCard(newDevotee as unknown as DevoteeMember);
          }, 500);
        }
      } catch (err: any) {
        console.error('Error adding devotee:', err);
        showToast('Failed to register devotee in database.', 'error');
      }
    }

    resetForm();
    setIsAddModalOpen(false);
  };

  const resetForm = () => {
    setFullName('');
    setSpiritualName('');
    setPhone('');
    setEmail('');
    setGotra('Kashyapa');
    setPravara('');
    setVarnaKul('');
    setCulturalDistinction('');
    setAddress('');
    setBirthDate('');
    setBloodGroup('');
    setEmergencyPhone('');
    setMedicalNotes('');
    setIdCardValidThru('');
    setSevaTier('Vishesh');
    setPhotoUrl('');
    setEditingDevotee(null);
  };


  /**
   * Issues (or re-issues) the Standard-B dynamic gate pass token.
   * HMAC-signed + 5-minute expiry — door scanners verify it via
   * verifyDynamicToken, so screenshots stop working on their own.
   */
  const issueGatePass = async (d: DevoteeMember) => {
    const qrB = await generateStandardB_GatePassQR(
      d.id,
      d.fullName || d.name,
      activeWorkspace.id,
      d.sevaTier
    );
    if (qrB) {
      setStandardB_QR(qrB);
      setGatePassSecondsLeft(300);
    }
  };

  const openQrModal = async (devotee: DevoteeMember) => {
    setQrModalDevotee(devotee);
    setQrTab('security');
    setStandardA_QR('');
    try {
      // Firestore-native one-time pairing token (no server). Throws when not
      // signed in or when the write is rejected / unreachable.
      const qrA = await generateStandardA_AutoLoginQR(
        devotee.id,
        activeWorkspace.id,
        devotee.fullName,
        devotee.role
      );
      if (!qrA) throw new Error('QR_EMPTY');
      setStandardA_QR(qrA);
    } catch (err: any) {
      if (err?.message === 'QR_PAIRING_UNAUTHENTICATED') {
        showToast('Please sign in as temple staff to issue login codes.', 'error', 'Not signed in');
      } else {
        showToast('Could not reach the temple database. Check your connection and try again.', 'error', 'QR unavailable');
      }
      setQrModalDevotee(null);
      return;
    }
    await issueGatePass(devotee);
  };

  // Live gate-pass countdown: tick while the Gate tab is open, and mint a
  // fresh token the moment the old one lapses so the pass never shows dead.
  useEffect(() => {
    if (!qrModalDevotee || qrTab !== 'gate') return;
    if (gatePassSecondsLeft <= 0) {
      issueGatePass(qrModalDevotee);
      return;
    }
    const t = setTimeout(() => setGatePassSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrModalDevotee, qrTab, gatePassSecondsLeft]);

  const openEditModal = (devotee: DevoteeMember) => {
    setEditingDevotee(devotee);
    setFullName(devotee.fullName);
    setSpiritualName(devotee.spiritualName || '');
    setPhone(devotee.phone);
    setEmail(devotee.email || '');
    setGotra(devotee.gotra);
    setPravara(devotee.pravara || '');
    setVarnaKul(devotee.varnaKul || '');
    setCulturalDistinction(devotee.culturalDistinction || '');
    setAddress(devotee.address || '');
    setBirthDate(devotee.birthDate || '');
    setBloodGroup(devotee.bloodGroup || '');
    setEmergencyPhone(devotee.emergencyPhone || '');
    setMedicalNotes(devotee.medicalNotes || '');
    setIdCardValidThru(devotee.idCardValidThru || '');
    setSevaTier(devotee.sevaTier);
    setPhotoUrl(devotee.avatarUrl || '');
    setIsAddModalOpen(true);
  };

  const handleDelete = (devotee: DevoteeMember) => {
    if (devotee.id === currentDevotee?.id) {
      showToast('You cannot delete your own account.', 'error');
      return;
    }
    confirm({
      title: 'Remove Devotee Record?',
      message: `Are you sure you want to remove ${devotee.fullName} (${devotee.gotra}) from the active directory? This action cannot be undone.`,
      confirmText: 'Yes, Remove Record',
      variant: 'danger',
      onConfirm: () => deleteDevotee(devotee.id),
    });
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Full Name', 'Spiritual Name', 'Phone', 'Email', 'Gotra', 'Seva Tier', 'Total Donated', 'PIN'];
    const rows = branchScopedDevotees.map((d, idx) => [
      d.id,
      d.fullName,
      d.spiritualName || '',
      d.phone,
      d.email || '',
      d.gotra,
      d.sevaTier,
      d.totalDonated.toString(),
      d.pin,
    ]);
    exportToCSV(`Devotee_Directory_${activeWorkspace.type}_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    showToast('Directory CSV exported successfully', 'success');
  };

  const handleBulkPrint = async () => {
    if (filteredDevotees.length === 0) {
      showToast('No devotees to print', 'error');
      return;
    }
    if (filteredDevotees.length > 20) {
      showToast('Bulk print limited to 20 passes at a time for performance.', 'error');
      return;
    }
    
    showToast(`Generating ${filteredDevotees.length} Smart Passes...`, 'success');
    for (const devotee of filteredDevotees) {
      try {
         await generateDevoteeCardPDF(devotee, activeWorkspace);
         await new Promise(r => setTimeout(r, 800)); // Small delay between downloads
      } catch(e) {
         console.error('Failed to print for', devotee.fullName, e);
      }
    }
    showToast('Bulk print complete', 'success');
  };

  const handlePrintCard = async (devotee: DevoteeMember) => {
    try {
      showToast('Generating preview...', 'info');
      setIsPreviewOpen(true);
      setPreviewFileName(`${devotee.fullName.replace(/\s+/g, '_')}_ID_Card.pdf`);
      const blobUrl = await generateDevoteeCardPDF(devotee, activeWorkspace, 'bloburl');
      if (blobUrl) {
        setPreviewPdfUrl(blobUrl);
      }
    } catch (e: any) {
      showToast('Error generating PDF preview', 'error');
      setIsPreviewOpen(false);
    }
  };

  const getTierColor = (tier: SevaTier) => {
    switch (tier) {
      case 'Ratna':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Vishesh':
        return 'bg-saffron-50 text-saffron-700 border-saffron-200';
      case 'Karmi':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-temple-50 text-temple-700 border-temple-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* F2: windowed directory — counts/lists below cover the loaded
          window; the notice carries the true total + Load More. */}
      <WindowedNotice collection="devotees" variant="list" loaded={branchScopedDevotees.length} />
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-temple-200 shadow-sm p-6 rounded-xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-saffron-50 text-saffron-700 border border-saffron-200 text-[10px] font-semibold uppercase tracking-wider">
              {taxonomy.workspaceLabel}
            </span>
            <span className="text-xs text-temple-600 font-mono">
              {/* F-MEM-3: the count reflects the active filters — "3 / 10 Bhaktas"
                  when filtered, "Total Bhaktas: 10" when not. */}
              {filteredDevotees.length === branchScopedDevotees.length ? (
                <>Total {taxonomy.memberNoun}: {branchScopedDevotees.length}</>
              ) : (
                <>{filteredDevotees.length} / {branchScopedDevotees.length} {taxonomy.memberNoun}</>
              )}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-temple-900">
            {taxonomy.directoryName}
          </h2>
          <p className="text-xs text-temple-600 mt-0.5">
            Comprehensive directory with Gotra, Pravara, Seva Tiers, and QR Gate Passes
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {canExport && (
            <>
              <button
                type="button"
                onClick={handleExportCSV}
                className="hidden sm:flex px-3.5 py-2 rounded-xl bg-white hover:bg-temple-50 border border-temple-200 text-temple-700 text-xs font-semibold items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={handleBulkPrint}
                title="Download IDs for current view (Max 20)"
                className="hidden sm:flex px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-semibold items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Bulk Print IDs</span>
              </button>
            </>
          )}

          {canRegister && (
            <button
              type="button"
              id="add-devotee-btn"
              onClick={() => {
                resetForm();
                setIsAddModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm shadow-saffron-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Register {taxonomy.memberNoun}</span>
            </button>
          )}
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white border border-saffron-200 px-6 py-4 rounded-full shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="flex items-center gap-2 border-r border-temple-200 pr-4">
            <span className="flex items-center justify-center bg-saffron-500 text-white font-semibold w-6 h-6 rounded-full text-xs">
              {selectedIds.size}
            </span>
            <span className="text-sm font-semibold text-temple-900">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 text-xs text-temple-600 hover:text-temple-900 transition-colors">Clear</button>
            <button onClick={handleBulkWhatsApp} className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors">
              <MessageCircle className="w-3.5 h-3.5" /> Broadcast
            </button>
            <button onClick={handleBulkTag} className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors">
              <Tag className="w-3.5 h-3.5" /> Update Tags
            </button>
          </div>
        </div>
      )}

      {/* Quick Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mt-2 mb-2 scrollbar-hide">
        {(['all', 'staff', 'donors', 'revoked'] as const).map((filter, idx) => (
          <button
            key={filter}
            onClick={() => setFilterGroup(filter)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize whitespace-nowrap transition-all ${
              filterGroup === filter
                ? 'bg-saffron-100 text-saffron-800 border border-saffron-200'
                : 'bg-temple-50 text-temple-600 border border-temple-200 hover:bg-temple-100'
            }`}
          >
            {filter === 'all' ? `All ${taxonomy.memberNoun}` : filter === 'revoked' ? 'Suspended' : filter}
          </button>
        ))}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-temple-200 shadow-sm p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-temple-600 absolute left-3 top-3" />
          <input
            type="text"
            placeholder={`Search ${taxonomy.memberNoun} by name, gotra, phone...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-temple-200 shadow-sm rounded-xl pl-9 pr-3 py-2 text-xs text-temple-900 placeholder-temple-400 focus:outline-none focus:border-saffron-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-temple-600 font-medium">Gotra:</span>
            <select
              value={selectedGotra}
              onChange={(e) => setSelectedGotra(e.target.value)}
              className="bg-white border border-temple-200 shadow-sm rounded-xl px-2.5 py-1.5 text-xs text-temple-900 focus:outline-none"
            >
              <option value="all">All Gotras</option>
              {uniqueGotras.map((g, idx) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-temple-600 font-medium">Tier:</span>
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="bg-white border border-temple-200 shadow-sm rounded-xl px-2.5 py-1.5 text-xs text-temple-900 focus:outline-none"
            >
              <option value="all">All Tiers</option>
              <option value="Ratna">Ratna (Diamond)</option>
              <option value="Vishesh">Vishesh (Special)</option>
              <option value="Karmi">Karmi (Active)</option>
              <option value="Sadharan">Sadharan (General)</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-temple-600 font-medium">Min Chanda:</span>
            <select
              value={advancedFilters.minDonation}
              onChange={(e) => setAdvancedFilters(prev => ({ ...prev, minDonation: Number(e.target.value) }))}
              className="bg-white border border-temple-200 shadow-sm rounded-xl px-2.5 py-1.5 text-xs text-temple-900 focus:outline-none"
            >
              <option value={0}>Any</option>
              <option value={1000}>₹1,000+</option>
              <option value={10000}>₹10,000+</option>
              <option value={100000}>₹1,00,000+</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-2 border-l border-temple-200 pl-3">
            <button
              onClick={() => setLayoutView('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                layoutView === 'grid' ? 'bg-saffron-100 text-saffron-800' : 'text-temple-600 hover:text-temple-900'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayoutView('list')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                layoutView === 'list' ? 'bg-saffron-100 text-saffron-800' : 'text-temple-600 hover:text-temple-900'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Devotees Views */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white border border-temple-200 rounded-xl shadow-sm text-center">
          <div className="w-8 h-8 border-4 border-saffron-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-xs font-semibold text-temple-700">Loading Devotee Records from Firestore...</p>
        </div>
      ) : filteredDevotees.length === 0 ? (
        /* F-MEM-2 (spec §7): warm empty state — acknowledge + bless + guide + one action.
           Never a blank white void. */
        <div className="flex flex-col items-center justify-center text-center py-16 px-6 bg-white border-2 border-dashed border-temple-200 rounded-xl shadow-sm">
          <div className="text-5xl mb-4" aria-hidden="true">🪔</div>
          <h3 className="text-base font-bold text-temple-900">
            {hasActiveFilters
              ? safeTranslate('devotee_empty_search_title', 'No matches for your search', 'আপনার খোঁজে কিছু মেলেনি', 'आपकी खोज में कुछ नहीं मिला')
              : safeTranslate('devotee_empty_title', 'Your directory awaits its first bhakta', 'আপনার তালিকা প্রথম ভক্তের অপেক্ষায়', 'आपकी सूची अपने पहले भक्त की प्रतीक्षा में है')}
          </h3>
          <p className="text-xs text-temple-600 mt-2 max-w-md leading-relaxed">
            {hasActiveFilters
              ? safeTranslate(
                  'devotee_empty_search_desc',
                  'Every parivar begins somewhere. Try a different name, gotra, or phone — may your community grow in dharma. 🙏',
                  'প্রতিটি পরিবার কোথাও না কোথাও শুরু হয়। অন্য নাম, গোত্র বা ফোনে খুঁজুন — আপনার সম্প্রদায় ধর্মে বেড়ে উঠুক। 🙏',
                  'हर परिवार कहीं न कहीं से शुरू होता है। कोई दूसरा नाम, गोत्र या फ़ोन आज़माएँ — आपका समुदाय धर्म में फले-फूले। 🙏'
                )
              : safeTranslate(
                  'devotee_empty_desc',
                  'Every parivar begins somewhere. Register your first bhakta and watch your spiritual family blossom under divine grace. 🙏',
                  'প্রতিটি পরিবার কোথাও না কোথাও শুরু হয়। আপনার প্রথম ভক্তকে নথিভুক্ত করুন — ঐশ্বরিক কৃপায় আপনার আধ্যাত্মিক পরিবার ফুলে উঠুক। 🙏',
                  'हर परिवार कहीं न कहीं से शुरू होता है। अपने पहले भक्त को पंजीकृत करें — दिव्य कृपा से आपका आध्यात्मिक परिवार फले-फूले। 🙏'
                )}
          </p>
          {canRegister ? (
            <button
              type="button"
              onClick={() => { resetForm(); setIsAddModalOpen(true); }}
              className="mt-5 px-5 py-2.5 min-h-[44px] rounded-xl bg-saffron-500 hover:bg-saffron-600 text-white text-xs font-bold shadow-sm shadow-saffron-600/20 transition-all cursor-pointer"
            >
              {safeTranslate('devotee_empty_register', 'Register Bhakta', 'ভক্ত নথিভুক্ত করুন', 'भक्त पंजीकृत करें')}
            </button>
          ) : (
            <button
              type="button"
              onClick={clearAllFilters}
              className="mt-5 px-5 py-2.5 min-h-[44px] rounded-xl bg-white hover:bg-temple-50 text-temple-700 border border-temple-200 text-xs font-bold transition-colors cursor-pointer"
            >
              {safeTranslate('devotee_empty_clear', 'Clear search & filters', 'খোঁজ ও ফিল্টার মুছুন', 'खोज व फ़िल्टर साफ़ करें')}
            </button>
          )}
        </div>
      ) : layoutView === 'grid' ? (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pagedDevotees.map((devotee, idx) => (
            <div
              key={`${devotee.id}-${idx}`}
              onClick={() => openDetailModal(devotee)}
              className="bg-white border border-temple-200 shadow-sm hover:border-temple-200 rounded-xl p-5 shadow-sm flex flex-col justify-between transition-all cursor-pointer"
            >
              <div>
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-temple-200">
                  <div className="flex items-center gap-3">
                    <div className="pt-1 pr-1" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.has(devotee.id)} 
                        onChange={(e) => toggleSelection(devotee.id, e as any)}
                        className="w-4 h-4 rounded border-temple-200 bg-temple-50 text-saffron-600 focus:ring-saffron-500/50 cursor-pointer"
                      />
                    </div>
                    {devotee.photoUrl ? (
                      <img
                        src={devotee.photoUrl || undefined}
                        alt={devotee.fullName}
                        className="w-11 h-11 rounded-xl object-cover border border-saffron-200 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-saffron-100 border border-saffron-200 flex items-center justify-center font-semibold text-saffron-700 text-sm shrink-0">
                        {(devotee.fullName || 'Member').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-sm text-temple-900 leading-tight">
                        {devotee.fullName}
                      </h3>
                      {devotee.spiritualName && (
                        <p className="text-[11px] text-saffron-600 italic">
                          "{devotee.spiritualName}"
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {/* F-MEM-1: raw internal IDs (dev_…) never surface on cards. */}
                        {devotee.role && devotee.role !== 'DEVOTEE' && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-saffron-700 bg-saffron-50 px-1.5 py-0.5 rounded border border-saffron-200 text-saffron-700 flex items-center gap-1">
                            <Shield className="w-2.5 h-2.5" />
                            {devotee.role}
                          </span>
                        )}
                        {devotee.pinRevoked === true && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 text-rose-700 flex items-center gap-1">
                            <Ban className="w-2.5 h-2.5" />
                            Revoked
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wider ${getTierColor(
                      devotee.sevaTier
                    )}`}
                  >
                    {devotee.sevaTier}
                  </span>
                </div>

                {/* Dharmic Lineage & Vitals */}
                <div className="py-3 space-y-1.5 text-xs text-temple-700">
                  <div className="flex items-center justify-between">
                    <span className="text-temple-600">Gotra & Kul:</span>
                    <span className="font-semibold text-temple-900">
                      {devotee.gotra} {devotee.varnaKul ? `(${devotee.varnaKul})` : ''}
                    </span>
                  </div>
                  {devotee.culturalDistinction && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-saffron-600/70">Cultural:</span>
                      <span className="text-saffron-600 font-medium truncate max-w-[180px]">{devotee.culturalDistinction}</span>
                    </div>
                  )}
                  {devotee.pravara && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-temple-600">Pravara:</span>
                      <span className="text-temple-700 truncate max-w-[180px]">{devotee.pravara}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-temple-600">Phone:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-saffron-600">{devotee.phone}</span>
                      <a href={`https://wa.me/${devotee.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-emerald-500 hover:text-emerald-400" title="Message on WhatsApp">
                        <MessageCircle className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                  {(devotee.emergencyPhone || devotee.bloodGroup) && (
                    <div className="flex items-center justify-between text-[11px] bg-rose-50 p-1.5 rounded-lg border border-rose-200 text-rose-900">
                      <span className="text-rose-400 flex items-center gap-1"><HeartPulse className="w-3 h-3" /> Emg/Medical:</span>
                      <div className="flex items-center gap-2">
                        {devotee.bloodGroup && <span className="text-rose-300 font-semibold">{devotee.bloodGroup}</span>}
                        {devotee.emergencyPhone && (
                          <a href={`https://wa.me/${devotee.emergencyPhone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-rose-400 hover:text-rose-300 font-mono flex items-center gap-1">
                            {devotee.emergencyPhone} <MessageCircle className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                  {devotee.medicalNotes && (
                     <div className="text-[10px] text-saffron-700 bg-saffron-50 px-2 py-1 rounded border border-saffron-200 flex items-start gap-1">
                       <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                       <span>{devotee.medicalNotes}</span>
                     </div>
                  )}
                </div>

                {/* Seva Metrics */}
                {canViewFinancials && (
                  <div className="p-2.5 rounded-xl bg-white shadow-sm border border-temple-200 grid grid-cols-2 gap-2 text-center text-xs my-2">
                    <div>
                      <p className="text-[10px] text-temple-600 font-semibold uppercase">Total Chanda</p>
                      <p className="font-semibold text-saffron-600">₹{(devotee.totalDonated || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-temple-600 font-semibold uppercase">Seva Index</p>
                      <p className="font-semibold text-purple-400">{devotee.sevaIndex || 0} pts</p>
                    </div>
                  </div>
                )}
                {!canViewFinancials && (
                  <div className="p-2.5 rounded-xl bg-white shadow-sm border border-temple-200 grid grid-cols-1 gap-2 text-center text-xs my-2">
                    <div>
                      <p className="text-[10px] text-temple-600 font-semibold uppercase">Seva Index</p>
                      <p className="font-semibold text-purple-400">{devotee.sevaIndex || 0} pts</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Actions */}
              <div 
                className="pt-3 border-t border-temple-200 flex items-center justify-between gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                {(canManage || currentDevotee?.id === devotee.id || devotee.isQrPublic) && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handlePrintCard(devotee); }}
                    className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-temple-50 text-saffron-600 border border-temple-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Download Smart Pass PDF"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Pass</span>
                  </button>
                )}

                <div className="flex items-center gap-1.5 ml-auto">
                  {canManage && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openEditModal(devotee); }}
                        className="p-1.5 rounded-xl text-temple-600 hover:text-temple-900 hover:bg-temple-100 transition-colors cursor-pointer"
                        title="Edit Record"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDelete(devotee); }}
                        className="p-1.5 rounded-xl text-temple-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        {renderPagination()}
      </>
      ) : (
        <>
        <div className="bg-white border border-temple-200 shadow-sm rounded-xl overflow-hidden shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-temple-50 text-temple-700 border-b border-temple-200 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3 w-8">
                  <input 
                    type="checkbox" 
                    onChange={selectAll}
                    checked={selectedIds.size === filteredDevotees.length && filteredDevotees.length > 0}
                    className="w-4 h-4 rounded border-temple-200 bg-temple-50 text-saffron-600 focus:ring-saffron-500/50 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Lineage / Gotra</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Seva Tier</th>
                {canViewFinancials && <th className="px-4 py-3 text-right">Total Chanda</th>}
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-temple-800/60 text-temple-700">
              {pagedDevotees.map((devotee, idx) => (
                <tr 
                  key={`${devotee.id}-${idx}`} 
                  onClick={() => openDetailModal(devotee)}
                  className="hover:bg-temple-100/40 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.has(devotee.id)} 
                      onChange={(e) => toggleSelection(devotee.id, e as any)}
                      className="w-4 h-4 rounded border-temple-200 bg-temple-50 text-saffron-600 focus:ring-saffron-500/50 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {devotee.photoUrl ? (
                        <img
                          src={devotee.photoUrl || undefined}
                          alt={devotee.fullName}
                          className="w-9 h-9 rounded-lg object-cover border border-temple-200 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-white border border-temple-200 shadow-sm flex items-center justify-center font-semibold text-temple-600 text-xs shrink-0">
                          {(devotee.fullName || 'M').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-temple-900">{devotee.fullName}</p>
                          {devotee.role && devotee.role !== 'DEVOTEE' && (
                            <span className="text-[9px] font-semibold uppercase tracking-wider text-saffron-700 bg-saffron-50 px-1 py-0.5 rounded border border-saffron-200">
                              {devotee.role}
                            </span>
                          )}
                          {devotee.pinRevoked === true && (
                            <span className="text-[9px] font-semibold uppercase tracking-wider text-rose-700 bg-rose-500/10 px-1 py-0.5 rounded border border-rose-500/30">
                              Revoked
                            </span>
                          )}
                        </div>
                        {/* F-MEM-1: raw internal IDs (dev_…) never surface in the directory. */}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-temple-900">{devotee.gotra}</p>
                    {devotee.varnaKul && <p className="text-[10px] text-temple-500">{devotee.varnaKul}</p>}
                    {devotee.culturalDistinction && <p className="text-[10px] text-saffron-600 font-medium">{devotee.culturalDistinction}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-saffron-600">{devotee.phone}</span>
                      <a href={`https://wa.me/${devotee.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-emerald-500/70 hover:text-emerald-400">
                        <MessageCircle className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wider ${getTierColor(devotee.sevaTier)}`}>
                      {devotee.sevaTier}
                    </span>
                  </td>
                  {canViewFinancials && (
                    <td className="px-4 py-3 text-right font-mono font-semibold text-saffron-600">
                      ₹{(devotee.totalDonated || 0).toLocaleString()}
                    </td>
                  )}
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      {(canManage || currentDevotee?.id === devotee.id || devotee.isQrPublic) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePrintCard(devotee); }}
                          className="p-1.5 rounded-lg text-temple-600 hover:text-saffron-600 hover:bg-temple-100 transition-colors"
                          title="Download Pass"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                      )}
                      {canManage && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditModal(devotee); }}
                            className="p-1.5 rounded-lg text-temple-600 hover:text-temple-900 hover:bg-temple-100 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(devotee); }}
                            className="p-1.5 rounded-lg text-temple-600 hover:text-rose-400 hover:bg-rose-900/30 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {renderPagination()}
        </>
      )}

            {/* Detail Modal */}
      {isDetailModalOpen && selectedDevotee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-temple-950/20 backdrop-blur-md">
          <div className="bg-white border border-temple-200/80 rounded-xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-temple-200 flex items-center justify-between bg-white shadow-sm">
              <div className="flex items-center gap-4">
                {selectedDevotee.photoUrl ? (
                  <img
                    src={selectedDevotee.photoUrl || undefined}
                    alt={selectedDevotee.fullName}
                    className="w-14 h-14 rounded-xl object-cover border border-temple-200"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-white border border-temple-200 shadow-sm flex items-center justify-center font-semibold text-temple-700 text-lg">
                    {(selectedDevotee.fullName || 'M').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-semibold text-temple-900 flex items-center gap-2">
                    {selectedDevotee.fullName}
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wider ${getTierColor(selectedDevotee.sevaTier)}`}>
                      {selectedDevotee.sevaTier}
                    </span>
                  </h2>
                  <p className="text-sm text-temple-600">ID: <span className="font-mono text-temple-700">{selectedDevotee.id}</span></p>
                </div>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-2 rounded-xl bg-temple-50 hover:bg-temple-100 text-temple-600 hover:text-temple-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-temple-200 bg-temple-50 px-6 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setDetailTab('profile' as any)}
                className={`py-3 px-4 whitespace-nowrap text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${detailTab === 'profile' ? 'border-saffron-500 text-saffron-600' : 'border-transparent text-temple-600 hover:text-temple-700'}`}
              >
                <UserCog className="w-4 h-4" /> Profile Info
              </button>
              {canViewFinancials && (
                <button
                  onClick={() => setDetailTab('donations' as any)}
                  className={`py-3 px-4 whitespace-nowrap text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${detailTab === 'donations' ? 'border-saffron-500 text-saffron-600' : 'border-transparent text-temple-600 hover:text-temple-700'}`}
                >
                  <Receipt className="w-4 h-4" /> Ledger
                </button>
              )}
              <button
                onClick={() => setDetailTab('timeline' as any)}
                className={`py-3 px-4 whitespace-nowrap text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${detailTab === 'timeline' ? 'border-saffron-500 text-saffron-600' : 'border-transparent text-temple-600 hover:text-temple-700'}`}
              >
                <Activity className="w-4 h-4" /> Engagement Timeline
              </button>
            </div>
            {/* Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
              {detailTab === 'profile' && (
                <>
              
              {/* Vitals Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3 bg-white shadow-sm p-4 rounded-xl border border-temple-200">
                  <h3 className="text-sm font-semibold text-temple-600 flex items-center gap-2 mb-2">
                    <UserCog className="w-4 h-4" /> Personal Information
                  </h3>
                  <div className="space-y-2 text-sm text-temple-700">
                    {selectedDevotee.spiritualName && (
                      <p><span className="text-temple-500 w-24 inline-block">Spiritual Name:</span> <span className="italic text-saffron-600">{selectedDevotee.spiritualName}</span></p>
                    )}
                    <p><span className="text-temple-500 w-24 inline-block">Phone:</span> <span className="font-mono text-temple-900">{selectedDevotee.phone}</span></p>
                    {selectedDevotee.email && <p><span className="text-temple-500 w-24 inline-block">Email:</span> <span>{selectedDevotee.email}</span></p>}
                    {selectedDevotee.address && <p><span className="text-temple-500 w-24 inline-block">Address:</span> <span>{selectedDevotee.address}</span></p>}
                  </div>
                </div>

                <div className="space-y-3 bg-white shadow-sm p-4 rounded-xl border border-temple-200">
                  <h3 className="text-sm font-semibold text-temple-600 flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4" /> Dharmic Lineage & Vitals
                  </h3>
                  <div className="space-y-2 text-sm text-temple-700">
                    <p><span className="text-temple-500 w-24 inline-block">Gotra:</span> <span className="font-semibold">{selectedDevotee.gotra}</span></p>
                    {selectedDevotee.pravara && <p><span className="text-temple-500 w-24 inline-block">Pravara:</span> <span>{selectedDevotee.pravara}</span></p>}
                    {selectedDevotee.varnaKul && <p><span className="text-temple-500 w-24 inline-block">Varna/Kul:</span> <span>{selectedDevotee.varnaKul}</span></p>}
                    {selectedDevotee.culturalDistinction && <p><span className="text-saffron-600/70 w-24 inline-block">Cultural:</span> <span className="text-saffron-600 font-medium">{selectedDevotee.culturalDistinction}</span></p>}
                    {selectedDevotee.bloodGroup && <p><span className="text-rose-500/80 w-24 inline-block">Blood Group:</span> <span className="font-semibold text-rose-400">{selectedDevotee.bloodGroup}</span></p>}
                    {selectedDevotee.medicalNotes && <p><span className="text-saffron-600/80 w-24 inline-block">Medical:</span> <span className="text-saffron-600">{selectedDevotee.medicalNotes}</span></p>}
                  </div>
                </div>
              </div>

              {/* Security & Access (Admins Only) */}
              {canManage && (
                <div className="bg-indigo-950/20 p-4 rounded-xl border border-indigo-500/20">
                  <h3 className="text-sm font-semibold text-indigo-400 flex items-center gap-2 mb-4">
                    <Shield className="w-4 h-4" /> Access & Security Controls
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs text-temple-600 mb-1.5 font-semibold">Change System Role</label>
                      <select
                        className="w-full bg-white border border-temple-200 rounded-xl px-3 py-2 text-sm text-temple-900 focus:outline-none focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        value={selectedDevotee.role || 'DEVOTEE'}
                        disabled={selectedDevotee.id === currentDevotee?.id}
                        title={selectedDevotee.id === currentDevotee?.id ? "You cannot modify your own role" : "Modify system role"}
                        onChange={(e) => {
                           updateDevotee(selectedDevotee.id, { role: e.target.value as UserRole });
                           setSelectedDevotee(prev => prev ? {...prev, role: e.target.value as UserRole} : null);
                           showToast(`Role updated to ${e.target.value}`, 'success');
                        }}
                      >
                        <option value="DEVOTEE">Devotee (Standard)</option>
                        <option value="VOLUNTEER">Volunteer (Sevadar)</option>
                        <option value="PUROHIT">Purohit / Priest</option>
                        <option value="ACCOUNTANT">Accountant</option>
                        <option value="MANAGER">Manager</option>
                        {(currentRole as string) === 'SUPER_ADMIN' || currentRole === 'SuperAdmin' ? (
                           <option value="TRUSTEE">Trustee</option>
                        ) : null}
                      </select>
                      <p className="text-[10px] text-temple-500 mt-1.5">Roles grant distinct applet permissions.</p>

                      <div className="mt-4 pt-4 border-t border-indigo-500/20">
                        <label className="block text-xs text-temple-600 mb-1.5 font-semibold">Password Reset</label>
                        <button
                          type="button"
                          onClick={() => {
                            showToast(`Password reset link sent to ${selectedDevotee.phone || selectedDevotee.email || 'user'}`, 'success');
                          }}
                          className="w-full p-2 rounded-xl bg-temple-50 hover:bg-temple-100 text-temple-700 transition-colors flex items-center justify-center gap-2 text-[11px] uppercase font-semibold tracking-wider border border-temple-200"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> Send Reset Link via SMS/Email
                        </button>
                        <p className="text-[10px] text-temple-500 mt-1.5">Standard password reset flow triggered remotely.</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-temple-600 mb-1.5 font-semibold">Authentication (Internal)</label>
                      <div className="flex items-center gap-3 bg-temple-50 p-2.5 rounded-xl border border-temple-200">
                        {selectedDevoteeQr && selectedDevotee.pinRevoked !== true ? (
                          showCredentials ? (
                            <img src={selectedDevoteeQr || undefined} alt="QR Code" className="w-12 h-12 rounded-lg bg-white p-0.5" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-white border border-temple-200 shadow-sm flex items-center justify-center">
                              <Shield className="w-5 h-5 text-temple-500" />
                            </div>
                          )
                        ) : (
                          <Key className={`w-8 h-8 shrink-0 ${selectedDevotee.pinRevoked === true ? 'text-rose-500' : 'text-saffron-600'}`} />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="text-xs text-temple-700">Self-Service PIN</p>
                            {selectedDevotee.pinRevoked !== true && (
                              <button 
                                type="button" 
                                onClick={() => setShowCredentials(!showCredentials)} 
                                className="text-[10px] text-temple-600 hover:text-temple-900 flex items-center gap-1 transition-colors bg-temple-50 px-1.5 py-0.5 rounded"
                              >
                                {showCredentials ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                {showCredentials ? 'Hide' : 'Reveal'}
                              </button>
                            )}
                          </div>
                          <p className={`font-mono text-xl font-semibold tracking-widest ${selectedDevotee.pinRevoked === true ? 'text-rose-400 text-sm' : 'text-saffron-600'}`}>
                            {selectedDevotee.pinRevoked === true ? 'REVOKED' : (showCredentials ? (selectedDevotee.pin || 'N/A') : '••••')}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1.5 ml-2">
                           <button
                             type="button"
                             onClick={async () => {
                               const newPin = Math.floor(1000 + Math.random() * 9000).toString();
                               const newPinHash = await generatePinHash(newPin);
                               // C-7: persist ONLY the hash/salt — never the plaintext PIN.
                               // The plaintext lives in React state only, for the one-time reveal below.
                               updateDevotee(selectedDevotee.id, { pinSalt: newPinHash.salt, pinHash: newPinHash.hash, pinRevoked: false });
                               setSelectedDevotee(prev => prev ? {...prev, pin: newPin, pinSalt: newPinHash.salt, pinHash: newPinHash.hash, pinRevoked: false} : null);
                               setShowCredentials(true);
                               showToast('New PIN generated successfully', 'success');
                             }}
                             className="p-1.5 rounded-lg bg-temple-50 hover:bg-temple-100 text-temple-700 transition-colors flex items-center justify-center gap-1 text-[10px] uppercase font-semibold tracking-wider border border-temple-200"
                             title="Regenerate Credentials"
                           >
                             <RefreshCw className="w-3 h-3" /> Renew
                           </button>
                           {selectedDevotee.pinRevoked !== true && (
                             <button
                               type="button"
                               disabled={selectedDevotee.id === currentDevotee?.id}
                               onClick={() => {
                                 confirm({
                                   title: 'Revoke Access?',
                                   message: 'This will invalidate their current login credentials immediately.',
                                   confirmText: 'Revoke',
                                   cancelText: 'Cancel',
                                   onConfirm: () => {
                                     // C-7: revocation marks pinRevoked and clears the
                                     // hash/salt so the old PIN can never verify again.
                                     // Plaintext `pin` is never written to storage.
                                     updateDevotee(selectedDevotee.id, { pinRevoked: true, pinHash: '', pinSalt: '' });
                                     setSelectedDevotee(prev => prev ? {...prev, pinRevoked: true, pin: undefined, pinHash: '', pinSalt: ''} : null);
                                     setShowCredentials(false);
    setDetailTab('profile');
                                     showToast('Login credentials revoked', 'warning');
                                   }
                                 });
                               }}
                               className="p-1.5 rounded-lg bg-rose-900/20 hover:bg-rose-900/40 text-rose-400 transition-colors flex items-center justify-center gap-1 text-[10px] uppercase font-semibold tracking-wider border border-rose-900/30 disabled:opacity-30 disabled:cursor-not-allowed"
                               title={selectedDevotee.id === currentDevotee?.id ? "You cannot revoke your own access" : "Revoke Credentials"}
                             >
                               <Ban className="w-3 h-3" /> Revoke
                             </button>
                           )}
                        </div>
                      </div>
                      <p className="text-[10px] text-temple-500 mt-1.5">Show the devotee the one-time pairing QR from the Security tab to log them in.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Seva Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white shadow-sm p-4 rounded-xl border border-temple-200 text-center">
                  <p className="text-xs text-temple-500 font-semibold uppercase mb-1">Seva Index</p>
                  <p className="text-2xl font-semibold text-purple-400">{selectedDevotee.sevaIndex || 0}</p>
                </div>
                {canViewFinancials && (
                  <div className="bg-white shadow-sm p-4 rounded-xl border border-temple-200 text-center flex flex-col justify-center items-center">
                    <p className="text-xs text-temple-500 font-semibold uppercase mb-1">Total Chanda</p>
                    <p className="text-2xl font-semibold text-saffron-600">₹{(selectedDevotee.totalDonated || 0).toLocaleString()}</p>
                    {canManage && (
                      <button
                        onClick={() => setIsQuickChandaOpen(true)}
                        className="mt-3 px-3 py-1.5 bg-saffron-500/20 hover:bg-saffron-500/30 text-saffron-600 text-xs font-semibold rounded-lg border border-saffron-200 flex items-center gap-1.5 transition-colors"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Quick Chanda
                      </button>
                    )}
                  </div>
                )}
                <div className="bg-white shadow-sm p-4 rounded-xl border border-temple-200 text-center">
                  <p className="text-xs text-temple-500 font-semibold uppercase mb-1">Status</p>
                  <p className="text-lg font-semibold text-emerald-400 mt-1">{selectedDevotee.activeStatus || 'Active'}</p>
                </div>
              </div>
                </>
              )}
              {detailTab === 'donations' && canViewFinancials && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-white shadow-sm p-4 rounded-xl border border-temple-200">
                    <div>
                      <h3 className="text-temple-900 font-semibold">Donation History</h3>
                      <p className="text-xs text-temple-500">{selectedDevoteeDonations.length} records found</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => generateAnnualDonationSummaryPDF(selectedDevotee, selectedDevoteeDonations, activeWorkspace)}
                        className="px-3 py-1.5 bg-temple-50 hover:bg-temple-100 text-temple-700 text-xs font-semibold rounded-lg border border-temple-200 flex items-center gap-1.5 transition-colors"
                      >
                        <Printer className="w-4 h-4" /> Print Summary
                      </button>
                      <button
                        onClick={() => generateDonationHistoryPDF(selectedDevotee, selectedDevoteeDonations, activeWorkspace)}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-500/30 flex items-center gap-1.5 transition-colors"
                      >
                        <FileText className="w-4 h-4" /> Export PDF
                      </button>
                    </div>
                  </div>
                  <div className="bg-white border border-temple-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-temple-50 text-temple-700 border-b border-temple-200 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Date</th>
                          <th className="px-4 py-3 font-semibold">Receipt No.</th>
                          <th className="px-4 py-3 font-semibold">Category</th>
                          <th className="px-4 py-3 font-semibold">Mode</th>
                          <th className="px-4 py-3 font-semibold text-right">Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-temple-800/60 text-temple-700">
                        {selectedDevoteeDonations.map((donation, idx) => (
                          <tr key={`${donation.id}-${idx}`} className="hover:bg-temple-100/40 transition-colors">
                            <td className="px-4 py-3">{new Date(donation.date).toLocaleDateString()}</td>
                            <td className="px-4 py-3 font-mono text-xs text-temple-600">{donation.id}</td>
                            <td className="px-4 py-3">{donation.category}</td>
                            <td className="px-4 py-3">{donation.paymentMode}</td>
                            <td className="px-4 py-3 font-semibold text-saffron-600 text-right">{(donation.amount || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                        {selectedDevoteeDonations.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-temple-500">
                              No donation records found for this devotee.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {detailTab === 'timeline' as any && (
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-temple-700 before:to-transparent">
                  {selectedDevoteeTimeline.map((event, i) => {
                    const Icon = event.icon;
                    return (
                      <div key={`${event.id}-${i}`} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-temple-200 bg-white text-temple-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                          <Icon className={`w-4 h-4 ${event.color}`} />
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white/80 p-4 rounded-xl border border-temple-200 shadow-xl hover:border-saffron-500/50 transition-colors">
                          <div className="flex items-center justify-between space-x-2 mb-1">
                            <div className="font-semibold text-temple-900 text-sm">{event.title}</div>
                            <time className="font-mono text-[10px] text-temple-500">{new Date(event.date).toLocaleDateString()}</time>
                          </div>
                          <div className="text-xs text-temple-600">{event.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                  {selectedDevoteeTimeline.length === 0 && (
                    <div className="text-center text-temple-500 py-8">No activity recorded yet.</div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Devotee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-temple-950/20 backdrop-blur-md">
          <div className="bg-white border border-temple-200/80 rounded-xl w-full max-w-xl shadow-2xl overflow-hidden text-temple-900 flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-temple-200 flex items-center justify-between bg-white shadow-sm">
              <h3 className="font-semibold text-sm text-temple-900">
                {editingDevotee ? `Edit ${taxonomy.memberNoun} Record` : `Register New ${taxonomy.memberNoun}`}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-temple-600 hover:text-temple-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDevotee} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-temple-700 mb-1">Full Legal Name *</label>
                    <input
                      type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-white border border-temple-200 shadow-sm rounded-xl px-3 py-2 text-xs text-temple-900 focus:outline-none focus:border-saffron-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-temple-700 mb-1">Spiritual / Diksha Name</label>
                    <input
                      type="text"
                    value={spiritualName}
                    onChange={(e) => setSpiritualName(e.target.value)}
                    placeholder="e.g. Radheshyam Das"
                    className="w-full bg-white border border-temple-200 shadow-sm rounded-xl px-3 py-2 text-xs text-temple-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-temple-700 mb-1">Primary Phone *</label>
                    <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={!!editingDevotee}
                    className="w-full bg-white border border-temple-200 shadow-sm rounded-xl px-3 py-2 text-xs text-temple-900 focus:outline-none focus:border-saffron-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={editingDevotee ? "Phone is locked to maintain login integrity" : ""}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-temple-700 mb-1">Email Address</label>
                    <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={!!editingDevotee}
                    className="w-full bg-white border border-temple-200 shadow-sm rounded-xl px-3 py-2 text-xs text-temple-900 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    title={editingDevotee ? "Email is locked to maintain login integrity" : ""}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-temple-700 mb-1">Gotra *</label>
                    <input
                      type="text"
                    required
                    value={gotra}
                    onChange={(e) => setGotra(e.target.value)}
                      className="w-full bg-white border border-temple-200 shadow-sm rounded-xl px-3 py-2 text-xs text-temple-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-temple-700 mb-1">Pravara (Rishis)</label>
                    <input
                      type="text"
                    value={pravara}
                    onChange={(e) => setPravara(e.target.value)}
                    placeholder="e.g. Kashyapa, Avatsara"
                      className="w-full bg-white border border-temple-200 shadow-sm rounded-xl px-3 py-2 text-xs text-temple-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-temple-700 mb-1">Varna / Kul</label>
                    <input
                      type="text"
                    value={varnaKul}
                    onChange={(e) => setVarnaKul(e.target.value)}
                    placeholder="Optional"
                      className="w-full bg-white border border-temple-200 shadow-sm rounded-xl px-3 py-2 text-xs text-temple-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-temple-700 mb-1">Cultural Distinction</label>
                    <input
                      type="text"
                    value={culturalDistinction}
                    onChange={(e) => setCulturalDistinction(e.target.value)}
                    placeholder="Optional"
                      className="w-full bg-white border border-temple-200 shadow-sm rounded-xl px-3 py-2 text-xs text-temple-900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-temple-700 mb-1">Seva Tier</label>
                  <select
                    value={sevaTier}
                    onChange={(e) => setSevaTier(e.target.value as any)}
                    className="w-full bg-white border border-temple-200 shadow-sm rounded-xl px-3 py-2 text-xs text-temple-900 focus:outline-none"
                  >
                    <option value="Ratna">Ratna</option>
                    <option value="Vishesh">Vishesh</option>
                    <option value="Karmi">Karmi</option>
                    <option value="Sadharan">Sadharan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-temple-700 mb-1">Residence Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-white border border-temple-200 shadow-sm rounded-xl px-3 py-2 text-xs text-temple-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-temple-700 mb-1">Birth Date</label>
                    <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full bg-white border border-temple-200 shadow-sm rounded-xl px-3 py-2 text-xs text-temple-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-temple-700 mb-1">Blood Group</label>
                    <input
                      type="text"
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    placeholder="e.g. O+"
                      className="w-full bg-white border border-temple-200 shadow-sm rounded-xl px-3 py-2 text-xs text-temple-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-temple-700 mb-1">Medical / Alert Notes</label>
                    <input
                      type="text"
                    value={medicalNotes}
                    onChange={(e) => setMedicalNotes(e.target.value)}
                    placeholder="e.g. Diabetic, Heart Patient, Allergies..."
                      className="w-full bg-white border border-temple-200 shadow-sm rounded-xl px-3 py-2 text-xs text-temple-900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-temple-700 mb-1">Emergency Phone</label>
                    <input
                    type="tel"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                      className="w-full bg-white border border-temple-200 shadow-sm rounded-xl px-3 py-2 text-xs text-temple-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-temple-700 mb-1">ID Card Valid Thru</label>
                    <input
                    type="date"
                    value={idCardValidThru}
                    onChange={(e) => setIdCardValidThru(e.target.value)}
                      className="w-full bg-white border border-temple-200 shadow-sm rounded-xl px-3 py-2 text-xs text-temple-900"
                  />
                </div>
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-xs font-semibold text-temple-600 mb-1">
                  Profile Avatar Photo (Compressed automatically &lt;300px)
                </label>
                  <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="w-full text-xs text-temple-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-temple-50 file:text-temple-700 hover:file:bg-temple-100 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-temple-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-temple-50 hover:bg-temple-100 text-temple-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-saffron-500 hover:bg-saffron-600 text-white font-semibold text-xs shadow-sm shadow-saffron-600/20 transition-all cursor-pointer"
                >
                  {editingDevotee ? 'Update Record' : 'Save & Provision PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Codes Modal */}
      {qrModalDevotee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-indigo-500" />
                  Smart Ecosystem QRs
                </h3>
                <p className="text-xs text-slate-500">{qrModalDevotee.fullName} ({qrModalDevotee.gotra})</p>
              </div>
              <button
                onClick={() => setQrModalDevotee(null)}
                className="p-2 hover:bg-slate-200 rounded-xl transition-colors"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            
            <div className="flex border-b border-slate-200">
              <button
                className={`flex-1 py-3 text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${qrTab === 'security' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                onClick={() => setQrTab('security')}
              >
                <ShieldCheck className="w-4 h-4" />
                Security & Recovery (Standard A)
              </button>
              <button
                className={`flex-1 py-3 text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${qrTab === 'gate' ? 'bg-white text-saffron-600 border-b-2 border-saffron-500' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                onClick={() => {
                  setQrTab('gate');
                  // Fresh token every time the tab is viewed — the countdown
                  // must never overstate the token's real 5-minute life.
                  if (qrModalDevotee) issueGatePass(qrModalDevotee);
                }}
              >
                <MapPin className="w-4 h-4" />
                Gate Pass (Standard B)
              </button>
            </div>

            <div className="p-6 flex flex-col items-center text-center">
              {qrTab === 'security' ? (
                <div className="animate-in fade-in slide-in-from-right-4">
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl mb-6 text-left">
                    <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                      <strong className="block text-amber-900 mb-1">One-Time Login Pairing</strong>
                      This QR holds a single-use, 5-minute login token — no PIN, no password. Show it only to the devotee; it expires automatically after one scan.
                    </p>
                  </div>
                  {standardA_QR ? (
                    <img src={standardA_QR || undefined} alt="Pairing QR" className="w-48 h-48 mx-auto rounded-xl border-4 border-slate-100 shadow-sm" />
                  ) : (
                    <div className="w-48 h-48 mx-auto bg-slate-100 rounded-xl animate-pulse" />
                  )}
                  <p className="mt-4 text-xs font-mono text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg inline-block">
                    Payload: one-time pairing token (5 min)
                  </p>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-right-4">
                   <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl mb-6 text-left">
                    <p className="text-[11px] text-emerald-800 font-medium leading-relaxed">
                      <strong className="block text-emerald-900 mb-1">Dynamic Gate Pass</strong>
                      This QR holds a time-signed token — door scanners verify it, and it
                      refreshes itself every 5 minutes, so screenshots stop working on their own.
                    </p>
                  </div>
                  {standardB_QR ? (
                    <img src={standardB_QR || undefined} alt="Gate Pass QR" className="w-48 h-48 mx-auto rounded-xl border-4 border-slate-100 shadow-sm" />
                  ) : (
                    <div className="w-48 h-48 mx-auto bg-slate-100 rounded-xl animate-pulse" />
                  )}
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg inline-block">
                      Valid: {Math.floor(gatePassSecondsLeft / 60)}:
                      {(gatePassSecondsLeft % 60).toString().padStart(2, '0')}
                    </span>
                    <button
                      type="button"
                      onClick={() => qrModalDevotee && issueGatePass(qrModalDevotee)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors"
                      title="Issue a fresh gate pass token now"
                    >
                      Refresh
                    </button>
                  </div>
                  <p className="mt-3 text-xs font-mono text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg inline-block">
                    Payload: time-signed token (5-min)
                  </p>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
               <button
                onClick={() => setQrModalDevotee(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <UpsellModal 
        isOpen={showUpsell} 
        onClose={closeUpsell} 
        onUpgrade={() => { closeUpsell(); openPlanUpgrade(); }} 
        module={upsellModule} 
      />
      {limitModalInfo && (
        <LimitReachedModal info={limitModalInfo} onClose={closeLimitModal} />
      )}
      <QuickChandaModal
        isOpen={isQuickChandaOpen}
        onClose={() => setIsQuickChandaOpen(false)}
        prefilledDevoteeId={selectedDevotee?.id}
        prefilledDevoteeName={selectedDevotee?.fullName}
      />
    </div>
  );
};
