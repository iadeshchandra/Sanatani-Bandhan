import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const PADDING: Record<NonNullable<CardProps['padding']>, string> = {
  none: 'p-0',
  sm: 'p-3 sm:p-4',
  md: 'p-4 sm:p-6',
  lg: 'p-6 sm:p-8',
};

/**
 * Standard temple surface card. Default building block for desk sections.
 */
export const Card: React.FC<CardProps> = ({ hoverable = false, padding = 'md', className = '', children, ...rest }) => (
  <div
    className={[
      'bg-temple-900/90 border border-temple-800 rounded-2xl shadow-lg',
      hoverable ? 'transition-all hover:border-saffron-500/40 hover:shadow-xl' : '',
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
}

export const CardHeader: React.FC<CardHeaderProps> = ({ title, subtitle, action, icon }) => (
  <div className="flex items-start justify-between gap-3 mb-4">
    <div className="flex items-start gap-2.5 min-w-0">
      {icon && <span className="mt-0.5 shrink-0 text-saffron-400" aria-hidden="true">{icon}</span>}
      <div className="min-w-0">
        <h3 className="font-extrabold text-sm sm:text-base text-temple-100 truncate">{title}</h3>
        {subtitle && <p className="text-xs text-temple-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
