import React, { useEffect, useState } from 'react';
import { Download, X, Loader2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfBlobUrl?: string | null;
  pdfUrl?: string | null;
  fileName: string;
  title?: string;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  isOpen,
  onClose,
  pdfBlobUrl,
  pdfUrl,
  fileName,
  title = "PDF Preview"
}) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const activeUrl = pdfBlobUrl || pdfUrl;

  if (!isOpen) return null;

  const handleDownload = () => {
    if (activeUrl) {
      const a = document.createElement('a');
      a.href = activeUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden border border-temple-200 animate-in zoom-in-95 duration-200"
        style={{ height: '85vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-temple-100 bg-temple-50/50">
          <div>
            <h3 className="text-lg font-black text-temple-900">{title}</h3>
            <p className="text-xs font-semibold text-temple-500 mt-0.5">Please verify the details before downloading</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleDownload}
              disabled={!activeUrl}
              className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 bg-saffron-600 hover:bg-saffron-700 disabled:bg-temple-300 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-sm hover:shadow-md"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 sm:p-2.5 text-temple-400 hover:text-temple-700 hover:bg-temple-200 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 bg-temple-100 relative overflow-hidden flex items-center justify-center p-2 sm:p-4">
          {!activeUrl ? (
            <div className="flex flex-col items-center justify-center text-temple-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-saffron-500" />
              <p className="font-semibold text-sm">Generating Document...</p>
            </div>
          ) : (
            <iframe
              src={`${activeUrl}#toolbar=0`}
              className="w-full h-full bg-white rounded-xl shadow-sm border border-temple-200"
              title="PDF Preview"
              onLoad={() => setLoading(false)}
            />
          )}
          {loading && activeUrl && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-temple-100/80 backdrop-blur-sm z-10">
              <Loader2 className="w-8 h-8 animate-spin text-saffron-500 mb-3" />
              <p className="text-sm font-bold text-temple-600">Loading Preview Engine...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
