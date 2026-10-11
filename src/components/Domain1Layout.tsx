import React, { useState } from 'react';
import {
  Users,
  ScanFace,
  Home,
  GitFork,
  UserPlus,
  UserCheck,
  FileSpreadsheet,
  Network,
  Zap,
} from 'lucide-react';
import { DevoteeGrid } from './domain1/DevoteeGrid';
import { DarshanCheckInDesk } from './domain1/DarshanCheckInDesk';
import { TatkalKioskDesk } from './domain1/TatkalKioskDesk';
import { FamilyHouseholdDesk } from './domain1/FamilyHouseholdDesk';
import { VanshavaliDesk } from './domain1/VanshavaliDesk';
import { GuestManagerDesk } from './domain1/GuestManagerDesk';
import { SevadarRosterDesk } from './domain1/SevadarRosterDesk';
import { BulkImportDesk } from './domain1/BulkImportDesk';
import { FederationMultiBranchDesk } from './domain1/FederationMultiBranchDesk';

export interface SubTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const SUB_TABS: SubTab[] = [
  { id: 'devotees', label: 'Devotee Directory', icon: Users },
  { id: 'checkin', label: 'Gate Command & Check-In', icon: ScanFace },
  { id: 'tatkal', label: 'Tatkal Rapid Kiosk', icon: Zap },
  { id: 'family', label: 'Household & Family', icon: Home },
  { id: 'vanshavali', label: 'Ancestral Lineage', icon: GitFork },
  { id: 'guests', label: 'Guest CRM', icon: UserPlus },
  { id: 'sevadar-roster', label: 'Sevadar Roster', icon: UserCheck },
  { id: 'bulkImport', label: 'Bulk CSV Ingestion', icon: FileSpreadsheet },
  { id: 'federation', label: 'Federation HQ', icon: Network },
];

export const Domain1Layout: React.FC<{ initialTab?: string }> = ({ initialTab = 'devotees' }) => {
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  const renderActiveSubDesk = () => {
    switch (activeTab) {
      case 'checkin':
      case 'gate-command':
        return <DarshanCheckInDesk />;
      case 'tatkal':
      case 'tatkal-kiosk':
        return <TatkalKioskDesk />;
      case 'devotees':
        return <DevoteeGrid />;
      case 'family':
        return <FamilyHouseholdDesk />;
      case 'vanshavali':
        return <VanshavaliDesk />;
      case 'guests':
        return <GuestManagerDesk />;
      case 'sevadar-roster':
        return <SevadarRosterDesk />;
      case 'bulkImport':
        return <BulkImportDesk />;
      case 'federation':
        return <FederationMultiBranchDesk />;
      default:
        return <DevoteeGrid />;
    }
  };

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
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Desk Content */}
      <div>{renderActiveSubDesk()}</div>
    </div>
  );
};

export default Domain1Layout;
