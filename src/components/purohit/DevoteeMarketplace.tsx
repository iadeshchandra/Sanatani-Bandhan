/**
 * DevoteeMarketplace — the devotee-facing marketplace hub.
 * =====================================================================
 * Mounted inside PurohitPortalUnified's DEVOTEE_SPACE. Sub-tabs:
 *  Find a Purohit · Post Requirement · My Requirements · My Account.
 * Self-contained in a PurohitProvider (works in org context).
 */
import React, { useState } from 'react';
import { PurohitProvider } from '../../context/PurohitContext';
import { FindPurohit } from './FindPurohit';
import { PostRequirement } from './PostRequirement';
import { MyRequirements } from './MyRequirements';

type MarketTab = 'find' | 'post' | 'mine';

const InnerMarketplace: React.FC<{ accountSlot?: React.ReactNode }> = ({ accountSlot }) => {
  const [tab, setTab] = useState<MarketTab | 'account'>('find');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(
          [
            { id: 'find', label: '🔍 Find a Purohit' },
            { id: 'post', label: '📝 Post Requirement' },
            { id: 'mine', label: '📋 My Requirements' },
            ...(accountSlot ? [{ id: 'account', label: '👤 My Account' }] : []),
          ] as { id: MarketTab | 'account'; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all min-h-[44px] ${
              tab === t.id
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md'
                : 'bg-white text-stone-600 border border-stone-200 hover:border-amber-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'find' && <FindPurohit />}
      {tab === 'post' && (
        <PostRequirement
          onPosted={() => setTab('mine')}
        />
      )}
      {tab === 'mine' && <MyRequirements />}
      {tab === 'account' && accountSlot}
    </div>
  );
};

export const DevoteeMarketplace: React.FC<{ accountSlot?: React.ReactNode }> = ({ accountSlot }) => (
  <PurohitProvider>
    <InnerMarketplace accountSlot={accountSlot} />
  </PurohitProvider>
);
