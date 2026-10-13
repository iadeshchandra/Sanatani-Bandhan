import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Coins,
  Search,
  User,
  Phone,
  CreditCard,
  Banknote,
  QrCode,
  Printer,
  Sparkles,
  CheckCircle2,
  Trash2,
  Plus,
  Minus,
  FileCheck2,
  X,
  BookOpen,
  Calendar,
  Building,
  Heart,
  Flame,
  ShieldCheck,
  RefreshCw,
  ShoppingBag,
  ArrowRight,
  Receipt,
  UserCheck,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useData } from '../../context/DataContext';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useQuickGuide } from '../../context/QuickGuideContext';
import { useToast } from '../../context/ToastContext';
import { printThermalReceipt } from '../../utils/printUtils';
import { formatINR } from '../../utils/format';
import { isValidPAN, isValidPhoneIN, sanitizeName } from '../../utils/validation';
import { TreasuryTransaction, DevoteeMember } from '../../types';

// Duplicate-receipt detection window: same devotee + same amount within 5 minutes
const DUPLICATE_WINDOW_MS = 5 * 60 * 1000;
// Suggest 80G receipts at/above this threshold (CBDT cash-reporting relevance)
const SUGGEST_80G_THRESHOLD = 2000;

// Predefined Quick Amount Chips
const QUICK_AMOUNTS = [101, 501, 1100, 5100];

// Category Tabs
export type PosCategory = 'General Chanda' | 'Annadanam' | 'Goshala Seva' | 'Puja Booking';

export interface CatalogItem {
  id: string;
  name: string;
  category: PosCategory;
  defaultAmount: number;
  description: string;
  prasadamIncluded: boolean;
  shastricSignificance: string;
  iconName: 'Coins' | 'Heart' | 'Flame' | 'Sparkles';
}

export interface CartItem {
  itemId: string;
  name: string;
  category: PosCategory;
  unitAmount: number;
  quantity: number;
  prasadamIncluded: boolean;
  notes?: string;
}

export type PosPaymentMode = 'CASH' | 'UPI' | 'CARD';

