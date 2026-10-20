import React, { useState } from 'react';
import { FileSpreadsheet, Upload, Download, CheckCircle2, AlertTriangle, Users, Sparkles } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useData } from '../../context/DataContext';
import { DEMO_CREATES_PER_MODULE } from '../../context/data/quotaEngine';
import { generateSampleDevoteeCSV, parseDevoteeCSV, IngestedDevoteeRow } from '../../utils/csvEngine';
import { useToast } from '../../context/ToastContext';
import { LocalOnlyBadge } from '../common/LocalOnlyBadge';
import { useLanguage } from '../../context/LanguageContext';
import { createBatch, loadBahiData, saveBahiData } from '../../bahikhata/bahikhataStore';
import { analyzeRows } from '../../bahikhata/dedupe';
import { digitsOnly } from '../../bahikhata/normalize';

export const BulkImportDesk: React.FC = () => {
  const { t, safeTranslate } = useLanguage();
  const { activeWorkspace, currentUser, effectiveRole } = useAuthWorkspace();
  const { devotees, addDevotee, getDemoStats } = useData();
  const { showToast } = useToast();

  const [parsedRows, setParsedRows] = useState<IngestedDevoteeRow[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [validCount, setValidCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Bulk-import honesty (Track 3, §7): the demo sandbox allows only
  // DEMO_CREATES_PER_MODULE creates per module — warn BEFORE commit when the
  // quota will truncate the batch, and count ACTUAL successes afterwards.
  const isDemoWorkspace = !!activeWorkspace?.id?.startsWith('DEMO_');
  const usedDevoteeQuota = isDemoWorkspace ? (getDemoStats().perModule['devotees'] || 0) : 0;
  const remainingQuota = isDemoWorkspace
    ? Math.max(0, DEMO_CREATES_PER_MODULE - usedDevoteeQuota)
    : Number.MAX_SAFE_INTEGER;
  const quotaWillTruncate = isDemoWorkspace && validCount > remainingQuota;
  const quotaWarning = quotaWillTruncate
    ? safeTranslate(
        'bulk_quota_warning',
        'Demo sandbox: only {a} of {b} will be enrolled — create a free account for the rest.',
        'ডেমো স্যান্ডবক্স: {b} জনের মধ্যে মাত্র {a} জন নথিভুক্ত হবে — বাকিদের জন্য একটি ফ্রি অ্যাকাউন্ট খুলুন।',
        'डेमो सैंडबॉक्स: {b} में से केवल {a} नामांकित होंगे — बाकी के लिए एक मुफ़्त खाता बनाएँ।'
      )
        .replace('{a}', String(remainingQuota))
        .replace('{b}', String(validCount))
    : null;

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

  /**
   * Bahi-Khata Seva path (Phase 1, the default): parsed rows become a
   * DRAFT review batch — nothing is enrolled until a trustee reviews
   * and approves it in People → 📖 Bahi-Khata Seva. The auto-generated
   * PINs from parsing are deliberately NOT carried into the batch:
   * imported members receive no live PIN from a paper/file name alone.
   */
  const handleSendToBahiKhata = () => {
    if (parsedRows.length === 0) return;
    const items = parsedRows.map((r) => ({
      raw: {
        FullName: r.fullName, Phone: r.phone, Gotra: r.gotra,
        SevaTier: r.sevaTier, Email: r.email || '', Address: r.address || '',
      },
      mapped: {
        fullName: r.fullName,
        phone: digitsOnly(r.phone),
        gotra: r.gotra,
        address: r.address || '',
        sevaTier: r.sevaTier,
        spiritualName: r.spiritualName || '',
        email: r.email || '',
      },
      pageNo: 1,
    }));
    const rows = analyzeRows(
      'members',
      items,
      { existingMembers: devotees, existingHerd: [] },
      `bulk_${Date.now().toString(36)}`
    );
    const batch = createBatch({
      workspaceId: activeWorkspace.id,
      target: 'members',
      source: 'csv',
      label: 'Bulk CSV — devotee file',
      enteredBy: {
        uid: currentUser?.id || 'local-user',
        name: currentUser?.name || currentUser?.fullName || 'Admin',
        role: String(effectiveRole || ''),
      },
    });
    batch.rows = rows;
    const data = loadBahiData(activeWorkspace.id);
    saveBahiData(activeWorkspace.id, { ...data, batches: [batch, ...data.batches] });
    setParsedRows([]);
    showToast(
      'Batch saved in 📖 Bahi-Khata Seva — open People → Bahi-Khata Seva to review & approve. Nothing is enrolled yet.',
      'success',
      'Sent for Review'
    );
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
      // Honesty fix (§7): addDevotee returns false when the demo quota blocks
      // the create — count ACTUAL successes, not attempts.
      const result = addDevotee({
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
      if (result !== false) added++;
    }

    setIsProcessing(false);
    setParsedRows([]);
    if (added === validCount) {
      showToast(`Successfully enrolled ${added} new devotees with auto-provisioned PINs!`, 'success', 'Batch Ingestion Complete');
    } else {
      showToast(
        safeTranslate(
          'bulk_quota_truncated',
          'Enrolled {a} of {b} — the demo sandbox allows {q} per module. Create a free account to enroll the rest.',
          '{b} জনের মধ্যে {a} জন নথিভুক্ত হয়েছে — ডেমো স্যান্ডবক্সে প্রতি মডিউলে {q} জন। বাকিদের জন্য ফ্রি অ্যাকাউন্ট খুলুন।',
          '{b} में से {a} नामांकित हुए — डेमो सैंडबॉक्स में प्रति मॉड्यूल {q}। बाकी के लिए मुफ़्त खाता बनाएँ।'
        )
          .replace('{a}', String(added))
          .replace('{b}', String(validCount))
          .replace('{q}', String(DEMO_CREATES_PER_MODULE)),
        'warning',
        'Batch Ingestion Complete'
      );
    }
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
            <span className="text-xs text-temple-400 font-mono">{t('org.people.bulkImport.auto4digitPinProvisioningPhoneDeduplicat')}</span>
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
          <span>{t('org.people.bulkImport.downloadSampleCsvTemplate')}</span>
        </button>
      </div>

      {/* Upload Dropzone */}
      <div className="bg-temple-900/90 border-2 border-dashed border-temple-700 hover:border-saffron-500/50 rounded-3xl p-8 text-center transition-all">
        <Upload className="w-12 h-12 text-temple-500 mx-auto mb-3" />
        <h3 className="font-extrabold text-base text-temple-200">{t('org.people.bulkImport.uploadDevoteeMemberCsvSpreadsheet')}</h3>
        <div className="mt-2 flex justify-center"><LocalOnlyBadge /></div>
        <p className="text-xs text-temple-400 max-w-md mx-auto mt-1 mb-4">
          Columns supported: <code className="text-saffron-400">{t('org.people.bulkImport.fullnamePhoneGotraSevatierEmailSpiritual')}</code>
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

            <div className="flex flex-col sm:flex-row gap-2">
              {/* Bahi-Khata review path — the default. Rows land in a
                  draft batch; a trustee approves before enrollment. */}
              <button
                type="button"
                disabled={parsedRows.length === 0 || isProcessing}
                onClick={handleSendToBahiKhata}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-temple-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 min-h-[44px]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>📖 Send to Bahi-Khata Review</span>
              </button>
              {/* Legacy direct commit — admin quick path, skips review. */}
              <button
                type="button"
                disabled={validCount === 0 || isProcessing}
                onClick={handleCommitIngestion}
                className="px-5 py-2.5 rounded-xl bg-temple-800 hover:bg-temple-750 border border-temple-700 text-temple-300 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 min-h-[44px]"
                title="Admin quick path — enrolls immediately without trustee review"
              >
                <span>{isProcessing ? 'Enrolling...' : `Commit directly (admin quick path) — ${validCount}`}</span>
              </button>
            </div>
          </div>

          {/* Pre-commit quota honesty (Track 3, §7): warn BEFORE the quota truncates. */}
          {quotaWarning && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3"
            >
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-xs text-amber-200 leading-relaxed">{quotaWarning}</p>
            </div>
          )}

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] text-temple-400 uppercase bg-temple-950/60 font-semibold border-b border-temple-800">
                <tr>
                  <th className="p-3">{t('org.people.bulkImport.status')}</th>
                  <th className="p-3">{t('org.people.bulkImport.fullName')}</th>
                  <th className="p-3">{t('org.people.bulkImport.phone')}</th>
                  <th className="p-3">{t('org.people.bulkImport.gotra')}</th>
                  <th className="p-3">Pravara</th>
                  <th className="p-3">{t('org.people.bulkImport.sevaTier')}</th>
                  <th className="p-3">Provisioned PIN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-temple-800">
                {parsedRows.slice(0, 15).map((row, idx) => (
                  <tr key={idx} className={row.isDuplicate ? 'bg-rose-950/20 text-rose-300' : 'hover:bg-temple-800/40'}>
                    <td className="p-3">
                      {row.isDuplicate ? (
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold">{t('org.people.bulkImport.duplicatePhone')}</span>
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
