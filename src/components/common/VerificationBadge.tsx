/**
 * VerificationBadge — the platform-wide trust mark for purohits.
 * =====================================================================
 * Shows a purohit's verification tier with distinct visual weight per tier.
 * The ✓ check appears ONLY at PLATFORM_VERIFIED — the highest tier.
 * Keep it tiny and reusable: it is used in marketplace listings, "Find a
 * Purohit" cards, the purohit profile header, and next to author names in
 * the social feed. Pass `tier={null}` (or omit) to render nothing.
 */
import React from 'react';
import { PurohitVerificationTier, PUROHIT_TIER_META } from '../../types/purohit';

interface VerificationBadgeProps {
  /** Verification tier. null/undefined renders nothing (e.g. unverified authors). */
  tier?: PurohitVerificationTier | null;
  /** 'xs' for inline author names, 'sm' default, 'md' for profile headers. */
  size?: 'xs' | 'sm' | 'md';
  /** Hide the text label and show icon only (still accessible via title). */
  iconOnly?: boolean;
  className?: string;
}

const SIZE_CLS: Record<NonNullable<VerificationBadgeProps['size']>, string> = {
  xs: 'text-[9px] px-1.5 py-px gap-0.5',
  sm: 'text-[10px] px-2 py-0.5 gap-1',
  md: 'text-[11px] px-2.5 py-1 gap-1',
};

const TIER_STYLE: Record<PurohitVerificationTier, { cls: string; glyph: string }> = {
  // Registered = unverified entry tier: quiet, neutral.
  REGISTERED: { cls: 'bg-stone-100 text-stone-500 border-stone-200', glyph: '○' },
  // Credential-verified: platform reviewed the credentials.
  CREDENTIAL_VERIFIED: { cls: 'bg-sky-100 text-sky-800 border-sky-300', glyph: '◈' },
  // Organisation-endorsed: a real organisation (mandir, sangha, ashram, gurukul, trust…) vouches for them.
  ORG_ENDORSED: { cls: 'bg-amber-100 text-amber-800 border-amber-300', glyph: '⬢' },
  // Platform-verified: the only tier that earns the ✓.
  PLATFORM_VERIFIED: { cls: 'bg-emerald-100 text-emerald-900 border-emerald-400 font-black', glyph: '✓' },
};

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  tier,
  size = 'sm',
  iconOnly = false,
  className = '',
}) => {
  if (!tier) return null;
  const meta = PUROHIT_TIER_META[tier];
  const style = TIER_STYLE[tier];
  return (
    <span
      className={`inline-flex items-center rounded-full border uppercase tracking-wider font-bold whitespace-nowrap ${SIZE_CLS[size]} ${style.cls} ${className}`}
      title={`Purohit verification: ${meta.label}`}
      aria-label={`Verified purohit: ${meta.label}`}
    >
      <span aria-hidden="true">{style.glyph}</span>
      {!iconOnly && <span>{tier === 'PLATFORM_VERIFIED' ? `${meta.label} ✓` : meta.label}</span>}
    </span>
  );
};
