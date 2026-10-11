import React from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * EmptyState — Friendly zero-results block used across desks.
 * Centered layout with a dashed container, icon medallion,
 * explanatory copy, and an optional 44px-min call-to-action.
 */

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}) => (
  <div className="flex flex-col items-center justify-center text-center py-14 px-6 border-2 border-dashed border-temple-800 rounded-3xl bg-temple-950/40">
    <div className="w-14 h-14 rounded-2xl bg-temple-800/80 border border-temple-700 flex items-center justify-center mb-4">
      <Icon className="w-7 h-7 text-temple-500" />
    </div>
    <h3 className="text-base font-extrabold text-temple-100">{title}</h3>
    <p className="text-xs text-temple-400 mt-1.5 max-w-md leading-relaxed">{description}</p>
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="mt-4 px-5 py-2.5 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-temple-950 text-xs font-black shadow-lg shadow-amber-600/20 transition-all cursor-pointer"
      >
        {actionLabel}
      </button>
    )}
  </div>
);
