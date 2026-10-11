import React from 'react';

export type BadgeTone = 'default' | 'saffron' | 'success' | 'warning' | 'danger' | 'info';

const TONE_CLASSES: Record<BadgeTone, string> = {
  default: 'bg-temple-800 text-temple-300 border-temple-700',
  saffron: 'bg-saffron-500/15 text-saffron-400 border-saffron-500/30',
  success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  danger: 'bg-red-500/15 text-red-400 border-red-500/30',
  info: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

/**
 * Small status/label pill. Uppercase micro-label style used across desks.
 */
export const Badge: React.FC<BadgeProps> = ({ tone = 'default', className = '', children, ...rest }) => (
  <span
    className={[
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider whitespace-nowrap',
      TONE_CLASSES[tone],
      className,
    ].join(' ')}
    {...rest}
  >
    {children}
  </span>
);
