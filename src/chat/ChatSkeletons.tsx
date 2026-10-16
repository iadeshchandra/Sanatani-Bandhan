/**
 * ChatSkeletons.tsx — warm shimmer loading placeholders for chat + P2P.
 * ======================================================================
 * Every block mirrors its real component's footprint so layout never
 * jumps when data arrives. Uses the app's `anim-skeleton` shimmer
 * (src/styles/motion.css) in saffron/stone tones.
 */
import React from 'react';

const BAR = 'anim-skeleton bg-stone-200 rounded-full';
const CARD = 'anim-skeleton bg-stone-200 rounded-2xl';
const CARD_AMBER = 'anim-skeleton bg-amber-200/70 rounded-2xl';

export const ThreadListSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="divide-y divide-stone-100" aria-hidden="true" aria-label="Loading">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="w-full flex items-center gap-3 px-4 py-3 min-h-[72px]">
        <div className="anim-skeleton w-12 h-12 rounded-full bg-stone-200 shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className={`${BAR} h-3.5 w-2/5`} />
          <div className={`${BAR} h-3 w-3/5 opacity-70`} />
        </div>
        <div className="space-y-2 shrink-0 flex flex-col items-end">
          <div className={`${BAR} h-2.5 w-10`} />
          <div className="anim-skeleton w-[22px] h-[22px] rounded-full bg-amber-200" />
        </div>
      </div>
    ))}
  </div>
);

export const MessageListSkeleton: React.FC = () => (
  <div className="px-3 py-4 space-y-3" aria-hidden="true" aria-label="Loading">
    <div className="flex justify-center">
      <div className={`${BAR} h-5 w-24`} />
    </div>
    <div className="flex justify-start">
      <div className={`${CARD} h-14 w-3/5`} />
    </div>
    <div className="flex justify-end">
      <div className={`${CARD_AMBER} h-11 w-1/2`} />
    </div>
    <div className="flex justify-start">
      <div className={`${CARD} h-20 w-2/3`} />
    </div>
    <div className="flex justify-end">
      <div className={`${CARD_AMBER} h-11 w-2/5`} />
    </div>
  </div>
);

export const WalletEntriesSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <div className="space-y-3" aria-hidden="true" aria-label="Loading">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="rounded-2xl bg-white border border-stone-200 p-3 flex gap-3 items-start">
        <div className="anim-skeleton w-11 h-11 rounded-full bg-stone-200 shrink-0" />
        <div className="flex-1 min-w-0 space-y-2 pt-1">
          <div className={`${BAR} h-3.5 w-1/2`} />
          <div className={`${BAR} h-3 w-1/3 opacity-70`} />
        </div>
        <div className={`${BAR} h-5 w-20 shrink-0 mt-1`} />
      </div>
    ))}
  </div>
);

export const LedgerRowsSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="space-y-2" aria-hidden="true" aria-label="Loading">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="rounded-2xl bg-white border border-stone-200 p-3 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0 space-y-2">
          <div className={`${BAR} h-3.5 w-2/5`} />
          <div className={`${BAR} h-3 w-3/5 opacity-70`} />
        </div>
        <div className={`${BAR} h-5 w-24 shrink-0`} />
      </div>
    ))}
  </div>
);
