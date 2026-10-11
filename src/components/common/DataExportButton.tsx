import React from 'react';
import { Download } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { exportToCSV } from '../../utils/csvEngine';

/**
 * DataExportButton — One-tap CSV export for any desk grid or register.
 * Wraps exportToCSV from the shared csvEngine and shows a warning toast
 * when the current view has nothing to export instead of downloading an empty file.
 */

interface DataExportButtonProps {
  filename: string;
  headers?: string[];
  rows?: (string | number)[][];
  records?: Record<string, any>[];
  label?: string;
  className?: string;
}

export const DataExportButton: React.FC<DataExportButtonProps> = ({
  filename,
  headers,
  rows,
  records,
  label = 'Export CSV',
  className = '',
}) => {
  const { showToast } = useToast();

  const handleExport = () => {
    const hasRecords = Array.isArray(records) && records.length > 0;
    const hasRows = Array.isArray(headers) && headers.length > 0 && Array.isArray(rows) && rows.length > 0;

    if (!hasRecords && !hasRows) {
      showToast('Nothing to export — the current view has no records.', 'warning', 'Export');
      return;
    }

    try {
      if (hasRecords) {
        exportToCSV(filename, records as Record<string, any>[]);
      } else {
        exportToCSV(filename, headers as string[], rows as (string | number)[][]);
      }
      showToast('CSV downloaded successfully.', 'success', 'Export');
    } catch (err) {
      console.error('CSV export failed:', err);
      showToast('CSV export failed. Please try again.', 'error', 'Export');
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      title={label}
      className={`px-3.5 py-2.5 min-h-[44px] rounded-xl bg-temple-800 hover:bg-temple-750 border border-temple-700 text-temple-300 hover:text-amber-200 text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer ${className}`}
    >
      <Download className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );
};
