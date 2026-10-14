import React, { useEffect, useRef, useState } from 'react';
import { SatsangProvider, useSatsang } from './satsangStore';
import { useAuthWorkspace } from '../context/AuthWorkspaceContext';
import { useLanguage } from '../context/LanguageContext';
import { Tabs } from './ui';
import { DashboardTab } from './DashboardTab';
import { MembersTab } from './MembersTab';
import { GatheringsTab } from './GatheringsTab';
import { AttendanceTab } from './AttendanceTab';
import { BhajansTab } from './BhajansTab';
import { PrasadTab } from './PrasadTab';
import { FundTab } from './FundTab';
import { ReportsTab } from './ReportsTab';
import './print.css';

/* ------------------------------------------------------------------ */
/* Satsang One — the organizer's tool for local satsang mandalis.     */
/* Members, gatherings, attendance, bhajan repertoire, prasad         */
/* rotation and a small fund live on this device; only fund postings  */
/* go to the cloud ledger. Registered in workspaceRegistry for        */
/* Satsang + Mandir + Ashram — the App.tsx org-type guard blocks it   */
/* everywhere else.                                                    */
/*                                                                     */
/* SCOPE: organizer tooling for local mandalis. No social or feed      */
/* features — those belong to the future Sangam layer.                 */
/*                                                                     */
/* HONESTY RULE: fund contributions post to treasury as income; 80G    */
/* eligibility must be confirmed with the CA — the UI says so plainly.*/
/* ------------------------------------------------------------------ */

const TABS = [
  { id: 'dashboard', bn: 'ড্যাশবোর্ড', en: 'Dashboard', hi: 'डैशबोर्ड' },
  { id: 'members', bn: 'সদস্য', en: 'Members', hi: 'सदस्य' },
  { id: 'gatherings', bn: 'সমাবেশ', en: 'Gatherings', hi: 'सभाएं' },
  { id: 'attendance', bn: 'উপস্থিতি', en: 'Attendance', hi: 'उपस्थिति' },
  { id: 'bhajans', bn: 'ভজন', en: 'Bhajans', hi: 'भजन' },
  { id: 'prasad', bn: 'প্রসাদ', en: 'Prasad', hi: 'प्रसाद' },
  { id: 'fund', bn: 'তহবিল', en: 'Fund', hi: 'निधि' },
  { id: 'reports', bn: 'প্রতিবেদন', en: 'Reports', hi: 'रिपोर्ट' },
];

const SatsangInner: React.FC = () => {
  const [tab, setTab] = useState('dashboard');
  const { ensureSeeded } = useSatsang();
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
    <div className="min-h-full bg-gradient-to-b from-rose-50/60 via-stone-50 to-stone-100">
      <div className="bg-gradient-to-r from-rose-900 via-pink-900 to-rose-900 text-rose-50 px-4 sm:px-6 py-4 shadow-lg no-print">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-rose-400/20 border border-rose-300/40 flex items-center justify-center text-2xl">🪔</div>
          <div>
            <h1 className="text-xl font-extrabold leading-tight">
              {safeTranslate('satsang.title', 'Satsang One', 'সৎসঙ্গ ওয়ান', 'सत्संग वन')}{' '}
              <span className="font-normal text-rose-200/90 text-sm">(Mandali Management)</span>
            </h1>
            <p className="text-xs text-rose-200/80">
              ॥ सत्संगत्वे निस्संगत्वं ॥ —{' '}
              {safeTranslate('satsang.subtitle', 'Members, gatherings, bhajans & prasad — warmly organized', 'সদস্য, সমাবেশ, ভজন ও প্রসাদ — আন্তরিকভাবে সংগঠিত', 'सदस्य, सभाएं, भजन व प्रसाद — स्नेह से व्यवस्थित')}
            </p>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-6 py-4 max-w-7xl mx-auto">
        <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-3 text-xs text-rose-900 no-print">
          <span className="font-bold">⚖️ {safeTranslate('satsang.honesty.title', 'Honest scope', 'সৎ পরিধি', 'ईमानदार दायरा')}: </span>
          {safeTranslate(
            'satsang.honesty.body',
            'This is the mandali\u2019s own organizer record, kept on this device. Fund entries post to treasury as income — confirm 80G eligibility with your CA before issuing any 80G receipt. Nothing here leaves this device except treasury postings.',
            'এটি মণ্ডলীর নিজস্ব সংগঠকের রেকর্ড, এই ডিভাইসে রক্ষিত। তহবিলের এন্ট্রি কোষাগারে আয় হিসেবে পোস্ট হয় — 80G রসিদ দেওয়ার আগে সিএ-এর সঙ্গে 80G যোগ্যতা নিশ্চিত করুন। কোষাগার পোস্টিং ছাড়া কিছুই এই ডিভাইস ছাড়ে না।',
            'यह मंडली का अपना आयोजक रिकॉर्ड है, इसी डिवाइस पर रखा जाता है। निधि प्रविष्टियां कोषागार में आय के रूप में दर्ज होती हैं — 80G रसीद जारी करने से पहले अपने CA से 80G पात्रता पुष्टि करें। कोषागार प्रविष्टियों के अलावा कुछ भी इस डिवाइस से बाहर नहीं जाता।'
          )}
        </div>

        <Tabs tabs={TABS} active={tab} onChange={setTab} />
        <div className="mt-4">
          {tab === 'dashboard' && <DashboardTab />}
          {tab === 'members' && <MembersTab />}
          {tab === 'gatherings' && <GatheringsTab />}
          {tab === 'attendance' && <AttendanceTab />}
          {tab === 'bhajans' && <BhajansTab />}
          {tab === 'prasad' && <PrasadTab />}
          {tab === 'fund' && <FundTab />}
          {tab === 'reports' && <ReportsTab />}
        </div>
      </div>
    </div>
  );
};

export const SatsangDesk: React.FC = () => {
  const { activeWorkspace } = useAuthWorkspace();
  return (
    <SatsangProvider workspaceId={activeWorkspace.id}>
      <SatsangInner />
    </SatsangProvider>
  );
};

export default SatsangDesk;
