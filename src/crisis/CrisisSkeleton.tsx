/**
 * CrisisSkeleton.tsx — warm loading skeletons for crisis surfaces.
 * ================================================================
 * No bare "Loading…" text: pulsing amber-tinted skeleton cards with
 * screen-reader labels. Use wherever an SOS feed, event list, contact
 * list or triage queue is fetching.
 */
import React from 'react';
import { T } from '../solo/ui';

export const CrisisSkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    role="status"
    aria-label="Loading"
    className={`rounded-3xl bg-[#FFFBEB] border border-amber-200/60 p-4 animate-pulse ${className}`}
  >
    <div className="flex items-center gap-3">
      <div className="w-11 h-11 rounded-full bg-amber-200/70 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 rounded-full bg-amber-200/70 w-2/3" />
        <div className="h-3 rounded-full bg-amber-100 w-1/2" />
      </div>
      <div className="w-20 h-7 rounded-full bg-amber-200/70 shrink-0" />
    </div>
    <div className="mt-3 h-2.5 rounded-full bg-amber-100 w-5/6" />
    <span className="sr-only">
      <T en="Loading…" bn="লোড হচ্ছে…" hi="लोड हो रहा है…" />
    </span>
  </div>
);

/** A stack of N skeleton cards — drop in for any crisis list. */
export const CrisisSkeletonList: React.FC<{ rows?: number; className?: string }> = ({
  rows = 3,
  className = '',
}) => (
  <div className={`space-y-3 ${className}`} aria-busy="true">
    {Array.from({ length: rows }).map((_, i) => (
      <CrisisSkeletonCard key={i} />
    ))}
  </div>
);

/** Skeleton for the triage map / dashboard stat row. */
export const CrisisSkeletonStats: React.FC = () => (
  <div className="grid grid-cols-3 gap-3" role="status" aria-label="Loading" aria-busy="true">
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className="rounded-2xl bg-[#FFFBEB] border border-amber-200/60 p-4 animate-pulse"
      >
        <div className="h-7 w-10 rounded-lg bg-amber-200/70 mx-auto" />
        <div className="mt-2 h-2.5 rounded-full bg-amber-100 w-3/4 mx-auto" />
      </div>
    ))}
    <span className="sr-only">
      <T en="Loading…" bn="লোড হচ্ছে…" hi="लोड हो रहा है…" />
    </span>
  </div>
);

export default CrisisSkeletonCard;
