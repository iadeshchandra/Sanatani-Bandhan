import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { Badge } from './Badge';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  onBack?: () => void;
  backLabel?: string;
}

/**
 * The standard desk header. Every desk should render this (not a bespoke
 * header) so the console feels like one product.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  subtitle,
  actions,
  onBack,
  backLabel = 'Back',
}) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-temple-900/90 border border-temple-800 p-5 sm:p-6 rounded-3xl shadow-xl">
    <div className="min-w-0">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mb-2 inline-flex items-center gap-1 min-h-[44px] text-xs font-bold text-temple-400 hover:text-saffron-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 rounded-lg px-1 -ml-1"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          {backLabel}
        </button>
      )}
      {eyebrow && (
        <div className="mb-1.5">
          <Badge tone="saffron">{eyebrow}</Badge>
        </div>
      )}
      <h1 className="text-xl sm:text-2xl font-extrabold text-temple-100 leading-tight">{title}</h1>
      {subtitle && <p className="text-xs sm:text-sm text-temple-400 mt-1 max-w-2xl">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
  </div>
);
