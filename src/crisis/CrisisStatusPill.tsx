/**
 * CrisisStatusPill.tsx — warm, consistent SOS status pill.
 * =========================================================
 * Used across SOSTimeline, CrisisDashboard, TriageView, PersonalHistory,
 * OrgHistory. Active = warm amber glow (held, present), never red-alarming.
 */
import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { CRISIS_STATUS_META, normalizeCrisisStatus } from './crisisTheme';

export const CrisisStatusPill: React.FC<{
  status: string;
  size?: 'sm' | 'md';
  className?: string;
}> = ({ status, size = 'md', className = '' }) => {
  const { currentLang } = useLanguage();
  const lang = currentLang === 'bn' ? 'bn' : currentLang === 'hi' ? 'hi' : 'en';
  const meta = CRISIS_STATUS_META[normalizeCrisisStatus(status)];
  const label = meta.label[lang];

  return (
    <span
      role="status"
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-bold ${meta.pillClass} ${
        size === 'sm' ? 'text-[11px]' : 'text-xs'
      } ${className}`}
    >
      <span className={`w-2 h-2 rounded-full ${meta.dotClass}`} aria-hidden />
      {label}
    </span>
  );
};

export default CrisisStatusPill;
