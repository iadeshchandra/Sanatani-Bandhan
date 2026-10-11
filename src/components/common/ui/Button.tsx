import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-saffron-500 hover:bg-saffron-600 active:bg-saffron-700 text-temple-950 border border-saffron-400 shadow-lg shadow-saffron-600/20 font-bold',
  secondary:
    'bg-temple-800 hover:bg-temple-700 active:bg-temple-700 text-temple-100 border border-temple-700 font-semibold',
  ghost:
    'bg-transparent hover:bg-temple-800/80 active:bg-temple-800 text-temple-300 hover:text-temple-100 border border-transparent font-semibold',
  danger:
    'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white border border-red-500 font-bold',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  // sm is reserved for dense toolbars; md/lg always meet the 44px touch target rule
  sm: 'min-h-[36px] px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'min-h-[44px] px-4 py-2 text-sm rounded-xl gap-2',
  lg: 'min-h-[48px] px-6 py-2.5 text-base rounded-xl gap-2',
};

/**
 * Temple-themed button. Always keyboard-focusable with a visible saffron ring.
 * Use `loading` for async actions instead of disabling without feedback.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, icon, children, className = '', disabled, type = 'button', ...rest }, ref) => {
    const isDisabled = disabled || loading;
    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={[
          'inline-flex items-center justify-center transition-all select-none cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 focus-visible:ring-offset-2 focus-visible:ring-offset-temple-900',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className,
        ].join(' ')}
        {...rest}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
        ) : (
          icon && <span className="shrink-0 inline-flex" aria-hidden="true">{icon}</span>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
