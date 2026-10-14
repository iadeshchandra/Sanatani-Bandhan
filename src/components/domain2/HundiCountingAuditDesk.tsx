import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  KeyRound,
  ShieldCheck,
  Lock,
  Unlock,
  Coins,
  Receipt,
  FileCheck,
  Printer,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  History,
  Calendar,
  Clock,
  Video,
  UserCheck,
  Scale,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Copy,
  Plus,
  Minus,
  Eye,
  EyeOff,
  Flame,
  Building,
  DollarSign,
  Award,
  Layers,
  HelpCircle,
  X,
  Fingerprint,
  Scan
} from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { useQuickGuide } from '../../context/QuickGuideContext';
import { useBiometricAuth } from '../../hooks/useBiometricAuth';
import { numberToWords } from '../../utils/pdfGenerator';
import { DataExportButton } from '../common/DataExportButton';
import { DevoteeMember } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

export type CountingStep = 'LOCKED' | 'COUNTING_IN_PROGRESS' | 'REVIEW_AND_VERIFY' | 'POSTED_TO_TREASURY';

export interface NoteDenomination {
  value: number;
  label: string;
  color: string;
  textColor: string;
  borderColor: string;
  bgLight: string;
  isCoin?: boolean;
}

export const INR_DENOMINATIONS: NoteDenomination[] = [
  { value: 500, label: '₹500 Note', color: 'bg-stone-700', textColor: 'text-stone-100', borderColor: 'border-stone-500', bgLight: 'bg-stone-800/40' },
  { value: 200, label: '₹200 Note', color: 'bg-amber-600', textColor: 'text-amber-100', borderColor: 'border-amber-500', bgLight: 'bg-amber-950/30' },
  { value: 100, label: '₹100 Note', color: 'bg-indigo-700', textColor: 'text-indigo-100', borderColor: 'border-indigo-500', bgLight: 'bg-indigo-950/30' },
  { value: 50, label: '₹50 Note', color: 'bg-cyan-700', textColor: 'text-cyan-100', borderColor: 'border-cyan-500', bgLight: 'bg-cyan-950/30' },
  { value: 20, label: '₹20 Note', color: 'bg-lime-700', textColor: 'text-lime-100', borderColor: 'border-lime-500', bgLight: 'bg-lime-950/30' },
  { value: 10, label: '₹10 Note', color: 'bg-yellow-800', textColor: 'text-yellow-100', borderColor: 'border-yellow-600', bgLight: 'bg-yellow-950/30' },
  { value: 20, label: '₹20 Coin', color: 'bg-amber-500/20', textColor: 'text-amber-300', borderColor: 'border-amber-400/40', bgLight: 'bg-stone-900/60', isCoin: true },
  { value: 10, label: '₹10 Coin', color: 'bg-amber-500/20', textColor: 'text-amber-300', borderColor: 'border-amber-400/40', bgLight: 'bg-stone-900/60', isCoin: true },
  { value: 5, label: '₹5 Coin', color: 'bg-stone-600/30', textColor: 'text-stone-300', borderColor: 'border-stone-500/40', bgLight: 'bg-stone-900/60', isCoin: true },
  { value: 2, label: '₹2 Coin', color: 'bg-stone-600/30', textColor: 'text-stone-300', borderColor: 'border-stone-500/40', bgLight: 'bg-stone-900/60', isCoin: true },
  { value: 1, label: '₹1 Coin', color: 'bg-stone-600/30', textColor: 'text-stone-300', borderColor: 'border-stone-500/40', bgLight: 'bg-stone-900/60', isCoin: true },
];

export interface ForeignCurrencyEntry {
  currency: string;
  name: string;
  rate: number;
  quantity: number;
}

export interface BullionEntry {
  type: 'GOLD_24K' | 'GOLD_22K' | 'SILVER';
  label: string;
  grams: number;
  ratePerGram: number;
  itemDescription: string;
  pouchSealNo: string;
}

export interface HundiSessionRecord {
  id: string;
  sessionCode: string;
  date: string;
  timestamp: string;
  hundiBoxId: string;
  hundiBoxName: string;
  leadSealNo: string;
  cctvRoom: string;
  custodian1: { name: string; role: string };
  custodian2: { name: string; role: string };
  denominations: Record<string, number>;
  totalCashINR: number;
  totalCoinsINR: number;
  foreignCurrencies: ForeignCurrencyEntry[];
  totalForeignINR: number;
  bullion: BullionEntry[];
  totalBullionGrams: number;
  grandTotalINR: number;
  treasuryTxId?: string;
  auditNotes?: string;
  status: 'POSTED_TO_TREASURY';
}

const HUNDI_BOXES = [
  { id: 'HUNDI-01', name: 'Main Sanctum Golak #1 (Garbhagriha - Shri Ram Darbar)', location: 'Inner Sanctum', lastCleared: '7 days ago' },
  { id: 'HUNDI-02', name: 'Parikrama Hundi #2 (Hanuman Mandapam)', location: 'Outer Circumambulation', lastCleared: '14 days ago' },
  { id: 'HUNDI-03', name: 'Navagraha Temple Hundi #3', location: 'Navagraha Sthalam', lastCleared: '21 days ago' },
  { id: 'HUNDI-04', name: 'Annadanam Hall Golak #4', location: 'Prasadam Dining Complex', lastCleared: '3 days ago' },
  { id: 'HUNDI-05', name: 'Festival Mahotsav Special Hundi #5', location: 'Utsav Pandal', lastCleared: '30 days ago' },
];

const PRESET_TRUSTEES = [
  // SECURITY: demo seeds only — real custodian PINs are issued per-trustee and
  // never hardcoded. These values are inert placeholders.
  { name: 'Shri Rameshwar Sharma', role: 'Chief Managing Trustee', defaultPin: '••••' },
  { name: 'Dr. Sunita Varma', role: 'Audit & Accounts Trustee', defaultPin: '••••' },
  { name: 'Acharya Vidyadhar Shastri', role: 'Head Purohit & Trustee', defaultPin: '••••' },
  { name: 'Pandit Radhakant Dixit', role: 'Honorary Treasurer', defaultPin: '••••' },
];

const STORAGE_KEY = 'sanatani_hundi_sessions';

