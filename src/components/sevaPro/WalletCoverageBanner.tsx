/**
 * WalletCoverageBanner.tsx — Seva Professional Phase 3.
 * =====================================================
 * Provider dashboard card: "Your earning wallet: ৳1,200 — covers the
 * contribution for ~2 more sevas". All reads fail-soft (banner degrades to
 * balance-only rather than erroring).
 *
 * Trilingual (EN/BN/HI), mobile-first.
 */
import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { sp, spLang } from '../../lib/sevaPro/sevaProCopy';
import { getWallet, fmtWallet, type WalletCurrency } from '../../lib/wallet';
import { myOrdersAsProvider } from '../../lib/marketplace';
import {
  findProfessionalProfile,
  estimateSevasCovered,
} from '../../lib/sevaPro/commissionPrefund';
import { auth } from '../../lib/firebase';

interface WalletCoverageBannerProps {
  /** Override for the average commission when no order history exists. */
  avgCommission?: number;
}

export const WalletCoverageBanner: React.FC<WalletCoverageBannerProps> = ({ avgCommission }) => {
  const { currentLang } = useLanguage();
  const L = spLang(currentLang);
  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState<WalletCurrency>('BDT');
  const [avg, setAvg] = useState<number | null>(avgCommission ?? null);
  const [freeSevas, setFreeSevas] = useState<number>(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const w = await getWallet();
        if (!alive) return;
        setBalance(w.balance);
        setCurrency(w.currency);
        const uid = auth.currentUser?.uid;
        const [orders, profile] = await Promise.all([
          myOrdersAsProvider().catch(() => [] as any[]),
          uid ? findProfessionalProfile(uid).catch(() => null) : Promise.resolve(null),
        ]);
        if (!alive) return;
        setFreeSevas(Math.max(0, Math.floor(Number(profile?.freeSevasRemaining ?? 0))));
        if (avg === null || avg === undefined) {
          const completed = orders
            .filter((o: any) => o.status === 'completed')
            .slice(0, 20)
            .map((o: any) => Number(o.commissionAmount || 0))
            .filter((n: number) => n > 0);
          if (completed.length > 0) {
            setAvg(Math.round(completed.reduce((a: number, b: number) => a + b, 0) / completed.length));
          }
        }
      } catch {
        /* fail-soft: banner simply stays hidden */
      }
    })();
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (balance === null) return null;

  const covered = avg && avg > 0 ? estimateSevasCovered(balance, avg) : null;
  const coverageLine =
    freeSevas > 0
      ? sp(L, 'walletFreeSevasLeft', { n: freeSevas })
      : covered === null
        ? null
        : covered >= 2
          ? sp(L, 'walletCoversMany', { n: covered })
          : covered === 1
            ? sp(L, 'walletCoversOne')
            : sp(L, 'walletCoversNone');

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-black text-amber-800 uppercase tracking-wide">
          🪔 {sp(L, 'earningWalletTitle')}
        </p>
      </div>
      <p className="text-2xl font-black text-stone-900 mt-1">{fmtWallet(balance, currency)}</p>
      {coverageLine && (
        <p className={`text-[11px] mt-1 font-bold ${covered === 0 && freeSevas === 0 ? 'text-amber-700' : 'text-stone-600'}`}>
          {coverageLine}
        </p>
      )}
    </div>
  );
};

export default WalletCoverageBanner;
