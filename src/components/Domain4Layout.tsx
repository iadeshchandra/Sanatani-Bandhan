import React, { useState } from 'react';
import {
  Utensils,
  ChefHat,
  Heart,
  Building,
  HeartHandshake,
  BookOpen,
  GraduationCap,
  UtensilsCrossed,
  TrendingDown,
} from 'lucide-react';
import { SmartBhandarDesk } from './domain4/SmartBhandarDesk';
import { BOMSimulationDesk } from './domain4/BOMSimulationDesk';
import { PredictiveRunwayDesk } from './domain4/PredictiveRunwayDesk';
import { AnnadanamKitchenDesk } from './domain4/AnnadanamKitchenDesk';
import { GauSevaDesk } from './domain4/GauSevaDesk';
import { DharamshalaDesk } from './domain4/DharamshalaDesk';
import SanataniVivahDesk from './domain4/SanataniVivahDesk';
import { AshramGoshalaGurukulDesk } from './domain4/AshramGoshalaGurukulDesk';
import { VedicSevaShikshaDesk } from './domain4/VedicSevaShikshaDesk';

export interface SubTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const SUB_TABS: SubTab[] = [
  { id: 'bom-sim', label: 'Kinetic BOM Simulator', icon: UtensilsCrossed },
  { id: 'runway', label: 'Predictive Stock Runway', icon: TrendingDown },
  { id: 'bhandar', label: 'Smart Bhandar (Inventory)', icon: ChefHat },
  { id: 'annadanam', label: 'Annadanam Kitchen', icon: Utensils },
  { id: 'goshala', label: 'Gau Seva (Goshala)', icon: Heart },
  { id: 'dharamshala', label: 'Dharamshala / Yatri Bhavan', icon: Building },
  { id: 'vivah', label: 'Sanatani Vivah (Matrimony)', icon: HeartHandshake },
  { id: 'ashram', label: 'Ashram & Gurukul', icon: BookOpen },
  { id: 'shiksha', label: 'Vedic Seva Shiksha', icon: GraduationCap },
];

export const Domain4Layout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('bom-sim');

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
            case 'bom-sim':
              return <BOMSimulationDesk />;
            case 'runway':
              return <PredictiveRunwayDesk />;
            case 'bhandar':
              return <SmartBhandarDesk />;
            case 'annadanam':
              return <AnnadanamKitchenDesk />;
            case 'goshala':
              return <GauSevaDesk />;
            case 'dharamshala':
              return <DharamshalaDesk />;
            case 'vivah':
              return <SanataniVivahDesk />;
            case 'ashram':
              return <AshramGoshalaGurukulDesk />;
            case 'shiksha':
              return <VedicSevaShikshaDesk />;
            default:
              return <BOMSimulationDesk />;
          }
        })()}
      </div>
    </div>
  );
};

export default Domain4Layout;
