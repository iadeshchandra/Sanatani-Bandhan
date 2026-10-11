import React, { useId } from 'react';

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (id: string, describedBy: string | undefined) => React.ReactNode;
}

const fieldInputClasses = (hasError: boolean) =>
  [
    'w-full min-h-[44px] bg-temple-800 border rounded-xl px-3.5 py-2.5 text-sm text-temple-100 placeholder-temple-500',
    'focus:outline-none focus:border-saffron-500 focus:ring-2 focus:ring-saffron-500/40 transition-all',
    hasError ? 'border-red-500' : 'border-temple-700',
  ].join(' ');

/**
 * Label + hint + error wiring shared by Input / Select / Textarea.
 */
export const Field: React.FC<FieldProps> = ({ label, hint, error, required, children }) => {
  const id = useId();
  const hintId = useId();
  const errorId = useId();
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-bold text-temple-300 uppercase tracking-wider">
        {label}
        {required && (
          <span className="text-red-400 ml-1" aria-hidden="true">*</span>
        )}
      </label>
      {children(id, describedBy)}
      {hint && !error && (
        <p id={hintId} className="text-[11px] text-temple-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-[11px] font-semibold text-red-400">
          {error}
        </p>
      )}
    </div>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, hint, error, required, id: _ignored, ...rest }) => (
  <Field label={label} hint={hint} error={error} required={required}>
    {(id, describedBy) => (
      <input
        id={id}
        aria-describedby={describedBy}
        aria-invalid={!!error}
        aria-required={required || undefined}
        className={fieldInputClasses(!!error)}
        {...rest}
      />
    )}
  </Field>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select: React.FC<SelectProps> = ({ label, hint, error, required, options, id: _ignored, ...rest }) => (
  <Field label={label} hint={hint} error={error} required={required}>
    {(id, describedBy) => (
      <select
        id={id}
        aria-describedby={describedBy}
        aria-invalid={!!error}
        aria-required={required || undefined}
        className={fieldInputClasses(!!error)}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-temple-800">
            {o.label}
          </option>
        ))}
      </select>
    )}
  </Field>
);

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, hint, error, required, id: _ignored, ...rest }) => (
  <Field label={label} hint={hint} error={error} required={required}>
    {(id, describedBy) => (
      <textarea
        id={id}
        aria-describedby={describedBy}
        aria-invalid={!!error}
        aria-required={required || undefined}
        rows={4}
        className={[fieldInputClasses(!!error), 'min-h-[88px] resize-y'].join(' ')}
        {...rest}
      />
    )}
  </Field>
);
