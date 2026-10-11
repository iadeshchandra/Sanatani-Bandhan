import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, X, Trash2, Download, Copy, Check, Filter } from 'lucide-react';
import { subscribeTelemetry, clearTelemetryLogs } from '../../utils/gtm';
import { TelemetryEventLog } from '../../types';
import { useToast } from '../../context/ToastContext';

interface GlobalTelemetryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalTelemetryModal: React.FC<GlobalTelemetryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [logs, setLogs] = useState<TelemetryEventLog[]>([]);
  const [filterEvent, setFilterEvent] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const unsubscribe = subscribeTelemetry((newLogs) => {
      setLogs(newLogs);
    });
    return () => unsubscribe();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (filterEvent === 'all') return true;
    return log.event === filterEvent;
  });

  const handleCopyPayload = (log: TelemetryEventLog) => {
    navigator.clipboard.writeText(JSON.stringify(log.payload, null, 2));
    setCopiedId(log.id);
    showToast('Payload copied to clipboard', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GA4_DataLayer_Logs_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    showToast('Telemetry event log exported', 'success');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="telemetry-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-temple-950/80 backdrop-blur-md"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-temple-900 border border-temple-700/80 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-temple-100"
        >
          {/* Modal Header */}
          <div className="p-4 border-b border-temple-800 flex items-center justify-between bg-temple-950/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Activity className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-temple-100 flex items-center gap-2">
                  GA4 Recommended Event Telemetry & DataLayer
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                    LIVE
                  </span>
                </h3>
                <p className="text-xs text-temple-400">
                  Capturing purchase, generate_lead, sign_up, share, view_item events
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportJSON}
                className="px-2.5 py-1.5 rounded-xl bg-temple-800 hover:bg-temple-700 text-temple-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Export JSON"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  clearTelemetryLogs();
                  showToast('Telemetry buffer cleared', 'info');
                }}
                className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Clear Logs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-temple-400 hover:text-temple-100 hover:bg-temple-800 transition-colors ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="px-4 py-2.5 border-b border-temple-800 bg-temple-900/50 flex items-center gap-2 overflow-x-auto text-xs">
            <Filter className="w-3.5 h-3.5 text-temple-400 shrink-0" />
            <span className="text-temple-400 text-[11px] font-medium">Filter by Schema:</span>
            {['all', 'purchase', 'generate_lead', 'sign_up', 'share', 'view_item'].map((evt, idx) => (
              <button
                key={evt}
                type="button"
                onClick={() => setFilterEvent(evt)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
                  filterEvent === evt
                    ? 'bg-saffron-500/20 text-saffron-300 border border-saffron-500/40 font-bold'
                    : 'bg-temple-800 text-temple-400 hover:text-temple-200'
                }`}
              >
                {evt}
              </button>
            ))}
          </div>

          {/* Event Log Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-16">
                <Activity className="w-10 h-10 text-temple-600 mx-auto mb-3" />
                <p className="text-temple-400 text-sm font-semibold">No telemetry events logged yet</p>
                <p className="text-temple-400 text-xs mt-1">
                  Interact with the desks (log Chanda, reserve a Pooja, add guests, share links) to stream live events.
                </p>
              </div>
            ) : (
              filteredLogs.map((log, idx) => (
                <div
                  key={`${log.id}-${idx}`}
                  className="bg-temple-950/60 border border-temple-800 rounded-xl p-3 text-xs font-mono transition-all hover:border-temple-700"
                >
                  <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-temple-800/80">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                          log.event === 'purchase'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : log.event === 'generate_lead'
                            ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                            : log.event === 'sign_up'
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            : 'bg-saffron-500/20 text-saffron-400 border border-saffron-500/30'
                        }`}
                      >
                        {log.event}
                      </span>
                      <span className="text-temple-400 text-[11px]">{log.timestamp}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyPayload(log)}
                      className="text-temple-400 hover:text-temple-200 flex items-center gap-1 text-[11px]"
                    >
                      {copiedId === log.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Payload</span>
                        </>
                      )}
                    </button>
                  </div>

                  <pre className="text-[11px] text-temple-300 overflow-x-auto bg-temple-900/80 p-2.5 rounded-lg">
                    {JSON.stringify(log.payload, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
