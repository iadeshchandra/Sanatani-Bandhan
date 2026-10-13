import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, GitBranch, LayoutGrid, Check } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';

/**
 * BranchSwitcher — multi-branch location picker.
 *
 * INVISIBILITY CONTRACT: renders NOTHING unless the workspace has 2+
 * branches AND the viewer holds a Trustee/Manager-level role. A
 * single-organisation user must never see the word "branch" anywhere.
 */
export const BranchSwitcher: React.FC = () => {
  const {
    branches,
    isMultiBranch,
    activeBranchId,
    setActiveBranchId,
    mainBranchId,
  } = useData();
  const { checkPermission } = useAuthWorkspace();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open ]);

  // Hard invisibility: single-org workspaces and non-privileged roles.
  if (!isMultiBranch) return null;
  if (!checkPermission(['SuperAdmin', 'Trustee'])) return null;

  const activeBranch =
    activeBranchId === 'ALL'
      ? null
      : branches.find((b) => b.id === activeBranchId) || null;
  const mainBranch = branches.find((b) => b.id === mainBranchId);

  const label = activeBranch ? activeBranch.name : 'All branches';

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-colors cursor-pointer"
        title={activeBranch ? `Viewing: ${activeBranch.name}` : 'Viewing all branches (consolidated)'}
      >
        {activeBranch ? (
          <GitBranch className="w-3.5 h-3.5 text-saffron-400" aria-hidden="true" />
        ) : (
          <LayoutGrid className="w-3.5 h-3.5 text-saffron-400" aria-hidden="true" />
        )}
        <span className="max-w-[110px] truncate">{label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-temple-400 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 mt-2 w-64 rounded-2xl bg-[#1c1410] border border-white/10 shadow-2xl shadow-black/50 overflow-hidden z-50"
        >
          <button
            type="button"
            role="option"
            aria-selected={activeBranchId === 'ALL'}
            onClick={() => {
              setActiveBranchId('ALL');
              setOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-white/5 transition-colors cursor-pointer ${
              activeBranchId === 'ALL' ? 'bg-saffron-500/10' : ''
            }`}
          >
            <LayoutGrid className="w-4 h-4 text-saffron-400 shrink-0" aria-hidden="true" />
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-white">All branches</span>
              <span className="block text-[11px] text-temple-400 truncate">
                Consolidated view
                {mainBranch ? ` · new records go to ${mainBranch.name}` : ''}
              </span>
            </span>
            {activeBranchId === 'ALL' && (
              <Check className="w-4 h-4 text-saffron-400 shrink-0" aria-hidden="true" />
            )}
          </button>

          <div className="h-px bg-white/10" />

          {branches.map((b) => {
            const selected = activeBranchId === b.id;
            return (
              <button
                key={b.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  setActiveBranchId(b.id);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-white/5 transition-colors cursor-pointer ${
                  selected ? 'bg-saffron-500/10' : ''
                }`}
              >
                <GitBranch className="w-4 h-4 text-saffron-400 shrink-0" aria-hidden="true" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-white truncate">
                    {b.name}
                    {b.isMain && (
                      <span className="ml-1.5 text-[10px] font-black uppercase tracking-wider text-saffron-400">
                        Main
                      </span>
                    )}
                  </span>
                  {b.city && (
                    <span className="block text-[11px] text-temple-400 truncate">{b.city}</span>
                  )}
                </span>
                {selected && (
                  <Check className="w-4 h-4 text-saffron-400 shrink-0" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BranchSwitcher;
