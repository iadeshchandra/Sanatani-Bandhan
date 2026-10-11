import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Coins,
  X,
  CheckCircle,
  Printer,
  FileText,
  QrCode,
  User,
  Phone,
  CreditCard,
  Banknote,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Receipt,
  Sparkles,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { printThermalReceipt } from '../../utils/printUtils';
import { generate80GTaxReceipt } from '../../utils/pdfGenerator';
import { TreasuryTransaction } from '../../types';
import { addTransaction } from '../../services/treasuryService';

interface QuickChandaModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefilledDevoteeId?: string;
  prefilledDevoteeName?: string;
}

type PaymentModeType = 'Cash' | 'UPI' | 'Card';
type CategoryType = 'Donation' | 'Annadanam' | 'Gau Seva' | 'Mandir Nirman' | 'Pooja Dakshina';

const PRESET_AMOUNTS = [101, 501, 1100, 2100, 5100, 11000];

export const QuickChandaModal: React.FC<QuickChandaModalProps> = ({
  isOpen,
  onClose,
  prefilledDevoteeId,
  prefilledDevoteeName,
}) => {
  const { activeWorkspace, activeWorkspaceId } = useAuthWorkspace();
  const workspaceId = activeWorkspaceId || activeWorkspace?.id || 'DEMO_ws-mandir';
  const { devotees, addTreasuryTransaction } = useData();
  const { showToast } = useToast();

  const amountInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [amount, setAmount] = useState<number | ''>(1100);
  const [devoteeName, setDevoteeName] = useState('');
  const [selectedDevoteeId, setSelectedDevoteeId] = useState('');
  const [phone, setPhone] = useState('');
  const [pan, setPan] = useState('');
  const [category, setCategory] = useState<CategoryType>('Donation');
  const [paymentMode, setPaymentMode] = useState<PaymentModeType>('UPI');
  const [referenceNo, setReferenceNo] = useState('');
  const [purpose, setPurpose] = useState('Temple Chanda & Deepam Seva');
  const [cashTendered, setCashTendered] = useState<number | ''>('');

  // Success state for instant post-transaction actions
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastRecordedTx, setLastRecordedTx] = useState<TreasuryTransaction | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen) {
      resetForm();
      if (prefilledDevoteeId && prefilledDevoteeName) {
        setSelectedDevoteeId(prefilledDevoteeId);
        setDevoteeName(prefilledDevoteeName);
        const match = devotees.find((d) => d.id === prefilledDevoteeId);
        if (match) {
          if (match.phone) setPhone(match.phone);
        }
      }
      setTimeout(() => {
        amountInputRef.current?.focus();
        amountInputRef.current?.select();
      }, 80);
    }
  }, [isOpen, prefilledDevoteeId, prefilledDevoteeName]);

  const resetForm = () => {
    setAmount(1100);
    setDevoteeName('');
    setSelectedDevoteeId('');
    setPhone('');
    setPan('');
    setCategory('Donation');
    setPaymentMode('UPI');
    setReferenceNo('');
    setPurpose('Temple Chanda & Deepam Seva');
    setCashTendered('');
    setIsSuccess(false);
    setLastRecordedTx(null);
  };

  // Keyboard navigation: Enter to submit, Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle member selection from existing directory
  const handleDevoteeSelect = (id: string) => {
    setSelectedDevoteeId(id);
    const found = devotees.find((d) => d.id === id);
    if (found) {
      setDevoteeName(found.fullName);
      if (found.phone) setPhone(found.phone);
    }
  };

  // Generate dynamic standard UPI URI
  const upiUri = useMemo(() => {
    const vpa = (activeWorkspace as any)?.upiId || (activeWorkspace as any)?.upiVpa || 'sanatanibandhan@ybl';
    const cleanAmount = Number(amount) > 0 ? Number(amount).toFixed(2) : '0.00';
    const payeeName = encodeURIComponent(activeWorkspace?.name || 'Sanatani Bandhan Trust');
    const note = encodeURIComponent(`${category} - ${devoteeName || 'Devotee'}`);
    return `upi://pay?pa=${vpa}&pn=${payeeName}&am=${cleanAmount}&cu=INR&tn=${note}`;
  }, [activeWorkspace, amount, category, devoteeName]);

  // Cash change computation
  const cashChange = useMemo(() => {
    if (paymentMode !== 'Cash' || !cashTendered || !amount) return 0;
    return Math.max(0, Number(cashTendered) - Number(amount));
  }, [paymentMode, cashTendered, amount]);

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      showToast('Please enter a valid donation amount', 'warning', 'Invalid Input');
      amountInputRef.current?.focus();
      return;
    }

    const finalDevoteeName = devoteeName.trim() || 'Generous Sanatan Bhakta';
    const txId = `tx_${Date.now()}`;
    const receiptSerialNo = `SB-80G-${Date.now().toString().slice(-6).toUpperCase()}`;

    const newTx: TreasuryTransaction = {
      id: txId,
      workspaceId,
      date: new Date().toISOString().slice(0, 10),
      type: 'Income',
      category,
      amount: numericAmount,
      handledBy: (activeWorkspace as any)?.custodianName || 'Counter Cashier',
      devoteeId: selectedDevoteeId || undefined,
      devoteeName: finalDevoteeName,
      paymentMode,
      referenceNo: referenceNo.trim() || (paymentMode === 'UPI' ? `UPI-${Date.now().toString().slice(-6)}` : undefined),
      purpose: purpose.trim() || `${category} Contribution`,
      is80GEligible: true,
      taxReceiptIssued: true,
      taxReceiptNumber: receiptSerialNo,
      devoteePan: pan.trim().toUpperCase() || undefined,
      auditVerified: true,
    };

    // Save to Firestore via tenant treasury service
    try {
      await addTransaction(workspaceId, newTx);
      if (addTreasuryTransaction) {
        addTreasuryTransaction(newTx);
      }
      setLastRecordedTx(newTx);
      setIsSuccess(true);
      showToast(`Donation of ₹${numericAmount.toLocaleString('en-IN')} logged successfully!`, 'success', 'POS Counter');
    } catch (err: any) {
      console.error('[POS Error]', err);
      showToast('Failed to record transaction in database. Please retry.', 'error', 'Error');
    }
  };

  // Action: Print Thermal Receipt (80mm)
  const handlePrintThermal = async () => {
    if (!lastRecordedTx) return;
    try {
      setIsPrinting(true);
      await printThermalReceipt(lastRecordedTx, activeWorkspace);
      showToast('Thermal Receipt dispatched to printer', 'success', '80mm Print');
    } catch (err) {
      console.error(err);
      showToast('Could not open print dialog', 'warning');
    } finally {
      setIsPrinting(false);
    }
  };

  // Action: Download Statutory 80G Tax PDF
  const handleDownload80G = async () => {
    if (!lastRecordedTx) return;
    try {
      setIsGeneratingPdf(true);
      await generate80GTaxReceipt(lastRecordedTx, activeWorkspace, { download: true });
      showToast('Statutory 80G Certificate downloaded', 'success', 'Form 10BE Compliant');
    } catch (err) {
      console.error(err);
      showToast('Error compiling 80G PDF', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Action: Next Donor in queue
  const handleNextDonor = () => {
    resetForm();
    setTimeout(() => {
      amountInputRef.current?.focus();
      amountInputRef.current?.select();
    }, 60);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="quick-chanda-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-temple-950/85 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18 }}
          className="bg-temple-900 border border-amber-600/40 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden text-temple-100 flex flex-col max-h-[92vh]"
        >
          {/* Top POS Header */}
          <div className="px-5 py-3.5 bg-gradient-to-r from-temple-950 via-temple-900 to-amber-950/60 border-b border-temple-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-amber-300 tracking-wide">POS Donation Counter</h3>
                  <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Express Chanda
                  </span>
                </div>
                <p className="text-xs text-temple-400 truncate max-w-xs sm:max-w-md">
                  {activeWorkspace?.name || 'Temple Trust'} • Form 10BE Ready
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-temple-400 hover:text-temple-100 hover:bg-temple-800 transition-colors"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content: Either Success View OR Fast POS Entry Form */}
          <div className="overflow-y-auto p-5 space-y-4 custom-scrollbar">
            {isSuccess && lastRecordedTx ? (
              /* ============================================================ */
              /* SUCCESS STATE: 2 Prominent Actions & Next Donor Reset        */
              /* ============================================================ */
              <div className="space-y-5 py-2">
                <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 text-center relative overflow-hidden">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 mb-3 border border-emerald-500/40 shadow-lg shadow-emerald-500/10">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h4 className="text-xl sm:text-2xl font-black text-emerald-300">
                    ₹{lastRecordedTx.amount.toLocaleString('en-IN')} Received!
                  </h4>
                  <p className="text-xs text-temple-300 mt-1">
                    Receipt Ref: <span className="font-mono text-amber-400 font-bold">{lastRecordedTx.taxReceiptNumber}</span>
                  </p>
                  <p className="text-xs text-temple-400 mt-0.5">
                    Devotee: <span className="text-temple-200 font-semibold">{lastRecordedTx.devoteeName}</span> ({lastRecordedTx.paymentMode})
                  </p>
                </div>

                {/* Statutory 80G Notification Tag */}
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>
                    Sec 80G(5)(vi) eligible receipt. Recorded on the Mandir Treasury ledger.
                  </span>
                </div>

                {/* Two Prominent Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handlePrintThermal}
                    disabled={isPrinting}
                    className="flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-temple-950 font-black text-sm shadow-lg shadow-amber-600/25 transition-all transform active:scale-95 cursor-pointer disabled:opacity-60"
                  >
                    <Printer className="w-5 h-5" />
                    <span>{isPrinting ? 'Printing...' : '🖨️ Print Thermal Receipt (80mm)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownload80G}
                    disabled={isGeneratingPdf}
                    className="flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl bg-temple-800 hover:bg-temple-750 border border-amber-500/40 text-amber-300 hover:text-amber-200 font-bold text-sm shadow-md transition-all transform active:scale-95 cursor-pointer disabled:opacity-60"
                  >
                    <FileText className="w-5 h-5 text-amber-400" />
                    <span>{isGeneratingPdf ? 'Generating...' : '📄 Download 80G Tax PDF'}</span>
                  </button>
                </div>

                {/* Reset for Next Donor Button */}
                <div className="pt-2 border-t border-temple-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-temple-400 hover:text-temple-200 text-xs font-semibold hover:bg-temple-800/60"
                  >
                    Close Counter
                  </button>
                  <button
                    type="button"
                    autoFocus
                    onClick={handleNextDonor}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/20 transition-all transform active:scale-95 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Close & Next Donor in Queue</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>
            ) : (
              /* ============================================================ */
              /* FAST POS DONATION ENTRY FORM                                 */
              /* ============================================================ */
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Amount Section with Quick Presets */}
                <div className="bg-temple-950/60 border border-temple-800 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="quick-chanda-amount" className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Donation Amount ({activeWorkspace?.currencySymbol || '₹'}) *
                    </label>
                    <span className="text-[11px] text-temple-400">Press Tab to navigate</span>
                  </div>

                  {/* Primary Large Amount Input */}
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xl font-bold text-amber-500">
                      {activeWorkspace?.currencySymbol || '₹'}
                    </span>
                    <input
                      ref={amountInputRef}
                      id="quick-chanda-amount"
                      type="number"
                      required
                      min="1"
                      step="1"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                      placeholder="0"
                      className="w-full bg-temple-900 border-2 border-amber-500/60 focus:border-amber-400 rounded-xl pl-9 pr-4 py-2.5 text-2xl font-black text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-mono"
                    />
                  </div>

                  {/* Quick Preset Amount Buttons */}
                  <div className="grid grid-cols-6 gap-1.5 pt-0.5">
                    {PRESET_AMOUNTS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAmount(preset)}
                        className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                          amount === preset
                            ? 'bg-amber-500 text-temple-950 shadow-md shadow-amber-500/30'
                            : 'bg-temple-800 hover:bg-temple-750 text-temple-300 border border-temple-700/60'
                        }`}
                      >
                        ₹{preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2-Column POS Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Left Column: Devotee Particulars */}
                  <div className="space-y-3">
                    {/* Devotee Name (Select or Free-text) */}
                    <div>
                      <label className="block text-xs font-semibold text-temple-300 mb-1">
                        Devotee Name *
                      </label>
                      <div className="space-y-1.5">
                        <select
                          value={selectedDevoteeId}
                          onChange={(e) => handleDevoteeSelect(e.target.value)}
                          className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-1.5 text-xs text-temple-200 focus:outline-none focus:border-amber-500"
                        >
                          <option value="">-- Quick select registered member --</option>
                          {devotees.slice(0, 50).map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.fullName} {d.phone ? `(${d.phone})` : ''}
                            </option>
                          ))}
                        </select>
                        <div className="relative">
                          <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-temple-400" />
                          <input
                            type="text"
                            required
                            placeholder="Donor Name (e.g. Ramesh Sharma)"
                            value={devoteeName}
                            onChange={(e) => setDevoteeName(e.target.value)}
                            className="w-full bg-temple-800 border border-temple-700 rounded-xl pl-8 pr-3 py-2 text-xs text-temple-100 placeholder-temple-500 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="block text-xs font-semibold text-temple-300 mb-1">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-temple-400" />
                        <input
                          type="tel"
                          placeholder="+91 98765 43210"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full bg-temple-800 border border-temple-700 rounded-xl pl-8 pr-3 py-2 text-xs text-temple-100 placeholder-temple-500 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    {/* Donor PAN (Crucial for 80G Form 10BE) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-temple-300">
                          Donor PAN (Form 10BE)
                        </label>
                        <span className="text-[10px] text-amber-400 font-medium">80G Tax Exemption</span>
                      </div>
                      <input
                        type="text"
                        maxLength={10}
                        placeholder="ABCDE1234F (Optional)"
                        value={pan}
                        onChange={(e) => setPan(e.target.value.toUpperCase())}
                        className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-xs uppercase font-mono text-amber-300 placeholder-temple-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Right Column: Category & Payment Mode */}
                  <div className="space-y-3">
                    {/* Category Selector */}
                    <div>
                      <label className="block text-xs font-semibold text-temple-300 mb-1.5">
                        Donation Category
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(['Donation', 'Annadanam', 'Gau Seva', 'Mandir Nirman'] as CategoryType[]).map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setCategory(cat)}
                            className={`py-1.5 px-2 rounded-xl text-xs font-semibold transition-all text-left truncate ${
                              category === cat
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                                : 'bg-temple-800 text-temple-400 hover:text-temple-200 border border-temple-700/60'
                            }`}
                          >
                            • {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Payment Mode (Cash, UPI, Card) */}
                    <div>
                      <label className="block text-xs font-semibold text-temple-300 mb-1.5">
                        Payment Mode
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(
                          [
                            { mode: 'UPI', label: 'UPI / QR', icon: QrCode },
                            { mode: 'Cash', label: 'Cash', icon: Banknote },
                            { mode: 'Card', label: 'Card / POS', icon: CreditCard },
                          ] as const
                        ).map(({ mode, label, icon: IconComponent }) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setPaymentMode(mode)}
                            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-xs font-bold transition-all border ${
                              paymentMode === mode
                                ? 'bg-amber-500 text-temple-950 border-amber-400 shadow-md shadow-amber-500/20'
                                : 'bg-temple-800 text-temple-300 hover:bg-temple-750 border-temple-700/60'
                            }`}
                          >
                            <IconComponent className="w-4 h-4 mb-0.5" />
                            <span>{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* UTR / Ref field */}
                    <div>
                      <label className="block text-xs font-semibold text-temple-300 mb-1">
                        Ref / UTR / Remarks
                      </label>
                      <input
                        type="text"
                        placeholder="UPI Ref ID or Note..."
                        value={referenceNo}
                        onChange={(e) => setReferenceNo(e.target.value)}
                        className="w-full bg-temple-800 border border-temple-700 rounded-xl px-3 py-2 text-xs text-temple-100 placeholder-temple-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* DYNAMIC UPI QR CODE (Rendered when UPI is selected) */}
                {paymentMode === 'UPI' && (
                  <div className="bg-temple-950/70 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex-1 text-center sm:text-left space-y-1">
                      <div className="flex items-center justify-center sm:justify-start gap-1.5 text-amber-400 font-bold text-xs uppercase tracking-wider">
                        <QrCode className="w-4 h-4" />
                        <span>Dynamic UPI QR Code</span>
                      </div>
                      <p className="text-sm font-semibold text-temple-100">
                        Scan to Pay Exactly <span className="text-amber-300 font-bold">₹{amount || 0}</span>
                      </p>
                      <p className="text-[11px] text-temple-400">
                        Works with BHIM, Google Pay, PhonePe, Paytm, and any UPI app.
                      </p>
                      <p className="text-[10px] text-temple-500 font-mono truncate max-w-xs">
                        VPA: {(activeWorkspace as any)?.upiId || 'sanatanibandhan@ybl'}
                      </p>
                    </div>

                    {/* High-res SVG QR Code */}
                    <div className="bg-white p-2.5 rounded-xl shadow-lg border border-white/20 shrink-0">
                      <QRCodeSVG
                        value={upiUri}
                        size={120}
                        level="M"
                        includeMargin={false}
                      />
                    </div>
                  </div>
                )}

                {/* CASH TENDER & CHANGE CALCULATOR (When Cash is selected) */}
                {paymentMode === 'Cash' && (
                  <div className="bg-temple-950/70 border border-emerald-500/30 rounded-2xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <Banknote className="w-4 h-4" />
                        Cash Tender & Change Calculator
                      </span>
                      {cashChange > 0 && (
                        <span className="text-xs font-bold text-emerald-300">
                          Return Change: ₹{cashChange.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[500, 1000, 2000, 5000].map((tender) => (
                        <button
                          key={tender}
                          type="button"
                          onClick={() => setCashTendered(tender)}
                          className={`py-1 rounded-lg text-xs font-semibold ${
                            cashTendered === tender
                              ? 'bg-emerald-600 text-white'
                              : 'bg-temple-800 text-temple-300 hover:bg-temple-750'
                          }`}
                        >
                          Tender ₹{tender}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bottom Action Submit Button */}
                <div className="pt-2 flex items-center justify-between gap-3 border-t border-temple-800">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl bg-temple-800 hover:bg-temple-750 text-temple-300 text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    id="submit-pos-chanda-btn"
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-temple-950 font-black text-sm shadow-xl shadow-amber-600/30 transition-all transform active:scale-95 cursor-pointer"
                  >
                    <Receipt className="w-4 h-4" />
                    <span>Confirm & Record Donation (Enter)</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