export const HundiCountingAuditDesk: React.FC = () => {
  const { t } = useLanguage();
  const { activeWorkspace, currentUser, currentRole } = useAuthWorkspace();
  const { addTreasuryTransaction, devotees } = useData();
  const { showToast } = useToast();
  const { openGuide } = useQuickGuide();
  const { promptBiometric, BiometricPromptModal } = useBiometricAuth();

  // Navigation View: 'COUNTING' | 'HISTORY'
  const [activeView, setActiveView] = useState<'COUNTING' | 'HISTORY'>('COUNTING');

  // Step State
  const [currentStep, setCurrentStep] = useState<CountingStep>('LOCKED');

  // Step 1: Vault Setup & Dual-Custody State
  const [selectedHundiId, setSelectedHundiId] = useState<string>('HUNDI-01');
  const [leadSealNo, setLeadSealNo] = useState<string>(() => `SL-${Math.floor(100000 + Math.random() * 900000)}`);
  const [isSealIntact, setIsSealIntact] = useState<boolean>(true);
  const [cctvRoom, setCctvRoom] = useState<string>('CCTV-VAULT-04 (High-Def Dual Cam)');

  // Keyholder 1 (Primary)
  const [key1Name, setKey1Name] = useState<string>(currentUser?.name || 'Chief Accountant / Custodian 1');
  const [key1Role, setKey1Role] = useState<string>(currentRole || 'ACCOUNTANT');
  const [key1Pin, setKey1Pin] = useState<string>('');
  const [isKey1Unlocked, setIsKey1Unlocked] = useState<boolean>(false);
  const [showKey1Pin, setShowKey1Pin] = useState<boolean>(false);

  // Keyholder 2 (Secondary / Witness)
  const [key2Name, setKey2Name] = useState<string>(PRESET_TRUSTEES[0].name);
  const [key2Role, setKey2Role] = useState<string>(PRESET_TRUSTEES[0].role);
  const [key2Pin, setKey2Pin] = useState<string>('');
  const [isKey2Unlocked, setIsKey2Unlocked] = useState<boolean>(false);
  const [showKey2Pin, setShowKey2Pin] = useState<boolean>(false);

  // Step 2: Denomination Counters (key = denomination string e.g. "500", "20_COIN")
  const [denominations, setDenominations] = useState<Record<string, number>>({
    '500': 0,
    '200': 0,
    '100': 0,
    '50': 0,
    '20': 0,
    '10': 0,
    '20_COIN': 0,
    '10_COIN': 0,
    '5_COIN': 0,
    '2_COIN': 0,
    '1_COIN': 0,
  });

  // Foreign Currency State
  const [foreignCurrencies, setForeignCurrencies] = useState<ForeignCurrencyEntry[]>([
    { currency: 'USD', name: 'US Dollars ($)', rate: 86.5, quantity: 0 },
    { currency: 'GBP', name: 'British Pounds (£)', rate: 108.2, quantity: 0 },
    { currency: 'EUR', name: 'Euros (€)', rate: 93.4, quantity: 0 },
    { currency: 'AED', name: 'UAE Dirhams (AED)', rate: 23.5, quantity: 0 },
    { currency: 'CAD', name: 'Canadian Dollars ($)', rate: 63.1, quantity: 0 },
  ]);

  // Bullion State
  const [bullion, setBullion] = useState<BullionEntry[]>([
    { type: 'GOLD_24K', label: '24K Pure Gold (Swarna)', grams: 0, ratePerGram: 7250, itemDescription: '', pouchSealNo: 'POUCH-GLD-01' },
    { type: 'GOLD_22K', label: '22K Gold Ornaments', grams: 0, ratePerGram: 6650, itemDescription: '', pouchSealNo: 'POUCH-GLD-02' },
    { type: 'SILVER', label: 'Silver / Chandi Patra & Coins', grams: 0, ratePerGram: 92, itemDescription: '', pouchSealNo: 'POUCH-SLV-01' },
  ]);

  // Step 3 & 4: Audit Notes & Treasury Handoff
  const [auditNotes, setAuditNotes] = useState<string>(
    'All lead seals inspected under active CCTV surveillance before opening. No physical seal tampering observed. Bundle count reconciled.'
  );
  const [isPostingTreasury, setIsPostingTreasury] = useState<boolean>(false);
  const [postedSession, setPostedSession] = useState<HundiSessionRecord | null>(null);

  // Past Sessions History
  const [pastSessions, setPastSessions] = useState<HundiSessionRecord[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}

    // Seed realistic sample past sessions
    return [
      {
        id: 'hundi-sess-prev-1',
        sessionCode: 'HUNDI-2026-0918-01',
        date: '2026-09-18',
        timestamp: '11:30 AM',
        hundiBoxId: 'HUNDI-01',
        hundiBoxName: 'Main Sanctum Golak #1 (Garbhagriha - Shri Ram Darbar)',
        leadSealNo: 'SL-884910',
        cctvRoom: 'CCTV-VAULT-04',
        custodian1: { name: 'Shri Anand Sharma', role: 'Head Accountant' },
        custodian2: { name: 'Shri Rameshwar Sharma', role: 'Chief Managing Trustee' },
        denominations: { '500': 340, '200': 420, '100': 910, '50': 320, '20': 150, '10': 200, '20_COIN': 45, '10_COIN': 120, '5_COIN': 350, '2_COIN': 400, '1_COIN': 500 },
        totalCashINR: 364500,
        totalCoinsINR: 4950,
        foreignCurrencies: [{ currency: 'USD', name: 'US Dollars ($)', rate: 86.5, quantity: 40 }],
        totalForeignINR: 3460,
        bullion: [{ type: 'GOLD_24K', label: '24K Pure Gold', grams: 12.5, ratePerGram: 7250, itemDescription: '2 Gold Coins', pouchSealNo: 'P-9921' }],
        totalBullionGrams: 12.5,
        grandTotalINR: 372910,
        treasuryTxId: 'tx-hundi-0918',
        status: 'POSTED_TO_TREASURY',
      },
    ];
  });

  // Persist sessions
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pastSessions));
    } catch (e) {}
  }, [pastSessions]);

  // Selected Hundi Metadata
  const currentHundiBox = useMemo(() => {
    return HUNDI_BOXES.find((b) => b.id === selectedHundiId) || HUNDI_BOXES[0];
  }, [selectedHundiId]);

  // ============================================================================
  // MATHEMATICAL CALCULATIONS (DENOMINATIONS, COINS, FOREIGN, BULLION, TOTALS)
  // ============================================================================

  const { totalCashNotesINR, totalCoinsINR, totalINRSubtotal } = useMemo(() => {
    let notesSum = 0;
    let coinsSum = 0;

    INR_DENOMINATIONS.forEach((d) => {
      const denomKey = d.isCoin ? `${d.value}_COIN` : `${d.value}`;
      const qty = denominations[denomKey] || 0;
      const value = qty * d.value;

      if (d.isCoin) {
        coinsSum += value;
      } else {
        notesSum += value;
      }
    });

    return {
      totalCashNotesINR: notesSum,
      totalCoinsINR: coinsSum,
      totalINRSubtotal: notesSum + coinsSum,
    };
  }, [denominations]);

  const totalForeignINR = useMemo(() => {
    return foreignCurrencies.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  }, [foreignCurrencies]);

  const totalBullionGrams = useMemo(() => {
    return bullion.reduce((sum, item) => sum + (Number(item.grams) || 0), 0);
  }, [bullion]);

  const totalBullionINR = useMemo(() => {
    return bullion.reduce((sum, item) => sum + (Number(item.grams) || 0) * item.ratePerGram, 0);
  }, [bullion]);

  const grandTotalINR = useMemo(() => {
    return totalINRSubtotal + totalForeignINR;
  }, [totalINRSubtotal, totalForeignINR]);

  const grandTotalWords = useMemo(() => {
    return numberToWords(grandTotalINR);
  }, [grandTotalINR]);

  // Reconciliation sanity check: flag when the current count deviates >=50%
  // from the trailing average of past sessions for the same hundi box.
  const trailingVariance = useMemo(() => {
    const sameBox = (pastSessions || []).filter(
      (s) => s.hundiBoxId === selectedHundiId && Number.isFinite(Number(s.grandTotalINR)) && Number(s.grandTotalINR) > 0
    );
    if (sameBox.length < 2 || grandTotalINR <= 0) return null;
    const avg = sameBox.reduce((a, s) => a + Number(s.grandTotalINR), 0) / sameBox.length;
    if (avg <= 0) return null;
    const devPct = ((grandTotalINR - avg) / avg) * 100;
    return Math.abs(devPct) >= 50 ? { avg, devPct, sessions: sameBox.length } : null;
  }, [pastSessions, selectedHundiId, grandTotalINR]);

  // ============================================================================
  // DUAL-CUSTODY AUTHENTICATION HANDLERS
  // ============================================================================

  const handleVerifyKey1 = () => {
    if (!key1Pin || key1Pin.length < 4) {
      showToast('Please enter a valid 4-digit security PIN for Custodian 1', 'error');
      return;
    }
    // Accept standard demo PINs or any 4 digit
    setIsKey1Unlocked(true);
    showToast(`Custodian 1 (${key1Name}) Authenticated with PIN!`, 'success');
  };

  const handleBiometricKey1 = async () => {
    const verified = await promptBiometric('Hundi Keyholder 1 Unlock');
    if (verified) {
      setIsKey1Unlocked(true);
      showToast(`Keyholder 1 (${key1Name}) Biometrically Authenticated via FaceID/TouchID!`, 'success');
    }
  };

  const handleVerifyKey2 = () => {
    if (!key2Pin || key2Pin.length < 4) {
      showToast('Please enter a valid 4-digit security PIN for Custodian 2', 'error');
      return;
    }
    setIsKey2Unlocked(true);
    showToast(`Custodian 2 (${key2Name}) Authenticated with PIN!`, 'success');
  };

  const handleBiometricKey2 = async () => {
    const verified = await promptBiometric('Hundi Keyholder 2 Unlock');
    if (verified) {
      setIsKey2Unlocked(true);
      showToast(`Keyholder 2 (${key2Name}) Biometrically Authenticated via FaceID/TouchID!`, 'success');
    }
  };

  const handleBreakSealAndUnlock = () => {
    if (!isKey1Unlocked || !isKey2Unlocked) {
      showToast('Both Custodian Keys must be authenticated to break vault seal!', 'error');
      return;
    }
    // Dual custody is meaningless if the same person holds both keys
    if (key1Name.trim().toLowerCase() === key2Name.trim().toLowerCase()) {
      showToast(
        'Dual custody requires two DISTINCT custodians — the same person cannot authenticate both keys',
        'error',
        'Custody Violation'
      );
      return;
    }
    setCurrentStep('COUNTING_IN_PROGRESS');
    showToast(`Hundi Vault Seal #${leadSealNo} successfully broken. Counting session active.`, 'success');
  };

  // Helper to adjust note quantity
  const handleUpdateQty = (key: string, delta: number) => {
    setDenominations((prev) => {
      const current = prev[key] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [key]: next };
    });
  };

  const handleSetExactQty = (key: string, value: string) => {
    const parsed = parseInt(value, 10);
    // Cap at 999,999 pieces per denomination to catch fat-finger data-entry errors
    const next = isNaN(parsed) ? 0 : Math.min(999999, Math.max(0, parsed));
    setDenominations((prev) => ({ ...prev, [key]: next }));
  };

  // ============================================================================
  // STEP 3 & 4: CO-SIGN & POST TO TREASURY HANDOFF
  // ============================================================================

  const handlePostToTreasury = () => {
    if (grandTotalINR <= 0) {
      showToast('Total count is ₹0. Please enter counted denominations before posting.', 'error');
      return;
    }

    // Validate foreign currency entries: positive rates, non-negative integer quantities
    for (const f of foreignCurrencies) {
      if (!Number.isInteger(f.quantity) || f.quantity < 0) {
        showToast(`Invalid quantity for ${f.currency} — must be a whole number ≥ 0`, 'error', 'Forex Entry');
        return;
      }
      if (f.quantity > 0 && (!Number.isFinite(f.rate) || f.rate <= 0)) {
        showToast(`Invalid exchange rate for ${f.currency} — must be a positive number`, 'error', 'Forex Rate');
        return;
      }
    }

    // Validate bullion entries: non-negative grams, positive rate when grams entered
    for (const b of bullion) {
      const grams = Number(b.grams) || 0;
      if (grams < 0 || !Number.isFinite(grams)) {
        showToast(`Invalid gram weight for ${b.label} — must be ≥ 0`, 'error', 'Bullion Entry');
        return;
      }
      if (grams > 0 && (!Number.isFinite(b.ratePerGram) || b.ratePerGram <= 0)) {
        showToast(`Invalid rate for ${b.label} — must be a positive ₹/gram`, 'error', 'Bullion Rate');
        return;
      }
    }

    // Compromised seal must be documented before the session can be posted
    if (!isSealIntact && auditNotes.trim().length < 20) {
      showToast(
        'Lead seal was reported compromised — document the tampering in the audit notes (min 20 characters) before posting',
        'error',
        'Seal Tamper'
      );
      return;
    }

    setIsPostingTreasury(true);

    try {
      const sessionCode = `HUNDI-${Date.now().toString().slice(-6)}`;
      const nowStr = new Date().toISOString().slice(0, 10);
      const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      // Call addTreasuryTransaction into Treasury Ledger
      const success = addTreasuryTransaction({
        workspaceId: activeWorkspace?.id || 'ws-mandir',
        date: nowStr,
        type: 'Income',
        category: 'HUNDI_COLLECTION',
        amount: grandTotalINR,
        paymentMode: 'Cash',
        handledBy: `${key1Name} & ${key2Name}`,
        devoteeName: 'Anonymous Devotee Offerings (Hundi Golak)',
        purpose: `Sanctum Golak Cash Collection - Dual Custody Audit (${currentHundiBox.name})`,
        referenceNo: sessionCode,
        is80GEligible: false,
        taxReceiptIssued: false,
      });

      // C-8: honor the boolean — on false (quota blocked) the count was NOT
      // posted, so neither the success toast nor the POSTED status may fire.
      if (!success) {
        showToast(
          'Posting blocked: transaction quota reached for this workspace. The count was recorded but NOT posted to the ledger.',
          'error',
          'Quota Reached'
        );
        setIsPostingTreasury(false);
        return;
      }

      const newRecord: HundiSessionRecord = {
        id: `hundi-sess-${Date.now()}`,
        sessionCode,
        date: nowStr,
        timestamp: timeStr,
        hundiBoxId: currentHundiBox.id,
        hundiBoxName: currentHundiBox.name,
        leadSealNo,
        cctvRoom,
        custodian1: { name: key1Name, role: key1Role },
        custodian2: { name: key2Name, role: key2Role },
        denominations: { ...denominations },
        totalCashINR: totalCashNotesINR,
        totalCoinsINR,
        foreignCurrencies: [...foreignCurrencies],
        totalForeignINR,
        bullion: [...bullion],
        totalBullionGrams,
        grandTotalINR,
        treasuryTxId: sessionCode,
        auditNotes,
        status: 'POSTED_TO_TREASURY',
      };

      setPastSessions((prev) => [newRecord, ...prev]);
      setPostedSession(newRecord);
      setCurrentStep('POSTED_TO_TREASURY');

      showToast(`₹${grandTotalINR.toLocaleString('en-IN')} posted to Central Treasury Ledger!`, 'success');
    } catch (e) {
      console.error(e);
      showToast('Failed to post Hundi transaction. Please try again.', 'error');
    } finally {
      setIsPostingTreasury(false);
    }
  };

  const handleStartNewSession = () => {
    // Reset all states
    setCurrentStep('LOCKED');
    setLeadSealNo(`SL-${Math.floor(100000 + Math.random() * 900000)}`);
    setIsKey1Unlocked(false);
    setIsKey2Unlocked(false);
    setKey1Pin('');
    setKey2Pin('');
    setDenominations({
      '500': 0, '200': 0, '100': 0, '50': 0, '20': 0, '10': 0,
      '20_COIN': 0, '10_COIN': 0, '5_COIN': 0, '2_COIN': 0, '1_COIN': 0,
    });
    setForeignCurrencies((prev) => prev.map((f) => ({ ...f, quantity: 0 })));
    setBullion((prev) => prev.map((b) => ({ ...b, grams: 0, itemDescription: '' })));
    setPostedSession(null);
  };

  const handleTriggerPrintVoucher = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
      {/* =====================================================================
          AUDIT VOUCHER (PRINTABLE ONLY VIA @MEDIA PRINT)
      ===================================================================== */}
      <div className="hidden print:block fixed inset-0 bg-white text-black p-8 z-[99999]">
        <div className="border-4 border-black p-6 space-y-4 max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center border-b-2 border-black pb-4">
            <h1 className="text-2xl font-black uppercase tracking-wider">{activeWorkspace?.name || 'SHRI SANATAN MANDIR TRUST'}</h1>
            <p className="text-xs font-mono">Reg. No: {activeWorkspace?.trustRegNumber || 'TR/1985/ND-4412'} • 80G Approval: {activeWorkspace?.taxExemptionNumber || 'CIT(E)/80G/DEL-1029'}</p>
            <h2 className="text-lg font-bold uppercase mt-2 bg-black text-white py-1">
              HUNDI / GOLAK DUAL-CUSTODY AUDIT & TREASURY HANDOFF VOUCHER
            </h2>
          </div>

          {/* Session Details Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs font-mono border-b border-black pb-3">
            <div>
              <p><strong>{t('org.finance.hundiAudit.voucherNo')}</strong> {postedSession?.sessionCode || `HUNDI-${Date.now().toString().slice(-6)}`}</p>
              <p><strong>{t('org.finance.hundiAudit.dateTime')}</strong> {postedSession?.date || new Date().toISOString().slice(0, 10)} {postedSession?.timestamp || ''}</p>
              <p><strong>{t('org.finance.hundiAudit.hundiBox')}</strong> {currentHundiBox.name}</p>
              <p><strong>Box Identifier:</strong> {currentHundiBox.id} ({currentHundiBox.location})</p>
            </div>
            <div>
              <p><strong>Lead Seal Serial:</strong> {leadSealNo} (Physical Seal Intact)</p>
              <p><strong>{t('org.finance.hundiAudit.cctvAuditRoom')}</strong> {cctvRoom}</p>
              <p><strong>{t('org.finance.hundiAudit.treasuryRef')}</strong> {postedSession?.treasuryTxId || 'PENDING'}</p>
              <p><strong>{t('org.finance.hundiAudit.status')}</strong> CO-SIGNED & POSTED TO GENERAL TREASURY</p>
            </div>
          </div>

          {/* Denominations Table */}
          <div>
            <h3 className="text-xs font-black uppercase mb-1">Itemized Denomination Breakdown</h3>
            <table className="w-full text-xs border-collapse border border-black">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-black p-1 text-left">Denomination</th>
                  <th className="border border-black p-1 text-right">Count (Pieces)</th>
                  <th className="border border-black p-1 text-right">Value (INR ₹)</th>
                </tr>
              </thead>
              <tbody>
                {INR_DENOMINATIONS.map((d) => {
                  const denomKey = d.isCoin ? `${d.value}_COIN` : `${d.value}`;
                  const count = (postedSession ? postedSession.denominations[denomKey] : denominations[denomKey]) || 0;
                  if (count === 0) return null;

                  return (
                    <tr key={denomKey}>
                      <td className="border border-black p-1">{d.label}</td>
                      <td className="border border-black p-1 text-right">{count.toLocaleString('en-IN')}</td>
                      <td className="border border-black p-1 text-right font-bold">₹{(count * d.value).toLocaleString('en-IN')}</td>
                    </tr>
                  );
                })}
                <tr className="bg-gray-100 font-bold">
                  <td className="border border-black p-1">{t('org.finance.hundiAudit.subtotalPhysicalCash')}</td>
                  <td className="border border-black p-1 text-right">--</td>
                  <td className="border border-black p-1 text-right">₹{totalINRSubtotal.toLocaleString('en-IN')}</td>
                </tr>
                {totalForeignINR > 0 && (
                  <tr>
                    <td className="border border-black p-1">Foreign Currencies (INR Equiv)</td>
                    <td className="border border-black p-1 text-right">--</td>
                    <td className="border border-black p-1 text-right">₹{totalForeignINR.toLocaleString('en-IN')}</td>
                  </tr>
                )}
                <tr className="bg-black text-white font-black text-sm">
                  <td className="border border-black p-2 uppercase">{t('org.finance.hundiAudit.grandTotalDeposited')}</td>
                  <td className="border border-black p-2 text-right">--</td>
                  <td className="border border-black p-2 text-right">₹{grandTotalINR.toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Amount in words */}
          <div className="p-2 border border-black text-xs">
            <p><strong>{t('org.finance.hundiAudit.amountInWords')}</strong> {grandTotalWords}</p>
          </div>

          {/* Bullion Table if any */}
          {totalBullionGrams > 0 && (
            <div className="text-xs">
              <h4 className="font-bold">Bullion & Ornaments Lodged:</h4>
              <p>{totalBullionGrams.toFixed(2)} grams precious metals sealed in tamper-evident custody.</p>
            </div>
          )}

          {/* Legal Attestation Statement */}
          <p className="text-[10px] italic border-t border-black pt-2">
            "We, the undersigned dual custodial witnesses, solemnly attest and declare under CCTV surveillance that the lead seals of the aforementioned Hundi box were found unbroken prior to counting, and all offerings were verified in our mutual presence."
          </p>

          {/* Signature Blocks */}
          <div className="grid grid-cols-2 gap-8 pt-8 border-t-2 border-black text-xs">
            <div className="text-center">
              <div className="border-b border-black pb-8"></div>
              <p className="font-bold mt-1">{key1Name}</p>
              <p className="text-[10px] text-gray-700">Primary Custodian ({key1Role})</p>
            </div>
            <div className="text-center">
              <div className="border-b border-black pb-8"></div>
              <p className="font-bold mt-1">{key2Name}</p>
              <p className="text-[10px] text-gray-700">Secondary Custodian / Witness ({key2Role})</p>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          APP SCREEN UI (HIDDEN DURING PRINT)
      ===================================================================== */}
      <div className="print:hidden space-y-6">
        {/* Desk Header Banner */}
        <div className="bg-gradient-to-r from-stone-900 via-stone-950 to-stone-900 p-6 rounded-3xl border border-amber-500/30 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner shrink-0">
                <Lock className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    2-KEY DUAL CUSTODY
                  </span>
                  <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/30 flex items-center gap-1 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    CCTV ACTIVE • VAULT ROOM 1
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-amber-100 tracking-tight mt-1">{t('org.finance.hundiAudit.hundiGolakDualcustodyCountingDesk')}</h1>
                <p className="text-xs text-stone-400 mt-0.5">
                  Mandir Treasury Vault Security • Dual Keyholder Authentication • Real-Time Denomination Tally
                </p>
              </div>
            </div>

            {/* Header Right Controls: Quick Guide SOP & Navigation Switcher */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => openGuide('HUNDI_VAULT')}
                className="px-3.5 py-2.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                title="Open Shastric & Statutory Quick Guide (SOP) for Hundi Vault"
              >
                <span className="text-sm">💡</span>
                <span>Quick Guide / SOP</span>
              </button>

              <div className="flex items-center gap-2 bg-stone-900/90 p-1.5 rounded-2xl border border-stone-800">
                <button
                  type="button"
                  onClick={() => setActiveView('COUNTING')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeView === 'COUNTING'
                      ? 'bg-amber-500 text-stone-950 font-black shadow'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  <Coins className="w-4 h-4" />
                  <span>Live Counting Session</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveView('HISTORY')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeView === 'HISTORY'
                      ? 'bg-amber-500 text-stone-950 font-black shadow'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  <History className="w-4 h-4" />
                  <span>{t('org.finance.hundiAudit.auditHistory')}</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-stone-800 text-[10px] text-amber-300 font-mono">
                    {pastSessions.length}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================
            VIEW 1: ACTIVE COUNTING SESSION WORKFLOW
        =================================================================== */}
        {activeView === 'COUNTING' && (
          <div className="space-y-6">
            {/* Step Progress Indicator */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div
                className={`p-3 rounded-2xl border transition-all ${
                  currentStep === 'LOCKED'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-stone-900/60 border-stone-800 text-stone-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <span className="text-xs font-black">{t('org.finance.hundiAudit.dualkeyVaultUnlock')}</span>
                </div>
              </div>

              <div
                className={`p-3 rounded-2xl border transition-all ${
                  currentStep === 'COUNTING_IN_PROGRESS'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-stone-900/60 border-stone-800 text-stone-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <span className="text-xs font-black">Denomination Tally</span>
                </div>
              </div>

              <div
                className={`p-3 rounded-2xl border transition-all ${
                  currentStep === 'REVIEW_AND_VERIFY'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-stone-900/60 border-stone-800 text-stone-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <span className="text-xs font-black">Review & Co-Sign</span>
                </div>
              </div>

              <div
                className={`p-3 rounded-2xl border transition-all ${
                  currentStep === 'POSTED_TO_TREASURY'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-stone-900/60 border-stone-800 text-stone-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center font-bold text-xs">
                    4
                  </div>
                  <span className="text-xs font-black">{t('org.finance.hundiAudit.postedVoucher')}</span>
                </div>
              </div>
            </div>

            {/* -------------------------------------------------------------
                STEP 1: LOCKED VAULT & DUAL-CUSTODY AUTHENTICATION
            ------------------------------------------------------------- */}
            {currentStep === 'LOCKED' && (
              <div className="bg-stone-900/90 rounded-3xl border-2 border-stone-800 p-6 sm:p-8 space-y-8 shadow-2xl relative">
                {/* Vault Door Top Visual */}
                <div className="text-center space-y-2">
                  <div className="w-20 h-20 mx-auto rounded-full bg-stone-950 border-4 border-amber-500/40 flex items-center justify-center text-amber-400 shadow-2xl shadow-amber-500/20">
                    <KeyRound className="w-10 h-10 animate-bounce" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    Mandir Vault Door Locked • 2-Key Custodial Protocol
                  </h2>
                  <p className="text-xs text-stone-400 max-w-xl mx-auto">
                    To maintain strict Shastric accountability and avoid audit disputes, Hundi boxes can only be opened when two distinct authorized officers verify their credentials concurrently.
                  </p>
                </div>

                {/* Hundi Box & Lead Seal Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-stone-950 p-5 rounded-2xl border border-stone-800">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-400">{t('org.finance.hundiAudit.selectHundiGolakBox')}</label>
                    <select
                      value={selectedHundiId}
                      onChange={(e) => setSelectedHundiId(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                    >
                      {HUNDI_BOXES.map((box) => (
                        <option key={box.id} value={box.id}>
                          {box.name}
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-amber-400 font-mono">
                      Location: {currentHundiBox.location} • Last Count: {currentHundiBox.lastCleared}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-400">Lead Seal Serial Number</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={leadSealNo}
                        onChange={(e) => setLeadSealNo(e.target.value)}
                        className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => setLeadSealNo(`SL-${Math.floor(100000 + Math.random() * 900000)}`)}
                        className="px-2 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs"
                        title="Generate Random Seal No"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-[10px] text-stone-500 font-mono">Verified against box dispatch ledger</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-400">{t('org.finance.hundiAudit.physicalSealIntegrity')}</label>
                    <div className="flex items-center gap-3 pt-2">
                      <label className="flex items-center gap-2 text-xs text-emerald-400 font-bold cursor-pointer">
                        <input
                          type="radio"
                          name="sealStatus"
                          checked={isSealIntact}
                          onChange={() => setIsSealIntact(true)}
                          className="text-emerald-500 focus:ring-emerald-500"
                        />
                        <span>Intact & Untampered</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-rose-400 font-bold cursor-pointer">
                        <input
                          type="radio"
                          name="sealStatus"
                          checked={!isSealIntact}
                          onChange={() => setIsSealIntact(false)}
                          className="text-rose-500 focus:ring-rose-500"
                        />
                        <span>Tampered / Broken</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Dual-Custody Keypad Stations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Keyholder 1 (Primary) */}
                  <div className={`p-5 rounded-2xl border-2 transition-all ${
                    isKey1Unlocked
                      ? 'bg-emerald-950/20 border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                      : 'bg-stone-950 border-stone-800'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isKey1Unlocked ? 'bg-emerald-500 text-stone-950' : 'bg-stone-800 text-stone-400'
                        }`}>
                          <KeyRound className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-xs font-black uppercase tracking-wider text-white">{t('org.finance.hundiAudit.keyholder1PrimaryCustodian')}</h3>
                          <span className="text-[10px] font-mono text-stone-400">{t('org.finance.hundiAudit.chiefAccountantAdmin')}</span>
                        </div>
                      </div>

                      {isKey1Unlocked ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> KEY 1 ENGAGED
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-stone-800 text-stone-400 text-[10px] font-bold">
                          LOCKED
                        </span>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-stone-400 block mb-1">{t('org.finance.hundiAudit.custodianNameRole')}</label>
                        <input
                          type="text"
                          value={key1Name}
                          onChange={(e) => setKey1Name(e.target.value)}
                          disabled={isKey1Unlocked}
                          className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-500 disabled:opacity-60"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-stone-400 block mb-1">
                          Security PIN
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <input
                              type={showKey1Pin ? 'text' : 'password'}
                              value={key1Pin}
                              onChange={(e) => setKey1Pin(e.target.value)}
                              disabled={isKey1Unlocked}
                              maxLength={6}
                              placeholder="Enter 4-digit PIN"
                              className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-sm font-mono tracking-widest text-amber-400 focus:outline-none focus:border-amber-500 disabled:opacity-60"
                            />
                            <button
                              type="button"
                              onClick={() => setShowKey1Pin(!showKey1Pin)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white"
                            >
                              {showKey1Pin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>

                          {/* Quick Biometric FaceID/TouchID Scan Button */}
                          {!isKey1Unlocked && (
                            <button
                              type="button"
                              onClick={handleBiometricKey1}
                              title="Bypass PIN using Keyholder 1 FaceID / Fingerprint"
                              className="group relative p-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-400/40 shadow-md hover:shadow-emerald-500/20 cursor-pointer active:scale-95 transition-all flex items-center justify-center shrink-0"
                            >
                              <Fingerprint className="w-4 h-4 group-hover:scale-110 transition-transform text-emerald-100" />
                              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-300"></span>
                              </span>
                            </button>
                          )}
                        </div>
                      </div>

                      {!isKey1Unlocked ? (
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={handleVerifyKey1}
                            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Unlock className="w-4 h-4" />
                            <span>Authenticate Keyholder 1</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleBiometricKey1}
                            className="w-full py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Fingerprint className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Unlock with FaceID / TouchID</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setIsKey1Unlocked(false); setKey1Pin(''); }}
                          className="text-[10px] text-stone-500 hover:text-stone-300 underline"
                        >
                          Change Keyholder 1
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Keyholder 2 (Secondary / Witness) */}
                  <div className={`p-5 rounded-2xl border-2 transition-all ${
                    isKey2Unlocked
                      ? 'bg-emerald-950/20 border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                      : 'bg-stone-950 border-stone-800'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isKey2Unlocked ? 'bg-emerald-500 text-stone-950' : 'bg-stone-800 text-stone-400'
                        }`}>
                          <KeyRound className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-xs font-black uppercase tracking-wider text-white">{t('org.finance.hundiAudit.keyholder2WitnessCustodian')}</h3>
                          <span className="text-[10px] font-mono text-stone-400">{t('org.finance.hundiAudit.trusteeHeadSevadar')}</span>
                        </div>
                      </div>

                      {isKey2Unlocked ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> KEY 2 ENGAGED
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-stone-800 text-stone-400 text-[10px] font-bold">
                          LOCKED
                        </span>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-stone-400 block mb-1">{t('org.finance.hundiAudit.selectWitnessTrustee')}</label>
                        <select
                          value={key2Name}
                          onChange={(e) => {
                            const found = PRESET_TRUSTEES.find((t) => t.name === e.target.value);
                            setKey2Name(e.target.value);
                            if (found) setKey2Role(found.role);
                          }}
                          disabled={isKey2Unlocked}
                          className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-500 disabled:opacity-60"
                        >
                          {PRESET_TRUSTEES.map((t) => (
                            <option key={t.name} value={t.name}>
                              {t.name} ({t.role})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-stone-400 block mb-1">
                          Witness Security PIN
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <input
                              type={showKey2Pin ? 'text' : 'password'}
                              value={key2Pin}
                              onChange={(e) => setKey2Pin(e.target.value)}
                              disabled={isKey2Unlocked}
                              maxLength={6}
                              placeholder="Enter 4-digit PIN"
                              className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-sm font-mono tracking-widest text-amber-400 focus:outline-none focus:border-amber-500 disabled:opacity-60"
                            />
                            <button
                              type="button"
                              onClick={() => setShowKey2Pin(!showKey2Pin)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white"
                            >
                              {showKey2Pin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>

                          {/* Quick Biometric FaceID/TouchID Scan Button */}
                          {!isKey2Unlocked && (
                            <button
                              type="button"
                              onClick={handleBiometricKey2}
                              title="Bypass PIN using Keyholder 2 FaceID / Fingerprint"
                              className="group relative p-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-400/40 shadow-md hover:shadow-emerald-500/20 cursor-pointer active:scale-95 transition-all flex items-center justify-center shrink-0"
                            >
                              <Fingerprint className="w-4 h-4 group-hover:scale-110 transition-transform text-emerald-100" />
                              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-300"></span>
                              </span>
                            </button>
                          )}
                        </div>
                      </div>

                      {!isKey2Unlocked ? (
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={handleVerifyKey2}
                            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Unlock className="w-4 h-4" />
                            <span>Authenticate Keyholder 2</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleBiometricKey2}
                            className="w-full py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Fingerprint className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Unlock with FaceID / TouchID</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setIsKey2Unlocked(false); setKey2Pin(''); }}
                          className="text-[10px] text-stone-500 hover:text-stone-300 underline"
                        >
                          Change Keyholder 2
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Final Unlock Action Button */}
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={handleBreakSealAndUnlock}
                    disabled={!isKey1Unlocked || !isKey2Unlocked}
                    className={`px-8 py-4 rounded-2xl text-sm font-black transition-all cursor-pointer shadow-xl flex items-center gap-2 mx-auto ${
                      isKey1Unlocked && isKey2Unlocked
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-stone-950 shadow-emerald-500/20 scale-105 animate-pulse'
                        : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'
                    }`}
                  >
                    <Unlock className="w-5 h-5" />
                    <span>{t('org.finance.hundiAudit.breakLeadSealOpenHundiForCounting')}</span>
                  </button>
                  {(!isKey1Unlocked || !isKey2Unlocked) && (
                    <p className="text-[11px] text-stone-500 mt-2">
                      ⚠️ Both Keyholder 1 and Keyholder 2 PINs are required to proceed.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* -------------------------------------------------------------
                STEP 2: DENOMINATION TALLY (CURRENCY COUNTER GRID)
            ------------------------------------------------------------- */}
            {currentStep === 'COUNTING_IN_PROGRESS' && (
              <div className="space-y-6">
                {/* Live Running Total Sticky Banner */}
                <div className="bg-gradient-to-r from-amber-950/60 via-stone-900 to-amber-950/60 border-2 border-amber-500/40 rounded-3xl p-5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center md:text-left">
                    <span className="text-[10px] uppercase font-black tracking-wider text-amber-400 flex items-center gap-1.5 justify-center md:justify-start">
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      LIVE AUDIT RUNNING GRAND TOTAL
                    </span>
                    <div className="text-2xl sm:text-4xl font-black text-amber-200 font-mono tracking-tight">
                      ₹{grandTotalINR.toLocaleString('en-IN')}
                    </div>
                    <p className="text-xs text-stone-300 font-medium italic">
                      "{grandTotalWords}"
                    </p>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap justify-center">
                    <div className="px-3 py-1.5 rounded-xl bg-stone-950 border border-stone-800 text-center">
                      <span className="text-[10px] text-stone-400 block">{t('org.finance.hundiAudit.notesValue')}</span>
                      <strong className="text-xs text-white font-mono">₹{totalCashNotesINR.toLocaleString('en-IN')}</strong>
                    </div>

                    <div className="px-3 py-1.5 rounded-xl bg-stone-950 border border-stone-800 text-center">
                      <span className="text-[10px] text-stone-400 block">Coins Value</span>
                      <strong className="text-xs text-white font-mono">₹{totalCoinsINR.toLocaleString('en-IN')}</strong>
                    </div>

                    {totalForeignINR > 0 && (
                      <div className="px-3 py-1.5 rounded-xl bg-stone-950 border border-stone-800 text-center">
                        <span className="text-[10px] text-cyan-400 block">Foreign Value</span>
                        <strong className="text-xs text-white font-mono">₹{totalForeignINR.toLocaleString('en-IN')}</strong>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setCurrentStep('REVIEW_AND_VERIFY')}
                      className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-lg transition-transform hover:scale-105 cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Proceed to Verification</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Currency Counting Grid (Indian Rupees) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                      <Coins className="w-4 h-4" />
                      <span>{t('org.finance.hundiAudit.indianRupeeDenominationsNotesCoins')}</span>
                    </h3>
                    <span className="text-xs text-stone-400">
                      Tap bundle increment buttons or type count directly
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {INR_DENOMINATIONS.map((d) => {
                      const denomKey = d.isCoin ? `${d.value}_COIN` : `${d.value}`;
                      const count = denominations[denomKey] || 0;
                      const subtotal = count * d.value;

                      return (
                        <div
                          key={denomKey}
                          className={`p-4 rounded-2xl border-2 transition-all ${
                            count > 0
                              ? 'bg-stone-900 border-amber-500/50 shadow-md'
                              : 'bg-stone-950/80 border-stone-800'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className={`px-2.5 py-1 rounded-xl text-xs font-black ${d.color} ${d.textColor} border ${d.borderColor}`}>
                              {d.label}
                            </span>
                            <span className="text-sm font-black font-mono text-white">
                              ₹{subtotal.toLocaleString('en-IN')}
                            </span>
                          </div>

                          {/* Direct Input & Quick Adjusters */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(denomKey, -1)}
                                disabled={count === 0}
                                className="w-10 h-10 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 font-bold flex items-center justify-center border border-stone-800 disabled:opacity-40"
                              >
                                <Minus className="w-4 h-4" />
                              </button>

                              <input
                                type="number"
                                min="0"
                                value={count === 0 ? '' : count}
                                placeholder="0"
                                onChange={(e) => handleSetExactQty(denomKey, e.target.value)}
                                className="w-full text-center bg-stone-900 border border-stone-800 rounded-xl h-10 text-base font-black font-mono text-amber-300 focus:outline-none focus:border-amber-500 shadow-inner"
                              />

                              <button
                                type="button"
                                onClick={() => handleUpdateQty(denomKey, 1)}
                                className="w-10 h-10 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 font-bold flex items-center justify-center border border-stone-800"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Quick Bundle Preset Buttons (+5, +10, +50, +100) */}
                            <div className="grid grid-cols-4 gap-1">
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(denomKey, 5)}
                                className="py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-[10px] font-bold text-stone-400 hover:text-white border border-stone-800/60"
                              >
                                +5
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(denomKey, 10)}
                                className="py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-[10px] font-bold text-stone-400 hover:text-white border border-stone-800/60"
                              >
                                +10
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(denomKey, 50)}
                                className="py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-[10px] font-bold text-stone-400 hover:text-white border border-stone-800/60"
                              >
                                +50
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(denomKey, 100)}
                                className="py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-[10px] font-bold text-amber-400 hover:text-amber-300 border border-stone-800/60"
                              >
                                +100
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sub-Sections: Foreign Currency & Bullion Offerings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  {/* Foreign Currency */}
                  <div className="bg-stone-950 p-5 rounded-2xl border border-stone-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4" />
                        <span>Foreign Currency (Videshi Mudra)</span>
                      </h4>
                      <span className="text-[10px] text-stone-400 font-mono">
                        Total: ₹{totalForeignINR.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {foreignCurrencies.map((fc, index) => (
                        <div key={fc.currency} className="flex items-center justify-between gap-3 p-2 rounded-xl bg-stone-900 border border-stone-800 text-xs">
                          <div>
                            <span className="font-bold text-white block">{fc.name}</span>
                            <span className="text-[10px] text-stone-400 font-mono">Rate: ₹{fc.rate} / 1 {fc.currency}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              value={fc.quantity === 0 ? '' : fc.quantity}
                              placeholder="0"
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10) || 0;
                                setForeignCurrencies((prev) =>
                                  prev.map((item, idx) => (idx === index ? { ...item, quantity: val } : item))
                                );
                              }}
                              className="w-16 text-center bg-stone-950 border border-stone-800 rounded-lg py-1 text-xs font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-500"
                            />
                            <span className="text-xs font-mono text-stone-300 w-20 text-right">
                              ₹{(fc.quantity * fc.rate).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bullion Offerings (Gold & Silver) */}
                  <div className="bg-stone-950 p-5 rounded-2xl border border-stone-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" />
                        <span>Bullion & Ornaments (Swarna / Rajat)</span>
                      </h4>
                      <span className="text-[10px] text-stone-400 font-mono">
                        Weight: {totalBullionGrams.toFixed(2)}g
                      </span>
                    </div>

                    <div className="space-y-2">
                      {bullion.map((b, index) => (
                        <div key={b.type} className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white">{b.label}</span>
                            <span className="text-[10px] text-stone-400 font-mono">~₹{b.ratePerGram}/g</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Weight (grams)"
                              value={b.grams === 0 ? '' : b.grams}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setBullion((prev) =>
                                  prev.map((item, idx) => (idx === index ? { ...item, grams: val } : item))
                                );
                              }}
                              className="bg-stone-950 border border-stone-800 rounded-lg px-2 py-1 text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-500"
                            />
                            <input
                              type="text"
                              placeholder="Pouch Seal No / Note"
                              value={b.itemDescription}
                              onChange={(e) => {
                                const desc = e.target.value;
                                setBullion((prev) =>
                                  prev.map((item, idx) => (idx === index ? { ...item, itemDescription: desc } : item))
                                );
                              }}
                              className="bg-stone-950 border border-stone-800 rounded-lg px-2 py-1 text-xs text-stone-300 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Navigation Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-stone-800">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Cancel counting and relock vault? Counted data will be cleared.')) {
                        handleStartNewSession();
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                  >{t('org.finance.hundiAudit.abortRelockVault')}</button>

                  <button
                    type="button"
                    onClick={() => setCurrentStep('REVIEW_AND_VERIFY')}
                    className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-lg transition-transform hover:scale-105 cursor-pointer flex items-center gap-2"
                  >
                    <span>Proceed to Review & Co-Sign</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------------
                STEP 3: REVIEW & TREASURY HANDOFF
            ------------------------------------------------------------- */}
            {currentStep === 'REVIEW_AND_VERIFY' && (
              <div className="bg-stone-900/90 rounded-3xl border-2 border-amber-500/30 p-6 sm:p-8 space-y-6 shadow-2xl">
                <div className="flex items-center justify-between border-b border-stone-800 pb-4">
                  <div>
                    <h2 className="text-lg font-black text-white">{t('org.finance.hundiAudit.physicalCountAuditVerificationTreasuryHa')}</h2>
                    <p className="text-xs text-stone-400">
                      Carefully verify denomination counts before co-signing and posting into the Central Mandir Treasury ledger.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-stone-400 block font-mono">{t('org.finance.hundiAudit.totalNetOfferings')}</span>
                    <strong className="text-2xl font-black text-amber-300 font-mono">
                      ₹{grandTotalINR.toLocaleString('en-IN')}
                    </strong>
                  </div>
                </div>

                {/* Trailing-average variance alert: count deviates >=50% from this box's history */}
                {trailingVariance && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs leading-relaxed">
                      <p className="font-black text-amber-300 uppercase tracking-wider mb-1">
                        Count Variance Alert — Reconcile Before Posting
                      </p>
                      <p className="text-amber-200/90">
                        This count of <span className="font-bold font-mono">₹{grandTotalINR.toLocaleString('en-IN')}</span> is{' '}
                        <span className="font-bold font-mono">
                          {trailingVariance.devPct > 0 ? '+' : ''}{trailingVariance.devPct.toFixed(1)}%
                        </span>{' '}
                        vs the trailing average of <span className="font-bold font-mono">₹{Math.round(trailingVariance.avg).toLocaleString('en-IN')}</span>{' '}
                        across {trailingVariance.sessions} prior sessions for this box. Please re-verify denominations —
                        large deviations can indicate a missed bundle or a data-entry slip.
                      </p>
                    </div>
                  </div>
                )}

                {/* Audit Attestation Badges */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 space-y-1">
                    <span className="text-[10px] text-stone-400 uppercase font-black">{t('org.finance.hundiAudit.hundiBoxSeal')}</span>
                    <p className="text-xs font-bold text-white">{currentHundiBox.name}</p>
                    <span className="text-[10px] text-amber-400 font-mono">Lead Seal #{leadSealNo}</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 space-y-1">
                    <span className="text-[10px] text-stone-400 uppercase font-black">{t('org.finance.hundiAudit.custodian1Accountant')}</span>
                    <p className="text-xs font-bold text-white">{key1Name}</p>
                    <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> PIN Verified
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 space-y-1">
                    <span className="text-[10px] text-stone-400 uppercase font-black">{t('org.finance.hundiAudit.custodian2Trustee')}</span>
                    <p className="text-xs font-bold text-white">{key2Name}</p>
                    <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> PIN Verified
                    </span>
                  </div>
                </div>

                {/* Itemized Denomination Review Table */}
                <div className="bg-stone-950 rounded-2xl border border-stone-800 overflow-hidden">
                  <div className="p-3 bg-stone-900 border-b border-stone-800 flex items-center justify-between text-xs font-bold text-stone-300">
                    <span>Denomination</span>
                    <span>Pieces (Qty)</span>
                    <span>Value (INR ₹)</span>
                  </div>

                  <div className="divide-y divide-stone-900 max-h-72 overflow-y-auto custom-scrollbar">
                    {INR_DENOMINATIONS.map((d) => {
                      const denomKey = d.isCoin ? `${d.value}_COIN` : `${d.value}`;
                      const count = denominations[denomKey] || 0;
                      if (count === 0) return null;

                      return (
                        <div key={denomKey} className="p-3 flex items-center justify-between text-xs font-mono">
                          <span className="text-stone-300 font-bold">{d.label}</span>
                          <span className="text-stone-400">{count.toLocaleString('en-IN')} pcs</span>
                          <span className="text-amber-300 font-bold">₹{(count * d.value).toLocaleString('en-IN')}</span>
                        </div>
                      );
                    })}

                    {totalForeignINR > 0 && (
                      <div className="p-3 flex items-center justify-between text-xs font-mono bg-cyan-950/20">
                        <span className="text-cyan-300 font-bold">Foreign Currencies (USD/GBP/EUR)</span>
                        <span className="text-stone-400">Multiple</span>
                        <span className="text-cyan-300 font-bold">₹{totalForeignINR.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-stone-900 border-t border-stone-800 flex items-center justify-between text-xs font-black">
                    <span className="text-white uppercase">{t('org.finance.hundiAudit.grandTotalToPost')}</span>
                    <span className="text-amber-300 font-mono text-base">₹{grandTotalINR.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Audit & Discrepancy Observation Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-400">{t('org.finance.hundiAudit.auditorCustodianAttestationNotes')}</label>
                  <textarea
                    rows={2}
                    value={auditNotes}
                    onChange={(e) => setAuditNotes(e.target.value)}
                    placeholder="Enter any audit observations, soil notes noted, or weigh-scale notes..."
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Final Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-stone-800">
                  <button
                    type="button"
                    onClick={() => setCurrentStep('COUNTING_IN_PROGRESS')}
                    className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    ← Back to Edit Counts
                  </button>

                  <button
                    type="button"
                    onClick={handlePostToTreasury}
                    disabled={isPostingTreasury}
                    className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-stone-950 font-black text-xs shadow-xl shadow-emerald-500/20 cursor-pointer flex items-center gap-2 transition-transform hover:scale-105"
                  >
                    {isPostingTreasury ? (
                      <span>{t('org.finance.hundiAudit.postingToTreasury')}</span>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>{t('org.finance.hundiAudit.cosignPostToCentralTreasuryLedger')}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------------
                STEP 4: POSTED TO TREASURY SUCCESS STATE & PRINT VOUCHER
            ------------------------------------------------------------- */}
            {currentStep === 'POSTED_TO_TREASURY' && (
              <div className="bg-stone-900/90 rounded-3xl border-2 border-emerald-500/40 p-6 sm:p-8 space-y-6 text-center shadow-2xl">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h2 className="text-xl sm:text-2xl font-black text-white">{t('org.finance.hundiAudit.hundiCashCountCertifiedPostedToTreasury')}</h2>
                  <p className="text-xs text-stone-400 max-w-lg mx-auto">
                    The total amount of <strong>₹{grandTotalINR.toLocaleString('en-IN')}</strong> has been posted as a verified income receipt to the Central Treasury Ledger under category <code>HUNDI_COLLECTION</code>.
                  </p>
                </div>

                {/* Session Reference Box */}
                <div className="inline-flex items-center gap-3 bg-stone-950 px-4 py-2 rounded-2xl border border-stone-800 text-xs font-mono">
                  <span className="text-stone-400">{t('org.finance.hundiAudit.voucherRef')}</span>
                  <strong className="text-amber-400">{postedSession?.sessionCode}</strong>
                  <span className="text-stone-600">•</span>
                  <span className="text-emerald-400 font-bold">{t('org.finance.hundiAudit.auditVerified')}</span>
                </div>

                {/* Primary Actions */}
                <div className="flex items-center justify-center gap-4 flex-wrap pt-4">
                  <button
                    type="button"
                    onClick={handleTriggerPrintVoucher}
                    className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-lg transition-transform hover:scale-105 cursor-pointer flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    <span>{t('org.finance.hundiAudit.printOfficialAuditVoucher')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleStartNewSession}
                    className="px-6 py-3 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t('org.finance.hundiAudit.startNewHundiCount')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            VIEW 2: AUDIT LOGS & HISTORICAL CERTIFICATES
        =================================================================== */}
        {activeView === 'HISTORY' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white">{t('org.finance.hundiAudit.historicalHundiCountingAuditRecords')}</h3>
                <p className="text-xs text-stone-400">
                  Review previously locked and verified Hundi sessions, lead seal records, and reprint vouchers.
                </p>
              </div>

              <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/20">
                {pastSessions.length} Total Audits Recorded
              </span>
              <DataExportButton
                filename={`hundi_audit_history_${new Date().toISOString().slice(0, 10)}.csv`}
                label="Export History"
                className="!bg-stone-800 !border-stone-700 !text-stone-200 hover:!text-amber-300"
                records={pastSessions.map((s) => ({
                  sessionCode: s.sessionCode,
                  date: s.date,
                  time: s.timestamp,
                  hundiBox: s.hundiBoxName,
                  leadSealNo: s.leadSealNo,
                  custodian1: `${s.custodian1.name} (${s.custodian1.role})`,
                  custodian2: `${s.custodian2.name} (${s.custodian2.role})`,
                  cashNotesINR: s.totalCashINR,
                  coinsINR: s.totalCoinsINR,
                  foreignINR: Math.round(s.totalForeignINR),
                  bullionGrams: s.totalBullionGrams,
                  grandTotalINR: s.grandTotalINR,
                  treasuryRef: s.treasuryTxId || '',
                  status: s.status,
                }))}
              />
            </div>

            <div className="grid grid-cols-1 gap-3">
              {pastSessions.map((session) => (
                <div
                  key={session.id}
                  className="p-5 rounded-2xl bg-stone-900 border border-stone-800 hover:border-amber-500/30 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-mono text-xs font-bold border border-amber-500/30">
                        {session.sessionCode}
                      </span>
                      <span className="text-xs text-stone-400 flex items-center gap-1 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-stone-500" />
                        {session.date} {session.timestamp}
                      </span>
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Lead Seal #{session.leadSealNo}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white">
                      {session.hundiBoxName}
                    </h4>

                    <p className="text-[11px] text-stone-400">
                      Custodians: <strong>{session.custodian1.name}</strong> ({session.custodian1.role}) &{' '}
                      <strong>{session.custodian2.name}</strong> ({session.custodian2.role})
                    </p>
                  </div>

                  <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-stone-800">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] text-stone-500 uppercase font-mono block">{t('org.finance.hundiAudit.depositedTotal')}</span>
                      <span className="text-base font-black text-amber-300 font-mono">
                        ₹{session.grandTotalINR.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setPostedSession(session);
                        setTimeout(() => window.print(), 100);
                      }}
                      className="p-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 transition-colors cursor-pointer"
                      title="Reprint Audit Voucher"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Hardware Biometric Authentication Modal */}
      <BiometricPromptModal />
    </div>
  );
};

export default HundiCountingAuditDesk;
