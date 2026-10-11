import React, { useState, useMemo } from 'react';
import {
  Download,
  FileCode2,
  Calendar,
  CheckCircle2,
  FileText,
  IndianRupee,
  Layers,
  ArrowRight,
  ShieldCheck,
  Building2,
  Filter,
} from 'lucide-react';
import { generateTallyVoucherXml, TallyTransaction } from '../../utils/tallyXmlGenerator';
import { useToast } from '../../context/ToastContext';

const INITIAL_TRANSACTIONS: TallyTransaction[] = [
  {
    id: 'TXN-2026-001',
    date: '2026-09-24',
    amount: 11000,
    donorName: 'Rajesh & Sunita Sharma',
    paymentMode: 'UPI',
    category: 'Maha Rudrabhishek Sankalp',
    pan: 'ABCPS1234F',
    referenceNo: 'UPI/382910482910',
  },
  {
    id: 'TXN-2026-002',
    date: '2026-09-25',
    amount: 25000,
    donorName: 'Venkatesh Iyer Trust',
    paymentMode: 'Bank Transfer',
    category: 'Annadanam Mega Kitchen Fund',
    pan: 'AAATV9876K',
    referenceNo: 'NEFT/HDFC000123/9482',
  },
  {
    id: 'TXN-2026-003',
    date: '2026-09-26',
    amount: 5100,
    donorName: 'Ananya Mukherjee',
    paymentMode: 'Cash',
    category: 'Gau Seva Grass Sponsorship',
    referenceNo: 'HUNDI-CASH-42',
  },
  {
    id: 'TXN-2026-004',
    date: '2026-09-26',
    amount: 51000,
    donorName: 'Om Prakash Agarwal & Sons',
    paymentMode: 'Cheque',
    category: 'Mandir Temple Renovation Corpus',
    pan: 'AGRPA5544M',
    referenceNo: 'CHQ-849201',
  },
];

export const TallyExportDesk: React.FC = () => {
  const { showToast } = useToast();
  const [fromDate, setFromDate] = useState<string>('2026-09-01');
  const [toDate, setToDate] = useState<string>('2026-09-30');
  const [companyName, setCompanyName] = useState<string>('Sri Sanatan Mandir Trust');
  const [showXmlPreview, setShowXmlPreview] = useState<boolean>(false);

  // Filter transactions based on date range
  const filteredTransactions = useMemo(() => {
    return INITIAL_TRANSACTIONS.filter((t) => {
      if (fromDate && t.date < fromDate) return false;
      if (toDate && t.date > toDate) return false;
      return true;
    });
  }, [fromDate, toDate]);

  const totalAmount = useMemo(() => {
    return filteredTransactions.reduce((acc, curr) => acc + curr.amount, 0);
  }, [filteredTransactions]);

  const handleDownloadXml = () => {
    try {
      if (filteredTransactions.length === 0) {
        showToast('No transactions found in selected date range', 'error');
        return;
      }

      // 1. Generate Tally XML
      const xmlContent = generateTallyVoucherXml(filteredTransactions, companyName);

      // 2. Create Blob and trigger direct browser download
      const blob = new Blob([xmlContent], { type: 'text/xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tally_vouchers_export_${fromDate}_to_${toDate}.xml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(
        `Successfully generated and exported ${filteredTransactions.length} Tally vouchers in XML format!`,
        'success'
      );
    } catch (err: any) {
      console.error('Tally XML generation error:', err);
      showToast('Failed to generate Tally XML export', 'error');
    }
  };

  const previewXmlSnippet = useMemo(() => {
    return generateTallyVoucherXml(filteredTransactions.slice(0, 1), companyName);
  }, [filteredTransactions, companyName]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2 sm:p-4">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
              Statutory Accounting Bridge
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
              Tally Prime & Tally 9 Compliant
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <FileCode2 className="w-8 h-8 text-emerald-600" />
            Tally Prime XML Export Engine
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Automated double-entry voucher XML generation for temple auditors and Chartered Accountants (CAs).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowXmlPreview(!showXmlPreview)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            {showXmlPreview ? 'Hide XML Schema' : 'Inspect XML Schema'}
          </button>
        </div>
      </div>

      {/* 2. Date Range & Configuration Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Audit Date Range & Ledger Target
            </h3>
          </div>
          <div className="text-xs text-slate-500 font-semibold">
            {filteredTransactions.length} Vouchers Ready &bull; Total: ₹{totalAmount.toLocaleString('en-IN')}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Tally Company Ledger Name
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Sri Sanatan Mandir Trust"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleDownloadXml}
            className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-5 h-5" />
            Generate & Download Tally XML ({filteredTransactions.length} Vouchers)
          </button>
        </div>
      </div>

      {/* XML Schema Raw Preview (Collapsible) */}
      {showXmlPreview && (
        <div className="bg-slate-900 rounded-2xl p-5 text-slate-100 shadow-md">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <span className="text-xs font-mono font-bold text-emerald-400">
              Sample Tally Prime Import Envelope Preview:
            </span>
            <span className="text-[10px] text-slate-400">UTF-8 Encoded XML</span>
          </div>
          <pre className="text-xs font-mono overflow-x-auto p-2 bg-slate-950 rounded-xl max-h-60 text-slate-300">
            {previewXmlSnippet}
          </pre>
        </div>
      )}

      {/* 3. Voucher Preview Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Vouchers Ready for Tally Ingestion
            </h3>
            <p className="text-xs text-slate-500">
              Each row maps to a Receipt Voucher with paired Debit (Bank/Cash) and Credit (Donation Corpus) legs.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            Audit Ready
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
                <th className="px-5 py-3.5">Voucher ID</th>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5">Donor / Party</th>
                <th className="px-4 py-3.5">Payment Mode</th>
                <th className="px-4 py-3.5">Classification</th>
                <th className="px-5 py-3.5 text-right">Amount (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-4 font-mono font-bold text-slate-900">{t.id}</td>
                  <td className="px-4 py-4 text-slate-600 font-semibold">{t.date}</td>
                  <td className="px-4 py-4">
                    <div className="font-bold text-slate-900">{t.donorName}</div>
                    {t.pan && <div className="text-[10px] text-slate-400 font-mono">PAN: {t.pan}</div>}
                  </td>
                  <td className="px-4 py-4">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                      {t.paymentMode}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{t.category}</td>
                  <td className="px-5 py-4 text-right font-extrabold text-slate-900 text-sm">
                    ₹{t.amount.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-bold border-t border-slate-200">
                <td colSpan={5} className="px-5 py-3 text-right uppercase tracking-wider text-slate-600">
                  Total Ledger Sum:
                </td>
                <td className="px-5 py-3 text-right text-emerald-700 font-extrabold text-sm">
                  ₹{totalAmount.toLocaleString('en-IN')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TallyExportDesk;
