import React, { useState } from 'react';
import {
  Flame,
  Clock,
  BookOpen,
  Calendar,
  HeartHandshake,
  MonitorPlay,
  Sun,
  ShieldCheck,
} from 'lucide-react';
import { LiveSankalpaTeleprompter } from './domain3/LiveSankalpaTeleprompter';
import { RealTimePanchangRadar } from './domain3/RealTimePanchangRadar';
import { PoojaBookingDesk } from './domain3/PoojaBookingDesk';
import { MandirPujaDesk } from './domain3/MandirPujaDesk';
import { PurohitManagementDesk } from './domain3/PurohitManagementDesk';
import { PanchangMuhuratDesk } from './domain3/PanchangMuhuratDesk';
import { PitruShradhDesk } from './domain3/PitruShradhDesk';

export interface SubTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const SUB_TABS: SubTab[] = [
  { id: 'sankalpa-hud', label: 'Sanctum Teleprompter (HUD)', icon: MonitorPlay },
  { id: 'panchang-radar', label: 'Live Panchang Radar', icon: Sun },
  { id: 'pooja-booking', label: 'Puja Bookings & Sankalp', icon: Flame },
  { id: 'mandir-puja', label: 'Daily Aarti & Sanctum', icon: Clock },
  { id: 'purohit-roster', label: 'Purohit Roster & Diary', icon: BookOpen },
  { id: 'panchang-desk', label: 'Vedic Ephemeris Desk', icon: Calendar },
  { id: 'pitru-shradh', label: 'Pitru Paksha & Shradh', icon: HeartHandshake },
];

export const Domain3Layout: React.FC<{ initialTab?: string }> = ({ initialTab = 'sankalpa-hud' }) => {
  const [activeTab, setActiveTab] = useState<string>(initialTab);

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
                  ? 'bg-amber-500 text-white shadow-xs'
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
            case 'sankalpa-hud':
              return <LiveSankalpaTeleprompter />;
            case 'panchang-radar':
              return <RealTimePanchangRadar />;
            case 'pooja-booking':
            case 'poojaBooking':
              return <PoojaBookingDesk />;
            case 'mandir-puja':
            case 'mandirPuja':
              return <MandirPujaDesk />;
            case 'purohit-roster':
            case 'purohitDesk':
            case 'purohitManagement':
              return <PurohitManagementDesk />;
            case 'panchang-desk':
            case 'panchang':
              return <PanchangMuhuratDesk />;
            case 'pitru-shradh':
            case 'pitruShradh':
              return <PitruShradhDesk />;
            default:
              return <LiveSankalpaTeleprompter />;
          }
        })()}
      </div>
    </div>
  );
};

export default Domain3Layout;
