import React, { useState } from 'react';
import {
  Shield,
  Settings,
  ShieldCheck,
  ShieldAlert,
  Vote,
  Layers,
  Sparkles,
  Siren,
} from 'lucide-react';
import { UserRolesDesk } from './domain6/UserRolesDesk';
import { TacticalPerimeterRadar } from './domain6/TacticalPerimeterRadar';
import { TacticalSOSDispatcher } from './domain6/TacticalSOSDispatcher';
import { MasterSettingsDesk } from './domain6/MasterSettingsDesk';
import { AuditLogDesk } from './domain6/AuditLogDesk';
import { CrisisCommandCenter } from './domain6/CrisisCommandCenter';
import { PanchayatPollingDesk } from './domain6/PanchayatPollingDesk';
import { CommunityPollsTab } from './domain6/CommunityPollsTab';
import { WorkspaceSelectorDesk } from './domain6/WorkspaceSelectorDesk';

export interface SubTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const SUB_TABS: SubTab[] = [
  { id: 'perimeter-radar', label: 'Tactical Perimeter Radar', icon: ShieldAlert },
  { id: 'sos-dispatch', label: 'Live SOS Dispatcher', icon: Siren },
  { id: 'rbac', label: 'Access Control (RBAC)', icon: Shield },
  { id: 'settings', label: 'Master Settings', icon: Settings },
  { id: 'audit', label: 'Audit Trail & Integrity', icon: ShieldCheck },
  { id: 'crisis', label: 'Crisis Command Center', icon: ShieldAlert },
  { id: 'polling', label: 'Panchayat Polling', icon: Vote },
  { id: 'community-polls', label: 'Community Feedback', icon: Sparkles },
  { id: 'workspaces', label: 'Workspace Partitions', icon: Layers },
];

export const Domain6Layout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('perimeter-radar');

  return (
    <div className="space-y-6">
      {/* Sub-Navigation Strip */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-xs flex flex-wrap gap-1.5">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Render Switch */}
      <div className="w-full">
        {(() => {
          switch (activeTab) {
            case 'perimeter-radar':
              return <TacticalPerimeterRadar />;
            case 'sos-dispatch':
              return <TacticalSOSDispatcher />;
            case 'rbac':
              return <UserRolesDesk />;
            case 'settings':
              return <MasterSettingsDesk />;
            case 'audit':
              return <AuditLogDesk />;
            case 'crisis':
              return <CrisisCommandCenter />;
            case 'polling':
              return <PanchayatPollingDesk />;
            case 'community-polls':
              return <CommunityPollsTab />;
            case 'workspaces':
              return <WorkspaceSelectorDesk />;
            default:
              return <TacticalPerimeterRadar />;
          }
        })()}
      </div>
    </div>
  );
};

export default Domain6Layout;
