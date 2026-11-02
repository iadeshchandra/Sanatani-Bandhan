import React from 'react';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  /** Small count/context pill rendered after the label (a Chip slot). */
  badge?: React.ReactNode;
  testId?: string;
  disabled?: boolean;
}

interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange: (id: string) => void;
  /** Ground the row sits on (default light). */
  tone?: 'light' | 'dark';
  /** md = 44px targets (default); sm = 36px dense class — desk-internal
   *  rows only, never shell chrome (taste rule 14 / DE-16). */
  size?: 'md' | 'sm';
  ariaLabel?: string;
  className?: string;
}

/**
 * Tabs — THE tab idiom (Design Elevation E2 — DE-05, taste rule 7).
 * A horizontally scrollable pill row: the active pill is the --cta
 * token on both grounds; inactive pills are quiet neutrals of the
 * ground they sit on. Defined from the sanctum pill language of the
 * directory/Membership surfaces — desks may not invent another.
 */
export const Tabs: React.FC<TabsProps> = ({
  tabs,
  value,
  onChange,
  tone = 'light',
  size = 'md',
  ariaLabel,
  className = '',
}) => (
  <div
    role="tablist"
    aria-label={ariaLabel}
    className={`flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 ${className}`}
  >
    {tabs.map((tab) => {
      const isActive = tab.id === value;
      return (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={isActive}
          data-testid={tab.testId}
          disabled={tab.disabled}
          onClick={() => onChange(tab.id)}
          className={[
            'shrink-0 inline-flex items-center gap-2 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer border',
            size === 'md' ? 'min-h-[44px] px-4 text-sm' : 'min-h-[36px] px-3 text-xs',
            isActive
              ? 'bg-cta text-white border-transparent shadow-md shadow-saffron-700/20'
              : tone === 'dark'
                ? 'bg-temple-900/60 text-temple-300 border-temple-700 hover:border-amber-500/50 hover:text-white'
                : 'bg-white text-stone-600 border-stone-200 hover:border-saffron-400 hover:text-temple-900',
            tab.disabled ? 'opacity-50 cursor-not-allowed' : '',
          ].join(' ')}
        >
          {tab.icon && (
            <span className="shrink-0 inline-flex" aria-hidden="true">
              {tab.icon}
            </span>
          )}
          <span>{tab.label}</span>
          {tab.badge != null && tab.badge !== '' && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wide ${
                isActive
                  ? 'bg-white/20 text-white'
                  : tone === 'dark'
                    ? 'bg-temple-800 text-temple-300'
                    : 'bg-stone-100 text-stone-500'
              }`}
            >
              {tab.badge}
            </span>
          )}
        </button>
      );
    })}
  </div>
);
