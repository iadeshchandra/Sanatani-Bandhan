import React, { useState } from 'react';
import { FileSpreadsheet, Upload, Download, CheckCircle2, AlertTriangle, Users, Sparkles } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useData } from '../../context/DataContext';
import { generateSampleDevoteeCSV, parseDevoteeCSV, IngestedDevoteeRow } from '../../utils/csvEngine';
import { useToast } from '../../context/ToastContext';

export const BulkImportDesk: React.FC = () => {
  const { activeWorkspace } = useAuthWorkspace();
  const { devotees, addDevotee } = useData();
  const { showToast } = useToast();

  const [parsedRows, setParsedRows] = useState<IngestedDevoteeRow[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [validCount, setValidCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDownloadSample = () => {
    generateSampleDevoteeCSV();
    showToast('Sample CSV template downloaded!', 'success');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        const existingPhones = devotees.map((d, idx) => d.phone);
        const { rows, duplicates, valid } = parseDevoteeCSV(text, existingPhones);
        setParsedRows(rows);
        setDuplicateCount(duplicates);
        setValidCount(valid);
        showToast(`Parsed ${rows.length} rows (${valid} valid, ${duplicates} duplicates)`, 'info');
      }
    };
    reader.readAsText(file);
  };

  const handleCommitIngestion = () => {
    if (validCount === 0) {
      showToast('No new valid rows to ingest', 'warning');
      return;
    }

    setIsProcessing(true);
    let added = 0;

    const validRows = parsedRows.filter((r) => !r.isDuplicate);
    for (const r of validRows) {
      addDevotee({
        workspaceId: activeWorkspace.id,
        fullName: r.fullName,
        spiritualName: r.spiritualName,
        phone: r.phone,
        email: r.email,
        pin: r.pin,
        role: 'DEVOTEE',
        sevaIndex: 300,
        sevaTier: (r.sevaTier as any) || 'Vishesh',
        gotra: r.gotra,
        pravara: r.pravara,
        varnaKul: r.varnaKul,
        address: r.address,
        activeStatus: 'Active',
        totalDonated: 0,
        volunteerHours: 0,
      });
      added++;
    }

    setIsProcessing(false);
    setParsedRows([]);
    showToast(`Successfully enrolled ${added} new devotees with auto-provisioned PINs!`, 'success', 'Batch Ingestion Complete');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-temple-900/90 border border-temple-800 p-6 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
              Bulk Data Migration
            </span>
            <span className="text-xs text-temple-400 font-mono">
              Auto 4-Digit PIN Provisioning & Phone Deduplication
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-temple-100">
            Universal CSV Ingestion Engine
          </h2>
          <p className="text-xs text-temple-400 mt-0.5">
            Migrate thousands of community members, devotees, donors, and sadhakas in seconds
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadSample}
          className="px-4 py-2 rounded-xl bg-temple-800 hover:bg-temple-750 border border-temple-700 text-temple-200 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span>Download Sample CSV Template</span>
        </button>
      </div>

      {/* Upload Dropzone */}
      <div className="bg-temple-900/90 border-2 border-dashed border-temple-700 hover:border-saffron-500/50 rounded-3xl p-8 text-center transition-all">
        <Upload className="w-12 h-12 text-temple-500 mx-auto mb-3" />
        <h3 className="font-extrabold text-base text-temple-200">
          Upload Devotee / Member CSV Spreadsheet
        </h3>
        <p className="text-xs text-temple-400 max-w-md mx-auto mt-1 mb-4">
          Columns supported: <code className="text-saffron-400">FullName, Phone, Gotra, SevaTier, Email, SpiritualName, Pravara, Address</code>
        </p>

        <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-saffron-600 hover:bg-saffron-500 text-temple-950 font-bold text-xs cursor-pointer shadow-lg shadow-saffron-600/20 transition-all">
          <FileSpreadsheet className="w-4 h-4" />
          <span>Choose CSV File from Computer</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Parsed Preview Table */}
      {parsedRows.length > 0 && (
        <div className="bg-temple-900/90 border border-temple-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-temple-800">
            <div>
              <h3 className="font-extrabold text-sm text-temple-100">
                Batch Import Preview ({parsedRows.length} Rows Detected)
              </h3>
              <p className="text-xs text-temple-400 mt-0.5">
                <span className="text-emerald-400 font-bold">{validCount} Ready for Ingestion</span> •{' '}
                <span className="text-rose-400 font-bold">{duplicateCount} Duplicates Skipped</span>
              </p>
            </div>

            <button
              type="button"
              disabled={validCount === 0 || isProcessing}
              onClick={handleCommitIngestion}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-temple-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isProcessing ? 'Enrolling...' : `Commit & Enroll ${validCount} Members`}</span>
            </button>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] text-temple-400 uppercase bg-temple-950/60 font-semibold border-b border-temple-800">
                <tr>
                  <th className="p-3">Status</th>
                  <th className="p-3">Full Name</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Gotra</th>
                  <th className="p-3">Pravara</th>
                  <th className="p-3">Seva Tier</th>
                  <th className="p-3">Provisioned PIN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-temple-800">
                {parsedRows.slice(0, 15).map((row, idx) => (
                  <tr key={idx} className={row.isDuplicate ? 'bg-rose-950/20 text-rose-300' : 'hover:bg-temple-800/40'}>
                    <td className="p-3">
                      {row.isDuplicate ? (
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                          Duplicate Phone
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                          Valid
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-semibold text-temple-100">{row.fullName}</td>
                    <td className="p-3 font-mono text-saffron-400">{row.phone}</td>
                    <td className="p-3 text-temple-300">{row.gotra}</td>
                    <td className="p-3 text-temple-400 text-[11px]">{row.pravara || '-'}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-temple-800 text-temple-300 text-[10px] font-mono">
                        {row.sevaTier}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold text-saffron-300">{row.pin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedRows.length > 15 && (
              <p className="text-center text-xs text-temple-400 pt-3">
                ...and {parsedRows.length - 15} more rows
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
