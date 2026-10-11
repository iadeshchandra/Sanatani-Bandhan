import React, { useState } from 'react';
import {
  Landmark,
  Receipt,
  FileSpreadsheet,
  ShieldCheck,
  Target,
  Sparkles,
  Package,
  Flame,
  FileCode2,
  EyeOff,
  FileText,
} from 'lucide-react';
import { TallyExportDesk } from './domain2/TallyExportDesk';
import { TreasuryLedgerDesk } from './domain2/TreasuryLedgerDesk';
import { TaxReceiptDesk } from './domain2/TaxReceiptDesk';
import { HundiCountingAuditDesk } from './domain2/HundiCountingAuditDesk';
import { BlindHundiAuditDesk } from './domain2/BlindHundiAuditDesk';
import { Dynamic80GReceiptStudio } from './domain2/Dynamic80GReceiptStudio';
import { Form10BDComplianceDesk } from './domain2/Form10BDComplianceDesk';
import { MandirCampaignsDesk } from './domain2/MandirCampaignsDesk';
import { RatnaBhandarAssetDesk } from './domain2/RatnaBhandarAssetDesk';
import { AssetInventoryDesk } from './domain2/AssetInventoryDesk';
import { KarmaLedgerDesk } from './domain2/KarmaLedgerDesk';

export interface SubTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const SUB_TABS: SubTab[] = [
  { id: 'blind-audit', label: 'Blind Hundi Audit', icon: EyeOff },
  { id: '80g-studio', label: 'Live 80G Studio', icon: FileText },
  { id: 'treasury', label: 'Treasury Ledger', icon: Landmark },
  { id: 'tally', label: 'Tally XML Export', icon: FileCode2 },
  { id: 'tax-receipt', label: '80G Tax Receipts', icon: Receipt },
  { id: 'hundi-audit', label: 'Hundi Counting Audit', icon: ShieldCheck },
  { id: 'form-10bd', label: 'Form 10BD Compliance', icon: FileSpreadsheet },
  { id: 'campaigns', label: 'Mandir Campaigns', icon: Target },
  { id: 'ratna-bhandar', label: 'Ratna Bhandar Assets', icon: Sparkles },
  { id: 'inventory', label: 'Asset Inventory', icon: Package },
  { id: 'karma', label: 'Karma Ledger', icon: Flame },
];

export const Domain2Layout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('blind-audit');

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
                  ? 'bg-emerald-600 text-white shadow-xs'
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
            case 'blind-audit':
              return <BlindHundiAuditDesk />;
            case '80g-studio':
              return <Dynamic80GReceiptStudio />;
            case 'tally':
              return <TallyExportDesk />;
            case 'treasury':
              return <TreasuryLedgerDesk />;
            case 'tax-receipt':
              return <TaxReceiptDesk />;
            case 'hundi-audit':
              return <HundiCountingAuditDesk />;
            case 'form-10bd':
              return <Form10BDComplianceDesk />;
            case 'campaigns':
              return <MandirCampaignsDesk />;
            case 'ratna-bhandar':
              return <RatnaBhandarAssetDesk />;
            case 'inventory':
              return <AssetInventoryDesk />;
            case 'karma':
              return <KarmaLedgerDesk />;
            default:
              return <BlindHundiAuditDesk />;
          }
        })()}
      </div>
    </div>
  );
};

export default Domain2Layout;
