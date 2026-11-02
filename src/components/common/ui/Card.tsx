import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Ground the card renders on (default dark — the original kit).
   *  Light cards are the sanctum surface: white ground, warm amber
   *  hairline, evening shadow; `hoverable` adds the lamplight inner
   *  glow (Design Elevation E2 — taste rule 8). */
  tone?: 'dark' | 'light';
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const PADDING: Record<NonNullable<CardProps['padding']>, string> = {
  none: 'p-0',
  /* The one padding rhythm: 16 / 20 / 24 (taste rule 8). */
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

/**
 * Standard temple surface card. Default building block for desk sections.
 */
export const Card: React.FC<CardProps> = ({ tone = 'dark', hoverable = false, padding = 'md', className = '', children, ...rest }) => (
  <div
    className={[
      tone === 'dark'
        ? 'bg-temple-900/90 border border-temple-800 rounded-2xl shadow-lg'
        : 'bg-white border border-amber-100 rounded-2xl shadow-[0_2px_10px_rgba(120,72,20,0.06),0_18px_36px_-24px_rgba(120,72,20,0.25)]',
      hoverable && tone === 'dark' ? 'transition-all hover:border-saffron-500/40 hover:shadow-xl' : '',
      hoverable && tone === 'light' ? 'transition-all lamplight hover:border-amber-200' : '',
      PADDING[padding],
      className,
    ].join(' ')}
    {...rest}
  >
    {children}
  </div>
);

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: 'dark' | 'light';
}

export const CardHeader: React.FC<CardHeaderProps> = ({ title, subtitle, action, icon, tone = 'dark' }) => (
  <div className="flex items-start justify-between gap-3 mb-4">
    <div className="flex items-start gap-2.5 min-w-0">
      {icon && <span className={`mt-0.5 shrink-0 ${tone === 'dark' ? 'text-saffron-400' : 'text-saffron-700'}`} aria-hidden="true">{icon}</span>}
      <div className="min-w-0">
        <h3 className={`font-extrabold text-sm sm:text-base truncate ${tone === 'dark' ? 'text-temple-100' : 'text-temple-900'}`}>{title}</h3>
        {subtitle && <p className={`text-xs mt-0.5 ${tone === 'dark' ? 'text-temple-400' : 'text-stone-500'}`}>{subtitle}</p>}
      </div>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
