/**
 * AppGrowthTab — GodMode Console 3.0: QR-driven app download program (Phase 4).
 * ==============================================================================
 * The owner's control surface for getting the app onto devotees' phones:
 *
 *   Links      — Play Store URL + "Go live" toggle, locked iOS-PWA policy,
 *                live device previews of what /get-app shows.
 *   QR Studio  — branded master QR, per-campaign QRs (temple/event attribution),
 *                PNG / SVG / print-poster PDF exports.
 *   Content    — edit /get-app landing copy without code (trilingual).
 *   Analytics  — scans → installs funnel, campaigns, platforms, waitlist.
 *
 * Data model (Firestore):
 *   appGrowth/config            public read / owner write  (store links + content override)
 *   appGrowthCampaigns/{id}     public read / owner write  (campaign QR attribution)
 *   appGrowthScans/{id}         create: strictly-validated / owner read only
 *   appGrowthInstalls/{id}      create: strictly-validated / owner read only
 *   appGrowthWaitlist/{id}      create: strictly-validated / owner read only
 * Full shapes: src/appgrowth/useAppGrowthConfig.ts + firestore.rules.
 *
 * Spark-native: reads/writes Firestore directly (owner-gated). Never throws —
 * every load is guarded, empty states are honest. Client-side owner checks in
 * useAppGrowthConfig.save(); Firestore rules are the hard boundary.
 *
 * QR note: rendering/export/posters come from the QR builder's
 * `src/appgrowth/qr/` module (BrandedQr, export fns, PosterGenerator) —
 * QrStudio.tsx consumes that public API.
 */
import React, { useState } from 'react';
import { Link2, QrCode, Type, BarChart3 } from 'lucide-react';
import { LinkManager } from './LinkManager';
import { QrStudio } from './QrStudio';
import { ContentEditor } from './ContentEditor';
import { GrowthAnalytics } from './GrowthAnalytics';

type SubTab = 'links' | 'qr' | 'content' | 'analytics';

const SUBTABS: { id: SubTab; label: string; icon: React.ReactNode }[] = [
  { id: 'links', label: 'Links', icon: <Link2 className="w-4 h-4" /> },
  { id: 'qr', label: 'QR Studio', icon: <QrCode className="w-4 h-4" /> },
  { id: 'content', label: 'Content', icon: <Type className="w-4 h-4" /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
];

export const AppGrowthTab: React.FC = () => {
  const [sub, setSub] = useState<SubTab>('links');

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-black text-white">App Growth</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Store links, QR campaigns, landing content and download analytics — the QR-driven install program.
        </p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {SUBTABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSub(t.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              sub === t.id
                ? 'bg-saffron-500 text-slate-950'
                : 'border border-slate-700 text-slate-300 hover:border-saffron-500/60'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {sub === 'links' && <LinkManager />}
      {sub === 'qr' && <QrStudio />}
      {sub === 'content' && <ContentEditor />}
      {sub === 'analytics' && <GrowthAnalytics />}
    </div>
  );
};