export const CATALOG_ITEMS: CatalogItem[] = [
  // General Chanda
  {
    id: 'chanda-gen-101',
    name: 'Nitya Mandir Seva Chanda',
    category: 'General Chanda',
    defaultAmount: 101,
    description: 'Voluntary daily offering for mandir upkeep & oil lamps',
    prasadamIncluded: false,
    shastricSignificance: 'Nitya Deepa Seva & Alankaram',
    iconName: 'Coins',
  },
  {
    id: 'chanda-gen-501',
    name: 'Vishesh Chanda & Archana',
    category: 'General Chanda',
    defaultAmount: 501,
    description: 'Special devotional chanda with sacred archana in donor name',
    prasadamIncluded: true,
    shastricSignificance: 'Ashtottara Shatanamavali Archana',
    iconName: 'Coins',
  },
  {
    id: 'chanda-gen-1100',
    name: 'Mandir Jirnoddhar Nirman Chanda',
    category: 'General Chanda',
    defaultAmount: 1100,
    description: 'Permanent capital contribution towards temple sanctum preservation',
    prasadamIncluded: true,
    shastricSignificance: 'Mandir Nirman Punya Karyam',
    iconName: 'Coins',
  },
  {
    id: 'chanda-gen-5100',
    name: 'Raja Seva Maha Chanda',
    category: 'General Chanda',
    defaultAmount: 5100,
    description: 'Grand sponsorship for utsav decorations and silver ornaments polish',
    prasadamIncluded: true,
    shastricSignificance: 'Sampoorna Alankara Seva',
    iconName: 'Coins',
  },

  // Annadanam
  {
    id: 'chanda-anna-101',
    name: 'Sadhu & Pilgrim Tiffin Seva',
    category: 'Annadanam',
    defaultAmount: 101,
    description: 'Nutritious breakfast prasad for 5 travelling sadhus',
    prasadamIncluded: true,
    shastricSignificance: 'Atithi Satkara Dharma',
    iconName: 'Heart',
  },
  {
    id: 'chanda-anna-501',
    name: 'Annapurna Maha Bhog Seva',
    category: 'Annadanam',
    defaultAmount: 501,
    description: 'Midday full thali prasadam feast for 25 devotees',
    prasadamIncluded: true,
    shastricSignificance: 'Sri Annapurna Prasada Seva',
    iconName: 'Heart',
  },
  {
    id: 'chanda-anna-1100',
    name: 'Sampoorna Day Bhandara Seva',
    category: 'Annadanam',
    defaultAmount: 1100,
    description: 'Whole-day grains, desi ghee & sweet payasam distribution',
    prasadamIncluded: true,
    shastricSignificance: 'Maha Bhandara Mahadan',
    iconName: 'Heart',
  },
  {
    id: 'chanda-anna-5100',
    name: 'Utsav Maha Prasad Sponsorship',
    category: 'Annadanam',
    defaultAmount: 5100,
    description: 'Feeding over 250 devotees during festive Ekadashi / Purnima',
    prasadamIncluded: true,
    shastricSignificance: 'Brihad Anna Daanam',
    iconName: 'Heart',
  },

  // Goshala Seva
  {
    id: 'chanda-gau-101',
    name: 'Green Grass (Hari Ghaas) Basket',
    category: 'Goshala Seva',
    defaultAmount: 101,
    description: 'Fresh fodder and nutritional mineral salt for indigenous cows',
    prasadamIncluded: false,
    shastricSignificance: 'Gau Seva & Punya Labha',
    iconName: 'Heart',
  },
  {
    id: 'chanda-gau-501',
    name: 'Gau Grasa & Jaggery Feeding',
    category: 'Goshala Seva',
    defaultAmount: 501,
    description: 'Wholesome jaggery, wheat bran & oilcakes for milking cows',
    prasadamIncluded: false,
    shastricSignificance: 'Kapila Gau Puja',
    iconName: 'Heart',
  },
  {
    id: 'chanda-gau-1100',
    name: 'One Month Cow Care Sponsorship',
    category: 'Goshala Seva',
    defaultAmount: 1100,
    description: 'Veterinary aid, shed bedding, and feed for one sheltered cow',
    prasadamIncluded: true,
    shastricSignificance: 'Gau Raksha Samvardhanam',
    iconName: 'Heart',
  },
  {
    id: 'chanda-gau-5100',
    name: 'Gomata Adoption (Godan Sankalp)',
    category: 'Goshala Seva',
    defaultAmount: 5100,
    description: 'Perpetual care endowment for abandoned or elder cattle',
    prasadamIncluded: true,
    shastricSignificance: 'Pratyaksha Godanam Vrata',
    iconName: 'Heart',
  },

  // Puja Booking
  {
    id: 'chanda-puja-101',
    name: 'Archana & Tilak Sankalp',
    category: 'Puja Booking',
    defaultAmount: 101,
    description: 'Personalized gotra-nama archana with sanctified chandan & kumkum',
    prasadamIncluded: true,
    shastricSignificance: 'Nama Sankirtana Archana',
    iconName: 'Flame',
  },
  {
    id: 'chanda-puja-501',
    name: 'Panchamrita Abhishekam',
    category: 'Puja Booking',
    defaultAmount: 501,
    description: 'Ritual bathing of the deity with pure milk, curd, honey, ghee & sugar',
    prasadamIncluded: true,
    shastricSignificance: 'Shiva-Vishnu Abhishekam',
    iconName: 'Flame',
  },
  {
    id: 'chanda-puja-1100',
    name: 'Navagraha & Havan Homam',
    category: 'Puja Booking',
    defaultAmount: 1100,
    description: 'Sacred fire oblation with ahuti for planetary harmony and family health',
    prasadamIncluded: true,
    shastricSignificance: 'Shanti Yajna & Raksha Sutra',
    iconName: 'Flame',
  },
  {
    id: 'chanda-puja-5100',
    name: 'Kalyanotsavam / Chandi Path',
    category: 'Puja Booking',
    defaultAmount: 5100,
    description: 'Elaborate celestial divine wedding celebration or Vedic Chandi Path recitation',
    prasadamIncluded: true,
    shastricSignificance: 'Sarva Karya Siddhi Mahotsavam',
    iconName: 'Flame',
  },
];

