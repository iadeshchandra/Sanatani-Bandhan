/**
 * BecomePurohitEntry — the "Become a Purohit" / mode-switcher card for the
 * devotee account area (MySpaceModal).
 * =====================================================================
 * Self-contained: wraps itself in PurohitProvider so it works in org
 * context. Shows:
 *  - no identity → "Become a Purohit" CTA opening the upgrade modal;
 *  - identity exists → PUR-ID + tier badge + "Open Purohit Workspace"
 *    mode switcher (enterPurohitSession, not a second login).
 */
import React, { useState } from 'react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { PurohitProvider } from '../../context/PurohitContext';
import { VerificationBadge } from '../common/VerificationBadge';
import { BecomePurohitModal } from './BecomePurohitModal';
import { useMyPurohitIdentity } from './useMyPurohitIdentity';

const InnerEntry: React.FC = () => {
  const { enterPurohitSession } = useAuthWorkspace();
  const { identity, loading, refresh } = useMyPurohitIdentity();
  const [modalOpen, setModalOpen] = useState(false);

  const openWorkspace = () => {
    // Mode switcher: the same login, just a different session kind.
    if (identity) enterPurohitSession(identity);
  };

  return (
    <>
      <div className="bg-white rounded-3xl shadow-sm border border-temple-100 p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
          <span className="text-[10rem] leading-none">🪔</span>
        </div>
        <h3 className="text-sm font-black text-temple-900 uppercase tracking-widest mb-4 flex items-center gap-2">
          🪔 Purohit Identity
        </h3>
        {loading ? (
          <p className="text-xs text-temple-400">Checking…</p>
        ) : identity ? (
          <div className="relative z-10">
            <div className="flex items-center gap-3 flex-wrap mb-3">
              <p className="font-mono text-sm font-black text-temple-900">{identity.id}</p>
              <VerificationBadge tier={identity.verificationTier} />
            </div>
            <p className="text-xs text-temple-500 mb-4">
              {identity.displayName} · {identity.city} · {identity.completedGigs} rituals · ★{' '}
              {identity.ratingAggregate.toFixed(1)}
            </p>
            <button
              type="button"
              onClick={openWorkspace}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 text-white text-sm font-black min-h-[44px] shadow-md hover:shadow-lg transition-all"
            >
              Open Purohit Workspace →
            </button>
            <p className="text-[11px] text-temple-400 mt-2">
              Switches to your personal purohit workspace. Your devotee view stays as is.
            </p>
          </div>
        ) : (
          <div className="relative z-10">
            <p className="text-sm text-temple-600 mb-4 leading-relaxed">
              Serve as an independent purohit — get verified through the transparent tier system
              and receive ritual gigs directly from devotees. Your devotee identity stays untouched.
            </p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 text-white text-sm font-black min-h-[44px] shadow-md hover:shadow-lg transition-all"
            >
              Become a Purohit
            </button>
          </div>
        )}
      </div>
      <BecomePurohitModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          refresh();
        }}
      />
    </>
  );
};

export const BecomePurohitEntry: React.FC = () => (
  <PurohitProvider>
    <InnerEntry />
  </PurohitProvider>
);
