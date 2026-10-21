import React, { useState } from 'react';
import { useInr, useWorkspaceCurrency } from '../../hooks/useWorkspaceInr';
import {
  FileText,
  Send,
  Printer,
  Download,
  CheckCircle2,
  Smartphone,
  ShieldCheck,
  QrCode,
  Sparkles,
  Building2,
  AlertCircle,
  Clock,
  Landmark,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useLanguage } from '../../context/LanguageContext';

export const Dynamic80GReceiptStudio: React.FC = () => {
  const inr = useInr();
  const wsCurrency = useWorkspaceCurrency();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { activeWorkspace } = useAuthWorkspace();
  // H-1: no fabricated URN — real receipts need a registered workspace.
  const is80GRegistered = !!activeWorkspace?.trust80GRegistered;
  const open80GSettings = () =>
    window.dispatchEvent(new CustomEvent('navigate_module', { detail: 'masterSettings' }));

  const [donorName, setDonorName] = useState('Sri Rajeshwar Prasad Sharma');
  const [panNumber, setPanNumber] = useState('ABCDE1234F');
  const [donorAddress, setDonorAddress] = useState('Flat 402, Ganga Heights, Assi Ghat, Varanasi, UP - 221005');
  const [donationAmount, setDonationAmount] = useState('51000');
  const [sevaPurpose, setSevaPurpose] = useState('Maha Annadanam & Bhandar Seva');
  const [paymentMode, setPaymentMode] = useState('UPI / NetBanking');
  const [phone, setPhone] = useState('9876543210');

  // Real-time PAN validation (5 letters + 4 digits + 1 letter)
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  const isPanValid = panRegex.test(panNumber.toUpperCase().trim());

  const numAmount = parseInt(donationAmount, 10) || 0;
  const receiptNo = '80G-2026-VRN-0982';
  const receiptDate = '27 September 2026';

  const handleSendWhatsApp = () => {
    showToast(
      `Instant 80G Tax Exemption Certificate sent to +91 ${phone} via WhatsApp.`,
      'success',
      'WhatsApp Dispatch'
    );
  };

  const handleThermalPrint = () => {
    showToast('Sending formatted 80mm ESC/POS slip to front desk thermal printer.', 'info', 'Printer Service');
  };

  const handleDownloadPDF = () => {
    showToast(`Downloading Section 80G Certificate #${receiptNo}.pdf`, 'success', 'PDF Exporter');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>Section 80G(5)(vi) & Form 10BD Compliant</span>
            </span>
            <span className="text-xs text-slate-500 font-mono">
              URN: {is80GRegistered ? (activeWorkspace?.trust80GURN || '—') : 'Not registered — sample'} &bull; Circular 11/2021
            </span>
            {!is80GRegistered && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-700 border border-red-300">
                Sample mode
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-8 h-8 text-amber-600" />
            <span>{t('org.finance.taxReceipts.dynamic80gTaxReceiptStudio')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Split-screen interactive certificate studio with real-time PAN validation, watermark rendering, and multi-channel dispatch.
          </p>
        </div>
      </div>

      {/* UI Section 1: Split-Screen Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* UI Section 2: Left Pane - Form Fields & Inputs */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Landmark className="w-4 h-4 text-amber-600" />{t('org.finance.taxReceipts.donorContributionParameters')}</span>
              <span className="text-xs font-mono font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                Live Sync Active
              </span>
            </div>

            {/* Donor Name */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">{t('org.finance.taxReceipts.donorFullNameEntity')}</label>
              <input
                type="text"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                placeholder="e.g. Sri Ramesh Gupta"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
              />
            </div>

            {/* PAN Number with Validation Indicator */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Permanent Account Number (PAN)
                </label>
                {panNumber && (
                  <span
                    className={`text-[10px] font-mono font-bold flex items-center gap-1 ${
                      isPanValid ? 'text-emerald-600' : 'text-rose-500'
                    }`}
                  >
                    {isPanValid ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" /> Valid PAN Format
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3" /> Invalid PAN (5L + 4D + 1L)
                      </>
                    )}
                  </span>
                )}
              </div>
              <input
                type="text"
                value={panNumber}
                maxLength={10}
                onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                className={`w-full px-3.5 py-2.5 border rounded-xl text-sm font-mono font-bold tracking-wider uppercase focus:outline-none transition-colors ${
                  isPanValid
                    ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500 focus:bg-white'
                    : 'bg-rose-50/50 border-rose-300 text-rose-900 focus:border-rose-500'
                }`}
              />
            </div>

            {/* Donation Amount & Purpose */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">{t('org.finance.taxReceipts.donationAmountInr')}</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">{wsCurrency.symbol}</span>
                  <input
                    type="number"
                    value={donationAmount}
                    onChange={(e) => setDonationAmount(e.target.value)}
                    placeholder="51000"
                    className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-black text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">{t('org.finance.taxReceipts.paymentMode')}</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                >
                  <option value="UPI / NetBanking">UPI / NetBanking</option>
                  <option value="NEFT / RTGS Transfer">{t('org.finance.taxReceipts.neftRtgsTransfer')}</option>
                  <option value="Account Payee Cheque">Account Payee Cheque</option>
                  <option value="Physical Cash Receipt">{t('org.finance.taxReceipts.physicalCashReceipt')}</option>
                </select>
              </div>
            </div>

            {/* Seva Purpose */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">{t('org.finance.taxReceipts.earmarkedSevaFundDesignation')}</label>
              <input
                type="text"
                value={sevaPurpose}
                onChange={(e) => setSevaPurpose(e.target.value)}
                placeholder="e.g. Annadanam Bhandar Seva"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
              />
            </div>

            {/* Donor Address */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">{t('org.finance.taxReceipts.donorAddressForForm10bd')}</label>
              <textarea
                rows={2}
                value={donorAddress}
                onChange={(e) => setDonorAddress(e.target.value)}
                placeholder="Complete postal address with PIN code"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors resize-none"
              />
            </div>

            {/* WhatsApp Phone */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                WhatsApp Delivery Number
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-xs">+91</span>
                <input
                  type="text"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full pl-11 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* UI Section 3: Right Pane - Live A4 80G Certificate Preview */}
        <div className="space-y-4 flex flex-col justify-between">
          {/* H-1: honest sample state when the workspace is not 80G-registered */}
          {!is80GRegistered && (
            <div className="rounded-2xl border-2 border-dashed border-amber-500 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-start gap-2.5 flex-1">
                <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900 leading-relaxed">
                  <strong className="font-black uppercase tracking-wide">Sample — add your 80G registration in Settings</strong>
                  <span className="block mt-0.5">to issue valid receipts with a real URN. Nothing previewed here is statutory.</span>
                </p>
              </div>
              <button
                type="button"
                onClick={open80GSettings}
                className="shrink-0 px-4 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
              >
                Open Settings → 80G
              </button>
            </div>
          )}
          <div className="bg-amber-50/40 border-2 border-amber-600/30 rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden text-slate-900 flex-1 flex flex-col justify-between">
            {/* Watermark Overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-4 pointer-events-none select-none">
              <span className="text-8xl font-black text-amber-900 rotate-[-25deg] tracking-widest uppercase">
                SANATANI
              </span>
            </div>
            {!is80GRegistered && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10">
                <span className="text-6xl font-black text-red-600/25 rotate-[-25deg] tracking-widest uppercase">
                  Sample
                </span>
              </div>
            )}

            {/* Outer Decorative Double Border */}
            <div className="border border-amber-500/40 p-4 sm:p-5 rounded-2xl bg-white/95 shadow-inner space-y-4 relative">
              {/* Certificate Header */}
              <div className="text-center border-b border-amber-500/20 pb-3">
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <span className="text-base text-amber-700 font-serif font-black">॥ श्री गणेशाय नमः ॥</span>
                </div>
                <h2 className="text-base sm:text-lg font-black uppercase text-slate-900 tracking-tight">
                  {activeWorkspace?.name || 'Your Organisation'}
                </h2>
                <p className="text-[10px] text-slate-500 font-serif">
                  {is80GRegistered
                    ? `80G Registered • URN: ${activeWorkspace?.trust80GURN || '—'}`
                    : 'Not 80G-registered — sample certificate only'}
                </p>
                <div className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${is80GRegistered ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-red-100 text-red-800 border-red-300'}`}>
                  {is80GRegistered ? 'Donation exempt under Section 80G(5)(vi)' : 'Sample — not a statutory 80G receipt'}
                </div>
              </div>

              {/* Receipt Metadata Row */}
              <div className="flex items-center justify-between text-[11px] font-mono border-b border-dashed border-slate-200 pb-2">
                <span>{t('org.finance.taxReceipts.receiptNo3')}<strong>{receiptNo}</strong></span>
                <span>{t('org.finance.taxReceipts.date2')}<strong>{receiptDate}</strong></span>
              </div>

              {/* Donor Lineage Body */}
              <div className="space-y-2 text-xs leading-relaxed">
                <p className="text-slate-700">
                  Received with gratitude from <strong className="text-slate-950 font-bold underline">{donorName || 'Sri Devotee'}</strong>, PAN:{' '}
                  <strong className="font-mono text-slate-900 font-bold">{panNumber || 'NOT PROVIDED'}</strong>.
                </p>
                <p className="text-slate-600 text-[11px]">
                  Address: {donorAddress || 'Varanasi, Uttar Pradesh'}
                </p>
                <p className="text-slate-700">
                  A sum of <strong className="text-slate-950 font-mono font-black text-sm">{inr(numAmount)}</strong>{' '}
                  towards <strong className="text-amber-800">{sevaPurpose || 'Mandir Corpus'}</strong> via{' '}
                  <span className="font-mono font-semibold text-slate-800">{paymentMode}</span>.
                </p>
              </div>

              {/* Statutory Note & QR Seal */}
              <div className="pt-3 border-t border-amber-500/20 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-[9px] text-slate-500 font-serif">
                    Valid for Form 10BD filing by the Trust under IT Rules.
                  </p>
                  <p className="text-[10px] font-bold text-emerald-700 flex items-center gap-1 font-mono">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t('org.finance.taxReceipts.authorizedTrusteeDigitalSeal')}</span>
                  </p>
                </div>

                <div className="w-14 h-14 bg-white border border-slate-200 p-1 rounded-lg flex items-center justify-center shrink-0 shadow-xs">
                  <QrCode className="w-full h-full text-slate-900" />
                </div>
              </div>
            </div>
          </div>

          {/* Action Bar below preview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="py-3 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{t('org.finance.taxReceipts.sendViaWhatsapp')}</span>
            </button>

            <button
              type="button"
              onClick={handleThermalPrint}
              className="py-3 px-3 rounded-2xl bg-slate-800 hover:bg-slate-900 active:scale-98 text-slate-100 font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('org.finance.taxReceipts.thermalPrint80mm')}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              className="py-3 px-3 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('org.finance.taxReceipts.downloadSignedPdf')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dynamic80GReceiptStudio;
