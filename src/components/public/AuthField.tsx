import React from 'react';

/**
 * AuthField — floating-label input for the dark glass auth card.
 * Label floats up on focus / filled (pure CSS, :placeholder-shown).
 * Focus ring glows saffron. transform/opacity only.
 */
interface AuthFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
  rightSlot?: React.ReactNode;
  multiline?: boolean;
  rows?: number;
  error?: string;
}

export const AuthField: React.FC<AuthFieldProps> = ({
  label, icon, rightSlot, multiline, rows = 2, className = '', id, error, ...rest
}) => {
  const fieldId = id || `auth-field-${label.replace(/[^a-z0-9]/gi, '').toLowerCase()}`;
  const shell = 'auth-field relative';
  const box = `peer auth-ring w-full bg-white/[0.07] border rounded-2xl text-white text-[15px] font-medium placeholder:text-transparent outline-none transition-colors focus:bg-white/[0.10] ${error ? 'border-red-400/60' : 'border-white/15'}`;
  const padIcon = icon ? 'pl-11' : 'pl-4';
  const padRight = rightSlot ? 'pr-11' : 'pr-4';

  return (
    <div className={`${shell} ${className}`}>
      <div className="relative">
        {icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none transition-colors peer-focus:text-saffron-300">
            {icon}
          </span>
        )}
        {multiline ? (
          <textarea
            id={fieldId}
            rows={rows}
            placeholder=" "
            className={`${box} ${padIcon} ${padRight} py-4 pt-6 resize-none min-h-[76px]`}
            {...(rest as any)}
          />
        ) : (
          <input
            id={fieldId}
            placeholder=" "
            className={`${box} ${padIcon} ${padRight} py-4 pt-[1.65rem] pb-[0.6rem]`}
            {...rest}
          />
        )}
        {rightSlot && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-saffron-300 transition-colors">
            {rightSlot}
          </span>
        )}
        <label htmlFor={fieldId} className="auth-label">{label}</label>
      </div>
      {error && (
        <p className="text-[12px] font-semibold text-red-300 mt-1.5 ml-1">{error}</p>
      )}
    </div>
  );
};
