/**
 * ui.tsx — shared GodMode chrome primitives (QUEUED #39).
 * ============================================================================
 * The console's desks converged over many builds on one visual recipe —
 * slate-950 cards on slate-900, saffron accents, 44px touch targets —
 * but every AdminTabs file re-implements it by hand, so small drifts
 * accumulate. These primitives pin the recipe in ONE place:
 *
 *   GmCard          the standard desk card
 *   GmSectionTitle  card/section heading row (title + optional action)
 *   GmButton        primary / ghost / danger / subtle actions, ≥44px
 *   GmBadge         small status pill in the console's tone palette
 *
 * They are deliberately dumb: styling only, no data, no behaviour beyond
 * what props say. New chrome (header, status strip, "Needs your hand")
 * is built from them; existing desks adopt them as they are touched —
 * no functional behaviour changes anywhere.
 */
import React from 'react';

/* ------------------------------------------------------------------ card */

export const GmCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  tone?: 'plain' | 'amber' | 'red' | 'emerald';
}> = ({ children, className = '', tone = 'plain' }) => {
  const tones = {
    plain: 'bg-slate-950/70 border-slate-800',
    amber: 'bg-amber-500/10 border-amber-500/40',
    red: 'bg-red-500/10 border-red-500/40',
    emerald: 'bg-emerald-500/10 border-emerald-500/30',
  } as const;
  return (
    <div className={`rounded-2xl border p-5 ${tones[tone]} ${className}`}>{children}</div>
  );
};

/* ---------------------------------------------------------- section title */

export const GmSectionTitle: React.FC<{
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}> = ({ children, action, className = '' }) => (
  <div className={`flex items-center justify-between gap-3 mb-3 ${className}`}>
    <h3 className="text-sm font-bold text-slate-200">{children}</h3>
    {action}
  </div>
);

/* ---------------------------------------------------------------- button */

type GmButtonVariant = 'primary' | 'ghost' | 'danger' | 'subtle';

const BUTTON_VARIANTS: Record<GmButtonVariant, string> = {
  primary:
    'bg-saffron-500/90 text-white font-bold hover:bg-saffron-500 disabled:opacity-50',
  ghost:
    'bg-slate-800 text-slate-200 font-bold hover:bg-slate-700 disabled:opacity-50',
  danger:
    'bg-red-600 text-white font-bold hover:bg-red-500 disabled:opacity-50',
  subtle:
    'bg-slate-800/60 text-slate-300 font-semibold border border-slate-700 hover:bg-slate-700 disabled:opacity-50',
};

export const GmButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: GmButtonVariant;
  className?: string;
  disabled?: boolean;
  title?: string;
  type?: 'button' | 'submit';
}> = ({ children, onClick, variant = 'ghost', className = '', disabled, title, type = 'button' }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`px-4 py-2 min-h-[44px] rounded-xl text-xs inline-flex items-center justify-center gap-1.5 ${BUTTON_VARIANTS[variant]} ${className}`}
  >
    {children}
  </button>
);

/* ----------------------------------------------------------------- badge */

export type GmTone = 'saffron' | 'sky' | 'emerald' | 'amber' | 'red' | 'slate' | 'violet';

export const GM_TONE_CLASSES: Record<GmTone, string> = {
  saffron: 'bg-saffron-500/15 text-saffron-300 border-saffron-500/40',
  sky: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
  emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  amber: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  red: 'bg-red-500/15 text-red-300 border-red-500/40',
  slate: 'bg-slate-500/15 text-slate-300 border-slate-500/40',
  violet: 'bg-violet-500/15 text-violet-300 border-violet-500/40',
};

export const GmBadge: React.FC<{
  children: React.ReactNode;
  tone?: GmTone;
  mono?: boolean;
  className?: string;
}> = ({ children, tone = 'slate', mono = false, className = '' }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] uppercase font-bold ${
      mono ? 'font-mono' : ''
    } ${GM_TONE_CLASSES[tone]} ${className}`}
  >
    {children}
  </span>
);
