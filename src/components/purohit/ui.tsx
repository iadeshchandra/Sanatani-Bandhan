/** Shared presentational helpers for the Purohit One workspace. */
import React from 'react';
import { GIG_STATUS_META, GigStatus } from '../../types/purohit';
import { VerificationBadge } from '../common/VerificationBadge';

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`bg-white rounded-2xl border border-stone-200 shadow-sm p-4 sm:p-5 ${className}`}>
    {children}
  </div>
);

export const SectionTitle: React.FC<{ children: React.ReactNode; sub?: string }> = ({
  children,
  sub,
}) => (
  <div className="mb-3">
    <h2 className="text-base font-black text-stone-900">{children}</h2>
    {sub && <p className="text-xs text-stone-500 mt-0.5">{sub}</p>}
  </div>
);

export const PrimaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  children,
  className = '',
  ...rest
}) => (
  <button
    type="button"
    className={`px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-sm font-bold shadow-md transition-all min-h-[44px] disabled:opacity-50 ${className}`}
    {...rest}
  >
    {children}
  </button>
);

export const GhostButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
  children,
  className = '',
  ...rest
}) => (
  <button
    type="button"
    className={`px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-bold transition-colors min-h-[44px] disabled:opacity-50 ${className}`}
    {...rest}
  >
    {children}
  </button>
);

export const Field: React.FC<{
  label: string;
  children: React.ReactNode;
  hint?: string;
}> = ({ label, children, hint }) => (
  <label className="block">
    <span className="text-xs font-bold text-stone-700 uppercase tracking-wide">{label}</span>
    <div className="mt-1">{children}</div>
    {hint && <p className="text-[11px] text-stone-400 mt-1">{hint}</p>}
  </label>
);

export const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 min-h-[44px]';

/** Legacy alias kept for the purohit workspace — renders the platform-wide VerificationBadge. */
export const TierBadge: React.FC<{ tier: import('../../types/purohit').PurohitVerificationTier }> = ({ tier }) => (
  <VerificationBadge tier={tier} />
);

const STATUS_COLORS: Record<string, string> = {
  amber: 'bg-amber-100 text-amber-800 border-amber-200',
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
  indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  green: 'bg-green-100 text-green-800 border-green-200',
  slate: 'bg-stone-100 text-stone-600 border-stone-200',
};

export const GigStatusBadge: React.FC<{ status: GigStatus }> = ({ status }) => {
  const meta = GIG_STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center text-[11px] font-black uppercase tracking-wider border rounded-full px-2.5 py-1 ${STATUS_COLORS[meta.color]}`}
    >
      {meta.label}
    </span>
  );
};

export const Stars: React.FC<{ value: number; size?: string }> = ({ value, size = 'w-4 h-4' }) => (
  <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((i) => (
      <span key={i} className={`${size} ${i <= Math.round(value) ? 'text-amber-500' : 'text-stone-300'}`}>
        ★
      </span>
    ))}
  </span>
);

export const EmptyState: React.FC<{ title: string; sub?: string }> = ({ title, sub }) => (
  <div className="text-center py-10 px-4">
    <div className="text-4xl mb-3">🪔</div>
    <p className="font-bold text-stone-700">{title}</p>
    {sub && <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">{sub}</p>}
  </div>
);
