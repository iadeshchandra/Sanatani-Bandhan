/**
 * darshan/LiveBadge.tsx — the pulsing 🔴 Live Darshan badge.
 * Shown on org cards, org pages, and the home feed when a temple is live.
 */
import React from 'react';
import { dt, type Lang } from './i18n';

interface Props {
  lang?: Lang;
  onClick?: () => void;
  size?: 'sm' | 'md';
}

export const LiveBadge: React.FC<Props> = ({ lang = 'en', onClick, size = 'md' }) => {
  const cls =
    size === 'sm'
      ? 'text-[11px] px-2 py-1 gap-1'
      : 'text-xs px-2.5 py-1.5 gap-1.5';
  const inner = (
    <span
      className={`inline-flex items-center ${cls} rounded-full bg-red-600 text-white font-extrabold whitespace-nowrap shadow-md`}
      role="status"
      aria-label={dt('darshan.live', lang)}
    >
      <span className="relative flex h-2 w-2" aria-hidden>
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
      </span>
      {dt('darshan.live', lang)}
    </span>
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="min-h-[44px] min-w-[44px] inline-flex items-center"
        aria-label={dt('darshan.live', lang)}
      >
        {inner}
      </button>
    );
  }
  return inner;
};
