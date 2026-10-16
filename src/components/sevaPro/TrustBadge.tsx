/**
 * TrustBadge — dignified trust display for a Seva Professional.
 * ==============================================================
 * Shows the tier medallion + warm headline ("Trusted by 47 families") +
 * specialization badges. The raw trust score is NEVER rendered — it is an
 * internal ranking signal only (see trustScore.ts).
 *
 * Trilingual EN / BN / HI via LanguageContext, mobile-first, ≥44px targets.
 */
import React from 'react';
import { BadgeCheck, ShieldCheck, Sprout } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import {
  TrustResult,
  VerificationTier,
  trustDisplayFor,
  type DisplayLang,
} from '../../lib/sevaPro/trustScore';

const TIER_STYLE: Record<
  VerificationTier,
  { ring: string; bg: string; fg: string; Icon: typeof BadgeCheck }
> = {
  TRUSTED: {
    ring: 'ring-amber-400/60',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    fg: 'text-amber-800 dark:text-amber-200',
    Icon: ShieldCheck,
  },
  VERIFIED: {
    ring: 'ring-emerald-400/60',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    fg: 'text-emerald-800 dark:text-emerald-200',
    Icon: BadgeCheck,
  },
  REGISTERED: {
    ring: 'ring-stone-300/60',
    bg: 'bg-stone-50 dark:bg-stone-900/40',
    fg: 'text-stone-600 dark:text-stone-300',
    Icon: Sprout,
  },
};

export interface TrustBadgeProps {
  result: TrustResult;
  /** Provider's display name. */
  name: string;
  /** Specialization labels, e.g. ['Vivah', 'Griha Pravesh'] or ['Kundali', 'Muhurat']. */
  specializations?: string[];
  /** Compact card (list) vs full (profile header). */
  variant?: 'compact' | 'full';
  className?: string;
}

function asDisplayLang(currentLang: string): DisplayLang {
  return currentLang === 'bn' || currentLang === 'hi' ? currentLang : 'en';
}

export const TrustBadge: React.FC<TrustBadgeProps> = ({
  result,
  name,
  specializations = [],
  variant = 'compact',
  className = '',
}) => {
  const { currentLang } = useLanguage();
  const lang = asDisplayLang(currentLang || 'en');
  const display = trustDisplayFor(result, lang);
  const style = TIER_STYLE[result.tier];
  const Icon = style.Icon;

  if (variant === 'compact') {
    return (
      <div
        className={`flex items-center gap-3 rounded-2xl border border-stone-200/70 dark:border-stone-700/60 bg-white/80 dark:bg-stone-900/60 px-3 py-2.5 ${className}`}
        aria-label={`${name} — ${display.tierBadge}`}
      >
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ring-2 ${style.ring} ${style.bg}`}
          aria-hidden="true"
        >
          <Icon className={`h-5 w-5 ${style.fg}`} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
            {name}
          </p>
          <p className={`truncate text-xs font-medium ${style.fg}`}>
            {display.tierBadge} · {display.headline}
          </p>
        </div>
      </div>
    );
  }

  return (
    <section
      className={`rounded-3xl border border-stone-200/70 dark:border-stone-700/60 bg-white/80 dark:bg-stone-900/60 p-4 sm:p-5 ${className}`}
      aria-label={`${name} — ${display.tierBadge}`}
    >
      <div className="flex items-center gap-4">
        <span
          className={`grid h-16 w-16 shrink-0 place-items-center rounded-full ring-2 ${style.ring} ${style.bg}`}
          aria-hidden="true"
        >
          <Icon className={`h-8 w-8 ${style.fg}`} />
        </span>
        <div className="min-w-0">
          <p className="text-lg font-bold text-stone-900 dark:text-stone-50">{name}</p>
          <p className={`text-sm font-semibold ${style.fg}`}>{display.tierBadge}</p>
          <p className="mt-0.5 text-sm text-stone-600 dark:text-stone-300">{display.headline}</p>
        </div>
      </div>
      <p className="mt-3 border-t border-stone-100 dark:border-stone-800 pt-3 text-xs text-stone-500 dark:text-stone-400">
        🪔 {display.sevaLine}
      </p>
      {specializations.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {specializations.map((s) => (
            <span
              key={s}
              className="inline-flex min-h-[44px] items-center rounded-full bg-stone-100 dark:bg-stone-800 px-3 text-xs font-medium text-stone-700 dark:text-stone-200"
            >
              {s}
            </span>
          ))}
        </div>
      )}
    </section>
  );
};

export default TrustBadge;
