import React from 'react';
import { ShieldCheck, Heart } from 'lucide-react';
import { useAuthWorkspace } from '../../context/AuthWorkspaceContext';
import { useWorkspaceTaxonomy } from '../../hooks/useWorkspaceTaxonomy';
import { calculatePanchang, getPanchangTodayLine } from '../../utils/panchang';
import { ShlokaCard, RoleHomeSwitch } from './RoleHome';

interface DashboardHomeProps {
  onSelectModule?: (id: string) => void;
  onNavigate?: (id: string) => void;
  onOpenQuickPay: () => void;
  onOpenMySpace?: () => void;
}

/**
 * DashboardHome — the sacred home.
 *
 * The top banner (workspace identity + live Panjika) and the Daily Vedic
 * Wisdom shloka are the soul of the app: identical for every role.
 * Below them, RoleHomeSwitch renders each role's 3-action work surface
 * (Priest / Accountant / Trustee / Sevadar); every other role falls back
 * to the full dashboard body.
 */
export const DashboardHome: React.FC<DashboardHomeProps> = ({
  onSelectModule,
  onNavigate,
  onOpenQuickPay,
  onOpenMySpace,
}) => {
  const handleNav = (mod: string) => {
    if (onNavigate) onNavigate(mod);
    else if (onSelectModule) onSelectModule(mod);
  };
  const { activeWorkspace, currentDevotee } = useAuthWorkspace();
  const taxonomy = useWorkspaceTaxonomy();
  const panchang = calculatePanchang();

  return (
    <div className="space-y-6 animate-in fade-in duration-200 flex flex-col">
      {/* Sacred header — identical for every role */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm shrink-0 relative overflow-hidden anim-fade-up">
        <div className="relative z-10 flex flex-col gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                {taxonomy.workspaceLabel} • {activeWorkspace.sampradaya || 'Sanatan Vaidika Tradition'}
              </span>
            </div>
            <h2 className="text-2xl font-serif font-semibold text-slate-800 tracking-tight">
              {activeWorkspace.name}
            </h2>
          </div>

          {/* Reputation Scores */}
          <div className="flex gap-4 items-center">
            <div className="bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-lg flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Org Resilience Score</p>
                <p className="text-sm font-black text-slate-900">850 <span className="text-slate-400 font-medium text-xs">/1000</span></p>
              </div>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 px-3 py-2 rounded-lg flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700">
                <Heart className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600">Your Seva Karma</p>
                <p className="text-sm font-black text-slate-900">{currentDevotee?.sevaIndex?.toLocaleString() || 1245} <span className="text-slate-400 font-medium text-xs">pts</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Panjika Card — canonical today line via getPanchangTodayLine (single source of truth) */}
        <div
          className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs flex flex-col sm:items-end relative z-10 anim-fade-up"
          style={{ '--i': 1 } as React.CSSProperties}
        >
          <p className="font-bold text-slate-700">
            {getPanchangTodayLine(panchang)}
          </p>
          <p className="text-slate-500 mt-0.5">
            {panchang.nakshatra} Nakshatra
          </p>
          <p className="text-slate-400 mt-1 font-mono text-[10px] uppercase tracking-wide">
            Abhijit: {panchang.abhijitMuhurat}
          </p>
        </div>
      </div>

      {/* Sacred soul — identical for every role */}
      <ShlokaCard />

      {/* Role-based work surface */}
      <RoleHomeSwitch
        onNavigate={handleNav}
        onOpenQuickPay={onOpenQuickPay}
        onOpenMySpace={onOpenMySpace}
      />
    </div>
  );
};

export default DashboardHome;
