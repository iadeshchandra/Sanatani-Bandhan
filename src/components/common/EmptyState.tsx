import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from './ui/Button';

/**
 * EmptyState — friendly zero-results block used across desks (Pillar 5 pass).
 * =====================================================================
 * Centered layout with an illustration slot (emoji art, diya, or a Lucide
 * icon medallion), warm invitation copy — never a dead "No data found" —
 * and an optional 44px-min call-to-action.
 *
 * Two tones: 'dark' for the temple-theme org desks, 'light' for the
 * devotee-facing light surfaces (Sangam feed, public pages).
 * Backward compatible: existing `icon`-based usage is unchanged.
 */

interface EmptyStateProps {
  /** Lucide icon for the medallion (ignored when `illustration` is given). */
  icon?: LucideIcon;
  /** Custom illustration slot — emoji art, SVG, anything warm. */
  illustration?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'dark' | 'light';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  illustration,
  title,
  description,
  actionLabel,
  onAction,
  tone = 'dark',
}) => {
  const dark = tone === 'dark';
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-14 px-6 border-2 border-dashed rounded-3xl ${
        dark
          ? 'border-temple-800 bg-temple-950/40'
          : 'border-amber-200 bg-amber-50/60'
      }`}
    >
      {illustration ? (
        <div className="mb-4 text-5xl leading-none" aria-hidden="true">
          {illustration}
        </div>
      ) : (
        Icon && (
          <div
            className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-4 ${
              dark
                ? 'bg-temple-800/80 border-temple-700'
                : 'bg-white border-amber-200 shadow-sm'
            }`}
          >
            <Icon className={`w-7 h-7 ${dark ? 'text-temple-500' : 'text-amber-600'}`} />
          </div>
        )
      )}
      <h3 className={`text-base font-extrabold ${dark ? 'text-temple-100' : 'text-stone-800'}`}>
        {title}
      </h3>
      <p
        className={`text-xs mt-1.5 max-w-md leading-relaxed ${
          dark ? 'text-temple-400' : 'text-stone-500'
        }`}
      >
        {description}
      </p>
      {/* DESIGN ELEVATION E2: the one action that fills the empty state
          is the house Button (primary = --cta token), on both tones. */}
      {actionLabel && onAction && (
        <Button
          variant="primary"
          tone={dark ? 'dark' : 'light'}
          onClick={onAction}
          className="pressable mt-4"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
