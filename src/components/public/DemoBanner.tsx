import React from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useData } from '../../context/DataContext';

interface DemoBannerProps {
  onRegister: () => void;
}

/**
 * Slim demo-mode bar pinned below the app header (replaces the old
 * "TESTING MODE" watermark). Shows live creation stats, a reset action,
 * and the registration CTA. Only renders inside demo workspaces.
 */
export const DemoBanner: React.FC<DemoBannerProps> = ({ onRegister }) => {
  const { activeWorkspace } = useAuthWorkspace();
  const { getDemoStats, resetDemoWorkspace } = useData();

  if (!activeWorkspace?.id?.startsWith('DEMO_')) return null;

  const { totalCreates } = getDemoStats();

  const handleReset = () => {
    if (
      window.confirm(
        'Reset the demo workspace? Your created records will be removed and fresh sample data will be loaded.'
      )
    ) {
      resetDemoWorkspace();
    }
  };

  return (
    <div
      className="shrink-0 z-30 bg-[#FFF8EC] border-b border-orange-200 px-3 sm:px-5 py-2 flex items-center justify-between gap-3"
      role="status"
      aria-label="Demo sandbox status"
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-base leading-none shrink-0" aria-hidden="true">🎪</span>
        <span className="text-xs sm:text-sm font-extrabold text-stone-800 tracking-wide truncate">
          Demo Sandbox
        </span>
        <span className="hidden sm:inline text-xs text-stone-500 font-medium truncate shrink-0">
          {totalCreates} record{totalCreates === 1 ? '' : 's'} created
          <span className="text-stone-400"> · auto-deletes in 24h</span>
        </span>
        <span className="sm:hidden text-[11px] text-stone-500 font-medium whitespace-nowrap shrink-0">
          {totalCreates} created
        </span>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          type="button"
          onClick={handleReset}
          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-1.5 px-3 rounded-xl text-xs font-bold text-stone-500 hover:text-stone-800 hover:bg-orange-100 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Reset demo</span>
          <span className="sm:hidden">Reset</span>
        </button>
        <button
          type="button"
          onClick={onRegister}
          className="min-h-[44px] inline-flex items-center gap-1.5 px-3 sm:px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white text-xs font-extrabold tracking-wide shadow-md shadow-orange-500/25 transition-all active:scale-[0.97] cursor-pointer pressable whitespace-nowrap"
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span className="hidden min-[400px]:inline">Create Free Account</span>
          <span className="min-[400px]:hidden">Join Free</span>
        </button>
      </div>
    </div>
  );
};

export default DemoBanner;
