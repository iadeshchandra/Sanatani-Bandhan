/**
 * SevaProTopupModal.tsx — the missing `seva-pro:open-topup` listener.
 * ================================================================
 * SevaCompletionButton's shortfall dialog fires `seva-pro:open-topup`
 * (CustomEvent, detail {orderId, shortfall, currency}) when the provider taps
 * "Top up earning wallet" — but nothing in the app ever listened, so the tap
 * silently did nothing and the provider was stuck: they could not complete
 * the seva. Mount this once inside each provider shell (Purohit + Jyotish);
 * it opens the existing wallet top-up claim flow (uid-scoped, reused from
 * the Solo Wallet tab) in a modal.
 */
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { TopupFlow } from '../../solo/WalletTab';
import type { WalletCurrency } from '../../lib/wallet';

const isWalletCurrency = (c: unknown): c is WalletCurrency =>
  c === 'BDT' || c === 'INR' || c === 'USD';

export const SevaProTopupModal: React.FC = () => {
  const [currency, setCurrency] = useState<WalletCurrency | null>(null);

  useEffect(() => {
    const onOpenTopup = (e: Event) => {
      const detail = (e as CustomEvent).detail as { currency?: unknown } | undefined;
      setCurrency(isWalletCurrency(detail?.currency) ? detail.currency : 'BDT');
    };
    window.addEventListener('seva-pro:open-topup', onOpenTopup);
    return () => window.removeEventListener('seva-pro:open-topup', onOpenTopup);
  }, []);

  if (!currency) return null;

  return (
    <div
      className="fixed inset-0 z-[120] bg-stone-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Top up earning wallet"
      onClick={() => setCurrency(null)}
    >
      <div
        className="bg-[#faf7f2] w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl shadow-2xl p-4 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-base font-extrabold text-stone-900">Top up your earning wallet</h2>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Your request is verified by the owner, then the amount is credited — after that you can complete the seva.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCurrency(null)}
            aria-label="Close"
            className="w-11 h-11 min-h-[44px] rounded-full bg-stone-200/70 hover:bg-stone-300 flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5 text-stone-700" />
          </button>
        </div>
        <TopupFlow
          currency={currency}
          onBack={() => setCurrency(null)}
          onDone={() => setCurrency(null)}
        />
      </div>
    </div>
  );
};

export default SevaProTopupModal;
