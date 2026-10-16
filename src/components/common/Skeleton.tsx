import React from 'react';

/**
 * Skeleton — reusable shimmer loading placeholders (Pillar 5).
 * =====================================================================
 * Replaces blank screens and raw spinners on the most common loading
 * paths: the Sangam/Suchana feed, the org-space shell, and the profile.
 * Each skeleton mirrors its real layout's footprint so nothing jumps
 * when content arrives (zero layout shift).
 *
 * Uses the shared `.anim-skeleton` shimmer from src/styles/motion.css —
 * transform-based, GPU-only, and killed under prefers-reduced-motion.
 * (Desk-level KPI/table/grid/chart skeletons already live in
 * DeskSkeletons.tsx; these cover the shell-level paths it doesn't.)
 */

interface SkeletonProps {
  className?: string;
  /** Accessible label for the loading region. */
  label?: string;
}

/** The primitive: a shimmering block. */
export const Skeleton: React.FC<SkeletonProps> = ({ className = '', label }) => (
  <div
    className={`anim-skeleton bg-temple-800/60 rounded-xl ${className}`}
    aria-hidden={label ? undefined : true}
    aria-label={label}
    role={label ? 'status' : undefined}
  />
);

/** Feed skeleton — Sangam / Suchana post list while it loads. */
export const FeedSkeleton: React.FC<{ posts?: number }> = ({ posts = 3 }) => (
  <div className="space-y-4 max-w-xl mx-auto w-full" aria-hidden="true">
    {Array.from({ length: posts }).map((_, i) => (
      <div
        key={i}
        className="bg-white rounded-xl border border-temple-200/90 shadow-xs overflow-hidden p-4 space-y-3"
      >
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 !rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-2.5 w-20 opacity-70" />
          </div>
        </div>
        <Skeleton className="h-3.5 w-full opacity-80" />
        <Skeleton className="h-3.5 w-4/5 opacity-80" />
        <Skeleton className="h-40 w-full !rounded-lg opacity-60" />
        <div className="flex gap-4 pt-1">
          <Skeleton className="h-8 w-20 !rounded-full" />
          <Skeleton className="h-8 w-20 !rounded-full" />
          <Skeleton className="h-8 w-20 !rounded-full" />
        </div>
      </div>
    ))}
  </div>
);

/** Org-space skeleton — while the org shell resolves workspace + role. */
export const OrgSpaceSkeleton: React.FC = () => (
  <div className="h-screen w-full flex flex-col bg-slate-50" aria-hidden="true">
    <div className="shrink-0 bg-temple-950 px-4 py-3 flex items-center gap-3">
      <Skeleton className="w-11 h-11 !rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-2.5 w-64 opacity-60" />
      </div>
      <Skeleton className="h-8 w-24 !rounded-full" />
    </div>
    <div className="flex-1 p-4 sm:p-6 max-w-6xl mx-auto w-full space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-24" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-full opacity-70" />
        <Skeleton className="h-4 w-5/6 opacity-70" />
        <Skeleton className="h-4 w-4/6 opacity-70" />
      </div>
    </div>
  </div>
);

/** Profile skeleton — the Sanatani ID card + detail rows while loading. */
export const ProfileSkeleton: React.FC = () => (
  <div className="space-y-4" aria-hidden="true">
    <div className="rounded-3xl bg-temple-950 p-6 space-y-3">
      <Skeleton className="h-3 w-40" />
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-5 w-32 opacity-70" />
    </div>
    <div className="bg-white rounded-2xl border border-amber-100 p-4 sm:p-5 space-y-3">
      <Skeleton className="h-5 w-36" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between rounded-xl bg-stone-50 border border-stone-100 px-3 py-2.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  </div>
);

export default Skeleton;
