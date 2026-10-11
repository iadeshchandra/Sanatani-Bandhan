import React from 'react';

/**
 * DeskSkeletons — Temple-theme shimmering loading placeholders used across desks
 * while data is being fetched. Each block mirrors the real component's footprint
 * so layout does not jump once content arrives.
 */

export const KpiCardSkeleton: React.FC = () => (
  <div
    className="bg-temple-900/90 border border-temple-800 rounded-2xl p-5 space-y-3"
    aria-hidden="true"
  >
    <div className="h-3 w-28 bg-temple-800 animate-pulse rounded" />
    <div className="h-8 w-40 bg-temple-800 animate-pulse rounded-xl" />
    <div className="h-3 w-48 bg-temple-800/70 animate-pulse rounded" />
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 8 }) => (
  <div
    className="bg-temple-900/90 border border-temple-800 rounded-3xl shadow-xl overflow-hidden"
    aria-hidden="true"
  >
    <div className="h-12 bg-temple-950/90 border-b border-temple-800 animate-pulse" />
    <div className="divide-y divide-temple-800/60">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5">
          <div className="h-4 w-20 bg-temple-800 animate-pulse rounded" />
          <div className="h-4 w-28 bg-temple-800 animate-pulse rounded" />
          <div className="h-5 w-16 bg-temple-800 animate-pulse rounded-full shrink-0" />
          <div className="h-4 w-44 bg-temple-800 animate-pulse rounded hidden md:block" />
          <div className="h-4 w-24 bg-temple-800 animate-pulse rounded ml-auto" />
        </div>
      ))}
    </div>
  </div>
);

export const GridSkeleton: React.FC<{ cards?: number }> = ({ cards = 6 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" aria-hidden="true">
    {Array.from({ length: cards }).map((_, i) => (
      <div
        key={i}
        className="bg-temple-900/90 border border-temple-800 rounded-2xl p-5 space-y-3"
      >
        <div className="h-5 w-32 bg-temple-800 animate-pulse rounded" />
        <div className="h-4 w-full bg-temple-800/70 animate-pulse rounded" />
        <div className="h-4 w-2/3 bg-temple-800/70 animate-pulse rounded" />
        <div className="h-10 w-full bg-temple-800 animate-pulse rounded-xl" />
      </div>
    ))}
  </div>
);

export const ChartSkeleton: React.FC = () => (
  <div
    className="bg-temple-900/90 border border-temple-800 rounded-2xl p-5 space-y-4"
    aria-hidden="true"
  >
    <div className="h-5 w-52 bg-temple-800 animate-pulse rounded" />
    <div className="h-56 bg-temple-800/60 animate-pulse rounded-xl" />
  </div>
);
