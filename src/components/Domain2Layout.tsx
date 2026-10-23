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
import { AuditTrailView } from './treasury/AuditTrailDesk';
import { T } from '../solo/ui';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';

export interface SubTab {
  id: string;
  label: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
}

export const SUB_TABS: SubTab[] = [
  { id: 'blind-audit', label: 'Blind Hundi Audit', icon: EyeOff },
  { id: '80g-studio', label: 'Live 80G Studio', icon: FileText },
  { id: 'treasury', label: 'Treasury Ledger', icon: Landmark },
  { id: 'audit-trail', label: <T en="Audit Trail" bn="অডিট ট্রেইল" hi="ऑडिट ट्रेल" />, icon: ShieldCheck },
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
  /* Owner decision 2026-10-23 (defence-in-depth): App.tsx does not
   * mount this layout today, but its default tab is the blind hundi
   * desk — a POSTING surface. The read-only Auditor must never land
   * on a posting surface here either, so for an Auditor the two hundi
   * tabs resolve to the read-only Audit Trail, which is also the
   * default tab. The live gates are lib/deskVisibility + App.tsx. */
  const { effectiveRole } = useAuthWorkspace();
  const isAuditor = effectiveRole === 'Auditor';
  const [activeTab, setActiveTab] = useState<string>(isAuditor ? 'audit-trail' : 'blind-audit');

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
              className={`flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
              return isAuditor ? <AuditTrailView /> : <BlindHundiAuditDesk />;
            case '80g-studio':
              return <Dynamic80GReceiptStudio />;
            case 'tally':
              return <TallyExportDesk />;
            case 'treasury':
              return <TreasuryLedgerDesk />;
            case 'audit-trail':
              return <AuditTrailView />;
            case 'tax-receipt':
              return <TaxReceiptDesk />;
            case 'hundi-audit':
              return isAuditor ? <AuditTrailView /> : <HundiCountingAuditDesk />;
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
              return isAuditor ? <AuditTrailView /> : <BlindHundiAuditDesk />;
          }
        })()}
      </div>
    </div>
  );
};

export default Domain2Layout;
