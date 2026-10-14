import React, { useEffect, useRef, useState } from 'react';
import { NyasProvider, useNyas } from './nyasStore';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useLanguage } from '../context/LanguageContext';
import { Tabs } from './ui';
import { DashboardTab } from './DashboardTab';
import { RegistrationsTab } from './RegistrationsTab';
import { ComplianceTab } from './ComplianceTab';
import { ApplicationTab } from './ApplicationTab';
import { MeetingsTab } from './MeetingsTab';
import { VaultTab } from './VaultTab';
import { ReportsTab } from './ReportsTab';
import './print.css';

/* ------------------------------------------------------------------ */
/* Nyas One — Trust/NGO compliance & governance for Trust, Dharmada   */
/* Trust and NGO workspaces. Registration tracker, compliance         */
/* calendar, 85%-rule application tracker, trustee meetings, document  */
/* vault, 10BE donor export. Offline-first: records stay on this      */
/* device; treasury is READ for income/donor totals, never written.   */
/* Registered in workspaceRegistry for Trust-family org types — the   */
/* App.tsx org-type guard blocks it everywhere else.                  */
/*                                                                     */
/* HONESTY RULE: tracks and reminds. Does not file with any           */
/* government authority; does not give legal or tax advice.           */
/* ------------------------------------------------------------------ */

const TABS = [
  { id: 'dashboard', bn: 'ড্যাশবোর্ড', en: 'Dashboard', hi: 'डैशबोर्ड' },
  { id: 'registrations', bn: 'নিবন্ধন', en: 'Registrations', hi: 'पंजीकरण' },
  { id: 'compliance', bn: 'অনুপালন', en: 'Compliance', hi: 'अनुपालन' },
  { id: 'rule85', bn: '৮৫% নিয়ম', en: '85% Rule', hi: '85% नियम' },
  { id: 'meetings', bn: 'সভা', en: 'Meetings', hi: 'बैठकें' },
  { id: 'vault', bn: 'নথিভাণ্ডার', en: 'Vault', hi: 'दस्तावेज़' },
  { id: 'reports', bn: 'প্রতিবেদন', en: 'Reports', hi: 'रिपोर्ट' },
];

const NyasInner: React.FC = () => {
  const [tab, setTab] = useState('dashboard');
  const { ensureSeeded } = useNyas();
  const { activeWorkspace } = useAuthWorkspace();
  const { safeTranslate } = useLanguage();
  const seededFor = useRef('');

  useEffect(() => {
    const key = activeWorkspace.id;
    if (seededFor.current !== key) {
      seededFor.current = key;
      ensureSeeded();
    }
  }, [activeWorkspace.id, ensureSeeded]);

  return (
    <div className="min-h-full bg-gradient-to-b from-indigo-50/60 via-stone-50 to-stone-100">
      <div className="bg-gradient-to-r from-indigo-900 via-violet-900 to-indigo-900 text-indigo-50 px-4 sm:px-6 py-4 shadow-lg no-print">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-400/20 border border-indigo-300/40 flex items-center justify-center text-2xl">📜</div>
          <div>
            <h1 className="text-xl font-extrabold leading-tight">
              {safeTranslate('nyas.title', 'Nyas One', 'ন্যাস ওয়ান', 'न्यास वन')}{' '}
              <span className="font-normal text-indigo-200/90 text-sm">(Compliance & Governance)</span>
            </h1>
            <p className="text-xs text-indigo-200/80">
              ॥ धर्मो रक्षति रक्षितः ॥ —{' '}
              {safeTranslate('nyas.subtitle', 'Registrations, filings & trust governance — honestly tracked', 'নিবন্ধন ও অনুপালন — সৎভাবে ট্র্যাকড', 'पंजीकरण व अनुपालन — ईमानदारी से ट्रैक')}
            </p>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 max-w-7xl mx-auto">
        {/* One clear honesty banner — stated once, not nagged. */}
        <div className="mb-4 rounded-2xl border border-indigo-200 bg-indigo-50/70 px-4 py-3 text-xs text-indigo-900 no-print">
          <span className="font-bold">⚖️ {safeTranslate('nyas.honesty.title', 'Honest scope', 'সৎ পরিধি', 'ईमानदार दायरा')}: </span>
          {safeTranslate(
            'nyas.honesty.body',
            'Nyas One tracks and reminds. It does not file with any government authority and does not give legal or tax advice — confirm every filing with your CA / legal counsel.',
            'ন্যাস ওয়ান ট্র্যাক ও মনে করিয়ে দেয়। এটি সরকারি দপ্তরে ফাইল করে না এবং আইনি/কর পরামর্শ দেয় না — প্রতিটি ফাইলিং আপনার সিএ-এর সঙ্গে নিশ্চিত করুন।',
            'न्यास वन ट्रैक करता है और याद दिलाता है। यह किसी सरकारी प्राधिकरण के पास फाइल नहीं करता और कानूनी/कर सलाह नहीं देता — हर फाइलिंग अपने CA से पुष्टि करें।'
          )}
        </div>

        <Tabs tabs={TABS} active={tab} onChange={setTab} />
        <div className="mt-4">
          {tab === 'dashboard' && <DashboardTab />}
          {tab === 'registrations' && <RegistrationsTab />}
          {tab === 'compliance' && <ComplianceTab />}
          {tab === 'rule85' && <ApplicationTab />}
          {tab === 'meetings' && <MeetingsTab />}
          {tab === 'vault' && <VaultTab />}
          {tab === 'reports' && <ReportsTab />}
        </div>
      </div>
    </div>
  );
};

export const NyasDesk: React.FC = () => {
  const { activeWorkspace } = useAuthWorkspace();
  return (
    <NyasProvider workspaceId={activeWorkspace.id}>
      <NyasInner />
    </NyasProvider>
  );
};

export default NyasDesk;