export const QuickChandaPOS: React.FC = () => {
  const { activeWorkspace, currentUser } = useAuthWorkspace();
  const { devotees, addTreasuryTransaction, treasury } = useData();
  const { openGuide } = useQuickGuide();
  const { showToast } = useToast();

  // Active Category Tab
  const [selectedCategory, setSelectedCategory] = useState<PosCategory>('General Chanda');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([
    {
      itemId: 'chanda-gen-501',
      name: 'Vishesh Chanda & Archana',
      category: 'General Chanda',
      unitAmount: 501,
      quantity: 1,
      prasadamIncluded: true,
    },
  ]);

  // Devotee Lookup & Details
  const [mobileNumber, setMobileNumber] = useState('');
  const [devoteeName, setDevoteeName] = useState('');
  const [devoteeGotra, setDevoteeGotra] = useState('');
  const [devoteePan, setDevoteePan] = useState('');
  const [matchedDevotee, setMatchedDevotee] = useState<DevoteeMember | null>(null);
  const [isSearchingDevotee, setIsSearchingDevotee] = useState(false);

  // 80G Tax Exemption
  const [is80GRequested, setIs80GRequested] = useState(false);

  // Payment Mode
  const [paymentMode, setPaymentMode] = useState<PosPaymentMode>('UPI');

  // Sankalp Notes
  const [sankalpNote, setSankalpNote] = useState('');

  // Processing & Success State
  const [isProcessing, setIsProcessing] = useState(false);
  // Duplicate-receipt guard state
  const [duplicateAlert, setDuplicateAlert] = useState<{
    name: string;
    amount: number;
    minutesAgo: number;
  } | null>(null);
  const [duplicateOverride, setDuplicateOverride] = useState<string | null>(null);
  // 80G nudge shown once per threshold crossing
  const nudgeShownFor = useRef<number>(0);
  const [completedTransaction, setCompletedTransaction] = useState<{
    txId: string;
    receiptNo: string;
    urn80G: string;
    date: string;
    totalAmount: number;
    items: CartItem[];
    devoteeName: string;
    mobile: string;
    pan: string;
    paymentMode: PosPaymentMode;
    sankalpNote: string;
  } | null>(null);

  // Mobile Auto-Lookup Effect
  useEffect(() => {
    const cleanDigits = mobileNumber.replace(/\D/g, '');
    if (cleanDigits.length === 10) {
      setIsSearchingDevotee(true);
      // Look up in existing devotees
      const found = devotees.find((d) => {
        const dDigits = (d.phone || '').replace(/\D/g, '');
        return dDigits.endsWith(cleanDigits);
      });

      const timer = setTimeout(() => {
        if (found) {
          setMatchedDevotee(found);
          setDevoteeName(found.fullName || found.name || '');
          setDevoteeGotra(found.gotra || '');
          if (found.panNumber) {
            setDevoteePan(found.panNumber);
            setIs80GRequested(true);
          }
          showToast(`Devotee matched: ${found.fullName || found.name}`, 'info', 'Devotee Verified');
        } else {
          setMatchedDevotee(null);
          // Keep current inputs if typed
        }
        setIsSearchingDevotee(false);
      }, 250);
      return () => clearTimeout(timer);
    } else {
      if (matchedDevotee) {
        setMatchedDevotee(null);
      }
    }
  }, [mobileNumber, devotees, showToast]);

  // Cart Calculations
  const grandTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.unitAmount * item.quantity, 0);
  }, [cart]);

  const totalItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // 80G nudge: suggest a tax receipt when the total crosses the threshold
  useEffect(() => {
    if (grandTotal >= SUGGEST_80G_THRESHOLD && !is80GRequested && nudgeShownFor.current !== grandTotal) {
      nudgeShownFor.current = grandTotal;
      showToast(
        `Donation of ${formatINR(grandTotal)} qualifies — consider issuing an 80G tax receipt (PAN required).`,
        'info',
        '80G Suggestion'
      );
    }
    if (grandTotal < SUGGEST_80G_THRESHOLD) nudgeShownFor.current = 0;
  }, [grandTotal, is80GRequested, showToast]);

  // Duplicate-receipt guard: same devotee + same amount within the window
  const findDuplicateReceipt = (): { minutesAgo: number } | null => {
    const normName = sanitizeName(devoteeName || 'Sanatani Devotee').toLowerCase();
    const nowMs = Date.now();
    for (const t of treasury || []) {
      if (t.type !== 'Income') continue;
      const tName = sanitizeName(t.devoteeName || '').toLowerCase();
      if (!tName || tName !== normName) continue;
      if (Number(t.amount) !== grandTotal) continue;
      const rawTs = typeof t.createdAt === 'number' ? t.createdAt : Date.parse(String(t.createdAt ?? t.date ?? ''));
      if (!Number.isFinite(rawTs)) continue;
      const ageMs = nowMs - rawTs;
      if (ageMs >= 0 && ageMs < DUPLICATE_WINDOW_MS) {
        return { minutesAgo: Math.max(1, Math.round(ageMs / 60000)) };
      }
    }
    return null;
  };

  // Add Item to Cart
  const handleAddToCart = (item: CatalogItem, customAmount?: number) => {
    const amountToUse = customAmount || item.defaultAmount;
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(
        (ci) => ci.itemId === item.id && ci.unitAmount === amountToUse
      );
      if (existingIndex > -1) {
        const next = [...prevCart];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + 1,
        };
        return next;
      } else {
        return [
          ...prevCart,
          {
            itemId: item.id,
            name: item.name,
            category: item.category,
            unitAmount: amountToUse,
            quantity: 1,
            prasadamIncluded: item.prasadamIncluded,
          },
        ];
      }
    });
  };

  // Add Quick Amount to Current Category
  const handleAddQuickAmount = (amount: number) => {
    // Find generic or first item in current category
    const catItems = CATALOG_ITEMS.filter((i) => i.category === selectedCategory);
    const primary = catItems[0] || CATALOG_ITEMS[0];

    handleAddToCart(
      {
        ...primary,
        id: `custom-${selectedCategory}-${amount}`,
        name: `${selectedCategory} Offering`,
        defaultAmount: amount,
      },
      amount
    );
  };

  // Update Cart Quantity
  const handleUpdateQuantity = (index: number, delta: number) => {
    setCart((prev) => {
      const next = [...prev];
      const target = next[index];
      const newQty = target.quantity + delta;
      if (newQty <= 0) {
        next.splice(index, 1);
      } else {
        next[index] = { ...target, quantity: newQty };
      }
      return next;
    });
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  // Clear Cart
  const handleClearCart = () => {
    setCart([]);
  };

  // Checkout Execution
  const handleProcessCheckout = async () => {
    if (cart.length === 0) {
      showToast('Please add at least one Seva or Chanda item to checkout', 'error', 'Cart Empty');
      return;
    }

    if (grandTotal <= 0 || !Number.isFinite(grandTotal)) {
      showToast('Total donation amount must be greater than zero', 'error', 'Invalid Amount');
      return;
    }

    if (mobileNumber && !isValidPhoneIN(mobileNumber)) {
      showToast('Please enter a valid 10-digit Indian mobile number', 'error', 'Invalid Mobile');
      return;
    }

    if (is80GRequested && !isValidPAN(devoteePan)) {
      showToast('CBDT 80G receipt requires a valid PAN (format ABCDE1234F)', 'error', 'Invalid PAN');
      return;
    }

    // Duplicate-receipt guard: same devotee + same amount within 5 minutes
    const cleanName = sanitizeName(devoteeName) || 'Sanatani Devotee';
    const overrideKey = `${cleanName.toLowerCase()}|${grandTotal}`;
    if (duplicateOverride !== overrideKey) {
      const dupe = findDuplicateReceipt();
      if (dupe) {
        setDuplicateAlert({ name: cleanName, amount: grandTotal, minutesAgo: dupe.minutesAgo });
        showToast('Possible duplicate donation detected — please confirm before posting', 'warning', 'Duplicate Check');
        return;
      }
    }
    setDuplicateAlert(null);

    setIsProcessing(true);

    try {
      const now = new Date();
      const dateString = now.toISOString().split('T')[0];
      const timeStamp = now.getTime().toString();
      const generatedTxId = `POS-${now.getFullYear()}-${timeStamp.slice(-6)}`;
      const generatedReceiptNo = `SB-CHANDA-${now.getFullYear()}-${timeStamp.slice(-5)}`;
      const generatedUrn = `AAATB80G2026${timeStamp.slice(-4)}`;

      const primaryCategory = cart[0]?.category || 'General Chanda';
      const itemsSummary = cart
        .map((c) => `${c.quantity}x ${c.name} (₹${c.unitAmount * c.quantity})`)
        .join(', ');

      const formattedPaymentMode =
        paymentMode === 'UPI' ? 'UPI / QR' : paymentMode === 'CASH' ? 'Cash' : 'Card';

      // Record Treasury Transaction
      const newTx: Omit<TreasuryTransaction, 'id' | 'auditVerified'> = {
        workspaceId: activeWorkspace.id,
        date: dateString,
        type: 'Income',
        category: 'CHANDA_COLLECTION',
        subcategory: primaryCategory,
        amount: grandTotal,
        handledBy: currentUser?.fullName || currentUser?.name || 'Counter Sevadar',
        devoteeId: matchedDevotee?.id || undefined,
        devoteeName: cleanName,
        paymentMode: formattedPaymentMode,
        referenceNo: generatedReceiptNo,
        purpose: `${primaryCategory} POS Chanda: ${itemsSummary}${
          sankalpNote ? ` | Sankalp: ${sankalpNote}` : ''
        }`,
        is80GEligible: is80GRequested,
        taxReceiptIssued: is80GRequested,
        taxReceiptNumber: is80GRequested ? generatedReceiptNo : undefined,
      };

      // Add to treasury ledger.
      // C-8: honor the boolean return — on false (quota blocked) the chanda
      // was NOT persisted, so do not complete the sale or print a receipt
      // for money the ledger never recorded.
      const posted = addTreasuryTransaction(newTx);
      if (!posted) {
        showToast(
          'Chanda NOT processed: transaction quota reached for this workspace. No receipt was issued.',
          'error',
          'Quota Reached'
        );
        return;
      }

      const finalRecord = {
        txId: generatedTxId,
        receiptNo: generatedReceiptNo,
        urn80G: generatedUrn,
        date: now.toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
        totalAmount: grandTotal,
        items: [...cart],
        devoteeName: devoteeName.trim() || 'Sanatani Devotee',
        mobile: mobileNumber || 'N/A',
        pan: devoteePan.toUpperCase() || 'N/A',
        paymentMode,
        sankalpNote: sankalpNote.trim(),
      };

      setCompletedTransaction(finalRecord);
      showToast(
        `Chanda of ${formatINR(grandTotal)} successfully processed!`,
        'success',
        'Payment Completed'
      );
    } catch (err: any) {
      console.error('[POS Checkout Error]', err);
      showToast(err.message || 'Failed to process POS donation', 'error', 'Checkout Error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Trigger Thermal ESC/POS Print
  const handlePrintThermal = () => {
    if (!completedTransaction) return;

    // Use unified thermal print utility
    printThermalReceipt(
      {
        id: completedTransaction.txId,
        date: new Date().toISOString(),
        taxReceiptNumber: completedTransaction.receiptNo,
        devoteeName: completedTransaction.devoteeName,
        purpose: completedTransaction.items.map((i) => i.name).join(', '),
        amount: completedTransaction.totalAmount,
        paymentMode:
          completedTransaction.paymentMode === 'UPI'
            ? 'UPI / QR'
            : completedTransaction.paymentMode === 'CASH'
            ? 'Cash Tender'
            : 'POS Card',
      },
      activeWorkspace
    );
  };

  // Reset for next customer
  const handleResetForNewDevotee = () => {
    setCompletedTransaction(null);
    setCart([]);
    setMobileNumber('');
    setDevoteeName('');
    setDevoteeGotra('');
    setDevoteePan('');
    setMatchedDevotee(null);
    setIs80GRequested(false);
    setSankalpNote('');
    setDuplicateAlert(null);
    setDuplicateOverride(null);
    nudgeShownFor.current = 0;
  };

  // Filter Catalog by active tab
  const activeCatalogItems = useMemo(() => {
    return CATALOG_ITEMS.filter((item) => item.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans pb-16">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER BAR */}
      {/* ========================================================================= */}
      <header className="bg-stone-900/90 border-b border-amber-500/20 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-stone-950 font-black shadow-md shadow-amber-500/20">
            <Coins className="w-6 h-6 text-stone-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-1.5">
                Quick Chanda & Seva POS
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Tablet High-Speed Counter
              </span>
            </div>
            <p className="text-xs text-stone-400 font-medium">
              {activeWorkspace.name} • Counter Cashier:{' '}
              <span className="text-amber-400 font-semibold">
                {currentUser?.fullName || currentUser?.name || 'Sevadar'}
              </span>
            </p>
          </div>
        </div>

        {/* Header Action: SOP Quick Guide */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openGuide('QUICK_CHANDA_POS')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer group"
            title="Open Shastric & Statutory Operating Procedures for Quick Chanda"
          >
            <BookOpen className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">💡 Quick Guide / SOP</span>
            <span className="sm:hidden">SOP</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN 2-PANEL POS INTERFACE (Catalog on Left, Cart & Checkout on Right) */}
      {/* ========================================================================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ======================================================================= */}
        {/* LEFT PANEL: RAPID SELECTION GRID & CATALOG (cols 1-7)                  */}
        {/* ======================================================================= */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Quick Amount Chips */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-md">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Quick Amount Presets
              </span>
              <span className="text-[11px] text-stone-400">Instantly appends to cart</span>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleAddQuickAmount(amt)}
                  className="min-h-[48px] py-2.5 px-2 rounded-xl bg-stone-800/90 hover:bg-amber-500 hover:text-stone-950 border border-stone-700 hover:border-amber-400 text-stone-100 font-black text-sm sm:text-base transition-all flex flex-col items-center justify-center shadow-xs active:scale-95 cursor-pointer group"
                >
                  <span className="group-hover:text-stone-950 font-mono">₹{amt}</span>
                  <span className="text-[10px] text-stone-400 group-hover:text-stone-900 font-normal">
                    Quick Add
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Category Navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {(
              [
                'General Chanda',
                'Annadanam',
                'Goshala Seva',
                'Puja Booking',
              ] as PosCategory[]
            ).map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20 font-black'
                      : 'bg-stone-900 text-stone-300 hover:bg-stone-800 hover:text-white border border-stone-800'
                  }`}
                >
                  {cat === 'General Chanda' && <Coins className="w-4 h-4" />}
                  {cat === 'Annadanam' && <Heart className="w-4 h-4" />}
                  {cat === 'Goshala Seva' && <Heart className="w-4 h-4 text-emerald-400" />}
                  {cat === 'Puja Booking' && <Flame className="w-4 h-4 text-amber-500" />}
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>

          {/* Catalog Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 flex-1">
            {activeCatalogItems.map((item) => (
              <div
                key={item.id}
                onClick={() => handleAddToCart(item)}
                className="bg-stone-900/90 hover:bg-stone-850 border border-stone-800 hover:border-amber-500/50 rounded-2xl p-4 transition-all duration-200 cursor-pointer shadow-md flex flex-col justify-between group active:scale-[0.99] relative overflow-hidden"
              >
                {/* Gold Glow Top Border on hover */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500/0 group-hover:via-amber-500 to-transparent transition-all"></div>

                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="font-bold text-sm sm:text-base text-white group-hover:text-amber-300 transition-colors leading-snug">
                      {item.name}
                    </h3>
                    <span className="font-mono font-black text-amber-400 text-base shrink-0 bg-stone-950 px-2 py-0.5 rounded-lg border border-stone-800">
                      ₹{item.defaultAmount}
                    </span>
                  </div>

                  <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-stone-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-stone-400 italic font-serif">
                    {item.shastricSignificance}
                  </span>
                  {item.prasadamIncluded && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
                      Prasadam Included
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ======================================================================= */}
        {/* RIGHT PANEL: DEVOTEE LOOKUP, CART & CHECKOUT (cols 8-12)               */}
        {/* ======================================================================= */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Devotee Lookup Card */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" />
                Devotee Identification
              </span>
              {matchedDevotee ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  <UserCheck className="w-3 h-3" />
                  Existing Devotee
                </span>
              ) : (
                <span className="text-[11px] text-stone-400">10-Digit Mobile Search</span>
              )}
            </div>

            <div className="space-y-3">
              {/* Mobile Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <Phone className="w-4 h-4 text-stone-400" />
                </div>
                <input
                  type="tel"
                  maxLength={10}
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 10-Digit Mobile (e.g. 9876511223)"
                  className="w-full min-h-[44px] pl-10 pr-10 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 placeholder-stone-500 text-sm font-mono focus:border-amber-400 focus:outline-none transition-colors"
                />
                {isSearchingDevotee && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                  </div>
                )}
                {!isSearchingDevotee && mobileNumber.length === 10 && matchedDevotee && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                )}
              </div>

              {/* Devotee Name & Gotra Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={devoteeName}
                  onChange={(e) => setDevoteeName(e.target.value)}
                  placeholder="Devotee Full Name"
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 placeholder-stone-500 text-sm focus:border-amber-400 focus:outline-none transition-colors"
                />
                <input
                  type="text"
                  value={devoteeGotra}
                  onChange={(e) => setDevoteeGotra(e.target.value)}
                  placeholder="Gotra (e.g. Kashyapa)"
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 placeholder-stone-500 text-sm focus:border-amber-400 focus:outline-none transition-colors"
                />
              </div>

              {/* 80G Tax Exemption Toggle */}
              <div className="pt-2 border-t border-stone-800">
                <label className="flex items-center justify-between cursor-pointer py-1">
                  <div className="flex items-center gap-2">
                    <FileCheck2
                      className={`w-4 h-4 ${
                        is80GRequested ? 'text-amber-400' : 'text-stone-400'
                      }`}
                    />
                    <span className="text-xs font-bold text-stone-200">
                      Issue 80G Tax Exemption Receipt
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={is80GRequested}
                    onChange={(e) => setIs80GRequested(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 bg-stone-950 border-stone-700 focus:ring-amber-500 focus:ring-offset-stone-900 cursor-pointer"
                  />
                </label>

                {is80GRequested && (
                  <div className="mt-2.5 animate-in fade-in duration-200">
                    <input
                      type="text"
                      maxLength={10}
                      value={devoteePan}
                      onChange={(e) => setDevoteePan(e.target.value.toUpperCase())}
                      placeholder="Enter Devotee PAN (10-digit, e.g. ABCDE1234F)"
                      className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-stone-950 border border-amber-500/50 text-amber-300 placeholder-stone-500 text-sm font-mono uppercase tracking-wider focus:border-amber-400 focus:outline-none transition-colors"
                    />
                    <p className="text-[10px] text-amber-400/80 mt-1">
                      * Required under CBDT Rule 18AB & Form 10BD filing
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cart & Order Summary */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-md flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                  Donation Cart ({totalItemsCount} items)
                </span>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearCart}
                    className="text-[11px] font-bold text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Cart Items List */}
              <div className="divide-y divide-stone-800/80 max-h-60 overflow-y-auto my-2 pr-1">
                {cart.length === 0 ? (
                  <div className="py-8 text-center text-stone-500 text-xs">
                    Cart is empty. Tap items or quick amount presets on the left.
                  </div>
                ) : (
                  cart.map((item, idx) => (
                    <div key={`${item.itemId}-${idx}`} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{item.name}</p>
                        <p className="text-[10px] text-stone-400">
                          ₹{item.unitAmount} × {item.quantity}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(idx, -1)}
                          className="w-7 h-7 rounded-lg bg-stone-800 hover:bg-stone-700 flex items-center justify-center text-stone-300 hover:text-white transition-colors cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center text-xs font-bold font-mono">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(idx, 1)}
                          className="w-7 h-7 rounded-lg bg-stone-800 hover:bg-stone-700 flex items-center justify-center text-stone-300 hover:text-white transition-colors cursor-pointer"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="w-7 h-7 rounded-lg text-stone-500 hover:text-red-400 flex items-center justify-center transition-colors ml-1 cursor-pointer"
                          aria-label="Delete item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="w-16 text-right font-mono font-bold text-xs text-amber-300">
                        ₹{item.unitAmount * item.quantity}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Total, Payment Mode & Checkout Button */}
            <div className="pt-3 border-t border-stone-800 space-y-3">
              {/* Duplicate-receipt warning */}
              {duplicateAlert && (
                <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-200 leading-relaxed">
                      Possible duplicate: <span className="font-bold">{formatINR(duplicateAlert.amount)}</span> from{' '}
                      <span className="font-bold">{duplicateAlert.name}</span> was recorded ~{duplicateAlert.minutesAgo} min ago.
                      Double-entry at a busy counter is common — confirm before posting.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const key = `${sanitizeName(devoteeName || 'Sanatani Devotee').toLowerCase()}|${grandTotal}`;
                        setDuplicateOverride(key);
                        setDuplicateAlert(null);
                        handleProcessCheckout();
                      }}
                      className="flex-1 min-h-[44px] py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black transition-colors cursor-pointer"
                    >
                      Process Anyway
                    </button>
                    <button
                      type="button"
                      onClick={() => setDuplicateAlert(null)}
                      className="flex-1 min-h-[44px] py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Review Cart
                    </button>
                  </div>
                </div>
              )}

              {/* Sankalp / dedication note */}
              <div>
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block mb-1.5">
                  Sankalp Note (optional)
                </span>
                <input
                  type="text"
                  value={sankalpNote}
                  maxLength={200}
                  onChange={(e) => setSankalpNote(e.target.value)}
                  placeholder="e.g. For mother's health, on behalf of Sharma parivar"
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 placeholder-stone-500 text-sm focus:border-amber-400 focus:outline-none transition-colors"
                />
              </div>

              {/* Grand Total Bar */}
              <div className="flex items-center justify-between bg-stone-950 p-3 rounded-xl border border-stone-800">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
                  Total Donation
                </span>
                <span className="font-mono text-xl sm:text-2xl font-black text-amber-400">
                  {formatINR(grandTotal)}
                </span>
              </div>

              {/* Payment Mode Selector */}
              <div>
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block mb-1.5">
                  Select Tender Mode
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(['CASH', 'UPI', 'CARD'] as PosPaymentMode[]).map((mode) => {
                    const isSelected = paymentMode === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPaymentMode(mode)}
                        className={`min-h-[48px] py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20'
                            : 'bg-stone-950 text-stone-300 hover:bg-stone-800 border border-stone-700'
                        }`}
                      >
                        {mode === 'CASH' && <Banknote className="w-4 h-4" />}
                        {mode === 'UPI' && <QrCode className="w-4 h-4" />}
                        {mode === 'CARD' && <CreditCard className="w-4 h-4" />}
                        <span>{mode}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Checkout Action Button */}
              <button
                type="button"
                disabled={cart.length === 0 || grandTotal <= 0 || isProcessing}
                onClick={handleProcessCheckout}
                className="w-full min-h-[52px] py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-stone-950 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Processing Treasury Post...</span>
                  </>
                ) : (
                  <>
                    <Printer className="w-5 h-5" />
                    <span>Process & Print Receipt ({formatINR(grandTotal)})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* 3. SIMULATED ESC/POS THERMAL RECEIPT SUCCESS MODAL                        */}
      {/* ========================================================================= */}
      {completedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-stone-900 border border-stone-700 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between bg-stone-950">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base">
                    Donation Processed Successfully!
                  </h3>
                  <p className="text-[11px] text-stone-400 font-mono">
                    {completedTransaction.receiptNo}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleResetForNewDevotee}
                className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Receipt Body (Simulated ESC/POS 80mm paper) */}
            <div className="p-4 sm:p-6 overflow-y-auto bg-stone-900">
              {/* Paper Look Container */}
              <div className="bg-stone-50 text-stone-900 p-5 rounded-2xl shadow-inner font-mono text-xs border border-stone-300 space-y-3">
                {/* Mandir Header */}
                <div className="text-center space-y-0.5 border-b border-dashed border-stone-400 pb-3">
                  <p className="font-black text-sm uppercase tracking-wide">
                    {activeWorkspace.name}
                  </p>
                  <p className="text-[11px] text-stone-600">
                    {activeWorkspace.address || activeWorkspace.city || 'Sacred Temple Sanctum'}
                  </p>
                  <p className="text-[10px] text-stone-500">
                    Trust Reg: {activeWorkspace.trustRegNumber || '1882/TR-SB-901'}
                  </p>
                  <p className="text-xs font-bold text-amber-700 uppercase mt-1">
                    *** CHANDA & SEVA RECEIPT ***
                  </p>
                </div>

                {/* Metadata */}
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Receipt No:</span>
                    <span className="font-bold">{completedTransaction.receiptNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Tx ID:</span>
                    <span className="font-mono">{completedTransaction.txId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Date/Time:</span>
                    <span>{completedTransaction.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Payment:</span>
                    <span className="font-bold">{completedTransaction.paymentMode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Devotee:</span>
                    <span className="font-bold">{completedTransaction.devoteeName}</span>
                  </div>
                  {completedTransaction.pan !== 'N/A' && (
                    <div className="flex justify-between">
                      <span className="text-stone-500">PAN (80G):</span>
                      <span className="font-bold text-amber-800">{completedTransaction.pan}</span>
                    </div>
                  )}
                  {completedTransaction.urn80G && is80GRequested && (
                    <div className="flex justify-between">
                      <span className="text-stone-500">80G URN:</span>
                      <span className="font-bold text-emerald-800">
                        {completedTransaction.urn80G}
                      </span>
                    </div>
                  )}
                </div>

                {/* Items Table */}
                <div className="border-t border-b border-dashed border-stone-400 py-2 space-y-1.5">
                  <div className="flex justify-between font-bold text-[11px] text-stone-700">
                    <span>SEVA ITEM</span>
                    <span>AMOUNT</span>
                  </div>
                  {completedTransaction.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-[11px]">
                      <span className="truncate pr-2">
                        {it.quantity}x {it.name}
                      </span>
                      <span className="font-bold shrink-0">
                        {formatINR(it.unitAmount * it.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Grand Total */}
                <div className="flex justify-between items-center text-sm font-black pt-1">
                  <span>GRAND TOTAL</span>
                  <span className="text-base text-amber-800">
                    {formatINR(completedTransaction.totalAmount)}
                  </span>
                </div>

                {/* Sacred Shastric Shloka Blessing */}
                <div className="text-center pt-2 border-t border-dashed border-stone-400 space-y-1">
                  <p className="text-[10px] text-stone-600 font-sans italic">
                    May Sri Hari shower eternal auspiciousness and peace upon your family.
                  </p>
                  <p className="text-[11px] font-bold text-stone-800 font-serif">
                    ॥ धर्मो रक्षति रक्षितः ॥
                  </p>
                </div>

                {/* Barcode / QR Code representation */}
                <div className="pt-2 flex flex-col items-center justify-center">
                  <QRCodeSVG
                    value={`https://sanatani-bandhan.org/receipt/${completedTransaction.receiptNo}`}
                    size={84}
                    bgColor="#f5f5f4"
                    fgColor="#1c1917"
                    level="M"
                  />
                  <span className="text-[9px] text-stone-500 font-mono mt-1">
                    Scan for Digital e-Receipt
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleResetForNewDevotee}
                className="flex-1 py-3 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs sm:text-sm font-bold transition-colors cursor-pointer"
              >
                Next Devotee
              </button>
              <button
                type="button"
                onClick={handlePrintThermal}
                className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print (Thermal)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickChandaPOS;
