/**
 * App Growth admin shared UI primitives.
 * Follows the AdminTabsJ convention (Card / Empty / Loading) so every
 * growth sub-tab reads like a native part of GodMode Console 3.0.
 */
import React from 'react';

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`rounded-2xl bg-slate-950/70 border border-slate-800 p-4 ${className}`}>{children}</div>
);

export const Empty: React.FC<{ text: string }> = ({ text }) => (
  <p className="text-xs text-slate-500 py-6 text-center">{text}</p>
);

export const Loading: React.FC<{ text?: string }> = ({ text = 'Loading…' }) => (
  <p className="text-xs text-slate-500 py-8 text-center animate-pulse">{text}</p>
);

export const SectionTitle: React.FC<{ children: React.ReactNode; hint?: string }> = ({ children, hint }) => (
  <div className="mb-3">
    <h3 className="text-sm font-bold text-white">{children}</h3>
    {hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
  </div>
);

export const Field: React.FC<{ label: string; children: React.ReactNode; hint?: string }> = ({ label, children, hint }) => (
  <label className="block">
    <span className="text-xs font-semibold text-slate-300">{label}</span>
    <div className="mt-1">{children}</div>
    {hint && <span className="block text-[11px] text-slate-500 mt-1">{hint}</span>}
  </label>
);

export const inputCls =
  'w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 min-h-[44px] text-sm text-slate-100 placeholder:text-slate-600 focus:ring-2 focus:ring-saffron-500 focus:border-saffron-500 outline-none disabled:opacity-50';

export const btnPrimary =
  'inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] rounded-xl bg-gradient-to-r from-saffron-500 to-saffron-600 text-slate-950 font-bold text-sm hover:brightness-110 disabled:opacity-50';

export const btnGhost =
  'inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] rounded-xl border border-slate-700 text-slate-200 text-sm font-semibold hover:border-saffron-500/60 hover:text-saffron-300 disabled:opacity-50';
