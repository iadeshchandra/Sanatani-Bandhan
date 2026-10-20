import React from 'react';
import { ShieldAlert, LayoutDashboard } from 'lucide-react';

/**
 * DeskOrgMismatchNotice — QUEUED #48 (live-audit fix, 2026-10-20).
 *
 * Defense-in-depth inside shared desk components: if a component is ever
 * mounted for an organisation type it was not built for (the App.tsx
 * mount guard normally stops this first), it renders this honest notice
 * instead of another organisation's desk. Showing the WRONG desk under
 * the org's own breadcrumb is the failure this prevents.
 */
export const DeskOrgMismatchNotice: React.FC<{
  deskLabel: string;
  orgType?: string | null;
}> = ({ deskLabel, orgType }) => (
  <div className="flex flex-col items-center justify-center text-center p-10 space-y-4">
    <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
      <ShieldAlert className="w-8 h-8" />
    </div>
    <h2 className="text-xl font-bold text-slate-800">
      This desk doesn&apos;t belong to {orgType ? `a ${orgType}` : 'this'} workspace
    </h2>
    <p className="text-sm text-slate-500 max-w-md">
      {deskLabel} is built for a different kind of organisation, so it isn&apos;t
      shown here. Your workspace&apos;s own desks are in the sidebar and the
      command palette (Ctrl/⌘ + K).
    </p>
    <button
      type="button"
      onClick={() =>
        window.dispatchEvent(new CustomEvent('navigate_module', { detail: 'dashboard' }))
      }
      className="px-4 py-2 rounded-xl bg-saffron-600 hover:bg-saffron-500 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
    >
      <LayoutDashboard className="w-4 h-4" />
      <span>Back to Command Center</span>
    </button>
  </div>
);

export default DeskOrgMismatchNotice;
