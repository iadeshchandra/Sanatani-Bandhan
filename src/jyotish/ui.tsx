/**
 * Jyotish One — small shared UI primitives.
 * (Mirrors the spirit of the purohit ui.tsx; kept minimal.)
 */
import React from 'react';
import { CONSULTATION_STATUS_META, ConsultationStatus } from '../types/jyotish';

export const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]';

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl border border-stone-200 shadow-sm p-4 sm:p-5 ${className}`}>{children}</div>
);

const STATUS_CLS: Record<string, string> = {
  amber: 'bg-amber-100 text-amber-800 border-amber-300',
  blue: 'bg-blue-100 text-blue-800 border-blue-300',
  indigo: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  emerald: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  green: 'bg-green-100 text-green-900 border-green-400',
  slate: 'bg-stone-100 text-stone-500 border-stone-300',
};

export const StatusPill: React.FC<{ status: ConsultationStatus }> = ({ status }) => {
  const meta = CONSULTATION_STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${STATUS_CLS[meta.color] || STATUS_CLS.slate}`}
      title={meta.label}
    >
      {meta.label}
    </span>
  );
};

export const Btn: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  className?: string;
}> = ({ children, onClick, type = 'button', variant = 'primary', disabled, className = '' }) => {
  const cls =
    variant === 'primary'
      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md'
      : variant === 'danger'
        ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
        : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-50';
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 min-h-[44px] ${cls} ${className}`}
    >
      {children}
    </button>
  );
};

export const Empty: React.FC<{ text: string }> = ({ text }) => (
  <div className="text-center py-8 text-sm text-stone-400">
    <div className="text-3xl mb-2">🪐</div>
    {text}
  </div>
);

export const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="font-extrabold text-stone-900 mb-3">{children}</h3>
);

export const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-1.5">{label}</span>
    {children}
  </label>
);
