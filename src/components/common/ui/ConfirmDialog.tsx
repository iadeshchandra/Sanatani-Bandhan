import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmOptions {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

let requestConfirm: ((opts: ConfirmOptions) => void) | null = null;

/**
 * Promise-based replacement for window.confirm.
 *
 *   const ok = await confirmDialog({ title: 'Delete property?', message: '...', danger: true });
 *   if (!ok) return;
 *
 * Mount <ConfirmProvider /> once near the app root (done in App.tsx).
 * Concurrent calls are queued and resolved in order.
 */
export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const req = requestConfirm;
    if (!req) {
      // Provider not mounted — fail safe, never block the caller
      console.warn('[ConfirmDialog] ConfirmProvider not mounted; auto-declining.');
      resolve(false);
      return;
    }
    req({ ...opts, resolve } as PendingConfirm & { resolve: (v: boolean) => void });
  });
}

export const ConfirmProvider: React.FC = () => {
  const [queue, setQueue] = useState<PendingConfirm[]>([]);
  const queueRef = useRef<PendingConfirm[]>([]);
  queueRef.current = queue;

  useEffect(() => {
    requestConfirm = (opts: ConfirmOptions) => {
      setQueue((prev) => [...prev, opts as PendingConfirm]);
    };
    return () => {
      requestConfirm = null;
    };
  }, []);

  const settle = useCallback((value: boolean) => {
    const [current, ...rest] = queueRef.current;
    if (!current) return;
    current.resolve(value);
    setQueue(rest);
  }, []);

  const current = queue[0];
  if (!current) return null;

  return (
    <Modal
      isOpen={true}
      onClose={() => settle(false)}
      title={current.title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={() => settle(false)}>
            {current.cancelLabel || 'Cancel'}
          </Button>
          <Button variant={current.danger ? 'danger' : 'primary'} onClick={() => settle(true)} autoFocus>
            {current.confirmLabel || 'Confirm'}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        {current.danger && (
          <span className="shrink-0 mt-0.5 w-9 h-9 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center">
            <AlertTriangle className="w-4.5 h-4.5 text-red-400" aria-hidden="true" />
          </span>
        )}
        <div className="text-sm text-temple-300 leading-relaxed">{current.message}</div>
      </div>
    </Modal>
  );
};
