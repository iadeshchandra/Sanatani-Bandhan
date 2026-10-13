import React from 'react';
import { Landmark, ArrowLeft, Blocks, HeartHandshake } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { ORG_RESTRICTED_GUIDANCE, resolveOrgModuleId } from '../../lib/workspaceRegistry';

interface OrgTypeRestrictedDeskProps {
  moduleId: string;
  onBack: () => void;
  onOpenAppStore: () => void;
}

/**
 * R-1 — Org-type relevance guard's empty state.
 *
 * Rendered at desk mount (App.tsx renderActiveDesk) when a desk is not part
 * of the active workspace's organisation type — e.g. opening Sanatani Vivah
 * inside a Gurukul workspace, or reaching a desk via deep link / Cmd+K /
 * navigate_module that the sidebar would never show for this org type.
 *
 * Tone is respectful, never scolding: the desk isn't "forbidden", it simply
 * doesn't belong to this kind of organisation. Where a natural home exists,
 * we say where to find it; otherwise we offer the App Store opt-in (a
 * Trustee can enable any non-native module via enabledModules, which also
 * unblocks this guard).
 */
export const OrgTypeRestrictedDesk: React.FC<OrgTypeRestrictedDeskProps> = ({
  moduleId,
  onBack,
  onOpenAppStore,
}) => {
  const { activeWorkspace, checkPermission } = useAuthWorkspace();
  const canonical = resolveOrgModuleId(moduleId);
  const guidance = ORG_RESTRICTED_GUIDANCE[canonical];
  const orgLabel = (activeWorkspace as { type?: string } | null)?.type || 'this organisation';
  const orgName = (activeWorkspace as { name?: string } | null)?.name || '';
  const canInstall = checkPermission(['TRUSTEE', 'SuperAdmin', 'MANAGER']);

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in fade-in duration-200">
      <div className="max-w-lg w-full bg-gradient-to-b from-amber-50 to-orange-50/60 border border-amber-200/70 rounded-3xl px-8 py-10 shadow-sm relative overflow-hidden">
        {/* CSS-only diya glow motif */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)' }}
        />
        <div className="relative">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-700 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Landmark className="w-8 h-8 text-amber-50" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700 mb-2">
            ॥ धर्मो रक्षति रक्षितः ॥
          </p>
          <h2 className="text-xl font-serif font-bold text-stone-800 mb-2">
            Not part of the {orgLabel} workspace
          </h2>
          <p className="text-sm text-stone-600 leading-relaxed max-w-md mx-auto">
            This desk isn't included in the {orgName ? <strong>{orgName}</strong> : 'current'}{' '}
            workspace because it belongs to a different kind of organisation. Nothing is
            broken — the desk simply doesn't apply here.
          </p>
          {guidance && (
            <div className="mt-4 flex items-start gap-2.5 text-left bg-white/70 border border-amber-200/60 rounded-2xl px-4 py-3">
              <HeartHandshake className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-stone-600 leading-relaxed">{guidance}</p>
            </div>
          )}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-bold transition-colors cursor-pointer min-h-[44px]"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Command Center
            </button>
            {canInstall && (
              <button
                type="button"
                onClick={onOpenAppStore}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-sm font-bold transition-colors cursor-pointer min-h-[44px]"
              >
                <Blocks className="w-4 h-4" />
                Enable via App Store
              </button>
            )}
          </div>
          {canInstall && (
            <p className="mt-3 text-[11px] text-stone-500">
              Trustees can install any desk from the App Store if this organisation truly needs it.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrgTypeRestrictedDesk;
