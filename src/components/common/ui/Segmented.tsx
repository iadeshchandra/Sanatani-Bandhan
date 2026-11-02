import React from 'react';

export interface SegmentedOption {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  /** Small count pill rendered after the label. */
  badge?: React.ReactNode;
  /** Per-option active fill override — reserved for DATA-SEMANTIC
   *  states (e.g. Treasury's Receipts=emerald / Payments=rose), never
   *  for decoration. */
  activeClassName?: string;
  testId?: string;
  disabled?: boolean;
}

interface SegmentedProps {
  options: SegmentedOption[];
  value: string;
  onChange: (id: string) => void;
  /** Ground the control sits on (default light). */
  tone?: 'light' | 'dark';
  /** md = 44px targets (default); sm = 36px dense class — desk-internal
   *  filter rows only (taste rule 14 / DE-16). */
  size?: 'md' | 'sm';
  /** Render labels in the rationed eyebrow register (uppercase,
   *  letterspaced) — the Membership desk's established voice. */
  caps?: boolean;
  ariaLabel?: string;
  className?: string;
}

/**
 * Segmented — THE segmented-control idiom (Design Elevation E2 —
 * DE-05, taste rule 7), generalised from the Membership desk's trough:
 * a quiet trough, one raised white (light) / temple (dark) pill for
 * the current view, every option ≥44px (md) with equal share of the
 * row. For a handful of mutually exclusive views of one surface —
 * for long scrollable lists use Tabs instead.
 */
export const Segmented: React.FC<SegmentedProps> = ({
  options,
  value,
  onChange,
  tone = 'light',
  size = 'md',
  caps = false,
  ariaLabel,
  className = '',
}) => (
  <div
    role="group"
    aria-label={ariaLabel}
    className={`flex gap-1 p-1 overflow-x-auto no-scrollbar ${
      tone === 'dark'
        ? 'bg-temple-950 border border-temple-800 rounded-xl'
        : 'bg-stone-100 rounded-2xl'
    } ${className}`}
  >
    {options.map((opt) => {
      const isActive = opt.id === value;
      return (
        <button
          key={opt.id}
          type="button"
          aria-pressed={isActive}
          data-testid={opt.testId}
          disabled={opt.disabled}
          onClick={() => onChange(opt.id)}
          className={[
            'flex-1 flex items-center justify-center gap-2 whitespace-nowrap transition-all cursor-pointer',
            tone === 'dark' ? 'rounded-lg' : 'rounded-xl',
            size === 'md' ? 'min-h-[44px] px-4' : 'min-h-[36px] px-3',
            caps
              ? 'text-xs font-black uppercase tracking-widest'
              : size === 'md'
                ? 'text-sm font-bold'
                : 'text-xs font-bold',
            isActive
              ? opt.activeClassName ??
                (tone === 'dark'
                  ? 'bg-temple-800 text-white shadow'
                  : 'bg-white text-amber-800 shadow')
              : tone === 'dark'
                ? 'text-temple-400 hover:text-temple-200'
                : 'text-stone-500 hover:text-stone-700',
            opt.disabled ? 'opacity-50 cursor-not-allowed' : '',
          ].join(' ')}
        >
          {opt.icon && (
            <span className="shrink-0 inline-flex" aria-hidden="true">
              {opt.icon}
            </span>
          )}
          <span>{opt.label}</span>
          {opt.badge != null && opt.badge !== '' && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                isActive && !opt.activeClassName
                  ? tone === 'dark'
                    ? 'bg-temple-950/60 text-temple-200'
                    : 'bg-amber-100 text-amber-800'
                  : tone === 'dark'
                    ? 'bg-temple-800 text-temple-300'
                    : 'bg-stone-200 text-stone-600'
              }`}
            >
              {opt.badge}
            </span>
          )}
        </button>
      );
    })}
  </div>
);
