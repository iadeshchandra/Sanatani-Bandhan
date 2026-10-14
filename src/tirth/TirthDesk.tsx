import React, { useEffect, useRef, useState } from 'react';
import { TirthProvider, useTirth } from './tirthStore';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useLanguage } from '../context/LanguageContext';
import { Tabs } from './ui';
import { DashboardTab } from './DashboardTab';
import { SlotsTab } from './SlotsTab';
import { TokensTab } from './TokensTab';
import { QueueTab } from './QueueTab';
import { SevaTab } from './SevaTab';
import { CrowdTab } from './CrowdTab';
import { ReportsTab } from './ReportsTab';
import './print.css';

/* ------------------------------------------------------------------ */
/* Tirth One — darshan queue & token management for Tirth, Mandir and */
/* Kashi Kshetra workspaces. Darshan slots, token counter, live queue  */
/* board, seva-darshan bookings, crowd snapshots, daily reports.      */
/* Offline-first: queue records stay on this device; only treasury     */
/* postings (seva-darshan income) go to the cloud ledger. Registered   */
/* in workspaceRegistry for Tirth + Mandir + KashiKshetra — the       */
/* App.tsx org-type guard blocks it everywhere else.                   */
/*                                                                     */
/* HONESTY RULE: wait times are estimates, labelled as such. Darshan   */
/* fees are generally not 80G-eligible — the UI says so plainly.        */
/* ------------------------------------------------------------------ */

const TABS = [
  { id: 'dashboard', bn: 'ড্যাশবোর্ড', en: 'Dashboard', hi: 'डैशबोर्ड' },
  { id: 'slots', bn: 'স্লট', en: 'Slots', hi: 'स्लॉट' },
  { id: 'tokens', bn: 'টোকেন', en: 'Tokens', hi: 'टोकन' },
  { id: 'queue', bn: 'সারি', en: 'Queue Board', hi: 'कतार बोर्ड' },
  { id: 'seva', bn: 'সেবা দর্শন', en: 'Seva Darshan', hi: 'सेवा दर्शन' },
  { id: 'crowd', bn: 'ভিড়', en: 'Crowd', hi: 'भीड़' },
  { id: 'reports', bn: 'প্রতিবেদন', en: 'Reports', hi: 'रिपोर्ट' },
];

const TirthInner: React.FC = () => {
  const [tab, setTab] = useState('dashboard');
  const { ensureSeeded } = useTirth();
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
    <div className="min-h-full bg-gradient-to-b from-teal-50/60 via-stone-50 to-stone-100">
      <div className="bg-gradient-to-r from-teal-900 via-cyan-900 to-teal-900 text-teal-50 px-4 sm:px-6 py-4 shadow-lg no-print">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-teal-400/20 border border-teal-300/40 flex items-center justify-center text-2xl">🛕</div>
          <div>
            <h1 className="text-xl font-extrabold leading-tight">
              {safeTranslate('tirth.title', 'Tirth One', 'তীর্থ ওয়ান', 'तीर्थ वन')}{' '}
              <span className="font-normal text-teal-200/90 text-sm">(Darshan Queue & Tokens)</span>
            </h1>
            <p className="text-xs text-teal-200/80">
              ॥ अतिथि देवो भव ॥ —{' '}
              {safeTranslate('tirth.subtitle', 'Slots, tokens, live queues & crowds — honestly managed', 'স্লট, টোকেন, লাইভ সারি ও ভিড় — সততার সঙ্গে পরিচালিত', 'स्लॉट, टोकन, लाइव कतार व भीड़ — ईमानदारी से प्रबंधित')}
            </p>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 max-w-7xl mx-auto">
        <div className="mb-4 rounded-2xl border border-teal-200 bg-teal-50/70 px-4 py-3 text-xs text-teal-900 no-print">
          <span className="font-bold">⚖️ {safeTranslate('tirth.honesty.title', 'Honest scope', 'সৎ পরিধি', 'ईमानदार दायरा')}: </span>
          {safeTranslate(
            'tirth.honesty.body',
            'Wait times shown are estimates, not promises. Darshan fees are generally not 80G-eligible — confirm with your CA. Token counts are this device\u2019s record.',
            'দেখানো অপেক্ষার সময় অনুমান, প্রতিশ্রুতি নয়। দর্শন ফি সাধারণত 80G-যোগ্য নয় — সিএ-এর সঙ্গে নিশ্চিত করুন। টোকেন গণনা এই ডিভাইসের রেকর্ড।',
            'दिखाया गया प्रतीक्षा समय अनुमान है, वादा नहीं। दर्शन शुल्क सामान्यतः 80G-योग्य नहीं है — अपने CA से पुष्टि करें। टोकन गणना इस डिवाइस का रिकॉर्ड है।'
          )}
        </div>

        <Tabs tabs={TABS} active={tab} onChange={setTab} />
        <div className="mt-4">
          {tab === 'dashboard' && <DashboardTab />}
          {tab === 'slots' && <SlotsTab />}
          {tab === 'tokens' && <TokensTab />}
          {tab === 'queue' && <QueueTab />}
          {tab === 'seva' && <SevaTab />}
          {tab === 'crowd' && <CrowdTab />}
          {tab === 'reports' && <ReportsTab />}
        </div>
      </div>
    </div>
  );
};

export const TirthDesk: React.FC = () => {
  const { activeWorkspace } = useAuthWorkspace();
  return (
    <TirthProvider workspaceId={activeWorkspace.id}>
      <TirthInner />
    </TirthProvider>
  );
};

export default TirthDesk;
