import React from 'react';

/**
 * AuthField — floating-label input for the light sanctum auth card (E4).
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
  const box = `peer auth-ring w-full bg-white/85 border rounded-2xl text-temple-950 text-[15px] font-medium placeholder:text-transparent outline-none transition-colors focus:bg-white ${error ? 'border-red-400' : 'border-temple-200'}`;
  const padIcon = icon ? 'pl-11' : 'pl-4';
  const padRight = rightSlot ? 'pr-11' : 'pr-4';

  return (
    <div className={`${shell} ${className}`}>
      <div className="relative">
        {icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-temple-400 pointer-events-none transition-colors peer-focus:text-amber-700">
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
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-temple-500 hover:text-amber-800 transition-colors">
            {rightSlot}
          </span>
        )}
        <label htmlFor={fieldId} className="auth-label">{label}</label>
      </div>
      {error && (
        <p className="text-[12px] font-semibold text-red-700 mt-1.5 ml-1">{error}</p>
      )}
    </div>
  );
};
