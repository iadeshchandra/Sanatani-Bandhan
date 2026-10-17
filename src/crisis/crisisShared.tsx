/**
 * Crisis Command — shared UI bits (icons, severity styles, relative time).
 * Imported by CrisisMap, TriageView and CrisisDetailDrawer.
 */
import React from 'react';
import {
  HeartPulse, Flame, ShieldAlert, Users, AlertTriangle, HelpCircle,
} from 'lucide-react';
import type { CrisisSituation } from './crisisCommandTypes';

export const SITUATION_ICON: Record<CrisisSituation, React.ReactNode> = {
  medical: <HeartPulse size={22} />,
  fire: <Flame size={22} />,
  robbery: <ShieldAlert size={22} />,
  crowd: <Users size={22} />,
  disaster: <AlertTriangle size={22} />,
  other: <HelpCircle size={22} />,
};

export const SEVERITY_STYLE: Record<string, string> = {
  critical: 'bg-red-600 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-amber-400 text-amber-950',
};

export function relTime(ts: number, t: (k: string) => string): string {
  if (!ts) return '';
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return t('misc.justNow');
  if (mins < 60) return `${mins} ${t('misc.minAgo')}`;
  return `${Math.floor(mins / 60)} ${t('misc.hrAgo')}`;
}
