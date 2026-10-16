/**
 * EarningWalletOnboarding.tsx — Seva Professional Phase 3.
 * =========================================================
 * First-time professional onboarding step: "Activate your earning wallet".
 * Warm copy, suggested starter amount = 2x the typical commission (rounded
 * up to a friendly number). Skippable — never blocks onboarding.
 *
 * Trilingual (EN/BN/HI), mobile-first, >=44px targets.
 */
import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { sp, spLang } from '../../lib/sevaPro/sevaProCopy';
import { fmtWallet, type WalletCurrency } from '../../lib/wallet';

interface EarningWalletOnboardingProps {
  /** Typical commission per seva in the provider's currency. */
  typicalCommission: number;
  currency?: WalletCurrency;
  /** Called with the suggested amount when the provider taps the CTA. */
  onTopUp: (amount: number) => void;
  onSkip?: () => void;
}

/** Suggested starter: 2x typical commission, rounded up to a friendly step. */
export function suggestedStarterAmount(typicalCommission: number): number {
  const raw = Math.max(0, Number(typicalCommission || 0)) * 2;
  if (raw <= 0) return 0;
  const step = raw < 100 ? 10 : raw < 1000 ? 50 : 100;
  return Math.ceil(raw / step) * step;
}

export const EarningWalletOnboarding: React.FC<EarningWalletOnboardingProps> = ({
  typicalCommission, currency = 'BDT', onTopUp, onSkip,
}) => {
  const { currentLang } = useLanguage();
  const L = spLang(currentLang);
  const suggested = suggestedStarterAmount(typicalCommission);

  return (
    <div className="bg-white rounded-3xl border border-amber-200 p-5 shadow-sm">
      <p className="text-3xl" aria-hidden="true">🪔</p>
      <p className="text-base font-black text-stone-900 mt-2">{sp(L, 'activateWalletTitle')}</p>
      <p className="text-xs text-stone-600 mt-2 leading-relaxed">
        {sp(L, 'activateWalletBody', { amount: fmtWallet(suggested, currency) })}
      </p>
      <button
        type="button"
        onClick={() => onTopUp(suggested)}
        className="mt-4 w-full px-4 py-3 min-h-[44px] rounded-xl text-sm font-black bg-amber-500 text-stone-950 hover:bg-amber-400"
      >
        💰 {sp(L, 'activateWalletCta', { amount: fmtWallet(suggested, currency) })}
      </button>
      {onSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="mt-2 w-full px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-stone-500"
        >
          {sp(L, 'activateWalletSkip')}
        </button>
      )}
    </div>
  );
};

export default EarningWalletOnboarding;
