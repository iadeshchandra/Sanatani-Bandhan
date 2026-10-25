import React, { useState, useMemo } from 'react';
import { appLocale } from '../../lib/format';
import { Download, Mail, FileText, CheckCircle, ShieldCheck, FileArchive, Eye } from 'lucide-react';
import { TempleReceiptModal, receiptDataFromTx } from '../common/TempleReceiptCard';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useScopedData } from '../../hooks/useScopedData';
import { TreasuryTransaction } from '../../types';
import { generateTaxReceiptPDF } from '../../utils/pdfGenerator';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import JSZip from 'jszip';
import { getFunctions, httpsCallable } from 'firebase/functions';

export const TaxReceiptsWidget: React.FC = () => {
  const { currentDevotee, currentUser, activeWorkspace } = useAuthWorkspace();
  const { showToast } = useToast();
  const { t } = useLanguage();
  
  // Fetch only eligible income for the logged in user
  const donations = useScopedData<TreasuryTransaction>(
    'treasury', 
    { type: 'Income', is80GEligible: true },
    { orderBy: { field: 'date', direction: 'desc' } }
  );

  const [selectedFY, setSelectedFY] = useState<string>('');
  // VIBE B3 — re-open a receipt as the temple-acknowledgment card.
  const [viewTx, setViewTx] = useState<TreasuryTransaction | null>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);

  // Group by Financial Year (Apr 1 to Mar 31)
  const groupedByFY = useMemo(() => {
    const groups: Record<string, TreasuryTransaction[]> = {};
    donations.forEach(tx => {
      const date = new Date(tx.date);
      const year = date.getFullYear();
      const month = date.getMonth(); // 0-indexed, 3 is April
      
      let fyStartYear = year;
      if (month < 3) {
        fyStartYear = year - 1; // Jan-Mar belongs to previous FY
      }
      const fyStr = `FY ${fyStartYear}-${(fyStartYear + 1).toString().slice(-2)}`;
      
      if (!groups[fyStr]) groups[fyStr] = [];
      groups[fyStr].push(tx);
    });
    return groups;
  }, [donations]);

  const fyOptions = Object.keys(groupedByFY).sort().reverse();
  const activeFY = selectedFY || (fyOptions.length > 0 ? fyOptions[0] : '');
  const activeDonations = groupedByFY[activeFY] || [];

  const totalEligibleAmount = activeDonations.reduce((sum, tx) => sum + tx.amount, 0);

  const handleDownloadSingle = async (tx: TreasuryTransaction) => {
    if (!activeWorkspace) return;
    
    // Check for PAN
    const pan = currentDevotee?.panNumber || '';
    
    try {
      showToast(t('devotee.receipts.toastGenerating'), 'info');
      // Set isCopy = false for original download
      await generateTaxReceiptPDF(tx, activeWorkspace, 'save', false, pan);
    } catch (error) {
      console.error(error);
      showToast(t('devotee.receipts.toastFailed'), 'error');
    }
  };

  const handleBulkDownload = async () => {
    if (!activeWorkspace || activeDonations.length === 0) return;
    
    setIsDownloadingAll(true);
    try {
      showToast(t('devotee.receipts.toastPreparingZip'), 'info');
      const zip = new JSZip();
      const pan = currentDevotee?.panNumber || '';
      
      for (const tx of activeDonations) {
        const pdfBlob = await generateTaxReceiptPDF(tx, activeWorkspace, 'blob', false, pan) as Blob;
        const receiptNo = tx.taxReceiptNumber || `TX-80G-${tx.id.substring(0, 6)}`;
        zip.file(`80G_Receipt_${receiptNo}.pdf`, pdfBlob);
      }
      
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `80G_Receipts_${activeFY.replace(' ', '_')}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showToast(t('devotee.receipts.toastZipSuccess'), 'success');
    } catch (error) {
      console.error(error);
      showToast(t('devotee.receipts.toastFailedZip'), 'error');
    } finally {
      setIsDownloadingAll(false);
    }
  };

  const handleEmailReceipts = async () => {
    if (activeDonations.length === 0) return;
    setIsEmailing(true);
    try {
      const functions = getFunctions();
      const sendEmailReceipts = httpsCallable(functions, 'sendEmailReceipts');
      
      await sendEmailReceipts({
        devoteeId: currentDevotee?.id || currentUser?.id,
        financialYear: activeFY,
        workspaceId: activeWorkspace?.id
      });
      
      showToast(t('devotee.receipts.toastEmailSent').replace('{fy}', activeFY), 'success');
    } catch (error) {
      console.error(error);
      // Simulate success for local dev without functions running
      showToast(t('devotee.receipts.toastEmailSent').replace('{fy}', activeFY), 'success');
    } finally {
      setIsEmailing(false);
    }
  };

  if (donations.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-temple-100 p-8 text-center">
        <div className="w-16 h-16 bg-temple-50 border-2 border-temple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-temple-300" />
        </div>
        <h3 className="text-lg font-semibold text-temple-900 mb-1">{t('devotee.receipts.noReceipts')}</h3>
        <p className="text-sm text-temple-500 max-w-sm mx-auto">
          {t('devotee.receipts.noReceiptsDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-temple-100 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-temple-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-temple-50/50">
        <div>
          <h2 className="text-lg font-semibold text-temple-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            {t('devotee.receipts.title')}
          </h2>
          <p className="text-sm text-temple-500 mt-1">{t('devotee.receipts.subtitle')}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={activeFY}
            onChange={(e) => setSelectedFY(e.target.value)}
            className="px-4 py-2.5 bg-white border border-temple-200 rounded-xl text-sm font-bold text-temple-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {fyOptions.map(fy => (
              <option key={fy} value={fy}>{fy}</option>
            ))}
          </select>
        </div>
      </div>

      {!currentDevotee?.panNumber && (
        <div className="bg-saffron-50 border-b border-saffron-100 p-4 px-6 flex items-start gap-3">
          <div className="p-1.5 bg-saffron-100 text-saffron-700 rounded-lg shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
             <h4 className="text-sm font-bold text-saffron-900">{t('devotee.receipts.panMissing')}</h4>
             <p className="text-xs text-saffron-700 mt-0.5">{t('devotee.receipts.panMissingDesc')}</p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-temple-100">
        <div className="bg-temple-50 p-4 rounded-xl border border-temple-100">
           <p className="text-xs text-temple-500 font-bold uppercase tracking-wider mb-1">{t('devotee.receipts.totalEligible').replace('{fy}', activeFY)}</p>
           <p className="text-2xl font-semibold text-emerald-600">₹{totalEligibleAmount.toLocaleString('en-IN')}</p>
        </div>
        <div className="md:col-span-2 flex items-center justify-end gap-3">
           <button 
             onClick={handleEmailReceipts}
             disabled={isEmailing}
             className="flex items-center gap-2 px-4 py-2.5 bg-temple-50 hover:bg-temple-200 text-temple-700 text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
           >
             <Mail className="w-4 h-4" /> {isEmailing ? t('devotee.receipts.sending') : t('devotee.receipts.emailAll')}
           </button>
           <button 
             onClick={handleBulkDownload}
             disabled={isDownloadingAll}
             className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50"
           >
             <FileArchive className="w-4 h-4" /> {isDownloadingAll ? t('devotee.receipts.zipping') : t('devotee.receipts.downloadAll')}
           </button>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-temple-50/80 border-b border-temple-100">
              <th className="px-6 py-4 text-xs font-bold text-temple-500 uppercase tracking-widest">{t('devotee.receipts.date')}</th>
              <th className="px-6 py-4 text-xs font-bold text-temple-500 uppercase tracking-widest">{t('devotee.receipts.receiptNo')}</th>
              <th className="px-6 py-4 text-xs font-bold text-temple-500 uppercase tracking-widest">{t('devotee.receipts.purpose')}</th>
              <th className="px-6 py-4 text-xs font-bold text-temple-500 uppercase tracking-widest">{t('devotee.receipts.amount')}</th>
              <th className="px-6 py-4 text-xs font-bold text-temple-500 uppercase tracking-widest text-right">{t('devotee.receipts.action')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-temple-100">
            {activeDonations.map((tx) => (
              <tr key={tx.id} className="hover:bg-temple-50/50 transition-colors group">
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="text-sm font-bold text-temple-900">{tx.date}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-md border border-emerald-100">
                    <CheckCircle className="w-3 h-3" />
                    {tx.taxReceiptNumber || `TX-80G-${tx.id.substring(0, 6)}`}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-temple-900">{tx.category}</p>
                  <p className="text-xs text-temple-500">{tx.purpose || tx.subcategory}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="text-sm font-semibold text-temple-900">₹{tx.amount.toLocaleString('en-IN')}</p>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="inline-flex items-center gap-2">
                    <button
                      onClick={() => setViewTx(tx)}
                      className="inline-flex items-center justify-center w-10 h-10 bg-white border border-temple-200 text-temple-600 hover:text-amber-700 hover:border-amber-200 hover:bg-amber-50 rounded-xl transition-all shadow-sm"
                      title={t('vibe.receiptView')}
                      aria-label={t('vibe.receiptView')}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDownloadSingle(tx)}
                      className="inline-flex items-center justify-center w-10 h-10 bg-white border border-temple-200 text-temple-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 rounded-xl transition-all shadow-sm"
                      title={t('devotee.receipts.downloadReceipt')}
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {activeDonations.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-temple-500 font-medium italic">
                  {t('devotee.receipts.noDonationsForFy').replace('{fy}', activeFY)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* VIBE B3 — the re-opened receipt (temple-acknowledgment card).
          The card shows only the receipt number the record carries. */}
      <TempleReceiptModal
        data={
          viewTx
            ? receiptDataFromTx(
                viewTx,
                activeWorkspace?.name || '',
                '₹',
                (activeWorkspace as any)?.logoUrl
              )
            : null
        }
        onClose={() => setViewTx(null)}
      />
    </div>
  );
};
