import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  title?: string;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  variant?: 'danger' | 'amber' | 'primary';
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, title?: string) => void;
  confirm: (options: ConfirmOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmOptions | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'info', title?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastItem = { id, message, type, title };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    setConfirmDialog(options);
  }, []);

  /**
   * Phase 21: global toast bridge. Non-React services (e.g. the cloud auth
   * layer) dispatch `window` CustomEvents instead of importing this context,
   * which avoids circular import graphs.
   *
   *   window.dispatchEvent(new CustomEvent('sanatani:toast', {
   *     detail: { message: '...', type: 'warning', title: '...' },
   *   }));
   */
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ message?: string; type?: ToastType; title?: string }>).detail;
      if (detail?.message) {
        showToast(detail.message, detail.type || 'info', detail.title);
      }
    };
    window.addEventListener('sanatani:toast', handler);
    return () => window.removeEventListener('sanatani:toast', handler);
  }, [showToast]);

  const handleConfirm = () => {
    if (confirmDialog?.onConfirm) confirmDialog.onConfirm();
    setConfirmDialog(null);
  };

  const handleCancel = () => {
    if (confirmDialog?.onCancel) confirmDialog.onCancel();
    setConfirmDialog(null);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-rose-500 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-sky-500 shrink-0" />;
    }
  };

  // M-3: memoized provider value.
  const toastValue = useMemo(() => ({ showToast, confirm }), [showToast, confirm]);

  return (
    <ToastContext.Provider value={toastValue}>
      {children}

      {/* Toast Notification Container */}
      <div
        id="toast-portal-container"
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-md w-full px-4"
      >
        <AnimatePresence>
          {toasts.map((t, idx) => (
            <motion.div
              key={`${t.id}-${idx}`}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="pointer-events-auto bg-stone-900/95 text-stone-100 backdrop-blur-md border border-stone-700/80 rounded-xl p-3.5 shadow-2xl flex items-start gap-3"
            >
              {getIcon(t.type)}
              <div className="flex-1 min-w-0">
                {t.title && <p className="font-semibold text-sm text-stone-100">{t.title}</p>}
                <p className="text-xs text-stone-300 leading-relaxed break-words">{t.message}</p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="text-stone-400 hover:text-stone-200 transition-colors p-0.5 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Confirm Dialog Modal Portal */}
      <AnimatePresence>
        {confirmDialog && (
          <div
            id="confirm-modal-backdrop"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="bg-stone-900 border border-stone-700/80 text-stone-100 rounded-2xl max-w-md w-full p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg text-stone-100">{confirmDialog.title}</h3>
              </div>
              <p className="text-sm text-stone-300 mb-6 leading-relaxed">
                {confirmDialog.message}
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  id="confirm-cancel-btn"
                  onClick={handleCancel}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors cursor-pointer"
                >
                  {confirmDialog.cancelText || 'Cancel'}
                </button>
                <button
                  type="button"
                  id="confirm-action-btn"
                  onClick={handleConfirm}
                  className={`px-4 py-2 text-xs font-semibold rounded-xl text-white shadow-lg transition-all cursor-pointer ${
                    confirmDialog.variant === 'danger'
                      ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                      : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                  }`}
                >
                  {confirmDialog.confirmText || 'Confirm Action'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
