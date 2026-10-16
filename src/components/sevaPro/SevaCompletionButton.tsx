/**
 * SevaCompletionButton.tsx — Seva Professional Phase 3.
 * =====================================================
 * Drop-in replacement for the raw "Mark complete" button on provider
 * order cards. Flow:
 *   tap -> check earning-wallet coverage
 *     -> covered: one-tap confirm -> blessing on success
 *     -> shortfall: warm prompt + one-tap top-up -> resume after top-up
 *
 * Emits `seva-pro:open-topup` (CustomEvent, detail {orderId, shortfall,
 * currency}) when the provider taps "Top up earning wallet" — the app shell
 * should listen and open the existing wallet top-up flow (Solo -> Wallet
 * tab). A custom onTopUp handler overrides the event.
 *
 * Trilingual (EN/BN/HI) via useLanguage, mobile-first, >=44px targets.
 */
import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { sp, spLang } from '../../lib/sevaPro/sevaProCopy';
import { fmtWallet, type WalletCurrency } from '../../lib/wallet';
import {
  checkCompletionReadiness,
  completeSevaWithPrefundedCommission,
  PrefundShortfallError,
  type CompletionReadiness,
} from '../../lib/sevaPro/commissionPrefund';
import type { MarketplaceOrder } from '../../lib/marketplace';

interface SevaCompletionButtonProps {
  order: MarketplaceOrder;
  /** Called after a successful completion (e.g. reload orders). */
  onCompleted?: () => void;
  /** Overrides the default top-up deep-link event. */
  onTopUp?: (shortfall: number, currency: WalletCurrency) => void;
  className?: string;
}

type Phase = 'idle' | 'checking' | 'confirm' | 'shortfall' | 'working';

const BTN =
  'px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-black bg-amber-500 text-stone-950 hover:bg-amber-400 disabled:opacity-50 w-full';
const BTN_GHOST =
  'px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold bg-stone-100 text-stone-600 w-full';

function fireTopUpEvent(orderId: string, shortfall: number, currency: WalletCurrency) {
  try {
    window.dispatchEvent(
      new CustomEvent('seva-pro:open-topup', { detail: { orderId, shortfall, currency } })
    );
  } catch {
    /* non-DOM environment — ignore */
  }
}

export const SevaCompletionButton: React.FC<SevaCompletionButtonProps> = ({
  order, onCompleted, onTopUp, className,
}) => {
  const { showToast } = useToast();
  const { currentLang } = useLanguage();
  const L = spLang(currentLang);
  const [phase, setPhase] = useState<Phase>('idle');
  const [readiness, setReadiness] = useState<CompletionReadiness | null>(null);
  const orderId = order.id as string;

  const openTopUp = (r: CompletionReadiness) => {
    const currency = (r.due.currency || 'BDT') as WalletCurrency;
    if (onTopUp) onTopUp(r.check.shortfall, currency);
    else fireTopUpEvent(orderId, r.check.shortfall, currency);
    setPhase('idle');
  };

  const handleTap = async () => {
    setPhase('checking');
    try {
      const r = await checkCompletionReadiness(orderId);
      setReadiness(r);
      setPhase(r.check.ok ? 'confirm' : 'shortfall');
    } catch (e: any) {
      showToast(e?.message || sp(L, 'prefundErrorGeneric'), 'error');
      setPhase('idle');
    }
  };

  const handleConfirm = async () => {
    if (!readiness) return;
    setPhase('working');
    try {
      await completeSevaWithPrefundedCommission(orderId);
      showToast(sp(L, 'completeBlessing'), 'success');
      setPhase('idle');
      setReadiness(null);
      onCompleted?.();
    } catch (e: any) {
      if (e instanceof PrefundShortfallError) {
        // Balance moved between check and commit (concurrent spend) —
        // show the warm shortfall prompt with fresh numbers.
        try {
          const r = await checkCompletionReadiness(orderId);
          setReadiness(r);
          setPhase('shortfall');
        } catch {
          showToast(e.message, 'error');
          setPhase('idle');
        }
      } else {
        showToast(e?.message || sp(L, 'prefundErrorGeneric'), 'error');
        setPhase('idle');
      }
    }
  };

  const busy = phase === 'checking' || phase === 'working';
  const due = readiness?.due;
  const currency = (due?.currency || (order as any).currency || 'BDT') as WalletCurrency;

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={handleTap}
        className={className || BTN}
        aria-label={sp(L, 'markComplete')}
      >
        {phase === 'checking' ? '…' : `🪔 ${sp(L, 'markComplete')}`}
      </button>

      {phase === 'confirm' && readiness && due && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-950/50 p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-2xl">
            <p className="text-base font-black text-stone-900">{sp(L, 'confirmCompleteTitle')}</p>
            <p className="text-xs text-stone-500 mt-1 truncate">{order.gigTitle}</p>
            <div className="mt-3 rounded-2xl bg-amber-50 border border-amber-200 p-3">
              {due.isFreeSeva ? (
                <p className="text-xs text-amber-900 font-bold">{sp(L, 'freeSevaNote')}</p>
              ) : (
                <>
                  <p className="text-xs text-amber-900">{sp(L, 'confirmCompleteBody', { amount: fmtWallet(due.amount, currency) })}</p>
                  <p className="text-[11px] text-amber-700 mt-1.5 font-bold">
                    {sp(L, 'walletAfterCompletion', {
                      amount: fmtWallet(Math.max(0, readiness.wallet.balance - due.amount), currency),
                    })}
                  </p>
                </>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={() => setPhase('idle')} className={BTN_GHOST} disabled={busy}>
                {sp(L, 'notYet')}
              </button>
              <button type="button" onClick={handleConfirm} className={BTN} disabled={busy}>
                {busy ? sp(L, 'completingEllipsis') : sp(L, 'confirmCompleteCta')}
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'shortfall' && readiness && due && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-950/50 p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-2xl">
            <p className="text-base font-black text-stone-900">{sp(L, 'shortfallTitle')}</p>
            <div className="mt-3 rounded-2xl bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs text-amber-900">
                {sp(L, 'shortfallBody', {
                  amount: fmtWallet(due.amount, currency),
                  shortfall: fmtWallet(readiness.check.shortfall, currency),
                })}
              </p>
              <p className="text-[11px] text-amber-700 mt-1.5 font-bold">
                {sp(L, 'shortfallBalance', { amount: fmtWallet(readiness.wallet.balance, currency) })}
              </p>
            </div>
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={() => setPhase('idle')} className={BTN_GHOST}>
                {sp(L, 'notYet')}
              </button>
              <button type="button" onClick={() => openTopUp(readiness)} className={BTN}>
                💰 {sp(L, 'topUpEarningWallet')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SevaCompletionButton;
