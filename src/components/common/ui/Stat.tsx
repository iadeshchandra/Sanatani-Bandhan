import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from './Card';

export type StatTone = 'default' | 'saffron' | 'success' | 'warning' | 'danger' | 'info';

const TONE_VALUE: Record<StatTone, string> = {
  default: 'text-temple-100',
  saffron: 'text-saffron-400',
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  danger: 'text-red-400',
  info: 'text-sky-400',
};

interface StatProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: StatTone;
  trend?: 'up' | 'down' | 'flat';
  trendLabel?: string;
}

/**
 * KPI card. `value` should already be formatted (use formatINR etc.).
 * Keep labels short; put units in `sub`, never in the value.
 */
export const Stat: React.FC<StatProps> = ({
  label,
  value,
  sub,
  icon,
  tone = 'default',
  trend,
  trendLabel,
}) => (
  <Card padding="md" className="flex flex-col gap-1">
    <div className="flex items-center justify-between gap-2">
      <p className="text-[11px] text-temple-400 font-bold uppercase tracking-wider truncate">{label}</p>
      {icon && (
        <span className="text-saffron-400 shrink-0" aria-hidden="true">
          {icon}
        </span>
      )}
    </div>
    <p className={`text-2xl sm:text-[28px] font-black leading-tight ${TONE_VALUE[tone]}`}>{value}</p>
    {(sub || trend) && (
      <div className="flex items-center gap-1.5 text-[11px] text-temple-400">
        {trend === 'up' && <TrendingUp className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />}
        {trend === 'down' && <TrendingDown className="w-3.5 h-3.5 text-red-400" aria-hidden="true" />}
        {trend === 'flat' && <Minus className="w-3.5 h-3.5 text-temple-500" aria-hidden="true" />}
        {trendLabel && <span className="font-semibold">{trendLabel}</span>}
        {sub && <span className="truncate">{sub}</span>}
      </div>
    )}
  </Card>
);
