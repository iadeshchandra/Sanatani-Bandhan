/**
 * Seva Professional Program — Phase 1
 * Small shared UI primitives with a warm, dignified Sanatani feel.
 * Amber/stone/indigo theme, ≥44px touch targets, mobile-first.
 */
import React from 'react';
import type { PurohitVerificationTier } from '../../types/purohit';
import { PUROHIT_TIER_META } from '../../types/purohit';

/** Star row (1–5) with a warm amber fill. */
export const Stars: React.FC<{ value: number; size?: string }> = ({
  value,
  size = 'w-4 h-4',
}) => {
  const full = Math.round(Math.max(0, Math.min(5, value)));
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className={`${size} ${i <= full ? 'text-amber-500' : 'text-stone-300'}`}
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L10 14.9l-5.3 2.7 1-5.8L1.5 7.7l5.9-.9z" />
        </svg>
      ))}
    </span>
  );
};

/**
 * Verification "honor" badge — feels like an earned honor (diya + tier name),
 * never a compliance stamp. Trilingual title tooltip via `title`.
 */
export const HonorBadge: React.FC<{
  tier: PurohitVerificationTier;
  role: 'Purohit' | 'Jyotishi';
}> = ({ tier, role }) => {
  const meta = PUROHIT_TIER_META[tier];
  const top = tier === 'PLATFORM_VERIFIED' || tier === 'ORG_ENDORSED';
  return (
    <span
      title={`${meta.description}`}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border min-h-[32px] ${
        top
          ? 'bg-amber-100 border-amber-300 text-amber-900'
          : 'bg-stone-100 border-stone-300 text-stone-700'
      }`}
    >
      <span aria-hidden="true">{meta.badge}</span>
      <span>
        {meta.label} {role}
      </span>
      <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 text-amber-600" fill="currentColor" aria-label="verified">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.7-9.3a1 1 0 00-1.4-1.4L9 10.6 7.7 9.3a1 1 0 00-1.4 1.4l2 2a1 1 0 001.4 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  );
};

/** Section card with a soft warm border. */
export const SectionCard: React.FC<{
  title: string;
  icon?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ title, icon, children, className = '' }) => (
  <section className={`bg-white rounded-2xl border border-stone-200 shadow-sm p-4 sm:p-5 ${className}`}>
    <h2 className="text-base font-bold text-stone-900 mb-3 flex items-center gap-2">
      {icon && (
        <span aria-hidden="true" className="text-lg">
          {icon}
        </span>
      )}
      {title}
    </h2>
    {children}
  </section>
);

/** Small pill chip. */
export const Chip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center rounded-full bg-stone-100 border border-stone-200 text-stone-700 text-xs font-medium px-3 py-1.5 min-h-[32px]">
    {children}
  </span>
);

/** Monogram avatar fallback — warm amber gradient. */
export const Monogram: React.FC<{ name: string; size?: string }> = ({
  name,
  size = 'w-20 h-20 text-3xl',
}) => {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  return (
    <div
      aria-hidden="true"
      className={`${size} rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-amber-700 text-white font-bold flex items-center justify-center shadow-md select-none`}
    >
      {initials || '🪔'}
    </div>
  );
};

/** Skeleton shimmer for loading states (offline-friendly). */
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-stone-200 rounded-xl ${className}`} aria-hidden="true" />
);
