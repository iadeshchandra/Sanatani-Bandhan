import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonTone = 'light' | 'dark';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Ground the button sits on. Affects secondary/ghost only — primary
   *  (the --cta token) and danger read identically on both grounds. */
  tone?: ButtonTone;
  loading?: boolean;
  icon?: React.ReactNode;
}

const VARIANT_CLASSES: Record<ButtonTone, Record<ButtonVariant, string>> = {
  light: {
    /* DESIGN ELEVATION E2: primary is the E1 --cta token (saffron-700,
       white text 4.63:1 AA) — the ONE primary fill app-wide. */
    primary:
      'bg-cta hover:bg-cta-hover active:bg-cta-hover text-white border border-transparent shadow-lg shadow-saffron-700/20 font-bold',
    secondary:
      'bg-white hover:bg-sanctum-sandal/60 active:bg-sanctum-sandal text-temple-900 border border-temple-200 hover:border-saffron-400 shadow-sm font-semibold',
    ghost:
      'bg-transparent hover:bg-temple-100/70 active:bg-temple-100 text-temple-700 hover:text-temple-950 border border-transparent font-semibold',
    danger:
      'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white border border-red-500 font-bold',
  },
  dark: {
    primary:
      'bg-cta hover:bg-cta-hover active:bg-cta-hover text-white border border-transparent shadow-lg shadow-saffron-700/20 font-bold',
    secondary:
      'bg-temple-800 hover:bg-temple-700 active:bg-temple-700 text-temple-100 border border-temple-700 font-semibold',
    ghost:
      'bg-transparent hover:bg-temple-800/80 active:bg-temple-800 text-temple-300 hover:text-temple-100 border border-transparent font-semibold',
    danger:
      'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white border border-red-500 font-bold',
  },
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  /* sm is the DENSE class only: desk table rows, desk toolbars and slim
     shell bars — never a screen's primary action or a form submit
     (taste rule 14's sanctioned exception, DE-16). md/lg always meet
     the 44px touch-target rule. */
  sm: 'min-h-[36px] px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'min-h-[44px] px-4 py-2 text-sm rounded-xl gap-2',
  lg: 'min-h-[48px] px-6 py-2.5 text-base rounded-xl gap-2',
};

/**
 * The one button (Design Elevation E2 — DE-04). Temple-themed, always
 * keyboard-focusable with a visible saffron ring. Use `loading` for
 * async actions instead of disabling without feedback — the spinner
 * lives inside the button (taste rule 12), never as a page spinner.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', tone = 'light', loading = false, icon, children, className = '', disabled, type = 'button', ...rest }, ref) => {
    const isDisabled = disabled || loading;
    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={[
          'inline-flex items-center justify-center transition-all select-none cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 focus-visible:ring-offset-2',
          tone === 'dark' ? 'focus-visible:ring-offset-temple-900' : 'focus-visible:ring-offset-white',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
          VARIANT_CLASSES[tone][variant],
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
